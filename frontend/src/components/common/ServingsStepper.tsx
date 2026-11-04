import { MinusIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatPortions } from "@/utils/plural";

interface ServingsStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  // Across the whole width, with big buttons at the edges - for a step of its own (the planner).
  // Default is the compact pill that sits next to a heading.
  fullWidth?: boolean;
}

// "- 4 porcje +": the servings somebody wants. Used wherever a recipe's amounts get scaled.
export function ServingsStepper({
  value,
  onChange,
  min = 1,
  max = 100,
  fullWidth = false,
}: ServingsStepperProps) {
  return (
    <div
      className={cn(
        "items-center rounded-xl border border-border bg-background",
        fullWidth ? "flex w-full" : "inline-flex",
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon-lg"
        className={cn(
          "transition-transform duration-160 ease-snappy active:scale-95 motion-reduce:active:scale-100",
          fullWidth ? "size-12" : "size-11",
        )}
        aria-label="Mniej porcji"
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
      >
        <MinusIcon />
      </Button>
      <span
        // tabular figures: the text doesn't shift when 9 turns into 10
        className={cn(
          "text-center font-medium tabular-nums",
          fullWidth ? "flex-1 text-base" : "min-w-24 text-sm",
        )}
        aria-live="polite"
      >
        {formatPortions(value)}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon-lg"
        className={cn(
          "transition-transform duration-160 ease-snappy active:scale-95 motion-reduce:active:scale-100",
          fullWidth ? "size-12" : "size-11",
        )}
        aria-label="Więcej porcji"
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
      >
        <PlusIcon />
      </Button>
    </div>
  );
}
