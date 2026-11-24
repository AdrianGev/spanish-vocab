import { useEffect, useMemo, useState } from "react";
import { shuffle, type Card, type Vocab } from "./data";
import { check, solution, type Verdict } from "./answer";
import { Empty, ModeHeader, Notes, Progress, Side, Tools, useKeys } from "./components";
import { options, pickDir } from "./quiz";
import { preload, speak } from "./speak";
import { addMiss, getState, update, useStore, type Dir, type Settings } from "./store";

const ROUND = 7;
const TYPES = [["learnWrite", "Written"], ["learnMc", "Multiple choice"]] as const;

interface Q { card: Card; dir: Dir; kind: "mc" | "write"; options: Card[] }
type Feedback = { ok: boolean; picked?: Card; verdict?: Verdict; typed?: string };

function makeRound(vocab: Vocab, unique: Card[], lv: Record<string, number>): Q[] {
  const left = shuffle(unique.filter(c => (lv[c.key] ?? 0) < 2)).sort((a, b) => (lv[b.key] ?? 0) - (lv[a.key] ?? 0)).slice(0, ROUND);
  return shuffle(left).map(card => {
    const dir = pickDir(getState().settings);
    return { card, dir, kind: (lv[card.key] ?? 0) === 0 ? "mc" : "write", options: options(vocab, card, dir) };
  });
}

export function Learn({ vocab, cards }: { vocab: Vocab; cards: Card[] }) {
  const s = useStore();
  const unique = useMemo(() => [...new Map(cards.map(c => [c.key, c])).values()], [cards]);
  const [level, setLevel] = useState<Record<string, number>>({});
  const [round, setRound] = useState(() => makeRound(vocab, unique, {}));
  const [r, setR] = useState(0);
  const [typed, setTyped] = useState("");
  const [fb, setFb] = useState<Feedback | null>(null);
  const [roundNo, setRoundNo] = useState(1);
  useEffect(() => { preload(round.map(q => q.card.es)); }, [round, s.settings.voice]);
  const [showOpts, setShowOpts] = useState(false);
  const mastered = unique.filter(c => level[c.key] === 2).length;
  const { learnMc, learnWrite } = s.settings;
  const setType = (k: keyof Pick<Settings, "learnMc" | "learnWrite">, on: boolean) => update(st => ({ settings: { ...st.settings, [k]: on } }));

  const newRound = (lv: Record<string, number>) => {
    setRound(makeRound(vocab, unique, lv));
    setR(0); setFb(null); setTyped(""); setRoundNo(n => n + 1);
  };

  const q0 = round[r];
  const q = q0 && { ...q0, kind: !learnWrite ? "mc" : !learnMc ? "write" : q0.kind } as Q;
  const grade = (ok: boolean, extra: Omit<Feedback, "ok">) => {
    setLevel({ ...level, [q.card.key]: ok ? (level[q.card.key] ?? 0) + 1 : 0 });
    if (!ok) addMiss(q.card.key);
    if (s.settings.autoSpeak) speak(q.card.es);
    setFb({ ok, ...extra });
  };
  const next = () => { setFb(null); setTyped(""); setR(r + 1); };
  const override = () => { setLevel({ ...level, [q.card.key]: 2 }); next(); };

  useKeys(e => {
    if (!q) { if (e.key === "Enter" && mastered < unique.length) newRound(level); return; }
    if (fb && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); next(); }
    else if (!fb && q.kind === "mc" && "1234".includes(e.key)) {
      const o = q.options[Number(e.key) - 1];
      if (o) grade(o.key === q.card.key, { picked: o });
    }
  });

  if (!cards.length) return <Empty text="No cards selected." />;

  return (
    <>
      <ModeHeader title="Learn">
        <span className="muted">Round {roundNo}</span>
        <button className={showOpts ? "on" : ""} aria-expanded={showOpts} onClick={() => setShowOpts(!showOpts)}>Settings</button>
      </ModeHeader>
      {showOpts && (
        <div className="panel learnopts">
          <span className="label">Question types</span>
          {TYPES.map(([k, name]) => {
            const on = s.settings[k], last = on && !(k === "learnMc" ? learnWrite : learnMc);
            return (
              <button key={k} className={`chip ${on ? "on" : ""}`} aria-pressed={on} disabled={last}
                title={last ? "At least one question type has to stay on" : undefined} onClick={() => setType(k, !on)}>{on ? "✓ " : ""}{name}</button>
            );
          })}
          <span className="muted">{learnMc && learnWrite ? "New words start as multiple choice, then you write them." : "At least one type stays on."}</span>
        </div>
      )}
      <div className="bar"><span>{mastered} / {unique.length} mastered</span></div>
      <Progress value={mastered} max={unique.length} />
      {q ? (
        <div style={{ marginTop: 16 }}>
          <div className="card" style={{ minHeight: 200, cursor: "default" }}>
            <span className="corner label">{q.kind === "mc" ? "Choose the answer" : "Write the answer"}</span>
            <span className="corner r label">{r + 1} / {round.length}</span>
            <div className="big"><Side card={q.card} dir={q.dir} side="front" /></div>
            {fb && <Notes card={q.card} />}
          </div>
          {q.kind === "mc" ? (
            <div className="choices" style={{ marginTop: 12 }}>
              {q.options.map((o, i) => (
                <button key={o.id} disabled={!!fb} onClick={() => grade(o.key === q.card.key, { picked: o })}
                  className={fb ? (o.key === q.card.key ? "right" : o === fb.picked ? "wrong" : "") : ""}>
                  <span className="muted">{i + 1}</span> <span className="term">{solution(o, q.dir)}</span>
                </button>
              ))}
            </div>
          ) : !fb ? (
            <form className="bar" onSubmit={e => { e.preventDefault(); const v = check(typed, q.card, q.dir, s.settings); grade(v.ok, { verdict: v, typed }); }}>
              <input className="answer" type="text" autoFocus value={typed} onChange={e => setTyped(e.target.value)}
                placeholder={q.dir === "es-en" ? "Type the English" : "Type the Spanish"} autoCapitalize="off" autoCorrect="off" spellCheck={false} />
              <button type="submit" className="primary">Answer</button>
              <button type="button" onClick={() => grade(false, { typed: "" })}>Don't know</button>
            </form>
          ) : null}
          {fb && (
            <div className="panel feedback">
              <div className="fbinfo">
                <b className={`fbstatus ${fb.ok ? "ok" : "no"}`}>{fb.ok ? "Correct!" : "Not quite"}</b>
                {fb.verdict?.note && <div className="muted">{fb.verdict.note}</div>}
                {(!fb.ok || fb.verdict?.note) && (
                  <dl className="fbanswer">
                    <dt>Answer</dt><dd className="term">{solution(q.card, q.dir)}</dd>
                    {fb.typed !== undefined && <><dt>You wrote</dt><dd className="term">{fb.typed || "(nothing)"}</dd></>}
                  </dl>
                )}
                {!fb.ok && q.kind === "write" && fb.typed && <div><button className="linkish" onClick={override}>I was right</button></div>}
              </div>
              <button className="primary continue" onClick={next} autoFocus>Continue <kbd>Enter</kbd></button>
              <div className="fbtools"><Tools card={q.card} vocab={vocab} /></div>
            </div>
          )}
        </div>
      ) : (
        <div className="panel center" style={{ marginTop: 16 }}>
          {mastered < unique.length ? <>
            <h3>Round {roundNo} complete</h3>
            <p>{mastered} of {unique.length} mastered. {unique.length - mastered} to go.</p>
            <button className="primary" onClick={() => newRound(level)}>Next round <kbd>Enter</kbd></button>
          </> : <>
            <h3>You mastered all {unique.length}!</h3>
            <div className="bar center"><button className="primary" onClick={() => { setLevel({}); setRoundNo(0); newRound({}); }}>Start over</button><a href="#/written">Practice quiz</a></div>
          </>}
        </div>
      )}
    </>
  );
}
