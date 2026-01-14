import { useEffect, useMemo, useState } from 'react';
import { getDictionaries, getStoredLocale, setStoredLocale } from '@/lib/i18n';
import { LOCALE_CHANGE_EVENT } from '@/lib/i18n';
import { defaultLocale, type Locale } from '../../i18n.config';

type Dictionary = Record<string, unknown>;

export function useTranslation(namespaces: string[] = ['common']) {
  const [locale, setLocale] = useState<Locale>(defaultLocale);
  const [dictionary, setDictionary] = useState<Dictionary>({});
  const [isLoading, setIsLoading] = useState(true);

  const namespacesKey = useMemo(() => namespaces.slice().sort().join('|'), [namespaces]);

  // Initialize locale from storage
  useEffect(() => {
    const storedLocale = getStoredLocale();
    setLocale(storedLocale);
    // Listen for locale change events from other parts of the app
    const handleLocaleChange = (event: Event) => {
      const custom = event as CustomEvent<{ locale: Locale }>;
      if (custom.detail?.locale) {
        setLocale(custom.detail.locale);
      }
    };
    window.addEventListener(LOCALE_CHANGE_EVENT, handleLocaleChange as EventListener);
    return () => {
      window.removeEventListener(LOCALE_CHANGE_EVENT, handleLocaleChange as EventListener);
    };
  }, []);

  // Load dictionary when locale or namespaces change
  useEffect(() => {
    const loadDictionary = async () => {
      setIsLoading(true);
      try {
        // getDictionaries now uses internal cache, so this will be instant for cached data
        const dict = await getDictionaries(namespaces, locale);
        setDictionary(dict);
      } catch (error) {
        console.error('Failed to load dictionary:', error);
        setDictionary({});
      } finally {
        setIsLoading(false);
      }
    };

    loadDictionary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale, namespacesKey]);

  const changeLocale = (newLocale: Locale) => {
    setLocale(newLocale);
    setStoredLocale(newLocale);
    // Broadcast change to all subscribers in the same tab
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(LOCALE_CHANGE_EVENT, { detail: { locale: newLocale } }));
    }
  };

  const t = (key: string, fallback?: string, params?: Record<string, string | number>): string => {
    const keys = key.split('.');
    let value: unknown = dictionary;

    for (const k of keys) {
      if (value && typeof value === 'object' && value !== null && k in value) {
        value = (value as Record<string, unknown>)[k];
      } else {
        return fallback || key;
      }
    }

    let result = typeof value === 'string' ? value : fallback || key;

    // Handle interpolation if params are provided
    if (params && typeof result === 'string') {
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        const placeholder = `{{${paramKey}}}`;
        result = result.replace(new RegExp(placeholder, 'g'), String(paramValue));
      });
    }

    return result;
  };

  return {
    t,
    locale,
    changeLocale,
    isLoading,
    dictionary,
  };
}
