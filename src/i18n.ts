// Can be imported from a shared config
export const locales = ['en', 'de'] as const;
export type Locale = (typeof locales)[number];

export const localeNames: Record<Locale, string> = {
  en: 'English',
  de: 'Deutsch',
};

export const defaultLocale: Locale = 'en';
