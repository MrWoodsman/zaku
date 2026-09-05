import { Copy, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SettingsSection } from "./SettingsSection";
import { SettingsRow } from "./SettingsRow";

export function GroupSection({ groupId, onLeave }: { groupId: string; onLeave: () => void }) {
  return (
    <SettingsSection
      title="Grupa"
      description="Podaj ten kod osobie, z którą chcesz współdzielić listy zakupów."
    >
      <SettingsRow
        label="ID Grupy"
        trailing={
          <div className="flex items-center gap-1">
            <span className="font-mono text-sm font-semibold tracking-wider">{groupId}</span>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => {
                navigator.clipboard.writeText(groupId);
                alert("Skopiowano kod do schowka!");
              }}
            >
              <Copy className="size-4" />
            </Button>
          </div>
        }
      />
      <SettingsRow
        label="Opuść grupę"
        destructive
        onClick={onLeave}
        trailing={<LogOut className="size-4 text-destructive" />}
      />
    </SettingsSection>
  );
}
