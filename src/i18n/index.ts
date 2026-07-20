import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from '@/i18n/locales/en.json';
import es from '@/i18n/locales/es.json';
import type { LanguagePreference } from '@/types/models';

export function systemLanguage(): 'es' | 'en' {
  const code = getLocales()[0]?.languageCode;
  return code === 'es' ? 'es' : 'en';
}

export function resolveLanguage(pref: LanguagePreference): 'es' | 'en' {
  return pref === 'system' ? systemLanguage() : pref;
}

i18n.use(initReactI18next).init({
  resources: {
    es: { translation: es },
    en: { translation: en },
  },
  lng: systemLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
