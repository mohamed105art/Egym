import { Lang, TrilingualText } from '../types/app';

export function tr(lang: Lang, ar: string, fr: string, en: string): string {
  if (lang === 'fr') return fr;
  if (lang === 'en') return en;
  return ar;
}

export function trText(lang: Lang, text?: TrilingualText | null): string {
  if (!text) return '';
  if (lang === 'fr') return text.fr || text.en || text.ar;
  if (lang === 'en') return text.en || text.fr || text.ar;
  return text.ar || text.en || text.fr;
}
