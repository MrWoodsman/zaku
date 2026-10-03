import { useState } from "react";
import { format, parseISO, subDays } from "date-fns";
import { HashIcon, X } from "lucide-react";
import type { Deposit } from "@shared/types";
import { Button } from "@/components/ui/button";
import { DepositValidityFields } from "@/components/deposit/DepositValidityFields";
import {
  DEFAULT_VALID_DAYS,
  computeExpiryDate,
  parseAmount,
  sanitizeAmountInput,
} from "@/components/deposit/depositStatus";
import { DepositShopSelect } from "@/components/deposit/DepositShopSelect";
import { useShopsQuery } from "@/hooks/useShops";
import { useUpdateDepositMutation } from "@/hooks/useDepositMutations";
import { showSuccessToast } from "@/utils/toastHandler";

interface DepositEditFormProps {
  deposit: Deposit;
  onDone: () => void;
}

// Same fields and look as DepositAddOverlay, but the code is editable here
// (to fix a misread barcode) and there's no photo upload
export function DepositEditForm({ deposit, onDone }: DepositEditFormProps) {
  const [code, setCode] = useState(deposit.code ?? "");
  // Shown with a comma, like it's typed on a Polish keypad
  const [value, setValue] = useState<string>(deposit.value.toFixed(2).replace(".", ","));
  // Only the expiry date is stored, so the received date is worked out backwards with the
  // default period - the fields start out showing exactly the saved expiry date
  const [receivedDate, setReceivedDate] = useState<Date | undefined>(() =>
    deposit.expiring_date
      ? subDays(parseISO(deposit.expiring_date), DEFAULT_VALID_DAYS)
      : new Date(),
  );
  const [validDays, setValidDays] = useState<number | string>(DEFAULT_VALID_DAYS);
  const date = computeExpiryDate(receivedDate, validDays);
  const [shopId, setShopId] = useState<number | null>(deposit.shop_id);

  const { data: shops = [], isLoading: isLoadingShops } = useShopsQuery();
  const { mutate: updateDeposit, isPending } = useUpdateDepositMutation();

  const canSave = parseAmount(value) > 0 && !!date && !isPending;

  const handleSave = () => {
    updateDeposit(
      {
        depositId: deposit.id,
        payload: {
          value: parseAmount(value),
          // Local date only, same reason as in DepositAddOverlay (toISOString shifts to UTC)
          expiring_date: date ? format(date, "yyyy-MM-dd") : null,
          shop_id: shopId,
          code: code.trim() || null,
        },
      },
      {
        onSuccess: () => {
          showSuccessToast("Zapisano zmiany kuponu");
          onDone();
        },
      },
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {/* NUMER KUPONU */}
      <div className="relative w-full">
        <HashIcon size={14} className="text-foreground/50 absolute top-1/2 left-3 -translate-y-1/2" />
        <input
          type="text"
          inputMode="numeric"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Numer kuponu"
          className="box-border h-11 w-full rounded-lg border bg-background px-10 py-0 text-center font-mono text-base text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <DepositValidityFields
        receivedDate={receivedDate}
        onReceivedDateChange={setReceivedDate}
        validDays={validDays}
        onValidDaysChange={setValidDays}
      />

      <div className="grid grid-cols-2 items-stretch gap-2">
        {/* WARTOSC */}
        <div className="box-border flex h-11 w-full items-center overflow-hidden rounded-lg border border-input bg-background focus-within:ring-2 focus-within:ring-primary">
          <input
            // text + inputMode="decimal": iPhone keypad with a comma (see DepositAddOverlay)
            type="text"
            inputMode="decimal"
            placeholder="0,50"
            value={value}
            onChange={(e) => setValue(sanitizeAmountInput(e.target.value))}
            className="h-full w-full flex-1 border-none bg-transparent px-3 py-0 text-center text-base text-foreground shadow-none outline-none focus:ring-0"
          />
          <div className="flex h-full items-center justify-center border-l border-input bg-foreground/5 px-4 text-sm font-medium text-foreground/60">
            PLN
          </div>
        </div>

        {/* SKLEP */}
        <DepositShopSelect
          value={shopId}
          onChange={setShopId}
          shops={shops}
          isLoading={isLoadingShops}
        />
      </div>

      {/* Same Cancel / Save pair as renaming a list in ListSettingsOverlay */}
      <div className="flex gap-2">
        <Button variant="outline" className="h-11 flex-1" onClick={onDone}>
          <X className="mr-2 size-4" />
          Anuluj
        </Button>
        <Button variant="raised" className="h-11 flex-1" disabled={!canSave} onClick={handleSave}>
          {isPending ? "Zapisywanie..." : "Zapisz"}
        </Button>
      </div>
    </div>
  );
}
