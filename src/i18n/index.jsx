import { useEffect, useMemo, useState } from "react";
import en from "./en";
import hi from "./hi";
import I18nContext from "./context";

const LANGUAGE_STORAGE_KEY = "sahayu-language";
const translations = { en, hi };

function getInitialLanguage() {
  try {
    const savedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return savedLanguage in translations ? savedLanguage : "en";
  } catch {
    return "en";
  }
}

function getTranslation(dictionary, key) {
  return key.split(".").reduce((value, part) => value?.[part], dictionary);
}

export function I18nProvider({ children }) {
  const [language, setLanguage] = useState(getInitialLanguage);

  useEffect(() => {
    document.documentElement.lang = language === "hi" ? "hi" : "en";
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    } catch {
      // The app remains usable when storage is unavailable.
    }
  }, [language]);

  const value = useMemo(() => ({
    language,
    setLanguage: (nextLanguage) => setLanguage(nextLanguage in translations ? nextLanguage : "en"),
    t: (key, replacements = {}) => {
      const text = getTranslation(translations[language], key) ?? getTranslation(en, key) ?? key;
      return Object.entries(replacements).reduce(
        (result, [name, replacement]) => result.replaceAll(`{${name}}`, replacement),
        text,
      );
    },
  }), [language]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
