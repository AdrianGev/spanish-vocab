import { useEffect } from "react";
import type { Vocab } from "./data";
import { Picker } from "./Picker";
import { TermList } from "./TermList";
import type { Picked } from "./selection";
import { useStore } from "./store";

const ICONS: Record<string, string[]> = {
  flashcards: ["M12 2 2 7l10 5 10-5-10-5Z", "m2 17 10 5 10-5", "m2 12 10 5 10-5"],
  gravity: ["M13 16a5 5 0 1 1-10 0 5 5 0 0 1 10 0Z", "M11.5 12.5 21 3", "M7 11l6-6", "M13 17l6-6"],
  learn: ["M22 10 12 5 2 10l10 5 10-5Z", "M6 12v5c3 3 9 3 12 0v-5", "M22 10v6"],
  test: ["M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2", "M9 3h6v4H9z", "m9 14 2 2 4-4"],
  match: ["M13 2 3 14h9l-1 8 10-12h-9l1-8z"],
  export: ["M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8", "m16 6-4-4-4 4", "M12 2v13"],
};

export function Home({ vocab, picked }: { vocab: Vocab; picked: Picked }) {
  const s = useStore();
  const n = picked.cards.length;
  const modes: [string, string, string, boolean?][] = [
    ["flashcards", "Flashcards", "Flip through and sort what you know"],
    ["gravity", "Gravity", s.best.gravity ? `Falling words, high score ${s.best.gravity}` : "Type the answer before words hit the ground"],
    ["learn", "Learn", "Multiple choice, then written, until mastered"],
    ["test", "Test", "A practice test with a score"],
    ["match", "Match", n < 2 ? "Needs at least 2 cards" : "Race the clock pairing words", n < 2],
    ["export", "Export", "Knowt, Quizlet, copy or CSV"],
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
        {modes.map(([id, name, note, off]) => (
          <a key={id} href={`#/${id}`} className={`${id} ${off || !n ? "off" : ""}`} title={`Shortcut: ${name[0]}`}>
            <svg viewBox="0 0 24 24" aria-hidden="true">{ICONS[id].map(d => <path key={d} d={d} />)}</svg>
            <b>{name}</b><span>{note}</span>
          </a>
        ))}
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
