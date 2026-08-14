import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/core/ThemeProvider"; // Upewnij się, że ścieżka jest poprawna
import { Sun, Moon, Monitor } from "lucide-react";
import { VersionBadge } from "@/components/common/VersionBadge";

export function SettingsScreen({ groupId, onLeave }: { groupId: string; onLeave: () => void }) {
  // Pobieramy aktualny motyw i funkcję do jego zmiany z naszego Providera
  const { theme, setTheme } = useTheme();

  return (
    <div className="p-4 space-y-6 pt-[max(16px,env(safe-area-inset-top))]">
      <h1 className="text-2xl font-bold">Ustawienia</h1>

      {/* SEKCJA 1: GRUPA */}
      <div className="bg-foreground/5 border border-foreground/10 rounded-xl p-5 space-y-4">
        <div>
          <h2 className="text-sm font-medium text-primary">Twoja Grupa (ID)</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Podaj ten kod osobie, z którą chcesz współdzielić listy zakupów.
          </p>
        </div>

        <div className="flex items-center justify-between bg-background p-3 rounded-lg border border-border">
          <span className="text-xl font-mono font-bold tracking-widest text-primary">
            {groupId}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              navigator.clipboard.writeText(groupId);
              alert("Skopiowano kod do schowka!");
            }}
          >
            Kopiuj
          </Button>
        </div>
        <Button
          variant="destructive"
          className="w-full h-12 text-lg border-destructive/25"
          onClick={onLeave}
        >
          Opuść grupę
        </Button>
      </div>

      {/* SEKCJA 2: WYGLĄD (NOWA) */}
      <div className="bg-foreground/5 border border-foreground/10 rounded-xl p-5 space-y-4">
        <div>
          <h2 className="text-sm font-medium text-primary">Wygląd aplikacji</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Wybierz preferowany motyw interfejsu.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-4">
          <Button
            variant={theme === "light" ? "default" : "outline"}
            className="flex flex-col h-auto py-3 gap-2"
            onClick={() => setTheme("light")}
          >
            <Sun className="size-5" />
            <span className="text-xs">Jasny</span>
          </Button>

          <Button
            variant={theme === "dark" ? "default" : "outline"}
            className="flex flex-col h-auto py-3 gap-2"
            onClick={() => setTheme("dark")}
          >
            <Moon className="size-5" />
            <span className="text-xs">Ciemny</span>
          </Button>

          <Button
            variant={theme === "system" ? "default" : "outline"}
            className="flex flex-col h-auto py-3 gap-2"
            onClick={() => setTheme("system")}
          >
            <Monitor className="size-5" />
            <span className="text-xs">System</span>
          </Button>
        </div>
      </div>

      {/* SEKCJA OSTATNIA */}
      <div className="flex flex-col items-center gap-2">
        <VersionBadge />
        <p className="text-xs text-muted-foreground">Zaku — stworzone przez MrWoodsman</p>
      </div>
    </div>
  );
}
