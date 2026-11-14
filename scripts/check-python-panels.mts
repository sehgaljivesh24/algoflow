/**
 * Static lint for the PYTHON shown on every problem's code panel (`problem.python`).
 * Python is not required: this is a dependency-free scanner, so it only reports rules that are
 * (after whitelist tuning) free of false positives. Exit code 1 when anything is reported.
 *
 *   node scripts/check-python-panels.mts            all problems
 *   ONLY=slug1,slug2 node scripts/check-python-panels.mts
 *   HINTS=1 node scripts/check-python-panels.mts    also print non-failing logic-parity hints
 *
 * Rules (each finding is "slug: [rule] line N: text"):
 *   undefined-call  a name is called/instantiated but never defined, imported, or a builtin
 *   undefined-name  a name is used but never assigned/defined/imported (inf, deque, heapq, List ...)
 *   syntax          unbalanced brackets/quotes, header line without ':', tab, bad indentation,
 *                   dedent to a level never opened, indent without a block header
 *   java-ism        i++, &&, ||, !x, new X, //-comments, true/false/null, int[], ?:, .length, .size() ...
 * ListNode / TreeNode are accepted (LeetCode predefines them).
 * The animation highlights Python lines by index (Step.pyLines), so fixes must keep line positions:
 * append missing helpers AFTER the last line instead of inserting lines.
 */
import { ALL_PROBLEMS } from '../src/problems/registry.ts';

const ONLY = (process.env.ONLY ?? '').split(',').map((s) => s.trim()).filter(Boolean);
const HINTS = process.env.HINTS === '1';

const KEYWORDS = new Set('and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield True False None'.split(' '));
const BUILTINS = new Set(('len range min max sum sorted enumerate zip map filter any all abs divmod ord chr int str float bool list dict set tuple print reversed isinstance pow round hash iter next input open type super ' +
  'bin hex oct bytes bytearray frozenset slice vars id callable getattr setattr hasattr format repr complex object property staticmethod classmethod issubclass globals locals ' +
  'Exception ValueError IndexError KeyError StopIteration RecursionError NotImplementedError TypeError RuntimeError AssertionError ZeroDivisionError OverflowError ' +
  '__name__ __init__ NotImplemented Ellipsis ListNode TreeNode').split(' '));
/**
 * Standard-library names the panels use WITHOUT an import line (the Java panels likewise omit `import java.util.*`).
 * LeetCode's Python environment preloads all of these. Set STRICT_IMPORTS=1 to report them as undefined instead.
 */
const PRELOADED = new Set(['heapq', 'math', 'bisect', 'functools', 'itertools', 'random', 'collections', 'sys', 'string',
  'deque', 'Counter', 'defaultdict', 'OrderedDict', 'bisect_left', 'bisect_right', 'insort', 'heappush', 'heappop', 'heapify', 'heappushpop',
  'lru_cache', 'cache', 'cmp_to_key', 'reduce', 'accumulate', 'permutations', 'combinations', 'product', 'gcd', 'inf',
  'List', 'Dict', 'Set', 'Tuple', 'Optional', 'Deque']);
const STRICT_IMPORTS = process.env.STRICT_IMPORTS === '1';
/** LeetCode predefines these node classes; allowed only in the panels whose constructor use matches the stub. */
const STUBS: Record<string, string[]> = { Node: ['138-copy-list-with-random-pointer', '133-clone-graph'] };

const BRACKET: Record<string, string> = { ')': '(', ']': '[', '}': '{' };

interface Cleaned { lines: string[]; errors: { line: number; msg: string }[] }

/** Replace string literals/comments with placeholders; f-string expressions become `[expr,...]`. Tracks triple quotes across lines. */
function clean(src: string[]): Cleaned {
  const errors: { line: number; msg: string }[] = [];
  const out: string[] = [];
  let triple: string | null = null;
  for (let ln = 0; ln < src.length; ln++) {
    const s = src[ln];
    let res = '';
    let i = 0;
    while (i < s.length) {
      if (triple) {
        const j = s.indexOf(triple, i);
        if (j < 0) { i = s.length; break; }
        i = j + 3; triple = null; res += '""'; continue;
      }
      const c = s[i];
      if (c === '#') break;
      if (c === '"' || c === "'") {
        const prefix = /[A-Za-z]{1,2}$/.exec(res)?.[0] ?? '';
        const isF = /f/i.test(prefix);
        if (prefix && /^[rbfuRBFU]{1,2}$/.test(prefix)) res = res.slice(0, res.length - prefix.length);
        if (s.startsWith(c.repeat(3), i)) {
          const j = s.indexOf(c.repeat(3), i + 3);
          if (j < 0) { triple = c.repeat(3); i = s.length; res += '""'; break; }
          i = j + 3; res += '""'; continue;
        }
        let j = i + 1; let body = '';
        let closed = false;
        while (j < s.length) {
          if (s[j] === '\\') { body += s.slice(j, j + 2); j += 2; continue; }
          if (s[j] === c) { closed = true; break; }
          body += s[j]; j++;
        }
        if (!closed) { errors.push({ line: ln, msg: 'unterminated string' }); i = s.length; break; }
        i = j + 1;
        if (isF) {
          const exprs: string[] = [];
          for (let k = 0; k < body.length; k++) {
            if (body[k] === '{') {
              if (body[k + 1] === '{') { k++; continue; }
              let d = 1; let e = ''; k++;
              while (k < body.length && d > 0) { if (body[k] === '{') d++; else if (body[k] === '}') d--; if (d > 0) e += body[k]; k++; }
              k--;
              e = e.replace(/!\w$/, '');
              // cut the format spec at a depth-0 ':' (not inside brackets / lambda)
              let dd = 0, cut = -1;
              for (let q = 0; q < e.length; q++) { if ('([{'.includes(e[q])) dd++; else if (')]}'.includes(e[q])) dd--; else if (e[q] === ':' && dd === 0) { cut = q; break; } }
              if (cut >= 0) e = e.slice(0, cut);
              e = e.replace(/!\w$/, '').replace(/=\s*$/, '');
              if (e.trim()) exprs.push(clean([e.trim()]).lines[0]);
            }
          }
          res += exprs.length ? `[${exprs.join(',')}]` : '""';
        } else res += '""';
        continue;
      }
      res += c; i++;
    }
    out.push(res);
  }
  if (triple) errors.push({ line: src.length - 1, msg: 'unterminated triple-quoted string' });
  return { lines: out, errors };
}

/** split at depth-0 occurrences of a separator char */
function splitTop(s: string, sep: string): string[] {
  const parts: string[] = []; let d = 0; let cur = '';
  for (const c of s) {
    if ('([{'.includes(c)) d++; else if (')]}'.includes(c)) d--;
    if (c === sep && d === 0) { parts.push(cur); cur = ''; } else cur += c;
  }
  parts.push(cur);
  return parts;
}
function topColon(s: string): number {
  let d = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if ('([{'.includes(c)) d++; else if (')]}'.includes(c)) d--;
    else if (c === ':' && d === 0 && s[i + 1] !== '=') return i;
  }
  return -1;
}
const idents = (s: string): string[] => [...s.matchAll(/(?<![.\w])[A-Za-z_]\w*/g)].map((m) => m[0]);
/** identifiers that are binding targets in an assignment/for target text (subscripts and attributes are not bindings) */
function targetNames(s: string): string[] {
  let t = s;
  let prev = '';
  while (prev !== t) { prev = t; t = t.replace(/(?<=[\w\])])\[[^\[\]]*\]/g, ''); }
  t = t.replace(/(?<=[\w\])])\.\w+/g, '');
  return idents(t).filter((n) => !KEYWORDS.has(n));
}

const HEADER = /^(def|class|if|elif|else|for|while|try|except|finally|with|async\s+def|async\s+for|async\s+with)\b/;
const NEEDS_COLON = /^(def|class|if|elif|else|for|while|try|except|finally|with)\b/;

interface Scan { defined: Set<string>; called: Set<string> }

function analyse(slug: string, python: string[]): string[] {
  const findings: string[] = [];
  const add = (rule: string, ln: number, msg?: string) => findings.push(`${slug}: [${rule}] line ${ln}: ${msg ?? python[ln]?.trim()}`);
  const { lines, errors } = clean(python);
  for (const e of errors) add('syntax', e.line, e.msg);

  // ---- tabs / indentation / headers ----
  const levels: number[] = [0];
  let depth = 0;
  let expectIndent = false;
  const stack: { ch: string; line: number }[] = [];
  const logical: { ln: number; text: string }[] = []; // joined logical lines (continuations folded)
  let pending = '', pendingStart = -1;
  for (let ln = 0; ln < lines.length; ln++) {
    const raw = python[ln];
    const code = lines[ln];
    if (/\t/.test(raw)) add('syntax', ln, 'tab character');
    const trimmed = code.trim();
    const continuing = depth > 0;
    if (!continuing && trimmed) {
      const ind = /^ */.exec(code)![0].length;
      if (expectIndent) {
        if (ind <= levels[levels.length - 1]) add('syntax', ln, 'expected an indented block');
        else levels.push(ind);
        expectIndent = false;
      } else if (ind > levels[levels.length - 1]) add('syntax', ln, 'unexpected indent');
      else {
        while (levels.length > 1 && ind < levels[levels.length - 1]) levels.pop();
        if (ind !== levels[levels.length - 1]) add('syntax', ln, 'dedent to a level never opened');
      }
    }
    for (const ch of code) {
      if ('([{'.includes(ch)) { stack.push({ ch, line: ln }); depth++; }
      else if (')]}'.includes(ch)) {
        const top = stack.pop();
        depth--;
        if (!top || top.ch !== BRACKET[ch]) { add('syntax', ln, `unbalanced '${ch}'`); depth = Math.max(depth, 0); }
      }
    }
    if (!continuing) { pending = trimmed; pendingStart = ln; } else pending += ' ' + trimmed;
    if (depth <= 0) {
      if (pending) {
        logical.push({ ln: pendingStart, text: pending });
        // header must have a depth-0 colon; a trailing colon means a block follows
        if (NEEDS_COLON.test(pending)) {
          const ci = topColon(pending);
          if (ci < 0) add('syntax', pendingStart, 'block header without ":"');
          else if (pending.slice(ci + 1).trim() === '') expectIndent = true;
        } else if (/^(elif|else|except|finally)\b/.test(pending)) add('syntax', pendingStart, 'bad header');
        if (/\\$/.test(raw.trim())) { /* explicit continuation: not used in panels */ }
      }
      pending = '';
    }
  }
  if (stack.length) add('syntax', stack[stack.length - 1].line, `unclosed '${stack[stack.length - 1].ch}'`);
  if (expectIndent) add('syntax', python.length - 1, 'block header at the end with no body');

  // ---- java-isms (on cleaned code) ----
  for (let ln = 0; ln < lines.length; ln++) {
    const c = lines[ln];
    const raw = python[ln];
    const hit = (m: string) => add('java-ism', ln, `${m} :: ${raw.trim()}`);
    if (/^\s*\/\//.test(raw)) hit('// comment');
    if (/;\s*$/.test(c)) hit('line ends with ;');
    if (/\w\+\+|\+\+\w/.test(c)) hit('++');
    if (/\w--(?=\s*($|[)\];,]))/.test(c) || /(^|[(\s])--\w/.test(c)) hit('--');
    if (/&&|\|\|/.test(c)) hit('&& or ||');
    if (/(?<![=!<>])!(?!=)/.test(c)) hit('! operator');
    if (/\bnew\s+[A-Za-z_]/.test(c)) hit('new');
    if (/\b(true|false|null)\b/.test(c)) hit('true/false/null');
    if (/\b(int|long|double|char|boolean|String|float)\s*\[\s*\]/.test(c) || /\w\[\]/.test(c)) hit('array type');
    if (/\?/.test(c)) hit('ternary ?');
    if (/\.length\b(?!\()/.test(c) || /(?<!\bself)\.(size|isEmpty|equals|charAt|substring|toCharArray|getOrDefault|containsKey|offer|poll|peek|put|addLast|addFirst|pollFirst|pollLast|peekFirst|peekLast|intValue|toString|compareTo)\s*\(/.test(c)) hit('Java member');
    if (/\bfinal\b/.test(c)) hit('final');
    if (/^\s*(int|long|double|char|boolean|String|var|float)\s+\w+\s*(=|;|$)/.test(c)) hit('typed declaration');
    if (/^\s*[}]\s*$/.test(c) || /[{]\s*$/.test(c) && !/[=(,:\[]\s*\{\s*$/.test(c) && !/\b(return|in|and|or|not)\s*\{\s*$/.test(c)) hit('brace block');
    if (/System\.out|Math\.(max|min|abs|floor|ceil)\b/.test(c)) hit('Java API');
    if (/->/.test(c) && !/^\s*def\b/.test(c) && !/^\s*async\s+def\b/.test(c)) hit('stray ->');
    if (/^\s*print\b(?!\s*\()/.test(c)) hit('print statement');
    if (/\b(Integer|Long|Double|Character|Arrays|Collections|List|Map|Set)\.\w+\s*\(/.test(c) && !/\btyping\b/.test(c)) hit('Java static call');
  }

  // ---- definitions / uses ----
  const defined = new Set<string>();
  const processStmt = (stmtRaw: string) => {
    const stmt = stmtRaw.trim();
    if (!stmt) return;
    let m: RegExpExecArray | null;
    if ((m = /^(?:async\s+)?def\s+(\w+)\s*\((.*)\)\s*(?:->.*)?$/s.exec(stmt.slice(0, topColon(stmt) < 0 ? undefined : topColon(stmt) + 0).trim()))) {
      defined.add(m[1]);
      for (const p of splitTop(m[2], ',')) { const pn = /^\s*\**\s*(\w+)/.exec(p); if (pn) defined.add(pn[1]); }
    } else if ((m = /^class\s+(\w+)/.exec(stmt))) defined.add(m[1]);
    // def header might carry an inline body; handled via headers below
    if ((m = /^from\s+[\w.]+\s+import\s+(.+)$/.exec(stmt))) {
      for (const part of m[1].replace(/[()]/g, '').split(',')) { const [a, b] = part.trim().split(/\s+as\s+/); if (a) defined.add((b ?? a).trim()); }
      return;
    }
    if ((m = /^import\s+(.+)$/.exec(stmt))) {
      for (const part of m[1].split(',')) { const [a, b] = part.trim().split(/\s+as\s+/); if (a) defined.add((b ?? a.split('.')[0]).trim()); }
      return;
    }
    if (/^(global|nonlocal)\b/.test(stmt)) { for (const n of idents(stmt.replace(/^\w+/, ''))) defined.add(n); return; }
    // for / with / except targets
    if ((m = /^(?:async\s+)?for\s+(.+?)\s+in\b/s.exec(stmt))) for (const n of targetNames(m[1])) defined.add(n);
    for (const mm of stmt.matchAll(/\bas\s+([A-Za-z_]\w*)/g)) defined.add(mm[1]);
    // comprehension targets anywhere
    for (const mm of stmt.matchAll(/\bfor\s+(.+?)\s+in\b/gs)) for (const n of targetNames(mm[1])) defined.add(n);
    for (const mm of stmt.matchAll(/([A-Za-z_]\w*)\s*:=/g)) defined.add(mm[1]);
    // lambda params
    for (const mm of stmt.matchAll(/\blambda\b([^:]*):/g)) for (const p of splitTop(mm[1], ',')) { const pn = /^\s*\**\s*(\w+)/.exec(p); if (pn) defined.add(pn[1]); }
    // assignments (statement level, possibly chained / augmented / annotated)
    if (!/^(if|elif|while|for|with|return|assert|del|raise|else|try|except|finally|def|class)\b/.test(stmt) || /^(for)\b/.test(stmt) === false) {
      const body = /^(if|elif|while|with|else|try|except|finally)\b/.test(stmt) ? '' : stmt;
      if (body && !/^(return|assert|del|raise|for|def|class|yield|print)\b/.test(body)) {
        const eqs: number[] = [];
        let d = 0;
        for (let i = 0; i < body.length; i++) {
          const c = body[i];
          if ('([{'.includes(c)) d++; else if (')]}'.includes(c)) d--;
          else if (c === '=' && d === 0 && body[i + 1] !== '=' && !/[=!<>:]/.test(body[i - 1] ?? '')) eqs.push(i);
        }
        if (eqs.length) {
          const segs: string[] = [];
          let prev = 0;
          for (const e of eqs) { segs.push(body.slice(prev, e)); prev = e + 1; }
          for (let k = 0; k < segs.length; k++) {
            let t = segs[k];
            t = t.replace(/[-+*/%|&^@]$|\/\/$|\*\*$|<<$|>>$/, '');
            const colon = topColon(t);
            if (colon >= 0) t = t.slice(0, colon); // annotation
            for (const n of targetNames(t)) defined.add(n);
          }
        } else {
          const colon = topColon(body);
          if (colon > 0 && /^[A-Za-z_]\w*$/.test(body.slice(0, colon).trim())) defined.add(body.slice(0, colon).trim()); // bare annotation
        }
      }
    }
  };
  // statements: split logical lines at depth-0 ';' ; peel inline bodies of headers
  const stmts: { ln: number; text: string }[] = [];
  for (const { ln, text } of logical) {
    for (const part of splitTop(text, ';')) {
      let t = part.trim();
      while (t && HEADER.test(t)) {
        const ci = topColon(t);
        stmts.push({ ln, text: t.slice(0, ci < 0 ? undefined : ci) }); // header part (targets etc.)
        const rest = ci < 0 ? '' : t.slice(ci + 1).trim();
        if (/^def\b|^class\b/.test(t)) {
          // def keeps its signature for param extraction
          stmts[stmts.length - 1] = { ln, text: t.slice(0, ci < 0 ? undefined : ci) };
        }
        t = rest;
      }
      if (t) stmts.push({ ln, text: t });
    }
  }
  for (const s of stmts) {
    let t = s.text;
    if (/^(async\s+)?def\b/.test(t)) {
      const m = /^(?:async\s+)?def\s+(\w+)\s*\(([\s\S]*)\)\s*(?:->[^:]*)?$/.exec(t);
      if (m) { defined.add(m[1]); for (const p of splitTop(m[2], ',')) { const pn = /^\s*\**\s*(\w+)/.exec(p); if (pn) defined.add(pn[1]); } }
      continue;
    }
    processStmt(t);
  }

  // ---- usage ----
  const known = (n: string) => KEYWORDS.has(n) || BUILTINS.has(n) || defined.has(n) || (!STRICT_IMPORTS && PRELOADED.has(n)) || (STUBS[n]?.includes(slug) ?? false);
  const reported = new Set<string>();
  for (const { ln, text } of logical) {
    // names introduced by def signatures are not "uses" except defaults/annotations; strip the parameter names
    let t = text;
    t = t.replace(/^(?:async\s+)?def\s+\w+/, '');
    const dm = /^\s*\(([\s\S]*)\)\s*(?:->([^:]*))?:?/.exec(t);
    if (/^(?:async\s+)?def\b/.test(text) && dm) {
      // keep only defaults and annotations
      const keep: string[] = [];
      for (const p of splitTop(dm[1], ',')) {
        const mm = /^\s*\**\s*\w+\s*(?::\s*([^=]*))?(?:=(.*))?$/s.exec(p);
        if (mm) { if (mm[1]) keep.push(mm[1]); if (mm[2]) keep.push(mm[2]); }
      }
      if (dm[2]) keep.push(dm[2]);
      t = keep.join(' ; ');
    }
    // strip lambda parameter lists and import lines
    if (/^(from|import)\b/.test(text.trim())) continue;
    t = t.replace(/\blambda\b([^:]*):/g, 'lambda_:');
    let d = 0;
    const re = /(?<![.\w])([A-Za-z_]\w*)/g;
    let m: RegExpExecArray | null;
    // precompute depth at each index
    const depthAt: number[] = [];
    for (let i = 0; i < t.length; i++) { depthAt.push(d); if ('([{'.includes(t[i])) d++; else if (')]}'.includes(t[i])) d--; }
    while ((m = re.exec(t))) {
      const n = m[1];
      if (known(n) || n === 'lambda_') continue;
      const after = t.slice(m.index + n.length);
      if (depthAt[m.index] > 0 && /^\s*=(?!=)/.test(after)) continue; // keyword argument
      if (/^\s*:(?!=)/.test(after) && /^[\s,{]/.test(t.slice(Math.max(0, m.index - 1), m.index) || ' ') === false && false) continue;
      const isCall = /^\s*\(/.test(after);
      const key = `${isCall ? 'c' : 'n'}:${n}`;
      if (reported.has(key)) continue;
      reported.add(key);
      if (isCall) add('undefined-call', ln, `${n}(...) is not defined in the snippet`);
      else add('undefined-name', ln, `'${n}' is used but never defined/imported`);
    }
  }
  return findings;
}

// ---------------------------------------------------------------------------------------------
const problems = ALL_PROBLEMS.filter((p) => !ONLY.length || ONLY.includes(p.slug));
let total = 0;
const all: string[] = [];
for (const p of problems) {
  const f = analyse(p.slug, p.python);
  total += f.length;
  all.push(...f);
}
for (const f of all) console.log(f);

if (HINTS) {
  console.log('\n--- hints (not failures) ---');
  for (const p of problems) {
    const py = p.python.join('\n'), jv = p.java.join('\n');
    const hints: string[] = [];
    const jm = /(?:public|static|private)\s+[\w<>\[\],.? ]+\s+(\w+)\s*\(/.exec(jv)?.[1];
    if (jm) {
      const snake = jm.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
      if (!new RegExp(`def\\s+(${jm}|${snake})\\b`).test(py) && !/class\s/.test(py)) hints.push(`java method ${jm} vs python defs: ${[...py.matchAll(/def\s+(\w+)/g)].map((m) => m[1]).join(',')}`);
    }
    if (/PriorityQueue/.test(jv) && !/heap|sorted|sort\(/.test(py)) hints.push('Java PriorityQueue but python has no heapq/sort');
    if (/\bheappush|heappop/.test(py) && !/PriorityQueue|TreeMap|TreeSet|sort/.test(jv)) hints.push('python heapq but Java has no PriorityQueue');
    if (/(?<![/])\/(?![/=])/.test(py.replace(/"[^"\n]*"|'[^'\n]*'/g, '')) && !/\b(double|float)\b/.test(jv)) hints.push('python true division "/" while Java has no double/float');
    const loops = (s: string) => (s.match(/\b(for|while)\b/g) ?? []).length;
    if (Math.abs(loops(jv) - loops(py)) > 2) hints.push(`loop count java=${loops(jv)} python=${loops(py)}`);
    for (const h of hints) console.log(`${p.slug}: ${h}`);
  }
}

console.log(`\ncheck-python-panels: ${problems.length} panels scanned, ${total} finding(s)`);
if (total) process.exit(1);
console.log('PYTHON PANELS CLEAN');
