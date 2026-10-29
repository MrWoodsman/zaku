import type { MealSlot } from "@shared/types";
import { MEAL_SLOTS } from "@/config/planner";

interface SlotTogglesProps {
  value: MealSlot[];
  onChange: (slots: MealSlot[]) => void;
}

// Which meals of the day a person wants to see. At least one stays on - a day with no
// meals at all would have nowhere to add anything.
export function SlotToggles({ value, onChange }: SlotTogglesProps) {
  const toggle = (slot: MealSlot) => {
    if (!value.includes(slot)) {
      onChange(
        MEAL_SLOTS.map((s) => s.slot).filter(
          (s) => s === slot || value.includes(s),
        ),
      );
    } else if (value.length > 1) {
      onChange(value.filter((s) => s !== slot));
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {MEAL_SLOTS.map(({ slot, label }) => {
        const isOn = value.includes(slot);

        return (
          <button
            key={slot}
            type="button"
            aria-pressed={isOn}
            onClick={() => toggle(slot)}
            className={`h-11 rounded-full border px-4 text-sm font-medium transition-[transform,color,background-color,border-color] duration-160 ease-snappy active:scale-95 motion-reduce:active:scale-100 ${
              isOn
                ? "border-transparent bg-highlight text-highlight-foreground"
                : "border-border text-muted-foreground"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
