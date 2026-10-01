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
// import { showSuccessToast } from "@/utils/toastHandler";
import { Loader2Icon, LockIcon } from "lucide-react";

interface ListAddOverlayProps {
  children: React.ReactNode;
}

const fieldClass =
  "h-11 w-full rounded-lg border border-input bg-background px-3 text-base text-foreground outline-none focus:ring-2 focus:ring-primary";

export function DepositAddOverlay({ children }: ListAddOverlayProps) {
  const addListMutation = useAddListMutation();
  // ZDJECIE KUPONU
  const [depositImage, setDepositImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessing] = useState<boolean>(true);
  // ZMIENNE
  const [depositNumber, setDepositNumber] = useState("215619657126798");
  const [isOpen, setIsOpen] = useState(false);

  const [shopValue, setShopValue] = useState("");

  const handleAdd = () => {
    console.log(`Dodawanie kuponu`);
  };

  const SHOPS = ["Lidl", "Biedronka", "Aldi", "Żabka"];

  return (
    <Drawer open={isOpen} onOpenChange={setIsOpen}>
      <DrawerTrigger asChild>{children}</DrawerTrigger>

      <DrawerContent className="bg-background border-border px-4 pb-[max(24px,var(--safe-bottom))]">
        <DrawerHeader className="px-0 text-left">
          <DrawerTitle>Dodaj nowy kupon kaucji</DrawerTitle>
          <DrawerDescription>
            Wgraj wyraźne zdjęcie kuponu system zczyta kod, możesz dodać sklep
            ewentualnjie poprawić date{" "}
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* ZDJECIE KUPONU */}
          <div className="flex items-center w-full border border-input rounded-lg bg-background p-1.5 focus-within:ring-2 focus-within:ring-primary">
            <label className="flex items-center cursor-pointer w-full flex-1 overflow-hidden">
              <div className="bg-highlight text-white h-10 px-4 rounded-md font-semibold flex items-center justify-center shrink-0">
                Wybierz zdjęcie
              </div>

              <span className="ml-3 text-sm text-foreground truncate">
                {depositImage ? depositImage.name : "Brak pliku"}
              </span>

              {/* USUNIĘTO capture="environment" oraz dodano className="hidden" */}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setDepositImage(file);
                    setPreviewUrl(URL.createObjectURL(file));
                  }
                }}
                className="hidden"
              />
            </label>

            {/* Nasz własny podgląd, teraz będzie jedynym na ekranie */}
            {previewUrl && (
              <div className="relative w-10 h-10 shrink-0 ml-2">
                {/* Sam obrazek */}
                <img
                  src={previewUrl}
                  alt="Podgląd"
                  className="w-full h-full rounded-md object-cover border border-border"
                />
                {/* Nakładka ładująca - renderuj tylko gdy serwer pracuje */}
                {isProcessing && (
                  <div className="absolute inset-0 bg-black/60 rounded-md flex items-center justify-center">
                    <Loader2Icon className="w-5 h-5 text-highlight animate-spin" />
                  </div>
                )}
              </div>
            )}
          </div>
          {/* NUMER KUPONU */}
          <div className="relative w-full">
            <input
              disabled
              type="text"
              value={depositNumber}
              onChange={(e) => setDepositNumber(e.target.value)}
              className="text-center w-full border py-3 px-10 rounded-lg text-base text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-foreground/5"
            />
            <LockIcon
              size={14}
              className="text-foreground/50 absolute top-1/2 right-4 -translate-y-1/2"
            />
          </div>

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
            className="w-full h-11 text-white shadow-[inset_0px_2px_4px_0px_rgba(255,255,255,0.25),inset_0px_-2px_4px_0px_rgba(0,0,0,0.25)] bg-highlight disabled:bg-gray-800"
            disabled={addListMutation.isPending || depositNumber.trim() === ""}
            onClick={handleAdd}
          >
            {addListMutation.isPending ? "Dodawnie..." : "Dodaj kupon"}
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
