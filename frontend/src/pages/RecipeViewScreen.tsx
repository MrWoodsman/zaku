import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useRecipeDetailsQuery } from "@/hooks/useRecipes";
import { Button } from "@/components/ui/button";
import {
  MoreVertical,
  Edit,
  ShoppingCart,
  Clock,
  Globe,
  Lock,
  ChefHat,
  Trash2,
  Crown,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROUTES } from "@/config/routes";
import { useGroup } from "@/hooks/useGroup";
import { useDeleteRecipeMutation } from "@/hooks/useRecipeMutations";
import { ConfirmModal } from "@/components/overlay/ConfirmModal"; // Dopasuj ścieżkę do swojego pliku!
import { RecipeToShoppingListOverlay } from "@/components/overlay/recipes/RecipeToShoppingListOverlay";
import { showSuccessToast } from "@/utils/toastHandler";
import { NotFound } from "@/components/common/NotFound";
import { Loading } from "@/components/common/Loading";

export function RecipeViewScreen() {
  const { groupId } = useGroup();

  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const recipeId = id as string;

  // STAN MODALA
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { mutate: deleteRecipe, isPending: isDeleting } = useDeleteRecipeMutation();

  const { data, isLoading, error } = useRecipeDetailsQuery(recipeId);

  if (isLoading)
    return (
      <Loading
        title="Ładowanie przepisu"
        description="Jeśli to trwa zbyt długo, sprawdź swoje połączenie internetowe."
      />
    );
  if (error || !data)
    return (
      <NotFound
        title="Nie udało się załadować przepisu!"
        description="Ta lista nie istnieje lub wystąpił problem z połączeniem z serwerem."
      />
    );

  // Przygotowanie posortowanych kroków
  const sortedSteps = data?.steps ? [...data.steps].sort((a, b) => a.order - b.order) : [];

  return (
    <>
      <div className="w-full h-dvh flex flex-col bg-background overflow-y-auto pb-12">
        <div className="w-full max-w-2xl mx-auto flex flex-col gap-6 pt-[max(12px,env(safe-area-inset-top))] px-2">
          {/* ZDJĘCIE ORAZ PASEK OPCJI (TRZY KROPKI) */}
          {/* Cień i przycinanie celowo na dwoch oddzielnych warstwach: overflow-hidden +
              rounded + box-shadow na jednym elemencie potrafi na iOS Safari zrenderowac
              cien z kwadratowymi rogami wystajacymi poza zaokraglenie. */}
          <div className="relative w-full aspect-video rounded-xl shadow-md">
            <div className="absolute inset-0 overflow-hidden rounded-xl bg-secondary/30">
              {data?.image_url ? (
                <img
                  src={data.image_url}
                  className="w-full h-full object-cover"
                  alt={`Zdjęcie ${data?.name}`}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  <ChefHat size={48} className="opacity-40" />
                </div>
              )}
            </div>

            {/* Przycisk Menu (Trzy kropki) w prawym górnym rogu zdjęcia */}
            <div className="absolute top-3 right-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-9 w-9 rounded-full bg-background/80 backdrop-blur-md shadow-sm hover:bg-background/90"
                  >
                    <MoreVertical size={18} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {/* Opcja edycji i usuwania */}
                  {data.group_id == groupId && (
                    <>
                      <DropdownMenuItem
                        onClick={() => navigate(`${ROUTES.RECIPES_EDITOR}?id=${data.id}`)}
                        className="gap-2 cursor-pointer"
                      >
                        <Edit size={16} />
                        Edytuj przepis
                      </DropdownMenuItem>

                      {/* ZMIANA: Zamiast usuwać, otwieramy modal */}
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => setIsDeleteDialogOpen(true)}
                        className="gap-2 cursor-pointer"
                      >
                        <Trash2 size={16} />
                        Usuń przepis
                      </DropdownMenuItem>
                    </>
                  )}

                  {/* Opcja dodania składników do listy zakupów */}
                  <RecipeToShoppingListOverlay
                    recipeName={data.name}
                    ingredients={(data.ingredients || []).map((ing) => ({
                      ...ing,
                      id: ing.id || crypto.randomUUID(), // Zabezpieczenie: upewnia TS, że id zawsze tu będzie
                    }))}
                  >
                    <DropdownMenuItem
                      onSelect={(e) => {
                        // Blokujemy domyślne zamknięcie menu, żeby Drawer mógł się spokojnie otworzyć!
                        e.preventDefault();
                      }}
                      className="cursor-pointer"
                    >
                      <ShoppingCart size={16} className="mr-2" />
                      Dodaj składniki do listy
                    </DropdownMenuItem>
                  </RecipeToShoppingListOverlay>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* NAGŁÓWEK: TYTUŁ I OPIS */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                {data?.name}
              </h1>
            </div>

            {/* Dodatkowe metadane (czas przygotowania, widoczność) */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
              {/* CZAS PRZYGOTOWANIA */}
              {data?.time_to_make ? (
                <div className="flex items-center gap-1.5">
                  <Clock size={15} />
                  <span>{data.time_to_make} min</span>
                </div>
              ) : null}

              {/* PRYWTNY / PUBLICZNY */}
              <div className="flex items-center gap-1.5">
                {data?.is_global ? (
                  <>
                    <Globe size={15} className="text-blue-500" />
                    <span>Globalny</span>
                  </>
                ) : (
                  <>
                    <Lock size={15} />
                    <span>Prywatny</span>
                  </>
                )}
              </div>

              {/* WŁAŚCICIEL */}
              {data.group_id == groupId && (
                <div className="flex items-center gap-1.5">
                  <Crown size={15} className="text-yellow-500" />
                  <span>Jesteś właścicielem</span>
                </div>
              )}
            </div>

            {data?.description && (
              <p className="text-muted-foreground text-base mt-2 leading-relaxed">
                {data.description}
              </p>
            )}
          </div>

          <hr className="border-border/60" />

          {/* SEKCJA: SKŁADNIKI */}
          <div className="flex flex-col gap-3">
            <h2 className="text-lg font-bold uppercase tracking-wider text-foreground/90">
              Składniki
            </h2>
            <div className="grid grid-cols-1 gap-2">
              {data?.ingredients?.map((item, index) => (
                <div
                  key={item.id || index}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/40"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-highlight bg-highlight/10 border border-highlight/20 px-2 py-1 min-h-6 min-w-6 flex items-center justify-center rounded-md">
                      {index + 1}
                    </span>
                    <span className="font-medium text-foreground">{item.name}</span>
                  </div>
                  <span className="font-mono text-sm font-semibold text-foreground">
                    {item.quantity} {item.unit}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <hr className="border-border/60" />

          {/* SEKCJA: KROKI PRZYGOTOWANIA */}
          <div className="flex flex-col gap-4 pb-6">
            <h2 className="text-lg font-bold uppercase tracking-wider text-foreground/90">
              Kroki przygotowania
            </h2>
            <div className="flex flex-col gap-4">
              {sortedSteps.map((item, index) => (
                <div
                  key={item.id || index}
                  className="flex gap-4 p-4 rounded-xl bg-card border border-border/50 shadow-sm"
                >
                  <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-highlight/10 border border-highlight/20 text-highlight font-bold text-sm">
                    {item.order || index + 1}
                  </div>

                  <div className="flex flex-col gap-1.5 flex-1">
                    {item.title && (
                      <h3 className="text-base font-semibold text-foreground">{item.title}</h3>
                    )}
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL POTWIERDZENIA USUNIĘCIA */}
      <ConfirmModal
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Usuwanie przepisu"
        description={`Czy na pewno chcesz usunąć przepis "${data.name}"? Tej operacji nie można cofnąć.`}
        confirmText={isDeleting ? "Usuwanie..." : "Usuń przepis"}
        confirmVariant="destructive"
        onConfirm={() => {
          deleteRecipe(data.id, {
            onSuccess: () => {
              setIsDeleteDialogOpen(false);
              navigate(ROUTES.RECIPES, { replace: true });
              showSuccessToast(`Usunięto przepis ${data.name}`);
            },
          });
        }}
      />
    </>
  );
}
