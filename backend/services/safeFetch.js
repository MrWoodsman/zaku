// Fetching a page or image for the recipe import. The server must not be usable to poke around
// the LAN, so every address (and every redirect hop) is checked, and time and size are capped.
const dns = require("dns").promises;
const net = require("net");

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

module.exports = { ImportError, safeFetch, isPrivateIp };
