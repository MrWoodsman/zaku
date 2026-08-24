import { Outlet } from "react-router-dom";
import { BottomNav } from "@/components/layout/BottomNav";
import { VoiceCommandOverlay } from "@/components/overlay/voice/VoiceCommandOverlay";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

export function AppLayout() {
  return (
    <div className="flex flex-col h-dvh">
      {/* Tu ładuje się Twoja strona (Lista, Ustawienia itp.) */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>

      {/* Globalny dostęp do asystenta AI (beta) - widoczny na każdym ekranie */}
      <VoiceCommandOverlay>
        <Button
          size="icon-lg"
          className="fixed right-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 size-12 rounded-full shadow-lg"
        >
          <Sparkles className="size-5" />
        </Button>
      </VoiceCommandOverlay>

      {/* Navbar na samym dole, zawsze widoczny */}
      <BottomNav />
    </div>
  );
}
