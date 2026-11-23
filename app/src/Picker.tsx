import { useState } from "react";
import type { Vocab } from "./data";
import { POS, STATUS, type Picked } from "./selection";
import { emptySelection, update, useStore, type Selection } from "./store";

export function Picker({ vocab, picked }: { vocab: Vocab; picked: Picked }) {
  const s = useStore();
  const sel = s.sel;
  const [topics, setTopics] = useState(sel.subs.length > 0);
  const set = (patch: Partial<Selection>) => update(st => ({ sel: { ...st.sel, ...patch } }));
  const toggle = <T,>(xs: T[], x: T) => (xs.includes(x) ? xs.filter(y => y !== x) : [...xs, x]);
  const subs = new Set(sel.subs);

  return (
    <section className="panel picker">
      <div className="label">Pages</div>
      <div className="pages">
        <input type="text" value={sel.pages} placeholder="Type pages, e.g. 44-45 or 12-20, 30, !15"
          onChange={e => set({ pages: e.target.value })} onKeyDown={e => (e.key === "Enter" || e.key === "Escape") && e.currentTarget.blur()} aria-label="pages" />
        <button onClick={() => setTopics(!topics)}>{topics ? "Hide topics" : "Choose topics"}{sel.subs.length ? ` (${sel.subs.length})` : ""}</button>
        <button onClick={() => update(() => ({ sel: emptySelection }))}>Clear</button>
        <div className="summary">
          <b>{picked.cards.length} {picked.cards.length === 1 ? "card" : "cards"}</b>
          {picked.describe && <span className="muted" title={picked.describe}>{picked.describe}</span>}
        </div>
      </div>
      {picked.errors.map(e => <div key={e} className="error">{e}</div>)}
      {topics && (
        <div className="cats">
          {vocab.categories.map(cat => {
            const all = cat.subs.every(x => subs.has(x.id));
            const some = cat.subs.some(x => subs.has(x.id));
            return (
              <div className="cat" key={cat.id}>
                <button className={`chip ${all ? "on" : ""}`}
                  onClick={() => set({ subs: all ? sel.subs.filter(id => !cat.subs.some(x => x.id === id)) : [...new Set([...sel.subs, ...cat.subs.map(x => x.id)])] })}>
                  <span>{cat.en}</span><span>{some && !all ? "Some" : `p${cat.subs[0].first}-${cat.subs[cat.subs.length - 1].last}`}</span>
                </button>
                <div className="subs">
                  {cat.subs.map(x => (
                    <button key={x.id} title={`${x.es}, pages ${x.first}-${x.last}`} className={`chip ${subs.has(x.id) ? "on" : ""}`}
                      onClick={() => set({ subs: toggle(sel.subs, x.id) })}>{x.en}</button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div className="filters">
        {POS.map(([id, name]) => (
          <button key={id} className={`chip ${sel.pos.includes(id) ? "on" : ""}`} onClick={() => set({ pos: toggle(sel.pos, id) })}>{name}</button>
        ))}
        <select value={sel.status} onChange={e => set({ status: e.target.value as Selection["status"] })} aria-label="status">
          {STATUS.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>
      </div>
    </section>
  );
}
