import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import en from '../locales/en.json';
import tr from '../locales/tr.json';

const LANGUAGE_KEY = 'confutils_language';

const translations: { [key: string]: { [key: string]: string } } = {
  en: en,
  tr: tr,
};

interface LanguageContextType {
  language: string;
  setLanguage: (lang: string) => void;
  t: (key: string, variables?: { [key: string]: string | number }) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const savedLanguage = localStorage.getItem(LANGUAGE_KEY);
      return savedLanguage || 'en';
    }
    return 'en';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LANGUAGE_KEY, language);
    }
  }, [language]);

  const setLanguage = useCallback((lang: string) => {
    setLanguageState(lang);
  }, []);

  const t = useCallback((key: string, variables?: { [key: string]: string | number }): string => {
    let translation = translations[language][key] || key;
    if (variables) {
      Object.keys(variables).forEach(varKey => {
        const regex = new RegExp(`{{${varKey}}}`, 'g');
        translation = translation.replace(regex, String(variables[varKey]));
      });
    }
    return translation;
  }, [language]);

  const value = useMemo(() => ({
    language,
    setLanguage,
    t,
  }), [language, setLanguage, t]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
