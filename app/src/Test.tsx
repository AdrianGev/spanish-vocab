import { useMemo, useState } from "react";
import { shuffle, type Card, type Vocab } from "./data";
import { check, solution, type Verdict } from "./answer";
import { Empty, ModeHeader, Side } from "./components";
import { distractors, options, pickDir } from "./quiz";
import { addMiss, getState, useStore, type Dir, type Settings } from "./store";

type Kind = "written" | "mc" | "tf" | "matching";
const KINDS: [Kind, string][] = [["written", "Written"], ["mc", "Multiple choice"], ["tf", "True / false"], ["matching", "Matching"]];

type Q =
  | { kind: "written"; card: Card; dir: Dir }
  | { kind: "mc"; card: Card; dir: Dir; options: Card[] }
  | { kind: "tf"; card: Card; dir: Dir; shown: Card }
  | { kind: "matching"; cards: Card[]; dir: Dir; options: Card[] };

function build(v: Vocab, cards: Card[], count: number, kinds: Kind[], settings: Settings): Q[] {
  const pool = shuffle(cards).slice(0, count);
  const qs: Q[] = [];
  const single = kinds.filter(k => k !== "matching");
  const matchN = kinds.includes("matching") ? (single.length ? Math.min(5, Math.floor(pool.length / (single.length + 1))) : pool.length) : 0;
  const matched = matchN >= 2 ? pool.splice(0, matchN) : [];
  pool.forEach((card, i) => {
    const kind = single[i % single.length] ?? "written";
    const dir = pickDir(settings);
    if (kind === "mc") qs.push({ kind, card, dir, options: options(v, card, dir) });
    else if (kind === "tf") qs.push({ kind, card, dir, shown: Math.random() < 0.5 ? card : distractors(v, card, dir, 1)[0] ?? card });
    else qs.push({ kind: "written", card, dir });
  });
  for (let i = 0; i < matched.length; i += 5) {
    const group = matched.slice(i, i + 5);
    if (group.length < 2) { qs.push({ kind: "written", card: group[0], dir: pickDir(settings) }); continue; }
    const dir = settings.direction === "en-es" ? "en-es" : "es-en";
    qs.push({ kind: "matching", cards: group, dir, options: shuffle(group) });
  }
  return [...shuffle(qs.filter(q => q.kind !== "matching")), ...qs.filter(q => q.kind === "matching")];
}

export function Test({ vocab, cards }: { vocab: Vocab; cards: Card[] }) {
  const s = useStore();
  const unique = useMemo(() => [...new Map(cards.map(c => [c.key, c])).values()], [cards]);
  const [count, setCount] = useState(Math.min(20, unique.length));
  const [kinds, setKinds] = useState<Kind[]>(["written", "mc", "tf", "matching"]);
  const [qs, setQs] = useState<Q[] | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [graded, setGraded] = useState<Record<string, Verdict> | null>(null);

  if (!cards.length) return <Empty text="No cards selected." />;

  const begin = (pool: Card[], n: number) => {
    setQs(build(vocab, pool, n, kinds, getState().settings));
    setAnswers({}); setGraded(null); scrollTo(0, 0);
  };

  if (!qs) {
    return (
      <>
        <ModeHeader title="Test" />
        <div className="panel">
          <div className="bar"><span className="label">Questions</span>
            <input type="number" min={1} max={unique.length} value={count} onChange={e => setCount(Math.max(1, Math.min(unique.length, Number(e.target.value))))} />
            <span className="muted">of {unique.length}</span>
          </div>
          <div className="bar"><span className="label">Question types</span>
            {KINDS.map(([k, name]) => (
              <button key={k} className={`chip ${kinds.includes(k) ? "on" : ""}`} onClick={() => setKinds(kinds.includes(k) ? kinds.filter(x => x !== k) : [...kinds, k])}>{name}</button>
            ))}
          </div>
          <p className="muted">Answer direction follows settings: {s.settings.direction === "both" ? "mixed" : s.settings.direction === "es-en" ? "Spanish to English" : "English to Spanish"}.</p>
          <button className="primary" disabled={!kinds.length} onClick={() => begin(unique, count)}>Start test</button>
        </div>
      </>
    );
  }

  const submit = () => {
    const g: Record<string, Verdict> = {};
    qs.forEach((q, i) => {
      if (q.kind === "matching") q.cards.forEach(c => { g[`${i}:${c.id}`] = { ok: answers[`${i}:${c.id}`] === String(c.id), note: "" }; });
      else if (q.kind === "written") g[i] = check(answers[i] ?? "", q.card, q.dir, s.settings);
      else if (q.kind === "mc") g[i] = { ok: answers[i] === String(q.card.id), note: "" };
      else g[i] = { ok: answers[i] === String(q.shown.key === q.card.key), note: "" };
    });
    const missedCards = missed(qs, g);
    missedCards.forEach(c => addMiss(c.key));
    setGraded(g); scrollTo(0, 0);
  };

  const total = graded ? Object.keys(graded).length : 0;
  const right = graded ? Object.values(graded).filter(v => v.ok).length : 0;
  const wrongCards = graded ? missed(qs, graded) : [];
  const set = (k: string, v: string) => !graded && setAnswers({ ...answers, [k]: v });
  const cls = (k: string) => (graded ? (graded[k]?.ok ? "right" : "wrong") : "");

  return (
    <>
      <ModeHeader title="Test"><button onClick={() => setQs(null)}>New test</button></ModeHeader>
      {graded && (
        <div className="panel center">
          <h3>{Math.round((100 * right) / total)}%</h3>
          <p>{right} of {total} correct</p>
          <div className="bar center">
            {wrongCards.length > 0 && <button className="primary" onClick={() => begin(wrongCards, wrongCards.length)}>Retest {wrongCards.length} missed</button>}
            <button onClick={() => begin(unique, count)}>New test</button>
          </div>
        </div>
      )}
      <div className="grid" style={{ marginTop: 12 }}>
        {qs.map((q, i) => (
          <div key={i} className={`question ${graded && q.kind !== "matching" ? "graded" : ""}`}>
            {graded && q.kind !== "matching" && <Mark ok={graded[i].ok} />}
            <div className="label">{i + 1}. {KINDS.find(k => k[0] === q.kind)![1]}</div>
            {q.kind === "matching" ? (
              <div className="grid">
                {q.cards.map(c => (
                  <div key={c.id} className="bar" style={{ margin: 0 }}>
                    <select value={answers[`${i}:${c.id}`] ?? ""} onChange={e => set(`${i}:${c.id}`, e.target.value)} className={cls(`${i}:${c.id}`)} disabled={!!graded} aria-label="match">
                      <option value="">—</option>
                      {q.options.map((o, j) => <option key={o.id} value={String(o.id)}>{"abcde"[j]}</option>)}
                    </select>
                    <span className="q" style={{ margin: 0 }}><Side card={c} dir={q.dir} side="front" /></span>
                    {graded && !graded[`${i}:${c.id}`].ok && <span className="no term">→ {solution(c, q.dir)}</span>}
                    {graded && <><span className="spacer" /><Mark ok={graded[`${i}:${c.id}`].ok} /></>}
                  </div>
                ))}
                <div className="terms">
                  {q.options.map((o, j) => <div className="row" key={o.id} style={{ gridTemplateColumns: "40px 1fr" }}><b>{"abcde"[j]}</b><span className="term">{solution(o, q.dir)}</span></div>)}
                </div>
              </div>
            ) : (
              <>
                <div className="q"><Side card={q.card} dir={q.dir} side="front" />{q.kind === "tf" && <> = <span className="term">{solution(q.shown, q.dir)}</span>?</>}</div>
                {q.kind === "written" && (
                  <input className="answer" type="text" value={answers[i] ?? ""} onChange={e => set(String(i), e.target.value)} readOnly={!!graded}
                    placeholder={q.dir === "es-en" ? "Type the English" : "Type the Spanish"} autoCapitalize="off" autoCorrect="off" spellCheck={false} />
                )}
                {q.kind === "mc" && (
                  <div className="choices">
                    {q.options.map(o => (
                      <button key={o.id} onClick={() => set(String(i), String(o.id))}
                        className={graded ? (o.key === q.card.key ? "right" : answers[i] === String(o.id) ? "wrong" : "") : answers[i] === String(o.id) ? "chosen" : ""}>
                        <span className="term">{solution(o, q.dir)}</span>
                      </button>
                    ))}
                  </div>
                )}
                {q.kind === "tf" && (
                  <div className="bar">
                    {["true", "false"].map(v => <button key={v} className={`chip ${answers[i] === v ? "on" : ""}`} onClick={() => set(String(i), v)}>{v === "true" ? "True" : "False"}</button>)}
                  </div>
                )}
                {graded && (!graded[i].ok || graded[i].note) && (
                  <div className={graded[i].ok ? "ok" : "no"}>{graded[i].note && `${graded[i].note}. `}Answer: <span className="term">{solution(q.card, q.dir)}</span></div>
                )}
              </>
            )}
          </div>
        ))}
      </div>
      {!graded && <div className="bar center"><button className="primary" onClick={submit}>Submit test</button></div>}
    </>
  );
}

function Mark({ ok }: { ok: boolean }) {
  return (
    <svg className={`mark ${ok ? "yes" : "x"}`} viewBox="0 0 24 24" role="img" aria-label={ok ? "Correct" : "Wrong"}>
      <path d={ok ? "M4.5 12.5l5 5L19.5 7" : "M6 6l12 12M18 6 6 18"} />
    </svg>
  );
}

function missed(qs: Q[], g: Record<string, Verdict>): Card[] {
  return qs.flatMap((q, i) => (q.kind === "matching" ? q.cards.filter(c => !g[`${i}:${c.id}`].ok) : g[i].ok ? [] : [q.card]));
}
