import { useState } from "react";
import { ChevronRightIcon, SparklesIcon } from "lucide-react";
import { SettingsSection } from "./SettingsSection";
import { SettingsRow } from "./SettingsRow";
import { WhatsNewOverlay } from "@/components/overlay/WhatsNewOverlay";
import { CHANGELOG, LATEST_VERSION } from "@/config/changelog";

// "What's new" on demand - the same drawer that pops up after an update
export function AppSection() {
  const [isWhatsNewOpen, setIsWhatsNewOpen] = useState(false);

  return (
    <SettingsSection title="Aplikacja">
      <SettingsRow
        icon={<SparklesIcon className="size-4 text-highlight" />}
        label={`Co nowego w v${LATEST_VERSION}`}
        trailing={<ChevronRightIcon className="size-4 text-muted-foreground" />}
        onClick={() => setIsWhatsNewOpen(true)}
      />
      <WhatsNewOverlay
        releases={isWhatsNewOpen ? CHANGELOG.slice(0, 1) : []}
        onClose={() => setIsWhatsNewOpen(false)}
        openedManually
      />
    </SettingsSection>
  );
}
