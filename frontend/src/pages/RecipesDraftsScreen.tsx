import { useAllRecipesQuery } from "@/hooks/useRecipes";
// Zakładam, że masz już (lub stworzysz) mutację do usuwania. Jeśli nie, odkomentuj i użyj swojej.
// import { useDeleteRecipeMutation } from "@/hooks/useRecipes";
import { Globe, PenBox, Clock, Lock, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/overlay/ConfirmModal";
import { ROUTES } from "@/config/routes"; // Dodaj import swoich ścieżek
import type { RecipeItem as RecipeItemType } from "@shared/types";
import { useDeleteRecipeMutation } from "@/hooks/useRecipeMutations";
import { showSuccessToast } from "@/utils/toastHandler";
import { Loading } from "@/components/common/Loading";
import { NotFound } from "@/components/common/NotFound";

export function RecipesDraftsScreen() {
  const { data, isLoading, error } = useAllRecipesQuery();
  const [searchVal, setSearchVal] = useState("");

  if (isLoading)
    return (
      <Loading
        title="Ładowanie listy przepisów!"
        description="Jeśli to trwa zbyt długo, sprawdź swoje połączenie internetowe."
      />
    );
  if (error || !data)
    return (
      <NotFound
        title="Nie udało się załadować przepisów!"
        description="Ta lista nie istnieje lub wystąpił problem z połączeniem z serwerem."
      />
    );

  const drafts = data?.filter((item) => item.status === "draft") || [];
  const filteredDrafts = drafts.filter((item) =>
    item.name.toUpperCase().includes(searchVal.toUpperCase()),
  );

  return (
    <div className="w-full h-full flex flex-col gap-1 bg-background pt-2">
      <div className="px-4 pb-2 shrink-0">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            size={18}
          />
          <input
            type="text"
            placeholder="Szukaj w szkicach..."
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            className="w-full bg-secondary/50 border border-border/50 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
          />
        </div>
      </div>

      <div className="content flex flex-col px-2 pb-4 gap-3 overflow-y-auto">
        <div className="mx-1 mt-1 mb-2 p-3.5 bg-secondary/30 border border-secondary/50 rounded-xl flex items-start gap-3.5 shadow-sm shrink-0">
          <div className="bg-highlight/10 p-2.5 rounded-lg shrink-0 mt-0.5">
            <PenBox size={20} className="text-highlight" />
          </div>

          <div className="flex flex-col gap-1 w-full">
            <div className="flex justify-between items-center w-full">
              <h1 className="font-semibold text-lg leading-none tracking-tight">Szkice</h1>
              <span className="text-[11px] font-bold bg-background text-muted-foreground px-2 py-0.5 rounded-full border border-border/50 shadow-sm">
                {drafts.length}
              </span>
            </div>
            <p className="text-[13px] text-muted-foreground leading-relaxed pr-2">
              Przepisy czekające na dokończenie. Edytuj je, aby trafiły na główną listę.
            </p>
          </div>
        </div>

        {filteredDrafts.length === 0 ? (
          <div className="mt-6 flex flex-col items-center gap-3 p-8 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-highlight/10 text-highlight">
              <PenBox size={24} />
            </div>
            <p className="text-sm text-muted-foreground">
              {drafts.length === 0 ? "Brak szkiców do dokończenia." : "Brak wyników."}
            </p>
          </div>
        ) : (
          filteredDrafts.map((recipe) => <RecipeItem key={recipe.id} recipe={recipe} />)
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------
// KOMPONENT POJEDYNCZEGO SZKICU
// ---------------------------------------------------------
function RecipeItem({ recipe }: { recipe: RecipeItemType }) {
  const navigate = useNavigate();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // ODKOMENTUJ TO JAK ZROBISZ MUTACJĘ DO USUWANIA
  const { mutate: deleteRecipe, isPending: isDeleting } = useDeleteRecipeMutation();

  const handleEdit = () => {
    // Przekazujemy ID przepisu np. przez Search Params (?id=123),
    // żeby Twój RecipeEditorScreen wiedział, że jesteśmy w trybie EDYCJI, a nie tworzenia.
    navigate(`${ROUTES.RECIPES_EDITOR}?id=${recipe.id}`);
  };

  const handleDeleteConfirm = () => {
    deleteRecipe(recipe.id, {
      onSuccess: () => {
        setShowDeleteModal(false);
        showSuccessToast(`Usunięto przepis ${recipe.name}`);
      },
    });

    setShowDeleteModal(false); // Tymczasowe zamknięcie modala dla testów UI
  };

  return (
    <>
      <div className="relative border-2 border-dashed border-foreground/20 p-3 rounded-lg flex flex-col gap-3 bg-background/50">
        <div className="flex justify-between items-start gap-2">
          <h1 className="text-lg font-semibold leading-tight mt-0.5">
            {recipe.name || "Nienazwany przepis"}
          </h1>

          <div className="flex items-center gap-1 shrink-0">
            {recipe.is_global ? (
              <div className="bg-blue-500 h-6 w-6 flex items-center justify-center rounded-md">
                <Globe className="text-white" size={14} />
              </div>
            ) : (
              <div className="bg-neutral-600 h-6 w-6 flex items-center justify-center rounded-md">
                <Lock className="text-white" size={14} />
              </div>
            )}

            <div className="bg-secondary text-secondary-foreground h-6 px-2 flex items-center justify-center text-[10px] uppercase font-bold rounded-md tracking-wider">
              Szkic
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <h2 className="text-sm text-foreground/75">
            {recipe.description ? (
              recipe.description
            ) : (
              <span className="italic text-foreground/40">Brak opisu...</span>
            )}
          </h2>

          {recipe.time_to_make > 0 ? (
            <h2 className="text-xs font-medium flex items-center gap-1 text-foreground/60 mt-1">
              <Clock size={14} /> {recipe.time_to_make} min
            </h2>
          ) : (
            <span className="italic text-foreground/40 flex items-center gap-1 mt-1">
              <Clock size={14} />
              Brak podanego czasu...
            </span>
          )}
        </div>

        {recipe.image_url ? (
          <div className="w-full aspect-video bg-foreground/10 flex items-center justify-center rounded-md overflow-hidden">
            <img
              src={`${recipe.image_url}`}
              alt={`Szkic: ${recipe.name}`}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-full h-20 bg-foreground/5 rounded-md flex items-center justify-center text-foreground/40 text-sm border border-foreground/10">
            Zdjęcie nie zostało jeszcze dodane
          </div>
        )}

        {/* DOLNY PASEK Z PRZYCISKAMI AKCJI */}
        <div className="flex gap-2 mt-1">
          <Button variant="outline" className="flex-1 gap-2" onClick={handleEdit}>
            <PenBox size={16} />
            Dokończ edycję
          </Button>

          <Button
            variant="destructive"
            size="icon"
            onClick={() => setShowDeleteModal(true)}
            disabled={isDeleting} // Blokada podczas usuwania
          >
            <Trash2 size={18} />
          </Button>
        </div>
      </div>

      {/* MODAL POTWIERDZENIA USUNIĘCIA */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        onConfirm={handleDeleteConfirm}
        title="Usuwanie szkicu"
        description={`Czy na pewno chcesz trwale usunąć przepis "${recipe.name || "Nienazwany przepis"}"? Tej operacji nie można cofnąć.`}
        cancelText="Anuluj"
        confirmText="Tak, usuń"
        confirmVariant="destructive"
      />
    </>
  );
}
