import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, ShoppingCart } from "lucide-react";

import { useAddRecipeToListMutation } from "@/hooks/useListMutations";
import { useAllShoppingListsQuery } from "@/hooks/useLists";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "@/config/routes";
import { showSuccessToast } from "@/utils/toastHandler";

interface Ingredient {
  id: string;
  name: string;
  quantity: string | number;
  unit: string;
}

interface RecipeToShoppingListOverlayProps {
  children: React.ReactNode;
  recipeName: string;
  ingredients: Ingredient[];
}

export function RecipeToShoppingListOverlay({
  children,
  recipeName,
  ingredients,
}: RecipeToShoppingListOverlayProps) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  // 1. ZAPYTANIA API
  const { data: lists } = useAllShoppingListsQuery(); // Pobieranie Twoich list
  const { mutate: addToList, isPending } = useAddRecipeToListMutation();

  // 2. STANY FORMULARZA
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [selectedListId, setSelectedListId] = useState<string>("");
  const [newListName, setNewListName] = useState(`Zakupy: ${recipeName}`);
  const [selectedIngIds, setSelectedIngIds] = useState<string[]>([]);

  // Resetujemy zaznaczenia na wszystkie składniki przy każdym otwarciu drawera
  useEffect(() => {
    if (isOpen && ingredients) {
      setTimeout(() => {
        setSelectedIngIds(ingredients.map((i) => i.id));
        setNewListName(`Zakupy: ${recipeName}`);
      }, 0);
    }
  }, [isOpen, ingredients, recipeName]);

  // 3. LOGIKA CHECKBOXÓW
  const toggleIngredient = (id: string) => {
    setSelectedIngIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  // 4. WYSYŁANIE
  const handleSubmit = () => {
    const finalIngredients = ingredients.filter((ing) => selectedIngIds.includes(ing.id));

    if (finalIngredients.length === 0) {
      alert("Wybierz przynajmniej jeden składnik!");
      return;
    }

    if (mode === "existing" && !selectedListId) {
      alert("Wybierz listę zakupów!");
      return;
    }

    if (mode === "new" && !newListName.trim()) {
      alert("Podaj nazwę dla nowej listy!");
      return;
    }

    addToList(
      {
        target: {
          mode,
          list_id: mode === "existing" ? selectedListId : undefined,
          new_list_name: mode === "new" ? newListName.trim() : undefined,
        },
        ingredients: finalIngredients,
      },
      {
        onSuccess: () => {
          setIsOpen(false);
          navigate(ROUTES.SHOPPING_LISTS);
          showSuccessToast(`Dodano potrzebne składniki do listy`);
        },
      },
    );
  };

  return (
    <Drawer open={isOpen} onOpenChange={setIsOpen}>
      <DrawerTrigger asChild>{children}</DrawerTrigger>

      {/* Drawer na wysokość max 90% ekranu, układ Flex, by guzik zawsze był na dole */}
      <DrawerContent
        onPointerDownOutside={(e) => {
          e.preventDefault();
        }}
        onInteractOutside={(e) => {
          e.preventDefault();
        }}
        className="bg-background border-border max-h-[90dvh] flex flex-col pb-[max(16px,var(--safe-bottom))]"
      >
        <DrawerHeader className="text-left px-4">
          <DrawerTitle className="text-xl flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary" />
            Dodaj do zakupów
          </DrawerTitle>
          <DrawerDescription>
            Wybierz listę i składniki, których brakuje Ci w lodówce.
          </DrawerDescription>
        </DrawerHeader>

        {/* Zawartość przewijana (Flex-1 + overflow-y-auto) */}
        <div className="flex-1 overflow-y-auto px-4 space-y-6">
          {/* SEKCJA 1: Wybór listy */}
          <div className="space-y-3">
            <h3 className="font-medium text-sm text-foreground">Gdzie dodać składniki?</h3>
            <Select
              value={mode === "existing" ? selectedListId : "new"}
              onValueChange={(val) => {
                if (val === "new") {
                  setMode("new");
                  setSelectedListId("");
                } else {
                  setMode("existing");
                  setSelectedListId(val);
                }
              }}
            >
              <SelectTrigger className="w-full h-12 bg-secondary/30">
                <SelectValue placeholder="Wybierz listę zakupów..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new" className="font-bold text-primary py-3">
                  + Utwórz nową listę
                </SelectItem>

                {/* DODANE KLAMRY WOKÓŁ lists?.map(...) */}
                {lists?.map((list) => (
                  <SelectItem key={list.id} value={list.id} className="py-3">
                    {list.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {mode === "new" && (
              <Input
                className="h-12 bg-secondary/30"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="Podaj nazwę nowej listy..."
              />
            )}
          </div>

          {/* SEKCJA 2: Wybór składników */}
          <div className="space-y-3 pb-4">
            <div className="flex justify-between items-center">
              <h3 className="font-medium text-sm text-foreground">Składniki do kupienia</h3>
              <span className="text-xs font-medium text-muted-foreground bg-secondary px-2 py-1 rounded-md">
                {selectedIngIds.length} z {ingredients.length}
              </span>
            </div>

            <div className="border border-border/50 rounded-xl divide-y divide-border/50 bg-secondary/10 overflow-hidden">
              {ingredients.map((ing) => {
                const isSelected = selectedIngIds.includes(ing.id);
                return (
                  <label
                    key={ing.id}
                    htmlFor={ing.id}
                    className="flex items-center space-x-3 p-4 cursor-pointer hover:bg-secondary/30 transition-colors"
                  >
                    <Checkbox
                      id={ing.id}
                      checked={isSelected}
                      onCheckedChange={() => toggleIngredient(ing.id)}
                      className="w-5 h-5 rounded-md"
                    />
                    <div className="flex-1 flex justify-between items-center text-sm">
                      <span
                        className={
                          isSelected ? "font-medium" : "text-muted-foreground line-through"
                        }
                      >
                        {ing.name}
                      </span>
                      <span
                        className={`font-semibold ${isSelected ? "text-primary" : "text-muted-foreground/50"}`}
                      >
                        {ing.quantity} {ing.unit}
                      </span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* SEKCJA DÓŁ - Przycisk zawsze widoczny na samym dole, nie przewija się z listą */}
        <div className="px-4 pt-4 mt-2">
          <Button
            onClick={handleSubmit}
            disabled={
              isPending || (mode === "existing" && !selectedListId) || selectedIngIds.length === 0
            }
            className="w-full h-12 text-base font-semibold rounded-xl"
          >
            {isPending ? (
              <Loader2 className="animate-spin w-5 h-5 mr-2" />
            ) : (
              <ShoppingCart className="w-5 h-5 mr-2" />
            )}
            Zapisz składniki na listę
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
