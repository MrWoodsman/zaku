import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dices, Clock, Info, ShoppingBag } from "lucide-react";
import { ROUTES } from "@/config/routes";

interface HomeScreenProps {
  onJoin: (id: string) => void;
}

export function HomeScreen({ onJoin }: HomeScreenProps) {
  const navigate = useNavigate();
  const [groupId, setGroupId] = useState("");
  const [showHelp, setShowHelp] = useState(false);

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
  };

  const executeJoin = (idToJoin: string) => {
    const normalizedId = idToJoin.trim().toUpperCase().replace(/\s+/g, "-");
    if (normalizedId.length === 0) return;

    const updatedRecents = [
      normalizedId,
      ...recentGroups.filter((id) => id !== normalizedId),
    ].slice(0, 3);

    localStorage.setItem("recentGroups", JSON.stringify(updatedRecents));
    setRecentGroups(updatedRecents);

    onJoin(normalizedId);
    navigate(ROUTES.HOME, { replace: true });
  };

  const handleJoin = () => executeJoin(groupId);

  return (
    <>
      {/* GŁÓWNY EKRAN */}
      <div className="w-full h-full flex flex-col p-4 pt-[max(16px,env(safe-area-inset-top))] relative z-10">
        <div className="flex-1 flex items-center justify-center">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-highlight/20 blur-2xl" />
            <div className="relative flex size-40 items-center justify-center rounded-3xl border border-highlight/20 bg-highlight/10">
              <ShoppingBag className="size-16 text-highlight" strokeWidth={1.5} />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6 pb-[max(8px,env(safe-area-inset-bottom))]">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold tracking-tight">Dołącz do grupy</h2>
            <p className="text-sm text-neutral-400">Wpisz ID, aby zarządzać wspólnymi zakupami.</p>
          </div>

          {recentGroups.length > 0 && (
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-2 text-xs text-primary font-medium uppercase tracking-wider">
                <Clock size={14} />
                <span>Ostatnio używane</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {recentGroups.map((recentId) => (
                  <button
                    key={recentId}
                    onClick={() => executeJoin(recentId)}
                    className="px-4 py-2 bg-bacground-tone/50 hover:bg-bacground-tone/25 active:scale-95 text-primary rounded-full text-sm font-medium transition-all border border-bacground-tone"
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
                className="h-12 text-lg uppercase pr-24"
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleJoin();
                }}
              />
              <button
                type="button"
                onClick={handleAddSuffix}
                className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-bacground-tone/80 text-primary hover:text-primary/75 hover:bg-background/50 active:scale-95 rounded-md transition-all border border-foreground/15"
              >
                <Dices size={14} />
                Losuj
              </button>
            </div>

            <div className="flex justify-center mt-1">
              <button
                type="button"
                onClick={() => setShowHelp(true)}
                className="text-[11px] text-primary/75 hover:text-primary/50 active:opacity-60 transition-colors flex items-center gap-1.5 cursor-pointer py-1"
              >
                <Info size={12} />
                <span>Wymyśl trudną nazwę i udostępnij ją domownikom.</span>
              </button>
            </div>
          </div>

          <Button
            size="lg"
            className="w-full h-12"
            disabled={groupId.trim().length === 0}
            onClick={handleJoin}
          >
            Połącz z grupą
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
        className={`fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-background/75 rounded-t-3xl p-6 pb-[max(32px,env(safe-area-inset-bottom))] transition-transform duration-300 ease-out shadow-[0_-10px_40px_rgba(0,0,0,0.5)] ${
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
              nazwa (np. "DOM") sprawi, że wejdziesz na listy zakupów kogoś innego. Kliknij przycisk
              "Losuj", aby wygenerować bezpieczną końcówkę.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-medium text-primary/85 mb-1">Współdzielenie list</h4>
            <p className="text-sm text-primary/60 leading-relaxed">
              Aby robić zakupy wspólnie z drugą osobą, musisz podyktować jej dokładnie to samo ID.
              Kiedy wpisze je na swoim telefonie, połączycie się w czasie rzeczywistym.
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
