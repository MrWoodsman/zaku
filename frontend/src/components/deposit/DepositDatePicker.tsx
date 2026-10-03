import { format } from "date-fns";
import { pl } from "date-fns/locale"; // Polska lokalizacja dla date-fns
import { CalendarIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DepositDatePickerProps {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  // Small muted label before the date, e.g. "Otrzymany"
  label?: string;
  // Days after today can't be picked (e.g. the day a voucher was received)
  disableFuture?: boolean;
  // Extra day marked in the calendar (not selectable on its own), e.g. the expiry date
  highlightDate?: Date;
  // Legend under the calendar explaining the highlighted day, e.g. "Ważny do"
  highlightLabel?: string;
}

export function DepositDatePicker({
  value,
  onChange,
  label,
  disableFuture = false,
  highlightDate,
  highlightLabel,
}: DepositDatePickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          // dark:bg-background overrides outline's dark:bg-input/30, which looked like a disabled field
          className={`box-border h-11 w-full min-w-0 justify-start border-input bg-background dark:bg-background py-0 text-left font-normal ${
            !value ? "text-muted-foreground" : "text-foreground"
          }`}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          {label && <span className="mr-1.5 text-muted-foreground">{label}</span>}
          {value ? (
            // Shorter date when sharing the row with a label
            <span className="truncate">{format(value, label ? "d MMM yyyy" : "d MMMM yyyy", { locale: pl })}</span>
          ) : (
            <span>Wybierz datę</span>
          )}
        </Button>
      </PopoverTrigger>
      {/* Trigger width so it's easy to tap on a phone - but at least 18rem when the
          trigger shares a row with another field, and at most 24rem on desktop */}
      <PopoverContent
        className="p-0"
        align="start"
        style={{ width: "min(max(var(--radix-popover-trigger-width), 18rem), 24rem)" }}
      >
        <Calendar
          mode="single"
          // required: tapping the already selected day doesn't clear the date
          required
          selected={value}
          disabled={disableFuture ? { after: new Date() } : undefined}
          // Orange ring on the highlighted day - stays visible even when it's a disabled (future) day
          modifiers={highlightDate ? { highlighted: highlightDate } : undefined}
          modifiersClassNames={{
            highlighted:
              "rounded-(--cell-radius) opacity-100! ring-2 ring-inset ring-highlight text-highlight font-semibold",
          }}
          // Open on the selected date's month (default +30 days is usually next month)
          defaultMonth={value}
          onSelect={(date) => {
            onChange(date);
            setOpen(false);
          }}
          locale={pl}
          // Day cells are flex-1 + aspect-square, so a full-width root makes them grow
          className="[--cell-size:--spacing(10)]"
          classNames={{ root: "w-full" }}
        />
        {/* The highlighted day is often next month - say what the ring means and when it is */}
        {highlightDate && highlightLabel && (
          <div className="flex items-center gap-2 border-t border-border px-3 py-2.5 text-xs text-muted-foreground">
            <span className="size-3.5 shrink-0 rounded-sm ring-2 ring-inset ring-highlight" />
            {highlightLabel} {format(highlightDate, "d MMMM yyyy", { locale: pl })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
