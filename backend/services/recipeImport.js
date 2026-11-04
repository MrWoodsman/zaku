// Recipe import from a web page. Prototype: reads schema.org/Recipe data from the page, either
// as JSON-LD (<script type="application/ld+json">) or as microdata (itemprop attributes, used
// e.g. by aniagotuje.pl), and maps it onto the app's recipe shape.
const cheerio = require("cheerio");
const dns = require("dns").promises;
const net = require("net");

const MAX_HTML_BYTES = 3 * 1024 * 1024;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_REDIRECTS = 5;
const FETCH_TIMEOUT_MS = 10000;
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

class ImportError extends Error {
  constructor(message, status = 422) {
    super(message);
    this.status = status;
  }
}

// ---------- safe fetching (the server must not be usable to poke around the LAN) ----------

function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 10 ||
      a === 127 ||
      a === 0 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127)
    );
  }
  const v6 = ip.toLowerCase();
  if (v6.startsWith("::ffff:")) return isPrivateIp(v6.slice(7));
  return v6 === "::1" || v6 === "::" || v6.startsWith("fc") || v6.startsWith("fd") || v6.startsWith("fe80");
}

async function assertPublicUrl(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new ImportError("Nieprawidłowy adres URL", 400);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new ImportError("Obsługiwane są tylko adresy http i https", 400);
  }

  const host = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = net.isIP(host) ? [{ address: host }] : await dns.lookup(host, { all: true }).catch(() => []);
  if (addresses.length === 0) throw new ImportError("Nie udało się połączyć z tą stroną", 502);
  if (addresses.some((a) => isPrivateIp(a.address))) {
    throw new ImportError("Ten adres jest niedozwolony", 400);
  }
  return url;
}

// fetch with manual redirects so every hop is checked, plus a timeout and a size cap
async function safeFetch(rawUrl, { accept, maxBytes }) {
  let current = rawUrl;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const url = await assertPublicUrl(current);

    let response;
    try {
      response = await fetch(url, {
        redirect: "manual",
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        headers: { "user-agent": USER_AGENT, accept, "accept-language": "pl,en;q=0.8" },
      });
    } catch {
      throw new ImportError("Nie udało się pobrać strony (brak odpowiedzi)", 502);
    }

    if (response.status >= 300 && response.status < 400 && response.headers.get("location")) {
      current = new URL(response.headers.get("location"), url).toString();
      continue;
    }
    if (!response.ok) throw new ImportError(`Strona zwróciła błąd ${response.status}`, 502);

    const chunks = [];
    let size = 0;
    for await (const chunk of response.body) {
      size += chunk.length;
      if (size > maxBytes) throw new ImportError("Strona jest zbyt duża", 413);
      chunks.push(chunk);
    }
    return { buffer: Buffer.concat(chunks), contentType: response.headers.get("content-type") || "" };
  }

  throw new ImportError("Zbyt wiele przekierowań", 502);
}

// ---------- small value helpers ----------

// Strips tags, decodes entities, collapses whitespace
function clean(value) {
  if (value === undefined || value === null) return "";
  const text = cheerio.load(String(value), null, false).text();
  return text.replace(/\s+/g, " ").trim();
}

// ISO 8601 duration ("PT1H30M", "P0DT0H45M") -> minutes
function parseDuration(value) {
  if (!value || typeof value !== "string") return 0;
  const m = value.trim().match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:\d+S)?)?$/i);
  if (!m) return 0;
  return Number(m[1] || 0) * 24 * 60 + Number(m[2] || 0) * 60 + Number(m[3] || 0);
}

// "4 porcje", 4, ["4", "4 servings"], "4-6 porcji" -> 4 (first whole number 1..100) or null
function parseServings(value) {
  const first = Array.isArray(value) ? value.find(Boolean) : value;
  const m = String(first ?? "").match(/\d+/);
  if (!m) return null;
  const n = Number(m[0]);
  return n >= 1 && n <= 100 ? n : null;
}

const FRACTIONS = { "½": 0.5, "¼": 0.25, "¾": 0.75, "⅓": 1 / 3, "⅔": 2 / 3, "⅛": 0.125 };

// Units the app's ingredient form offers: szt., kg, g, l, ml, opak.
// Anything else (łyżka, szklanka, szczypta...) stays in the name, e.g. "łyżki oliwy".
const UNIT_ALIASES = [
  ["kilogramy|kilogram|kg", "kg", 1],
  ["dag|dkg", "g", 10],
  ["gramów|gramy|gram|gr|g", "g", 1],
  ["mililitrów|mililitry|mililitr|ml", "ml", 1],
  ["litrów|litry|litr|l", "l", 1],
  ["sztuki|sztuka|sztuk|szt", "szt.", 1],
  ["opakowania|opakowanie|opak", "opak.", 1],
];

const NUMBER = String.raw`(?:\d+\s+\d\/\d|\d+\/\d+|\d+(?:[.,]\d+)?|[½¼¾⅓⅔⅛])`;

function toNumber(raw) {
  const text = raw.trim();
  if (FRACTIONS[text]) return FRACTIONS[text];
  const mixed = text.match(/^(\d+)\s+(\d)\/(\d)$/);
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  const frac = text.match(/^(\d+)\/(\d+)$/);
  if (frac) return Number(frac[1]) / Number(frac[2]);
  return Number(text.replace(",", "."));
}

// Splits a known unit off the start of `rest`: "g mąki" -> { unit: "g", factor: 1, tail: "mąki" }
function matchUnit(rest) {
  for (const [pattern, target, factor] of UNIT_ALIASES) {
    const m = new RegExp(`^(?:${pattern})\\.?(?![\\p{L}\\d])\\s*(.*)$`, "iu").exec(rest);
    if (m) return { unit: target, factor, tail: m[1] };
  }
  return null;
}

const round = (n) => Math.round(n * 100) / 100;
const stripEdges = (s) => s.replace(/^[-–:.,\s]+|[-–:,\s]+$/g, "");

// Two layouts occur in the wild:
//   "500 g mąki"                  (amount first, most sites)
//   "jajka 2 sztuki"              (name first, e.g. aniagotuje.pl)
// No number at all ("sól do smaku") -> quantity 0.
function parseIngredient(line) {
  const text = clean(line);
  const range = `(?:\\s*[-–]\\s*${NUMBER})?`;

  const leading = new RegExp(`^(${NUMBER})${range}\\s*(.*)$`, "u").exec(text);
  if (leading) {
    const quantity = toNumber(leading[1]);
    const unit = matchUnit(leading[2]);
    const name = stripEdges(unit ? unit.tail : leading[2]) || text;
    return { name, quantity: round(quantity * (unit?.factor ?? 1)), unit: unit?.unit ?? "" };
  }

  // Name first: look for " <number> [unit]" - prefer a number that has a known unit
  // (so "mąka typ 500 1 kg" reads 1 kg, not 500)
  const candidates = [...text.matchAll(new RegExp(`\\s(${NUMBER})${range}(?=\\s*(.*)$)`, "gu"))].map((m) => ({
    index: m.index,
    quantity: toNumber(m[1]),
    unit: matchUnit(m[2]),
    rest: m[2],
  }));
  const hit = candidates.find((c) => c.unit) ?? candidates[0];
  if (!hit) return { name: text, quantity: 0, unit: "" };

  const base = stripEdges(text.slice(0, hit.index)) || text;
  // What follows the amount ("łyżki", "1 mała sztuka") stays visible, in brackets
  const note = stripEdges(hit.unit ? hit.unit.tail : hit.rest);
  return {
    name: note ? `${base} (${note})` : base,
    quantity: round(hit.quantity * (hit.unit?.factor ?? 1)),
    unit: hit.unit?.unit ?? "",
  };
}

// ---------- extraction: JSON-LD ----------

function flattenNodes(data) {
  if (Array.isArray(data)) return data.flatMap(flattenNodes);
  if (data && typeof data === "object") {
    return [data, ...flattenNodes(data["@graph"] || [])];
  }
  return [];
}

function findJsonLdRecipe($) {
  const blocks = $('script[type="application/ld+json"]')
    .map((_, el) => $(el).contents().text())
    .get();

  for (const block of blocks) {
    let data;
    try {
      data = JSON.parse(block);
    } catch {
      continue;
    }
    const recipe = flattenNodes(data).find((node) => [].concat(node["@type"] || []).includes("Recipe"));
    if (recipe) return recipe;
  }
  return null;
}

// ---------- extraction: microdata ----------

function findMicrodataRecipe($) {
  const scope = $('[itemscope][itemtype*="schema.org/Recipe"]').first();
  if (scope.length === 0) return null;

  // only the properties that belong to this scope itself, not to nested ones (author, nutrition...)
  const own = (name) =>
    scope.find(`[itemprop="${name}"]`).filter((_, el) => $(el).parent().closest("[itemscope]")[0] === scope[0]);

  const valueOf = (el) => {
    const node = $(el);
    if (node.is("meta")) return node.attr("content");
    if (node.is("link, a")) return node.attr("href");
    if (node.is("img")) return node.attr("src");
    if (node.is("time")) return node.attr("datetime") || node.text();
    return node.text();
  };
  const first = (name) => {
    const el = own(name).first();
    return el.length ? valueOf(el) : undefined;
  };

  const instructions = own("recipeInstructions")
    .map((_, el) => {
      const step = $(el);
      if (step.is("[itemscope]")) {
        return {
          name: step.find('[itemprop="name"]').first().text(),
          text: step.find('[itemprop="text"]').first().text(),
        };
      }
      return step.text();
    })
    .get();

  return {
    name: first("name"),
    description: first("description"),
    image: first("image"),
    prepTime: first("prepTime"),
    cookTime: first("cookTime"),
    totalTime: first("totalTime"),
    recipeYield: first("recipeYield"),
    recipeIngredient: own("recipeIngredient")
      .map((_, el) => valueOf(el))
      .get(),
    recipeInstructions: instructions,
  };
}

// ---------- mapping onto the app's shape ----------

function imageFrom(value) {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return imageFrom(value[0]);
  return value.url || value.contentUrl || null;
}

function stepsFrom(value) {
  const steps = [];
  const walk = (node) => {
    if (!node) return;
    if (typeof node === "string") {
      // a plain string can hold several steps, one per line
      node
        .split(/\n|<br\s*\/?>|<\/p>/i)
        .map((line) => clean(line))
        .filter(Boolean)
        .forEach((line) => steps.push({ title: "", description: line }));
      return;
    }
    if (Array.isArray(node)) return node.forEach(walk);
    if (node.itemListElement) return walk(node.itemListElement); // HowToSection
    const description = clean(node.text || node.description || "");
    const title = clean(node.name || "");
    if (description) steps.push({ title: title === description ? "" : title, description });
    else if (title) steps.push({ title: "", description: title });
  };
  walk(value);
  return steps.map((step, index) => ({ ...step, order: index + 1 }));
}

function mapRecipe(raw) {
  const ingredients = [].concat(raw.recipeIngredient || raw.ingredients || []).map(parseIngredient);
  const steps = stepsFrom(raw.recipeInstructions);
  const minutes =
    parseDuration(raw.totalTime) || parseDuration(raw.prepTime) + parseDuration(raw.cookTime);

  return {
    name: clean(raw.name),
    description: clean(raw.description),
    time_to_make: minutes,
    servings: parseServings(raw.recipeYield),
    ingredients: ingredients.filter((ing) => ing.name),
    steps,
    imageUrl: imageFrom(raw.image),
  };
}

// Pure part (easy to test): HTML string -> recipe or null
function extractRecipeFromHtml(html) {
  const $ = cheerio.load(html);
  const raw = findJsonLdRecipe($) || findMicrodataRecipe($);
  if (!raw) return null;

  const recipe = mapRecipe(raw);
  if (!recipe.name || (recipe.ingredients.length === 0 && recipe.steps.length === 0)) return null;
  return recipe;
}

async function fetchImageAsDataUrl(imageUrl, baseUrl) {
  try {
    const absolute = new URL(imageUrl, baseUrl).toString();
    const { buffer, contentType } = await safeFetch(absolute, { accept: "image/*", maxBytes: MAX_IMAGE_BYTES });
    if (!contentType.startsWith("image/")) return null;
    return `data:${contentType.split(";")[0]};base64,${buffer.toString("base64")}`;
  } catch {
    return null; // a missing photo must not fail the whole import
  }
}

async function importRecipeFromUrl(rawUrl) {
  const { buffer } = await safeFetch(rawUrl, { accept: "text/html,application/xhtml+xml", maxBytes: MAX_HTML_BYTES });
  const recipe = extractRecipeFromHtml(buffer.toString("utf8"));
  if (!recipe) {
    throw new ImportError(
      "Nie znaleziono przepisu na tej stronie. Spróbuj opcji z AI (wklejenie gotowego JSON-a).",
    );
  }

  const { imageUrl, ...rest } = recipe;
  return {
    ...rest,
    sourceUrl: rawUrl,
    imageDataUrl: imageUrl ? await fetchImageAsDataUrl(imageUrl, rawUrl) : null,
  };
}

module.exports = {
  ImportError,
  fetchImageAsDataUrl,
  importRecipeFromUrl,
  extractRecipeFromHtml,
  parseIngredient,
  parseDuration,
  parseServings,
  isPrivateIp,
};
