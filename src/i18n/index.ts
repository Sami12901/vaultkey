import { useState, useEffect } from 'react';
import { en, translations, SUPPORTED_LANGUAGES, LanguageItem } from './translations';
import { Language } from '../types';

export type { Language, LanguageItem };
export type TranslationKey = keyof typeof en;
export { en, translations, SUPPORTED_LANGUAGES };

let currentLang: Language = 'en';
const listeners = new Set<(lang: Language) => void>();

export function setLanguage(lang: Language) {
  currentLang = lang;
  listeners.forEach(cb => cb(lang));
}

export function getLanguage(): Language {
  return currentLang;
}

export function t(key: TranslationKey): string {
  const dict = translations[currentLang] || translations.en;
  return dict[key] || translations.en[key] || (key as string);
}

export function useTranslation() {
  const [lang, setLangState] = useState<Language>(currentLang);

  useEffect(() => {
    const handler = (newLang: Language) => setLangState(newLang);
    listeners.add(handler);
    return () => {
      listeners.delete(handler);
    };
  }, []);

  return {
    t,
    language: lang,
    setLanguage,
  };
}