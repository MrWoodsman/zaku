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

export function ListAddOverlay({ children }: ListAddOverlayProps) {
  const addListMutation = useAddListMutation();
  const [newListName, setNewListName] = useState("");
  const [isOpen, setIsOpen] = useState(false);

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

  return (
    <Drawer open={isOpen} onOpenChange={setIsOpen}>
      <DrawerTrigger asChild>{children}</DrawerTrigger>

      <DrawerContent className="bg-background border-border px-4 pb-[max(24px,var(--safe-bottom))]">
        <DrawerHeader className="px-0 text-left">
          <DrawerTitle>Utwórz nową listę</DrawerTitle>
          <DrawerDescription>Wpisz nazwę dla swojej nowej listy zakupów.</DrawerDescription>
        </DrawerHeader>

        <div className="flex flex-col gap-4 py-2">
          <input
            type="text"
            placeholder="Np. Biedronka, Do domu, Remont..."
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
            }}
            className="border p-3 rounded-lg text-base text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <Button
            className="w-full h-11"
            disabled={addListMutation.isPending || newListName.trim() === ""}
            onClick={handleCreate}
          >
            {addListMutation.isPending ? "Tworzenie..." : "Utwórz listę"}
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
