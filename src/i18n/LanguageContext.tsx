'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { en } from './dictionaries/en';
import { vi, Dictionary } from './dictionaries/vi';

type Locale = 'en' | 'vi';

interface LanguageContextType {
  locale: Locale;
  t: (key: keyof Dictionary) => string;
  setLocale: (locale: Locale) => void;
}

const dictionaries: Record<Locale, Dictionary> = { en, vi };

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en'); // Defaults to English
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Load from local storage on mount
    const saved = localStorage.getItem('tina_language') as Locale;
    if (saved && (saved === 'en' || saved === 'vi')) {
      setLocaleState(saved);
    }
    setMounted(true);
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem('tina_language', newLocale);
  };

  const t = (key: keyof Dictionary): string => {
    // Fallback to key if not found in current dictionary (should never happen due to TS but safe)
    return dictionaries[locale][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ locale, t, setLocale }}>
      <div style={!mounted ? { visibility: 'hidden' } : { display: 'contents' }}>
        {children}
      </div>
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
