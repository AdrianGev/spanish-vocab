import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { shuffle, type Card } from "./data";
import { check, solution, type Verdict } from "./answer";
import { Empty, Mark, ModeHeader, Side } from "./components";
import { CHEERS, cheers, letter, letterGrade, letterIndex } from "./quiz";
import { preload, speak, VOICES } from "./speak";
import { addMiss, update, useStore, type Dir } from "./store";

const unique = (cards: Card[]) => [...new Map(cards.map(c => [c.key, c])).values()];
const noAuto = { autoCapitalize: "off", autoCorrect: "off", autoComplete: "off", spellCheck: false } as const;

type Row = { card: Card; dir: Dir };
const face = (r: Row, side: "front" | "back") => ((r.dir === "es-en") === (side === "front") ? r.card.es : r.card.en).toLowerCase();
const matches = (pick: Row, row: Row) =>
  pick === row || (pick.dir === row.dir && (face(pick, "back") === face(row, "back") || face(pick, "front") === face(row, "front")));

function useSheet(cards: Card[], limit = Infinity) {
  const all = useMemo(() => unique(cards), [cards]);
  const max = Math.min(limit, all.length);
  const [count, setCount] = useState(Math.min(20, max));
  const [retry, setRetry] = useState<Card[] | null>(null);
  const [round, setRound] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [graded, setGraded] = useState<Record<string, Verdict> | null>(null);
  const reset = (pool: Card[] | null) => { setRetry(pool); setRound(r => r + 1); setAnswers({}); setGraded(null); scrollTo(0, 0); };
  return {
    all, max, count, round, answers, graded, retry,
    setCount: (n: number) => { setCount(Math.max(1, Math.min(max, n || 1))); reset(null); },
    draw: (fresh: () => Card[]) => retry ?? fresh().slice(0, count),
    answer: (k: string, v: string) => !graded && setAnswers(a => ({ ...a, [k]: v })),
    grade: (g: Record<string, Verdict>, missed: Card[]) => { missed.forEach(c => addMiss(c.key)); setGraded(g); scrollTo(0, 0); },
    reset,
  };
}

type Sheet = ReturnType<typeof useSheet>;

function Options({ sheet, missed, children }: { sheet: Sheet; missed: Card[]; children?: ReactNode }) {
  return (
    <div className="panel quizopts">
      <label className="label">Questions
        <input type="number" min={1} max={sheet.max} value={sheet.retry ? sheet.retry.length : sheet.count} disabled={!!sheet.retry}
          onChange={e => sheet.setCount(Number(e.target.value))} />
        <span className="muted">of {sheet.max}</span>
      </label>
      {children}
      <div className="quizactions">
        {sheet.graded && missed.length > 0 && <button className="primary" onClick={() => sheet.reset(missed)}>Retry {missed.length} missed</button>}
        <button onClick={() => sheet.reset(null)}>New sheet</button>
      </div>
    </div>
  );
}

function Chips<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: readonly (readonly [T, string])[]; onChange: (v: T) => void }) {
  return (
    <span className="chips">
      <span className="label">{label}</span>
      {options.map(([v, name]) => <button key={v} className={`chip ${value === v ? "on" : ""}`} aria-pressed={value === v} onClick={() => onChange(v)}>{name}</button>)}
    </span>
  );
}

function Paper({ title, graded, children }: { title: string; graded: Record<string, Verdict> | null; children: ReactNode }) {
  const v = graded ? Object.values(graded) : [];
  const right = v.filter(x => x.ok).length;
  const name = useStore().settings.name;
  const grade = letterGrade(right, v.length);
  const cheer = useMemo(() => CHEERS[Math.floor(Math.random() * CHEERS.length)], [graded]);
  const ref = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState(0);
  useEffect(() => {
    const el = ref.current!;
    const fit = () => setLines(Math.ceil(el.offsetHeight / (parseFloat(getComputedStyle(el).getPropertyValue("--rule")) || 34)) + 1);
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div className="paper" ref={ref}>
      <div className="rules" aria-hidden="true">{Array.from({ length: lines }, (_, i) => <i key={i} />)}</div>
      <div className="paperhead">
        <b>{title}</b>
        <span className="spacer" />
        <label className="nameline">Name
          <input className="namefield" aria-label="Name" maxLength={40} value={name} onChange={e => update(st => ({ settings: { ...st.settings, name: e.target.value } }))} {...noAuto} />
        </label>
        {graded && <>
          <span className="grade" aria-label="score">{right}/{v.length}</span>
          <span className="lettergrade" aria-label="letter grade">{grade}</span>
        </>}
      </div>
      {graded && cheers(grade) && <span className="cheer" aria-label="cheer">{cheer}</span>}
      {children}
    </div>
  );
}

function Fix({ v, children }: { v?: Verdict; children: ReactNode }) {
  if (!v) return null;
  return <><Mark ok={v.ok} />{(!v.ok || v.note) && <span className="redpen">{children}</span>}</>;
}

function Submit({ sheet, onClick }: { sheet: Sheet; onClick: () => void }) {
  return sheet.graded ? null : <div className="bar center"><button className="primary big" onClick={onClick}>Check answers</button></div>;
}

type Prompt = "es" | "en" | "both";
const PROMPTS: [Prompt, string][] = [["es", "Spanish"], ["en", "English"], ["both", "Both"]];
const promptLabel = { es: "Spanish to English", en: "English to Spanish", both: "Both" };
const rowDir = (p: Prompt): Dir => (p === "both" ? (Math.random() < 0.5 ? "es-en" : "en-es") : p === "es" ? "es-en" : "en-es");

export function Matching({ cards }: { cards: Card[] }) {
  const s = useStore();
  const sheet = useSheet(cards);
  const [prompt, setPrompt] = useState<Prompt>(s.settings.direction === "en-es" ? "en" : "es");
  const { words, options } = useMemo(() => {
    const words: Row[] = sheet.draw(() => shuffle(sheet.all)).map(card => ({ card, dir: rowDir(prompt) }));
    return { words, options: shuffle(words) };
  }, [sheet.round, sheet.count, sheet.all, prompt]);

  if (cards.length < 2) return <Empty text="Matching needs at least 2 cards." />;

  const submit = () => {
    const g: Record<string, Verdict> = {};
    const missed: Card[] = [];
    for (const w of words) {
      const i = letterIndex((sheet.answers[w.card.key] ?? "").trim().toUpperCase());
      const ok = i >= 0 && i < options.length && matches(options[i], w);
      g[w.card.key] = { ok, note: "" };
      if (!ok) missed.push(w.card);
    }
    sheet.grade(g, missed);
  };
  const missed = words.filter(w => sheet.graded && !sheet.graded[w.card.key]?.ok).map(w => w.card);
  const len = letter(options.length - 1).length;
  const numW = { minWidth: `max(32px, ${len * 0.75 + 0.45}em)` };
  const target = prompt === "es" ? "English" : prompt === "en" ? "Spanish" : "translation";

  return (
    <>
      <ModeHeader title="Matching" />
      <Options sheet={sheet} missed={missed}>
        <Chips label="Words shown in" value={prompt} onChange={p => { setPrompt(p); sheet.reset(null); }} options={PROMPTS} />
      </Options>
      <Paper title={`Matching: ${promptLabel[prompt]}`} graded={sheet.graded}>
        <p className="directions">Write the letter of the matching {target} next to each word.</p>
        <div className="matchgroup">
          <ol className="paperlist">
            {words.map((w, i) => (
              <li key={w.card.key}>
                <span className="num">{i + 1}.</span>
                <input className="blank letter" aria-label={`answer ${i + 1}`} maxLength={len} style={len > 1 ? { width: `${len * 0.8 + 1.4}em` } : undefined} value={sheet.answers[w.card.key] ?? ""} readOnly={!!sheet.graded}
                  onChange={e => sheet.answer(w.card.key, e.target.value.toUpperCase().replace(/[^A-Z]/g, ""))} {...noAuto} />
                <span className="prompt"><Side card={w.card} dir={w.dir} side="front" /></span>
                <Fix v={sheet.graded?.[w.card.key]}>{letter(options.indexOf(w))}</Fix>
              </li>
            ))}
          </ol>
          <ol className="paperlist choices-list">
            {options.map((o, j) => <li key={o.card.key}><span className="num" style={numW}>{letter(j)}.</span><span className="prompt"><Side card={o.card} dir={o.dir} side="back" /></span></li>)}
          </ol>
        </div>
      </Paper>
      <Submit sheet={sheet} onClick={submit} />
    </>
  );
}


export function Written({ cards }: { cards: Card[] }) {
  const s = useStore();
  const sheet = useSheet(cards);
  const [prompt, setPrompt] = useState<Prompt>("es");
  const rows = useMemo(() => sheet.draw(() => shuffle(sheet.all)).map(card => ({ card, dir: rowDir(prompt) })), [sheet.round, sheet.count, sheet.all, prompt]);

  if (!cards.length) return <Empty text="No cards selected." />;

  const submit = () => {
    const g: Record<string, Verdict> = {};
    rows.forEach(({ card, dir }, i) => { g[i] = check(sheet.answers[i] ?? "", card, dir, s.settings); });
    sheet.grade(g, rows.filter((_, i) => !g[i].ok).map(r => r.card));
  };
  const missed = rows.filter((_, i) => sheet.graded && !sheet.graded[i].ok).map(r => r.card);

  return (
    <>
      <ModeHeader title="Written" />
      <Options sheet={sheet} missed={missed}>
        <Chips label="Words shown in" value={prompt} onChange={p => { setPrompt(p); sheet.reset(null); }}
          options={PROMPTS} />
      </Options>
      <Paper title={`Written: ${promptLabel[prompt]}`} graded={sheet.graded}>
        <p className="directions">Write the translation of each word on the line next to it.</p>
        <ol className="paperlist">
          {rows.map(({ card, dir }, i) => (
            <li key={`${sheet.round}:${i}`} className="writerow written">
              <span className="num">{i + 1}.</span>
              <span className="prompt"><Side card={card} dir={dir} side="front" /></span>
              <span className="num ansnum" aria-hidden="true">{i + 1}.</span>
              <input className="blank" aria-label={`answer ${i + 1}`} value={sheet.answers[i] ?? ""} readOnly={!!sheet.graded}
                onChange={e => sheet.answer(String(i), e.target.value)} {...noAuto} />
              <Fix v={sheet.graded?.[i]}>{sheet.graded?.[i]?.note && `${sheet.graded[i].note}: `}{solution(card, dir)}</Fix>
            </li>
          ))}
        </ol>
      </Paper>
      <Submit sheet={sheet} onClick={submit} />
    </>
  );
}

type Target = "en" | "es";

export function Translate({ cards }: { cards: Card[] }) {
  const s = useStore();
  const sheet = useSheet(cards);
  const english = s.settings.hear === "en";
  const target: Target = english ? "es" : "en";
  const say = (c: Card) => speak(english ? c.en : c.es, english ? "en" : "es");
  const [pos, setPos] = useState({ round: 0, at: -1, seen: -1 });
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const words = useMemo(() => sheet.draw(() => shuffle(sheet.all)), [sheet.round, sheet.count, sheet.all]);
  const cur = pos.round === sheet.round ? pos : { round: sheet.round, at: -1, seen: -1 };
  const at = cur.at;
  useEffect(() => { preload(words.map(c => (english ? c.en : c.es)), english ? "en" : "es"); }, [words, english, s.settings.voice]);
  const dir: Dir = target === "en" ? "es-en" : "en-es";

  if (!cards.length) return <Empty text="No cards selected." />;

  const last = at >= words.length - 1;
  const goTo = (i: number) => setPos({ round: sheet.round, at: i, seen: Math.max(cur.seen, i) });
  const nextWord = () => {
    if (last) return;
    const i = at + 1;
    goTo(i);
    say(words[i]);
    inputs.current[i]?.focus();
  };
  const submit = () => {
    const g: Record<string, Verdict> = {};
    words.forEach((card, i) => { g[i] = check(sheet.answers[i] ?? "", card, dir, s.settings); });
    sheet.grade(g, words.filter((_, i) => !g[i].ok));
  };
  const missed = words.filter((_, i) => sheet.graded && !sheet.graded[i].ok);

  return (
    <>
      <ModeHeader title="Translate" />
      <Options sheet={sheet} missed={missed}>
        <Chips label="You hear" value={s.settings.hear}
          onChange={h => { update(st => ({ settings: { ...st.settings, hear: h } })); if (h !== s.settings.hear) sheet.reset(null); }}
          options={[["es", "Spanish words"], ["en", "English words"]]} />
        <Chips label="Voice" value={english ? "an" : s.settings.voice}
          onChange={v => update(st => ({ settings: { ...st.settings, voice: v } }))}
          options={english ? [["an", "English"]] : VOICES} />
      </Options>
      {!sheet.graded && (
        <div className="panel speaker">
          <span className="label">{at < 0 ? `${words.length} words` : `Word ${at + 1} of ${words.length}`}</span>
          <span className="spacer" />
          {at >= 0 && <button className="big" onClick={() => say(words[at])}>Say Current</button>}
          <button className={`big ${last ? "primary" : ""}`} onClick={submit}>Check answers</button>
          {!last && <button className="primary big" onClick={nextWord}>{at < 0 ? "First Word" : "Next Word"}</button>}
        </div>
      )}
      <Paper title={`Translate: write the ${target === "en" ? "English meaning" : "Spanish word"}`} graded={sheet.graded}>
        <p className="directions">{english ? "Listen to each English word and write it in Spanish." : "Listen to each Spanish word and write what it means in English."}</p>
        <ol className="paperlist">
          {words.map((card, i) => (
            <li key={`${sheet.round}:${i}`} className={`writerow ${i === at && !sheet.graded ? "current" : ""}`} onClick={() => inputs.current[i]?.focus()}>
              <span className="num">{i + 1}.</span>
              <input className="blank" aria-label={`answer ${i + 1}`} ref={el => { inputs.current[i] = el; }} value={sheet.answers[i] ?? ""} readOnly={!!sheet.graded}
                onChange={e => sheet.answer(String(i), e.target.value)}
                onFocus={() => { if (!sheet.graded && i !== at) goTo(i); }}
                onKeyDown={e => { if (e.key === "Enter" && !sheet.graded) { e.preventDefault(); nextWord(); } }} {...noAuto} />
              {sheet.graded && <span className="prompt heard"><Side card={card} dir={english ? "en-es" : "es-en"} side="front" /></span>}
              <Fix v={sheet.graded?.[i]}>{solution(card, dir)}</Fix>
            </li>
          ))}
        </ol>
      </Paper>
      <Submit sheet={sheet} onClick={submit} />
    </>
  );
}
