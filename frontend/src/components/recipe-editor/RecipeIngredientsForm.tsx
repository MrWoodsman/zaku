import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";

interface Ingredient {
  id: string;
  name: string;
  quantity: string;
  unit: string;
}

interface RecipeIngredientsFormProps {
  ingredients: Ingredient[];
  addIngredient: () => void;
  updateIngredient: (id: string, field: string, value: string) => void;
  removeIngredient: (id: string) => void;
}

const UNITS = ["szt.", "kg", "g", "l", "ml", "opak."];

export function RecipeIngredientsForm({
  ingredients,
  addIngredient,
  updateIngredient,
  removeIngredient,
}: RecipeIngredientsFormProps) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="font-semibold text-lg">Składniki</h2>
      <div className="flex flex-col gap-2">
        {ingredients.map((ing) => (
          <div
            key={ing.id}
            className="grid grid-cols-1 gap-2 rounded-xl border border-border/50 bg-secondary/10 p-3"
          >
            <input
              type="text"
              placeholder="Nazwa (np. Mleko)"
              value={ing.name}
              onChange={(e) => updateIngredient(ing.id, "name", e.target.value)}
              className="w-full min-w-0 bg-background border border-border/50 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2 items-center">
              <input
                type="number"
                placeholder="Ilość"
                value={ing.quantity}
                onChange={(e) => updateIngredient(ing.id, "quantity", e.target.value)}
                className="w-full h-11 min-w-11 bg-background border border-border/50 rounded-lg px-2.5 text-sm text-center focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
              <Select
                value={ing.unit}
                onValueChange={(val) => updateIngredient(ing.id, "unit", val)}
              >
                <SelectTrigger className="w-full h-11 min-h-11 bg-background border-border/50 text-sm">
                  <SelectValue placeholder="Jednostka" />
                </SelectTrigger>
                <SelectContent>
                  {UNITS.map((unit) => (
                    <SelectItem className="h-11" key={unit} value={unit}>
                      {unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeIngredient(ing.id)}
                disabled={ingredients.length === 1}
                className="h-11 w-11 justify-self-end disabled:opacity-30 bg-destructive/25 border-2 border-destructive/25 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
              >
                <Trash2 size={18} />
              </Button>
            </div>
          </div>
        ))}
      </div>
      <Button
        variant="outline"
        className="w-full gap-2 border-dashed border-2 mt-1"
        onClick={addIngredient}
      >
        <Plus size={16} /> Dodaj kolejny składnik
      </Button>
    </div>
  );
}
