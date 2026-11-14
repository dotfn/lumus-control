import { useLanguageStore, getLang, type Language } from './store';
import { translations, type TranslationDict } from './translations';

export { useLanguageStore, getLang, translations };
export type { Language, TranslationDict };

export function useTranslation() {
  const lang = useLanguageStore((s) => s.lang);
  const setLang = useLanguageStore((s) => s.setLang);
  return {
    lang,
    setLang,
    t: translations[lang],
  };
}

export function getTranslations(lang: Language = getLang()): TranslationDict {
  return translations[lang];
}
