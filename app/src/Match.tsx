import { useEffect, useState } from "react";
import { shuffle, type Card } from "./data";
import { Empty, ModeHeader, Spanish } from "./components";
import { update, useStore } from "./store";

const PAIRS = 6;
const PENALTY = 1000;

interface Tile { id: string; card: Card; side: "es" | "en" }

function deal(cards: Card[]): Tile[] {
  const unique = [...new Map(cards.map(c => [c.en.toLowerCase(), c])).values()];
  return shuffle(shuffle(unique).slice(0, PAIRS).flatMap(card => [{ id: `${card.id}es`, card, side: "es" as const }, { id: `${card.id}en`, card, side: "en" as const }]));
}

export function Match({ cards }: { cards: Card[] }) {
  const s = useStore();
  const [tiles, setTiles] = useState(() => deal(cards));
  const [gone, setGone] = useState<Set<string>>(new Set());
  const [sel, setSel] = useState<Tile | null>(null);
  const [bad, setBad] = useState<string[]>([]);
  const [start, setStart] = useState(Date.now());
  const [penalty, setPenalty] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [final, setFinal] = useState<number | null>(null);
  const bestKey = `match${tiles.length / 2}`;

  useEffect(() => {
    if (final !== null) return;
    const t = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(t);
  }, [final]);

  if (cards.length < 2) return <Empty text="Match needs at least 2 cards." />;

  const click = (t: Tile) => {
    if (!sel) return setSel(t);
    if (sel.id === t.id) return setSel(null);
    if (sel.card.id === t.card.id && sel.side !== t.side) {
      const g = new Set(gone).add(sel.id).add(t.id);
      setGone(g);
      if (g.size === tiles.length) {
        const time = Date.now() - start + penalty;
        setFinal(time);
        if (!s.best[bestKey] || time < s.best[bestKey]) update(st => ({ best: { ...st.best, [bestKey]: time } }));
      }
    } else {
      setBad([sel.id, t.id]);
      setPenalty(penalty + PENALTY);
      setTimeout(() => setBad([]), 400);
    }
    setSel(null);
  };
  const again = () => { setTiles(deal(cards)); setGone(new Set()); setSel(null); setStart(Date.now()); setPenalty(0); setFinal(null); };
  const secs = ((final ?? now - start + penalty) / 1000).toFixed(1);

  return (
    <>
      <ModeHeader title="Match"><span className="timer">{secs}s</span>{s.best[bestKey] && <span className="muted">Best {(s.best[bestKey] / 1000).toFixed(1)}s</span>}</ModeHeader>
      <p className="muted">Pick a Spanish word and its English meaning. Wrong pairs add 1 second.</p>
      {final === null ? (
        <div className="tiles">
          {tiles.map(t => (
            <button key={t.id} className={`${gone.has(t.id) ? "gone" : ""} ${sel?.id === t.id ? "sel" : ""} ${bad.includes(t.id) ? "bad" : ""}`} onClick={() => click(t)}>
              {t.side === "es" ? <Spanish card={t.card} /> : <span className="term">{t.card.en}</span>}
            </button>
          ))}
        </div>
      ) : (
        <div className="panel center">
          <h3>{secs} seconds</h3>
          <p>{final <= (s.best[bestKey] ?? Infinity) ? "New best time!" : `Best: ${(s.best[bestKey] / 1000).toFixed(1)}s`}</p>
          <button className="primary" onClick={again}>Play again</button>
        </div>
      )}
    </>
  );
}
