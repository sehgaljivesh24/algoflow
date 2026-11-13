import type { MouseEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { CatalogEntry } from '../../data/catalog';
import { STATUS_LABEL, STATUS_ORDER } from '../../data/storage';
import type { Status } from '../../engine/types';

export const STATUS_ICON: Record<Status, string> = { todo: '○', progress: '◐', pending: '◔', solved: '✓', revise: '↻' };

const isOther = (e: CatalogEntry) => e.id === 'GFG' || e.id === 'IB';
const numLabel = (e: CatalogEntry) => (isOther(e) ? e.id : `#${e.id}`);

/** Outbound practice link: LeetCode problems by number; GFG / InterviewBit entries by a site-restricted search. */
function practiceLink(e: CatalogEntry): { href: string; text: string; cls: string; title: string } {
  if (e.id === 'GFG') {
    return { href: `https://www.google.com/search?q=${encodeURIComponent(`site:geeksforgeeks.org ${e.title}`)}`, text: 'GFG', cls: 'gfg-link', title: 'Find on GeeksforGeeks' };
  }
  if (e.id === 'IB') {
    return { href: `https://www.google.com/search?q=${encodeURIComponent(`site:interviewbit.com ${e.title}`)}`, text: 'IB', cls: 'ib-link', title: 'Find on InterviewBit' };
  }
  return { href: `https://leetcode.com/problemset/?search=${encodeURIComponent(e.id)}`, text: 'LC', cls: 'lc-link', title: 'Open on LeetCode' };
}

interface Props {
  entry: CatalogEntry;
  live: boolean;
  status: Status;
  bookmarked: boolean;
  onBookmark: () => void;
  onStatus: (s: Status) => void;
}

export function ProblemCard({ entry: e, live, status, bookmarked, onBookmark, onStatus }: Props) {
  const nav = useNavigate();
  const d = e.difficulty.toLowerCase();
  const out = practiceLink(e);
  const next = STATUS_ORDER[(STATUS_ORDER.indexOf(status) + 1) % STATUS_ORDER.length];

  // Whole card opens the animation (links and buttons inside keep their own behaviour).
  const open = (ev: MouseEvent) => {
    if (!live || (ev.target as HTMLElement).closest('a, button')) return;
    nav(`/problem/${e.slug}`);
  };

  return (
    <article className={`problem-card ${d}${live ? ' live' : ''}${bookmarked ? ' saved' : ''}`} onClick={open}>
      <button
        type="button" className={`bookmark${bookmarked ? ' on' : ''}`} aria-pressed={bookmarked}
        aria-label={`Bookmark ${e.title}`} title={bookmarked ? 'Remove bookmark' : 'Bookmark'}
        onClick={onBookmark}
      >
        {bookmarked ? '★' : '☆'}
      </button>
      <span className="problem-num mono">{numLabel(e)}</span>
      <div className="problem-info">
        <div className="problem-name" title={e.title}>{e.title}</div>
        <div className="problem-tag">{e.tag}</div>
      </div>
      <span className={`diff-badge ${d}`}>{e.difficulty}</span>
      <div className="problem-links">
        {live && <Link className="viz-link" to={`/problem/${e.slug}`} aria-label={`Watch the ${e.title} animation`}>▶ viz</Link>}
        <a className={out.cls} href={out.href} target="_blank" rel="noopener noreferrer" title={out.title} aria-label={`${out.title}: ${e.title}`}>{out.text}</a>
        <button
          type="button" className={`status-btn s-${status}`}
          title={`${STATUS_LABEL[status]}. Click for: ${STATUS_LABEL[next]}`}
          aria-label={`${e.title} status: ${STATUS_LABEL[status]}. Activate to change.`}
          onClick={() => onStatus(next)}
        >
          {STATUS_ICON[status]}
        </button>
      </div>
    </article>
  );
}
