import type { State } from "./store";

export type Gender = "m" | "f" | "m/f" | null;

export interface Card {
  id: number;
  key: string;
  page: number;
  sub: number;
  es: string;
  en: string;
  gender: Gender;
  number: "sg" | "pl" | null;
  pos: string;
  printedEs: string | null;
  printedEn: string | null;
  orig?: { es: string; en: string; gender: Gender; pos: string };
  added?: boolean;
}

export interface Category { id: number; es: string; en: string; subs: Sub[] }
export interface Sub { id: number; cat: number; es: string; en: string; first: number; last: number }

export interface Vocab {
  cards: Card[];
  categories: Category[];
  subs: Map<number, Sub>;
  pageImages: Record<number, number>;
  pages: number[];
}

type Raw = {
  categories: [number, string, string][];
  subcategories: [number, number, string, string, number, number][];
  pages: Record<string, number>;
  cards: [number, number, number, string, string, Gender, Card["number"], string, string | null, string | null][];
};

export async function loadVocab(): Promise<Vocab> {
  const raw: Raw = await (await fetch(`${import.meta.env.BASE_URL}vocab.json`)).json();
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const subs = new Map(raw.subcategories.map(([id, cat, es, en, first, last]) => [id, { id, cat, es, en: cap(en), first, last }]));
  const categories = raw.categories.map(([id, es, en]) => ({ id, es, en: cap(en), subs: [...subs.values()].filter(s => s.cat === id) }));
  const cards = raw.cards.map(([id, page, sub, es, en, gender, number, pos, printedEs, printedEn]) =>
    ({ id, key: `${page}|${es}|${en}`, page, sub, es, en, gender, number, pos, printedEs, printedEn }));
  const pageImages = Object.fromEntries(Object.entries(raw.pages).map(([p, i]) => [Number(p), i]));
  return { cards, categories, subs, pageImages, pages: [...new Set(cards.map(c => c.page))] };
}

type Changes = Pick<State, "edits" | "removed" | "added">;

export function numberOf(es: string, pos: string): Card["number"] {
  return pos !== "noun" ? null : /^(los|las|unos|unas)\s/i.test(es) ? "pl" : "sg";
}

export function applyChanges(base: Vocab, { edits, removed, added }: Changes): Vocab {
  if (!Object.keys(edits).length && !Object.keys(removed).length && !added.length) return base;
  const cards: Card[] = base.cards.filter(c => !removed[c.key]).map(c => {
    const e = edits[c.key];
    if (!e) return c;
    return { ...c, es: e.es, en: e.en, gender: e.gender, pos: e.pos, number: numberOf(e.es, e.pos), orig: { es: c.es, en: c.en, gender: c.gender, pos: c.pos } };
  });
  for (const a of added) {
    if (removed[a.key] || !base.subs.has(a.sub)) continue;
    cards.push({ id: a.id, key: a.key, page: a.page, sub: a.sub, es: a.es, en: a.en, gender: a.gender, pos: a.pos, number: numberOf(a.es, a.pos), printedEs: null, printedEn: null, added: true });
  }
  cards.sort((x, y) => x.page - y.page);
  return { ...base, cards, pages: [...new Set(cards.map(c => c.page))].sort((x, y) => x - y) };
}

export function guessGender(es: string): Gender {
  const m = es.trim().match(/^(el|la|los|las|un|una|unos|unas)\s/i);
  if (!m) return null;
  return /^(el|los|un|unos)$/i.test(m[1]) ? "m" : "f";
}

const ARTICLE = /^(el|la|los|las|un|una|unos|unas)\s+/i;

export function splitArticle(es: string): [string, string] {
  const m = es.match(ARTICLE);
  return m ? [m[1], es.slice(m[0].length)] : ["", es];
}

export function genderClass(c: Card) {
  return c.gender === "m" ? "masc" : c.gender === "f" ? "fem" : c.gender === "m/f" ? "both" : "";
}

export function genderNote(c: Card) {
  const [art] = splitArticle(c.es);
  if (c.gender === "f" && art.toLowerCase() === "el") return "feminine, takes el";
  return c.gender ? { m: "masculine", f: "feminine", "m/f": "masculine or feminine" }[c.gender] : "";
}

export function fold(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function shuffle<T>(xs: T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
