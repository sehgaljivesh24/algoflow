import type { ReactNode } from 'react';

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Wraps every case-insensitive occurrence of the given phrases in `as` (accent emphasis via CSS).
 * `words` are whole identifiers (variable names such as `nums`, `k`): matched case-sensitively and only as separate words.
 */
export function Emph({
  text: raw,
  terms,
  words = [],
  as: Tag = 'strong',
  wholeWords = false,
}: {
  text: string;
  terms: string[];
  words?: string[];
  as?: 'strong' | 'em';
  /** A phrase that ends inside a longer word (`insert` in "inserted", `edge` in "edges") is bolded to the end of that word. */
  wholeWords?: boolean;
}) {
  // `**phrase**` markers (used by the written pattern copy) become emphasis ranges and are dropped from the text.
  let text = '';
  const ranges: [number, number][] = [];
  raw.split('**').forEach((part, idx) => {
    const start = text.length;
    text += part;
    if (idx % 2 === 1 && part) ranges.push([start, text.length]);
  });
  const phrases = [...terms].filter(Boolean).sort((a, b) => b.length - a.length);
  if (phrases.length) {
    const re = new RegExp(`(${phrases.map(escapeRe).join('|')})`, 'gi');
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      let end = m.index + m[0].length;
      if (wholeWords && /[A-Za-z0-9]$/.test(m[0])) while (end < text.length && /[A-Za-z0-9]/.test(text[end])) end++;
      ranges.push([m.index, end]);
    }
  }
  const ids = [...words].filter(Boolean).sort((a, b) => b.length - a.length);
  if (ids.length) {
    const re = new RegExp(`(?<![A-Za-z0-9_])(${ids.map(escapeRe).join('|')})(?![A-Za-z0-9_])`, 'g');
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) ranges.push([m.index, m.index + m[0].length]);
  }
  if (ranges.length === 0) return <>{text}</>;
  ranges.sort((a, b) => a[0] - b[0] || b[1] - a[1]);
  const out: ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const [a, b] of ranges) {
    if (a < last) continue; // overlaps an earlier match
    if (a > last) out.push(text.slice(last, a));
    out.push(<Tag key={i++}>{text.slice(a, b)}</Tag>);
    last = b;
  }
  if (last < text.length) out.push(text.slice(last));
  return <>{out}</>;
}
