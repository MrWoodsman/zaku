import { useState } from "react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Checkbox } from "@/components/ui/checkbox";
import { EllipsisVertical, Trash2, Check } from "lucide-react";
import { type ShoppingItem } from "@shared/types";
import { useDeleteItemMutation, useUpdateItemMutation } from "@/hooks/useItemMutations";
import { showSuccessToast } from "@/utils/toastHandler";

interface ItemSettingsProps {
  listId: string;
  item: ShoppingItem;
}

export function ItemSettingsOverlay({ listId, item }: ItemSettingsProps) {
  const deleteItemMutation = useDeleteItemMutation(listId);
  const updateItemMutation = useUpdateItemMutation(listId);

  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState(item.name);
  const [quantity, setQuantity] = useState(String(item.quantity));
  const [unit, setUnit] = useState(item.unit);
  const [completed, setCompleted] = useState(item.completed);
  const fieldClass =
    "h-11 w-full rounded-lg border border-input bg-background px-3 text-base text-foreground outline-none focus:ring-2 focus:ring-primary";

  return (
    <Drawer open={isOpen} onOpenChange={setIsOpen}>
      {/* TRIGGER - Twoje 3 kropki */}
      <DrawerTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-auto w-12 shrink-0 rounded-none"
          onClick={(e) => e.currentTarget.blur()}
        >
          <EllipsisVertical className="size-5 text-foreground/75" />
        </Button>
      </DrawerTrigger>

      <DrawerContent
        className="bg-background border-border px-4 pb-[max(24px,env(safe-area-inset-bottom))]"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <DrawerHeader className="px-0 text-left pb-6">
          <DrawerTitle className="text-xl">Opcje: {item.name}</DrawerTitle>
        </DrawerHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-foreground">Nazwa</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nazwa produktu"
              className={fieldClass}
            />
          </div>

          <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground">Ilość</label>
              <Input
                type="number"
                min="0.1"
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className={`${fieldClass} text-center`}
              />
            </div>

            <div className="flex flex-col gap-2 min-w-24">
              <label className="text-sm font-medium text-foreground">Jednostka</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className={`${fieldClass} appearance-none text-center`}
              >
                <option value="szt.">szt.</option>
                <option value="kg">kg</option>
                <option value="g">g</option>
                <option value="l">l</option>
                <option value="ml">ml</option>
                <option value="opak.">opak.</option>
              </select>
            </div>
          </div>

          <label
            htmlFor={`completed-${item.id}`}
            className="flex items-center gap-3 rounded-lg border border-border p-3 cursor-pointer select-none"
          >
            <Checkbox
              id={`completed-${item.id}`}
              checked={completed}
              onCheckedChange={(checked) => setCompleted(checked as boolean)}
              className="size-4.5 border-foreground/25 bg-foreground/2.5"
            />
            <span className="text-sm">Produkt kupiony</span>
          </label>

          <Button
            variant="accent"
            className="justify-start h-14 text-base"
            onClick={() => {
              const trimmedName = name.trim();
              if (!trimmedName) return;
              updateItemMutation.mutate(
                {
                  itemId: item.id,
                  data: {
                    name: trimmedName,
                    quantity: Number(quantity),
                    unit: unit,
                    completed: completed,
                  },
                },
                {
                  onSuccess: () => {
                    showSuccessToast(`Zapisano zmiany dla ${trimmedName}`);
                    setIsOpen(false);
                  },
                },
              );
            }}
            disabled={updateItemMutation.isPending || name.trim() === ""}
          >
            <Check className="mr-3 size-5" />
            {updateItemMutation.isPending ? "Zapisywanie..." : "Zapisz zmiany"}
          </Button>

          {/* Usuwanie - uderza w mutację */}
          <Button
            variant="destructive"
            className="justify-start h-14 text-base mt-2"
            disabled={deleteItemMutation.isPending}
            onClick={() =>
              deleteItemMutation.mutate(item.id, {
                onSuccess: () => {
                  showSuccessToast(`Pomyślnie usunięto ${item.name}`);
                  setIsOpen(false);
                },
              })
            }
          >
            <Trash2 className="mr-3 size-5" />
            {deleteItemMutation.isPending ? "Usuwanie..." : "Usuń produkt"}
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
