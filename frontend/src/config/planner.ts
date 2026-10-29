import type { MealSlot } from "@shared/types";

// Every meal of the day a person can turn on, in the order they happen
export const MEAL_SLOTS: { slot: MealSlot; label: string }[] = [
  { slot: "breakfast", label: "Śniadanie" },
  { slot: "second_breakfast", label: "Drugie śniadanie" },
  { slot: "lunch", label: "Obiad" },
  { slot: "snack", label: "Przekąska" },
  { slot: "dinner", label: "Kolacja" },
];

// What a person sees until they pick their own (same as on the backend)
export const DEFAULT_SLOTS: MealSlot[] = ["breakfast", "lunch", "dinner"];

// Colors a person can pick. All mid-tone, so white text reads on every one of them.
export const PERSON_COLORS = [
  "#f97316", // orange
  "#ef4444", // red
  "#ec4899", // pink
  "#8b5cf6", // purple
  "#3b82f6", // blue
  "#14b8a6", // teal
  "#22c55e", // green
  "#ca8a04", // gold
] as const;

// Shown when "everyone" is selected, or for a meal that isn't assigned to anyone
export const SHARED_COLOR = "#a3a3a3";
