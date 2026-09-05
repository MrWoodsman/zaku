import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage, type Language } from "@/components/core/LanguageProvider";
import { SettingsSection } from "./SettingsSection";
import { SettingsRow } from "./SettingsRow";

// flag-icons kody (ISO 3166-1 alpha-2) - dowolnie rozszerzalne w przyszłości
// bez konieczności ręcznego rysowania kolejnych flag.
const LANGUAGES: { code: Language; flag: string; label: string }[] = [
  { code: "pl", flag: "pl", label: "Polski" },
  { code: "en", flag: "gb", label: "English" },
];

export function LanguageSection() {
  const { language, setLanguage } = useLanguage();
  const current = LANGUAGES.find((l) => l.code === language) ?? LANGUAGES[0];

  return (
    <SettingsSection title="Język" description="Wybierz język interfejsu aplikacji.">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SettingsRow
            label="Język interfejsu"
            onClick={() => {}}
            trailing={
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className={`fi fi-${current.flag} rounded-xs`} />
                {current.label}
                <ChevronDown className="size-4" />
              </span>
            }
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuRadioGroup
            value={language}
            onValueChange={(value) => setLanguage(value as Language)}
          >
            {LANGUAGES.map(({ code, flag, label }) => (
              <DropdownMenuRadioItem key={code} value={code}>
                <span className={`fi fi-${flag} rounded-xs`} />
                {label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </SettingsSection>
  );
}
