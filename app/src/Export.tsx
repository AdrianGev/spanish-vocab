import { useState } from "react";
import type { Card, Vocab } from "./data";
import { Empty, ModeHeader } from "./components";
import { csv, download } from "./download";

const TERM_SEPS: Record<string, string> = { tab: "\t", comma: ",", dash: " - " };
const CARD_SEPS: Record<string, string> = { "new line": "\n", semicolon: ";" };

export function Export({ vocab, cards, describe }: { vocab: Vocab; cards: Card[]; describe: string }) {
  const [first, setFirst] = useState<"es" | "en">("es");
  const [termSep, setTermSep] = useState("tab");
  const [cardSep, setCardSep] = useState("new line");
  const [customTerm, setCustomTerm] = useState(" = ");
  const [customCard, setCustomCard] = useState("\n\n");
  const [dedupe, setDedupe] = useState(true);
  const [copied, setCopied] = useState(false);

  if (!cards.length) return <Empty text="No cards selected." />;

  const ts = TERM_SEPS[termSep] ?? customTerm;
  const cs = CARD_SEPS[cardSep] ?? customCard.replace(/\\n/g, "\n");
  const list = dedupe ? [...new Map(cards.map(c => [`${c.es}|${c.en}`, c])).values()] : cards;
  const pairs = list.map(c => (first === "es" ? [c.es, c.en] : [c.en, c.es]));
  const text = pairs.map(p => p.join(ts)).join(cs);
  const clashes = pairs.filter(p => p.some(x => (ts.trim() && x.includes(ts.trim())) || (cs.trim() && x.includes(cs.trim())))).length;
  const name = describe.replace(/[^\w -]+/g, "").trim().replace(/\s+/g, "-").slice(0, 60) || "vocab";
  const knowt = termSep === "tab" && cardSep === "new line";

  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <>
      <ModeHeader title="Export" />
      <p>{list.length} cards: {describe}</p>
      <div className="panel">
        <div className="bar">
          <span className="label">Preset</span>
          <button className={`chip ${knowt && first === "es" ? "on" : ""}`} onClick={() => { setTermSep("tab"); setCardSep("new line"); setFirst("es"); }}>Knowt / Quizlet</button>
          <button className={`chip ${termSep === "comma" ? "on" : ""}`} onClick={() => { setTermSep("comma"); setCardSep("new line"); }}>Comma separated</button>
        </div>
        <div className="bar">
          <span className="label">Term</span>
          <select value={first} onChange={e => setFirst(e.target.value as "es" | "en")} aria-label="term side">
            <option value="es">Spanish (definition English)</option>
            <option value="en">English (definition Spanish)</option>
          </select>
          <label><input type="checkbox" checked={dedupe} onChange={e => setDedupe(e.target.checked)} /> Skip duplicates</label>
        </div>
        <div className="bar">
          <span className="label">Between term and definition</span>
          {[...Object.keys(TERM_SEPS), "custom"].map(k => <button key={k} className={`chip ${termSep === k ? "on" : ""}`} onClick={() => setTermSep(k)}>{k.charAt(0).toUpperCase() + k.slice(1)}</button>)}
          {termSep === "custom" && <input type="text" value={customTerm} onChange={e => setCustomTerm(e.target.value)} className="keep-case" style={{ width: 100 }} />}
        </div>
        <div className="bar">
          <span className="label">Between cards</span>
          {[...Object.keys(CARD_SEPS), "custom"].map(k => <button key={k} className={`chip ${cardSep === k ? "on" : ""}`} onClick={() => setCardSep(k)}>{k.charAt(0).toUpperCase() + k.slice(1)}</button>)}
          {cardSep === "custom" && <input type="text" value={customCard.replace(/\n/g, "\\n")} onChange={e => setCustomCard(e.target.value)} className="keep-case" style={{ width: 100 }} />}
        </div>
        {knowt && (
          <p className="muted">
            Knowt: create a new flashcard set, choose Import, paste this in, and set the separators to Tab (between term and definition) and New line (between cards).
            Quizlet's import box reads the same format.
          </p>
        )}
        {clashes > 0 && <p className="error">{clashes} cards contain the separator, so they'll split wrong. Tab is the safest choice.</p>}
        <textarea readOnly value={text} onFocus={e => e.target.select()} aria-label="export text" />
        <div className="bar">
          <button className="primary" onClick={copy}>{copied ? "Copied!" : "Copy to clipboard"}</button>
          <button onClick={() => download(`${name}.txt`, text)}>Download .txt</button>
          <button onClick={() => download(`${name}.csv`, csv([["spanish", "english", "gender", "page", "topic"], ...list.map(c => [c.es, c.en, c.gender, c.page, vocab.subs.get(c.sub)!.en])]), "text/csv")}>Download .csv</button>
        </div>
      </div>
    </>
  );
}
