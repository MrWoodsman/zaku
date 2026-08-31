/**
 * Przekształca czas na format HH:MM
 *
 * @param time czas który chcemy przekształcić
 * @returns Zwraca HH:MM
 */
export function convertTimeToHHMM(time: string) {
  const h = String(new Date(time).getHours()).padStart(2, "0");
  const m = String(new Date(time).getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}
