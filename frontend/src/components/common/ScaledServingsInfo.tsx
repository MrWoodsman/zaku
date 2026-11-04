import { useState } from "react";
import { RotateCcwIcon, TriangleAlertIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { formatPortions } from "@/utils/plural";

interface ScaledServingsInfoProps {
  baseServings: number;
  servings: number;
  // Back to the servings the recipe was written for
  onReset: () => void;
}

// Sits next to a ServingsStepper. When the amounts have been scaled a warning triangle fades in
// (explains it and offers the way back); otherwise the slot stays empty at the same size, so the
// stepper never shifts. A CSS transition, not a keyframe: tapping the stepper quickly can
// reverse it halfway.
export function ScaledServingsInfo({ baseServings, servings, onReset }: ScaledServingsInfoProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isScaled = servings !== baseServings;

  return (
    // Back at the original servings the popover has nothing to say, so it closes with the icon
    <Popover open={isOpen && isScaled} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-lg"
          // Hidden = still there (no layout shift) but invisible, out of the tab order, untappable
          aria-hidden={!isScaled}
          tabIndex={isScaled ? 0 : -1}
          aria-label="Ilości są przeliczone - pokaż szczegóły"
          className={cn(
            "size-11 shrink-0 text-amber-600 dark:text-amber-400",
            // scale-* is the CSS `scale` property in Tailwind 4, so it is listed itself
            "transition-[opacity,scale] duration-200 ease-out motion-reduce:transition-opacity",
            isScaled
              ? "scale-100 opacity-100"
              : "pointer-events-none scale-75 opacity-0 motion-reduce:scale-100",
          )}
        >
          <TriangleAlertIcon className="size-5" />
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-64 gap-3 p-3">
        <p className="text-sm">
          Ilości są przeliczone z oryginału ({formatPortions(baseServings)}). To przybliżenie -
          przyprawy i czas przygotowania mogą wymagać poprawki.
        </p>
        <Button
          type="button"
          variant="secondary"
          className="h-10 w-full"
          onClick={() => {
            setIsOpen(false);
            onReset();
          }}
        >
          <RotateCcwIcon /> Wróć do oryginału ({formatPortions(baseServings)})
        </Button>
      </PopoverContent>
    </Popover>
  );
}
