import { differenceInCalendarDays, format } from "date-fns";
import { pl } from "date-fns/locale";
import { DepositDatePicker } from "./DepositDatePicker";
import { computeExpiryDate } from "./depositStatus";

interface DepositValidityFieldsProps {
  receivedDate: Date | undefined;
  onReceivedDateChange: (date: Date | undefined) => void;
  validDays: number | string;
  onValidDaysChange: (days: number | string) => void;
}

// The voucher shows the day it was printed and how long it's valid - so the form asks for
// those two and shows the resulting expiry date (only that is saved). Used when adding
// and editing a voucher.
export function DepositValidityFields({
  receivedDate,
  onReceivedDateChange,
  validDays,
  onValidDaysChange,
}: DepositValidityFieldsProps) {
  const expiryDate = computeExpiryDate(receivedDate, validDays);
  const isAlreadyExpired = !!expiryDate && differenceInCalendarDays(expiryDate, new Date()) < 0;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="grid grid-cols-[minmax(0,1fr)_6.5rem] items-stretch gap-2">
        <DepositDatePicker
          value={receivedDate}
          onChange={onReceivedDateChange}
          label="Otrzymany"
          disableFuture
          // The expiry day is marked in the calendar too, so both dates are visible at once
          highlightDate={expiryDate}
          highlightLabel="Ważny do"
        />

        {/* Same input + suffix box as the value field */}
        <div className="box-border flex h-11 w-full items-center overflow-hidden rounded-lg border border-input bg-background focus-within:ring-2 focus-within:ring-primary">
          <input
            type="number"
            inputMode="numeric"
            min="1"
            step="1"
            aria-label="Ile dni ważny"
            value={validDays}
            onChange={(e) => {
              const val = e.target.value;
              onValidDaysChange(val === "" ? "" : Number(val));
            }}
            className="h-full w-full min-w-0 flex-1 border-none bg-transparent px-2 py-0 text-center text-base text-foreground outline-none shadow-none focus:ring-0"
          />
          <div className="flex h-full items-center justify-center border-l border-input bg-foreground/5 px-3 text-sm font-medium text-foreground/60">
            dni
          </div>
        </div>
      </div>

      <p className={`px-1 text-xs ${isAlreadyExpired ? "text-destructive" : "text-muted-foreground"}`}>
        {expiryDate
          ? `${isAlreadyExpired ? "Już po terminie - był ważny" : "Ważny"} do ${format(expiryDate, "d MMMM yyyy (EEEE)", { locale: pl })}`
          : "Podaj, ile dni kupon jest ważny"}
      </p>
    </div>
  );
}
