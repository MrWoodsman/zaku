import { CheckCircle2, SparklesIcon } from "lucide-react";
import type { Release } from "@/config/changelog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";

interface WhatsNewOverlayProps {
  // Releases to show, newest first (empty = closed)
  releases: Release[];
  onClose: () => void;
  // false (popped up after an update): closes only with the button, so the news isn't
  // skipped by accident. true (opened from Settings): swipe / tap outside work too,
  // and the "updated to" / "history is in Settings" wording is dropped.
  openedManually?: boolean;
}

// Shown once after the app updates to a new version (see useWhatsNew),
// and on demand from Settings
export function WhatsNewOverlay({ releases, onClose, openedManually = false }: WhatsNewOverlayProps) {
  const [latest] = releases;

  return (
    <Drawer
      open={releases.length > 0}
      dismissible={openedManually}
      onOpenChange={(open) => !open && onClose()}
    >
      <DrawerContent
        className="bg-background border-border px-4 pb-[max(24px,var(--safe-bottom))]"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        {latest && (
          <>
            <DrawerHeader className="items-center px-0 pb-4 text-center">
              {/* Same glowing icon tile as onboarding / notification prompt */}
              <div className="relative mb-2">
                <div className="absolute inset-0 rounded-full bg-highlight/20 blur-xl" />
                <div className="relative flex size-14 items-center justify-center rounded-2xl border border-highlight/20 bg-highlight/10 text-highlight">
                  <SparklesIcon className="size-7" />
                </div>
              </div>
              <DrawerTitle className="text-xl">Co nowego?</DrawerTitle>
              <DrawerDescription>
                {openedManually ? "Nowości w wersji " : "Aplikacja została zaktualizowana do "}
                <span className="font-mono font-medium text-foreground">v{latest.version}</span>
                {openedManually && ` · ${latest.date}`}
              </DrawerDescription>
            </DrawerHeader>

            <div className="flex max-h-[50vh] flex-col gap-5 overflow-y-auto pr-1" data-vaul-no-drag>
              {releases.map((release, releaseIndex) => (
                <div key={release.version} className="flex flex-col gap-2.5">
                  {/* Version headers only when more than one release is missed */}
                  {releases.length > 1 && (
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm font-bold">v{release.version}</span>
                      <span className="font-mono text-xs text-muted-foreground">{release.date}</span>
                    </div>
                  )}
                  <ul className="flex flex-col gap-2">
                    {release.changes.map((change, index) => (
                      <li key={index} className="flex items-start text-sm leading-relaxed text-foreground/85">
                        <CheckCircle2
                          className={
                            releaseIndex === 0
                              ? "mt-0.5 mr-2 size-4 shrink-0 text-highlight"
                              : "mt-0.5 mr-2 size-4 shrink-0 text-muted-foreground"
                          }
                        />
                        <span>{change}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <Button variant="raised" className="mt-5 h-11 w-full" onClick={onClose}>
              {openedManually ? "Zamknij" : "Super, sprawdzam!"}
            </Button>
            {!openedManually && (
              <p className="mt-3 text-center text-xs text-muted-foreground">
                Pełna historia zmian jest w Ustawieniach.
              </p>
            )}
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
}
