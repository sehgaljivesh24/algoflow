/** DOM-level behaviour of the Pattern Index viewer (kept out of the component so it can be read on its own). */

const norm = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase();

// per-element caches: topic/row text never changes once rendered
const rowText = new WeakMap<Element, string>();
const topicOwnText = new WeakMap<Element, string>();

function textOfRow(row: Element): string {
  let t = rowText.get(row);
  if (t === undefined) {
    t = norm(row.textContent || '');
    rowText.set(row, t);
  }
  return t;
}

/** Text of a topic outside its table body rows (headings, intro, labels, table heads, examples, code). */
function textOutsideRows(topic: Element): string {
  let t = topicOwnText.get(topic);
  if (t === undefined) {
    const clone = topic.cloneNode(true) as Element;
    clone.querySelectorAll('tbody tr').forEach((r) => r.remove());
    clone.querySelectorAll('button.copy-btn').forEach((b) => b.remove());
    t = norm(clone.textContent || '');
    topicOwnText.set(topic, t);
  }
  return t;
}

/**
 * Same rules as the original page: with a query, every `tbody tr` that does not contain it is hidden and a topic stays
 * visible when any row, or any other text in it (headings, examples, code), matches. `q` must already be normalised.
 */
export function applyFilter(root: HTMLElement, q: string): void {
  root.querySelectorAll<HTMLElement>('section.topic').forEach((topic) => {
    if (!q) {
      topic.classList.remove('hidden');
      topic.querySelectorAll('tr.hidden').forEach((r) => r.classList.remove('hidden'));
      return;
    }
    if (topic.dataset.loaded !== '1') {
      topic.classList.add('hidden'); // still being fetched; everything is fetched as soon as a query is typed
      return;
    }
    let any = false;
    topic.querySelectorAll('tbody tr').forEach((row) => {
      const match = textOfRow(row).includes(q);
      row.classList.toggle('hidden', !match);
      if (match) any = true;
    });
    topic.classList.toggle('hidden', !(any || textOutsideRows(topic).includes(q)));
  });
}

/** Copy the code next to a `.copy-btn` and flash "copied" on the button. */
export function copyCodeFrom(btn: HTMLButtonElement, timers: Set<number>): void {
  const code = btn.parentElement?.querySelector('code');
  if (!code) return;
  const text = code.textContent || '';
  const done = () => {
    const old = btn.dataset.label || btn.textContent || 'copy';
    btn.dataset.label = old;
    btn.textContent = 'copied';
    btn.classList.add('copied');
    const t = window.setTimeout(() => {
      btn.textContent = old;
      btn.classList.remove('copied');
      timers.delete(t);
    }, 1400);
    timers.add(t);
  };
  const fallback = () => {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    try {
      if (document.execCommand('copy')) done();
    } finally {
      ta.remove();
    }
  };
  if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(done, fallback);
  else fallback();
}
