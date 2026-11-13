/**
 * "Complete DSA Patterns Reference Guide" viewer — imported from https://thetorangi.github.io/DSA-cheat-sheet/
 * (thetorangi/DSA-cheat-sheet, MIT, Copyright (c) 2025 K A R M A). The content is committed, sanitized HTML under
 * src/content/cheatsheets/patterns-guide/ (see scripts/import-cheatsheets/patterns-guide) and loaded lazily.
 * This file (with both stylesheets) is itself a lazy chunk, loaded by ../PatternsGuidePage.tsx.
 * Behaviour kept from the original: the "Download as PDF" button (window.print()) and click-to-highlight table rows.
 * AlgoFlow additions: "← AlgoFlow" link, attribution footer, and "▶ viz" chips next to example problems we animate.
 */
import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import '../../../styles-cs-patterns-guide.css';
import '../../../content/cheatsheets/patterns-guide/original.scoped.css'; // after our resets so the original rules win ties
import { chipSlugFor } from './chips.ts';

const FRAGMENTS = import.meta.glob<string>('/src/content/cheatsheets/patterns-guide/*.html', { query: '?raw', import: 'default' });

interface Parts { header: string; rest: string }

async function loadParts(): Promise<Parts> {
  const entries = await Promise.all(Object.entries(FRAGMENTS).sort(([a], [b]) => a.localeCompare(b)).map(async ([k, load]) => [k, await load()] as const));
  const html = entries.map(([, h]) => h);
  return { header: html[0] ?? '', rest: html.slice(1).join('\n') };
}

interface Chip { host: HTMLElement; slug: string; label: string }

export default function PatternsGuideViewer() {
  const [parts, setParts] = useState<Parts | null>(null);
  const [chips, setChips] = useState<Chip[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let live = true;
    void loadParts().then((p) => { if (live) setParts(p); });
    const prev = document.title;
    document.title = 'Complete DSA Patterns Reference Guide';
    return () => { live = false; document.title = prev; };
  }, []);

  // Value-add: a "▶ viz" chip after each example link whose LeetCode number is an animated AlgoFlow problem.
  // The original <a> is only moved into a one-line flex row; its text and href are untouched.
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!parts || !root) return;
    const made: { row: HTMLElement; link: HTMLElement; host: HTMLElement }[] = [];
    const found: Chip[] = [];
    root.querySelectorAll<HTMLAnchorElement>('a.problem-link').forEach((a) => {
      const text = a.textContent ?? '';
      const slug = chipSlugFor(text);
      if (!slug || !a.parentNode) return;
      const row = document.createElement('div');
      row.className = 'cs-pg-linkrow';
      const host = document.createElement('span');
      host.style.display = 'contents';
      a.parentNode.insertBefore(row, a);
      row.appendChild(a);
      row.appendChild(host);
      made.push({ row, link: a, host });
      found.push({ host, slug, label: text.trim() });
    });
    setChips(found);
    return () => {
      setChips([]);
      for (const { row, link } of made) {
        row.parentNode?.insertBefore(link, row);
        row.remove();
      }
    };
  }, [parts]);

  // The original toggles a yellow background on any clicked table row.
  const onClick = (e: MouseEvent<HTMLDivElement>) => {
    const t = e.target as Element;
    if (t.closest('a, button')) return;
    t.closest('tr')?.classList.toggle('cs-pg-picked');
  };

  return (
    <div className="cs-pg" ref={rootRef} onClick={onClick}>
      <Link className="cs-pg-back no-print" to="/cheatsheets" title="Back to the AlgoFlow cheatsheets">← AlgoFlow</Link>
      {parts ? (
        <>
          <div dangerouslySetInnerHTML={{ __html: parts.header }} />
          <button className="download-btn no-print" type="button" onClick={() => window.print()}>📄 Download as PDF</button>
          <div dangerouslySetInnerHTML={{ __html: parts.rest }} />
        </>
      ) : (
        <p className="cs-pg-loading">Loading…</p>
      )}
      <div className="footer-info cs-pg-attrib">
        <p>
          Content © K A R M A ☯️ — MIT License — Source:{' '}
          <a href="https://thetorangi.github.io/DSA-cheat-sheet/">thetorangi.github.io/DSA-cheat-sheet</a>
          {' '}· <Link to="/cheatsheets/credits">Credits</Link>
          <span className="no-print"> · <Link to="/cheatsheets">← AlgoFlow cheatsheets</Link></span>
        </p>
      </div>
      {chips.map((c, i) =>
        createPortal(
          <Link
            className="cs-pg-chip no-print"
            to={`/problem/${c.slug}`}
            title="Watch this problem animated in AlgoFlow"
            aria-label={`Watch ${c.label} animated in AlgoFlow`}
          >
            ▶ viz
          </Link>,
          c.host,
          String(i),
        ),
      )}
    </div>
  );
}
