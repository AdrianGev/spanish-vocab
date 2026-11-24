import { useEffect, useState, type ReactNode } from "react";
import { genderClass, genderNote, splitArticle, type Card, type Vocab } from "./data";
import { toggleStar, useStore, type Dir } from "./store";
import { canSpeak, speak } from "./speak";

export const showPages = import.meta.env.DEV;

export function Spanish({ card }: { card: Card }) {
  const [art, rest] = splitArticle(card.es);
  return (
    <span className="term">
      {art && <span className={genderClass(card)}>{art} </span>}
      {rest}
    </span>
  );
}

export function Side({ card, dir, side }: { card: Card; dir: Dir; side: "front" | "back" }) {
  const spanish = (dir === "es-en") === (side === "front");
  return spanish ? <Spanish card={card} /> : <span className="term">{card.en}</span>;
}

export function Notes({ card }: { card: Card }) {
  const note = genderNote(card);
  return (
    <>
      {note && <div className={`sub ${genderClass(card)}`}>{note}{card.number === "pl" ? ", plural" : ""}</div>}
      {card.orig && <div className="sub">You edited this card. Book: <span className="term">{card.orig.es} = {card.orig.en}</span></div>}
      {card.added && <div className="sub">A card you added</div>}
      {!card.orig && (card.printedEs || card.printedEn) && (
        <div className="sub">Book prints: <span className="term">{card.printedEs ?? card.es} = {card.printedEn ?? card.en}</span></div>
      )}
    </>
  );
}

export function Tools({ card, vocab }: { card: Card; vocab: Vocab }) {
  const s = useStore();
  const [peek, setPeek] = useState(false);
  return (
    <span className="tools" onClick={e => e.stopPropagation()}>
      {canSpeak && <button className="tool" title="Pronounce" onClick={() => speak(card.es)}>Say</button>}
      <button className={`tool star ${s.stars[card.key] ? "on" : ""}`} title={s.stars[card.key] ? "Unstar" : "Star"} aria-pressed={!!s.stars[card.key]} onClick={() => toggleStar(card.key)}>
        <svg viewBox="0 0 24 24"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5-4.8-4.6 6.6-.9z" /></svg>
      </button>
      {showPages && vocab.pageImages[card.page] && <button className="tool" title="Show the book page" onClick={() => setPeek(true)}>p{card.page}</button>}
      {peek && <PagePeek card={card} vocab={vocab} onClose={() => setPeek(false)} />}
    </span>
  );
}

export function PagePeek({ card, vocab, onClose }: { card: Card; vocab: Vocab; onClose: () => void }) {
  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    addEventListener("keydown", key);
    return () => removeEventListener("keydown", key);
  }, [onClose]);
  const file = `page_${String(vocab.pageImages[card.page]).padStart(4, "0")}.jpg`;
  return (
    <div className="modal" onClick={onClose}>
      <div>
        <div className="bar"><span className="label">Page {card.page}</span><span className="spacer" /><button onClick={onClose}>Close</button></div>
        <img src={`/pages/${file}`} alt={`book page ${card.page}`} />
      </div>
    </div>
  );
}

export function Progress({ value, max }: { value: number; max: number }) {
  return <div className="progress"><div style={{ width: `${max ? (100 * value) / max : 0}%` }} /></div>;
}

export function ModeHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="bar">
      <a href="#/" className="backlink">Back</a>
      <h3 style={{ margin: 0 }}>{title}</h3>
      <span className="spacer" />
      {children}
    </div>
  );
}

export function Empty({ text }: { text: string }) {
  return <p className="muted center">{text} <a href="#/">Pick some cards</a></p>;
}

export function useKeys(handler: (e: KeyboardEvent) => void) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || e.ctrlKey || e.metaKey || e.altKey) return;
      if (t.tagName === "BUTTON" && (e.key === "Enter" || e.key === " ")) e.preventDefault();
      handler(e);
    };
    addEventListener("keydown", h);
    return () => removeEventListener("keydown", h);
  });
}

export function Mark({ ok }: { ok: boolean }) {
  return (
    <svg className={`mark ${ok ? "yes" : "x"}`} viewBox="0 0 24 24" role="img" aria-label={ok ? "Correct" : "Wrong"}>
      <path d={ok ? "M4.5 12.5l5 5L19.5 7" : "M6 6l12 12M18 6 6 18"} />
    </svg>
  );
}
