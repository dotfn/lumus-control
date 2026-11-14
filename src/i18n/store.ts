import { create } from 'zustand';

export type Language = 'es' | 'en';

const STORAGE_KEY = 'lumus:lang';

function detectInitialLanguage(): Language {
  if (typeof window === 'undefined') return 'es';
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === 'es' || saved === 'en') return saved;
  } catch {
    // Ignore storage errors in restricted contexts.
  }
  const browser = typeof navigator !== 'undefined' ? navigator.language.toLowerCase() : 'es';
  return browser.startsWith('en') ? 'en' : 'es';
}

function applyHtmlLang(lang: Language) {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lang;
  }
}

interface LanguageState {
  lang: Language;
  setLang: (lang: Language) => void;
}

const initialLang = detectInitialLanguage();
applyHtmlLang(initialLang);

export const useLanguageStore = create<LanguageState>((set) => ({
  lang: initialLang,
  setLang: (lang) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // Ignore storage errors.
    }
    applyHtmlLang(lang);
    set({ lang });
  },
}));

export function getLang(): Language {
  return useLanguageStore.getState().lang;
}
