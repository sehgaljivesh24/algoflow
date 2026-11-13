import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Frame, Pager } from './Frame.tsx';
import { useFragmentBehaviour } from './behaviour.ts';
import { ROUTE, flatGuides, loadFragment, loadMeta, type OnlyMeta } from './content.ts';

interface Loaded {
  slug: string;
  html: string | null;
}

export default function GuidePage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const [meta, setMeta] = useState<OnlyMeta | null>(null);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let live = true;
    void loadMeta().then((m) => live && setMeta(m));
    return () => {
      live = false;
    };
  }, []);

  const guide = meta ? flatGuides(meta).find((g) => g.slug === slug) : undefined;
  const known = meta ? guide !== undefined : undefined;

  useEffect(() => {
    if (known === undefined) return;
    let live = true;
    if (!known) setLoaded({ slug, html: null });
    else void loadFragment(slug).then((h) => live && setLoaded({ slug, html: h }));
    return () => {
      live = false;
    };
  }, [slug, known]);

  const html = loaded && loaded.slug === slug ? loaded.html : null;

  useEffect(() => {
    if (!html) return;
    const prev = document.title;
    const m = /<h1[^>]*>([\s\S]*?)<\/h1>/.exec(html);
    const h1 = m
      ? m[1]
          .replace(/<[^>]+>/g, '')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&amp;/g, '&')
          .trim()
      : guide?.title;
    document.title = `${h1 ?? 'Cheatsheet'} | The Only Cheatsheets`;
    return () => {
      document.title = prev;
    };
  }, [html, guide]);

  useFragmentBehaviour(bodyRef, html);

  const missing = loaded?.slug === slug && loaded.html === null && known === false;

  return (
    <Frame meta={meta} current={guide?.slug}>
      {missing ? (
        <>
          <h1>Cheatsheet not found</h1>
          <p>
            There is no guide called <code>{slug}</code>. <Link to={ROUTE}>See all cheatsheets</Link>.
          </p>
        </>
      ) : (
        <>
          <div ref={bodyRef} className="cs-body" dangerouslySetInnerHTML={{ __html: html ?? '' }} />
          {html && meta && <Pager meta={meta} slug={slug} />}
        </>
      )}
    </Frame>
  );
}
