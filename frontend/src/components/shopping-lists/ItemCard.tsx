import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ItemSettingsOverlay } from "@/components/overlay/items/ItemSettingsOverlay";
import type { ShoppingItem } from "@shared/types";

export interface ItemCardProps {
  listId: string;
  item: ShoppingItem & { list_name?: string };
  onToggle: (completed: boolean) => void;
}

export function ItemCard({ listId, item, onToggle }: ItemCardProps) {
  return (
    <Card
      className={`border-dashed border border-foreground/20 overflow-hidden transition-colors duration-200 ${
        item.completed ? "bg-foreground/7.5 text-primary" : "bg-foreground/7.5"
      } py-0`}
    >
      <CardContent className="px-2 pr-0 flex gap-2 items-stretch relative">
        <div
          className="left-wrap w-full py-1 flex items-center cursor-pointer select-none"
          onClick={() => onToggle(!item.completed)}
        >
          <div className="button h-10 aspect-square flex items-center justify-center">
            <Checkbox
              checked={item.completed}
              className="size-4.5 border-foreground/25 bg-foreground/2.5"
            />
          </div>
          <div className="column flex flex-col">
            <h1 className={`font-medium text-sm ${item.completed && "line-through"}`}>
              {item.name}
            </h1>
            <h2 className="text-[12px] text-primary/60 flex items-center gap-1.5">
              <span>
                {item.quantity} {item.unit}
              </span>

              {/* Wyświetlamy nazwę listy tylko, jeśli istnieje (czyli np. na widoku zbiorczym) */}
              {item.list_name && (
                <>
                  <span className="text-[10px]">•</span>
                  <span className="bg-foreground/5 px-1.5 rounded-sm">{item.list_name}</span>
                </>
              )}
            </h2>
          </div>
        </div>

        <ItemSettingsOverlay listId={listId} item={item} />
      </CardContent>
    </Card>
  );
}
