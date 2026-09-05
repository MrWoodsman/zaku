import { Sun, Moon, Monitor, Check } from "lucide-react";
import { useTheme } from "@/components/core/ThemeProvider";
import { SettingsSection } from "./SettingsSection";
import { SettingsRow } from "./SettingsRow";

const THEMES = [
  { value: "light", label: "Jasny", icon: Sun },
  { value: "dark", label: "Ciemny", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

export function AppearanceSection() {
  const { theme, setTheme } = useTheme();

  return (
    <SettingsSection title="Wygląd" description="Wybierz preferowany motyw interfejsu.">
      {THEMES.map(({ value, label, icon: Icon }) => (
        <SettingsRow
          key={value}
          icon={<Icon className="size-4" />}
          label={label}
          onClick={() => setTheme(value)}
          trailing={theme === value ? <Check className="size-4 text-highlight" /> : undefined}
        />
      ))}
    </SettingsSection>
  );
}
