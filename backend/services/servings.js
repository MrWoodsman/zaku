// Servings are optional everywhere: missing or empty = NULL (nothing to scale), otherwise a
// whole number from 1 to 100. Returns { value } (null when not given) or { error }.
function readServings(raw) {
  if (raw === undefined || raw === null || raw === "") return { value: null };

  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > 100) {
    return { error: "Nieprawidłowa liczba porcji" };
  }

  return { value };
}

module.exports = { readServings };
