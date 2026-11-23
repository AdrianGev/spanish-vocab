import { useDeferredValue, useState } from "react";
import { fold, type Vocab } from "./data";
import { TermList } from "./TermList";

export function Browse({ vocab }: { vocab: Vocab }) {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState(0);
  const q = fold(useDeferredValue(query).trim());
  const cards = vocab.cards.filter(c => (!cat || vocab.subs.get(c.sub)!.cat === cat) && (!q || fold(c.es).includes(q) || fold(c.en).includes(q)));
  return (
    <>
      <div className="bar">
        <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search Spanish or English" autoFocus className="search" />
        <select value={cat} onChange={e => setCat(Number(e.target.value))} aria-label="category">
          <option value={0}>All topics</option>
          {vocab.categories.map(c => <option key={c.id} value={c.id}>{c.en}</option>)}
        </select>
      </div>
      <h2>{cards.length} cards</h2>
      <TermList key={`${q}|${cat}`} cards={cards} vocab={vocab} />
    </>
  );
}
