import { shuffle, type Card, type Vocab } from "./data";
import { solution } from "./answer";
import type { Dir, Settings } from "./store";

export function pickDir(settings: Settings): Dir {
  return settings.direction === "both" ? (Math.random() < 0.5 ? "es-en" : "en-es") : settings.direction;
}

export function distractors(v: Vocab, card: Card, dir: Dir, n: number): Card[] {
  const cat = v.subs.get(card.sub)!.cat;
  const right = solution(card, dir).toLowerCase();
  const seen = new Set([right]);
  const out: Card[] = [];
  const tiers = [
    v.cards.filter(c => c.sub === card.sub && c.pos === card.pos),
    v.cards.filter(c => c.sub === card.sub),
    v.cards.filter(c => v.subs.get(c.sub)!.cat === cat && c.pos === card.pos),
    v.cards.filter(c => c.pos === card.pos),
  ];
  for (const tier of tiers)
    for (const c of shuffle(tier)) {
      const t = solution(c, dir).toLowerCase();
      if (out.length >= n) return out;
      if (!seen.has(t)) { seen.add(t); out.push(c); }
    }
  return out;
}

export function options(v: Vocab, card: Card, dir: Dir): Card[] {
  return shuffle([card, ...distractors(v, card, dir, 3)]);
}
