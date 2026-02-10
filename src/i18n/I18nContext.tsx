import React, { createContext, useContext, useMemo, useState } from 'react';
import { translations, type LanguageCode, type TranslationKey } from './translations';

type I18nContextValue = {
  lang: LanguageCode;
  t: (key: TranslationKey) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

const getInitialLang = (): LanguageCode => {
  return 'en';
};

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang] = useState<LanguageCode>(getInitialLang());

  const value = useMemo<I18nContextValue>(() => ({
    lang,
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
