// Recipe import from a web page: download it, parse it, fetch the photo.
const { ImportError, safeFetch } = require("./safeFetch");
const { extractRecipeFromHtml } = require("./recipeParser");

const MAX_HTML_BYTES = 3 * 1024 * 1024;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

// Photo as a data URL, or null when it cannot be fetched (a missing photo must not fail the import)
async function fetchImageAsDataUrl(imageUrl, baseUrl) {
  try {
    const absolute = new URL(imageUrl, baseUrl).toString();
    const { buffer, contentType } = await safeFetch(absolute, { accept: "image/*", maxBytes: MAX_IMAGE_BYTES });
    if (!contentType.startsWith("image/")) return null;
    return `data:${contentType.split(";")[0]};base64,${buffer.toString("base64")}`;
  } catch {
    return null;
  }
}

async function importRecipeFromUrl(rawUrl) {
  const { buffer } = await safeFetch(rawUrl, { accept: "text/html,application/xhtml+xml", maxBytes: MAX_HTML_BYTES });

  const recipe = extractRecipeFromHtml(buffer.toString("utf8"));
  if (!recipe) {
    throw new ImportError("Nie znaleziono przepisu na tej stronie. Spróbuj opcji z AI (wklejenie gotowego JSON-a).");
  }

  const { imageUrl, ...rest } = recipe;
  return {
    ...rest,
    sourceUrl: rawUrl,
    imageDataUrl: imageUrl ? await fetchImageAsDataUrl(imageUrl, rawUrl) : null,
  };
}

module.exports = { importRecipeFromUrl, fetchImageAsDataUrl, ImportError };
