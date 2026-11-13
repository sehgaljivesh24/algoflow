import { useState, type ReactNode } from 'react';

const KEYWORDS = new Set([
  'public', 'private', 'protected', 'static', 'final', 'void', 'return', 'if', 'else', 'for', 'while', 'do', 'break', 'continue',
  'new', 'class', 'true', 'false', 'null', 'switch', 'case', 'try', 'catch', 'throw', 'this', 'var', 'int', 'long', 'double',
  'float', 'boolean', 'char', 'byte', 'short', 'instanceof',
]);
const TYPES = new Set([
  'String', 'List', 'Map', 'Set', 'ListNode', 'TreeNode', 'Math', 'Integer', 'Long', 'Character', 'Arrays', 'Collections',
  'ArrayList', 'HashMap', 'HashSet', 'Deque', 'ArrayDeque', 'Queue', 'PriorityQueue', 'LinkedList', 'StringBuilder', 'Stack',
  'TreeMap', 'TreeSet', 'LinkedHashMap', 'Optional', 'Comparator', 'Object', 'Node',
]);

/** Small Java-ish tokenizer for the template block (colours come from the --tk-* tokens). */
function tokens(line: string): ReactNode[] {
  const re = /(\/\/.*)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|\b(\d+(?:\.\d+)?)\b|\b([A-Za-z_]\w*)\b(\s*\()?|(\s+|.)/g;
  const out: ReactNode[] = [];
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(line))) {
    const [text, comment, str, num, word, call] = m;
    if (comment) out.push(<span key={i++} className="pt-c">{text}</span>);
    else if (str) out.push(<span key={i++} className="pt-s">{text}</span>);
    else if (num) out.push(<span key={i++} className="pt-n">{text}</span>);
    else if (word && KEYWORDS.has(word)) out.push(<span key={i++} className="pt-k">{word}</span>, call ?? '');
    else if (word && TYPES.has(word)) out.push(<span key={i++} className="pt-t">{word}</span>, call ?? '');
    else if (word && call) out.push(<span key={i++} className="pt-f">{word}</span>, call);
    else out.push(text);
  }
  return out;
}

/** "COMPLETE JAVA TEMPLATE [JAVA]" section: near-black block with syntax colours and a quiet Copy button. */
export function PatternTemplate({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };
  return (
    <section className="pp-card pp-java" aria-labelledby="pp-java-title">
      <h2 className="pp-label pp-java-title" id="pp-java-title">
        <span>Complete Java template</span>
        <span className="pp-lang">JAVA</span>
        <button type="button" className="pp-copy" onClick={copy}>{copied ? 'Copied!' : 'Copy'}</button>
      </h2>
      <pre className="pp-code" tabIndex={0} aria-label="Java template code"><code>{code.split('\n').map((l, i) => (
        <span key={i} className="pp-code-line">{l === '' ? ' ' : tokens(l)}{'\n'}</span>
      ))}</code></pre>
    </section>
  );
}
