import { useEffect } from "react";
import type { Vocab } from "./data";
import { Picker } from "./Picker";
import { TermList } from "./TermList";
import type { Picked } from "./selection";

const ICONS: Record<string, string[]> = {
  flashcards: ["M12 2 2 7l10 5 10-5-10-5Z", "m2 17 10 5 10-5", "m2 12 10 5 10-5"],
  learn: ["M22 10 12 5 2 10l10 5 10-5Z", "M6 12v5c3 3 9 3 12 0v-5", "M22 10v6"],
  export: ["M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8", "m16 6-4-4-4 4", "M12 2v13"],
  matching: ["m8 3-4 4 4 4", "M4 7h16", "m16 21 4-4-4-4", "M20 17H4"],
  written: ["M12 20h9", "M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"],
  translate: ["M11 5 6 9H2v6h4l5 4V5Z", "M15.54 8.46a5 5 0 0 1 0 7.07", "M19.07 4.93a10 10 0 0 1 0 14.14"],
};

export function Home({ vocab, picked }: { vocab: Vocab; picked: Picked }) {
  const n = picked.cards.length;
  const modes: [string, string, string, boolean?][] = [
    ["flashcards", "Flashcards", "Flip through and sort what you know"],
    ["learn", "Learn", "Multiple choice, then written, until mastered"],
    ["export", "Export", "Knowt, Quizlet, copy or CSV"],
    ["matching", "Matching", n < 2 ? "Needs at least 2 cards" : "Match each word to its meaning", n < 2],
    ["written", "Written", "Write the translation next to each word"],
    ["translate", "Translate", "Hear each word, write it down"],
  ];
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select, [contenteditable]")) return;
      const m = modes.find(([, name, , off]) => name[0].toLowerCase() === e.key.toLowerCase() && !off && n);
      if (m) { e.preventDefault(); location.hash = `#/${m[0]}`; }
    };
    addEventListener("keydown", key);
    return () => removeEventListener("keydown", key);
  });
  return (
    <>
      <Picker vocab={vocab} picked={picked} />
      <nav className="modes">
        {modes.map(([id, name, note, off], i) => [
          i === 3 && <div key="quiz" className="modes-label">Quiz practice</div>,
          <a key={id} href={`#/${id}`} className={`${id} ${off || !n ? "off" : ""}`} title={`Shortcut: ${name[0]}`}>
            <svg viewBox="0 0 24 24" aria-hidden="true">{ICONS[id].map(d => <path key={d} d={d} />)}</svg>
            <b>{name}</b><span>{note}</span>
          </a>,
        ])}
      </nav>
      <div className="panel editbar">
        <div>
          <b>Need to edit, add, or remove cards?</b>
          <span className="muted">Fix anything the scan missed or that your copy of the book prints differently.</span>
        </div>
        <a className="btn primary" href="#/edit">Edit Current Selection</a>
      </div>
      <h2>Terms in this selection ({n})</h2>
      <TermList cards={picked.cards} vocab={vocab} />
    </>
  );
}
