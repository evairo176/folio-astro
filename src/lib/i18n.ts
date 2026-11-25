import en from "./en.json";
import id from "./id.json";

export type Lang = "en" | "id";

const dict = { en, id } as const;

export const DEFAULT_LANG: Lang = "id";

/** Resolve a dot-path key, e.g. t("en", "nav.home"). */
export function t(lang: Lang, key: string): string {
  const parts = key.split(".");
  let cur: unknown = dict[lang] ?? dict[DEFAULT_LANG];
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      // fall back to the default language before giving up
      let fb: unknown = dict[DEFAULT_LANG];
      for (const q of parts) {
        if (fb && typeof fb === "object" && q in (fb as Record<string, unknown>)) {
          fb = (fb as Record<string, unknown>)[q];
        } else {
          return key;
        }
      }
      return typeof fb === "string" ? fb : key;
    }
  }
  return typeof cur === "string" ? cur : key;
}

/** Resolve an array-valued key (lists of paragraphs, bullets, ...). */
export function tList(lang: Lang, key: string): string[] {
  const parts = key.split(".");
  let cur: unknown = dict[lang] ?? dict[DEFAULT_LANG];
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return [];
    }
  }
  return Array.isArray(cur) ? (cur as string[]) : [];
}

export const LANGS: Lang[] = ["id", "en"];
