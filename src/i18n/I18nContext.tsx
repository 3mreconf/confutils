import React, { createContext, useContext, useMemo, useState } from 'react';
import { translations, type LanguageCode, type TranslationKey } from './translations';

type I18nContextValue = {
  lang: LanguageCode;
  setLang: (lang: LanguageCode) => void;
  t: (key: TranslationKey) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

const getInitialLang = (): LanguageCode => {
  const saved = localStorage.getItem('confutils_lang');
  if (saved === 'en' || saved === 'tr') {
    return saved;
  }
  return 'tr';
};

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<LanguageCode>(getInitialLang());

  const setLang = (next: LanguageCode) => {
    setLangState(next);
    localStorage.setItem('confutils_lang', next);
  };

  const value = useMemo<I18nContextValue>(() => ({
    lang,
    setLang,
    t: (key: TranslationKey) => translations[lang][key] ?? translations.en[key] ?? key
  }), [lang]);

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
