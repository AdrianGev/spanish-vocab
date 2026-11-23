import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { shuffle, type Card } from "./data";
import { check, solution } from "./answer";
import { Empty, ModeHeader, Side } from "./components";
import { pickDir } from "./quiz";
import { speak } from "./speak";
import { addMiss, getState, update, useStore, type Dir } from "./store";

const LIVES = 3;
const PER_LEVEL = 8;
const ROCK = 52;

interface Rock { id: number; card: Card; dir: Dir; x: number; y: number }
interface Game {
  rocks: Rock[]; queue: Card[]; lives: number; score: number; cleared: number; spawnIn: number;
  missed: Rock[]; over: boolean; nextId: number;
}

const fresh = (cards: Card[]): Game =>
  ({ rocks: [], queue: shuffle(cards), lives: LIVES, score: 0, cleared: 0, spawnIn: 0, missed: [], over: false, nextId: 0 });
const levelOf = (g: Game) => 1 + Math.floor(g.cleared / PER_LEVEL);

export function Gravity({ cards }: { cards: Card[] }) {
  const s = useStore();
  const unique = useMemo(() => [...new Map(cards.map(c => [c.key, c])).values()], [cards]);
  const game = useRef(fresh(unique));
  const arena = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [, redraw] = useReducer((n: number) => n + 1, 0);
  const [running, setRunning] = useState(false);
  const [typed, setTyped] = useState("");
  const [shake, setShake] = useState(false);
  const [lost, setLost] = useState<Rock | null>(null);

  useEffect(() => {
    if (!running) return;
    let last = performance.now(), frame = 0;
    const tick = (t: number) => {
      const g = game.current, dt = Math.min(0.1, (t - last) / 1000), level = levelOf(g);
      last = t;
      const floor = (arena.current?.clientHeight ?? 440) - ROCK;
      const speed = floor / Math.max(4.5, 13 - 1.1 * (level - 1));
      g.spawnIn -= dt;
      if (g.spawnIn <= 0 || !g.rocks.length) {
        if (!g.queue.length) g.queue = shuffle(unique);
        const card = g.queue.shift()!;
        g.rocks.push({ id: g.nextId++, card, dir: pickDir(getState().settings), x: 10 + Math.random() * 80, y: -ROCK });
        g.spawnIn = Math.max(2.2, 6.5 - 0.6 * (level - 1));
      }
      for (const r of g.rocks) r.y += speed * dt;
      const hit = g.rocks.filter(r => r.y >= floor);
      if (hit.length) {
        g.rocks = g.rocks.filter(r => r.y < floor);
        g.lives -= hit.length;
        g.missed.push(...hit);
        g.queue.unshift(...hit.map(r => r.card));
        hit.forEach(r => addMiss(r.card.key));
        setLost(hit[hit.length - 1]);
      }
      if (g.lives <= 0) {
        g.over = true;
        setRunning(false);
        if (g.score > (getState().best.gravity ?? 0)) update(st => ({ best: { ...st.best, gravity: g.score } }));
      } else frame = requestAnimationFrame(tick);
      redraw();
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running, unique]);

  if (!unique.length) return <Empty text="Gravity needs at least 1 card." />;

  const g = game.current;
  const level = levelOf(g);
  const start = () => {
    if (g.over) game.current = fresh(unique);
    setLost(null); setTyped(""); setRunning(true);
    setTimeout(() => input.current?.focus());
  };
  const submit = () => {
    if (!typed.trim()) return;
    const settings = getState().settings;
    const target = [...g.rocks].sort((a, b) => b.y - a.y).find(r => check(typed, r.card, r.dir, settings).ok);
    if (target) {
      const floor = (arena.current?.clientHeight ?? 440) - ROCK;
      g.rocks = g.rocks.filter(r => r !== target);
      g.score += 10 * level + Math.round(10 * Math.max(0, 1 - target.y / floor));
      g.cleared++;
      if (settings.autoSpeak) speak(target.card.es);
      setTyped("");
      redraw();
    } else {
      setShake(true);
      setTimeout(() => setShake(false), 300);
    }
  };
  const best = s.best.gravity ?? 0;

  return (
    <>
      <ModeHeader title="Gravity">
        <span className="muted">Level {level}</span>
        <span className="lives">{"♥".repeat(Math.max(0, g.lives))}<span>{"♥".repeat(LIVES - Math.max(0, g.lives))}</span></span>
        <span className="timer">{g.score}</span>
        {running && <button onClick={() => setRunning(false)}>Pause</button>}
      </ModeHeader>
      <div className="arena" ref={arena}>
        {g.rocks.map(r => (
          <div key={r.id} className="rock" style={{ left: `${r.x}%`, top: r.y }}><Side card={r.card} dir={r.dir} side="front" /></div>
        ))}
        {!running && (
          <div className="arena-overlay">
            <div className="panel center">
              {g.over ? (
                <>
                  <h3>Game over</h3>
                  <p>Score <b>{g.score}</b>, level {level}. {g.score >= best ? "New high score!" : `High score: ${best}`}</p>
                  {g.missed.length > 0 && (
                    <div className="missed">
                      {[...new Map(g.missed.map(r => [r.card.key, r])).values()].map(r => (
                        <div key={r.card.key}><Side card={r.card} dir={r.dir} side="front" /> = <b className="term">{solution(r.card, r.dir)}</b></div>
                      ))}
                    </div>
                  )}
                  <button className="primary" onClick={start}>Play again</button>
                </>
              ) : g.rocks.length ? (
                <><h3>Paused</h3><button className="primary" onClick={start}>Resume</button></>
              ) : (
                <>
                  <h3>Gravity</h3>
                  <p className="muted">Words fall from the sky. Type the translation and press Enter before they hit the ground. It gets faster every {PER_LEVEL} words, and you have {LIVES} lives.</p>
                  {best > 0 && <p>High score: <b>{best}</b></p>}
                  <button className="primary" onClick={start}>Start</button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
      {lost && running && <p className="no center">Missed: <Side card={lost.card} dir={lost.dir} side="front" /> = <b className="term">{solution(lost.card, lost.dir)}</b></p>}
      <form className="bar" onSubmit={e => { e.preventDefault(); submit(); }}>
        <input ref={input} type="text" className={`answer ${shake ? "shake" : ""}`} value={typed} disabled={!running}
          onChange={e => setTyped(e.target.value)} placeholder="Type the answer and press Enter" autoComplete="off" autoCapitalize="off" spellCheck={false} />
      </form>
    </>
  );
}
