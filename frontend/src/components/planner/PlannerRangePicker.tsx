import { useState } from "react";
import { format, isSameDay } from "date-fns";
import { pl } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface PlannerRangePickerProps {
  value: DateRange | undefined;
  onChange: (range: DateRange | undefined) => void;
}

// Pick the first and the last day on one calendar (same look as the deposit date picker).
// The popover closes once both ends are set; "Gotowe" is for a single-day range.
export function PlannerRangePicker({ value, onChange }: PlannerRangePickerProps) {
  const [open, setOpen] = useState(false);

  const label = (() => {
    if (!value?.from) return "Wybierz zakres";
    const from = format(value.from, "d MMM", { locale: pl });
    if (!value.to || isSameDay(value.from, value.to)) return format(value.from, "d MMMM yyyy", { locale: pl });
    return `${from} - ${format(value.to, "d MMM yyyy", { locale: pl })}`;
  })();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          // dark:bg-background overrides outline's dark:bg-input/30, which looked like a disabled field
          className={`box-border h-11 w-full min-w-0 justify-start border-input bg-background dark:bg-background py-0 text-left font-normal ${
            value?.from ? "text-foreground" : "text-muted-foreground"
          }`}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          <span className="truncate">{label}</span>
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="p-0"
        align="start"
        style={{ width: "min(max(var(--radix-popover-trigger-width), 18rem), 24rem)" }}
      >
        <Calendar
          mode="range"
          selected={value}
          // Open on the month the range starts in
          defaultMonth={value?.from}
          onSelect={(range) => {
            onChange(range);
            if (range?.from && range.to && !isSameDay(range.from, range.to)) setOpen(false);
          }}
          locale={pl}
          weekStartsOn={1}
          // Day cells are flex-1 + aspect-square, so a full-width root makes them grow
          className="[--cell-size:--spacing(10)]"
          classNames={{ root: "w-full" }}
        />
        <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2.5">
          <span className="text-xs text-muted-foreground">Dotknij pierwszego i ostatniego dnia</span>
          <Button size="sm" variant="secondary" disabled={!value?.from} onClick={() => setOpen(false)}>
            Gotowe
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
