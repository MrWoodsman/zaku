import { ChevronDownIcon, CheckIcon, StoreIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useState } from "react";

interface DepositShopSelectProps {
  value: string;
  onChange: (value: string) => void;
  shops: string[];
}

export function DepositShopSelect({
  value,
  onChange,
  shops,
}: DepositShopSelectProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={`w-full h-11 justify-between font-normal border-input bg-background px-3 ${
            !value ? "text-muted-foreground" : "text-foreground"
          }`}
        >
          <div className="flex items-center">
            <StoreIcon className="mr-2 h-4 w-4 opacity-70" />
            {value ? value : "Wybierz sklep"}
          </div>
          <ChevronDownIcon className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      {/* Magiczna klasa w-[--radix-popover-trigger-width] sprawia, że dymek 
          będzie miał DOKŁADNIE taką samą szerokość jak przycisk, z którego się otworzył */}
      <PopoverContent
        className="p-1"
        align="start"
        style={{ width: "var(--radix-popover-trigger-width)" }}
      >
        <div className="flex flex-col gap-1">
          {shops.map((shop) => (
            <div
              key={shop}
              onClick={() => {
                onChange(shop); // Aktualizujemy stan w głównym komponencie
                setOpen(false); // Zamykamy dymek
              }}
              className={`flex items-center justify-between px-2 py-2 text-sm rounded-md cursor-pointer transition-colors hover:bg-accent hover:text-accent-foreground ${
                value === shop ? "bg-accent/50 font-medium" : ""
              }`}
            >
              {shop}
              {/* Jeśli to jest wybrany sklep, pokaż małego ptaszka po prawej */}
              {value === shop && <CheckIcon className="h-4 w-4" />}
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
