import { useSyncExternalStore } from "react";
import type { Gender } from "./data";
import type { Voice } from "./speak";

export type Dir = "es-en" | "en-es";
const STATUSES = ["all", "starred", "struggling"] as const;
export type Status = (typeof STATUSES)[number];

export interface Settings {
  direction: Dir | "both";
  strictArticles: boolean;
  strictAccents: boolean;
  autoSpeak: boolean;
  voice: Voice;
  theme: "light" | "dark";
  learnMc: boolean;
  learnWrite: boolean;
}

export interface Selection { pages: string; subs: number[]; pos: string[]; status: Status }

export interface State {
  stars: Record<string, true>;
  misses: Record<string, number>;
  sel: Selection;
  settings: Settings;
  best: Record<string, number>;
  edits: Record<string, CardFields & { at: number }>;
  removed: Record<string, number>;
  added: AddedCard[];
}

export interface CardFields { es: string; en: string; gender: Gender; pos: string }
export interface AddedCard extends CardFields { id: number; key: string; page: number; sub: number; at: number }

const KEY = "vocabulario:v1";

export const emptySelection: Selection = { pages: "", subs: [], pos: [], status: "all" };

const initial: State = {
  stars: {}, misses: {}, best: {}, edits: {}, removed: {}, added: [],
  sel: emptySelection,
  settings: { direction: "es-en", strictArticles: false, strictAccents: false, autoSpeak: false, voice: "mx", theme: "light", learnMc: true, learnWrite: true },
};

function revive(s: Partial<State> & { srs?: unknown; days?: unknown; flags?: unknown; sets?: unknown }): State {
  const rest = { ...s };
  delete rest.srs;
  delete rest.days;
  delete rest.flags;
  delete rest.sets;
  const fix = (sel?: Selection) => ({ ...emptySelection, ...sel, status: STATUSES.includes(sel?.status as Status) ? sel!.status : "all" });
  return { ...initial, ...rest, settings: { ...initial.settings, ...rest.settings }, sel: fix(rest.sel) };
}

let state = revive(JSON.parse(localStorage.getItem(KEY) ?? "{}"));
navigator.storage?.persist?.().catch(() => {});
let saveError = "";
const listeners = new Set<() => void>();

export function getState() {
  return state;
}

export function update(fn: (s: State) => Partial<State>) {
  state = { ...state, ...fn(state) };
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    saveError = "";
  } catch {
    saveError = "Your browser storage is full, so progress isn't being saved.";
  }
  listeners.forEach(l => l());
}

export function useStore() {
  return useSyncExternalStore(cb => (listeners.add(cb), () => listeners.delete(cb)), () => state);
}

export function storageError() {
  return saveError;
}

export function toggleStar(key: string) {
  update(s => {
    const stars = { ...s.stars };
    if (stars[key]) delete stars[key];
    else stars[key] = true;
    return { stars };
  });
}

export function addMiss(key: string) {
  update(s => ({ misses: { ...s.misses, [key]: (s.misses[key] ?? 0) + 1 } }));
}

export function saveCard(card: { key: string; added?: boolean; orig?: CardFields } & CardFields, f: CardFields) {
  const at = Date.now();
  update(s => {
    if (card.added) return { added: s.added.map(a => (a.key === card.key ? { ...a, ...f, at } : a)) };
    const orig = card.orig ?? card;
    const edits = { ...s.edits };
    if (orig.es === f.es && orig.en === f.en && orig.gender === f.gender && orig.pos === f.pos) delete edits[card.key];
    else edits[card.key] = { ...f, at };
    return { edits };
  });
}

export function revertEdit(key: string) {
  update(s => {
    const edits = { ...s.edits };
    delete edits[key];
    return { edits };
  });
}

export function removeCard(key: string) {
  update(s => ({ removed: { ...s.removed, [key]: Date.now() } }));
}

export function restoreCard(key: string) {
  update(s => {
    const removed = { ...s.removed };
    delete removed[key];
    return { removed };
  });
}

export function addCard(f: CardFields & { page: number; sub: number }) {
  const id = Math.max(1_000_000, ...state.added.map(a => a.id)) + 1;
  const key = `added|${id}`;
  update(s => ({ added: [...s.added, { ...f, id, key, at: Date.now() }] }));
  return key;
}

export function deleteAdded(key: string) {
  update(s => {
    const removed = { ...s.removed };
    delete removed[key];
    return { added: s.added.filter(a => a.key !== key), removed };
  });
}

export function resetChanges() {
  update(() => ({ edits: {}, removed: {}, added: [] }));
}
