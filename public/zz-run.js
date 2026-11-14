/* AlgoFlow motion / phone QA harness (temporary). Query: set=pat|prob|list (list = ?routes=a,b), from, to, mode=scan|play|deep|page, widths=390,768,1280 */
(async () => {
  const q = new URLSearchParams(location.search);
  const out = document.getElementById('result');
  const mode = q.get('mode') || 'scan';
  const widths = (q.get('widths') || '390').split(',').map(Number);
  const set = q.get('set') || 'pat';
  const results = [];
  let sent = 0;
  const flush = (done) => {
    while (sent < results.length) console.log('ZZRES ' + JSON.stringify(results[sent++]));
    out.textContent = 'sent ' + sent + (done ? ' DONE' : '');
    if (done) { console.log('ZZDONE'); document.title = 'DONE'; }
  };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  let routes;
  if (set === 'list') routes = (q.get('routes') || '').split(',').filter(Boolean);
  else routes = await (await fetch(`/zz-${set}.json`)).json();
  const from = Number(q.get('from') || 0);
  const to = Number(q.get('to') || routes.length);
  routes = routes.slice(from, to);

  function hook(win, log) {
    win.addEventListener('error', (e) => log.errors.push('error: ' + e.message + ' @' + String(e.filename || '').split('/').pop() + ':' + e.lineno));
    win.addEventListener('unhandledrejection', (e) => log.errors.push('rejection: ' + String((e.reason && e.reason.message) || e.reason)));
    const ce = win.console.error;
    win.console.error = (...a) => {
      log.errors.push('console.error: ' + a.map((x) => (typeof x === 'string' ? x : (x && x.message) || String(x))).join(' ').slice(0, 260));
      ce.apply(win.console, a);
    };
  }

  function openFrame(route, w, h) {
    return new Promise((resolve) => {
      const f = document.createElement('iframe');
      f.style.cssText = `position:absolute;left:0;top:0;width:${w}px;height:${h}px;border:0;background:#fff;`;
      const log = { errors: [] };
      let hooked = false;
      const t0 = performance.now();
      const poll = setInterval(() => {
        try {
          const win = f.contentWindow;
          if (!hooked && win && win.location.href !== 'about:blank') { hook(win, log); hooked = true; }
        } catch (e) { /* not ready */ }
      }, 2);
      f.addEventListener('load', () => { clearInterval(poll); resolve({ f, log, t0 }); });
      f.src = route;
      document.body.appendChild(f);
    });
  }

  async function waitFor(fn, ms) {
    const t = performance.now();
    while (performance.now() - t < ms) { let v; try { v = fn(); } catch (e) { v = null; } if (v) return v; await sleep(10); }
    return null;
  }

  const SEL = {
    pat: { ready: '.pp-ctrl button', pic: '.pp-picture', inner: '.pp-picture-inner', card: '#pp-expanel', below: '.pp-stats', counter: '.pp-stepinfo', ctrl: '.pp-ctrl' },
    prob: { ready: '.vp-ctrl-row button', pic: '.vp-stage', inner: '.vp-stage', card: '.vp-viz', below: '.vp-narr', counter: '.vp-pill', ctrl: '.vp-ctrl-row' },
  };

  const BAD = /\bNaN\b|undefined|\[object Object\]|\bInfinity\b/;

  function parseCounter(doc, S) {
    const el = doc.querySelector(S.counter);
    const m = el && /(\d+)\s*\/\s*(\d+)/.exec(el.textContent);
    return m ? { i: +m[1], n: +m[2] } : null;
  }
  function metrics(win, doc, S) {
    const pic = doc.querySelector(S.pic), card = doc.querySelector(S.card), below = doc.querySelector(S.below);
    return {
      pic: pic ? Math.round(pic.getBoundingClientRect().height) : null,
      card: card ? Math.round(card.getBoundingClientRect().height) : null,
      below: below ? Math.round(below.getBoundingClientRect().top + win.scrollY) : null,
      docH: doc.documentElement.scrollHeight,
    };
  }
  function findBtn(doc, S, re) {
    const c = doc.querySelector(S.ctrl);
    return c ? [...c.querySelectorAll('button')].find((b) => re.test(b.textContent)) : null;
  }

  /* ---------------- layout audit (narrow widths) ---------------- */
  function audit(win, doc, kind) {
    const vw = doc.documentElement.clientWidth;
    const res = { vw, docScrollW: doc.documentElement.scrollWidth, offenders: [], scrollers: [], small: [], tiny: [], ctrlClipped: [], phaseRows: 0, hintLines: 0 };
    const cache = new WeakMap();
    const cs = (el) => { let c = cache.get(el); if (!c) { c = win.getComputedStyle(el); cache.set(el, c); } return c; };
    const name = (el) => el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : (el.className && el.className.baseVal ? '.' + el.className.baseVal.trim().split(/\s+/).slice(0, 2).join('.') : ''));
    const all = doc.body.querySelectorAll('*');
    const INTER = 'button, a[href], select, input, textarea, [role=tab], [role=slider], summary';
    for (const el of all) {
      const c = cs(el);
      if (c.display === 'none' || c.visibility === 'hidden') continue;
      if (el.closest('svg') && el.tagName.toLowerCase() !== 'svg' && el.tagName.toLowerCase() !== 'text') { /* skip inner svg shapes for geometry */ }
      const rc = el.getBoundingClientRect();
      if (rc.width === 0 && rc.height === 0) continue;
      // scrollers with overflowing content
      if (/(auto|scroll)/.test(c.overflowX) && el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 0) res.scrollers.push({ el: name(el), sw: el.scrollWidth, cw: el.clientWidth });
      // elements past the viewport and not inside a clipping/scrolling ancestor
      if (c.position !== 'fixed' && (rc.right > vw + 1 || rc.left < -1) && !(el.closest('svg') && el.tagName.toLowerCase() !== 'svg')) {
        let p = el.parentElement, clipped = false;
        while (p && p !== doc.body) { if (/(auto|scroll|hidden|clip)/.test(cs(p).overflowX)) { clipped = true; break; } p = p.parentElement; }
        if (!clipped) res.offenders.push({ el: name(el), left: Math.round(rc.left), right: Math.round(rc.right) });
      }
      // tap targets
      if (el.matches(INTER) && !el.closest('svg')) {
        const type = el.tagName === 'INPUT' ? el.type : '';
        const inline = el.tagName === 'A' && c.display === 'inline';
        if (!inline && type !== 'hidden' && (rc.width < 32 || rc.height < 32)) res.small.push({ el: name(el), w: Math.round(rc.width), h: Math.round(rc.height), t: (el.textContent || '').trim().slice(0, 18) });
      }
      // text size
      let own = '';
      for (const n of el.childNodes) if (n.nodeType === 3) own += n.nodeValue;
      if (own.trim()) {
        let fs = parseFloat(c.fontSize);
        if (el.closest('svg')) { try { const m = el.getScreenCTM(); if (m) fs = fs * Math.abs(m.a); } catch (e) { /* ignore */ } }
        if (fs < 11) res.tiny.push({ el: name(el), px: Math.round(fs * 10) / 10, t: own.trim().slice(0, 14) });
      }
    }
    // controls visible
    const S = SEL[kind];
    const ctrl = doc.querySelector(S.ctrl);
    if (ctrl) {
      for (const el of ctrl.querySelectorAll('button, select, input, .pp-stepinfo')) {
        const rc = el.getBoundingClientRect();
        if (rc.width === 0 || rc.left < -0.5 || rc.right > vw + 0.5) res.ctrlClipped.push(name(el));
      }
      const cr = doc.querySelector(kind === 'pat' ? '.pp-btn.primary' : '.vbtn.play');
      if (cr) { const rc = cr.getBoundingClientRect(); res.playRect = [Math.round(rc.left), Math.round(rc.top), Math.round(rc.width), Math.round(rc.height)]; }
    }
    const chips = [...doc.querySelectorAll(kind === 'pat' ? '.pp-ph' : '.vp-ph')];
    res.phaseRows = new Set(chips.map((x) => Math.round(x.getBoundingClientRect().top))).size;
    res.phaseChips = chips.length;
    const hint = doc.querySelector(kind === 'pat' ? '.pp-hint code' : '.vp-exec code');
    if (hint) { const rc = hint.getBoundingClientRect(); const fs = parseFloat(cs(hint).fontSize); res.hintLines = Math.round(rc.height / (fs * 1.35)); }
    res.nodes = all.length;
    return res;
  }

  /* ---------------- scan: step through every step ---------------- */
  async function scanRoute(route, w) {
    const kind = route.startsWith('/patterns/') ? 'pat' : 'prob';
    const S = SEL[kind];
    const h = w >= 1000 ? 1000 : w >= 700 ? 1024 : 844;
    const { f, log, t0 } = await openFrame(route, w, h);
    const r = { route, w, errors: log.errors, anomalies: [], jumps: [], ovBad: [], slow: [] };
    try {
      const win = f.contentWindow, doc = f.contentDocument;
      const ready = await waitFor(() => doc.querySelector(S.ready) && parseCounter(doc, S), 12000);
      r.loadMs = Math.round(performance.now() - t0);
      if (!ready) {
        r.fatal = 'no controls; root=' + (doc.getElementById('root') ? doc.getElementById('root').childElementCount : 'noroot') + ' text=' + doc.body.innerText.slice(0, 120).replace(/\s+/g, ' ');
        return r;
      }
      const n = ready.n; r.n = n;
      const hasOv = !!doc.querySelector('.pp-overlay');
      const settle = (i) => (hasOv ? 470 : kind === 'prob' && i === 1 ? 480 : 70);
      await sleep(hasOv ? 520 : 150);
      const series = [];
      let m = metrics(win, doc, S); series.push(m);
      r.nodes = doc.body.querySelectorAll('*').length;
      const auditAt = new Set([0, Math.floor((n - 1) / 2), n - 1]);
      if (w < 1000 && auditAt.has(0)) r.layout0 = audit(win, doc, kind);
      let maxMs = 0, sumMs = 0;
      const next = findBtn(doc, S, /Next/);
      let prevErr = log.errors.length;
      const checkStep = (i) => {
        const txt = doc.body.innerText;
        const mm = BAD.exec(txt);
        if (mm) r.anomalies.push({ i, bad: txt.slice(Math.max(0, mm.index - 25), mm.index + 25).replace(/\s+/g, ' ') });
        const inner = doc.querySelector(S.inner);
        if (inner) {
          const kids = [...inner.querySelectorAll('*')].filter((x) => !x.classList.contains('pp-overlay') && !x.closest('.pp-overlay'));
          if (kids.length < 1 || inner.getBoundingClientRect().height < 20) r.anomalies.push({ i, bad: 'EMPTY picture h=' + Math.round(inner.getBoundingClientRect().height) });
        } else r.anomalies.push({ i, bad: 'no picture element' });
        for (const im of doc.images) if (im.complete && im.naturalWidth === 0) r.anomalies.push({ i, bad: 'broken img ' + im.src.slice(-40) });
        if (!doc.getElementById('root').childElementCount) r.anomalies.push({ i, bad: 'ROOT EMPTY (crash)' });
        if (log.errors.length > prevErr) { r.anomalies.push({ i, bad: 'new errors: ' + log.errors.slice(prevErr).join(' | ').slice(0, 200) }); prevErr = log.errors.length; }
        if (hasOv) {
          const ov = doc.querySelector('.pp-overlay');
          if (ov && ov.classList.contains('visible')) {
            const o = ov.getBoundingClientRect();
            let nodes = [...inner.querySelectorAll('[data-cell-index]')];
            if (!nodes.length) nodes = [...inner.querySelectorAll('.viz-box')];
            const rs = nodes.map((x) => x.getBoundingClientRect());
            const okL = rs.some((c) => Math.abs(c.left - 5 - o.left) < 10 && Math.abs(c.top - 5 - o.top) < 10);
            const okR = rs.some((c) => Math.abs(c.right + 5 - o.right) < 10);
            if (!okL || !okR) r.ovBad.push(i);
          }
        }
      };
      checkStep(0);
      for (let i = 1; i < n; i++) {
        if (f.contentDocument !== doc || !doc.defaultView || !doc.body) { r.reloaded = true; break; }
        if (!next || next.disabled) { r.anomalies.push({ i, bad: 'Next missing/disabled before last step' }); break; }
        const tc = performance.now();
        next.click();
        const dt = performance.now() - tc;
        maxMs = Math.max(maxMs, dt); sumMs += dt;
        if (dt > 150) r.slow.push([i, Math.round(dt)]);
        await sleep(settle(i));
        if (f.contentDocument !== doc || !doc.defaultView || !doc.body) { r.reloaded = true; break; }
        const c = parseCounter(doc, S);
        if (!c || c.i !== i + 1) { r.anomalies.push({ i, bad: 'counter ' + (c ? c.i : '?') + ' expected ' + (i + 1) }); }
        m = metrics(win, doc, S);
        const p = series[series.length - 1];
        if (m.below !== null && p.below !== null && Math.abs(m.below - p.below) > 80) r.jumps.push({ i, below: m.below - p.below, pic: m.pic - p.pic, card: m.card - p.card });
        series.push(m);
        checkStep(i);
        if (w < 1000 && auditAt.has(i)) { r['layout' + i] = audit(win, doc, kind); }
        else if (w < 1000) { const sw = doc.documentElement.scrollWidth; if (sw > doc.documentElement.clientWidth + 1) (r.docOverflowSteps = r.docOverflowSteps || []).push([i, sw]); }
        const nn = doc.body.getElementsByTagName('*').length; if (nn > r.nodes) r.nodes = nn;
      }
      r.maxMs = Math.round(maxMs); r.avgMs = Math.round(sumMs / Math.max(1, n - 1));
      const pics = series.map((x) => x.pic).filter((x) => x !== null);
      r.picMin = Math.min(...pics); r.picMax = Math.max(...pics);
      const bel = series.map((x) => x.below).filter((x) => x !== null);
      r.belowRange = bel.length ? Math.max(...bel) - Math.min(...bel) : null;
      r.errorsFinal = log.errors.length;
      r.errors = log.errors.slice(0, 6);
    } catch (e) { r.fatal = 'harness: ' + (e && e.message); }
    finally { f.remove(); }
    return r;
  }

  /* ---------------- playback tests ---------------- */
  function setSelect(win, el, v) { const d = Object.getOwnPropertyDescriptor(win.HTMLSelectElement.prototype, 'value'); d.set.call(el, String(v)); el.dispatchEvent(new win.Event('change', { bubbles: true })); }
  function setRange(win, el, v) { const d = Object.getOwnPropertyDescriptor(win.HTMLInputElement.prototype, 'value'); d.set.call(el, String(v)); el.dispatchEvent(new win.Event('input', { bubbles: true })); el.dispatchEvent(new win.Event('change', { bubbles: true })); }
  function key(win, doc, k) { doc.body.dispatchEvent(new win.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true })); }

  async function playRoute(route) {
    const kind = route.startsWith('/patterns/') ? 'pat' : 'prob';
    const S = SEL[kind];
    const { f, log } = await openFrame(route, 1280, 1000);
    const r = { route, issues: [], speeds: {} };
    try {
      const win = f.contentWindow, doc = f.contentDocument;
      const ready = await waitFor(() => doc.querySelector(S.ready) && parseCounter(doc, S), 12000);
      if (!ready) { r.issues.push('no controls'); return r; }
      const n = ready.n; r.n = n;
      const idx = () => parseCounter(doc, S).i;
      const play = () => findBtn(doc, S, /Play|Pause/);
      const label = () => play().textContent.trim();
      await sleep(400);
      // speeds
      const speedList = kind === 'pat'
        ? [['Turbo', 3, 180], ['Fast', 2, 450], ['Normal', 1, 900], ['Slow', 0, 1500]]
        : [['VFast', 5, 600], ['Fast', 4, 1000], ['Normal', 3, 1600]];
      const doSpeeds = q.get('speeds') === '1';
      for (const [name, val, ms] of doSpeeds ? speedList : speedList.slice(0, 1)) {
        findBtn(doc, S, /Reset/).click(); await sleep(60);
        if (kind === 'pat') setSelect(win, doc.querySelector('.pp-speed'), val); else setRange(win, doc.querySelector('.vp-speed input'), val);
        await sleep(50);
        const want = Math.min(3, n - 1);
        if (want < 2) continue;
        play().click();
        await sleep(ms * want + ms * 0.45);
        const got = idx() - 1;
        play().click(); // pause
        await sleep(30);
        const at = idx();
        await sleep(ms * 2 + 100);
        const after = idx();
        r.speeds[name] = { ms, want, got, pausedHolds: at === after };
        if (Math.abs(got - want) > 1) r.issues.push(`speed ${name}: advanced ${got} in ${ms * want}ms (want ~${want})`);
        if (at !== after) r.issues.push(`pause did not hold at speed ${name}`);
        if (label() !== (kind === 'pat' ? '▶ Play' : '▶ Play')) r.issues.push('label after pause: ' + label());
      }
      // prev / next / reset buttons
      findBtn(doc, S, /Reset/).click(); await sleep(60);
      if (idx() !== 1) r.issues.push('reset -> ' + idx());
      if (n > 2) {
        findBtn(doc, S, /Next/).click(); await sleep(60); findBtn(doc, S, /Next/).click(); await sleep(60);
        if (idx() !== 3) r.issues.push('next x2 -> ' + idx());
        findBtn(doc, S, /Prev/).click(); await sleep(60);
        if (idx() !== 2) r.issues.push('prev -> ' + idx());
        // keyboard
        key(win, doc, 'ArrowRight'); await sleep(60);
        if (idx() !== 3) r.issues.push('ArrowRight -> ' + idx());
        key(win, doc, 'ArrowLeft'); await sleep(60);
        if (idx() !== 2) r.issues.push('ArrowLeft -> ' + idx());
        if (kind === 'prob') {
          key(win, doc, ' '); await sleep(60);
          const playing = /Pause/.test(label());
          key(win, doc, ' '); await sleep(60);
          if (!playing || /Pause/.test(label())) r.issues.push('Space toggle: playing=' + playing + ' after=' + label());
          key(win, doc, 'r'); await sleep(60);
          if (idx() !== 1) r.issues.push('R key -> ' + idx());
        } else {
          key(win, doc, ' '); await sleep(60);
          r.spaceWorks = /Pause/.test(label());
          if (r.spaceWorks) { key(win, doc, ' '); }
        }
        // make sure paused and at start
        if (/Pause/.test(label())) play().click();
        findBtn(doc, S, /Reset/).click(); await sleep(60);
      }
      // full playback to the end at the fastest speed (cap)
      if (kind === 'pat') setSelect(win, doc.querySelector('.pp-speed'), 3); else setRange(win, doc.querySelector('.vp-speed input'), 5);
      await sleep(50);
      if (n <= (kind === 'pat' ? 60 : 30)) {
        const per = kind === 'pat' ? 180 : 600;
        play().click();
        const done = await waitFor(() => idx() === n && /Play/.test(label()), per * n + 2000);
        if (!done) r.issues.push(`playback did not reach the end/stop: idx=${idx()}/${n} label=${label()}`);
        // Play on the last step restarts
        if (done) {
          play().click(); await sleep(per * 1.5);
          const ix = idx();
          if (!(ix >= 1 && ix <= 3) || !/Pause|Play/.test(label())) r.issues.push('play on last: idx=' + ix);
          if (ix === n) r.issues.push('play on last did not restart');
          if (/Pause/.test(label())) play().click();
        }
      }
      r.errors = log.errors.slice(0, 5);
      if (log.errors.length) r.issues.push('errors: ' + log.errors.length);
    } catch (e) { r.issues.push('harness: ' + (e && e.message)); }
    finally { f.remove(); }
    return r;
  }

  /* ---------------- deep link ---------------- */
  async function deepRoute(route) {
    const kind = route.startsWith('/patterns/') ? 'pat' : 'prob';
    const S = SEL[kind];
    const r = { route, issues: [] };
    for (const want of [2, 5, 999]) {
      const sep = route.includes('?') ? '&' : '?';
      const { f, log } = await openFrame(route + sep + 'step=' + want, 1280, 1000);
      try {
        const doc = f.contentDocument;
        const ready = await waitFor(() => doc.querySelector(S.ready) && parseCounter(doc, S), 12000);
        if (!ready) { r.issues.push('no controls @' + want); continue; }
        await sleep(300);
        const c = parseCounter(doc, S);
        const exp = Math.min(want, c.n);
        // the problem page only seeks when n>1; both are 1-based
        if (c.i !== exp) r.issues.push(`step=${want} -> ${c.i}/${c.n} (want ${exp})`);
      } catch (e) { r.issues.push('harness ' + e.message); } finally { f.remove(); }
    }
    return r;
  }

  /* ---------------- generic page audit (library, patterns, cheatsheet...) ---------------- */
  async function pageRoute(route, w) {
    const h = w >= 1000 ? 1000 : w >= 700 ? 1024 : 844;
    const { f, log } = await openFrame(route, w, h);
    const r = { route, w };
    try {
      const doc = f.contentDocument, win = f.contentWindow;
      await waitFor(() => doc.getElementById('root') && doc.getElementById('root').innerText.length > 50, 12000);
      await sleep(600);
      r.layout = audit(win, doc, 'pat');
      r.errors = log.errors.slice(0, 5);
      r.docH = doc.documentElement.scrollHeight;
    } catch (e) { r.fatal = e.message; } finally { f.remove(); }
    return r;
  }

  // a dev-server restart (other agents editing files) reloads the iframe mid-run: retry such routes
  const retrying = async (fn) => {
    let r;
    for (let a = 0; a < 5; a++) {
      r = await fn();
      const bad = r.reloaded || (r.fatal && /no controls|harness|Cannot read/.test(r.fatal)) || (r.issues && r.issues.some((s) => /harness|no controls/.test(s)));
      if (!bad) break;
      r.attempt = a + 1;
      await sleep(4000);
    }
    return r;
  };
  for (const route of routes) {
    if (mode === 'scan') for (const w of widths) results.push(await retrying(() => scanRoute(route, w)));
    else if (mode === 'play') results.push(await retrying(() => playRoute(route)));
    else if (mode === 'deep') results.push(await retrying(() => deepRoute(route)));
    else if (mode === 'page') for (const w of widths) results.push(await retrying(() => pageRoute(route, w)));
    flush(false);
  }
  flush(true);
})();
