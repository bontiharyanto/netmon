import { en } from "./en";
import { id } from "./id";

export const LOCALES = ["en", "id"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "netmon_locale";

type DeepString<T> = {
  [K in keyof T]: T[K] extends string ? string : DeepString<T[K]>;
};

export type Dictionary = DeepString<typeof en>;
export const dictionaries: Record<Locale, Dictionary> = { en, id };

export function parseLocale(value?: string | null): Locale {
  return value === "id" ? "id" : "en";
}

export function getDictionary(locale?: string | null): Dictionary {
  return dictionaries[parseLocale(locale)];
}

export function formatMinutes(template: string, n: number) {
  return template.replace("{n}", String(n));
}
