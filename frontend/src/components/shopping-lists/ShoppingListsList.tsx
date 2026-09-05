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
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "../ui/button";
// TYPE
import { type ShoppingListData } from "@shared/types";
import { ListSettingsOverlay } from "../overlay/lists/ListSettingsOverlay";
import { ListAddOverlay } from "../overlay/lists/ListAddOverlay";
import { Plus } from "lucide-react";

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
    <div className="shopping-lists-list h-full space-y-2 px-2 overflow-y-auto scrollbar-gutter-stable pb-[env(safe-area-bottom)]">
      {shoppingLists.map((el) => {
        const listCompletePercent = Math.floor((el.completedCount / el.itemsIn) * 100);
        return (
          // 1. Zdejmujemy onClick stąd! Karta to teraz tylko "pojemnik".
          <Card key={el.id} className="border border-foreground/5">
            <CardHeader>
              {/* 2. Tworzymy klikalną strefę na teksty (lewa strona) */}
              <div className="flex-1 cursor-pointer" onClick={() => navigate(`/shopping/${el.id}`)}>
                <CardTitle>{el.name}</CardTitle>
                <CardDescription>
                  {el.completedCount}/{el.itemsIn} |{" "}
                  {listCompletePercent ? listCompletePercent : "0"}%
                </CardDescription>
              </div>

              {/* 3. Prawa strona z przyciskiem opcji (odizolowana od nawigacji) */}
              <CardAction className="row-span-full! flex items-center justify-center h-full rounded-sm">
                <ListSettingsOverlay listId={el.id} listName={el.name} />
              </CardAction>
            </CardHeader>
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
            <EmptyMedia variant="default"></EmptyMedia>
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
            <EmptyMedia variant="default"></EmptyMedia>
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
