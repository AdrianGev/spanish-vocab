import type { Vocab } from "./data";

export function About({ vocab }: { vocab: Vocab }) {
  const subs = vocab.subs.size;
  return (
    <div className="about">
      <div className="panel">
        <h3>About this vocab bank</h3>
        <p>
          Every card comes from the <i>DK Spanish-English Bilingual Visual Dictionary</i> (2nd edition) from archive.org. The bank has{" "}
          <b>{vocab.cards.length.toLocaleString()} cards</b> in {vocab.categories.length} sections and {subs} topics, covering
          pages {vocab.pages[0]}-{vocab.pages[vocab.pages.length - 1]}. Each card keeps the book's own wording, its page number and
          its topic, so you can study exactly the pages you want.
        </p>
      </div>

      <div className="panel">
        <h3>1. Reading the pages</h3>
        <p>
          The starting point was a scanned copy of the book. Every page was run through a text recognition script in Python using Tesseract OCR in both Spanish and
          English, and the output kept the position of every word on the page, not just the text. Several recognition settings
          were compared on six test pages that were transcribed by hand first, and the most accurate one was used for the whole
          book. Every page was then transcribed a second time, independently, straight from the page image.
        </p>
      </div>

      <div className="panel">
        <h3>2. Sorting the words</h3>
        <p>A visual dictionary has no lines of text to follow, just labels scattered around pictures, so the words were sorted by a set of rules:</p>
        <ul>
          <li><b>Sections:</b> each page header is matched to one of the book's 15 sections. Sections can only move forward through the book, so a badly scanned header can't throw a page into the wrong section.</li>
          <li><b>Topics:</b> a heading only starts a new topic if it appears in the book's table of contents. Topics that start partway down a page are assigned by position.</li>
          <li><b>Spanish or English:</b> each piece of text is classified by language, using the book's own Spanish and English indexes as word lists.</li>
          <li><b>Pairing:</b> labels that wrap onto two lines are joined back together by position, then each Spanish label is paired with the English line printed directly under it.</li>
          <li><b>Dictionary check:</b> every pair is checked against a Spanish-English dictionary and marked as a match, partial match, unknown or mismatch, so the doubtful pairs get extra checking.</li>
          <li><b>Grammar:</b> gender and number come from the article (el, la, los, las) and the index's m/f markers, and verbs come from the book's (v) tag.</li>
          <li><b>Cleanup:</b> accents and ñ are restored, common scanning mistakes are fixed (6 for ó, fi for ñ), and box headings like "vocabulario" are removed.</li>
        </ul>
      </div>

      <div className="panel">
        <h3>3. Merging and fixing</h3>
        <p>
          The two transcriptions were merged pair by pair. Where they agreed, the pair was kept. Where they disagreed, the pair
          was checked against the page image. Every decision, about 2,450 in all, was written to a log with its reason.
        </p>
        <p>
          Spelling was then checked word by word. Book misprints, missing or wrong articles and non-standard spellings were
          corrected, and each card keeps a note of how the book originally printed it. Unusual word choices were left exactly
          as the book prints them.
        </p>
      </div>

      <div className="panel">
        <h3>4. Testing the accuracy</h3>
        <p>
          <b>Hand-transcribed test pages:</b> on six pages transcribed by hand, the reading found 194 of the 195 pairs and got all
          65 accented words right. The one "miss" was a word the book itself misspells, so the true result was 195 of 195.
        </p>
        <p>
          <b>Random sample with a 95% confidence interval:</b> 200 cards were picked at random from the finished list and each
          one was checked against its page image. 193 were fully correct, an accuracy of 96.5%. With 95% confidence, the
          accuracy of the whole list at that point was between 92.9% and 98.3% (Wilson score interval). All 7 problems were
          fixed, along with every other card that had the same kind of problem across the book.
        </p>
        <p>
          <b>Final review:</b> every card was then reviewed in context, next to the other words on its page and in its topic,
          and the remaining slips were corrected.
        </p>
      </div>

      <div className="panel">
        <h3>Found a mistake?</h3>
        <p>
          The copy of the book (we/you) use may differ slightly from the one used here. On the Study page, use <b>Edit Current Selection</b>{" "}
          to fix, add or remove cards. Your changes are saved in your browser and can be undone at any time.

          Also, if you don't like the format of the website you are free to fork it on Github or use the Export tool to move the data to Quizlet or Knowt.
          I know I'm not that good at web design lol.
        </p>
      </div>
    </div>
  );
}
