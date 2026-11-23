import { useMemo, useState, type ReactNode } from "react";
import { fold, guessGender, type Card, type Gender, type Vocab } from "./data";
import { ModeHeader, Spanish } from "./components";
import type { Picked } from "./selection";
import {
  addCard, deleteAdded, removeCard, resetChanges, restoreCard, revertEdit, saveCard, useStore, type CardFields,
} from "./store";

const GENDERS: [string, string][] = [["m", "Masculine (el)"], ["f", "Feminine (la)"], ["m/f", "Either (el / la)"], ["", "None"]];
const POS: [string, string][] = [["noun", "Noun"], ["verb", "Verb"], ["other", "Adjective / other"], ["phrase", "Phrase"]];

function guessPos(es: string) {
  const w = es.trim();
  if (guessGender(w)) return "noun";
  if (!w.includes(" ") && /(ar|er|ir)(se)?$/i.test(w)) return "verb";
  return "other";
}

interface Place { page: number; sub: number }

function CardForm({ vocab, initial, place, title, saveLabel, onSave, onCancel, children }: {
  vocab: Vocab; initial: CardFields; place?: Place; title: string; saveLabel: string;
  onSave: (f: CardFields, place?: Place) => void; onCancel: () => void; children?: ReactNode;
}) {
  const [es, setEs] = useState(initial.es);
  const [en, setEn] = useState(initial.en);
  const [gender, setGender] = useState<string>(initial.gender ?? "");
  const [pos, setPos] = useState(initial.pos);
  const [page, setPage] = useState(place ? String(place.page) : "");
  const [sub, setSub] = useState(place?.sub ?? 0);
  const [error, setError] = useState("");

  const changeEs = (v: string) => {
    const was = guessGender(es), now = guessGender(v);
    if (now && now !== was) setGender(now);
    if (place && guessPos(v) !== guessPos(es)) setPos(guessPos(v));
    setEs(v);
  };
  const changePage = (v: string) => {
    setPage(v);
    const p = Number(v);
    const hit = vocab.cards.find(c => c.page === p) ?? vocab.categories.flatMap(c => c.subs).find(x => x.first <= p && p <= x.last);
    if (hit) setSub("sub" in hit ? hit.sub : hit.id);
  };
  const submit = () => {
    if (!es.trim() || !en.trim()) return setError("Fill in both the Spanish term and the English definition.");
    const p = Number(page);
    if (place && (!Number.isInteger(p) || p < 1 || p > 999)) return setError("Enter the page number from your book.");
    if (place && !vocab.subs.has(sub)) return setError("Choose a topic for the card.");
    onSave({ es: es.trim().replace(/\s+/g, " "), en: en.trim().replace(/\s+/g, " "), gender: (gender || null) as Gender, pos }, place && { page: p, sub });
  };

  return (
    <form className="editform" onSubmit={e => { e.preventDefault(); submit(); }} onKeyDown={e => e.key === "Escape" && onCancel()}>
      <div className="label">{title}</div>
      <div className="fields">
        <label>Spanish term<input type="text" value={es} autoFocus onChange={e => changeEs(e.target.value)} placeholder="e.g. la fiebre del heno" /></label>
        <label>English definition<input type="text" value={en} onChange={e => setEn(e.target.value)} placeholder="e.g. hay fever" /></label>
        <label>Gender
          <select value={gender} onChange={e => setGender(e.target.value)}>{GENDERS.map(([v, n]) => <option key={v} value={v}>{n}</option>)}</select>
        </label>
        <label>Part of speech
          <select value={pos} onChange={e => setPos(e.target.value)}>{POS.map(([v, n]) => <option key={v} value={v}>{n}</option>)}</select>
        </label>
        {place && <>
          <label>Page in the book<input type="number" min={1} value={page} onChange={e => changePage(e.target.value)} /></label>
          <label>Topic
            <select value={sub} onChange={e => setSub(Number(e.target.value))}>
              {vocab.categories.map(c => (
                <optgroup key={c.id} label={c.en}>{c.subs.map(x => <option key={x.id} value={x.id}>{x.en} (p{x.first}-{x.last})</option>)}</optgroup>
              ))}
            </select>
          </label>
        </>}
      </div>
      {error && <div className="error">{error}</div>}
      <div className="bar">
        <button type="submit" className="primary">{saveLabel}</button>
        <button type="button" onClick={onCancel}>Cancel</button>
        <span className="spacer" />
        {children}
      </div>
    </form>
  );
}

const fields = (c: CardFields): CardFields => ({ es: c.es, en: c.en, gender: c.gender, pos: c.pos });
const Pair = ({ c }: { c: { es: string; en: string } }) => <span className="term"><b>{c.es}</b> = {c.en}</span>;

export function Editor({ base, vocab, picked }: { base: Vocab; vocab: Vocab; picked: Picked }) {
  const s = useStore();
  const [tab, setTab] = useState<"cards" | "changes">("cards");
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(60);
  const [notice, setNotice] = useState<{ text: string; undo?: () => void } | null>(null);

  const baseByKey = useMemo(() => new Map(base.cards.map(c => [c.key, c])), [base]);
  const byKey = useMemo(() => new Map(vocab.cards.map(c => [c.key, c])), [vocab]);
  const q = fold(query.trim());
  const list = picked.cards.filter(c => !q || fold(c.es).includes(q) || fold(c.en).includes(q));

  const edited = Object.entries(s.edits).filter(([k]) => baseByKey.has(k) && !s.removed[k]).sort((a, b) => b[1].at - a[1].at);
  const added = s.added.filter(a => !s.removed[a.key]).sort((a, b) => b.at - a.at);
  const removed = Object.entries(s.removed)
    .map(([key, at]) => ({ key, at, card: baseByKey.get(key) ?? s.added.find(a => a.key === key) }))
    .filter(x => x.card).sort((a, b) => b.at - a.at);
  const changes = edited.length + added.length + removed.length;

  const first = picked.cards[0];
  const startPlace: Place = { page: first?.page ?? base.pages[0], sub: first?.sub ?? base.categories[0].subs[0].id };
  const topic = (sub: number) => base.subs.get(sub)?.en ?? "";

  const remove = (c: Card) => {
    removeCard(c.key);
    if (editing === c.key) setEditing(null);
    setNotice({ text: `Removed "${c.es}". You can restore it any time under Your changes.`, undo: () => restoreCard(c.key) });
  };
  const save = (c: Card, f: CardFields) => {
    saveCard(c, f);
    setEditing(null);
    setNotice({ text: `Saved "${f.es} = ${f.en}".` });
  };
  const reset = () => {
    if (!confirm(`Undo all ${changes} of your changes?\n\nEvery card goes back to the book version and cards you added are deleted.`)) return;
    resetChanges(); setEditing(null); setNotice({ text: "All changes undone. Every card matches the book again." });
  };

  const editForm = (c: Card) => (
    <CardForm vocab={vocab} initial={fields(c)} title={c.added ? "Edit your card" : `Edit card, page ${c.page}`} saveLabel="Save changes"
      onSave={f => save(c, f)} onCancel={() => setEditing(null)}>
      {c.orig && <button type="button" className="link" onClick={() => { revertEdit(c.key); setEditing(null); setNotice({ text: `"${c.orig!.es}" is back to the book version.` }); }}>Revert to book version</button>}
    </CardForm>
  );

  return (
    <>
      <ModeHeader title="Edit cards" />
      <p className="muted">
        {picked.cards.length} cards in this selection{picked.describe ? `: ${picked.describe}` : ""}. Changes save automatically in this browser and show up in every study mode.
      </p>

      <div className="tabs">
        <button className={tab === "cards" ? "on" : ""} onClick={() => setTab("cards")}>Cards in this selection <span>{picked.cards.length}</span></button>
        <button className={tab === "changes" ? "on" : ""} onClick={() => setTab("changes")}>Your changes <span>{changes}</span></button>
        <span className="spacer" />
        {changes > 0 && <button className="danger" onClick={reset}>Reset all changes</button>}
      </div>

      {notice && (
        <div className="notice">
          <span>{notice.text}</span>
          <span className="spacer" />
          {notice.undo && <button className="link" onClick={() => { notice.undo!(); setNotice(null); }}>Undo</button>}
          <button className="tool" aria-label="Dismiss" onClick={() => setNotice(null)}>✕</button>
        </div>
      )}

      {tab === "cards" ? (
        <>
          <div className="findadd">
            {picked.cards.length > 8 && (
              <input type="search" className="search" value={query} onChange={e => { setQuery(e.target.value); setShown(60); }} placeholder="Find a card in this selection" />
            )}
            {adding ? (
              <div className="panel">
                <CardForm vocab={vocab} initial={{ es: "", en: "", gender: null, pos: "noun" }} place={startPlace} title="Add a new card" saveLabel="Add card"
                  onCancel={() => setAdding(false)}
                  onSave={(f, p) => {
                    const key = addCard({ ...f, ...p! });
                    setAdding(false);
                    setNotice({ text: `Added "${f.es} = ${f.en}" on page ${p!.page}.`, undo: () => deleteAdded(key) });
                  }} />
              </div>
            ) : (
              <button className="primary addnew" onClick={() => { setAdding(true); setEditing(null); }}>+ Add New Card</button>
            )}
          </div>
          {list.length ? (
            <div className="terms edits">
              {list.slice(0, shown).map(c => editing === c.key ? (
                <div className="row editing" key={c.key}>{editForm(c)}</div>
              ) : (
                <div className="row" key={c.key}>
                  <span className="es"><Spanish card={c} /></span>
                  <span className="term">{c.en}{c.added ? <span className="tag">Added</span> : c.orig ? <span className="tag">Edited</span> : null}</span>
                  <span className="pg">p{c.page}</span>
                  <span className="tools">
                    <button onClick={() => { setEditing(c.key); setAdding(false); }}>Edit this Card</button>
                    <button className="danger-ghost" onClick={() => remove(c)}>Remove Card</button>
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted center">{q ? "No cards match." : "No cards in this selection. Pick pages or topics on the Study page, or add a new card."}</p>
          )}
          {shown < list.length && <div className="bar center"><button onClick={() => setShown(shown + 200)}>Show more ({list.length - shown} left)</button></div>}
        </>
      ) : changes === 0 ? (
        <div className="panel center"><p>No changes yet. Every card matches the book.</p></div>
      ) : (
        <>
          {edited.length > 0 && <>
            <h2>Edited cards ({edited.length})</h2>
            <div className="terms changes">
              {edited.map(([key, e]) => {
                const c = byKey.get(key)!, b = baseByKey.get(key)!;
                return editing === key ? <div className="row editing" key={key}>{editForm(c)}</div> : (
                  <div className="row" key={key}>
                    <span><span className="label">Book, p{b.page}</span><br /><s className="muted"><Pair c={b} /></s></span>
                    <span><span className="label">Your version</span><br /><Pair c={e} /></span>
                    <span className="tools">
                      <button onClick={() => setEditing(key)}>Edit</button>
                      <button onClick={() => { revertEdit(key); setNotice({ text: `"${b.es}" is back to the book version.` }); }}>Revert</button>
                    </span>
                  </div>
                );
              })}
            </div>
          </>}
          {added.length > 0 && <>
            <h2>Cards you added ({added.length})</h2>
            <div className="terms changes">
              {added.map(a => editing === a.key ? <div className="row editing" key={a.key}>{editForm(byKey.get(a.key)!)}</div> : (
                <div className="row" key={a.key}>
                  <Pair c={a} />
                  <span className="muted">Page {a.page}, {topic(a.sub)}</span>
                  <span className="tools">
                    <button onClick={() => setEditing(a.key)}>Edit</button>
                    <button className="danger-ghost" onClick={() => { if (confirm(`Delete your card "${a.es}"?`)) deleteAdded(a.key); }}>Delete</button>
                  </span>
                </div>
              ))}
            </div>
          </>}
          {removed.length > 0 && <>
            <h2>Removed cards ({removed.length})</h2>
            <div className="terms changes">
              {removed.map(({ key, card }) => (
                <div className="row" key={key}>
                  <Pair c={s.edits[key] ?? card!} />
                  <span className="muted">Page {card!.page}, {topic(card!.sub)}{key.startsWith("added|") ? " (your card)" : ""}</span>
                  <span className="tools"><button onClick={() => { restoreCard(key); setNotice({ text: `Restored "${card!.es}".` }); }}>Restore</button></span>
                </div>
              ))}
            </div>
          </>}
        </>
      )}
    </>
  );
}


