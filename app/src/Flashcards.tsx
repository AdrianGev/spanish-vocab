import { useEffect, useMemo, useState } from "react";
import { shuffle, type Card, type Vocab } from "./data";
import { Empty, ModeHeader, Notes, Progress, Side, Tools, useKeys } from "./components";
import { preload, speak } from "./speak";
import { toggleStar, useStore, type Dir } from "./store";

type Front = Dir | "mixed";

export function Flashcards({ vocab, cards }: { vocab: Vocab; cards: Card[] }) {
  const s = useStore();
  const [front, setFront] = useState<Front>(s.settings.direction === "both" ? "mixed" : s.settings.direction);
  const [shuffled, setShuffled] = useState(false);
  const [deck, setDeck] = useState(cards);
  const order = useMemo(() => (shuffled ? shuffle(deck) : deck), [deck, shuffled]);
  const dirOf = useMemo(() => new Map(order.map(c => [c.id, front === "mixed" ? (Math.random() < 0.5 ? "es-en" : "en-es") : front] as const)), [order, front]);
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [sorted, setSorted] = useState<Record<number, boolean>>({});

  const card = order[i];
  useEffect(() => { preload(order.slice(i, i + 3).map(c => c.es)); }, [order, i, s.settings.voice]);
  const dir = card && dirOf.get(card.id)!;
  const known = order.filter(c => sorted[c.id]).length;
  const learning = order.filter(c => sorted[c.id] === false);

  const flip = () => {
    if (!flipped && s.settings.autoSpeak && dir === "en-es") speak(card.es);
    setFlipped(!flipped);
  };
  const go = (k: boolean) => {
    setSorted({ ...sorted, [card.id]: k });
    setFlipped(false);
    setI(i + 1);
    const next = order[i + 1];
    if (next && s.settings.autoSpeak && dirOf.get(next.id) === "es-en") speak(next.es);
  };
  const back = () => { if (i > 0) { setI(i - 1); setFlipped(false); } };
  const restart = (xs: Card[]) => { setDeck(xs); setSorted({}); setI(0); setFlipped(false); };

  useKeys(e => {
    if (!card) return;
    if (e.key === " " || e.key === "ArrowUp" || e.key === "ArrowDown") { e.preventDefault(); flip(); }
    else if (e.key === "ArrowRight") go(true);
    else if (e.key === "ArrowLeft") go(false);
    else if (e.key === "Backspace" || e.key === "z") back();
    else if (e.key === "s") toggleStar(card.key);
  });

  if (!cards.length) return <Empty text="No cards selected." />;

  return (
    <>
      <ModeHeader title="Flashcards">
        <select value={front} onChange={e => setFront(e.target.value as Front)} aria-label="front side">
          <option value="es-en">Spanish first</option>
          <option value="en-es">English first</option>
          <option value="mixed">Mixed</option>
        </select>
        <button className={`chip ${shuffled ? "on" : ""}`} onClick={() => { setShuffled(!shuffled); setI(0); setSorted({}); setFlipped(false); }}>Shuffle</button>
      </ModeHeader>
      <Progress value={i} max={order.length} />
      {card ? (
        <>
          <div className="bar"><span className="no">Still learning {learning.length}</span><span className="spacer" />{i + 1} / {order.length}<span className="spacer" /><span className="ok">Know {known}</span></div>
          <div className={`card ${flipped ? "back" : ""}`} onClick={flip}>
            <span className="corner label">{flipped ? "Answer" : dir === "es-en" ? "Spanish" : "English"}</span>
            <span className="corner r label">{vocab.subs.get(card.sub)!.en}, p{card.page}</span>
            <div className="big"><Side card={card} dir={dir} side={flipped ? "back" : "front"} /></div>
            {flipped === (dir === "en-es") && <Notes card={card} />}
            <span className="hint">Click or press <kbd>Space</kbd> to flip</span>
          </div>
          <div className="bar center"><Tools card={card} vocab={vocab} /></div>
          <div className="bar center">
            <button onClick={back} disabled={!i}>Undo <kbd>Z</kbd></button>
            <button onClick={() => go(false)}>← Still learning</button>
            <button className="primary" onClick={() => go(true)}>Know it →</button>
          </div>
        </>
      ) : (
        <div className="panel center" style={{ marginTop: 16 }}>
          <h3>Round complete</h3>
          <p>You know <b className="ok">{known}</b> and are still learning <b className="no">{learning.length}</b>.</p>
          <div className="bar center">
            {learning.length > 0 && <button className="primary" onClick={() => restart(learning)}>Keep going with {learning.length}</button>}
            <button onClick={() => restart(cards)}>Restart all</button>
            <a href="#/learn">Try Learn mode</a>
          </div>
        </div>
      )}
    </>
  );
}
