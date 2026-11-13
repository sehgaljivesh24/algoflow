import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ALL_ENTRIES } from '../../data/catalog';
import type { PracticeItem, PracticeRef } from '../../data/patterns';
import { isAnimated } from '../../problems/lazy';

type Item = string | PracticeRef | PracticeItem;

function Row({ item }: { item: Item }) {
  const slug = typeof item === 'string' ? item : 'slug' in item ? item.slug : null;
  const note = typeof item === 'string' ? undefined : item.note;
  let id: string;
  let title: string;
  let difficulty: string;
  let to: string | null = null;
  let href: string | undefined;
  let animated = false;

  if (slug !== null) {
    const e = ALL_ENTRIES.find((x) => x.slug === slug);
    if (!e) return null;
    const numeric = /^\d+$/.test(e.id);
    id = numeric ? `#${e.id}` : e.id;
    title = e.title;
    difficulty = e.difficulty;
    animated = isAnimated(slug);
    if (animated) to = `/problem/${slug}`;
    else if (numeric) href = `https://leetcode.com/problemset/?search=${e.id}`;
  } else {
    const p = item as PracticeItem;
    id = `#${p.id}`;
    title = p.title;
    difficulty = p.difficulty;
    href = p.href ?? `https://leetcode.com/problemset/?search=${p.id}`;
  }

  const inner: ReactNode = (
    <>
      <span className="pp-prob-num">{id}</span>
      <span className="pp-prob-name">
        {animated && <span className="pp-animated">▶ animated</span>}
        {title}
        {note && <span className="pp-prob-note"> — {note}</span>}
      </span>
      <span className={`pp-diff ${difficulty.toLowerCase()}`}>{difficulty}</span>
    </>
  );
  if (to) return <li><Link className="pp-prob" to={to}>{inner}</Link></li>;
  if (href) return <li><a className="pp-prob" href={href} target="_blank" rel="noreferrer noopener">{inner}</a></li>;
  return <li><div className="pp-prob">{inner}</div></li>;
}

export function PracticeList({ items }: { items: Item[] }) {
  return (
    <section className="pp-card pp-practice" aria-labelledby="pp-practice-title">
      <h2 className="pp-label" id="pp-practice-title">🎯 Practice problems</h2>
      <ul className="pp-prob-list">
        {items.map((p, i) => <Row key={i} item={p} />)}
      </ul>
    </section>
  );
}
