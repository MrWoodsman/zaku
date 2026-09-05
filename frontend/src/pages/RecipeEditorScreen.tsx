import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Globe, Lock, Save, Loader2 } from "lucide-react";
import type { RecipeItem } from "@shared/types";

// --- IMPORTY SUB-KOMPONENTÓW ---
import { RecipeBasicInfo } from "@/components/recipe-editor/RecipeBasicInfo";
import { RecipeIngredientsForm } from "@/components/recipe-editor/RecipeIngredientsForm";
import { RecipeStepsForm } from "@/components/recipe-editor/RecipeStepsForm";
import { ConfirmModal } from "@/components/overlay/ConfirmModal";

// --- HOOKI API ---
import { useCreateRecipeMutation, useUpdateRecipeMutation } from "@/hooks/useRecipeMutations";
import { useRecipeDetailsQuery } from "@/hooks/useRecipes";
import { ROUTES } from "@/config/routes";

// --- KOMPONENTY MENU ---
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { showSuccessToast } from "@/utils/toastHandler";

export function RecipeEditorScreen() {
  const navigate = useNavigate();

  // 1. SPRAWDZAMY CZY JESTEŚMY W TRYBIE EDYCJI
  const [searchParams] = useSearchParams();
  const recipeId = searchParams.get("id");
  const isEditing = Boolean(recipeId);

  // 2. POBIERANIE DANYCH I MUTACJE
  const { data: existingRecipe, isLoading: isLoadingRecipe } = useRecipeDetailsQuery(recipeId);

  const { mutate: createRecipe, isPending: isCreating } = useCreateRecipeMutation();
  const { mutate: updateRecipe, isPending: isUpdating } = useUpdateRecipeMutation();

  const isPending = isCreating || isUpdating;

  // 3. STANY FORMULARZA (Inicjalizacja na starcie - często jest pusta, bo dane się ładują)
  const [name, setName] = useState(() => existingRecipe?.name || "");
  const [description, setDescription] = useState(() => existingRecipe?.description || "");
  const [timeToMake, setTimeToMake] = useState(
    () => existingRecipe?.time_to_make?.toString() || "",
  );

  const [imagePreview, setImagePreview] = useState<string | null>(
    () => existingRecipe?.image_url || null,
  );
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [ingredients, setIngredients] = useState(() => {
    const recipe = existingRecipe as RecipeItem;
    if (recipe?.ingredients && recipe.ingredients.length > 0) {
      return recipe.ingredients.map((ing) => ({
        id: ing.id ? ing.id.toString() : Date.now().toString() + Math.random().toString(),
        name: ing.name || "",
        quantity: ing.quantity?.toString() || "",
        unit: ing.unit || "",
      }));
    }
    return [
      { id: Date.now().toString() + Math.random().toString(), name: "", quantity: "", unit: "" },
    ];
  });

  const [steps, setSteps] = useState(() => {
    const recipe = existingRecipe as RecipeItem;
    if (recipe?.steps && recipe.steps.length > 0) {
      return recipe.steps.map((step) => ({
        id: step.id ? step.id.toString() : Date.now().toString() + Math.random().toString(),
        title: step.title || "",
        description: step.description || "",
      }));
    }
    return [{ id: Date.now().toString() + Math.random().toString(), title: "", description: "" }];
  });

  // LOGIKA SKŁADNIKÓW I KROKÓW
  const addIngredient = () =>
    setIngredients([
      ...ingredients,
      { id: Date.now().toString() + Math.random().toString(), name: "", quantity: "", unit: "" },
    ]);
  const updateIngredient = (id: string, field: string, value: string) =>
    setIngredients(ingredients.map((ing) => (ing.id === id ? { ...ing, [field]: value } : ing)));
  const removeIngredient = (id: string) =>
    ingredients.length > 1 && setIngredients(ingredients.filter((ing) => ing.id !== id));

  const addStep = () =>
    setSteps([
      ...steps,
      { id: Date.now().toString() + Math.random().toString(), title: "", description: "" },
    ]);
  const updateStep = (id: string, field: string, value: string) =>
    setSteps(steps.map((step) => (step.id === id ? { ...step, [field]: value } : step)));
  const removeStep = (id: string) =>
    steps.length > 1 && setSteps(steps.filter((step) => step.id !== id));

  // 4. SYNCHRONIZACJA DANYCH Z BACKENDEM I BEZPIECZEŃSTWO
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [initialFormState, setInitialFormState] = useState<string | null>(null);
  const isDataLoaded = useRef(false);

  // NAPRAWA PUSTEGO FORMULARZA: Aktualizacja pól po pobraniu danych z serwera
  // NAPRAWA PUSTEGO FORMULARZA: Aktualizacja pól po pobraniu danych z serwera
  useEffect(() => {
    if (isEditing && existingRecipe && !isLoadingRecipe && !isDataLoaded.current) {
      isDataLoaded.current = true; // Zablokuj kolejne nadpisania OD RAZU

      // Opóźnienie 0ms uspokaja linter, oddzielając to od cyklu renderowania
      setTimeout(() => {
        setName(existingRecipe.name || "");
        setDescription(existingRecipe.description || "");
        setTimeToMake(existingRecipe.time_to_make?.toString() || "");
        setImagePreview(existingRecipe.image_url || null);

        if (existingRecipe.ingredients && existingRecipe.ingredients.length > 0) {
          setIngredients(
            existingRecipe.ingredients.map((ing) => ({
              id: ing.id ? ing.id.toString() : Date.now().toString() + Math.random().toString(),
              name: ing.name || "",
              quantity: ing.quantity?.toString() || "",
              unit: ing.unit || "",
            })),
          );
        }

        if (existingRecipe.steps && existingRecipe.steps.length > 0) {
          setSteps(
            existingRecipe.steps.map((step) => ({
              id: step.id ? step.id.toString() : Date.now().toString() + Math.random().toString(),
              title: step.title || "",
              description: step.description || "",
            })),
          );
        }
      }, 0);
    }
  }, [isEditing, existingRecipe, isLoadingRecipe]);

  const currentFormState = JSON.stringify({ name, description, timeToMake, ingredients, steps });

  // Ustawienie punktu odniesienia do wykrywania niezapisanych zmian
  useEffect(() => {
    if (!isLoadingRecipe && initialFormState === null && (isDataLoaded.current || !isEditing)) {
      setInitialFormState(currentFormState);
    }
  }, [isLoadingRecipe, initialFormState, isEditing, currentFormState]);

  const hasUnsavedChanges =
    (initialFormState !== null && currentFormState !== initialFormState) || imageFile !== null;

  useEffect(() => {
    const handlePopState = () => {
      if (hasUnsavedChanges) {
        window.history.pushState(null, "", window.location.href);
        setShowExitDialog(true);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [hasUnsavedChanges]);

  const handleBackClick = () => {
    if (hasUnsavedChanges) {
      setShowExitDialog(true);
    } else {
      navigate(-1);
    }
  };

  const confirmExit = () => {
    setShowExitDialog(false);
    navigate(-1);
  };

  // 5. ZAPISYWANIE (Teraz przyjmuje wybrany tryb z DropdownMenu)
  const handleSave = (mode: "draft" | "private" | "global") => {
    if (!name.trim()) {
      alert("Nazwa przepisu jest wymagana!");
      return;
    }

    const finalIngredients = ingredients
      .filter((ing) => ing.name.trim() !== "")
      .map((ing) => ({
        name: ing.name.trim(),
        quantity: Number(ing.quantity) || 0,
        unit: ing.unit,
      }));

    const finalSteps = steps
      .filter((step) => step.description.trim() !== "")
      .map((step, index) => ({
        order: index + 1,
        title: step.title.trim(),
        description: step.description.trim(),
      }));

    const status = mode === "draft" ? "draft" : "published";
    const isGlobal = mode === "global";

    const formData = new FormData();
    formData.append("name", name.trim());
    formData.append("description", description.trim());
    formData.append("time_to_make", timeToMake.toString());
    formData.append("is_global", isGlobal ? "true" : "false");
    formData.append("status", status);
    formData.append("ingredients", JSON.stringify(finalIngredients));
    formData.append("steps", JSON.stringify(finalSteps));

    if (imageFile) {
      formData.append("image", imageFile);
    }

    if (isEditing && recipeId) {
      updateRecipe(
        { id: recipeId, formData },
        {
          onSuccess: () => {
            navigate(ROUTES.RECIPES, { replace: true });
            showSuccessToast(`Zaktualizowano przepis ${name}`);
          },
        },
      );
    } else {
      createRecipe(formData, {
        onSuccess: () => {
          navigate(ROUTES.RECIPES, { replace: true });
          showSuccessToast(`Utworzono przepis ${name}`);
        },
      });
    }
  };

  if (isEditing && isLoadingRecipe) {
    return (
      <div className="w-full h-dvh flex items-center justify-center text-muted-foreground">
        Pobieranie przepisu...
      </div>
    );
  }

  return (
    <>
      <div className="w-full h-dvh flex flex-col bg-background overflow-hidden relative">
        {/* GÓRNY PASEK Z MENU ZAPISU */}
        <div className="flex items-center justify-between p-4 border-b border-border/40 shrink-0 bg-background pt-[max(12px,env(safe-area-inset-top))]">
          <Button variant="ghost" size="icon" onClick={handleBackClick} className="-ml-2">
            <ArrowLeft size={22} />
          </Button>

          <h1 className="font-semibold text-lg truncate px-2 text-center flex-1">
            {isEditing ? "Edytuj przepis" : "Nowy przepis"}
          </h1>

          {/* KWADRATOWY PRZYCISK ZAPISU OTWIERAJĄCY MENU */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                disabled={isPending}
                size="icon"
                variant="accent"
                className="h-10 w-10 rounded-xl shadow-sm"
              >
                {isPending ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
              </Button>
            </DropdownMenuTrigger>

            {/* DRAWER / MENU OPCJI ZAPISU */}
            <DropdownMenuContent align="end" className="w-64 p-2 rounded-xl">
              <div className="px-2 py-1.5 mb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Wybierz sposób zapisu
              </div>

              <DropdownMenuItem
                onClick={() => handleSave("draft")}
                className="flex gap-3 p-3 cursor-pointer rounded-lg hover:bg-secondary"
              >
                <div className="bg-secondary/50 p-2 rounded-md">
                  <Save size={18} className="text-foreground" />
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold text-sm">Zapisz jako szkic</span>
                  <span className="text-xs text-muted-foreground">Widoczne tylko dla Ciebie</span>
                </div>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => handleSave("private")}
                className="flex gap-3 p-3 cursor-pointer rounded-lg hover:bg-secondary"
              >
                <div className="bg-emerald-500/10 p-2 rounded-md">
                  <Lock size={18} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold text-sm">Opublikuj prywatnie</span>
                  <span className="text-xs text-muted-foreground">Tylko dla Twojej grupy</span>
                </div>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => handleSave("global")}
                className="flex gap-3 p-3 cursor-pointer rounded-lg hover:bg-secondary"
              >
                <div className="bg-blue-500/10 p-2 rounded-md">
                  <Globe size={18} className="text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold text-sm">Opublikuj globalnie</span>
                  <span className="text-xs text-muted-foreground">Dla wszystkich w aplikacji</span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* ZAWARTOŚĆ FORMULARZA */}
        <div className="flex-1 flex flex-col gap-6 overflow-y-auto px-4 pt-4 pb-12">
          <RecipeBasicInfo
            name={name}
            setName={setName}
            description={description}
            setDescription={setDescription}
            timeToMake={timeToMake}
            setTimeToMake={setTimeToMake}
            imagePreview={imagePreview}
            setImagePreview={setImagePreview}
            setImageFile={setImageFile}
          />

          <hr className="border-border/50" />

          <RecipeIngredientsForm
            ingredients={ingredients}
            addIngredient={addIngredient}
            updateIngredient={updateIngredient}
            removeIngredient={removeIngredient}
          />

          <hr className="border-border/50" />

          <RecipeStepsForm
            steps={steps}
            addStep={addStep}
            updateStep={updateStep}
            removeStep={removeStep}
          />
        </div>
      </div>

      <ConfirmModal
        isOpen={showExitDialog}
        onOpenChange={setShowExitDialog}
        onConfirm={confirmExit}
        title="Niezapisane zmiany"
        description="Wykryto zmiany w formularzu. Czy na pewno chcesz wyjść bez zapisywania? Twoja praca przepadnie."
        cancelText="Wróć do edycji"
        confirmText="Tak, wyjdź"
        confirmVariant="destructive"
      />
    </>
  );
}
