"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  getDictionary,
  parseLocale,
  type Dictionary,
  type Locale,
} from "@/lib/i18n";

type LocaleContextValue = {
  locale: Locale;
  t: Dictionary;
  setLocale: (next: Locale) => void;
};

const LocaleContext = createContext<LocaleContextValue>({
  locale: DEFAULT_LOCALE,
  t: getDictionary(DEFAULT_LOCALE),
  setLocale: () => undefined,
});

function readCookie() {
  if (typeof document === "undefined") return DEFAULT_LOCALE;
  const match = document.cookie.split("; ").find((row) => row.startsWith(`${LOCALE_COOKIE}=`));
  return parseLocale(match?.slice(LOCALE_COOKIE.length + 1));
}

function writeCookie(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    setLocaleState(readCookie());
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      t: getDictionary(locale),
      setLocale: (next) => {
        setLocaleState(next);
        writeCookie(next);
      },
    }),
    [locale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useI18n() {
  return useContext(LocaleContext);
}
