import type { ReactNode } from 'react';

const svg = (size: number, children: ReactNode) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden focusable="false">
    {children}
  </svg>
);

/** Small line icons (own drawings) for the picture-card title and the approach banner. */
export function Icon({ name, size = 16 }: { name: string; size?: number }) {
  switch (name) {
    case 'bars': return svg(size, <><path d="M4 20V10" /><path d="M10 20V4" /><path d="M16 20v-8" /><path d="M22 20H2" /></>);
    case 'sort': return svg(size, <><path d="M4 6h7" /><path d="M4 12h11" /><path d="M4 18h15" /><path d="M20 4v8" /><path d="m17 9 3 3 3-3" /></>);
    case 'link': return svg(size, <><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3A4 4 0 0 0 11 18.7l1-1" /></>);
    case 'reverse': return svg(size, <><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /></>);
    case 'tree': return svg(size, <><circle cx="12" cy="5" r="2.5" /><circle cx="6" cy="18" r="2.5" /><circle cx="18" cy="18" r="2.5" /><path d="m10.5 7 -3.5 8.5" /><path d="m13.5 7 3.5 8.5" /></>);
    case 'grid': return svg(size, <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M3 15h18M9 3v18M15 3v18" /></>);
    case 'graph': return svg(size, <><circle cx="5" cy="6" r="2.5" /><circle cx="19" cy="6" r="2.5" /><circle cx="12" cy="18" r="2.5" /><path d="M7.5 6h9M6.5 8l4 8M17.5 8l-4 8" /></>);
    case 'search': return svg(size, <><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></>);
    case 'layers': return svg(size, <><path d="m12 3 9 5-9 5-9-5 9-5z" /><path d="m3 13 9 5 9-5" /></>);
    case 'target': return svg(size, <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="0.8" /></>);
    case 'intervals': return svg(size, <><path d="M3 7h9" /><path d="M8 12h12" /><path d="M5 17h7" /></>);
    case 'text': return svg(size, <><path d="M4 7V5h16v2" /><path d="M12 5v14" /><path d="M9 19h6" /></>);
    default: return svg(size, <><path d="M9 18h6" /><path d="M10 21h4" /><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z" /></>);
  }
}

/** Which picture-card icon fits a scene kind. */
export const sceneIcon = (kind: string | undefined, bars?: boolean) => {
  switch (kind) {
    case 'list': return 'link';
    case 'tree': return 'tree';
    case 'grid': return 'grid';
    case 'graph': return 'graph';
    case 'intervals': return 'intervals';
    case 'trie': return 'text';
    case 'ntree': return 'tree';
    case 'plane': return 'graph';
    case 'split': return 'grid';
    default: return bars ? 'bars' : 'bars';
  }
};

/** Which big icon the approach banner shows, by the problem's category / technique. */
export function approachIconName(category: string, tag: string): string {
  const s = `${category} ${tag}`.toLowerCase();
  if (/linked list/.test(s) && /revers|in-place|rotate/.test(s)) return 'reverse';
  if (/sort/.test(s)) return 'sort';
  if (/hash|map|set\b/.test(s)) return 'search';
  if (/linked/.test(s)) return 'link';
  if (/tree|trie|heap/.test(s)) return 'tree';
  if (/graph|union|topolog|dijkstra/.test(s)) return 'graph';
  if (/matrix|grid|dp|dynamic/.test(s)) return 'grid';
  if (/stack|queue|monoton|design/.test(s)) return 'layers';
  if (/binary search|search/.test(s)) return 'target';
  if (/interval/.test(s)) return 'intervals';
  if (/string/.test(s)) return 'text';
  return 'bulb';
}
