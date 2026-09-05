import { Wand2 } from "lucide-react";

export function AutoListScreen() {
  return (
    <div className="h-full flex flex-col items-center justify-center p-6 text-center pt-[max(16px,env(safe-area-inset-top))] bg-background">
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-highlight/20 blur-xl rounded-full" />
        <div className="relative p-5 bg-highlight/10 rounded-full border border-highlight/20">
          <Wand2 className="size-12 text-highlight" />
        </div>
      </div>

      <h1 className="text-2xl font-bold text-foreground mb-3">Inteligentna Lista</h1>

      <p className="text-sm text-muted-foreground max-w-70 leading-relaxed">
        Twój asystent zakupowy uczy się nawyków. Zbieramy statystyki, aby w przyszłości móc z
        wyprzedzeniem przewidzieć, czego Ci brakuje w lodówce.
      </p>

      <div className="mt-8 px-4 py-1.5 bg-secondary/50 text-secondary-foreground text-xs font-semibold rounded-full uppercase tracking-widest border border-border">
        Wkrótce
      </div>
    </div>
  );
}
