import { useEffect, useRef, useState, type ReactNode } from 'react';

const KEYWORDS = new Set([
  'public', 'private', 'protected', 'static', 'final', 'void', 'return', 'if', 'else', 'for', 'while', 'do', 'break', 'continue',
  'new', 'class', 'interface', 'extends', 'implements', 'def', 'in', 'not', 'and', 'or', 'is', 'lambda', 'True', 'False', 'None',
  'true', 'false', 'null', 'import', 'from', 'elif', 'range', 'switch', 'case', 'try', 'catch', 'throw', 'throws', 'this', 'var',
  'int', 'long', 'double', 'float', 'boolean', 'char', 'byte', 'short', 'instanceof', 'yield', 'pass', 'with', 'as',
]);
const TYPES = new Set([
  'String', 'List', 'Map', 'Set', 'ListNode', 'TreeNode', 'Math', 'Integer', 'Long', 'Character', 'Arrays', 'Collections',
  'ArrayList', 'HashMap', 'HashSet', 'Deque', 'ArrayDeque', 'Queue', 'PriorityQueue', 'LinkedList', 'StringBuilder', 'Stack',
  'TreeMap', 'TreeSet', 'LinkedHashMap', 'Optional', 'Comparator', 'Object', 'Node', 'Pair',
]);

/**
 * Tiny tokenizer: enough to colour Java/Python snippets without a dependency.
 * Colours: keywords/primitive types pink, other types cyan, numbers blue, strings light blue,
 * calls purple, comments grey italic (see the .tk-* rules in styles.css).
 */
export function highlightLine(line: string): ReactNode[] {
  const re = /(\/\/.*|#.*)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|\b(\d+(?:\.\d+)?)\b|\b([A-Za-z_]\w*)\b(\s*\()?|(\s+|.)/g;
  const out: ReactNode[] = [];
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(line))) {
    const [text, comment, str, num, word, call] = m;
    if (comment) out.push(<span key={i++} className="tk-c">{text}</span>);
    else if (str) out.push(<span key={i++} className="tk-s">{text}</span>);
    else if (num) out.push(<span key={i++} className="tk-n">{text}</span>);
    else if (word && KEYWORDS.has(word)) out.push(<span key={i++} className="tk-k">{word}</span>, call ?? '');
    else if (word && TYPES.has(word)) out.push(<span key={i++} className="tk-t">{word}</span>, call ?? '');
    else if (word && call) out.push(<span key={i++} className="tk-f">{word}</span>, call);
    else if (word) out.push(<span key={i++} className="tk-i">{word}</span>);
    else out.push(text);
  }
  return out;
}

/** A highlighted multi-line snippet in the shared "code block" look, with a Copy button. */
export function CodeSnippet({ code, copy = true }: { code: string; copy?: boolean }) {
  const [copied, setCopied] = useState(false);
  const doCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };
  return (
    <div className="code-block">
      {copy && <button className="chip-btn code-copy" onClick={doCopy}>{copied ? 'Copied!' : 'Copy'}</button>}
      <pre><code>{code.split('\n').map((l, i) => <div key={i} className="code-line">{l === '' ? ' ' : highlightLine(l)}</div>)}</code></pre>
    </div>
  );
}

/** "COMPLETE JAVA TEMPLATE [JAVA]" card used on pattern pages. */
export function TemplateCard({ code, title = 'Complete Java template', lang = 'Java' }: { code: string; title?: string; lang?: string }) {
  return (
    <section className="card pad template-card">
      <h2 className="card-title with-pill">{title} <span className="lang-pill">{lang}</span></h2>
      <CodeSnippet code={code} />
    </section>
  );
}

export type CodeLang = 'java' | 'python';

/** The learner's chosen language (remembered in this browser). A page that shows code elsewhere can share it with CodePanel. */
export function useCodeLang(): [CodeLang, (l: CodeLang) => void] {
  const [lang, setLang] = useState<CodeLang>(() => {
    try {
      return localStorage.getItem('algoflow.lang') === 'python' ? 'python' : 'java';
    } catch {
      return 'java';
    }
  });
  const pick = (l: CodeLang) => {
    setLang(l);
    try {
      localStorage.setItem('algoflow.lang', l);
    } catch {
      /* ignore */
    }
  };
  return [lang, pick];
}

interface Props {
  title: string;
  java: string[];
  python: string[];
  javaActive: number[];
  pyActive: number[];
  done?: boolean;
  /** Optional: controlled language (from `useCodeLang`), so other parts of the page can follow the tab. */
  lang?: CodeLang;
  onLang?: (l: CodeLang) => void;
}

export function CodePanel({ title, java, python, javaActive, pyActive, done, lang: langProp, onLang }: Props) {
  const [own, pickOwn] = useCodeLang();
  const lang = langProp ?? own;
  const [copied, setCopied] = useState(false);

  const pick = (l: CodeLang) => (onLang ?? pickOwn)(l);

  const lines = lang === 'java' ? java : python;
  const active = lang === 'java' ? javaActive : pyActive;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  // keep the highlighted line(s) inside the scrolling code body (without scrolling the page)
  const body = useRef<HTMLDivElement>(null);
  const activeKey = active.join(',');
  useEffect(() => {
    const el = body.current;
    if (!el || !active.length) return;
    const line = el.children[Math.min(...active)] as HTMLElement | undefined;
    if (!line) return;
    const top = line.offsetTop; // .cp-body is position: relative
    if (top < el.scrollTop + 8) el.scrollTop = Math.max(0, top - 24);
    else if (top + line.offsetHeight > el.scrollTop + el.clientHeight - 8) el.scrollTop = top + line.offsetHeight - el.clientHeight + 24;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey, lang]);

  return (
    <div className="card code-panel">
      <div className="cp-head">
        <span className="cp-title">{title}</span>
        <div className="cp-actions">
          <button className={`cp-copy-btn${copied ? ' copied' : ''}`} onClick={copy}>{copied ? 'Copied!' : 'Copy'}</button>
          <div className="cp-lang-tabs" role="tablist" aria-label="Language">
            <button role="tab" aria-selected={lang === 'java'} className={`cp-lang-btn${lang === 'java' ? ' active' : ''}`} onClick={() => pick('java')}>Java</button>
            <button role="tab" aria-selected={lang === 'python'} className={`cp-lang-btn${lang === 'python' ? ' active' : ''}`} onClick={() => pick('python')}>Python</button>
          </div>
        </div>
      </div>
      <div className="cp-body" ref={body} tabIndex={0} aria-label={`${lang === 'java' ? 'Java' : 'Python'} code`}>
        {lines.map((l, i) => {
          const on = active.includes(i);
          return (
            <div key={i} className={`cp-line${on ? ' on' : ''}${on && done ? ' done' : ''}`} aria-current={on ? 'true' : undefined}>
              <span className="cp-ln">{i + 1}</span>
              <span className="cp-code">{highlightLine(l)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
