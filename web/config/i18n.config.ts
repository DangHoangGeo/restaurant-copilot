export const locales = ['en', 'ja', 'vi'] as const;
export const defaultLocale = 'en';

export const localeDetails: { code: typeof locales[number]; name: string; flag: string }[] = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
];