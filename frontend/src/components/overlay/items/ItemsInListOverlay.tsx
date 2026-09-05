import { useState } from "react";
import { toast } from "sonner";
import { Button } from "../../ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Settings, CheckCheck, RotateCcw, Copy, Trash2, Trash } from "lucide-react";
import { type ShoppingItem } from "@shared/types";

// IMPORTUJEMY NOWE HOOKI
import {
  useMarkAllMutation,
  useResetAllMutation,
  useDeleteCompletedMutation,
  useDeleteAllMutation,
} from "@/hooks/useItemMutations";
import { showErrorToast, showSuccessToast } from "@/utils/toastHandler";

interface ItemsInListOverlayProps {
  listID: string;
  items?: ShoppingItem[];
}

export function ItemsInListOverlay({ listID, items = [] }: ItemsInListOverlayProps) {
  const [isOpen, setIsOpen] = useState(false);

  const totalItems = items.length;
  const completedItems = items.filter((item) => item.completed).length;
  const uncompletedItems = totalItems - completedItems;

  const isListEmpty = totalItems === 0;
  const isEverythingBought = isListEmpty || uncompletedItems === 0;
  const isNothingBought = isListEmpty || completedItems === 0;

  // WSPÓLNA FUNKCJA PO ZAKOŃCZENIU MUTACJI
  const onSuccessAction = (message: string) => {
    showSuccessToast(message);
    setIsOpen(false);
  };

  // INICJALIZACJA HOOKÓW
  const markAllMutation = useMarkAllMutation(listID);
  const resetAllMutation = useResetAllMutation(listID);
  const deleteCompletedMutation = useDeleteCompletedMutation(listID);
  const deleteAllMutation = useDeleteAllMutation(listID);

  const handleCopyList = () => {
    if (isListEmpty) {
      toast.error("Lista jest pusta, nie ma czego kopiować.");
      return;
    }

    const textToCopy = items
      .map((item) => `${item.completed ? "☑" : "☐"} ${item.name} (${item.quantity} ${item.unit})`)
      .join("\n");

    const finalString = `🛒 *Lista zakupów*\n\n${textToCopy}`;

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(finalString);
      onSuccessAction("Skopiowano listę do schowka!");
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = finalString;
      textArea.style.position = "absolute";
      textArea.style.left = "-999999px";
      document.body.prepend(textArea);
      textArea.select();

      try {
        document.execCommand("copy");
        onSuccessAction("Skopiowano listę do schowka!");
      } catch (error) {
        showErrorToast(error instanceof Error ? error : "Wystąpił błąd podczas kopiowania");
      } finally {
        textArea.remove();
        setIsOpen(false);
      }
    }
  };

  return (
    <Drawer open={isOpen} onOpenChange={setIsOpen}>
      <DrawerTrigger asChild>
        <Button
          variant="secondary"
          size="icon"
          onClick={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.blur()}
        >
          <Settings className="size-4" />
        </Button>
      </DrawerTrigger>

      <DrawerContent className="bg-background border-border px-4 pb-[max(24px,env(safe-area-inset-bottom))]">
        <DrawerHeader className="px-0 text-left pb-4">
          <DrawerTitle className="text-xl">Opcje listy</DrawerTitle>
        </DrawerHeader>

        <div className="flex flex-col gap-5">
          <div className="bg-secondary/80 rounded-xl overflow-hidden flex flex-col border border-border/50">
            <Button
              variant="ghost"
              className="justify-start h-13 rounded-none border-b border-border/50 font-medium"
              onClick={() =>
                markAllMutation.mutate(undefined, {
                  onSuccess: () => onSuccessAction("Wszystko zaznaczone jako kupione!"),
                })
              }
              disabled={markAllMutation.isPending || isEverythingBought}
            >
              <CheckCheck className="mr-3 size-5 text-highlight" />
              Zaznacz wszystko jako kupione
            </Button>

            <Button
              variant="ghost"
              className="justify-start h-13 rounded-none border-b border-border/50 font-medium"
              onClick={() =>
                resetAllMutation.mutate(undefined, {
                  onSuccess: () => onSuccessAction("Odznaczono wszystkie produkty."),
                })
              }
              disabled={resetAllMutation.isPending || isNothingBought}
            >
              <RotateCcw className="mr-3 size-5 text-primary" />
              Odznacz wszystko (Reset)
            </Button>

            <Button
              variant="ghost"
              className="justify-start h-13 rounded-none font-medium"
              onClick={handleCopyList}
              disabled={isListEmpty}
            >
              <Copy className="mr-3 size-5 text-foreground/70" />
              Kopiuj listę jako tekst
            </Button>
          </div>

          <div className="flex flex-col gap-2">
            <h3 className="text-[11px] font-bold tracking-widest text-destructive uppercase px-2">
              Usuwanie danych
            </h3>

            <div className="bg-destructive/10 rounded-xl overflow-hidden flex flex-col border border-destructive/20">
              <Button
                variant="ghost"
                className="justify-start h-13 rounded-none border-b border-destructive/10 text-destructive hover:bg-destructive/20 hover:text-destructive font-medium"
                onClick={() =>
                  deleteCompletedMutation.mutate(undefined, {
                    onSuccess: () => onSuccessAction("Usunięto kupione produkty."),
                  })
                }
                disabled={deleteCompletedMutation.isPending || isNothingBought}
              >
                <Trash2 className="mr-3 size-5" />
                Usuń tylko kupione
              </Button>

              <Button
                variant="ghost"
                className="justify-start h-13 rounded-none text-destructive hover:bg-destructive/20 hover:text-destructive font-medium"
                onClick={() =>
                  deleteAllMutation.mutate(undefined, {
                    onSuccess: () => onSuccessAction("Lista została całkowicie wyczyszczona."),
                  })
                }
                disabled={deleteAllMutation.isPending || isListEmpty}
              >
                <Trash className="mr-3 size-5" />
                Usuń wszystkie produkty
              </Button>
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
