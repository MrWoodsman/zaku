import type { RecipeItem } from "@shared/types";

// What the editor needs to start from an imported recipe: the form seed plus the photo as a file
// (the editor uploads the photo as a file, so a downloaded image has to become one).
export interface ImportSeed {
  recipe: Partial<RecipeItem>;
  imageFile: File | null;
  // Where it came from - drives the notice shown in the editor
  origin: "link" | "ai";
}

// "https://www.aniagotuje.pl/przepis/x" -> "aniagotuje.pl" (the raw text when it is not a URL)
export function sourceHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

// Hand-off between the import drawer and the editor. Kept in memory rather than in the router
// state: history state has small size limits on iOS Safari and a photo would blow through them.
let pendingSeed: ImportSeed | null = null;
export const setPendingImportSeed = (seed: ImportSeed | null) => {
  pendingSeed = seed;
};
export const peekPendingImportSeed = () => pendingSeed;

// Response of POST /api/v1/recipes/import
export interface ImportedRecipeResponse {
  name: string;
  description: string;
  time_to_make: number;
  servings: number | null;
  ingredients: NonNullable<RecipeItem["ingredients"]>;
  steps: NonNullable<RecipeItem["steps"]>;
  sourceUrl: string;
  imageDataUrl: string | null;
}

// Keep in sync with UNITS in RecipeIngredientsForm
const ALLOWED_UNITS = ["szt.", "kg", "g", "l", "ml", "opak."];

export const AI_RECIPE_PROMPT = `Przygotuj przepis do importu do mojej aplikacji kulinarnej.

Na końcu tej wiadomości dostaniesz link do przepisu albo jego treść. Jeśli masz dostęp do internetu, otwórz link i przeczytaj przepis. Jeśli nie możesz otworzyć linku, napisz mi o tym i poproś o wklejenie treści przepisu.

Odpowiedz WYŁĄCZNIE jednym poprawnym obiektem JSON (bez komentarzy i bez żadnego tekstu poza nim, najlepiej w jednym bloku kodu) w dokładnie takim formacie:

{
  "name": "Nazwa przepisu",
  "description": "Krótki opis w 1-2 zdaniach",
  "time_to_make": 45,
  "servings": 4,
  "image_url": "https://example.com/zdjecie.jpg",
  "source_url": "https://example.com/przepis",
  "ingredients": [
    { "name": "mąka pszenna", "quantity": 250, "unit": "g" },
    { "name": "sól do smaku", "quantity": 0, "unit": "" }
  ],
  "steps": [
    { "title": "Krótki tytuł kroku", "description": "Pełny opis kroku." }
  ]
}

Zasady:
- Wszystko po polsku (przetłumacz, jeśli przepis jest w innym języku).
- "time_to_make": łączny czas w minutach, liczba całkowita (0 jeśli brak informacji).
- "servings": liczba porcji jako liczba całkowita od 1 do 100 albo null, jeśli przepis jej nie podaje.
- "image_url": bezpośredni adres głównego zdjęcia przepisu ze strony (np. z meta og:image albo ze zdjęcia dania), kończący się jak plik graficzny. Podaj go tylko wtedy, gdy naprawdę go widzisz na stronie. Nie zgaduj i nie wymyślaj adresów - jeśli go nie masz, wpisz null.
- "source_url": adres strony z przepisem, dokładnie ten link, który dostałeś ode mnie. Jeśli dostałeś sam tekst bez linku, wpisz null.
- "quantity": liczba z kropką dziesiętną (np. 0.5), bez tekstu. Jeśli ilość nie jest podana (np. "sól do smaku"), wpisz 0.
- "unit": TYLKO jedna z wartości: "szt.", "kg", "g", "l", "ml", "opak." albo pusty tekst "". Przelicz na te jednostki, gdy się da (np. 1 szklanka mleka = 250 ml). Łyżki, łyżeczki, szczypty i inne miary zostaw w "name" (np. "łyżki oliwy") z pustą jednostką.
- "name" składnika to sam składnik, bez ilości i jednostki.
- "steps": kolejne kroki w kolejności wykonania; "title" to 2-4 słowa, "description" to pełny opis. Niczego nie dopisuj od siebie.

Przepis do przetworzenia:
`;

// Copies text to the clipboard. navigator.clipboard only exists on https / localhost, and a
// self-hosted app is often opened over plain http on the LAN, hence the textarea fallback.
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the fallback
  }

  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  area.setSelectionRange(0, text.length);
  const ok = document.execCommand("copy");
  document.body.removeChild(area);
  return ok;
}

async function dataUrlToFile(dataUrl: string, baseName: string): Promise<File | null> {
  try {
    const blob = await (await fetch(dataUrl)).blob();
    const extension = blob.type.split("/")[1]?.replace("jpeg", "jpg") || "jpg";
    return new File([blob], `${baseName}.${extension}`, { type: blob.type });
  } catch {
    return null;
  }
}

// Adds a downloaded photo (data URL) to a seed; a failed conversion just leaves it without one
export async function withImage(seed: ImportSeed, imageDataUrl: string | null): Promise<ImportSeed> {
  const imageFile = imageDataUrl ? await dataUrlToFile(imageDataUrl, "recipe") : null;
  if (!imageFile) return seed;
  return { ...seed, recipe: { ...seed.recipe, image_url: URL.createObjectURL(imageFile) }, imageFile };
}

// Backend response -> editor seed
export async function seedFromImport(imported: ImportedRecipeResponse): Promise<ImportSeed> {
  const imageFile = imported.imageDataUrl ? await dataUrlToFile(imported.imageDataUrl, "recipe") : null;

  return {
    recipe: {
      name: imported.name,
      description: imported.description,
      time_to_make: imported.time_to_make,
      servings: imported.servings,
      ingredients: imported.ingredients,
      steps: imported.steps,
      image_url: imageFile ? URL.createObjectURL(imageFile) : null,
      source_url: imported.sourceUrl || null,
    },
    imageFile,
    origin: "link",
  };
}

const isHttpUrl = (value: unknown): value is string =>
  typeof value === "string" && /^https?:\/\/\S+$/i.test(value.trim());

// Pasted AI answer -> editor seed. Throws an Error with a user-facing (Polish) message.
export function seedFromAiJson(text: string): ImportSeed & { imageUrl: string | null } {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) {
    throw new Error("Nie widzę w tym tekście obiektu JSON. Wklej całą odpowiedź AI.");
  }

  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(text.slice(start, end + 1));
  } catch {
    throw new Error("To nie jest poprawny JSON. Poproś AI, żeby poprawił format.");
  }

  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  if (!name) throw new Error('W odpowiedzi brakuje nazwy przepisu ("name").');

  const ingredients = (Array.isArray(raw.ingredients) ? raw.ingredients : [])
    .map((item) => {
      const ing = (item ?? {}) as Record<string, unknown>;
      let ingName = String(ing.name ?? "").trim();
      let unit = String(ing.unit ?? "").trim();
      // a unit the app does not offer would show up empty in the form, so keep it in the name
      if (unit && !ALLOWED_UNITS.includes(unit)) {
        ingName = `${unit} ${ingName}`.trim();
        unit = "";
      }
      const quantity = Number(String(ing.quantity ?? "").replace(",", ".")) || 0;
      return { name: ingName, quantity, unit };
    })
    .filter((ing) => ing.name);

  const steps = (Array.isArray(raw.steps) ? raw.steps : [])
    .map((item) => {
      const step = (item ?? {}) as Record<string, unknown>;
      return { title: String(step.title ?? "").trim(), description: String(step.description ?? "").trim() };
    })
    .filter((step) => step.description)
    .map((step, index) => ({ ...step, order: index + 1 }));

  if (ingredients.length === 0 && steps.length === 0) {
    throw new Error("W odpowiedzi nie ma ani składników, ani kroków.");
  }

  const servings = Math.round(Number(raw.servings));

  return {
    recipe: {
      name,
      description: typeof raw.description === "string" ? raw.description.trim() : "",
      time_to_make: Math.max(0, Math.round(Number(raw.time_to_make)) || 0),
      servings: servings >= 1 && servings <= 100 ? servings : null,
      ingredients,
      steps,
      source_url: isHttpUrl(raw.source_url) ? raw.source_url.trim() : null,
    },
    imageFile: null,
    origin: "ai",
    imageUrl: isHttpUrl(raw.image_url) ? raw.image_url.trim() : null,
  };
}
