import { useNavigate } from "react-router-dom";
// UI
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "../ui/button";
// TYPE
import { type ShoppingListData } from "@shared/types";
import { ListSettingsOverlay } from "../overlay/lists/ListSettingsOverlay";
import { ListAddOverlay } from "../overlay/lists/ListAddOverlay";
import { Plus, ShoppingBag, Check, Search } from "lucide-react";
import { cn } from "@/lib/utils";

type ShoppingListsListProps = {
  shoppingLists: ShoppingListData[];
  searchInput: string;
  isLoading: boolean;
};

export function ShoppingListsList({
  shoppingLists,
  searchInput,
  isLoading,
}: ShoppingListsListProps) {
  const navigate = useNavigate();

  if (isLoading)
    return (
      <div className="shopping-lists-list h-full px-2 overflow-y-auto scrollbar-gutter-stable pb-[env(safe-area-bottom)]">
        {/* Navbar placeholder */}
        <div className="space-y-2">
          <div className="h-12 w-full bg-foreground/15 animate-pulse rounded-lg" />
          <div className="h-12 w-full bg-foreground/15 animate-pulse rounded-lg" />
          <div className="h-12 w-full bg-foreground/15 animate-pulse rounded-lg" />
          <div className="h-12 w-full bg-foreground/15 animate-pulse rounded-lg" />
        </div>
      </div>
    );

  if (!shoppingLists || shoppingLists.length == 0)
    return <EmptyListPrompt searchInput={searchInput} />;

  return (
    <div className="shopping-lists-list h-full space-y-3 px-2 overflow-y-auto scrollbar-gutter-stable pb-[env(safe-area-bottom)]">
      {shoppingLists.map((el) => {
        const total = el.itemsIn;
        const done = el.completedCount;
        const percent = total > 0 ? Math.round((done / total) * 100) : 0;
        const isComplete = total > 0 && done === total;

        return (
          <Card key={el.id} className="overflow-visible border border-foreground/5 shadow-sm ring-0 py-3">
            <CardContent className="flex items-center gap-3">
              {/* Strefa klikalna - nawigacja do listy. Przycisk opcji zostaje poza nią. */}
              <div
                className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 transition-transform active:scale-[0.98]"
                onClick={() => navigate(`/shopping/${el.id}`)}
              >
                <div
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-xl",
                    isComplete ? "bg-highlight/15 text-highlight" : "bg-foreground/5 text-foreground/60",
                  )}
                >
                  {isComplete ? <Check className="size-5" /> : <ShoppingBag className="size-5" />}
                </div>

                <div className="min-w-0 flex-1 space-y-1.5">
                  <p className="truncate text-base font-medium">{el.name}</p>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-full max-w-24 shrink-0 overflow-hidden rounded-full bg-foreground/10">
                      <div
                        className={cn(
                          "h-full rounded-full transition-[width]",
                          isComplete ? "bg-highlight" : "bg-foreground/40",
                        )}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <span className="shrink-0 font-mono text-xs text-muted-foreground">
                      {isComplete ? "Gotowe" : `${done}/${total}`}
                    </span>
                  </div>
                </div>
              </div>

              <ListSettingsOverlay listId={el.id} listName={el.name} />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function EmptyListPrompt({ searchInput }: { searchInput: string }) {
  return (
    <div className="h-full w-full p-4">
      {searchInput?.length == 0 ? (
        <Empty className="border border-dashed h-full">
          <EmptyHeader>
            <EmptyMedia className="size-14 rounded-2xl bg-highlight/10 text-highlight">
              <ShoppingBag className="size-6" />
            </EmptyMedia>
            <EmptyTitle>Jakoś tu pusto...</EmptyTitle>
            <EmptyDescription>Nie znaleziono żadnej listy zakupowej</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <ListAddOverlay>
              <Button variant="accent" onClick={(e) => e.currentTarget.blur()}>
                Dodaj liste <Plus className="size-4" />
              </Button>
            </ListAddOverlay>
          </EmptyContent>
        </Empty>
      ) : (
        <Empty className="border border-dashed h-full">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Search className="size-4" />
            </EmptyMedia>
            <EmptyTitle>Nic nie znaleziono</EmptyTitle>
            <EmptyDescription className="text-balance">
              Nie znaleziono pasującej listy do `
              <span className="font-mono text-primary/40">{searchInput}</span>`
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <ListAddOverlay>
              <Button variant="accent" onClick={(e) => e.currentTarget.blur()}>
                Dodaj liste <Plus className="size-4" />
              </Button>
            </ListAddOverlay>
          </EmptyContent>
        </Empty>
      )}
    </div>
  );
}
