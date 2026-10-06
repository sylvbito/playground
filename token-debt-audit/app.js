/* ============================================================
   Token Debt Audit — app.js
   UI + rendering. Engine is in engine.js (TDA).
   ============================================================ */
(function () {
  'use strict';

  const $ = function (s, r) { return (r || document).querySelector(s); };
  const $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  const state = {
    model: null,        // parsed model (reused across threshold changes)
    analysis: null,
    threshold: 2,
    rootPx: 16,
    source: '',
    inputOpen: true
  };

  /* ---------- tiny helpers ---------- */
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function el(tag, cls, html) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function nf(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function rgbaOf(rgb) {
    return 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + (rgb.a == null ? 1 : rgb.a) + ')';
  }
  function contrastLabel(r) {
    if (r >= 7) return 'AAA';
    if (r >= 4.5) return 'AA';
    if (r >= 3) return 'AA-lg';
    return 'fail';
  }
  /* background-color (not the background shorthand) so the .alpha checkerboard
     survives — the shorthand would reset background-image. */
  function swatch(cls, rgb) {
    const s = el('span', 'sw ' + cls);
    s.style.backgroundColor = rgbaOf(rgb);
    if (rgb.a < 0.999) s.classList.add('alpha');
    return s;
  }
  function toneFor(score) {
    if (score >= 85) return 'good';
    if (score >= 70) return 'ok';
    if (score >= 50) return 'warn';
    return 'bad';
  }

  /* ============================================================
     Controls
     ============================================================ */
  function wire() {
    const ta = $('#css-input');
    const drop = $('#drop');

    $('#btn-sample').addEventListener('click', function () {
      ta.value = TDA.SAMPLE;
      run('sample stylesheet');
    });
    $('#btn-run').addEventListener('click', function () { run('pasted CSS'); });
    $('#btn-clear').addEventListener('click', function () {
      ta.value = '';
      state.model = null; state.analysis = null;
      $('#report').innerHTML = '';
      $('#empty').hidden = false;
      $('#report').hidden = true;
      ta.focus();
    });
    $('#btn-edit').addEventListener('click', function () {
      setInputOpen(!state.inputOpen);
    });

    const thr = $('#threshold');
    thr.addEventListener('input', function () {
      state.threshold = parseFloat(thr.value);
      $('#threshold-val').textContent = state.threshold.toFixed(1);
      updateThresholdCaption();
      if (state.model) { analyseAndRender(); }
    });
    const rootInput = $('#rootpx');
    rootInput.addEventListener('input', function () {
      const v = parseInt(rootInput.value, 10);
      if (v >= 4 && v <= 40) {
        state.rootPx = v;
        if (state.source) run('re-parsed at ' + v + 'px root');
      }
    });

    /* file input + drag & drop */
    $('#file').addEventListener('change', function (e) {
      readFiles(e.target.files);
    });
    ['dragenter', 'dragover'].forEach(function (ev) {
      drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('over'); });
    });
    ['dragleave', 'drop'].forEach(function (ev) {
      drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('over'); });
    });
    drop.addEventListener('drop', function (e) {
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) readFiles(e.dataTransfer.files);
    });
    document.addEventListener('paste', function (e) {
      if (e.target === ta) return;
      const t = e.clipboardData && e.clipboardData.getData('text');
      if (t && t.length > 40) { ta.value = t; run('pasted CSS'); }
    });

    /* bookmarklet */
    const bm = $('#bookmarklet');
    if (bm) {
      const code = "javascript:(function(){var o=[],s=document.styleSheets;for(var i=0;i<s.length;i++){try{var r=s[i].cssRules;for(var j=0;j<r.length;j++)o.push(r[j].cssText)}catch(e){o.push('/* blocked cross-origin: '+((s[i].href||'inline'))+' */')}}var t=o.join('\\n');function ok(){alert('Copied '+o.length+' CSS rules. Paste them into Token Debt Audit.')}if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t).then(ok,function(){prompt('Copy this CSS:',t)})}else{prompt('Copy this CSS:',t)}})();";
      bm.setAttribute('href', code);
      $('#copy-bm').addEventListener('click', function () {
        copy(code, this);
      });
    }

    document.addEventListener('keydown', function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && ta.value.trim()) { e.preventDefault(); run('pasted CSS'); }
    });
  }

  function setInputOpen(open) {
    state.inputOpen = open;
    $('#input-panel').classList.toggle('collapsed', !open);
    $('#btn-edit').textContent = open ? 'Hide input' : 'Edit source CSS';
  }

  function updateThresholdCaption() {
    const t = state.threshold;
    let word = 'imperceptible';
    if (t > 1.2) word = 'indistinguishable to most eyes';
    if (t > 3) word = 'visible on close inspection';
    if (t > 6) word = 'clearly different colours';
    $('#threshold-cap').textContent = 'ΔE ' + t.toFixed(1) + ' — ' + word;
  }

  function readFiles(files) {
    const list = Array.prototype.slice.call(files).filter(function (f) {
      return /\.(css|html?|scss|txt)$/i.test(f.name);
    });
    if (!list.length) return;
    let done = 0, parts = [];
    list.forEach(function (f, i) {
      const r = new FileReader();
      r.onload = function () {
        parts[i] = r.result;
        if (++done === list.length) {
          $('#css-input').value = parts.join('\n\n');
          run(list.map(function (x) { return x.name; }).join(' + '));
        }
      };
      r.readAsText(f);
    });
  }

  function copy(text, btn) {
    const done = function () {
      if (!btn) return;
      const old = btn.textContent;
      btn.textContent = 'Copied';
      btn.classList.add('done');
      setTimeout(function () { btn.textContent = old; btn.classList.remove('done'); }, 1400);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { fallback(); });
    } else fallback();
    function fallback() {
      const t = el('textarea');
      t.value = text;
      document.body.appendChild(t);
      t.select();
      try { document.execCommand('copy'); } catch (e) { /* ignore */ }
      document.body.removeChild(t);
      done();
    }
  }

  function download(name, text) {
    const b = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const a = el('a');
    a.href = URL.createObjectURL(b);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
  }

  /* ============================================================
     Run
     ============================================================ */
  function run(sourceLabel) {
    const raw = $('#css-input').value;
    if (!raw.trim()) {
      $('#empty').hidden = false;
      $('#report').hidden = true;
      return;
    }
    const extracted = TDA.extractCSS(raw);
    state.source = extracted.css;
    state.extracted = extracted.extracted;
    state.sourceLabel = sourceLabel;
    state.model = TDA.parse(state.source, { rootPx: state.rootPx });
    analyseAndRender();
    setInputOpen(false);
    $('#empty').hidden = true;
    $('#report').hidden = false;
    const r = $('#report');
    if (r.getBoundingClientRect().top > window.innerHeight) r.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }

  function analyseAndRender() {
    state.analysis = TDA.analyse(state.model, { threshold: state.threshold, rootPx: state.rootPx });
    render();
  }

  /* ============================================================
     Render
     ============================================================ */
  function render() {
    const a = state.analysis;
    const root = $('#report');
    root.innerHTML = '';

    root.appendChild(renderSummary(a));
    root.appendChild(renderFindings(a));
    root.appendChild(renderColours(a));
    root.appendChild(renderSpacing(a));
    root.appendChild(renderType(a));
    root.appendChild(renderMisc(a));
    root.appendChild(renderTokens(a));
    root.appendChild(renderMapping(a));
    root.appendChild(renderFooter(a));
  }

  function section(id, title, note) {
    const s = el('section', 'card');
    s.id = id;
    const h = el('header', 'card-head');
    h.appendChild(el('h2', null, esc(title)));
    if (note) h.appendChild(el('p', 'note', note));
    s.appendChild(h);
    return s;
  }

  /* ---------- summary ---------- */
  function renderSummary(a) {
    const s = el('section', 'card summary');
    const grid = el('div', 'summary-grid');

    const badge = el('div', 'score-block');
    badge.appendChild(el('div', 'score-num tone-' + toneFor(a.score.overall), String(a.score.overall)));
    badge.appendChild(el('div', 'score-band tone-' + a.score.band.tone, a.score.band.label));
    badge.appendChild(el('div', 'score-cap', 'token consistency'));
    grid.appendChild(badge);

    const axes = el('div', 'axes');
    const maxScore = 100;
    a.score.axes.forEach(function (ax) {
      const row = el('div', 'axis');
      row.appendChild(el('div', 'axis-top', '<span class="axis-name">' + esc(ax.name) + '</span><span class="axis-score">' + ax.score + '</span>'));
      const bar = el('div', 'bar');
      const fill = el('i', 'bar-fill tone-' + toneFor(ax.score));
      fill.style.width = (ax.score / maxScore * 100) + '%';
      bar.appendChild(fill);
      row.appendChild(bar);
      row.appendChild(el('div', 'axis-detail', esc(ax.detail)));
      axes.appendChild(row);
    });
    grid.appendChild(axes);

    const facts = el('div', 'facts');
    const st = a.stats;
    const rows = [
      ['Declarations analysed', nf(st.declarations)],
      ['Rules / blocks', nf(st.blocks)],
      ['Literal colours', nf(st.uniqueColours) + ' · ' + nf(st.colourUses) + ' uses'],
      ['Distinct spacing values', nf(a.spacing.distinct.length)],
      ['Distinct font sizes', nf(a.type.distinct.length)],
      ['Custom properties', nf(a.customProps.used)],
      ['var() references', nf(st.varRefs) + ' (' + Math.round(st.varRate * 100) + '%)'],
      ['Calc / clamp values', nf(st.dynamicValues)]
    ];
    rows.forEach(function (r) {
      facts.appendChild(el('div', 'fact', '<span>' + esc(r[0]) + '</span><b>' + esc(r[1]) + '</b>'));
    });
    grid.appendChild(facts);

    s.appendChild(grid);

    const src = el('div', 'srcbar');
    src.appendChild(el('span', null, 'Source: <b>' + esc(state.sourceLabel || 'pasted CSS') + '</b>'
      + (state.extracted ? ' · ' + state.extracted + ' block(s) extracted from HTML' : '')
      + ' · merge threshold ΔE ' + state.threshold.toFixed(1)));
    s.appendChild(src);
    return s;
  }

  /* ---------- findings ---------- */
  function renderFindings(a) {
    const s = section('findings', 'What to fix', 'Ordered by impact. Every claim is a count taken from the CSS you pasted.');
    const list = el('ol', 'findings');
    a.findings.forEach(function (f) {
      const li = el('li', 'finding lvl-' + f.level);
      li.appendChild(el('div', 'f-head', '<span class="dot"></span><span class="f-title">' + esc(f.title) + '</span>'));
      li.appendChild(el('p', 'f-detail', esc(f.detail)));
      list.appendChild(li);
    });
    if (!a.findings.length) list.appendChild(el('li', 'finding none', 'Nothing to report — this stylesheet is already tight.'));
    s.appendChild(list);
    return s;
  }

  /* ---------- colours ---------- */
  function renderColours(a) {
    const c = a.colours;
    const note = nf(c.entries.length) + ' literal colours · ' + nf(c.clusters.length) + ' tokens at ΔE ≤ '
      + state.threshold.toFixed(1) + '. Names are <b>hue + OKLab lightness %</b> (100 = white).';
    const s = section('colours', 'Colour', note);

    /* chroma plane */
    const planeWrap = el('div', 'plane-wrap');
    const cv = el('canvas', 'plane');
    cv.width = 720; cv.height = 460;
    planeWrap.appendChild(cv);
    planeWrap.appendChild(el('div', 'plane-legend',
      '<b>Where the colours actually sit.</b> Axes are OKLab a/b, so achromatic greys pile up at the origin. '
      + 'Each circled dot is a proposed token; the dashed ring is the merge radius. Dots inside a ring are duplicates of it.'));
    s.appendChild(planeWrap);

    /* cluster ledger */
    const ledger = el('div', 'clusters');
    const sorted = c.clusters.slice().sort(function (x, y) { return y.oklch.L - x.oklch.L; });
    sorted.forEach(function (cl) {
      const row = el('div', 'cluster' + (cl.members.length > 1 ? ' merges' : ''));
      const head = el('div', 'cl-head');
      head.appendChild(swatch('sw-lg', cl.canonical.rgb));
      const meta = el('div', 'cl-meta');
      meta.appendChild(el('code', 'cl-token', esc(cl.token)));
      meta.appendChild(el('span', 'cl-hex', esc(TDA.toCss(cl.canonical.rgb))
        + ' · L ' + Math.round(cl.oklch.L * 100)
        + (cl.neutral ? '' : ' · C ' + cl.oklch.C.toFixed(2) + ' · h ' + Math.round(cl.oklch.h) + '°')));
      head.appendChild(meta);
      head.appendChild(el('div', 'cl-count', '<b>' + cl.total + '</b> use' + (cl.total === 1 ? '' : 's')
        + (cl.members.length > 1 ? '<em>' + cl.members.length + ' values</em>' : '')));
      row.appendChild(head);

      if (cl.members.length > 1) {
        const chips = el('div', 'chips');
        cl.members.forEach(function (m, i) {
          const chip = el('span', 'chip' + (i === 0 ? ' lead' : ''));
          const d = el('i');
          d.style.backgroundColor = rgbaOf(m.rgb);
          if (m.rgb.a < 0.999) d.classList.add('alpha');
          chip.appendChild(d);
          chip.appendChild(el('span', null, esc(TDA.toCss(m.rgb))));
          const lits = Array.from(m.literals.keys()).filter(function (l) { return l.length > 9 || l.charAt(0) !== '#'; });
          if (lits.length) chip.appendChild(el('u', null, esc(lits[0])));
          chip.appendChild(el('b', null, '×' + m.count));
          if (i > 0) chip.title = 'ΔE ' + m.leaderDistance + ' from ' + cl.token;
          chips.appendChild(chip);
        });
        row.appendChild(chips);
      }
      const props = el('div', 'cl-props', 'used in: ' + cl.props.map(function (p) { return '<code>' + esc(p) + '</code>'; }).join(' '));
      row.appendChild(props);
      ledger.appendChild(row);
    });
    s.appendChild(ledger);

    drawPlane(cv, c);

    /* contrast matrix */
    if (a.matrix.colours.length > 1) {
      s.appendChild(el('h3', 'sub', 'Contrast between your most-used tokens'));
      const tbl = el('table', 'matrix');
      const head = el('tr');
      head.appendChild(el('th', null, ''));
      a.matrix.colours.forEach(function (cl) {
        const th = el('th');
        th.appendChild(swatch('sw-xs', cl.canonical.rgb));
        th.appendChild(el('span', 'mx-lab', esc(cl.token.replace('--', ''))));
        head.appendChild(th);
      });
      tbl.appendChild(head);
      a.matrix.colours.forEach(function (cl, i) {
        const tr = el('tr');
        const th = el('th');
        th.appendChild(swatch('sw-xs', cl.canonical.rgb));
        th.appendChild(el('span', 'mx-lab', esc(cl.token.replace('--', ''))));
        tr.appendChild(th);
        a.matrix.ratios[i].forEach(function (r, j) {
          const td = el('td', i === j ? 'diag' : (r >= 4.5 ? 'pass' : (r >= 3 ? 'mid' : 'fail')));
          td.textContent = i === j ? '—' : r.toFixed(1);
          if (i !== j) td.title = contrastLabel(r) + ' · ' + a.matrix.colours[j].token + ' on ' + cl.token;
          tr.appendChild(td);
        });
        tbl.appendChild(tr);
      });
      s.appendChild(tbl);
      s.appendChild(el('p', 'note', 'Ratio of the row colour over the column colour. 4.5+ is AA for body text, 3+ for large text and UI boundaries.'));
    }

    if (a.stats.unparsed.length) {
      s.appendChild(el('p', 'note warn-note', 'Not analysed: ' + a.stats.unparsed.map(function (u) {
        return '<code>' + esc(u.value) + '</code> ×' + u.count;
      }).join(', ') + ' — outside the engine\'s supported colour functions (lab/lch, display-p3). They are excluded from the token count rather than guessed at.'));
    }
    return s;
  }

  function drawPlane(cv, c) {
    const dpr = window.devicePixelRatio || 1;
    const W = Math.min(cv.clientWidth || 520, 520), H = W;
    cv.width = W * dpr; cv.height = H * dpr;
    cv.style.height = H + 'px';
    const g = cv.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);

    const R = 0.26;                                   // OKLab a/b half-range
    const pad = 34;
    const side = Math.min(W - pad * 2, H - pad * 2);
    const cx = W / 2, cy = H / 2;
    const sc = side / (R * 2);
    const X = function (a) { return cx + a * sc; };
    const Y = function (b) { return cy - b * sc; };

    const st = getComputedStyle(document.body);
    const line = st.getPropertyValue('--line-2').trim() || '#333';
    const dim = st.getPropertyValue('--dim').trim() || '#666';
    const bg = st.getPropertyValue('--panel-3').trim() || '#1b1b26';

    g.fillStyle = bg;
    g.fillRect(cx - side / 2, cy - side / 2, side, side);

    /* grid rings */
    g.strokeStyle = line; g.lineWidth = 1;
    [0.05, 0.1, 0.15, 0.2].forEach(function (r) {
      g.beginPath(); g.arc(cx, cy, r * sc, 0, Math.PI * 2); g.stroke();
    });
    g.setLineDash([3, 4]);
    g.beginPath();
    g.moveTo(cx, cy - side / 2); g.lineTo(cx, cy + side / 2);
    g.moveTo(cx - side / 2, cy); g.lineTo(cx + side / 2, cy);
    g.stroke();
    g.setLineDash([]);

    g.fillStyle = dim;
    g.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
    g.fillText('+b  yellow', cx + 7, cy - side / 2 + 14);
    g.fillText('−b  blue', cx + 7, cy + side / 2 - 8);
    g.fillText('+a  red  →', cx + side / 2 - 62, cy - 8);
    g.fillText('←  −a  green', cx - side / 2 + 8, cy - 8);
    g.fillStyle = dim;
    g.fillText('greys', cx + 6, cy + 20);

    const rPix = Math.max((state.threshold / 100) * sc, 4);

    /* merge radius rings first (behind) */
    c.clusters.forEach(function (cl) {
      const o = TDA.oklchOf(cl.canonical.rgb);
      const a = o.C * Math.cos(o.h * Math.PI / 180);
      const b = o.C * Math.sin(o.h * Math.PI / 180);
      if (cl.members.length > 1) {
        g.strokeStyle = 'rgba(124,124,255,.5)';
        g.setLineDash([2, 3]);
        g.beginPath(); g.arc(X(a), Y(b), rPix, 0, Math.PI * 2); g.stroke();
        g.setLineDash([]);
      }
    });

    /* dots */
    c.clusters.forEach(function (cl) {
      cl.members.forEach(function (m, i) {
        const o = TDA.oklchOf(m.rgb);
        const a = o.C * Math.cos(o.h * Math.PI / 180);
        const b = o.C * Math.sin(o.h * Math.PI / 180);
        const x = X(a), y = Y(b);
        const size = Math.min(15, 3.6 + Math.sqrt(m.count) * 1.6);
        g.fillStyle = rgbaOf(m.rgb);
        g.beginPath(); g.arc(x, y, i === 0 ? size : size * 0.7, 0, Math.PI * 2); g.fill();
        if (i === 0) {
          g.strokeStyle = 'rgba(255,255,255,.85)';
          g.lineWidth = 1.5;
          g.beginPath(); g.arc(x, y, size, 0, Math.PI * 2); g.stroke();
        }
      });
    });
  }

  /* ---------- spacing ---------- */
  function renderSpacing(a) {
    const sp = a.spacing;
    const U = sp.unit;
    const note = nf(sp.distinct.length) + ' distinct ' + U + ' values across ' + nf(sp.totalUses)
      + ' declarations · ' + Math.round(sp.gridFit * 100) + '% of usage lands on a ' + sp.grid + U + ' grid.';
    const s = section('spacing', 'Space', note);
    if (!sp.distinct.length) {
      s.appendChild(el('p', 'note', 'No literal ' + U + ' spacing values found.'));
      return s;
    }
    if (sp.excludedUnits.length) {
      s.appendChild(el('p', 'note warn-note', 'Measuring in ' + U + ' because that is what the sheet overwhelmingly uses. '
        + sp.excludedUnits.map(function (u) { return u.count + ' value(s) in ' + u.unit; }).join(', ')
        + ' are excluded rather than converted and judged against a grid they were never written to.'));
    }

    /* ruler */
    const max = sp.max || 1;
    const ruler = el('div', 'ruler');
    const ticks = el('div', 'ruler-track');
    for (let k = 0; k * sp.grid <= max + 1e-9; k++) {
      const v = k * sp.grid;
      const t = el('i', 'grid-tick');
      t.style.left = (v / max * 100) + '%';
      if (k % 5 === 0) t.classList.add('major');
      ticks.appendChild(t);
    }
    const maxCount = sp.distinct.reduce(function (m, d) { return Math.max(m, d.count); }, 1);
    sp.distinct.forEach(function (d) {
      const snapped = Math.round(d.v / sp.grid) * sp.grid;
      const on = Math.abs(snapped - d.v) < (U === 'px' ? 1e-6 : 1e-4);
      const t = el('i', 'tick' + (on ? ' on' : ' off'));
      t.style.left = (d.v / max * 100) + '%';
      t.style.height = (18 + (d.count / maxCount) * 74) + '%';
      t.title = d.v + U + ' ×' + d.count + (on ? ' (on grid)' : ' → ' + snapped + U);
      ticks.appendChild(t);
    });
    ruler.appendChild(ticks);
    ruler.appendChild(el('div', 'ruler-cap', '<span>0</span><span>value → ' + max + U + '</span>'));
    s.appendChild(ruler);

    /* off-grid table */
    const cols = el('div', 'two-col');
    const box1 = el('div', 'subcard');
    box1.appendChild(el('h3', 'sub', 'Off the ' + sp.grid + U + ' grid'));
    if (sp.offGrid.length) {
      const t = el('table', 'tbl');
      t.appendChild(el('tr', null, '<th>value</th><th>uses</th><th>nearest</th><th>Δ</th>'));
      sp.offGrid.forEach(function (d) {
        const tr = el('tr');
        tr.appendChild(el('td', null, '<code>' + d.v + U + '</code>'));
        tr.appendChild(el('td', null, '×' + d.count));
        tr.appendChild(el('td', null, '<code>' + d.snapped + U + '</code>'));
        tr.appendChild(el('td', null, (d.delta > 0 ? '+' : '') + d.delta));
        t.appendChild(tr);
      });
      box1.appendChild(t);
    } else box1.appendChild(el('p', 'note', 'Every value sits on the grid.'));
    cols.appendChild(box1);

    const box2 = el('div', 'subcard');
    box2.appendChild(el('h3', 'sub', 'Near-miss pairs (≤ ' + sp.nearGap + U + ' apart)'));
    if (sp.nearMisses.length) {
      const t = el('table', 'tbl');
      t.appendChild(el('tr', null, '<th>a</th><th>b</th><th>gap</th>'));
      sp.nearMisses.slice(0, 10).forEach(function (p) {
        t.appendChild(el('tr', null, '<td><code>' + p.a.v + U + '</code> ×' + p.a.count + '</td><td><code>'
          + p.b.v + U + '</code> ×' + p.b.count + '</td><td>' + p.gap + U + '</td>'));
      });
      box2.appendChild(t);
    } else box2.appendChild(el('p', 'note', 'No ambiguous pairs.'));
    cols.appendChild(box2);
    s.appendChild(cols);

    /* grid fit per candidate */
    const fit = el('div', 'fitrow');
    fit.appendChild(el('span', 'fitcap', 'grid fit'));
    sp.perCandidate.forEach(function (c) {
      const b = el('span', 'fitpill' + (c.step === sp.grid ? ' active' : ''));
      b.innerHTML = c.step + U + ' <b>' + Math.round(c.frac * 100) + '%</b>';
      fit.appendChild(b);
    });
    s.appendChild(fit);
    return s;
  }

  /* ---------- type ---------- */
  function renderType(a) {
    const t = a.type;
    const s = section('type', 'Type', nf(t.distinct.length) + ' distinct sizes · median adjacent ratio '
      + t.median + ' · σ ' + t.sd + (t.nearestNice ? ' · nearest conventional scale ' + t.nearestNice : ''));
    if (!t.distinct.length) {
      s.appendChild(el('p', 'note', 'No literal font-size values found (or they are all calc/clamp).'));
      return s;
    }
    const max = t.distinct[t.distinct.length - 1].px;
    const maxCount = t.distinct.reduce(function (m, d) { return Math.max(m, d.count); }, 1);
    const ladder = el('div', 'ladder');
    t.distinct.slice().reverse().forEach(function (d) {
      const row = el('div', 'rung');
      const near = t.nearSizes.has(d.px);
      if (near) row.classList.add('near');
      row.appendChild(el('div', 'rung-px', d.px + '<small>px</small>'));
      const sample = el('div', 'rung-sample', 'Ag');
      sample.style.fontSize = Math.min(d.px, 46) + 'px';
      row.appendChild(sample);
      const bar = el('div', 'rung-bar');
      const fill = el('i');
      fill.style.width = (d.count / maxCount * 100) + '%';
      fill.style.opacity = 0.35 + (d.px / max) * 0.5;
      bar.appendChild(fill);
      row.appendChild(bar);
      row.appendChild(el('div', 'rung-count', '×' + d.count));
      row.appendChild(el('div', 'rung-flag', near ? 'near-dup' : ''));
      ladder.appendChild(row);
    });
    s.appendChild(ladder);
    if (t.nearPairs.length) {
      s.appendChild(el('p', 'note warn-note', t.mergeCount + ' merges available (greedy, no size claimed twice): '
        + t.nearPairs.map(function (p) { return p.a.px + '/' + p.b.px; }).join(', ')
        + '. Highlighted rungs are the ones involved.'));
    }
    if (t.dynamic) s.appendChild(el('p', 'note', t.dynamic + ' font-size declaration(s) use calc/clamp and are excluded from the ladder.'));
    return s;
  }

  /* ---------- misc ---------- */
  function renderMisc(a) {
    const m = a.misc;
    const s = section('misc', 'Radius, shadow, families, z-index');
    const cols = el('div', 'two-col');

    function listBox(title, items, note) {
      const b = el('div', 'subcard');
      b.appendChild(el('h3', 'sub', title + ' <em>' + items.length + '</em>'));
      if (!items.length) b.appendChild(el('p', 'note', 'none'));
      else {
        const max = items.reduce(function (x, i) { return Math.max(x, i.count); }, 1);
        const ul = el('ul', 'reps');
        items.forEach(function (i) {
          const li = el('li');
          li.appendChild(el('code', 'rep-val', esc(String(i.value)).slice(0, 46)));
          const bar = el('div', 'rep-bar');
          const f = el('i');
          f.style.width = (i.count / max * 100) + '%';
          bar.appendChild(f);
          li.appendChild(bar);
          li.appendChild(el('span', 'rep-count', '×' + i.count));
          if (/^(border-radius|border-)/.test(title) || title.indexOf('radius') > -1) {
            const sw = el('span', 'radius-sw');
            sw.style.borderRadius = String(i.value);
            li.insertBefore(sw, li.firstChild);
          }
          ul.appendChild(li);
        });
        b.appendChild(ul);
      }
      if (note) b.appendChild(el('p', 'note', note));
      return b;
    }

    cols.appendChild(listBox('border-radius', m.radii, m.radii.length > 4 ? 'More than four radii is a tell: nobody can tell 6px from 7px, but every consumer has to.' : ''));
    cols.appendChild(listBox('box / text shadow', m.shadows));
    cols.appendChild(listBox('font-family', m.families));
    cols.appendChild(listBox('font-weight', m.weights));
    cols.appendChild(listBox('z-index', m.zindex, m.zRange ? 'Range ' + m.zRange[0] + ' to ' + m.zRange[1]
      + '. Position:absolute soup is usually next.' : ''));
    s.appendChild(cols);
    return s;
  }

  /* ---------- tokens ---------- */
  function renderTokens(a) {
    const s = section('tokens', 'Generated token sheet',
      'A consolidated <code>:root</code> block built from what you actually use. Nothing invented — every token is one of your literal values, chosen by usage.');
    const bar = el('div', 'btnrow');
    const copyBtn = el('button', 'btn', 'Copy CSS');
    copyBtn.addEventListener('click', function () { copy(a.tokens.css, copyBtn); });
    bar.appendChild(copyBtn);
    const dlBtn = el('button', 'btn ghost', 'Download report (.md)');
    dlBtn.addEventListener('click', function () { download('token-debt-audit.md', markdownReport(a)); });
    bar.appendChild(dlBtn);
    const dlCss = el('button', 'btn ghost', 'Download .css');
    dlCss.addEventListener('click', function () { download('tokens.css', a.tokens.css); });
    bar.appendChild(dlCss);
    s.appendChild(bar);
    s.appendChild(el('pre', 'code', esc(a.tokens.css)));
    return s;
  }

  /* ---------- mapping ---------- */
  function renderMapping(a) {
    const s = section('mapping', 'Find → replace',
      'Every literal that maps onto a token. Highest-use first, so the mechanical 80% is at the top.');
    const rows = a.tokens.mapping.slice().sort(function (x, y) { return y.uses - x.uses; });
    const box = el('div', 'btnrow');
    const cb = el('button', 'btn', 'Copy mapping as list');
    cb.addEventListener('click', function () {
      copy(rows.map(function (r) { return r.from + ' → ' + r.to; }).join('\n'), cb);
    });
    box.appendChild(cb);
    box.appendChild(el('span', 'note', rows.length + ' substitutions across colour and space'));
    s.appendChild(box);

    const t = el('table', 'tbl map');
    t.appendChild(el('tr', null, '<th>literal</th><th></th><th>token</th><th>uses</th>'));
    rows.slice(0, 200).forEach(function (r) {
      const tr = el('tr');
      const c = TDA.parseColor(r.from);
      tr.appendChild(el('td', null, '<code>' + esc(r.from) + '</code>'));
      const swcell = el('td');
      if (c) swcell.appendChild(swatch('sw-xs', c));
      tr.appendChild(swcell);
      tr.appendChild(el('td', null, '<code class="tok">' + esc(r.to) + '</code>'));
      tr.appendChild(el('td', null, '×' + r.uses));
      t.appendChild(tr);
    });
    s.appendChild(t);
    if (rows.length > 200) s.appendChild(el('p', 'note', 'Showing the first 200 of ' + rows.length + '.'));
    return s;
  }

  /* ---------- footer ---------- */
  function renderFooter(a) {
    const b = el('div', 'foot');
    b.appendChild(el('p', null, 'Colour distance is OKLab Euclidean ΔE, the CIE-recommended perceptual metric: '
      + 'ΔE 1 is roughly the limit of what a trained eye can see in ideal conditions, ΔE 2–3 is where most production '
      + 'duplicates live. Spacing is measured against the ' + a.spacing.grid + 'px grid you appear to be closest to. '
      + 'Everything on this page is computed in your browser from the text you pasted; nothing is uploaded.'));
    const btns = el('div', 'btnrow');
    const again = el('button', 'btn ghost', 'Audit another stylesheet');
    again.addEventListener('click', function () {
      $('#btn-clear').click();
      setInputOpen(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    btns.appendChild(again);
    b.appendChild(btns);
    return b;
  }

  /* ---------- markdown export ---------- */
  function markdownReport(a) {
    const L = [];
    L.push('# Token debt audit');
    L.push('');
    L.push('*Source: ' + (state.sourceLabel || 'pasted CSS') + ' · ' + new Date().toISOString().slice(0, 10)
      + ' · merge threshold ΔE ' + state.threshold.toFixed(1) + '*');
    L.push('');
    L.push('**Token consistency: ' + a.score.overall + '/100 (' + a.score.band.label + ')**');
    L.push('');
    a.score.axes.forEach(function (x) { L.push('- **' + x.name + '** ' + x.score + '/100 — ' + x.detail); });
    L.push('');
    L.push('## What to fix');
    L.push('');
    a.findings.forEach(function (f, i) { L.push((i + 1) + '. **' + f.title + '** — ' + f.detail); });
    L.push('');
    L.push('## Colour tokens (' + a.colours.clusters.length + ' from ' + a.colours.entries.length + ' literals)');
    L.push('');
    L.push('| token | value | uses | merges |');
    L.push('|---|---|---|---|');
    a.colours.clusters.slice().sort(function (x, y) { return y.oklch.L - x.oklch.L; }).forEach(function (c) {
      L.push('| `' + c.token + '` | `' + TDA.toCss(c.canonical.rgb) + '` | ' + c.total + ' | '
        + (c.members.length > 1 ? c.members.length + ' → ' + c.members.map(function (m) { return '`' + TDA.toCss(m.rgb) + '`'; }).join(' ') : '—') + ' |');
    });
    L.push('');
    L.push('## Spacing (' + a.spacing.unit + ')');
    L.push('');
    L.push('- ' + a.spacing.distinct.length + ' distinct values; ' + Math.round(a.spacing.gridFit * 100)
      + '% of usage on a ' + a.spacing.grid + a.spacing.unit + ' grid');
    if (a.spacing.offGrid.length) {
      L.push('- Off grid: ' + a.spacing.offGrid.map(function (d) {
        return d.v + a.spacing.unit + '→' + d.snapped + a.spacing.unit;
      }).join(', '));
    }
    L.push('');
    L.push('## Type');
    L.push('');
    L.push('- ' + a.type.distinct.length + ' sizes: ' + a.type.distinct.map(function (d) { return d.px + 'px×' + d.count; }).join(', '));
    L.push('- Median adjacent ratio ' + a.type.median + ', σ ' + a.type.sd);
    L.push('');
    L.push('## Generated tokens');
    L.push('');
    L.push('```css');
    L.push(a.tokens.css);
    L.push('```');
    L.push('');
    L.push('---');
    L.push('');
    L.push('Produced by Token Debt Audit.');
    return L.join('\n');
  }

  /* ---------- boot ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    wire();
    updateThresholdCaption();
    setInputOpen(true);
    $('#empty').hidden = false;
    $('#report').hidden = true;
    window.addEventListener('resize', function () {
      if (state.analysis) {
        const cv = $('.plane');
        if (cv) drawPlane(cv, state.analysis.colours);
      }
    });
  });
})();
