"use client";

/**
 * MedLens — i18n Context & Hook
 * ==============================
 * Provides language selection that persists across the entire app.
 * Language is stored in localStorage and passed via React Context.
 */

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { getTranslations, type UITranslations } from "./translations";

interface I18nContextType {
  language: string;
  setLanguage: (lang: string) => void;
  t: UITranslations;
}

const I18nContext = createContext<I18nContextType>({
  language: "en",
  setLanguage: () => {},
  t: getTranslations("en"),
});

const STORAGE_KEY = "medlens_language";

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState("en");

  // Load saved language on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setLanguageState(saved);
  }, []);

  const setLanguage = useCallback((lang: string) => {
    setLanguageState(lang);
    localStorage.setItem(STORAGE_KEY, lang);
    // Also set sessionStorage for scan page backward compat
    sessionStorage.setItem("medlens_language", lang);
  }, []);

  const t = getTranslations(language);

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  return useContext(I18nContext);
}
