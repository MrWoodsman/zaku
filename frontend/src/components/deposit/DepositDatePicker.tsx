import { format } from "date-fns";
import { pl } from "date-fns/locale"; // Polska lokalizacja dla date-fns
import { CalendarIcon } from "lucide-react";

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
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={`box-border h-11 w-full justify-start border-input bg-background py-0 text-left font-normal ${
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
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={onChange}
          locale={pl}
        />
      </PopoverContent>
    </Popover>
  );
}
