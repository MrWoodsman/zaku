import { useNavigate } from "react-router-dom";
// ROUTES
import { ROUTES } from "@/config/routes";
// ICONS
import { Plus, Search, ShoppingBagIcon } from "lucide-react";
// UI
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ButtonGroup } from "@/components/ui/button-group";
// COMPONENTS
import { ListAddOverlay } from "../overlay/lists/ListAddOverlay";

type ShoppingListsNavbarProps = {
  inputVal: string;
  itemToButSum: number;
  setInputVal: (val: string) => void;
};

export function ShoppingListsNavbar({
  inputVal,
  setInputVal,
  itemToButSum,
}: ShoppingListsNavbarProps) {
  const navigate = useNavigate();

  return (
    <div className="search-container flex gap-2 px-2 pt-[max(8px,env(safe-area-inset-top))]">
      <ButtonGroup aria-label="Button group" className="w-full">
        <ButtonGroup className="w-full">
          <Button variant={"outline"} size={"icon"}>
            <Search className="size-4" />{" "}
          </Button>
          <Input
            type="text"
            value={inputVal}
            onInput={(e) => setInputVal(e.currentTarget.value)}
            placeholder="Szukaj"
          />
        </ButtonGroup>
        <div className="flex gap-2">
          <Button
            className="relative"
            variant="secondary"
            onClick={(e) => {
              e.currentTarget.blur();
              navigate(ROUTES.SHOPPING_ALL);
            }}
          >
            <ShoppingBagIcon className="size-4" />
            <div className="absolute -bottom-0.5 -left-0.5 text-[10px] bg-orange-400 text-orange-100 py-.5 px-1 rounded-2xl">
              {itemToButSum}
            </div>
          </Button>
          <ListAddOverlay>
            <Button variant="default" onClick={(e) => e.currentTarget.blur()}>
              Dodaj <Plus className="size-4" />
            </Button>
          </ListAddOverlay>
        </div>
      </ButtonGroup>
    </div>
  );
}
