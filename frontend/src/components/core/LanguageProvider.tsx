import { createContext, useContext, useState } from "react";

// UI-only for now: stores the user's choice, nothing in the app is actually
// translated yet. Real i18n wiring (react-i18next or similar) comes later.
export type Language = "pl" | "en";

type LanguageProviderProps = {
  children: React.ReactNode;
  defaultLanguage?: Language;
  storageKey?: string;
};

type LanguageProviderState = {
  language: Language;
  setLanguage: (language: Language) => void;
};

const initialState: LanguageProviderState = {
  language: "pl",
  setLanguage: () => null,
};

const LanguageProviderContext = createContext<LanguageProviderState>(initialState);

export function LanguageProvider({
  children,
  defaultLanguage = "pl",
  storageKey = "shopping-list-language",
  ...props
}: LanguageProviderProps) {
  const [language, setLanguageState] = useState<Language>(
    () => (localStorage.getItem(storageKey) as Language) || defaultLanguage,
  );

  const value = {
    language,
    setLanguage: (language: Language) => {
      localStorage.setItem(storageKey, language);
      setLanguageState(language);
    },
  };

  return (
    <LanguageProviderContext.Provider {...props} value={value}>
      {children}
    </LanguageProviderContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useLanguage = () => {
  const context = useContext(LanguageProviderContext);
  if (context === undefined) throw new Error("useLanguage must be used within a LanguageProvider");
  return context;
};
