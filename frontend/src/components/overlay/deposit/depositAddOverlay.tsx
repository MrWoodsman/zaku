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
import { showErrorToast } from "@/utils/toastHandler";
import { HashIcon, Loader2Icon, LockIcon, TicketSlashIcon } from "lucide-react";
import { useScanPhotoMutation } from "@/hooks/useDepositMutations";
import { DepositDatePicker } from "@/components/deposit/DepositDatePicker";
import { addDays } from "date-fns";
import { DepositShopSelect } from "@/components/deposit/DepositShopSelect";

interface ListAddOverlayProps {
  children: React.ReactNode;
}

export function DepositAddOverlay({ children }: ListAddOverlayProps) {
  // OTWARCIE / ZAMKNIECIE
  const [isOpen, setIsOpen] = useState<boolean>(false);
  // DANE DEPOZYTU
  const [depositImage, setDepositImage] = useState<File | null>(null);
  const [depositNumber, setDepositNumber] = useState<string>("");
  const [depositValue, setDepositValue] = useState<number | string>("");
  const [depositShop, setDepositShop] = useState("");
  const [depositDate, setDepositDate] = useState<Date | undefined>(
    addDays(new Date(), 30),
  );
  // POMOCNICZE
  const [isProcessing, setIsProcessing] = useState<boolean>(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  // API ODCZYTYWANIA Z KUPONU
  const scanMutation = useScanPhotoMutation();

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
          <div className="box-border flex h-11 w-full items-center rounded-lg border border-input bg-background p-1 focus-within:ring-2 focus-within:ring-primary">
            <label className="flex h-full w-full flex-1 cursor-pointer items-center overflow-hidden">
              <div className="flex h-full shrink-0 items-center justify-center rounded-md bg-highlight px-4 font-semibold text-white">
                Wybierz zdjęcie
              </div>

              <span className="ml-3 text-sm text-foreground truncate">
                {depositImage ? depositImage.name : "Brak pliku"}
              </span>

              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setDepositImage(file);
                    setPreviewUrl(URL.createObjectURL(file));
                    setIsProcessing(true);
                    // sendRequestToProcesPhoto(file);
                    scanMutation.mutate(file, {
                      onSuccess: (data) => {
                        if (data.success) {
                          setDepositNumber(String(data.code));
                          setIsProcessing(false);
                        } else {
                          setPreviewUrl(null);
                          setDepositImage(null);
                          showErrorToast(
                            data.message || "Nie odnaleziono kodu na zdjęciu.",
                          );
                        }
                      },
                      onError: (error) => {
                        showErrorToast(error.message);
                      },
                    });
                  }
                }}
                className="hidden"
              />
            </label>

            {/* Nasz własny podgląd, teraz będzie jedynym na ekranie */}
            {previewUrl && (
              <div className="relative ml-2 h-9 w-9 shrink-0">
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
            <HashIcon
              size={14}
              className="text-foreground/50 absolute top-1/2 left-3 -translate-y-1/2"
            />
            <input
              disabled
              type="text"
              value={depositNumber}
              onChange={(e) => setDepositNumber(e.target.value)}
              className="box-border h-11 w-full rounded-lg border bg-background px-10 py-0 text-center text-base text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-foreground/5"
            />
            <LockIcon
              size={14}
              className="text-foreground/50 absolute top-1/2 right-3 -translate-y-1/2"
            />
          </div>

          <DepositDatePicker value={depositDate} onChange={setDepositDate} />

          <div className="grid grid-cols-2 gap-2 items-stretch">
            {/* WARTOSC */}
            <div className="box-border flex h-11 w-full items-center overflow-hidden rounded-lg border border-input bg-background focus-within:ring-2 focus-within:ring-primary">
              <input
                type="number"
                min="0.1"
                step="any"
                value={depositValue}
                onChange={(e) => {
                  const val = e.target.value;
                  setDepositValue(val === "" ? "" : Number(val));
                }}
                className="h-full w-full flex-1 border-none bg-transparent px-3 py-0 text-center text-base text-foreground outline-none shadow-none focus:ring-0"
              />

              <div className="h-full px-4 border-l border-input flex items-center justify-center text-sm font-medium text-foreground/60 bg-foreground/5">
                PLN
              </div>
            </div>

            {/* SKLEP */}
            <DepositShopSelect
              value={depositShop}
              onChange={setDepositShop}
              shops={SHOPS}
            />
          </div>
          <Button
            className="w-full h-11 text-white shadow-[inset_0px_2px_4px_0px_rgba(255,255,255,0.25),inset_0px_-2px_4px_0px_rgba(0,0,0,0.25)] bg-highlight disabled:bg-gray-800 transition-colors ease-in-out"
            disabled={
              !depositNumber ||
              depositNumber.trim() === "" ||
              depositValue == 0 ||
              depositShop == ""
            }
            onClick={handleAdd}
          >
            {/* {addListMutation.isPending ? "Dodawnie..." : "Dodaj kupon"} */}
            Dodaj kupon
            <TicketSlashIcon size={18} className="ml-1" />
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
