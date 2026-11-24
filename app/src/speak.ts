import { getState } from "./store";

export const VOICES = [["mx", "Latin America"], ["es", "Spain"], ["an", "English"]] as const;
export type Voice = (typeof VOICES)[number][0];

export type Lang = "es" | "en";
const INDEX: Record<Lang, string> = { es: "audio/index.json", en: "audio/index-en.json" };
const indexes: Partial<Record<Lang, Promise<Record<string, number>>>> = {};
const getIndex = (lang: Lang) =>
  (indexes[lang] ??= fetch(INDEX[lang]).then(r => (r.ok ? r.json() : Promise.reject())).catch(() => {
    delete indexes[lang];
    return {} as Record<string, number>;
  }));
getIndex("es");
const audio = typeof Audio !== "undefined" ? new Audio() : undefined;

const RANK = [/natural/i, /online/i, /google/i, /neural|premium|enhanced/i];
let voice: SpeechSynthesisVoice | undefined;

function pick(want: Lang = "es") {
  const lang = want === "en" ? "en-US" : getState().settings.voice === "es" ? "es-ES" : "es-MX";
  const es = speechSynthesis.getVoices().filter(v => v.lang.replace("_", "-").startsWith(want));
  const score = (v: SpeechSynthesisVoice) =>
    (v.lang.replace("_", "-") === lang ? 10 : 0) + RANK.reduce((n, r, i) => n + (r.test(v.name) ? 8 - 2 * i : 0), 0);
  voice = es.sort((a, b) => score(b) - score(a))[0];
}

export const canSpeak = !!audio || typeof speechSynthesis !== "undefined";
if (typeof speechSynthesis !== "undefined") {
  pick();
  speechSynthesis.onvoiceschanged = () => pick();
}

function browserSpeak(text: string, lang: Lang) {
  if (typeof speechSynthesis === "undefined") return;
  pick(lang);
  if (!voice) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = voice.lang;
  u.voice = voice;
  u.rate = 0.9;
  speechSynthesis.speak(u);
}

let latest = 0;
const loaded = new Map<string, Promise<string | undefined>>();
const url = (n: number, lang: Lang) => `audio/${lang === "en" ? "en" : getState().settings.voice}/${n}.mp3`;
const load = (u: string) => {
  if (!loaded.has(u)) {
    loaded.set(u, fetch(u).then(r => (r.ok ? r.blob() : Promise.reject())).then(b => URL.createObjectURL(b)).catch(() => {
      loaded.delete(u);
      return undefined;
    }));
  }
  return loaded.get(u)!;
};

export async function preload(texts: string[], lang: Lang = "es") {
  const idx = await getIndex(lang);
  for (const t of texts) if (idx[t] !== undefined) load(url(idx[t], lang));
}

export async function speak(text: string, lang: Lang = "es") {
  const id = ++latest;
  if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
  const n = (await getIndex(lang))[text];
  if (id !== latest) return;
  if (audio && n !== undefined) {
    const u = url(n, lang);
    const src = (await load(u)) ?? u;
    if (id !== latest) return;
    audio.src = src;
    audio.play().catch(e => {
      if (id === latest && e?.name !== "AbortError") browserSpeak(text, lang);
    });
  } else browserSpeak(text, lang);
}
