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
}

export function DepositDatePicker({ value, onChange }: DepositDatePickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          // dark:bg-background overrides outline's dark:bg-input/30, which looked like a disabled field
          className={`box-border h-11 w-full justify-start border-input bg-background dark:bg-background py-0 text-left font-normal ${
            !value ? "text-muted-foreground" : "text-foreground"
          }`}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? (
            format(value, "d MMMM yyyy", { locale: pl })
          ) : (
            <span>Wybierz datę</span>
          )}
        </Button>
      </PopoverTrigger>
      {/* Same width as the trigger so it's easy to tap on a phone, but capped
          so it doesn't stretch into huge cells on desktop */}
      <PopoverContent
        className="p-0"
        align="start"
        style={{ width: "min(var(--radix-popover-trigger-width), 24rem)" }}
      >
        <Calendar
          mode="single"
          // required: tapping the already selected day doesn't clear the date
          required
          selected={value}
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
      </PopoverContent>
    </Popover>
  );
}
