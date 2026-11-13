import { useEffect, useRef, useState } from 'react';
import { Frame } from './Frame.tsx';
import { useFragmentBehaviour } from './behaviour.ts';
import { loadFragment, loadMeta, type OnlyMeta } from './content.ts';

export default function LandingPage() {
  const [html, setHtml] = useState<string | null>(null);
  const [meta, setMeta] = useState<OnlyMeta | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let live = true;
    void loadFragment('landing').then((h) => live && setHtml(h ?? ''));
    void loadMeta().then((m) => live && setMeta(m));
    const prev = document.title;
    document.title = 'The Only Cheatsheets | Comprehensive collection of your cheatsheets';
    return () => {
      live = false;
      document.title = prev;
    };
  }, []);

  useFragmentBehaviour(bodyRef, html);

  return (
    <Frame meta={meta}>
      <div ref={bodyRef} className="cs-body" dangerouslySetInnerHTML={{ __html: html ?? '' }} />
    </Frame>
  );
}
