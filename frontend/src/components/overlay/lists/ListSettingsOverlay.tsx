import { useState } from "react";
import { Button } from "../../ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { EllipsisVertical, Trash2, Pencil, X } from "lucide-react";
import { useDeleteListMutation, useRenameListMutation } from "@/hooks/useListMutations";
import { showSuccessToast } from "@/utils/toastHandler";

interface ListSettingsProps {
  listId: string;
  listName: string;
}

export function ListSettingsOverlay({ listId, listName }: ListSettingsProps) {
  // HOOKS
  const deleteListMutation = useDeleteListMutation();
  const renameListMutation = useRenameListMutation();

  const [isOpen, setIsOpen] = useState(false);

  // Stany do edycji nazwy
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(listName);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setTimeout(() => setIsEditingName(false), 300); // Czekamy na animację zamknięcia
      setNewName(listName);
    }
  };

  return (
    <Drawer open={isOpen} onOpenChange={handleOpenChange}>
      <DrawerTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-full w-12 shrink-0 rounded-none"
          onClick={(e) => {
            e.stopPropagation(); // <-- TO JEST KLUCZ! Zatrzymuje kliknięcie przed pójściem wyżej
            e.currentTarget.blur(); // Zrzuca focus (żeby nie było błędu aria-hidden)
          }}
        >
          <EllipsisVertical className="size-5 text-primary" />
        </Button>
      </DrawerTrigger>

      <DrawerContent className="bg-background border-border px-4 pb-[max(24px,var(--safe-bottom))]">
        <DrawerHeader className="px-0 text-left pb-6">
          <DrawerTitle className="text-xl">
            {isEditingName ? "Zmień nazwę listy" : `Opcje: ${listName}`}
          </DrawerTitle>
        </DrawerHeader>

        <div className="flex flex-col gap-2">
          {/* WIDOK 1: EDYCJA NAZWY */}
          {isEditingName ? (
            <div className="flex flex-col gap-4">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
                className="border p-3 rounded-lg text-base text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary w-full"
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 h-11"
                  onClick={() => setIsEditingName(false)}
                >
                  <X className="size-4 mr-2" />
                  Anuluj
                </Button>
                <Button
                  className="flex-1 h-11"
                  disabled={renameListMutation.isPending || newName.trim() === ""}
                  onClick={() =>
                    renameListMutation.mutate(
                      { listId, newName },
                      {
                        onSuccess: () => {
                          setIsEditingName(false);
                          setIsOpen(false);
                          showSuccessToast(`Zmieniono nazwe listy na ${newName}`);
                        },
                      },
                    )
                  }
                >
                  {renameListMutation.isPending ? "Zapisywanie..." : "Zapisz"}
                </Button>
              </div>
            </div>
          ) : (
            /* WIDOK 2: NORMALNE PRZYCISKI */
            <>
              <Button
                variant="secondary"
                className="justify-start h-14 text-base"
                onClick={() => setIsEditingName(true)}
              >
                <Pencil className="mr-3 size-5 text-primary" />
                Edytuj nazwę
              </Button>

              <Button
                variant="destructive"
                className="justify-start h-14 text-base mt-2"
                disabled={deleteListMutation.isPending}
                onClick={() =>
                  deleteListMutation.mutate(listId, {
                    onSuccess: () => {
                      setIsOpen(false);
                      showSuccessToast(`Usunięto listę ${listName}`);
                    },
                  })
                }
              >
                <Trash2 className="mr-3 size-5" />
                {deleteListMutation.isPending ? "Usuwanie..." : "Usuń listę"}
              </Button>
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
