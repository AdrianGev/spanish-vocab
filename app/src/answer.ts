import { fold, type Card } from "./data";
import type { Dir, Settings } from "./store";

const ARTICLES = { es: /^(el|la|los|las|un|una|unos|unas)\s+/, en: /^(the|a|an|to)\s+/ };

function clean(s: string) {
  return s.toLowerCase().replace(/[¿?¡!.,;:"“”()]/g, " ").replace(/[’']/g, "'").replace(/\s+/g, " ").trim();
}

function forms(s: string, lang: "es" | "en", strictArticles: boolean) {
  const base = [s, s.replace(/\([^)]*\)/g, "")].flatMap(x => x.split(/\s*\/\s*/)).map(clean).filter(Boolean);
  return strictArticles && lang === "es" ? base : base.map(x => x.replace(ARTICLES[lang], ""));
}

export interface Verdict { ok: boolean; note: string }

export function check(answer: string, card: Card, dir: Dir, settings: Settings): Verdict {
  const lang = dir === "en-es" ? "es" : "en";
  const target = lang === "es" ? card.es : card.en;
  const given = forms(answer, lang, settings.strictArticles);
  const wanted = forms(target, lang, settings.strictArticles);
  if (given.some(g => wanted.includes(g))) return { ok: true, note: "" };
  if (given.some(g => wanted.map(fold).includes(fold(g))))
    return settings.strictAccents ? { ok: false, note: "Check your accents" } : { ok: true, note: "Correct, but watch the accents" };
  if (lang === "es" && settings.strictArticles && forms(answer, lang, false).some(g => forms(target, lang, false).includes(g)))
    return { ok: false, note: "Right word, wrong or missing article" };
  return { ok: false, note: "" };
}

export function prompt(card: Card, dir: Dir) {
  return dir === "es-en" ? card.es : card.en;
}

export function solution(card: Card, dir: Dir) {
  return dir === "es-en" ? card.en : card.es;
}
