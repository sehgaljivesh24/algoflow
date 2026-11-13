import { Link } from 'react-router-dom';
import { familyId, familyMeta } from '../components/shell/familyMeta';
import { ALL_ENTRIES } from '../data/catalog';
import { ALL_PATTERNS, CONTENT, examplesFor, PATTERN_GROUPS, type PatternContent } from '../data/patterns';
import { PATTERN_META } from '../data/patternMeta';
import { isAnimated } from '../problems/lazy';

const animated = (slug: string) => !!CONTENT[slug] && isAnimated(CONTENT[slug].animation);
/** Number of worked examples (animated problems) a pattern page offers. */
const exampleCount = (slug: string) => examplesFor(slug).filter((e) => isAnimated(e.slug)).length;
const BY_SLUG = new Map(ALL_ENTRIES.map((e) => [e.slug, e]));

interface Pill {
  key: string;
  id: string;
  title: string;
  diff: 'E' | 'M' | 'H';
  /** In-app animation when we have one, otherwise an outbound link. */
  to?: string;
  href?: string;
}

const D = { Easy: 'E', Medium: 'M', Hard: 'H' } as const;

/** Resolve a pattern's practice list (catalog slugs, annotated refs and outside problems) into pills. */
function pillsFor(content: PatternContent | undefined, max = 4): Pill[] {
  if (!content) return [];
  const out: Pill[] = [];
  for (const item of content.practice) {
    const slug = typeof item === 'string' ? item : 'slug' in item ? item.slug : undefined;
    if (slug) {
      const e = BY_SLUG.get(slug);
      if (!e) continue;
      const live = isAnimated(e.slug);
      out.push({
        key: e.slug, id: e.id === 'GFG' || e.id === 'IB' ? e.id : `#${e.id}`, title: e.title, diff: D[e.difficulty],
        to: live ? `/problem/${e.slug}` : undefined,
        href: live ? undefined : `https://leetcode.com/problemset/?search=${encodeURIComponent(e.id)}`,
      });
    } else if (typeof item !== 'string' && 'id' in item) {
      out.push({ key: `${item.id}-${item.title}`, id: `#${item.id}`, title: item.title, diff: D[item.difficulty], href: item.href });
    }
  }
  return out.slice(0, max);
}

const firstSentence = (s: string) => (s.match(/^.*?[.!?](\s|$)/)?.[0] ?? s).trim();

/** Pattern roadmap (the "Common Patterns" view). Owned by the library agent. */
export function PatternsIndex() {
  return (
    <main className="main pat-index">
      <h1 className="sr-only">Common patterns</h1>

      <section className="patterns-quiz-banner" aria-label="Pattern quiz">
        <div className="pqb-left">
          <span className="pqb-icon" aria-hidden>🎯</span>
          <div>
            <div className="pqb-title">Test your pattern knowledge</div>
            <div className="pqb-sub">10 random questions · hints · explanations · score tracking</div>
          </div>
        </div>
        <Link to="/quiz" className="pqb-btn">Take the quiz →</Link>
      </section>

      <nav className="pat-jumper" aria-label="Pattern families">
        {PATTERN_GROUPS.map((g) => (
          <a key={g.name} className="pat-jump-btn" href={`#${familyId(g.name)}`}>
            {familyMeta(g.name).icon} {g.name} <span className="pat-jump-n">{g.cards.length}</span>
          </a>
        ))}
      </nav>

      {PATTERN_GROUPS.map((g) => {
        const fam = familyMeta(g.name);
        return (
          <section key={g.name} id={familyId(g.name)} className="pat-category">
            <div className="pat-category-header">
              <span className="pat-category-icon" aria-hidden>{fam.icon}</span>
              <div>
                <h2 className="pat-category-title">{g.name}</h2>
                {fam.sub && <div className="pat-category-sub">{fam.sub}</div>}
              </div>
              <span className="pat-category-count">{g.cards.length} pattern{g.cards.length === 1 ? '' : 's'}</span>
            </div>

            {g.cards.map((p) => {
              const live = animated(p.slug);
              const content = CONTENT[p.slug];
              const meta = PATTERN_META[p.slug];
              const summary = content?.summary ?? '';
              const lead = meta?.desc ? firstSentence(meta.desc) : firstSentence(summary);
              const pills = pillsFor(content);
              const nEx = live ? exampleCount(p.slug) : 0;
              return (
                <article key={p.slug} className={`pattern-card acc-${fam.accent}${live ? ' live' : ' coming'}`}>
                  <div className="pattern-card-hdr">
                    <div className="pat-left">
                      <span className="pat-icon" aria-hidden>{meta?.icon ?? fam.icon}</span>
                      <div className="pat-titles">
                        <h3 className="pat-title">
                          {live ? <Link to={`/patterns/${p.slug}`} className="pat-link">{p.title}</Link> : p.title}
                        </h3>
                        {lead && <div className="pat-subtitle">{lead}</div>}
                      </div>
                    </div>
                    <div className="pat-right">
                      {p.tags.map((t) => <span key={t} className="pat-tag">{t}</span>)}
                      <span className="cx-badge">{p.complexity}</span>
                      {nEx > 0 && <span className="pat-ex-chip" title="Worked examples on the pattern page">{nEx} example{nEx === 1 ? '' : 's'}</span>}
                      {live ? <span className="pat-open" aria-hidden>Open →</span> : <span className="pat-soon">Soon</span>}
                    </div>
                  </div>
                  {(summary || pills.length > 0) && (
                    <div className="pattern-card-body">
                      <div className="pat-body-main">
                        {summary && <p className="pat-desc">{summary}</p>}
                        {pills.length > 0 && (
                          <div className="pat-pills" aria-label="Practice problems">
                            {pills.map((pl) => {
                              const inner = (
                                <>
                                  <span className="pn">{pl.id}</span> {pl.title} <span className={`pd ${pl.diff.toLowerCase()}`}>{pl.diff}</span>
                                </>
                              );
                              return pl.to ? (
                                <Link key={pl.key} className="ppill" to={pl.to}>{inner}</Link>
                              ) : (
                                <a key={pl.key} className="ppill" href={pl.href} target="_blank" rel="noopener noreferrer">{inner}</a>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      {live && <Link to={`/patterns/${p.slug}`} className="pat-cta" tabIndex={-1} aria-hidden>▶ Open pattern</Link>}
                    </div>
                  )}
                </article>
              );
            })}
          </section>
        );
      })}
      <p className="lib-foot muted small">{ALL_PATTERNS.length} patterns across {PATTERN_GROUPS.length} families.</p>
    </main>
  );
}
