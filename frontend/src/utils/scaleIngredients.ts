// Scaling a recipe's ingredient amounts from the servings it was written for to the servings
// somebody wants. Amounts are never stored scaled - the recipe keeps its own, this works them
// out on the fly.

const toNumber = (quantity: number | string | null | undefined): number | null => {
  if (quantity === null || quantity === undefined || quantity === "") return null;
  const value = Number(String(quantity).replace(",", "."));
  return Number.isFinite(value) ? value : null;
};

// Rounds like a cook would measure: big amounts to 5, mid ones to a whole number, small ones to
// a quarter, tiny ones to two decimals - 266.667 g is not something you can weigh out
export function roundAmount(value: number): number {
  if (value >= 100) return Math.round(value / 5) * 5;
  if (value >= 10) return Math.round(value);
  if (value >= 1) return Math.round(value * 4) / 4;
  return Math.round(value * 20) / 20;
}

// The amount for `to` servings. Returns the original amount untouched when there is nothing to
// scale (same servings, a recipe without servings) or the amount isn't a number ("do smaku").
export function scaleAmount(
  quantity: number | string | null | undefined,
  from: number | null | undefined,
  to: number | null | undefined,
): number | string | null | undefined {
  const amount = toNumber(quantity);
  if (amount === null || !from || !to || from === to) return quantity;

  return roundAmount((amount * to) / from);
}

// 1.5 -> "1,5", 250 -> "250" (Polish decimal comma); anything that isn't a number stays as it is
export function formatAmount(quantity: number | string | null | undefined): string {
  const amount = toNumber(quantity);
  if (amount === null) return quantity === null || quantity === undefined ? "" : String(quantity);

  return String(Math.round(amount * 100) / 100).replace(".", ",");
}
