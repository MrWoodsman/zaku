import { useRef, useState } from "react";
import { Button } from "../../ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Plus } from "lucide-react";
import { Checkbox } from "../../ui/checkbox";
import { useAddItemMutation } from "@/hooks/useItemMutations";
import { showSuccessToast } from "@/utils/toastHandler";

interface ItemAddOverlayProps {
  listId: string;
}

const UNITS = ["szt.", "kg", "g", "l", "ml", "opak."];

export function ItemAddOverlay({ listId }: ItemAddOverlayProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const addItemMutation = useAddItemMutation(listId);

  const [isOpen, setIsOpen] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("szt.");
  const [keepOpen, setKeepOpen] = useState(false);

  const fieldClass =
    "h-11 w-full rounded-lg border border-input bg-background px-3 text-base text-foreground outline-none focus:ring-2 focus:ring-primary";

  // Dodajemy e: React.FormEvent, żeby móc użyć preventDefault()
  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (newItemName.trim() === "") return;

    const nameToSubmit = newItemName;
    const qtyToSubmit = parseFloat(quantity) || 1;
    const unitToSubmit = unit;

    if (keepOpen) {
      setNewItemName("");
      setQuantity("1");
      setTimeout(() => {
        inputRef.current?.focus();
      }, 10);
    }

    addItemMutation.mutate(
      {
        name: nameToSubmit,
        quantity: qtyToSubmit,
        unit: unitToSubmit,
      },
      {
        onSuccess: () => {
          showSuccessToast(`Pomyślnie dodano produkt ${nameToSubmit}`);
          if (!keepOpen) {
            setIsOpen(false);
            setNewItemName("");
            setQuantity("1");
          }
        },
      },
    );
  };

  return (
    <Drawer open={isOpen} onOpenChange={setIsOpen}>
      <DrawerTrigger asChild>
        <Button variant={"accent"} onClick={(e) => e.currentTarget.blur()}>
          Dodaj <Plus className="size-4" />
        </Button>
      </DrawerTrigger>

      <DrawerContent className="bg-background border-border px-4 pb-[max(24px,env(safe-area-inset-bottom))]">
        <DrawerHeader className="px-0 text-left">
          <DrawerTitle>Dodaj nowy produkt</DrawerTitle>
        </DrawerHeader>

        {/* ZMIANA: Zamiast <div>, używamy <form onSubmit={...}> */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-2">
          <input
            ref={inputRef}
            type="text"
            placeholder="Np. Mleko 2%..."
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            // USUNIĘTO onKeyDown! Formularz HTML sam wie, że "Enter" na klawiaturze to "Submit"
            className={fieldClass}
          />

          <div className="grid grid-cols-2 gap-2 items-stretch">
            <input
              type="number"
              min="0.1"
              step="any"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className={`${fieldClass} text-center`}
            />

            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className={`${fieldClass} appearance-none text-center`}
            >
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>

          <label
            htmlFor="keep-open-checkbox"
            className="flex items-center gap-3 py-2 cursor-pointer select-none"
          >
            <Checkbox
              id="keep-open-checkbox"
              checked={keepOpen}
              onCheckedChange={(checked) => setKeepOpen(checked as boolean)}
              className="size-5"
            />
            <span className="text-sm text-foreground">Dodawaj wiele produktów z rzędu</span>
          </label>

          <Button
            type="submit" // ZMIANA: Dodano typ submit
            className="w-full h-11 mt-2"
            disabled={(addItemMutation.isPending && !keepOpen) || newItemName.length == 0} // Wyłączamy przycisk tylko, jeśli okienko ma się zamknąć
          >
            {addItemMutation.isPending && !keepOpen ? "Zapisywanie..." : "Zapisz produkt"}
          </Button>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
