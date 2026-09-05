import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ItemSettingsOverlay } from "@/components/overlay/items/ItemSettingsOverlay";
import { cn } from "@/lib/utils";
import type { ShoppingItem } from "@shared/types";

export interface ItemCardProps {
  listId: string;
  item: ShoppingItem & { list_name?: string };
  onToggle: (completed: boolean) => void;
}

export function ItemCard({ listId, item, onToggle }: ItemCardProps) {
  return (
    <Card
      className={cn(
        "overflow-hidden border py-0 shadow-sm transition-colors duration-200",
        item.completed ? "border-highlight/20 bg-highlight/5" : "border-foreground/5 bg-card",
      )}
    >
      <CardContent className="flex items-stretch gap-2 px-2 pr-0">
        <div
          className="left-wrap flex w-full cursor-pointer items-center gap-2.5 py-2.5 select-none"
          onClick={() => onToggle(!item.completed)}
        >
          <Checkbox
            checked={item.completed}
            className="size-5 shrink-0 border-foreground/25 bg-foreground/2.5"
          />
          <div className="column flex min-w-0 flex-col">
            <h1
              className={cn(
                "truncate text-sm font-medium",
                item.completed && "text-muted-foreground line-through",
              )}
            >
              {item.name}
            </h1>
            <h2 className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
              <span className="font-mono">
                {item.quantity} {item.unit}
              </span>

              {/* Wyświetlamy nazwę listy tylko, jeśli istnieje (czyli np. na widoku zbiorczym) */}
              {item.list_name && (
                <>
                  <span className="text-[10px]">•</span>
                  <span className="rounded-sm bg-foreground/5 px-1.5">{item.list_name}</span>
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
