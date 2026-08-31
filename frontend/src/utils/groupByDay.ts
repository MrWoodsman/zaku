import type { ShoppingItem } from "@shared/types";

type HistoryItem = ShoppingItem & { completed_at: string };

export function groupByDay(items: HistoryItem[]) {
  return items.reduce(
    (groups, item) => {
      const day = item.completed_at.split(" ")[0]; // "2026-07-07"

      if (!groups[day]) {
        groups[day] = [];
      }
      groups[day].push(item);

      return groups;
    },
    {} as Record<string, HistoryItem[]>,
  );
}
