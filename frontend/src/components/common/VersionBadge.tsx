import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { ArrowUpRightIcon, CheckCircle2, HistoryIcon } from "lucide-react";
import { CHANGELOG } from "@/config/changelog";

export function VersionBadge() {
  const [isOpen, setIsOpen] = useState(false);
  // HISTORIA ZMIAN jest w config/changelog.ts (najnowsza wersja ZAWSZE jako pierwsza)
  const changelog = CHANGELOG;

  // 2. AUTOMATYZACJA: Pobieramy dane najnowszej wersji z samego góry tablicy
  const [latestRelease, ...olderReleases] = changelog;

  return (
    <Drawer open={isOpen} onOpenChange={setIsOpen}>
      <DrawerTrigger asChild>
        {/* Badge automatycznie wyświetli np. "v0.2.0" na podstawie pierwszego wpisu */}
        <Badge
          variant="secondary"
          className="gap-1.5 cursor-pointer hover:bg-secondary/80 transition-colors active:scale-95 font-mono"
        >
          v{latestRelease.version} <ArrowUpRightIcon className="size-3 opacity-60" />
        </Badge>
      </DrawerTrigger>

      <DrawerContent
        className="bg-background border-border px-4 pb-[max(24px,var(--safe-bottom))]"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        {/* Same header as WhatsNewOverlay, so both read as one feature */}
        <DrawerHeader className="items-center px-0 pb-4 text-center">
          <div className="relative mb-2">
            <div className="absolute inset-0 rounded-full bg-highlight/20 blur-xl" />
            <div className="relative flex size-14 items-center justify-center rounded-2xl border border-highlight/20 bg-highlight/10 text-highlight">
              <HistoryIcon className="size-7" />
            </div>
          </div>
          <DrawerTitle className="text-xl">Historia zmian</DrawerTitle>
          <DrawerDescription>Wszystko, co zmieniło się w aplikacji</DrawerDescription>
        </DrawerHeader>

        <div className="flex flex-col gap-6 max-h-[55vh] overflow-y-auto pr-1" data-vaul-no-drag>
          {/* Najnowsza wersja - wyróżniona karta, żeby od razu było widać co nowego */}
          <div className="flex flex-col gap-2.5 rounded-xl border border-highlight/20 bg-highlight/5 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-base text-foreground font-mono">
                  v{latestRelease.version}
                </span>
                <span className="text-[10px] bg-highlight/15 text-highlight px-2 py-0.5 rounded-full font-semibold">
                  Najnowsza
                </span>
              </div>
              <span className="text-xs text-muted-foreground font-mono">{latestRelease.date}</span>
            </div>

            <ul className="flex flex-col gap-2">
              {latestRelease.changes.map((change, index) => (
                <li
                  key={index}
                  className="flex items-start text-sm text-foreground/85 leading-relaxed"
                >
                  <CheckCircle2 className="mr-2 size-4 text-highlight shrink-0 mt-0.5" />
                  <span>{change}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Starsze wersje - stonowane, żeby uwaga zostawała na najnowszej */}
          <div className="flex flex-col gap-5">
            {olderReleases.map((release) => (
              <div
                key={release.version}
                className="flex flex-col gap-2.5 border-b border-border/50 pb-4 last:border-0 last:pb-0"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-base text-foreground/80 font-mono">
                    v{release.version}
                  </span>
                  <span className="text-xs text-muted-foreground font-mono">{release.date}</span>
                </div>

                <ul className="flex flex-col gap-2">
                  {release.changes.map((change, index) => (
                    <li
                      key={index}
                      className="flex items-start text-sm text-foreground/70 leading-relaxed"
                    >
                      <CheckCircle2 className="mr-2 size-4 text-muted-foreground shrink-0 mt-0.5" />
                      <span>{change}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <DrawerClose asChild>
          <Button variant="raised" className="mt-5 h-11 w-full">
            Zamknij
          </Button>
        </DrawerClose>
      </DrawerContent>
    </Drawer>
  );
}
