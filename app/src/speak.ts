import { getState } from "./store";

export const VOICES = [["mx", "Latin America"], ["es", "Spain"]] as const;
export type Voice = (typeof VOICES)[number][0];

const index: Promise<Record<string, number>> = fetch("audio/index.json").then(r => (r.ok ? r.json() : {})).catch(() => ({}));
const audio = typeof Audio !== "undefined" ? new Audio() : undefined;

const RANK = [/natural/i, /online/i, /google/i, /neural|premium|enhanced/i];
let voice: SpeechSynthesisVoice | undefined;

function pick() {
  const lang = getState().settings.voice === "es" ? "es-ES" : "es-MX";
  const es = speechSynthesis.getVoices().filter(v => v.lang.replace("_", "-").startsWith("es"));
  const score = (v: SpeechSynthesisVoice) =>
    (v.lang.replace("_", "-") === lang ? 10 : 0) + RANK.reduce((n, r, i) => n + (r.test(v.name) ? 8 - 2 * i : 0), 0);
  voice = es.sort((a, b) => score(b) - score(a))[0];
}

export const canSpeak = !!audio || typeof speechSynthesis !== "undefined";
if (typeof speechSynthesis !== "undefined") {
  pick();
  speechSynthesis.onvoiceschanged = pick;
}

function browserSpeak(text: string) {
  if (typeof speechSynthesis === "undefined") return;
  pick();
  if (!voice) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = voice.lang;
  u.voice = voice;
  u.rate = 0.9;
  speechSynthesis.speak(u);
}

let latest = 0;

export async function speak(text: string) {
  const id = ++latest;
  if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
  const n = (await index)[text];
  if (id !== latest) return;
  if (audio && n !== undefined) {
    audio.src = `audio/${getState().settings.voice}/${n}.mp3`;
    audio.play().catch(e => {
      if (id === latest && e?.name !== "AbortError") browserSpeak(text);
    });
  } else browserSpeak(text);
}
