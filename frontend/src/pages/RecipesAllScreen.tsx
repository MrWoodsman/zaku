import { useAllRecipesQuery } from "@/hooks/useRecipes";
import { Globe, PenBox, Clock, Lock, Search, Trash2, FileEdit } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/overlay/ConfirmModal";
import { ROUTES } from "@/config/routes";
import type { RecipeItem as RecipeItemType } from "@shared/types";
import { useDeleteRecipeMutation } from "@/hooks/useRecipeMutations";
import { useGroup } from "@/hooks/useGroup";
import { showSuccessToast } from "@/utils/toastHandler";
import { Loading } from "@/components/common/Loading";
import { NotFound } from "@/components/common/NotFound";

type FilterType = "all" | "draft" | "private" | "global";

export function RecipesAllScreen() {
  const { groupId } = useGroup();
  const { data, isLoading, error } = useAllRecipesQuery();

  // Stany wyszukiwania i filtrów
  const [searchVal, setSearchVal] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");

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
  // 1. Wyciągamy tylko przepisy, których jesteś właścicielem
  const owned = data?.filter((item) => item.group_id === groupId) || [];

  // 2. Filtrowanie po tekście i wybranym filtrze (Szkic / Prywatne / Globalne)
  const filteredRecipes = owned.filter((item) => {
    // Sprawdzanie wyszukiwarki
    const matchesSearch = item.name.toUpperCase().includes(searchVal.toUpperCase());
    if (!matchesSearch) return false;

    // Sprawdzanie aktywnych zakładek
    if (activeFilter === "all") return true;
    if (activeFilter === "draft") return item.status === "draft";
    if (activeFilter === "private") return item.status !== "draft" && !item.is_global;
    if (activeFilter === "global") return item.status !== "draft" && item.is_global;

    return true;
  });

  return (
    <div className="w-full h-full flex flex-col gap-3 bg-background pt-[max(8px,env(safe-area-inset-top))]">
      <div className="px-2 shrink-0 flex flex-col gap-3">
        {/* Wyszukiwarka */}
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            size={18}
          />
          <input
            type="text"
            placeholder="Szukaj w swoich przepisach..."
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            className="w-full bg-secondary/50 border border-border/50 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
          />
        </div>

        {/* Przyciski filtrów (Pills) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-2 px-2">
          <FilterPill
            label="Wszystkie"
            isActive={activeFilter === "all"}
            onClick={() => setActiveFilter("all")}
          />
          <FilterPill
            label="Szkice"
            isActive={activeFilter === "draft"}
            onClick={() => setActiveFilter("draft")}
            icon={<FileEdit size={14} />}
          />
          <FilterPill
            label="Prywatne"
            isActive={activeFilter === "private"}
            onClick={() => setActiveFilter("private")}
            icon={<Lock size={14} />}
          />
          <FilterPill
            label="Globalne"
            isActive={activeFilter === "global"}
            onClick={() => setActiveFilter("global")}
            icon={<Globe size={14} />}
          />
        </div>
      </div>

      {/* Lista przepisów */}
      <div className="content flex-1 flex flex-col px-2 pb-4 gap-3 overflow-y-auto">
        {filteredRecipes.length === 0 ? (
          <div className="mt-6 flex flex-col items-center gap-3 p-8 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-highlight/10 text-highlight">
              <Search size={24} />
            </div>
            <p className="text-sm text-muted-foreground">Brak wyników dla tych filtrów.</p>
          </div>
        ) : (
          filteredRecipes.map((recipe) => <RecipeItem key={recipe.id} recipe={recipe} />)
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------
// KOMPONENT PRZYCISKU FILTRU (PILL)
// ---------------------------------------------------------
function FilterPill({
  label,
  isActive,
  onClick,
  icon,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
        isActive
          ? "bg-highlight text-highlight-foreground shadow-sm"
          : "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border/50"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

// ---------------------------------------------------------
// KOMPONENT POJEDYNCZEGO PRZEPISU
// ---------------------------------------------------------
function RecipeItem({ recipe }: { recipe: RecipeItemType }) {
  const navigate = useNavigate();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const { mutate: deleteRecipe, isPending: isDeleting } = useDeleteRecipeMutation();

  const handleEdit = () => {
    navigate(`${ROUTES.RECIPES_EDITOR}?id=${recipe.id}`);
  };

  const handleDeleteConfirm = () => {
    deleteRecipe(recipe.id, {
      onSuccess: () => {
        setShowDeleteModal(false);
        showSuccessToast(`Usunięto przepis ${recipe.name}`);
      },
    });
  };

  const isDraft = recipe.status === "draft";

  return (
    <>
      <div className="relative border border-border/60 p-2 rounded-xl flex flex-col gap-3 bg-card shadow-sm hover:shadow-md transition-shadow">
        {/* NAGŁÓWEK I ODZNAKI */}
        <div className="flex justify-between items-start gap-3">
          <h1 className="text-lg font-semibold leading-tight line-clamp-2">
            {recipe.name || "Nienazwany przepis"}
          </h1>

          <div className="flex flex-col items-end gap-1 shrink-0">
            {/* ODZNAKA: SZKIC / PRYWATNY / GLOBALNY */}
            {isDraft ? (
              <Badge variant="draft" icon={<FileEdit size={12} />} label="SZKIC" />
            ) : recipe.is_global ? (
              <Badge variant="global" icon={<Globe size={12} />} label="GLOBALNY" />
            ) : (
              <Badge variant="private" icon={<Lock size={12} />} label="PRYWATNY" />
            )}
          </div>
        </div>

        {/* OPIS I CZAS */}
        <div className="flex flex-col gap-1.5">
          <p className="text-sm text-muted-foreground line-clamp-2">
            {recipe.description || <span className="italic opacity-60">Brak opisu...</span>}
          </p>

          <div className="text-xs font-medium flex items-center gap-1.5 text-foreground/70 mt-1">
            <Clock size={14} className="opacity-70" />
            {recipe.time_to_make > 0 ? (
              `${recipe.time_to_make} min`
            ) : (
              <span className="italic opacity-60">Brak czasu</span>
            )}
          </div>
        </div>

        {/* ZDJĘCIE */}
        {recipe.image_url ? (
          <div className="w-full aspect-video bg-muted flex items-center justify-center rounded-lg overflow-hidden border border-border/30 mt-1">
            <img src={recipe.image_url} alt={recipe.name} className="w-full h-full object-cover" />
          </div>
        ) : null}

        {/* DOLNY PASEK Z PRZYCISKAMI AKCJI */}
        <div className="flex gap-2 mt-2 pt-3 border-t border-border/40">
          <Button
            variant={isDraft ? "default" : "secondary"}
            className="flex-1 gap-2 h-9"
            onClick={handleEdit}
          >
            <PenBox size={16} />
            {isDraft ? "Dokończ edycję" : "Edytuj przepis"}
          </Button>

          <Button
            variant="destructive"
            size="icon"
            className="h-9 w-9"
            onClick={() => setShowDeleteModal(true)}
            disabled={isDeleting}
          >
            <Trash2 size={16} />
          </Button>
        </div>
      </div>

      {/* MODAL POTWIERDZENIA USUNIĘCIA */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        onConfirm={handleDeleteConfirm}
        title="Usuwanie przepisu"
        description={`Czy na pewno chcesz trwale usunąć przepis "${recipe.name || "Nienazwany przepis"}"? Tej operacji nie można cofnąć.`}
        cancelText="Anuluj"
        confirmText="Tak, usuń"
        confirmVariant="destructive"
      />
    </>
  );
}

// ---------------------------------------------------------
// POMOCNICZY KOMPONENT ODZNAKI (BADGE)
// ---------------------------------------------------------
function Badge({
  variant,
  icon,
  label,
}: {
  variant: "draft" | "global" | "private";
  icon: React.ReactNode;
  label: string;
}) {
  const styles = {
    draft: "bg-secondary text-secondary-foreground border-border",
    global: "bg-blue-500/15 text-blue-600 border-blue-500/20 dark:text-blue-400",
    private: "bg-yellow-500/15 text-yellow-700 border-yellow-500/20 dark:text-yellow-500",
  };

  return (
    <div
      className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${styles[variant]}`}
    >
      {icon}
      {label}
    </div>
  );
}
