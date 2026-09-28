import { useState } from "react";
import { Button } from "../../ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { useAddListMutation } from "@/hooks/useListMutations";
import { showSuccessToast } from "@/utils/toastHandler";

interface ListAddOverlayProps {
  children: React.ReactNode;
}

const fieldClass =
  "h-11 w-full rounded-lg border border-input bg-background px-3 text-base text-foreground outline-none focus:ring-2 focus:ring-primary";


export function DepositAddOverlay({ children }: ListAddOverlayProps) {
  const addListMutation = useAddListMutation();
  const [newListName, setNewListName] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const [shopValue, setShopValue] = useState('')

  const handleCreate = () => {
    const trimmedName = newListName.trim();
    if (!trimmedName) return;

    addListMutation.mutate(trimmedName, {
      onSuccess: () => {
        setNewListName("");
        setIsOpen(false);
        showSuccessToast(`Pomyślnie utworzono liste ${trimmedName}`);
      },
    });
  };

  const SHOPS = ['Lidl', 'Biedronka', 'Aldi', 'Żabka']

  return (
    <Drawer open={isOpen} onOpenChange={setIsOpen}>
      <DrawerTrigger asChild>{children}</DrawerTrigger>

      <DrawerContent className="bg-background border-border px-4 pb-[max(24px,var(--safe-bottom))]">
        <DrawerHeader className="px-0 text-left">
          <DrawerTitle>Dodaj nowy kupon kaucji</DrawerTitle>
          <DrawerDescription>Wgraj wyraźne zdjęcie kuponu system zczyta kod, możesz dodać sklep ewentualnjie poprawić date </DrawerDescription>
        </DrawerHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* ZDJECIE KUPONU */}
          <input
            type="image"
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
            }}
            className="border p-3 rounded-lg text-base text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          />

          {/* NUMER KUPONU */}
          <input
            disabled
            type="text"
            value={"51250251289057"}
            className="text-center border p-3 rounded-lg text-base text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          />

          <div className="grid grid-cols-2 gap-2 items-stretch">
            {/* WARTOSC */}
            <input
              type="number"
              min="0.1"
              step="any"
              value={1}
              // onChange={(e) => setQuantity(e.target.value)}
              className={`${fieldClass} text-center`}
            />

            {/* SKLEP */}
            <select
              value={shopValue}
              onChange={(e) => setShopValue(e.target.value)}
              className={`${fieldClass} appearance-none text-center`}
            >
              {SHOPS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
          <Button
            className="w-full h-11 shadow-[inset_0px_2px_2px_0px_rgba(255,255,255,0.5),inset_0px_-2px_2px_0px_rgba(0,0,0,0.5)] bg-highlight disabled:bg-gray-800"
            disabled={addListMutation.isPending || newListName.trim() === ""}
            onClick={handleCreate}
          >
            {addListMutation.isPending ? "Dodawnie..." : "Dodaj kupon"}
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
