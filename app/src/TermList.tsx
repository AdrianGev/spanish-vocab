import { useState } from "react";
import type { Card, Vocab } from "./data";
import { showPages, Spanish, Tools } from "./components";

export function TermList({ cards, vocab }: { cards: Card[]; vocab: Vocab }) {
  const [shown, setShown] = useState(100);
  if (!cards.length) return <p className="muted">No cards.</p>;
  return (
    <>
      <div className="terms">
        {cards.slice(0, shown).map(c => (
          <div className="row" key={c.id}>
            <span className="es"><Spanish card={c} /></span>
            <span className="term">{c.en}{c.added ? <span className="tag">Added</span> : c.orig ? <span className="tag">Edited</span> : null}</span>
            <span className="tools">{!showPages && <span className="pg">p{c.page}</span>}<Tools card={c} vocab={vocab} /></span>
          </div>
        ))}
      </div>
      {shown < cards.length && (
        <div className="bar center"><button onClick={() => setShown(shown + 200)}>Show more ({cards.length - shown} left)</button></div>
      )}
    </>
  );
}
