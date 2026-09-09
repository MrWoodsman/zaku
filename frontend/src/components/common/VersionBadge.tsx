import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { ArrowUpRightIcon, CheckCircle2 } from "lucide-react";

interface Release {
  version: string;
  date: string;
  changes: string[];
}

export function VersionBadge() {
  const [isOpen, setIsOpen] = useState(false);
  // 1. HISTORIA ZMIAN (Najnowsza wersja ZAWSZE musi być jako PIERWSZA w tablicy!)
  const changelog: Release[] = [
    {
      version: "0.58.0-beta.1",
      date: "09.09.2026",
      changes: [
        "Wersja testowa (beta) - jeśli coś nie działa jak trzeba, daj znać",
        "Dodano powiadomienia push - dostaniesz powiadomienie, gdy ktoś inny doda produkty do wspólnej listy (włącz/wyłącz w Ustawieniach)",
        "Naprawiono odstępy w przeglądarce mobilnej (Safari/Chrome) - treść nie chowała się już pod górnym paskiem ani nie było pustego miejsca nad dolnym menu",
      ],
    },
    {
      version: "0.57.1",
      date: "05.09.2026",
      changes: ["Naprawiono błąd builda blokujący aktualizację aplikacji na serwerze"],
    },
    {
      version: "0.57.0",
      date: "05.09.2026",
      changes: [
        "Odświeżenie wyglądu całej aplikacji - nowy kolor akcentu (pomarańczowy) na przyciskach, plakietkach i zaznaczonych produktach",
        "Przebudowa list zakupowych - pasek postępu i wyraźne oznaczenie ukończonej listy zamiast samych liczb",
        "Przebudowa ekranu historii zakupów - czytelniejsze karty produktów zamiast gołego tekstu",
        "Przebudowa ekranu ustawień na prostszą listę oraz dodanie wyboru języka interfejsu (na razie samo przełączanie, bez tłumaczenia treści)",
        "Nowe ilustracje na ekranie powitalnym i w samouczku (wcześniej były tam puste placeholdery)",
        "Poprawki drobnych błędów wizualnych (nierówne obrysy i odstępy na kartach, cień dający wrażenie krzywych rogów)",
        "Naprawiono lukę bezpieczeństwa pozwalającą zresetować lub skasować cudzą listę bez dostępu do grupy",
      ],
    },
    {
      version: "0.56.1",
      date: "31.08.2026",
      changes: ["Naprawiono spowolnienie przy odznaczaniu produktów na dużych listach zakupów"],
    },
    {
      version: "0.56.0",
      date: "31.08.2026",
      changes: [
        "Dodanie histori zakupionych prduktów, z grupowaniem na dni dzięki czemu łatwo można sprawdzić co ostatnio było zakupione",
      ],
    },
    {
      version: "0.55.0",
      date: "08.08.2026",
      changes: [
        "Dodanie ekranów ładowania oraz ekranów jeśli żadana rzecz nie zostanie znaleziona",
      ],
    },
    {
      version: "0.54.0",
      date: "08.08.2026",
      changes: [
        "Dodanie przekierownia na ekran list po dodaniu składników z przepisu do listy",
        "Dodanie komunikatuów (toast) sukcesu oraz informacyjnego",
        "Poprawienie komunikatu (toast) error",
        "Dodanie komunikatów (toast) to większej ilośći cznośći, dla lepszej przejrzystośći co sie stało",
      ],
    },
    {
      version: "0.53.1",
      date: "05.08.2026",
      changes: ["Naprawienie problemu ze startowaniem serwera"],
    },
    {
      version: "0.53.0",
      date: "03.08.2026",
      changes: [
        "Dodanie ekranu wyświetlającego wszystkie twoje przepisy dla łatwiejszego zarządzania",
        "Poprawienie wychodzenia z edycji przepisów, teraz wraca do ostatniej karty",
      ],
    },
    {
      version: "0.52.1",
      date: "02.08.2026",
      changes: ["Naprawienie błędu podczas scrolowani listy przepisów"],
    },
    {
      version: "0.52.0",
      date: "31.07.2026",
      changes: ["Opcja importowania składników z przepisu prosto do listy"],
    },
    {
      version: "0.51.1",
      date: "30.07.2026",
      changes: ["Naprawienie błędu podczas próby zapisania przepisu ze zdjęciem"],
    },
    {
      version: "0.51.0",
      date: "30.07.2026",
      changes: [
        "Dodanie informacji o tym że przepis jest twój",
        "Ulepszenie UI overlaya dla lepszej czytelności, wraz z wyświetlaniem ilości przepisów do dokończenia",
        "Naprawiono otwieranie się pustego formularza podczas edycji przepisu",
      ],
    },
    {
      version: "0.5.0",
      date: "29.07.2026",
      changes: [
        "Dodanie modułu przepisów, z możliwościa tworzenia przepisów",
        "Poprawienie UI na elementach do wybierania",
      ],
    },
    {
      version: "0.4.1",
      date: "15.07.2026",
      changes: [
        "Naprawiono wyświetlanie fałszywych komunikatów o braku połączenia; aplikacja pokazuje teraz precyzyjne informacje o błędach.",
      ],
    },
    {
      version: "0.4.0",
      date: "14.07.2026",
      changes: [
        "Dodano menu grupowych zmian (zaznacz/odznacz wszystko, usuwanie).",
        "Wdrożono błyskawiczne optymistyczne UI dla akcji masowych.",
        "Wprowadzono moduł motywów wizualnych i dostosowano kolory komponentów.",
        "Zabezpieczono formularze przed błędami spacji z autokorekty na telefonach.",
        "Zaktualizowano ikony w aplikacji na bardziej spójne.",
        "Dodano widok wersji i historii zmian (Changelog) w ustawieniach.",
      ],
    },
    {
      version: "0.3.0",
      date: "08.07.2026",
      changes: [
        "Całkowita migracja bazy danych na SQLite – większa szybkość i niezawodność.",
        "Wprowadzono system Grup Współdzielonych (dołączanie, opuszczanie, pamięć ostatnich grup).",
        "Rozbudowano produkty o podawanie ilości oraz jednostek miary.",
        "Zmieniono interfejs przycisków na wygodne, wysuwane z dołu menu (Drawers).",
        "Poprawiono płynność animacji rozwijania list i przechodzenia między ekranami.",
      ],
    },
    {
      version: "0.2.0",
      date: "01.07.2026",
      changes: [
        "Dodano system powiadomień na ekranie (Toasty) o sukcesie lub błędzie operacji.",
        "Wdrożono odświeżanie list i produktów w tle na żywo (Live Update).",
        "Naprawiono irytujący błąd z chowającą się klawiaturą podczas wpisywania.",
        "Dodano błyskawiczną reakcję interfejsu przy odhaczaniu produktów (Optimistic Update).",
        "Poprawiono podświetlanie elementów i automatyczne łapanie ostrości (focus) przez formularze.",
      ],
    },
    {
      version: "0.1.0",
      date: "25.06.2026",
      changes: [
        "Pierwsza działająca wersja PWA naszej aplikacji zakupowej.",
        "Podstawowy system zarządzania listami: przeglądanie, tworzenie, edycja i wyszukiwanie.",
        "Połączenie interfejsu (TanStack Query) z autorskim API backendowym.",
        "Uporządkowanie architektury projektu i komponentów interfejsu użytkownika.",
      ],
    },
  ];

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
        <DrawerHeader className="px-0 text-left pb-4">
          <DrawerTitle className="text-xl tracking-tight">Historia zmian</DrawerTitle>
        </DrawerHeader>

        <div className="flex flex-col gap-6 max-h-[65vh] overflow-y-auto pr-1">
          {/* Najnowsza wersja - wyróżniona karta, żeby od razu było widać co nowego */}
          <div className="flex flex-col gap-2.5 rounded-xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-base text-foreground font-mono">
                  v{latestRelease.version}
                </span>
                <span className="text-[10px] bg-primary/15 text-primary px-2 py-0.5 rounded-full font-semibold">
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
                  <CheckCircle2 className="mr-2 size-4 text-primary shrink-0 mt-0.5" />
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
      </DrawerContent>
    </Drawer>
  );
}
