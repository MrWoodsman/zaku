import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dices, Clock, Info, ShoppingBag } from "lucide-react";
import { ROUTES } from "@/config/routes";
import { createGroupApi, joinGroupApi, GroupApiError } from "@/api/groups";
import { cn } from "@/lib/utils";

type Mode = "join" | "create";

interface HomeScreenProps {
  onJoin: (id: string) => void;
}

export function HomeScreen({ onJoin }: HomeScreenProps) {
  const navigate = useNavigate();
  const [groupId, setGroupId] = useState("");
  const [showHelp, setShowHelp] = useState(false);
  const [mode, setMode] = useState<Mode>("join");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // 1. Leniwa inicjalizacja - naprawia błąd "cascading renders"
  // Stan losuje się tylko RAZ przy pierwszym renderze, bez użycia useEffect
  const [randomHint] = useState(() => {
    const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `DOM-${suffix}`;
  });

  // To samo dla historii z localStorage
  const [recentGroups, setRecentGroups] = useState<string[]>(() => {
    const saved = localStorage.getItem("recentGroups");
    return saved ? JSON.parse(saved) : [];
  });

  const handleAddSuffix = () => {
    const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
    setGroupId((prev) => {
      const trimmed = prev.trim();
      if (trimmed === "") return `GRUPA-${randomStr}`;
      const separator = trimmed.endsWith("-") ? "" : "-";
      return `${trimmed}${separator}${randomStr}`;
    });
    setError(null);
  };

  const storeRecents = (list: string[]) => {
    localStorage.setItem("recentGroups", JSON.stringify(list));
    setRecentGroups(list);
  };

  const changeMode = (next: Mode) => {
    if (next === mode) return;
    setMode(next);
    setError(null);
  };

  // Create and join are separate actions: the backend only creates a group on "create"
  const submit = async (rawId: string, action: Mode) => {
    if (pending || rawId.trim().length === 0) return;
    setPending(true);
    setError(null);
    try {
      // The backend normalizes the code and returns it
      const id = await (action === "create" ? createGroupApi(rawId) : joinGroupApi(rawId));
      storeRecents([id, ...recentGroups.filter((r) => r !== id)].slice(0, 3));
      onJoin(id);
      navigate(ROUTES.HOME, { replace: true });
    } catch (err) {
      // A saved "recent" group that no longer exists is dropped from the list
      if (action === "join" && err instanceof GroupApiError && err.status === 404) {
        const normalized = rawId.trim().toUpperCase().replace(/\s+/g, "-");
        storeRecents(recentGroups.filter((r) => r !== normalized));
      }
      setError(err instanceof Error ? err.message : "Nie udało się połączyć z serwerem");
      setPending(false);
    }
  };

  const isCreate = mode === "create";

  return (
    <>
      {/* GŁÓWNY EKRAN */}
      <div className="w-full h-full flex flex-col p-4 pt-[max(16px,var(--safe-top))] relative z-10">
        <div className="flex-1 flex items-center justify-center">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-highlight/20 blur-2xl" />
            <div className="relative flex size-40 items-center justify-center rounded-3xl border border-highlight/20 bg-highlight/10">
              <ShoppingBag className="size-16 text-highlight" strokeWidth={1.5} />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6 pb-[max(8px,var(--safe-bottom))]">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold tracking-tight">
              {isCreate ? "Utwórz nową grupę" : "Dołącz do grupy"}
            </h2>
            <p className="text-sm text-neutral-400">
              {isCreate
                ? "Wymyśl kod grupy i podaj go domownikom, aby mogli do niej dołączyć."
                : "Wpisz kod grupy, którą ktoś już utworzył, aby zarządzać wspólnymi zakupami."}
            </p>
          </div>

          <div
            role="tablist"
            aria-label="Wybierz akcję"
            className="grid grid-cols-2 gap-1 rounded-xl bg-bacground-tone/50 p-1"
          >
            {(["join", "create"] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                onClick={() => changeMode(m)}
                className={cn(
                  "h-11 rounded-lg text-sm font-medium transition-all active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100",
                  mode === m ? "bg-background text-primary shadow-sm" : "text-primary/60",
                )}
              >
                {m === "join" ? "Dołącz do grupy" : "Utwórz nową"}
              </button>
            ))}
          </div>

          {!isCreate && recentGroups.length > 0 && (
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-2 text-xs text-primary font-medium uppercase tracking-wider">
                <Clock size={14} />
                <span>Ostatnio używane</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {recentGroups.map((recentId) => (
                  <button
                    key={recentId}
                    disabled={pending}
                    onClick={() => submit(recentId, "join")}
                    className="min-h-11 px-4 py-2 bg-bacground-tone/50 hover:bg-bacground-tone/25 active:scale-95 text-primary rounded-full text-sm font-medium transition-all motion-reduce:transition-none motion-reduce:active:scale-100 border border-bacground-tone"
                  >
                    {recentId}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <div className="relative">
              <Input
                placeholder={`np. ${randomHint}`}
                className={cn("h-12 text-lg uppercase", isCreate && "pr-28")}
                aria-invalid={error ? true : undefined}
                value={groupId}
                onChange={(e) => {
                  setGroupId(e.target.value);
                  setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submit(groupId, mode);
                }}
              />
              {isCreate && (
                <button
                  type="button"
                  onClick={handleAddSuffix}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 flex min-h-11 items-center gap-1.5 px-3 text-xs font-medium bg-bacground-tone/80 text-primary hover:text-primary/75 hover:bg-background/50 active:scale-95 rounded-md transition-all motion-reduce:transition-none motion-reduce:active:scale-100 border border-foreground/15"
                >
                  <Dices size={14} />
                  Losuj
                </button>
              )}
            </div>

            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}

            {isCreate && (
              <div className="flex justify-center mt-1">
                <button
                  type="button"
                  onClick={() => setShowHelp(true)}
                  className="text-[11px] text-primary/75 hover:text-primary/50 active:opacity-60 transition-colors flex items-center gap-1.5 cursor-pointer min-h-11 py-1"
                >
                  <Info size={12} />
                  <span>Wymyśl trudną nazwę i udostępnij ją domownikom.</span>
                </button>
              </div>
            )}
          </div>

          <Button
            size="lg"
            className="w-full h-12"
            disabled={groupId.trim().length === 0 || pending}
            onClick={() => submit(groupId, mode)}
          >
            {pending ? "Łączenie…" : isCreate ? "Utwórz grupę" : "Dołącz do grupy"}
          </Button>
        </div>
      </div>

      {/* WYSUWANA SZUFLADA Z INFORMACJAMI (BOTTOM DRAWER) */}

      {/* Tło przyciemniające (Overlay) */}
      {showHelp && (
        <div
          className="fixed inset-0 bg-black/60 z-40 animate-in fade-in duration-200"
          onClick={() => setShowHelp(false)}
        />
      )}

      {/* Sam panel wyjeżdżający z dołu */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-background/75 rounded-t-3xl p-6 pb-[max(32px,var(--safe-bottom))] transition-transform duration-300 ease-out motion-reduce:transition-none shadow-[0_-10px_40px_rgba(0,0,0,0.5)] ${
          showHelp ? "translate-y-0" : "translate-y-full"
        }`}
      >
        {/* Mały "uchwyt" na górze szuflady (częsty motyw w iOS/Android) */}
        <div className="w-12 h-1.5 bg-bacground-tone rounded-full mx-auto mb-6" />

        <h3 className="text-xl font-semibold text-primary mb-4 flex items-center gap-2">
          <Info size={20} className="text-primary/75" />O co chodzi z ID Grupy?
        </h3>

        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium text-primary/85 mb-1">
              Bezpieczeństwo i unikalność
            </h4>
            <p className="text-sm text-primary/60 leading-relaxed">
              Aplikacja nie wymaga logowania hasłem, więc ID grupy to Twój jedyny klucz. Prosta
              nazwa (np. "DOM") może być zajęta albo łatwa do odgadnięcia. Kliknij przycisk
              "Losuj", aby wygenerować bezpieczną końcówkę.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-medium text-primary/85 mb-1">Współdzielenie list</h4>
            <p className="text-sm text-primary/60 leading-relaxed">
              Aby robić zakupy wspólnie z drugą osobą, musisz podyktować jej dokładnie to samo ID.
              Kiedy wybierze "Dołącz do grupy" i wpisze je na swoim telefonie, połączycie się w
              czasie rzeczywistym.
            </p>
          </div>
        </div>

        <Button variant="secondary" className="w-full mt-6 h-12" onClick={() => setShowHelp(false)}>
          Rozumiem, zamknij
        </Button>
      </div>
    </>
  );
}
