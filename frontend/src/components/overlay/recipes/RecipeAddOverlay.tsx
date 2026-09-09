import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Plus, Clock, ListOrdered } from "lucide-react";

interface RecipeAddOverlayProps {
  children: React.ReactNode;
  draftsCount?: number; // Dodajemy prop dla liczby szkiców!
  onAddNew?: () => void;
  onOpenDrafts?: () => void;
  onOpenAll?: () => void;
}

export function RecipeAddOverlay({
  children,
  draftsCount = 0, // Domyślnie 0, możesz to pobrać z React Query
  onAddNew,
  onOpenDrafts,
  onOpenAll,
}: RecipeAddOverlayProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleAction = (action?: () => void) => {
    setIsOpen(false);
    if (action) action();
  };

  return (
    <Drawer open={isOpen} onOpenChange={setIsOpen}>
      <DrawerTrigger asChild>{children}</DrawerTrigger>

      <DrawerContent className="bg-background border-border px-4 pb-[max(24px,var(--safe-bottom))]">
        <DrawerHeader className="px-0 text-left">
          <DrawerTitle className="text-xl">Co chcesz zrobić?</DrawerTitle>
          <DrawerDescription>
            Dodaj nowy przepis do bazy lub zarządzaj swoimi listami.
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex flex-col gap-3 py-4">
          {/* GŁÓWNA AKCJA - Wyraźna, w kolorze primary */}
          <Button
            className="w-full h-14 flex items-center justify-start gap-3 px-4 rounded-xl"
            onClick={() => handleAction(onAddNew)}
          >
            <div className="bg-background/20 p-1.5 rounded-md">
              <Plus className="w-5 h-5" />
            </div>
            <span className="text-base font-medium">Utwórz nowy przepis</span>
          </Button>

          <hr className="border-border/50 my-1" />

          {/* AKCJE DRUGORZĘDNE - Subtelniejsze */}
          <Button
            variant="ghost"
            className="w-full h-12 flex items-center justify-between px-2 text-muted-foreground hover:text-foreground border-foreground/10"
            onClick={() => handleAction(onOpenDrafts)}
          >
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5" />
              <span className="text-base">Dokończ szkice</span>
            </div>
            {/* ZNACZEK LICZNIKA SZKICÓW */}
            {draftsCount > 0 && (
              <span className="bg-primary/10 text-primary text-xs font-bold px-2 aspect-square py-0.5 rounded-full flex items-center justify-center min-w-6">
                {draftsCount}
              </span>
            )}
          </Button>

          <Button
            variant="ghost"
            className="w-full h-12 flex items-center justify-start gap-3 px-2 text-muted-foreground hover:text-foreground border-foreground/10"
            onClick={() => handleAction(onOpenAll)}
          >
            <ListOrdered className="w-5 h-5" />
            <span className="text-base">Moje wszystkie przepisy</span>
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
