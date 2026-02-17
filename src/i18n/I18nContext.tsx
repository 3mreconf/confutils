import React, { createContext, useContext, useMemo, useState, useCallback, useEffect } from 'react';
import { translations, type LanguageCode, type TranslationKey } from './translations';

const LANGUAGE_KEY = 'confutils_language';

type I18nContextValue = {
  lang: LanguageCode;
  setLang: (lang: LanguageCode) => void;
  t: (key: TranslationKey) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

const getInitialLang = (): LanguageCode => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(LANGUAGE_KEY);
    if (saved && saved in translations) return saved as LanguageCode;
  }
  return 'en';
};

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<LanguageCode>(getInitialLang());

  useEffect(() => {
    localStorage.setItem(LANGUAGE_KEY, lang);
  }, [lang]);

  const setLang = useCallback((l: LanguageCode) => {
    setLangState(l);
  }, []);

  const value = useMemo<I18nContextValue>(() => ({
    lang,
    setLang,
    t: (key: TranslationKey) => {
      const langTranslations = translations[lang] as Record<string, string>;
      return langTranslations[key] ?? translations.en[key] ?? key;
    }
  }), [lang, setLang]);

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return ctx;
}
