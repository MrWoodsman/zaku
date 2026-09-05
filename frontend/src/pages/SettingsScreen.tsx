import { VersionBadge } from "@/components/common/VersionBadge";
import { GroupSection } from "@/components/settings/GroupSection";
import { AppearanceSection } from "@/components/settings/AppearanceSection";
import { LanguageSection } from "@/components/settings/LanguageSection";

export function SettingsScreen({ groupId, onLeave }: { groupId: string; onLeave: () => void }) {
  return (
    <div className="p-4 space-y-6 pt-[max(16px,env(safe-area-inset-top))]">
      <h1 className="text-2xl font-bold tracking-tight">Ustawienia</h1>

      <GroupSection groupId={groupId} onLeave={onLeave} />
      <AppearanceSection />
      <LanguageSection />

      <div className="flex flex-col items-center gap-2">
        <VersionBadge />
        <p className="text-xs text-muted-foreground">Zaku — stworzone przez MrWoodsman</p>
      </div>
    </div>
  );
}
