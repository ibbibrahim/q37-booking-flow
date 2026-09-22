import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';
import { Languages } from 'lucide-react';
import { hrTranslations, type HrTranslationKey } from '../i18n/translations';

export type HrLanguage = 'en' | 'ar';

interface HrLanguageContextValue {
  language: HrLanguage;
  dir: 'ltr' | 'rtl';
  setLanguage: (lang: HrLanguage) => void;
  toggleLanguage: () => void;
  t: (key: HrTranslationKey) => string;
}

const STORAGE_KEY = 'hr-language';

const HrLanguageContext = createContext<HrLanguageContextValue | null>(null);

function readStoredLanguage(): HrLanguage {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'ar' ? 'ar' : 'en';
  } catch {
    return 'en';
  }
}

export function HrLanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<HrLanguage>(readStoredLanguage);

  const setLanguage = useCallback((lang: HrLanguage) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // ignore storage errors (private browsing, etc.)
    }
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguage(language === 'en' ? 'ar' : 'en');
  }, [language, setLanguage]);

  const t = useCallback((key: HrTranslationKey) => hrTranslations[language][key], [language]);

  const value = useMemo<HrLanguageContextValue>(
    () => ({ language, dir: language === 'ar' ? 'rtl' : 'ltr', setLanguage, toggleLanguage, t }),
    [language, setLanguage, toggleLanguage, t]
  );

  return <HrLanguageContext.Provider value={value}>{children}</HrLanguageContext.Provider>;
}

export function useHrLanguage(): HrLanguageContextValue {
  const ctx = useContext(HrLanguageContext);
  if (!ctx) throw new Error('useHrLanguage must be used within an HrLanguageProvider');
  return ctx;
}

/** Bilingual name/text helper: picks the Arabic value when in Arabic mode, falling back to English if blank. */
export function bilingual(language: HrLanguage, en: string | null | undefined, ar: string | null | undefined): string {
  if (language === 'ar') return ar?.trim() || en?.trim() || '';
  return en?.trim() || ar?.trim() || '';
}

export function HrLanguageToggle() {
  const { language, toggleLanguage } = useHrLanguage();

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center gap-1.5 px-2.5 py-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-card-foreground text-sm font-medium"
      title={language === 'en' ? 'التبديل إلى العربية' : 'Switch to English'}
    >
      <Languages size={18} />
      <span className="hidden sm:inline">{language === 'en' ? 'EN' : 'ع'}</span>
    </button>
  );
}
