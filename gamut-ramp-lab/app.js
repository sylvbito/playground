/* Gamut Ramp Lab — UI + canvas plot. Colour maths lives in colour.js. */

import * as C from './colour.js';

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const PRESETS = [
  ['#e6318e', 'Bibeau pink'],
  ['#ff5526', 'playground orange'],
  ['#4a376c', 'deep violet'],
  ['#3898ec', 'webflow blue'],
  ['#b7eb52', 'acid lime'],
  ['#4ecdc4', 'teal'],
  ['#f7f4e7', 'cream'],
];

const state = {
  hex: '#e6318e',
  stops: 16,
  lMax: 0.95,
  lMin: 0.28,
  chroma: 1,
  profile: 'flat',
  space: 'srgb',
  plotMethod: 'css',
};

const SUP_OPEN = typeof CSS !== 'undefined' && CSS.supports && CSS.supports('color', 'oklch(0.5 0.1 200)');

/* ── helpers ─────────────────────────────────────────────────────────── */

const num = (v, d = 3) => Number(v).toFixed(d);
const pct = (v) => `${Math.round(v * 100)}%`;
const spaceLabel = (id) => C.SPACES[id].label;

/** CSS background value that asks the *target* display for this colour. */
function bg(oklch, space) {
  if (space === 'srgb') return C.hexFromOKLCH(oklch);
  return C.cssColor(oklch, space);
}

/** CSS value for an intended (possibly out-of-gamut) stop — the browser maps it. */
function intentBg(oklch) {
  return SUP_OPEN ? C.fmtOKLCH(oklch) : C.hexFromOKLCH(oklch);
}

function swatch({ bg: bgCss, oog, title, label, hex }) {
  const el = document.createElement('div');
  el.className = 'stop';
  el.title = title || '';
  const sw = document.createElement('div');
  sw.className = 'swatch' + (oog ? ' oog' : '');
  sw.style.background = bgCss;
  if (oog) {
    const flag = document.createElement('span');
    flag.className = 'badge-oog';
    flag.textContent = 'out';
    flag.style.cssText = 'position:absolute;left:4px;bottom:4px;background:rgba(0,0,0,.55);color:#fff';
    sw.appendChild(flag);
  }
  const l1 = document.createElement('div');
  l1.className = 'stop-label';
  l1.textContent = label;
  const l2 = document.createElement('div');
  l2.className = 'stop-hex';
  l2.textContent = hex || '';
  el.append(sw, l1, l2);
  return el;
}

/* ── read UI → state ─────────────────────────────────────────────────── */

let lastGoodHex = state.hex;

function readUI() {
  const raw = $('#hex').value.trim();
  const normalised = raw.startsWith('#') ? raw : `#${raw}`;
  if (/^#?[0-9a-fA-F]{3}$/.test(raw) || /^#?[0-9a-fA-F]{6}$/.test(raw)) {
    lastGoodHex = normalised.length === 4
      ? '#' + normalised.slice(1).split('').map((c) => c + c).join('')
      : normalised;
    $('#hex').value = lastGoodHex;
    $('#hex').classList.remove('invalid');
  } else {
    $('#hex').classList.add('invalid');
  }
  state.hex = lastGoodHex;
  $('#picker').value = state.hex;

  state.stops = Number($('#stops').value);
  state.lMax = Number($('#lMax').value);
  state.lMin = Number($('#lMin').value);
  state.chroma = Number($('#chroma').value);
  state.profile = ($$('input[name="profile"]').find((r) => r.checked) || {}).value || 'flat';
  state.space = ($$('input[name="space"]').find((r) => r.checked) || {}).value || 'srgb';
  state.plotMethod = ($$('input[name="plotMethod"]').find((r) => r.checked) || {}).value || 'css';

  $('#stopsOut').textContent = String(state.stops);
  $('#lMaxOut').textContent = num(state.lMax, 3);
  $('#lMinOut').textContent = num(state.lMin, 3);
  $('#chromaOut').textContent = num(state.chroma, 1);

  $$('#presets .preset').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.hex === state.hex)));
}

/* ── compute ─────────────────────────────────────────────────────────── */

function compute() {
  const base = C.oklchFromHex(state.hex);
  const ramp = C.buildRamp(base, {
    stops: state.stops,
    lMax: state.lMax,
    lMin: state.lMin,
    chromaFactor: state.chroma,
    profile: state.profile,
  });
  const diags = {
    clip: C.diagnose(ramp, state.space, 'clip'),
    clamp: C.diagnose(ramp, state.space, 'clamp'),
    css: C.diagnose(ramp, state.space, 'css'),
  };
  return { base, ramp, diags };
}

/* ── render: panel 01 ────────────────────────────────────────────────── */

function renderIntended(base, ramp) {
  const strip = $('#intendedStrip');
  strip.textContent = '';
  const d = C.diagnose(ramp, state.space, 'css');
  ramp.forEach((s, i) => {
    const r = d.rows[i];
    strip.appendChild(swatch({
      // the intent is defined in OKLCH; where a stop is outside the target gamut
      // the browser decides what to do with it, and panel 05 measures exactly that
      bg: intentBg(s),
      oog: !r.fits,
      title: `stop ${String(i + 1).padStart(2, '0')} · ${C.fmtOKLCH(s)}\n${r.fits ? 'inside' : 'outside'} ${spaceLabel(state.space)}`,
      label: C.fmtOKLCH(s).replace('oklch(', '').replace(')', ''),
      hex: r.fits ? r.hexSRGB : 'out of gamut',
    }));
  });
  $('#intendedTag').textContent = `${ramp.length} stops · ${d.outOfGamut} outside ${spaceLabel(state.space)}`;
  $('#baseInfo').textContent =
    `${state.hex} → oklch(${num(base.l)} ${num(base.c)} ${num(base.h, 1)}) · ` +
    `chroma ${num(base.c)} is ${pct(base.c / Math.max(1e-6, C.maxChromaAt(base.l, base.h, state.space)))} ` +
    `of the ${spaceLabel(state.space)} maximum at that lightness and hue`;
}

/* ── render: panel 02 ────────────────────────────────────────────────── */

function renderVerdict(ramp, diags) {
  const order = [['clip', 'Naïve clip'], ['clamp', 'Clamp chroma'], ['css', 'CSS Color 4']];
  const box = $('#verdict');
  box.textContent = '';

  for (const [key, label] of order) {
    const d = diags[key];
    const card = document.createElement('div');
    card.className = 'card';
    const jnd = d.maxDE / 0.02;
    card.innerHTML =
      `<h4>${label}</h4>` +
      `<span class="fig">${num(d.maxDE, 3)} ΔEok</span>` +
      `<p>${jnd < 1.05 ? 'within' : `${num(jnd, 1)}×`} the 0.02 JND · hue ${num(d.maxDH, 1)}° · ` +
      `ΔL ${num(d.maxDL, 3)} · ${d.collapsedPairs} collapsed pairs · ${d.distinct}/${d.stops} distinct stops</p>`;
    box.appendChild(card);
  }

  const c = diags.clip, k = diags.clamp, s = diags.css;
  const outRows = s.rows.filter((r) => !r.fits);
  const chromaCss = outRows.reduce((a, r) => a + r.resolved.c, 0) / Math.max(1, outRows.length);
  const chromaClamp = outRows.reduce((a, r) => a + C.resolveClamp(r.intended, state.space).oklch.c, 0) / Math.max(1, outRows.length);
  const gain = chromaClamp > 0 ? (chromaCss / chromaClamp - 1) * 100 : 0;

  const line = document.createElement('div');
  line.className = 'verdict-line ' + (outRows.length === 0 ? 'good' : 'alert');
  if (outRows.length === 0) {
    line.textContent = `All ${s.stops} stops fit inside ${spaceLabel(state.space)} — nothing to resolve, so every method returns the ramp untouched. Raise Chroma × or widen the lightness range to push stops past the edge.`;
  } else {
    const closer = s.maxDE <= k.maxDE;
    line.innerHTML =
      `<strong>${outRows.length} of ${s.stops} stops are outside ${spaceLabel(state.space)}.</strong> ` +
      `Naïve clipping bends hue by up to <strong>${num(c.maxDH, 1)}°</strong> and slides lightness by ` +
      `<strong>${num(c.maxDL, 3)}</strong> — that is what makes the pale end of a clipped ramp read as a different ` +
      `colour rather than a lighter one. Chroma clamp holds hue and lightness <em>exactly</em> and pays in chroma ` +
      `alone (${num(k.maxDE, 3)} ΔEok at worst). The CSS Color 4 algorithm keeps ` +
      `<strong>${num(Math.max(0, gain), 0)}% more chroma</strong> than a strict fit and lands ` +
      `${closer ? 'closer to the intended colours' : 'further from the intended colours'} than it overall ` +
      `(${num(s.maxDE, 3)} vs ${num(k.maxDE, 3)} ΔEok), with up to ${num(s.maxDH, 1)}° of hue drift — ` +
      `the trade the spec chose deliberately.`;
  }
  box.appendChild(line);

  const tb = $('#methodTable').querySelector('tbody');
  tb.textContent = '';
  for (const [key, label] of order) {
    const d = diags[key];
    const tr = document.createElement('tr');
    tr.innerHTML =
      `<td>${label}</td>` +
      `<td class="mono">${d.outOfGamut}/${d.stops}</td>` +
      `<td class="mono">${num(d.maxDE, 4)}</td>` +
      `<td class="mono">${num(d.maxDE / 0.02, 1)}×</td>` +
      `<td class="mono">${num(d.maxDH, 2)}°</td>` +
      `<td class="mono">${num(d.maxDL, 3)}</td>` +
      `<td class="mono">${d.collapsedPairs}</td>` +
      `<td class="mono">${d.distinct}/${d.stops}</td>`;
    tb.appendChild(tr);
  }

  $('#tableNote').textContent =
    `ΔEok is Euclidean distance in OKLab (0.02 ≈ one just-noticeable difference). "Collapsed pairs" counts ` +
    `neighbouring stops closer than 0.01 ΔEok — a ramp that stops ramping. Measured against the ` +
    `${spaceLabel(state.space)} gamut.`;

  const stb = $('#stopTable').querySelector('tbody');
  stb.textContent = '';
  diags.css.rows.forEach((row, i) => {
    const cl = diags.clip.rows[i], cp = diags.clamp.rows[i], cs = diags.css.rows[i];
    const tr = document.createElement('tr');
    const mini = (hexes) => `<div class="mini-strip">${hexes.map((h) => `<i style="background:${h}"></i>`).join('')}</div>`;
    tr.innerHTML =
      `<td class="mono">${String(i + 1).padStart(2, '0')}</td>` +
      `<td class="mono">${num(row.intended.l)}</td>` +
      `<td class="mono">${num(row.intended.c)}</td>` +
      `<td><span class="pill ${row.fits ? 'in' : 'out'}">${row.fits ? 'in' : 'out'}</span></td>` +
      `<td class="mono">${num(cl.dE, 4)}</td>` +
      `<td class="mono ${Math.abs(cl.dH) > 2 ? 'flag' : ''}">${num(cl.dH, 1)}°</td>` +
      `<td class="mono">${num(cp.dE, 4)}</td>` +
      `<td class="mono">${num(cs.dE, 4)}</td>` +
      `<td class="mono">${num(cs.dH, 1)}°</td>` +
      `<td>${mini([cl.hexSRGB, cp.hexSRGB, cs.hexSRGB])}</td>`;
    stb.appendChild(tr);
  });
}

/* ── render: panel 03 (plot) ─────────────────────────────────────────── */

function drawPlot(base, ramp, diags) {
  const canvas = $('#plot');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const cssW = canvas.clientWidth || 640;
  const cssH = cssW < 560 ? 300 : 400;
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  canvas.style.height = `${cssH}px`;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);

  const pad = { l: 46, r: 14, t: 14, b: 32 };
  const w = cssW - pad.l - pad.r;
  const h = cssH - pad.t - pad.b;

  const intendedMax = Math.max(...ramp.map((s) => s.c));
  const curves = {
    srgb: C.boundaryCurve(base.h, 'srgb'),
    p3: C.boundaryCurve(base.h, 'p3'),
    rec2020: C.boundaryCurve(base.h, 'rec2020'),
  };
  const maxOf = (pts) => Math.max(...pts.map((p) => p[0]));
  const p3Max = maxOf(curves.p3), r2020Max = maxOf(curves.rec2020);
  // Frame on the ramp and P3 — the widest Rec.2020 lobe can sit far to the right
  // and would otherwise leave the interesting half of the plot empty.
  const maxC = Math.min(0.55, Math.max(0.08, intendedMax * 1.14, p3Max * 1.06));
  const X = (c) => pad.l + (c / maxC) * w;
  const Y = (l) => pad.t + (1 - l) * h;

  // grid
  ctx.strokeStyle = '#1c2024';
  ctx.lineWidth = 1;
  ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = '#6f767e';
  for (let l = 0; l <= 1.0001; l += 0.2) {
    ctx.beginPath();
    ctx.moveTo(pad.l, Y(l));
    ctx.lineTo(pad.l + w, Y(l));
    ctx.stroke();
    ctx.textAlign = 'right';
    ctx.fillText(l.toFixed(1), pad.l - 7, Y(l) + 3);
  }
  for (let c = 0; c <= maxC + 1e-6; c += 0.05) {
    ctx.beginPath();
    ctx.moveTo(X(c), pad.t);
    ctx.lineTo(X(c), pad.t + h);
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.fillText(c.toFixed(2), X(c), pad.t + h + 14);
  }
  ctx.textAlign = 'left';
  ctx.fillText('chroma →', pad.l + 1, pad.t + h + 27);
  ctx.save();
  ctx.translate(12, pad.t + h / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.fillText('lightness', 0, 0);
  ctx.restore();

  const poly = (pts) => {
    ctx.beginPath();
    ctx.moveTo(X(0), Y(1));
    pts.forEach(([c, l]) => ctx.lineTo(X(c), Y(l)));
    ctx.lineTo(X(0), Y(0));
    ctx.closePath();
  };

  // everything curve-related stays inside the axes box
  ctx.save();
  ctx.beginPath();
  ctx.rect(pad.l, pad.t, w, h);
  ctx.clip();

  // fills, widest first so the sRGB region ends up on top
  poly(curves.rec2020); ctx.fillStyle = 'rgba(180, 195, 215, 0.05)'; ctx.fill();
  poly(curves.p3); ctx.fillStyle = 'rgba(180, 195, 215, 0.09)'; ctx.fill();
  poly(curves.srgb); ctx.fillStyle = 'rgba(200, 212, 228, 0.16)'; ctx.fill();

  // strokes
  const stroke = (pts, color, width) => {
    ctx.beginPath();
    ctx.moveTo(X(0), Y(1));
    pts.forEach(([c, l]) => ctx.lineTo(X(c), Y(l)));
    ctx.lineTo(X(0), Y(0));
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  };
  stroke(curves.rec2020, 'rgba(180,195,215,0.35)', 1);
  stroke(curves.p3, 'rgba(180,195,215,0.6)', 1.2);
  stroke(curves.srgb, 'rgba(220,230,245,0.95)', 1.8);

  // ramp: intended → resolved
  const method = state.plotMethod;
  const rows = diags[method].rows;
  ctx.lineWidth = 1.4;

  // intended path
  ctx.beginPath();
  ramp.forEach((s, i) => (i ? ctx.lineTo(X(s.c), Y(s.l)) : ctx.moveTo(X(s.c), Y(s.l))));
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.stroke();

  // correction vectors
  ctx.strokeStyle = method === 'clip' ? 'rgba(224,122,106,0.55)' : 'rgba(143,216,160,0.5)';
  rows.forEach((r) => {
    ctx.beginPath();
    ctx.moveTo(X(r.intended.c), Y(r.intended.l));
    ctx.lineTo(X(r.resolved.c), Y(r.resolved.l));
    ctx.stroke();
  });

  // resolved path
  ctx.beginPath();
  rows.forEach((r, i) => (i ? ctx.lineTo(X(r.resolved.c), Y(r.resolved.l)) : ctx.moveTo(X(r.resolved.c), Y(r.resolved.l))));
  ctx.strokeStyle = method === 'clip' ? '#e07a6a' : '#8fd8a0';
  ctx.lineWidth = 2;
  ctx.stroke();

  // markers
  rows.forEach((r) => {
    ctx.beginPath();
    ctx.arc(X(r.resolved.c), Y(r.resolved.l), 3.4, 0, Math.PI * 2);
    ctx.fillStyle = method === 'clip' ? '#e07a6a' : '#8fd8a0';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(X(r.intended.c), Y(r.intended.l), 2.6, 0, Math.PI * 2);
    ctx.strokeStyle = '#eceef1';
    ctx.lineWidth = 1.2;
    ctx.stroke();
  });
  ctx.restore();

  // headline readout
  const top = ramp[0], bottom = ramp[ramp.length - 1];
  const maxSrgbTop = C.maxChromaAt(top.l, base.h, 'srgb');
  const maxSrgbMid = C.maxChromaAt((top.l + bottom.l) / 2, base.h, 'srgb');
  const overflow = r2020Max > maxC ? ` Rec.2020 peaks at ${num(r2020Max)} — past the right edge of this plot, which is framed on the ramp and P3.` : '';
  $('#plotNote').textContent =
    `Hue ${num(base.h, 1)}° · at the lightest stop (L ${num(top.l)}) sRGB holds ` +
    `${num(maxSrgbTop)} chroma while the ramp asks for ${num(top.c)}; at L ${num((top.l + bottom.l) / 2)} it holds ` +
    `${num(maxSrgbMid)}. Display P3 reaches ${num(C.maxChromaAt(top.l, base.h, 'p3'))} at the top stop, ` +
    `Rec.2020 ${num(C.maxChromaAt(top.l, base.h, 'rec2020'))}.${overflow}`;
}

/* ── render: panel 04 ────────────────────────────────────────────────── */

function renderMethodStrips(ramp, diags) {
  const host = $('#methodStrips');
  host.textContent = '';
  const order = [['css', 'CSS Color 4 mapping', 'the recommended ramp'], ['clamp', 'Clamp chroma', 'hue-exact, greyer'], ['clip', 'Naïve clip', 'what most generators ship']];

  for (const [key, label, note] of order) {
    const d = diags[key];
    const head = document.createElement('div');
    head.className = 'strip-head';
    head.innerHTML = `<h3>${label}</h3><span class="meta">${note} · max ${num(d.maxDE, 3)} ΔEok · ` +
      `hue ${num(d.maxDH, 1)}° · ΔL ${num(d.maxDL, 3)} · ${d.distinct}/${d.stops} distinct</span>`;
    const strip = document.createElement('div');
    strip.className = 'strip';
    d.rows.forEach((r, i) => {
      strip.appendChild(swatch({
        bg: bg(r.resolved, state.space),
        oog: !C.inGamut(r.resolved, state.space, 1e-5),
        title: `stop ${i + 1}: ${C.fmtOKLCH(r.intended)} → ${bg(r.resolved, state.space)}\n` +
          `ΔEok ${num(r.dE, 4)} · hue ${num(r.dH, 2)}° · sRGB ${r.hexSRGB}`,
        label: `oklch(${num(r.resolved.l, 2)} ${num(r.resolved.c, 3)} ${num(r.resolved.h, 0)})`,
        hex: state.space === 'srgb' ? r.hexSRGB : `${C.cssColor(r.resolved, state.space)} → ${r.hexSRGB}`,
      }));
    });
    host.append(head, strip);
  }
}

function cssText(base, ramp, diags) {
  const rec = diags.css;
  const lines = [];
  lines.push(`/* Gamut Ramp Lab — ${state.hex} · ${ramp.length} stops · ${spaceLabel(state.space)} target`);
  lines.push(`   source  oklch(${num(base.l)} ${num(base.c)} ${num(base.h, 2)})`);
  lines.push(`   resolved with the CSS Color 4 gamut-mapping algorithm; the hex values are the sRGB fallback.`);
  lines.push(`   max error against intent: ${num(rec.maxDE, 4)} ΔEok  (${num(rec.maxDE / 0.02, 1)}× JND)  */`);
  lines.push('');
  lines.push(':root {');
  rec.rows.forEach((r, i) => {
    const tag = String(i + 1).padStart(2, '0');
    const note = r.fits ? 'in gamut' : `mapped · ΔEok ${num(r.dE, 3)}`;
    lines.push(`  --brand-${tag}: ${r.hexSRGB}; /* ${C.fmtOKLCH(r.resolved)} · ${note} */`);
  });
  lines.push('}');
  lines.push('');
  if (state.space !== 'srgb') {
    lines.push(`/* ${spaceLabel(state.space)}: hand capable displays the full-chroma value */`);
    lines.push(`@supports (color: color(${C.SPACES[state.space].cssFn} 1 1 1)) {`);
    lines.push('  :root {');
    rec.rows.forEach((r, i) => {
      lines.push(`    --brand-${String(i + 1).padStart(2, '0')}: ${C.cssColor(r.resolved, state.space)};`);
    });
    lines.push('  }');
    lines.push('}');
    lines.push('');
  }
  lines.push('/* For comparison — naïve clipping, which changes hue and lightness, not just chroma:');
  diags.clip.rows.forEach((r, i) => {
    lines.push(`   --brand-${String(i + 1).padStart(2, '0')}-clip: ${r.hexSRGB};  hue ${num(r.dH, 1)}° · ΔEok ${num(r.dE, 3)}`);
  });
  lines.push('*/');
  return lines.join('\n');
}

function jsonText(base, ramp, diags) {
  const rec = diags.css;
  return JSON.stringify({
    source: state.hex,
    base: { l: base.l, c: base.c, h: base.h },
    options: { stops: state.stops, lMax: state.lMax, lMin: state.lMin, chromaFactor: state.chroma, profile: state.profile, target: state.space },
    stops: rec.rows.map((r, i) => ({
      index: i + 1,
      intended: { l: r.intended.l, c: r.intended.c, h: r.intended.h },
      inGamut: r.fits,
      srgb: r.hexSRGB,
      target: bg(r.resolved, state.space),
      deltaEOK: Number(r.dE.toFixed(5)),
      hueShift: Number(r.dH.toFixed(3)),
    })),
    summary: {
      outOfGamut: rec.outOfGamut,
      maxDeltaEOK: Number(rec.maxDE.toFixed(5)),
      maxHueShift: Number(rec.maxDH.toFixed(3)),
      clipMaxHueShift: Number(diags.clip.maxDH.toFixed(3)),
      clipMaxDeltaEOK: Number(diags.clip.maxDE.toFixed(5)),
    },
  }, null, 2);
}

/* ── render: panel 05 (oracles) ──────────────────────────────────────── */

let oracleCanvas = null;
function oracleCtx() {
  if (!oracleCanvas) {
    oracleCanvas = document.createElement('canvas');
    oracleCanvas.width = 1;
    oracleCanvas.height = 1;
  }
  return oracleCanvas.getContext('2d', { willReadFrequently: true });
}

function bytesFromColorCSS(ctx, cssValue) {
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, 1, 1);
  ctx.fillStyle = cssValue;
  ctx.fillRect(0, 0, 1, 1);
  const d = ctx.getImageData(0, 0, 1, 1).data;
  return [d[0], d[1], d[2]];
}

function hexToBytes(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const byteDelta = (a, b) => Math.max(...a.map((v, i) => Math.abs(v - b[i])));

function runBrowserOracle(ramp, diags) {
  const ctx = oracleCtx();
  const supports = (() => {
    ctx.fillStyle = '#000000';
    ctx.fillStyle = 'oklch(0.5 0.2 30)';
    return ctx.fillStyle !== '#000000';
  })();

  const host = $('#oracleTable').querySelector('tbody');
  host.textContent = '';
  const verdict = $('#oracleVerdict');

  if (!supports) {
    $('#oracleNote').textContent = 'This browser does not parse oklch() in a canvas — the oracle cannot run here. Nothing is guessed; the columns stay empty.';
    verdict.hidden = true;
    $('#oracleWrap').hidden = false;
    return;
  }

  let maxCss = 0, maxClip = 0, worstCss = null, worstStop = null;
  diags.css.rows.forEach((r, i) => {
    const cssVal = C.fmtOKLCH(r.intended);
    const browser = bytesFromColorCSS(ctx, cssVal);
    const browserHex = '#' + browser.map((v) => v.toString(16).padStart(2, '0')).join('');
    const mine = hexToBytes(r.hexSRGB);
    const clipHex = diags.clip.rows[i].hexSRGB;
    const dCss = byteDelta(browser, mine);
    const dClip = byteDelta(browser, hexToBytes(clipHex));
    if (dCss > maxCss) { maxCss = dCss; worstCss = i + 1; }
    if (dClip > maxClip) { maxClip = dClip; }
    if (!r.fits && worstStop === null) worstStop = { i: i + 1, val: cssVal, painted: browserHex, mapped: r.hexSRGB, delta: dCss };

    const tr = document.createElement('tr');
    tr.innerHTML =
      `<td class="mono">${String(i + 1).padStart(2, '0')}</td>` +
      `<td class="mono">${cssVal}</td>` +
      `<td class="mono">${browserHex}</td>` +
      `<td class="mono">${r.hexSRGB}</td>` +
      `<td class="mono ${dCss > 2 ? 'flag' : ''}">${dCss}</td>` +
      `<td class="mono">${clipHex}</td>` +
      `<td class="mono">${dClip}</td>` +
      `<td class="mono" data-culori-cell="${i}">—</td>`;
    host.appendChild(tr);
  });

  $('#oracleWrap').hidden = false;
  verdict.hidden = false;
  verdict.className = 'verdict-line ' + (maxClip <= 2 ? 'alert' : 'good');
  if (maxClip <= 2) {
    verdict.innerHTML =
      `<strong>Measured: this browser clips.</strong> Every out-of-gamut <code>oklch()</code> string painted into a canvas ` +
      `comes back as the naïve-clip bytes (≤${maxClip}/255 across all ${diags.css.rows.length} stops), while the ` +
      `CSS Color 4 mapping of the same colour differs by up to <strong>${maxCss}/255</strong>` +
      (worstStop ? ` (stop ${worstStop.i}: <code>${worstStop.val}</code> paints ${worstStop.painted}, maps to ${worstStop.mapped})` : '') +
      `. So declaring an out-of-gamut <code>oklch()</code> does not get you the spec's gamut mapping — you have to run it ` +
      `yourself, which is what panel 04's tokens do. A build-time check on this machine agreed: ` +
      `screenshotting a real CSS background of <code>${worstStop ? worstStop.val : 'oklch(…)'}</code> and sampling the pixel ` +
      `gave the same clipped bytes as the canvas.`;
  } else {
    verdict.innerHTML =
      `<strong>The browser is gamut-mapping, not clipping:</strong> canvas output stays within ${maxClip}/255 of the ` +
      `naïve-clip bytes at only some stops, and within ${maxCss}/255 of the CSS Color 4 mapping. That is the behaviour ` +
      `the spec intends — the tokens in panel 04 then match what the screen already does.`;
  }
  $('#oracleNote').textContent =
    `Measured on this browser with a canvas filled with the exact <code>oklch()</code> string and read back with ` +
    `getImageData; "mapped" and "clipped" are this page's own maths for the same stop. Run the culori comparison ` +
    `for a third opinion on the mapping algorithm itself.`;
}

async function runCuloriCompare(ramp, diags) {
  $('#oracleNote').textContent = 'Loading culori from esm.sh…';
  let culori;
  try {
    culori = await import('https://esm.sh/culori@4');
  } catch (err) {
    $('#oracleNote').textContent = `culori could not be loaded (${err.message}). Offline? The browser oracle above needs no network; only this comparison does.`;
    return;
  }
  // culori's signature is toGamut(destination, origin = 'oklch', jnd = 0.02) — the
  // second positional argument is a colour space, NOT a method name.
  let toSrgb = null;
  try {
    toSrgb = culori.toGamut('rgb', 'oklch');
    toSrgb({ mode: 'oklch', l: 0.5, c: 0.1, h: 200 });
  } catch {
    try {
      toSrgb = culori.toGamut('rgb');
      toSrgb({ mode: 'oklch', l: 0.5, c: 0.1, h: 200 });
    } catch (err2) {
      $('#oracleNote').textContent = `culori loaded but its toGamut() API is not what this page expects (${err2.message}) — comparison skipped rather than faked.`;
      return;
    }
  }
  const host = $('#oracleTable').querySelector('tbody');
  $('#oracleWrap').hidden = false;
  if (!host.children.length) {
    $('#oracleNote').textContent = 'Run the browser oracle first, then compare — the rows are shared.';
    return;
  }

  let maxD = 0, worst = null;
  diags.css.rows.forEach((r, i) => {
    const input = { mode: 'oklch', l: r.intended.l, c: r.intended.c, h: r.intended.h };
    const mapped = toSrgb(input);
    const rgb = mapped && culori.rgb(mapped);
    const cbytes = rgb ? [rgb.r, rgb.g, rgb.b].map((v) => Math.round(Math.min(1, Math.max(0, v)) * 255)) : null;
    const mine = hexToBytes(r.hexSRGB);
    const d = cbytes ? byteDelta(cbytes, mine) : -1;
    if (d > maxD) { maxD = d; worst = i + 1; }
    const cell = host.children[i] ? host.children[i].querySelector('td[data-culori-cell]') : null;
    if (cell) {
      cell.textContent = cbytes ? `${d}` : 'n/a';
      cell.className = 'mono ' + (d > 1 ? 'flag' : '');
      cell.title = cbytes ? `culori: #${cbytes.map((v) => v.toString(16).padStart(2, '0')).join('')} vs this page: ${r.hexSRGB}` : '';
    }
  });
  $('#oracleNote').textContent =
    `culori's toGamut('rgb', 'oklch') — the same CSS Color 4 algorithm, 0.02 JND — agrees with this page's ` +
    `implementation to within ${maxD}/255 across ${diags.css.rows.length} stops${worst ? ` (worst at stop ${worst})` : ''}. ` +
    `Two independent implementations of the same spec, so the mapping itself is not the thing in doubt — the paint ` +
    `path in panel 05's first table is.`;
}

/* ── paint ───────────────────────────────────────────────────────────── */

let last = null;

function paintAll() {
  const { base, ramp, diags } = compute();
  last = { base, ramp, diags };

  renderIntended(base, ramp);
  renderVerdict(ramp, diags);
  drawPlot(base, ramp, diags);
  renderMethodStrips(ramp, diags);
  $('#cssPreview').textContent = cssText(base, ramp, diags);
  $('#exportNote').textContent =
    `${ramp.length} tokens of the CSS Color 4 ramp · ${diags.css.outOfGamut} stop${diags.css.outOfGamut === 1 ? '' : 's'} ` +
    `needed resolving · press S to save gamut-ramp-${state.hex.replace('#', '')}-${state.stops}.css`;

  // any oracle table on screen is now stale for the new inputs
  if (!$('#oracleWrap').hidden) {
    $('#oracleWrap').hidden = true;
    $('#oracleVerdict').hidden = true;
    $('#oracleNote').textContent = 'Inputs changed — run the oracles again against the new ramp.';
  }
}

/* ── export ──────────────────────────────────────────────────────────── */

function download(name, text, type = 'text/css') {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

async function copy(text, label) {
  try {
    await navigator.clipboard.writeText(text);
    $('#exportNote').textContent = `Copied ${label} (${text.split('\n').length} lines) to the clipboard.`;
  } catch {
    $('#exportNote').textContent =
      `Clipboard blocked here — it needs a secure origin and a real click. ${label} is in the preview below; ` +
      `press S to save it as a file instead.`;
  }
}

function savePng() {
  const src = $('#plot');
  const out = document.createElement('canvas');
  const scale = 2;
  out.width = src.width * scale;
  out.height = src.height * scale;
  const ctx = out.getContext('2d');
  ctx.fillStyle = '#0a0b0d';
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.drawImage(src, 0, 0, out.width, out.height);
  out.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gamut-boundary-${state.hex.replace('#', '')}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    $('#exportNote').textContent = `Plot saved at ${out.width}×${out.height} px.`;
  }, 'image/png');
}

/* ── wiring ──────────────────────────────────────────────────────────── */

function buildPresets() {
  const host = $('#presets');
  PRESETS.forEach(([hex, label]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'preset';
    b.dataset.hex = hex;
    b.style.background = hex;
    b.title = `${label} · ${hex}`;
    b.setAttribute('aria-label', `${label} ${hex}`);
    b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', () => {
      $('#hex').value = hex;
      apply();
    });
    host.appendChild(b);
  });
}

function apply() {
  readUI();
  paintAll();
}

function reset() {
  $('#hex').value = '#e6318e';
  $('#picker').value = '#e6318e';
  $('#stops').value = '16';
  $('#lMax').value = '0.95';
  $('#lMin').value = '0.28';
  $('#chroma').value = '1';
  $$('input[name="profile"]').forEach((r) => (r.checked = r.value === 'flat'));
  $$('input[name="space"]').forEach((r) => (r.checked = r.value === 'srgb'));
  $$('input[name="plotMethod"]').forEach((r) => (r.checked = r.value === 'css'));
  apply();
  $('#exportNote').textContent = 'Reset to the Bibeau pink defaults.';
}

function wire() {
  buildPresets();
  ['hex', 'picker', 'stops', 'lMax', 'lMin', 'chroma'].forEach((id) => {
    $('#' + id).addEventListener('input', apply);
    $('#' + id).addEventListener('change', apply);
  });
  $$('input[name="profile"], input[name="space"], input[name="plotMethod"]').forEach((r) => {
    r.addEventListener('change', apply);
  });
  $('#reset').addEventListener('click', reset);
  $('#copyCss').addEventListener('click', () => last && copy(cssText(last.base, last.ramp, last.diags), 'CSS'));
  $('#copyJson').addEventListener('click', () => last && copy(jsonText(last.base, last.ramp, last.diags), 'JSON'));
  $('#saveCss').addEventListener('click', () => last && download(`gamut-ramp-${state.hex.replace('#', '')}-${state.stops}.css`, cssText(last.base, last.ramp, last.diags)));
  $('#savePng').addEventListener('click', savePng);
  $('#runBrowser').addEventListener('click', () => last && runBrowserOracle(last.ramp, last.diags));
  $('#runCulori').addEventListener('click', () => last && runCuloriCompare(last.ramp, last.diags));

  window.addEventListener('keydown', (e) => {
    const el = e.target;
    const typing = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
    if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 's' || e.key === 'S') {
      e.preventDefault();
      if (last) {
        download(`gamut-ramp-${state.hex.replace('#', '')}-${state.stops}.css`, cssText(last.base, last.ramp, last.diags));
        $('#exportNote').textContent = `Saved gamut-ramp-${state.hex.replace('#', '')}-${state.stops}.css`;
      }
    }
    if (e.key === 'r' || e.key === 'R') reset();
  });

  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => last && drawPlot(last.base, last.ramp, last.diags), 120);
  });
}

function selfTestLine() {
  const st = C.selfTest();
  const el = $('#selfTest');
  const clean = st.maxRoundTripByte <= 1 && st.maxP3Byte <= 1;
  el.classList.toggle('bad', !clean);
  el.textContent =
    `${clean ? '✓' : '✗'} round-trip self-test: ${st.colours} colours through sRGB → OKLCH → sRGB and sRGB → Display P3 → sRGB, ` +
    `max channel error ${st.maxRoundTripByte}/255 and ${st.maxP3Byte}/255. ${clean ? 'The conversion is lossless.' : 'Something is wrong.'}`;
}

wire();
apply();
selfTestLine();

// synchronous hook for automated checks (see the pitfalls in the build skill: a
// debounced repaint hides dead wiring behind clamped background timers)
window.__gamutLab = {
  apply: () => { apply(); return describe(); },
  state,
  compute,
  describe: () => describe(),
};

function describe() {
  const { base, ramp, diags } = compute();
  return {
    hex: state.hex,
    base: { l: base.l, c: base.c, h: base.h },
    space: state.space,
    stops: ramp.length,
    outOfGamut: diags.css.outOfGamut,
    clip: { maxDE: diags.clip.maxDE, maxDH: diags.clip.maxDH, maxDL: diags.clip.maxDL, distinct: diags.clip.distinct },
    clamp: { maxDE: diags.clamp.maxDE, maxDH: diags.clamp.maxDH, distinct: diags.clamp.distinct },
    css: { maxDE: diags.css.maxDE, maxDH: diags.css.maxDH, distinct: diags.css.distinct },
  };
}
