import { useEffect, useMemo, useState } from "react";
import { About } from "./About";
import { applyChanges, loadVocab, type Vocab } from "./data";
import { Editor } from "./Editor";
import { Browse } from "./Browse";
import { Export } from "./Export";
import { Flashcards } from "./Flashcards";
import { Home } from "./Home";
import { Learn } from "./Learn";
import { Matching, Translate, Written } from "./QuizPractice";
import { pick } from "./selection";
import { SettingsPage } from "./SettingsPage";
import { storageError, useStore } from "./store";

const NAV = [["", "Study"], ["browse", "Browse"], ["about", "About"], ["settings", "Settings"]];

function useRoute() {
  const [route, setRoute] = useState(location.hash.slice(2));
  useEffect(() => {
    const h = () => { setRoute(location.hash.slice(2)); scrollTo(0, 0); };
    addEventListener("hashchange", h);
    return () => removeEventListener("hashchange", h);
  }, []);
  return route;
}

export function App() {
  const [base, setBase] = useState<Vocab | null>(null);
  const [error, setError] = useState("");
  const route = useRoute();
  const s = useStore();
  useEffect(() => {
    document.documentElement.dataset.theme = s.settings.theme === "dark" ? "dark" : "light";
  }, [s.settings.theme]);
  useEffect(() => { loadVocab().then(setBase, e => setError(String(e))); }, []);
  const vocab = useMemo(() => base && applyChanges(base, s), [base, s.edits, s.removed, s.added]);
  const picked = useMemo(() => vocab && pick(vocab, s.sel, s), [vocab, s.sel, s.stars, s.misses, s.settings]);
  const frozen = useMemo(() => picked?.cards ?? [], [route, vocab]);

  const nav = (
    <header>
      <h1><a href="#/">AP Spanish Dictionary Vocab Tool Thing</a></h1>
      <nav>{NAV.map(([id, name]) => <a key={id} href={`#/${id}`} className={(NAV.some(n => n[0] === route) ? route : "") === id ? "on" : ""}>{name}</a>)}</nav>
    </header>
  );
  const note = route === "" && (
    <div className="subbar">
      <b>Note:</b> This dataset is based on a very SLIGHTLY different version of the book so there is a small chance 1-2 words on any given page have been added or removed. The books match roughly 99.8% from the download I found online, but it's worth checking and then editing your cards with the option below.
    </div>
  );
  if (!base || !vocab || !picked) return <>{nav}{note}<main><p className="center">{error || "Loading…"}</p></main></>;

  const cards = frozen;
  const page = {
    "": <Home vocab={vocab} picked={picked} />,
    flashcards: <Flashcards vocab={vocab} cards={cards} />,
    learn: <Learn vocab={vocab} cards={cards} />,
    matching: <Matching cards={cards} />,
    written: <Written cards={cards} />,
    translate: <Translate cards={cards} />,
    export: <Export vocab={vocab} cards={cards} describe={picked.describe} />,
    browse: <Browse vocab={vocab} />,
    about: <About vocab={base} />,
    settings: <SettingsPage />,
    edit: <Editor base={base} vocab={vocab} picked={picked} />,
  }[route] ?? <p>Page not found. <a href="#/">Go home</a></p>;

  return (
    <>
      {nav}
      {note}
      <main>
        {storageError() && <div className="warn">{storageError()}</div>}
        <div key={route}>{page}</div>
      </main>
    </>
  );
}
