// Polish has three forms of a counted noun: 1 porcja, 2-4 porcje, 5+ porcji
// (12-14 take the last one too: 12 porcji, not 12 porcje). Pass the three forms, get the right one.
export const pluralPl = (count: number, one: string, few: string, many: string) => {
  if (count === 1) return one;

  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;
  const isFew = lastDigit >= 2 && lastDigit <= 4 && (lastTwoDigits < 12 || lastTwoDigits > 14);

  return isFew ? few : many;
};

// "1 porcja", "3 porcje", "5 porcji"
export const formatPortions = (count: number) =>
  `${count} ${pluralPl(count, "porcja", "porcje", "porcji")}`;
