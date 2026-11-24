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

const ABC = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
export const letter = (i: number): string => (i < 26 ? ABC[i] : letter(Math.floor(i / 26) - 1) + ABC[i % 26]);
export const letterIndex = (s: string) => (/^[A-Z]+$/.test(s) ? [...s].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1 : -1);

const SCALE: [number, string][] = [
  [100, "A+"], [96, "A"], [93, "A-"], [90, "B+"], [87, "B"], [85, "B-"],
  [82, "C+"], [79, "C"], [77, "C-"], [75, "D+"], [72, "D"], [70, "D-"], [0, "F"],
];
export const letterGrade = (right: number, total: number): string => {
  const pct = total ? Math.floor((right / total) * 100 + 1e-9) : 0;
  return SCALE.find(([min]) => pct >= min)![1];
};
export const CHEERS = ["¡Fantástico!", "¡Excelente!", "¡Increíble!", "¡Estupendo!", "¡Maravilloso!"];
export const cheers = (grade: string) => grade.startsWith("A");
