import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Copy, Link2, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { importRecipeFromUrlApi, importRecipeImageApi } from "@/api/recipes";
import { ROUTES } from "@/config/routes";
import {
  AI_RECIPE_PROMPT,
  copyText,
  seedFromAiJson,
  seedFromImport,
  setPendingImportSeed,
  withImage,
  type ImportSeed,
} from "@/utils/recipeImport";

type Mode = "link" | "ai";

interface RecipeImportOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// text-base (16px) on the fields keeps iOS Safari from zooming in on focus
const fieldClass =
  "w-full bg-background border border-border/50 rounded-lg px-3 text-base focus:outline-none focus:ring-1 focus:ring-primary/50";

export function RecipeImportOverlay({ open, onOpenChange }: RecipeImportOverlayProps) {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("link");
  const [url, setUrl] = useState("");
  const [aiText, setAiText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
  };

  // The editor opens pre-filled; nothing is saved until the user saves there
  const openEditor = (seed: ImportSeed) => {
    onOpenChange(false);
    setPendingImportSeed(seed);
    navigate(ROUTES.RECIPES_EDITOR);
  };

  const handleUrlImport = async () => {
    if (!url.trim() || isLoading) return;
    setError(null);
    setIsLoading(true);
    try {
      openEditor(await seedFromImport(await importRecipeFromUrlApi(url.trim())));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się zaimportować przepisu");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAiImport = async () => {
    if (isLoading) return;
    setError(null);
    let parsed: ReturnType<typeof seedFromAiJson>;
    try {
      parsed = seedFromAiJson(aiText);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się wczytać odpowiedzi");
      return;
    }

    // The photo is optional: AI-given links are often wrong, so a failure just skips it
    setIsLoading(true);
    try {
      const { imageUrl, ...seed } = parsed;
      const imageDataUrl = imageUrl ? await importRecipeImageApi(imageUrl).catch(() => null) : null;
      openEditor(await withImage(seed, imageDataUrl));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (await copyText(AI_RECIPE_PROMPT)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      setError("Nie udało się skopiować. Zaznacz i skopiuj prompt ręcznie.");
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="bg-background border-border px-4 pb-[max(24px,var(--safe-bottom))]">
        <DrawerHeader className="px-0 text-left">
          <DrawerTitle className="text-xl">Importuj przepis</DrawerTitle>
          <DrawerDescription>
            Przed zapisaniem sprawdzisz i poprawisz wszystko w edytorze.
          </DrawerDescription>
        </DrawerHeader>

        {/* SEGMENTED CONTROL */}
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-secondary p-1" role="tablist">
          {(
            [
              { id: "link", label: "Z linku", Icon: Link2 },
              { id: "ai", label: "Przez AI", Icon: Sparkles },
            ] as const
          ).map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={mode === id}
              onClick={() => switchMode(id)}
              className={`flex h-11 items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors active:opacity-70 ${
                mode === id ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
              }`}
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3 py-4">
          {mode === "link" ? (
            <>
              <input
                type="url"
                inputMode="url"
                autoCapitalize="none"
                autoCorrect="off"
                placeholder="https://..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleUrlImport()}
                className={`${fieldClass} h-12`}
              />
              <p className="text-sm text-muted-foreground">
                Wklej link do przepisu. Strona nie działa?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("ai")}
                  className="text-primary underline underline-offset-4"
                >
                  Spróbuj z AI
                </button>
                .
              </p>
              <Button
                variant="raised"
                className="h-12 w-full text-base"
                disabled={!url.trim() || isLoading}
                onClick={handleUrlImport}
              >
                {isLoading ? <Loader2 className="animate-spin" /> : null}
                {isLoading ? "Pobieranie..." : "Pobierz przepis"}
              </Button>
            </>
          ) : (
            <>
              <ol className="flex flex-col gap-1 text-sm text-muted-foreground list-decimal pl-5">
                <li>Skopiuj prompt.</li>
                <li>Wklej go do AI i dopisz na końcu link do przepisu (albo sam tekst przepisu).</li>
                <li>Wklej tutaj odpowiedź AI.</li>
              </ol>
              <Button variant="outline" className="h-12 w-full text-base" onClick={handleCopy}>
                {copied ? <Check /> : <Copy />}
                {copied ? "Skopiowano" : "Skopiuj prompt"}
              </Button>
              <textarea
                placeholder="Odpowiedź AI (JSON)"
                value={aiText}
                onChange={(e) => setAiText(e.target.value)}
                rows={5}
                className={`${fieldClass} py-3 resize-none`}
              />
              <Button
                variant="raised"
                className="h-12 w-full text-base"
                disabled={!aiText.trim() || isLoading}
                onClick={handleAiImport}
              >
                {isLoading ? <Loader2 className="animate-spin" /> : null}
                {isLoading ? "Wczytywanie..." : "Wczytaj przepis"}
              </Button>
            </>
          )}

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
