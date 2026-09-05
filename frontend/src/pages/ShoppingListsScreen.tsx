import { useState } from "react";
// COMPONENTS
import { ShoppingListsList } from "@/components/shopping-lists/ShoppingListsList";
import { ShoppingListsNavbar } from "@/components/shopping-lists/ShoppingListsNavbar";
// TYPES
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAllShoppingListsQuery } from "@/hooks/useLists";
import { Loading } from "@/components/common/Loading";
import { NotFound } from "@/components/common/NotFound";

export function ShoppingListsScreen() {
  const { data, isLoading, error } = useAllShoppingListsQuery();
  const [searchInput, setSearchInput] = useState("");

  if (isLoading)
    return (
      <Loading
        title="Ładowanie list zakupów"
        description="Jeśli to trwa zbyt długo, sprawdź swoje połączenie internetowe."
      />
    );
  if (error || !data)
    return (
      <NotFound
        title="Nie znaleziono list zakupowych"
        description="Ta lista nie istnieje lub wystąpił problem z połączeniem z serwerem."
      />
    );

  console.log(data);

  let ToBuySum = 0;
  data.map((list) => (ToBuySum += list.itemsIn - list.completedCount));

  return (
    <div className="w-full h-full flex flex-col gap-2">
      <ShoppingListsNavbar
        inputVal={searchInput}
        setInputVal={setSearchInput}
        itemToButSum={ToBuySum}
      />
      {error ? (
        <div className="flex flex-col items-center justify-center h-full gap-4 p-6 text-center">
          <div className="p-4 bg-destructive/20 rounded-full text-destructive">
            <AlertCircle size={32} />
          </div>
          <h3 className="text-lg font-semibold">Coś poszło nie tak</h3>
          <p className="text-sm text-neutral-400">
            Sprawdź połączenie z serwerem i spróbuj ponownie.
          </p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Odśwież
          </Button>
        </div>
      ) : (
        <ShoppingListsList
          isLoading={isLoading}
          shoppingLists={
            data?.filter((list) => list.name.toUpperCase().includes(searchInput.toUpperCase())) ??
            []
          }
          searchInput={searchInput}
        />
      )}
    </div>
  );
}
