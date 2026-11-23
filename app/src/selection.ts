import type { Card, Vocab } from "./data";
import { parsePages } from "./pages";
import type { Selection, State } from "./store";

export const POS = [["noun", "Nouns"], ["verb", "Verbs"], ["other", "Adjectives & more"], ["phrase", "Phrases"]] as const;

export const STATUS = [["all", "All cards"], ["starred", "Starred"], ["struggling", "Struggling"]] as const;

export interface Picked { cards: Card[]; errors: string[]; describe: string }

export function pick(v: Vocab, sel: Selection, s: State): Picked {
  const spec = parsePages(sel.pages, v.pages);
  const subs = new Set(sel.subs);
  const pos = new Set(sel.pos);
  const status: Record<Selection["status"], (c: Card) => boolean> = {
    all: () => true,
    starred: c => !!s.stars[c.key],
    struggling: c => (s.misses[c.key] ?? 0) >= 2,
  };
  const scoped = spec.pages.size || subs.size;
  const cards = v.cards.filter(c => (!scoped || spec.pages.has(c.page) || subs.has(c.sub)) && (!pos.size || pos.has(c.pos)) && status[sel.status](c));
  return { cards, errors: spec.errors, describe: describe(v, cards, scoped ? cards : null) };
}

function describe(v: Vocab, cards: Card[], scoped: Card[] | null) {
  if (!scoped) return cards.length === v.cards.length ? "The whole book" : "Whole book, filtered";
  const pages = [...new Set(cards.map(c => c.page))];
  const names = [...new Set(cards.map(c => v.subs.get(c.sub)!.en))];
  const range = pages.length ? (pages.length === 1 ? `Page ${pages[0]}` : `Pages ${pages[0]}-${pages[pages.length - 1]}`) : "";
  return [range, names.slice(0, 4).join(", ") + (names.length > 4 ? ` +${names.length - 4} more` : "")].filter(Boolean).join(": ");
}
