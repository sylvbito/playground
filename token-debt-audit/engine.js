/* ============================================================
   Token Debt Audit — engine.js
   DOM-free CSS token analyser.
   - OKLab perceptual colour clustering (single-link, ΔE threshold)
   - spacing grid + near-miss detection
   - type scale ratio consistency
   - radius / shadow / family / weight / z-index debt
   - generates a consolidated :root token sheet + mapping
   Exposes globalThis.TDA
   ============================================================ */
(function (root) {
  'use strict';

  /* ---------------- named colours ---------------- */
  const NAMED_RAW =
    "aliceblue f0f8ff,antiquewhite faebd7,aqua 00ffff,aquamarine 7fffd4,azure f0ffff,beige f5f5dc,bisque ffe4c4,black 000000,blanchedalmond ffebcd,blue 0000ff,blueviolet 8a2be2,brown a52a2a,burlywood deb887,cadetblue 5f9ea0,chartreuse 7fff00,chocolate d2691e,coral ff7f50,cornflowerblue 6495ed,cornsilk fff8dc,crimson dc143c,cyan 00ffff,darkblue 00008b,darkcyan 008b8b,darkgoldenrod b8860b,darkgray a9a9a9,darkgreen 006400,darkgrey a9a9a9,darkkhaki bdb76b,darkmagenta 8b008b,darkolivegreen 556b2f,darkorange ff8c00,darkorchid 9932cc,darkred 8b0000,darksalmon e9967a,darkseagreen 8fbc8f,darkslateblue 483d8b,darkslategray 2f4f4f,darkslategrey 2f4f4f,darkturquoise 00ced1,darkviolet 9400d3,deeppink ff1493,deepskyblue 00bfff,dimgray 696969,dimgrey 696969,dodgerblue 1e90ff,firebrick b22222,floralwhite fffaf0,forestgreen 228b22,fuchsia ff00ff,gainsboro dcdcdc,ghostwhite f8f8ff,gold ffd700,goldenrod daa520,gray 808080,green 008000,greenyellow adff2f,grey 808080,honeydew f0fff0,hotpink ff69b4,indianred cd5c5c,indigo 4b0082,ivory fffff0,khaki f0e68c,lavender e6e6fa,lavenderblush fff0f5,lawngreen 7cfc00,lemonchiffon fffacd,lightblue add8e6,lightcoral f08080,lightcyan e0ffff,lightgoldenrodyellow fafad2,lightgray d3d3d3,lightgreen 90ee90,lightgrey d3d3d3,lightpink ffb6c1,lightsalmon ffa07a,lightseagreen 20b2aa,lightskyblue 87cefa,lightslategray 778899,lightslategrey 778899,lightsteelblue b0c4de,lightyellow ffffe0,lime 00ff00,limegreen 32cd32,linen faf0e6,magenta ff00ff,maroon 800000,mediumaquamarine 66cdaa,mediumblue 0000cd,mediumorchid ba55d3,mediumpurple 9370db,mediumseagreen 3cb371,mediumslateblue 7b68ee,mediumspringgreen 00fa9a,mediumturquoise 48d1cc,mediumvioletred c71585,midnightblue 191970,mintcream f5fffa,mistyrose ffe4e1,moccasin ffe4b5,navajowhite ffdead,navy 000080,oldlace fdf5e6,olive 808000,olivedrab 6b8e23,orange ffa500,orangered ff4500,orchid da70d6,palegoldenrod eee8aa,palegreen 98fb98,paleturquoise afeeee,palevioletred db7093,papayawhip ffefd5,peachpuff ffdab9,peru cd853f,pink ffc0cb,plum dda0dd,powderblue b0e0e6,purple 800080,rebeccapurple 663399,red ff0000,rosybrown bc8f8f,royalblue 4169e1,saddlebrown 8b4513,salmon fa8072,sandybrown f4a460,seagreen 2e8b57,seashell fff5ee,sienna a0522d,silver c0c0c0,skyblue 87ceeb,slateblue 6a5acd,slategray 708090,slategrey 708090,snow fffafa,springgreen 00ff7f,steelblue 4682b4,tan d2b48c,teal 008080,thistle d8bfd8,tomato ff6347,turquoise 40e0d0,violet ee82ee,wheat f5deb3,white ffffff,whitesmoke f5f5f5,yellow ffff00,yellowgreen 9acd32";
  const NAMED = {};
  NAMED_RAW.split(',').forEach(function (p) {
    const i = p.indexOf(' ');
    NAMED[p.slice(0, i)] = p.slice(i + 1);
  });

  /* ---------------- maths ---------------- */
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const round = (v, p) => { const f = Math.pow(10, p == null ? 2 : p); return Math.round(v * f) / f; };

  function srgbToLinear(c) { return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
  function linearToSrgb(v) { return v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055; }

  function rgbToOklab(r, g, b) {
    const l = srgbToLinear(r / 255), m = srgbToLinear(g / 255), s = srgbToLinear(b / 255);
    const l_ = 0.4122214708 * l + 0.5363325363 * m + 0.0514459929 * s;
    const m_ = 0.2119034982 * l + 0.6806995451 * m + 0.1073969566 * s;
    const s_ = 0.0883024619 * l + 0.2817188376 * m + 0.6299787005 * s;
    const l1 = Math.cbrt(l_), m1 = Math.cbrt(m_), s1 = Math.cbrt(s_);
    return {
      L: 0.2104542553 * l1 + 0.7936177850 * m1 - 0.0040720468 * s1,
      a: 1.9779984951 * l1 - 2.4285922050 * m1 + 0.4505937099 * s1,
      b: 0.0259040371 * l1 + 0.7827717662 * m1 - 0.8086757660 * s1
    };
  }

  function oklabToRgb(L, a, b) {
    const l1 = L + 0.3963377774 * a + 0.2158037573 * b;
    const m1 = L - 0.1055613458 * a - 0.0638541728 * b;
    const s1 = L - 0.0894841775 * a - 1.2914855480 * b;
    const l = l1 * l1 * l1, m = m1 * m1 * m1, s = s1 * s1 * s1;
    const R = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
    const G = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
    const B = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;
    const f = v => Math.round(clamp(linearToSrgb(clamp(v, 0, 1)), 0, 1) * 255);
    return { r: f(R), g: f(G), b: f(B), a: 1 };
  }

  const oklabOf = c => rgbToOklab(c.r, c.g, c.b);
  function oklchOf(c) {
    const o = oklabOf(c);
    const C = Math.hypot(o.a, o.b);
    let h = Math.atan2(o.b, o.a) * 180 / Math.PI;
    if (h < 0) h += 360;
    return { L: o.L, C: C, h: h };
  }
  function deltaEOk(c1, c2) {
    const a = oklabOf(c1), b = oklabOf(c2);
    return Math.hypot(a.L - b.L, a.a - b.a, a.b - b.b) * 100;
  }

  const HEX = '0123456789abcdef';
  function toHex8(c) {
    const h = v => { const s = clamp(Math.round(v), 0, 255).toString(16); return s.length < 2 ? '0' + s : s; };
    return '#' + h(c.r) + h(c.g) + h(c.b);
  }
  /* Alpha-aware CSS string — an 8-digit hex keeps "#0d6efd" and its 10% tint
     visibly distinct instead of printing as the same swatch. */
  function toCss(c) {
    if (c.a >= 0.999) return toHex8(c);
    const h = v => { const s = clamp(Math.round(v), 0, 255).toString(16); return s.length < 2 ? '0' + s : s; };
    return toHex8(c) + h(c.a * 255);
  }
  function alphaTag(c) { return c.a >= 0.999 ? '' : '-a' + Math.round(c.a * 100); }
  function toRgbaString(c) { return 'rgba(' + c.r + ', ' + c.g + ', ' + c.b + ', ' + round(c.a, 3) + ')'; }

  /* ---------------- colour parsing ---------------- */
  function parseAngle(s) {
    s = String(s).trim();
    const m = s.match(/^(-?[\d.]+)(deg|grad|rad|turn)?$/);
    if (!m) return null;
    const v = parseFloat(m[1]);
    switch (m[2]) {
      case 'grad': return v * 0.9;
      case 'rad': return v * 180 / Math.PI;
      case 'turn': return v * 360;
      default: return v;
    }
  }
  function numOrPct(tok, scale) {
    tok = String(tok).trim();
    if (tok === 'none') return 0;
    if (tok.charAt(tok.length - 1) === '%') return parseFloat(tok) / 100 * (scale == null ? 1 : scale);
    const v = parseFloat(tok);
    return isNaN(v) ? null : v;
  }
  function hslToRgb(h, s, l) {
    h = ((h % 360) + 360) % 360 / 360; s = clamp(s, 0, 1); l = clamp(l, 0, 1);
    if (s === 0) { const v = Math.round(l * 255); return { r: v, g: v, b: v }; }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const hue = t => {
      if (t < 0) t += 1; if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    return { r: Math.round(hue(h + 1 / 3) * 255), g: Math.round(hue(h) * 255), b: Math.round(hue(h - 1 / 3) * 255) };
  }
  function hwbToRgb(h, w, b) {
    w = clamp(w, 0, 1); b = clamp(b, 0, 1);
    if (w + b >= 1) { const v = Math.round(w / (w + b) * 255); return { r: v, g: v, b: v }; }
    const base = hslToRgb(h, 1, 0.5);
    const f = v => Math.round((v / 255 * (1 - w - b) + w) * 255);
    return { r: f(base.r), g: f(base.g), b: f(base.b) };
  }

  const RESERVED = { transparent: 1, currentcolor: 1, inherit: 1, initial: 1, unset: 1, revert: 1, 'revert-layer': 1, none: 1, auto: 1 };

  function parseColor(input) {
    if (typeof input !== 'string') return null;
    let s = input.trim().toLowerCase();
    if (!s || RESERVED[s]) return null;
    if (NAMED[s]) s = '#' + NAMED[s];
    if (s.charAt(0) === '#') {
      const h = s.slice(1);
      let r, g, b, a = 1;
      if (h.length === 3 || h.length === 4) {
        r = parseInt(h[0] + h[0], 16); g = parseInt(h[1] + h[1], 16); b = parseInt(h[2] + h[2], 16);
        if (h.length === 4) a = parseInt(h[3] + h[3], 16) / 255;
      } else if (h.length === 6 || h.length === 8) {
        r = parseInt(h.slice(0, 2), 16); g = parseInt(h.slice(2, 4), 16); b = parseInt(h.slice(4, 6), 16);
        if (h.length === 8) a = parseInt(h.slice(6, 8), 16) / 255;
      } else return null;
      if ([r, g, b].some(isNaN)) return null;
      return { r: r, g: g, b: b, a: a };
    }
    const m = s.match(/^([a-z-]+)\((.*)\)$/);
    if (!m) return null;
    const fn = m[1];
    const body = m[2].replace(/\//g, ' ').replace(/,/g, ' ').trim();
    const t = body.split(/\s+/).filter(Boolean);

    if (fn === 'rgb' || fn === 'rgba') {
      if (t.length < 3) return null;
      const r = numOrPct(t[0], 255), g = numOrPct(t[1], 255), b = numOrPct(t[2], 255);
      if (r == null || g == null || b == null) return null;
      const a = t.length > 3 ? numOrPct(t[3], 1) : 1;
      return { r: Math.round(clamp(r, 0, 255)), g: Math.round(clamp(g, 0, 255)), b: Math.round(clamp(b, 0, 255)), a: a == null ? 1 : clamp(a, 0, 1) };
    }
    if (fn === 'hsl' || fn === 'hsla') {
      const h = parseAngle(t[0]);
      const sP = numOrPct(t[1], 1), lP = numOrPct(t[2], 1);
      if (h == null || sP == null || lP == null) return null;
      const c = hslToRgb(h, sP, lP);
      const a = t.length > 3 ? numOrPct(t[3], 1) : 1;
      c.a = a == null ? 1 : clamp(a, 0, 1);
      return c;
    }
    if (fn === 'hwb') {
      const h = parseAngle(t[0]);
      const w = numOrPct(t[1], 1), b2 = numOrPct(t[2], 1);
      if (h == null || w == null || b2 == null) return null;
      const c = hwbToRgb(h, w, b2);
      const a = t.length > 3 ? numOrPct(t[3], 1) : 1;
      c.a = a == null ? 1 : clamp(a, 0, 1);
      return c;
    }
    if (fn === 'oklab' || fn === 'oklch') {
      const L = numOrPct(t[0], 1);
      if (L == null) return null;
      let A, B;
      if (fn === 'oklch') {
        const C = numOrPct(t[1], 1);
        const h = parseAngle(t[2]);
        if (C == null || h == null) return null;
        const hr = h * Math.PI / 180;
        A = C * Math.cos(hr); B = C * Math.sin(hr);
      } else {
        A = numOrPct(t[1], 0.4); B = numOrPct(t[2], 0.4);
        if (A == null || B == null) return null;
      }
      const c = oklabToRgb(clamp(L, 0, 1), A, B);
      const a = t.length > 3 ? numOrPct(t[3], 1) : 1;
      c.a = a == null ? 1 : clamp(a, 0, 1);
      return c;
    }
    if (fn === 'color') {
      if (t[0] !== 'srgb') return null;
      const r = numOrPct(t[1], 1), g = numOrPct(t[2], 1), b = numOrPct(t[3], 1);
      if (r == null || g == null || b == null) return null;
      const a = t.length > 4 ? numOrPct(t[4], 1) : 1;
      return { r: Math.round(clamp(r, 0, 1) * 255), g: Math.round(clamp(g, 0, 1) * 255), b: Math.round(clamp(b, 0, 1) * 255), a: a == null ? 1 : clamp(a, 0, 1) };
    }
    return null;
  }

  function contrastRatio(c1, c2) {
    const lum = c => {
      const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
      return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
    };
    const a = lum(c1), b = lum(c2);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  }

  /* ---------------- CSS scanning ---------------- */
  const COLOR_TOKEN = /#[0-9a-fA-F]{3,8}\b|\b(?:rgb|rgba|hsl|hsla|hwb|oklab|oklch|lab|lch|color)\([^()]*(?:\([^()]*\)[^()]*)*\)|\b[a-zA-Z]{3,20}\b/g;
  const LENGTH_TOKEN = /(-?(?:\d+\.?\d*|\.\d+))(px|rem|em|%|vh|vw|ch|pt)\b/g;
  const ANGLE_HINT = /\b(?:angle|deg|grad|rad|turn)\b/;

  function cleanCSS(css) {
    let s = String(css).replace(/\r\n?/g, '\n');
    s = s.replace(/\/\*[\s\S]*?\*\//g, ' ');
    s = s.replace(/url\((?:[^)'"\\]|\\.|'[^']*'|"[^"]*")*\)/gi, 'url()');
    return s;
  }

  /* Split a block body into top-level declarations (respects quotes + parens). */
  function splitDecls(body) {
    const out = [];
    let buf = '', depth = 0, q = null;
    for (let i = 0; i < body.length; i++) {
      const ch = body[i];
      if (q) { buf += ch; if (ch === '\\') { buf += body[++i] || ''; } else if (ch === q) { q = null; } continue; }
      if (ch === '"' || ch === "'") { q = ch; buf += ch; continue; }
      if (ch === '(') depth++;
      if (ch === ')') depth = Math.max(0, depth - 1);
      if (ch === ';' && depth === 0) { out.push(buf); buf = ''; continue; }
      buf += ch;
    }
    if (buf.trim()) out.push(buf);
    return out.map(s => s.trim()).filter(Boolean);
  }

  function collectBlocks(css) {
    const blocks = [];
    const stack = [];
    let buf = '', q = null;
    for (let i = 0; i < css.length; i++) {
      const ch = css[i];
      if (q) {
        if (ch === '\\') { buf += ch + (css[++i] || ''); continue; }
        buf += ch;
        if (ch === q) q = null;
        continue;
      }
      if (ch === '"' || ch === "'") { q = ch; buf += ch; continue; }
      if (ch === '{') {
        let pre = buf;
        const cut = Math.max(pre.lastIndexOf(';'), pre.lastIndexOf('}'));
        if (cut >= 0) pre = pre.slice(cut + 1);
        stack.push({ prelude: pre.trim().replace(/\s+/g, ' '), start: i + 1 });
        buf = '';
      } else if (ch === '}') {
        const node = stack.pop();
        if (node) {
          const body = css.slice(node.start, i);
          if (body.indexOf('{') === -1) blocks.push({ prelude: node.prelude, body: body });
        }
        buf = '';
      } else {
        buf += ch;
      }
    }
    return blocks;
  }

  const SPACING_PROPS = /^(margin|padding|gap|row-gap|column-gap|inset|top|right|bottom|left|grid-gap|scroll-margin|scroll-padding)(-top|-right|-bottom|-left|-block|-inline|-block-start|-block-end|-inline-start|-inline-end)?$/;
  const RADIUS_PROP = /^(border(-[a-z]+)?-radius|border-start-start-radius|border-start-end-radius|border-end-start-radius|border-end-end-radius)$/;

  /* ---------------- model ---------------- */
  function parse(cssText, opts) {
    opts = opts || {};
    const css = cleanCSS(cssText);
    const blocks = collectBlocks(css);
    const m = {
      blocks: blocks.length,
      declarations: 0,
      important: 0,
      duplicates: [],
      dynamicValues: 0,
      varRefs: 0,
      colors: new Map(),      // key -> {key, rgb, count, props:Set, literals:Map}
      unparsed: new Map(),
      customProps: new Map(),
      spacing: [],            // {px, raw, prop, unit, negative}
      fontSizes: [],          // {px|null, raw, dynamic}
      radii: new Map(),
      shadows: new Map(),
      families: new Map(),
      weights: new Map(),
      zindex: new Map(),
      typeContext: new Map()
    };

    blocks.forEach(function (blk) {
      const decls = splitDecls(blk.body);
      const seen = new Map();
      decls.forEach(function (d) {
        const ci = d.indexOf(':');
        if (ci < 1) return;
        const prop = d.slice(0, ci).trim().toLowerCase();
        let value = d.slice(ci + 1).trim();
        if (!/^--[\w-]+$/.test(prop) && !/^-?[a-z][\w-]*$/i.test(prop)) return;
        if (!value) return;
        m.declarations++;
        const isImportant = /!important/i.test(value);
        if (isImportant) { m.important++; value = value.replace(/!important/i, '').trim(); }

        if (seen.has(prop)) m.duplicates.push({ prop: prop, prelude: blk.prelude });
        seen.set(prop, true);

        /* custom properties are the existing token layer */
        if (/^--/.test(prop)) {
          const prev = m.customProps.get(prop);
          const rgb = parseColor(value);
          m.customProps.set(prop, {
            name: prop, value: value, count: (prev ? prev.count : 0) + 1,
            rgb: rgb, hex: rgb ? toHex8(rgb) : null
          });
        }

        const dynamic = /\b(clamp|calc|min|max|var|env|color-mix|light-dark|anchor|attr)\s*\(/i.test(value);
        if (dynamic) m.dynamicValues++;
        if (/\bvar\s*\(/i.test(value)) m.varRefs++;

        /* ---- colours (only props that take a colour) ---- */
        if (/(^|-)color$/.test(prop) || /(^|-)background$/.test(prop) || /gradient|shadow|border(-(top|right|bottom|left|block|inline)(-(start|end))?)?$|outline$|fill$|stroke$|caret-color|accent-color|text-decoration-color|column-rule/i.test(prop)) {
          COLOR_TOKEN.lastIndex = 0;
          let t;
          while ((t = COLOR_TOKEN.exec(value))) {
            const raw = t[0];
            if (raw.charAt(0) !== '#' && !/^(rgb|rgba|hsl|hsla|hwb|oklab|oklch|lab|lch|color)\(/i.test(raw)) {
              if (!NAMED[raw.toLowerCase()]) {
                if (ANGLE_HINT.test(raw)) continue;
                continue;
              }
            }
            const rgb = parseColor(raw);
            if (!rgb) {
              if (/^(lab|lch|color|color-mix)\(/i.test(raw)) {
                m.unparsed.set(raw, (m.unparsed.get(raw) || 0) + 1);
              }
              continue;
            }
            if (rgb.a === 0) continue;
            const key = toHex8(rgb) + '|' + round(rgb.a, 3);
            const entry = m.colors.get(key) || { key: key, rgb: rgb, count: 0, props: new Set(), literals: new Map() };
            entry.count++;
            entry.props.add(prop);
            entry.literals.set(raw, (entry.literals.get(raw) || 0) + 1);
            m.colors.set(key, entry);
          }
        }

        /* ---- spacing ---- */
        if (SPACING_PROPS.test(prop)) {
          if (dynamic) {
            /* ranges / calc: not part of the literal scale, but record the intent */
          } else {
            LENGTH_TOKEN.lastIndex = 0;
            let t;
            while ((t = LENGTH_TOKEN.exec(value))) {
              const unit = t[2];
              const n = parseFloat(t[1]);
              if (!isFinite(n) || n === 0) continue;
              if (unit === 'em' || unit === 'vh' || unit === 'vw' || unit === 'ch' || unit === 'pt' || unit === '%') continue;
              m.spacing.push({ n: n, unit: unit, raw: t[0], prop: prop, negative: n < 0 });
            }
          }
        }

        /* ---- radius ---- */
        if (RADIUS_PROP.test(prop) && !dynamic) {
          value.split(/\s+/).forEach(function (part) {
            const c = parseColor(part);
            if (c) return;
            if (/^0(px|rem|%)?$/.test(part)) return;
            const mm = part.match(/^(-?[\d.]+)(px|rem|%)$/);
            if (!mm) return;
            const n = parseFloat(mm[1]);
            const px = mm[2] === 'rem' ? n * (opts.rootPx || 16) : n;
            m.radii.set(part, (m.radii.get(part) || 0) + 1);
            void px;
          });
        }

        /* ---- font size ---- */
        if (prop === 'font-size' && !dynamic) {
          const mm = value.match(/^(-?[\d.]+)(px|rem|%)$/);
          if (mm) {
            const n = parseFloat(mm[1]);
            const unit = mm[2];
            const px = unit === 'rem' ? n * (opts.rootPx || 16) : (unit === 'px' ? n : null);
            m.fontSizes.push({ raw: value, px: px, dynamic: dynamic, prelude: blk.prelude });
            if (px != null) { const k = blk.prelude; m.typeContext.set(k, (m.typeContext.get(k) || 0) + 1); }
          } else if (/%$/.test(value) || /^[\d.]/.test(value)) {
            m.fontSizes.push({ raw: value, px: null, dynamic: false, prelude: blk.prelude });
          }
        }
        if (prop === 'font' && !dynamic) {
          const mm = value.match(/(?:^|\s)([\d.]+)(px|rem)(?:\/(?:[\d.]+(?:px|rem|em|%)?|normal))?(?:\s|$)/);
          if (mm) {
            const n = parseFloat(mm[1]);
            const px = mm[2] === 'rem' ? n * (opts.rootPx || 16) : n;
            m.fontSizes.push({ raw: mm[0].trim(), px: px, dynamic: false, shorthand: true, prelude: blk.prelude });
          }
        }

        /* ---- shadows ---- */
        if (prop === 'box-shadow' || prop === 'text-shadow') {
          m.shadows.set(value, (m.shadows.get(value) || 0) + 1);
        }
        /* ---- families ---- */
        if (prop === 'font-family') {
          const f = value.replace(/\s+/g, ' ').trim();
          m.families.set(f, (m.families.get(f) || 0) + 1);
        }
        /* ---- weights ---- */
        if (prop === 'font-weight') {
          m.weights.set(value, (m.weights.get(value) || 0) + 1);
        }
        /* ---- z-index ---- */
        if (prop === 'z-index' && /^-?\d+$/.test(value)) {
          m.zindex.set(value, (m.zindex.get(value) || 0) + 1);
        }
      });
    });
    return m;
  }

  /* ---------------- colour clustering ---------------- */
  /* Boundaries are OKLCh hue angles, not HSL: in OKLCh, sRGB blue sits at 264°
     and magenta at 328°, so an HSL-tuned table calls #0d6efd "indigo". */
  const HUE_BUCKETS = [
    [30, 'red'], [72, 'orange'], [95, 'amber'], [118, 'yellow'], [140, 'lime'],
    [165, 'green'], [188, 'teal'], [215, 'cyan'], [275, 'blue'], [300, 'indigo'],
    [320, 'violet'], [340, 'magenta'], [360, 'pink']
  ];
  function hueName(h) {
    for (let i = 0; i < HUE_BUCKETS.length; i++) if (h < HUE_BUCKETS[i][0]) return HUE_BUCKETS[i][1];
    return 'red';
  }
  /* Shade = OKLab lightness as an integer percentage (100 = white). Monotonic,
     collision-resistant, and it never pretends to be a Tailwind 50–900 ramp —
     two near-identical tints genuinely are near-identical numbers. */
  function shadeOf(L) { return clamp(Math.round(L * 100), 0, 100); }

  const NEUTRAL_CHROMA = 0.008;

  /* Leader clustering: each cluster is defined by its most-used colour, and every
     member must sit within `threshold` of that leader. Avoids single-link chaining
     (which happily walks #ffffff → #f0f0f0 through a chain of 2ΔE steps).
     Neutrals and chromatic colours never merge: "#f0f0f0 → #fdecec" is a terrible
     recommendation even though the two are 1.4ΔE apart, because they are different
     roles. A missed merge is cheaper than a wrong one. */
  function clusterColors(entries, threshold) {
    const leaders = [];
    entries.forEach(function (e) {
      const lab = oklabOf(e.rgb);
      const neutral = oklchOf(e.rgb).C < NEUTRAL_CHROMA;
      let best = -1, bestD = Infinity;
      for (let i = 0; i < leaders.length; i++) {
        const L = leaders[i];
        if (L.neutral !== neutral) continue;
        if (Math.abs(L.canonical.rgb.a - e.rgb.a) > 0.02) continue;
        const d = Math.hypot(lab.L - L.lab.L, lab.a - L.lab.a, lab.b - L.lab.b) * 100;
        if (d <= threshold && d < bestD) { bestD = d; best = i; }
      }
      if (best === -1) leaders.push({ canonical: e, lab: lab, neutral: neutral, members: [e] });
      else { leaders[best].members.push(e); e._d = bestD; }
    });
    leaders.forEach(function (g) {
      g.members.forEach(function (m, i) { m.leaderDistance = i === 0 ? 0 : round(m._d, 2); });
    });
    return leaders.map(g => g.members);
  }

  function buildClusters(model, opts) {
    const threshold = opts.threshold;
    const entries = Array.from(model.colors.values())
      .filter(e => e.rgb.a > 0.02)
      .sort((a, b) => b.count - a.count || (oklchOf(b.rgb).L - oklchOf(a.rgb).L));
    const groups = clusterColors(entries, threshold);
    const usedNames = new Map();

    const clusters = groups.map(function (members) {
      members.sort((a, b) => b.count - a.count);
      const total = members.reduce((s, e) => s + e.count, 0);
      const canonical = members[0];
      const lch = oklchOf(canonical.rgb);
      /* widest perceptual spread inside the cluster */
      let spread = 0;
      for (let i = 0; i < members.length; i++)
        for (let j = i + 1; j < members.length; j++)
          spread = Math.max(spread, deltaEOk(members[i].rgb, members[j].rgb));

      const neutral = lch.C < NEUTRAL_CHROMA;
      let name = neutral ? 'grey' : hueName(lch.h);
      const shade = shadeOf(lch.L);
      let base = '--' + name + '-' + shade + alphaTag(canonical.rgb);
      let n = usedNames.get(base) || 0;
      usedNames.set(base, n + 1);
      const token = n === 0 ? base : base + String.fromCharCode(96 + n + 1);

      return {
        members: members,
        canonical: canonical,
        total: total,
        spread: spread,
        oklch: lch,
        neutral: neutral,
        name: name,
        shade: shade,
        token: token,
        opacityVariants: members.filter(e => e.rgb.a < 0.999).length,
        props: Array.from(new Set(members.flatMap(e => Array.from(e.props)))).sort()
      };
    }).sort((a, b) => b.total - a.total);

    return { clusters: clusters, entries: entries, threshold: threshold };
  }

  /* ---------------- spacing ---------------- */
  /* Analyse in the unit the author actually wrote. Judging a rem-based sheet on a
     4px grid is meaningless — 0.85rem is 13.6px, so nothing ever lands on the grid
     and the report is pure noise. Whichever unit dominates gets its own grid. */
  const GRID_CANDIDATES = { px: [2, 4, 6, 8, 10, 12], rem: [0.0625, 0.125, 0.25, 0.5, 0.75, 1] };
  const REF_GRID = { px: 4, rem: 0.25 };

  function fmtNum(n) {
    const r = Math.round(n * 10000) / 10000;
    return String(r);
  }

  function buildSpacing(model, opts) {
    const byUnit = new Map();
    model.spacing.forEach(function (s) {
      if (s.negative) return;
      if (!byUnit.has(s.unit)) byUnit.set(s.unit, []);
      byUnit.get(s.unit).push(s.n);
    });
    let unit = 'px', best = -1;
    byUnit.forEach(function (v, k) { if (v.length > best) { best = v.length; unit = k; } });
    if (!byUnit.has(unit)) unit = 'px';
    const vals = byUnit.get(unit) || [];
    const excludedUnits = [];
    byUnit.forEach(function (v, k) { if (k !== unit) excludedUnits.push({ unit: k, count: v.length }); });

    const dec = unit === 'px' ? 2 : 4;
    const counts = new Map();
    vals.forEach(function (n) { const k = round(n, dec); counts.set(k, (counts.get(k) || 0) + 1); });
    const distinct = Array.from(counts.entries())
      .map(function (e) { return { v: e[0], count: e[1] }; })
      .sort(function (a, b) { return a.v - b.v; });

    const candidates = GRID_CANDIDATES[unit] || GRID_CANDIDATES.px;
    const refGrid = REF_GRID[unit] || 4;
    const EPS = unit === 'px' ? 1e-6 : 1e-4;
    const onStep = function (v, step) { return Math.abs(v / step - Math.round(v / step)) < EPS; };

    let perCandidate = [], bestFit = -1;
    candidates.forEach(function (step) {
      let on = 0, totalUses = 0;
      distinct.forEach(function (d) { totalUses += d.count; if (onStep(d.v, step)) on += d.count; });
      const frac = totalUses ? on / totalUses : 1;
      perCandidate.push({ step: step, frac: frac });
      if (frac > bestFit) bestFit = frac;
    });
    const bestCand = perCandidate.reduce(function (a, b) { return b.frac > a.frac ? b : a; });
    /* only adopt a coarser step when it explains ≥85% of the mass */
    const grid = (bestCand.step >= refGrid && bestCand.frac >= 0.85) ? bestCand.step : refGrid;
    const gridFit = perCandidate.filter(function (c) { return c.step === grid; })[0].frac;

    const offGrid = [], onGrid = [], snappedKeys = new Set();
    distinct.forEach(function (d) {
      const snapped = round(Math.round(d.v / grid) * grid, dec);
      snappedKeys.add(snapped);
      const rec = { v: d.v, count: d.count, snapped: snapped, delta: round(d.v - snapped, dec) };
      if (Math.abs(rec.delta) < EPS) onGrid.push(rec); else offGrid.push(rec);
    });
    offGrid.sort(function (a, b) { return b.count - a.count; });

    const nearGap = unit === 'px' ? 2 : 0.125;
    const nearMisses = [];
    for (let i = 0; i < distinct.length; i++) {
      for (let j = i + 1; j < distinct.length; j++) {
        const d = distinct[j].v - distinct[i].v;
        if (d <= nearGap) nearMisses.push({ a: distinct[i], b: distinct[j], gap: round(d, dec) });
      }
    }
    nearMisses.sort(function (x, y) { return (y.a.count + y.b.count) - (x.a.count + x.b.count); });

    return {
      unit: unit,
      distinct: distinct,
      totalUses: vals.length,
      grid: grid,
      refGrid: refGrid,
      gridFit: gridFit,
      bestStep: bestCand.step,
      bestFit: bestCand.frac,
      perCandidate: perCandidate,
      offGrid: offGrid,
      onGrid: onGrid,
      nearMisses: nearMisses.slice(0, 12),
      nearGap: nearGap,
      snappedDistinct: snappedKeys.size,
      excludedUnits: excludedUnits,
      max: distinct.length ? distinct[distinct.length - 1].v : 0
    };
  }

  /* ---------------- type ---------------- */
  /* No fabricated "ideal scale": we report the observed sizes, the spread of the
     ratios between them, and — the actionable part — sizes that are within 2px of
     a neighbour and therefore indistinguishable in practice. */
  function buildType(model, opts) {
    const withPx = model.fontSizes.filter(f => f.px != null && f.px > 0);
    const counts = new Map();
    withPx.forEach(f => { const k = round(f.px, 2); counts.set(k, (counts.get(k) || 0) + 1); });
    const distinct = Array.from(counts.entries()).map(([px, count]) => ({ px: px, count: count })).sort((a, b) => a.px - b.px);

    const ratios = [];
    for (let i = 1; i < distinct.length; i++) ratios.push(distinct[i].px / distinct[i - 1].px);
    const sortedR = ratios.slice().sort((a, b) => a - b);
    const median = sortedR.length ? (sortedR.length % 2 ? sortedR[(sortedR.length - 1) / 2] : (sortedR[sortedR.length / 2 - 1] + sortedR[sortedR.length / 2]) / 2) : 1;

    /* Consecutive gaps ≤2px chain badly (12/13, 13/14, 14/16 … flags everything).
       Greedy disjoint matching instead: tightest gap first, and a size can only be
       claimed once — so the result is a concrete set of merges, not a smear. */
    const candidates = [];
    for (let i = 1; i < distinct.length; i++) {
      const gap = round(distinct[i].px - distinct[i - 1].px, 2);
      if (gap <= 2) candidates.push({ a: distinct[i - 1], b: distinct[i], gap: gap });
    }
    candidates.sort(function (x, y) {
      return x.gap - y.gap || (y.a.count + y.b.count) - (x.a.count + x.b.count);
    });
    const claimed = new Set(), nearPairs = [];
    candidates.forEach(function (p) {
      if (claimed.has(p.a.px) || claimed.has(p.b.px)) return;
      claimed.add(p.a.px); claimed.add(p.b.px);
      nearPairs.push(p);
    });
    nearPairs.sort(function (x, y) { return (y.a.count + y.b.count) - (x.a.count + x.b.count); });
    /* sizes that only *could* merge, for the ladder highlight */
    const nearSizes = new Set();
    candidates.forEach(function (p) { nearSizes.add(p.a.px); nearSizes.add(p.b.px); });

    const mean = ratios.length ? ratios.reduce((a, b) => a + b, 0) / ratios.length : 1;
    const variance = ratios.length ? ratios.reduce((a, b) => a + (b - mean) * (b - mean), 0) / ratios.length : 0;

    /* rungs of the closest simple scale: the most common quantised ratio */
    const NICE = [1.125, 1.2, 1.25, 1.333, 1.414, 1.5, 1.618, 1.75, 2];
    let nearestNice = null, nd = Infinity;
    NICE.forEach(function (n) { const d = Math.abs(Math.log(n) - Math.log(median || 1)); if (d < nd) { nd = d; nearestNice = n; } });

    return {
      distinct: distinct,
      ratios: ratios.map(r => round(r, 3)),
      median: round(median, 3),
      mean: round(mean, 3),
      sd: round(Math.sqrt(variance), 3),
      nearPairs: nearPairs,
      nearSizes: nearSizes,
      nearCount: claimed.size,
      mergeCount: nearPairs.length,
      idealCount: distinct.length - nearPairs.length,
      nearestNice: median > 1.03 ? nearestNice : null,
      dynamic: model.fontSizes.filter(f => f.px == null).length,
      shorthand: withPx.filter(f => f.shorthand).length
    };
  }

  /* ---------------- misc debt ---------------- */
  function buildMisc(model) {
    const toList = (map, keep) => Array.from(map.entries())
      .map(([value, count]) => ({ value: value, count: count }))
      .filter(x => (keep ? keep(x.value) : true))
      .sort((a, b) => b.count - a.count || String(a.value).localeCompare(String(b.value)));
    const zVals = toList(model.zindex, v => /^-?\d+$/.test(v));
    const zNums = zVals.map(z => parseInt(z.value, 10));
    return {
      radii: toList(model.radii),
      shadows: toList(model.shadows),
      families: toList(model.families),
      weights: toList(model.weights),
      zindex: zVals,
      zRange: zNums.length ? [Math.min.apply(null, zNums), Math.max.apply(null, zNums)] : null,
      zAllOver: zNums.filter(n => n > 999).length
    };
  }

  /* ---------------- score ---------------- */
  function axis(distinct, ideal) {
    if (distinct <= 1) return 100;
    return Math.round(clamp(100 * ideal / distinct, 0, 100));
  }
  function bandOf(score) {
    if (score >= 85) return { label: 'Tight', tone: 'good' };
    if (score >= 70) return { label: 'Reasonable', tone: 'ok' };
    if (score >= 50) return { label: 'Drifting', tone: 'warn' };
    if (score >= 30) return { label: 'Loose', tone: 'bad' };
    return { label: 'Ad hoc', tone: 'bad' };
  }

  /* ---------------- token sheet ---------------- */
  function buildTokens(analysis, opts) {
    const lines = [];
    const mapping = [];
    const colours = analysis.colours.clusters.slice().sort((a, b) => b.oklch.L - a.oklch.L);
    lines.push('/* Generated by Token Debt Audit — ' + colours.length + ' colour tokens from '
      + analysis.stats.uniqueColours + ' literal colours (ΔE ≤ ' + opts.threshold + ')');
    lines.push('   Token names are <hue>-<OKLab lightness %>: higher = lighter, 100 = white. */');
    lines.push(':root {');

    lines.push('  /* colour');
    colours.forEach(function (c) {
      lines.push('  ' + c.token + ': ' + toCss(c.canonical.rgb) + ';  /* ' + c.total + ' use' + (c.total === 1 ? '' : 's')
        + (c.members.length > 1 ? ' · merges ' + c.members.length : '') + ' */');
      c.members.forEach(function (m) {
        Array.from(m.literals.keys()).forEach(function (lit) {
          mapping.push({ from: lit, to: 'var(' + c.token + ')', kind: 'colour', uses: m.literals.get(lit), cluster: c.token });
        });
      });
    });
    lines.push('  */');

    if (analysis.spacing.distinct.length) {
      const sp = analysis.spacing;
      const eps = sp.unit === 'px' ? 1e-6 : 1e-4;
      /* group by *target* — several sloppy values often snap to the same token, and
         emitting the declaration once per source value produces duplicate names */
      const groups = new Map();
      sp.distinct.forEach(function (d) {
        const snapped = round(Math.round(d.v / sp.grid) * sp.grid, 6);
        if (Math.abs(snapped - d.v) < eps) return;      // already on grid
        if (!groups.has(snapped)) groups.set(snapped, { snapped: snapped, uses: 0, sources: [] });
        const g = groups.get(snapped);
        g.uses += d.count;
        g.sources.push({ v: d.v, count: d.count });
      });
      lines.push('  /* space — ' + sp.grid + sp.unit + ' grid, ' + sp.offGrid.length + ' off-grid value(s) → '
        + groups.size + ' token' + (groups.size === 1 ? '' : 's'));
      Array.from(groups.keys()).sort(function (a, b) { return a - b; }).forEach(function (key) {
        const g = groups.get(key);
        /* label in px-equivalent so the name is stable whichever unit the sheet used */
        const label = sp.unit === 'px' ? g.snapped : Math.round(g.snapped * (opts.rootPx || 16));
        lines.push('  --space-' + label + ': ' + fmtNum(g.snapped) + sp.unit + ';  /* from '
          + g.sources.map(function (s) { return fmtNum(s.v) + sp.unit + ' ×' + s.count; }).join(', ') + ' */');
        g.sources.forEach(function (s) {
          mapping.push({
            from: fmtNum(s.v) + sp.unit, to: 'var(--space-' + label + ')', kind: 'space',
            uses: s.count, cluster: sp.grid + sp.unit + ' grid'
          });
        });
      });
      lines.push('  */');
    }

    if (analysis.type.distinct.length) {
      lines.push('  /* type — ' + analysis.type.distinct.length + ' sizes, median adjacent ratio ' + analysis.type.median
        + (analysis.type.nearPairs.length ? ', ' + analysis.type.nearPairs.length + ' near-duplicate pair(s)' : '') + ' */');
      lines.push('  */');
    }

    lines.push('}');
    return { css: lines.join('\n'), mapping: mapping };
  }

  /* ---------------- findings ---------------- */
  function buildFindings(a, opts) {
    const f = [];
    const c = a.colours, s = a.spacing, t = a.type, mi = a.misc;

    if (c.clusters.length && c.entries.length > c.clusters.length) {
      const removed = c.entries.length - c.clusters.length;
      const biggest = c.clusters.slice().sort((a, b) => b.members.length - a.members.length)[0];
      f.push({
        level: 'high',
        title: c.entries.length + ' literal colours collapse to ' + c.clusters.length + ' tokens',
        detail: removed + ' value' + (removed === 1 ? '' : 's') + ' are perceptually indistinguishable (ΔE ≤ ' + opts.threshold
          + ' from a sibling). Most duplicated: ' + biggest.members.length + ' values around '
          + toCss(biggest.canonical.rgb) + ' (' + biggest.total + ' uses).'
      });
    }
    const biggestSpread = c.clusters.filter(x => x.members.length > 1 && x.spread >= opts.threshold * 1.6).sort((x, y) => y.spread - x.spread)[0];
    if (biggestSpread) {
      const worst = biggestSpread.members.slice().sort((x, y) => y.count - x.count);
      f.push({
        level: 'low',
        title: 'Cluster "' + biggestSpread.token + '" spans ΔE ' + round(biggestSpread.spread, 1),
        detail: 'From ' + toCss(worst[worst.length - 1].rgb) + ' to ' + toCss(worst[0].rgb)
          + ' — ' + biggestSpread.members.length + ' values at the edge of the merge threshold. Worth a look: these may be deliberate near-pairs rather than sloppiness.'
      });
    }
    if (c.syntaxVariants && c.syntaxVariants.length) {
      f.push({
        level: 'low',
        title: c.syntaxVariants.length + ' colour' + (c.syntaxVariants.length === 1 ? '' : 's') + ' written more than one way',
        detail: c.syntaxVariants.slice(0, 4).map(v => v.literals.join(' / ') + ' → ' + v.value).join('; ')
          + (c.syntaxVariants.length > 4 ? ' …' : '')
      });
    }
    /* one-offs: the actionable subset is those that are near a colour already in use */
    const oneOffs = c.entries.filter(e => e.count === 1);
    const mergedOneOffs = [];
    c.clusters.forEach(function (cl) {
      if (cl.members.length < 2) return;
      cl.members.forEach(function (m) { if (m.count === 1) mergedOneOffs.push({ m: m, cluster: cl }); });
    });
    if (mergedOneOffs.length) {
      f.push({
        level: mergedOneOffs.length > 6 ? 'med' : 'low',
        title: mergedOneOffs.length + ' of ' + oneOffs.length + ' single-use colours duplicate one you already use',
        detail: 'These can be deleted outright — each is within ΔE ' + opts.threshold + ' of a token: '
          + mergedOneOffs.slice(0, 8).map(x => toCss(x.m.rgb) + '→' + x.cluster.token).join(', ')
          + (mergedOneOffs.length > 8 ? ' …' : '')
      });
    }
    if (s.offGrid.length && s.gridFit < 0.95) {
      const wasted = s.offGrid.reduce((n, d) => n + d.count, 0);
      f.push({
        level: s.gridFit < 0.6 ? 'high' : (s.gridFit < 0.85 ? 'med' : 'low'),
        title: Math.round(s.gridFit * 100) + '% of spacing declarations land on a ' + s.grid + s.unit + ' grid',
        detail: s.offGrid.length + ' of ' + s.distinct.length + ' distinct values are off it, across '
          + wasted + ' declaration' + (wasted === 1 ? '' : 's') + '. Worst: '
          + s.offGrid.slice(0, 5).map(function (d) { return fmtNum(d.v) + s.unit + '→' + fmtNum(d.snapped) + s.unit + ' ×' + d.count; }).join(', ') + '.'
          + (s.bestStep !== s.grid ? ' The best-fitting step is ' + fmtNum(s.bestStep) + s.unit + ' at ' + Math.round(s.bestFit * 100) + '% — in other words, not a scale at all, just arbitrary values.' : '')
      });
    }
    if (s.nearMisses.length) {
      const pair = s.nearMisses[0];
      f.push({
        level: 'low',
        title: s.nearMisses.length + ' near-miss spacing pair' + (s.nearMisses.length === 1 ? '' : 's'),
        detail: 'Closest ambiguity: ' + fmtNum(pair.a.v) + s.unit + ' (×' + pair.a.count + ') vs ' + fmtNum(pair.b.v) + s.unit
          + ' (×' + pair.b.count + ') — a ' + fmtNum(pair.gap) + s.unit + ' difference nobody can perceive, but every consumer has to maintain.'
      });
    }
    if (s.excludedUnits && s.excludedUnits.length) {
      f.push({
        level: 'low',
        title: 'Spacing measured in ' + s.unit + ' (the dominant unit)',
        detail: s.excludedUnits.map(function (u) { return u.count + ' value(s) in ' + u.unit; }).join(', ')
          + ' were left out of the grid analysis rather than converted and judged against a grid they were never written to.'
      });
    }
    if (t.nearPairs.length) {
      f.push({
        level: t.nearPairs.length > 2 ? 'med' : 'low',
        title: t.mergeCount + ' of ' + t.distinct.length + ' type sizes can collapse into a neighbour',
        detail: 'Within 2px, so invisible in practice: '
          + t.nearPairs.slice(0, 8).map(p => p.a.px + '/' + p.b.px + 'px').join(', ')
          + (t.nearPairs.length > 8 ? ' …' : '')
          + ' — ' + t.nearCount + ' sizes are involved. Two sizes 1px apart cost exactly as much to maintain as two sizes 20px apart.'
      });
    }
    if (t.distinct.length) {
      f.push({
        level: t.distinct.length > 12 ? 'med' : 'low',
        title: t.distinct.length + ' distinct font sizes'
          + (t.nearestNice ? ', nearest simple scale ' + t.nearestNice : ''),
        detail: 'Adjacent-step ratios scatter (median ' + t.median + ', σ ' + t.sd + ')'
          + (t.nearestNice
            ? ' — the closest conventional scale would be a ratio of ' + t.nearestNice + '.'
            : ' — no recognisable ratio, so these were almost certainly set per component.')
      });
    }
    if (mi.radii.length > 4) {
      f.push({ level: 'med', title: mi.radii.length + ' distinct border radii', detail: 'Values: ' + mi.radii.map(r => r.value).join(', ') });
    }
    if (mi.shadows.length > 3) {
      f.push({ level: 'low', title: mi.shadows.length + ' distinct shadows', detail: 'Shadows are the least-tokenised property in most sheets. Values repeat ' + mi.shadows[0].count + '× at most.' });
    }
    if (mi.families.length > 2) {
      f.push({ level: 'low', title: mi.families.length + ' font stacks', detail: mi.families.map(x => x.value.split(',')[0].replace(/["']/g, '') + ' ×' + x.count).join(' · ') });
    }
    if (mi.zAllOver) {
      f.push({ level: 'med', title: mi.zAllOver + ' z-index value' + (mi.zAllOver === 1 ? '' : 's') + ' above 999', detail: 'Range ' + mi.zRange[0] + '–' + mi.zRange[1] + '. Escalation is in progress.' });
    }
    if (a.stats.important) {
      f.push({ level: a.stats.important > 20 ? 'med' : 'low', title: a.stats.important + ' × !important', detail: 'Specificity is being resolved by force rather than by structure.' });
    }
    if (a.stats.duplicates.length) {
      f.push({ level: 'low', title: a.stats.duplicates.length + ' duplicate propert' + (a.stats.duplicates.length === 1 ? 'y' : 'ies') + ' inside a single block', detail: 'e.g. ' + a.stats.duplicates.slice(0, 3).map(d => d.prelude + ' { ' + d.prop + ' }').join(', ') });
    }
    if (a.customProps.used > 0 && c.entries.length >= 8 && a.stats.varRate < 0.6) {
      f.push({
        level: c.entries.length > a.customProps.used * 2 ? 'med' : 'low',
        title: a.customProps.used + ' custom propert' + (a.customProps.used === 1 ? 'y' : 'ies') + ' defined, ' + c.entries.length + ' literal colours',
        detail: a.varRefs + ' declaration' + (a.varRefs === 1 ? '' : 's') + ' reference a variable ('
          + Math.round(a.stats.varRate * 100) + '% of declarations). The token layer exists — it is just not enforced.'
      });
    }
    if (c.unparsed.length) {
      f.push({ level: 'low', title: c.unparsed.length + ' colour function' + (c.unparsed.length === 1 ? '' : 's') + ' not analysed', detail: 'Outside the supported set (lab/lch/display-p3 etc.): ' + c.unparsed.slice(0, 4).map(u => u.value + ' ×' + u.count).join(', ') });
    }
    const rank = { high: 0, med: 1, low: 2 };
    return f.sort((x, y) => rank[x.level] - rank[y.level]);
  }

  /* ---------------- top level ---------------- */
  function analyse(model, options) {
    const opts = Object.assign({ threshold: 2, rootPx: 16 }, options || {});

    /* colour entries + syntax variants */
    const entries = Array.from(model.colors.values()).filter(e => e.rgb.a > 0.02);
    const syntaxVariants = entries.filter(e => e.literals.size > 1)
      .map(e => ({ value: toCss(e.rgb), literals: Array.from(e.literals.keys()), alpha: e.rgb.a < 0.999 }))
      .sort((a, b) => b.literals.length - a.literals.length);

    const varRate = model.declarations ? model.varRefs / model.declarations : 0;

    const stats = {
      blocks: model.blocks,
      declarations: model.declarations,
      important: model.important,
      duplicates: model.duplicates,
      dynamicValues: model.dynamicValues,
      varRefs: model.varRefs,
      varRate: varRate,
      uniqueColours: entries.length,
      colourUses: entries.reduce((s, e) => s + e.count, 0),
      unparsed: Array.from(model.unparsed.entries()).map(([value, count]) => ({ value: value, count: count }))
    };

    const colourGroups = buildClusters(model, opts);
    const spacing = buildSpacing(model, opts);
    const type = buildType(model, opts);
    const misc = buildMisc(model);

    const colourScore = axis(entries.length, colourGroups.clusters.length);
    const spacingScore = axis(spacing.distinct.length, spacing.snappedDistinct);
    const typeScore = axis(type.distinct.length, type.idealCount);
    const radiusScore = axis(misc.radii.length, Math.min(misc.radii.length, 6));
    const shadowScore = axis(misc.shadows.length, Math.min(misc.shadows.length, 3));
    const miscScore = Math.round((radiusScore + shadowScore) / 2);
    const overall = Math.round(colourScore * 0.4 + spacingScore * 0.3 + typeScore * 0.2 + miscScore * 0.1);

    const analysis = {
      stats: stats,
      colours: {
        clusters: colourGroups.clusters,
        entries: entries,
        threshold: opts.threshold,
        syntaxVariants: syntaxVariants,
        unparsed: stats.unparsed
      },
      spacing: spacing,
      type: type,
      misc: misc,
      customProps: { list: Array.from(model.customProps.values()), used: model.customProps.size },
      varRefs: model.varRefs,
      score: {
        overall: overall,
        band: bandOf(overall),
        axes: [
          { key: 'colour', name: 'Colour', score: colourScore, detail: entries.length + ' literal → ' + colourGroups.clusters.length + ' token' + (colourGroups.clusters.length === 1 ? '' : 's') },
          { key: 'space', name: 'Space', score: spacingScore, detail: spacing.distinct.length + ' values → ' + spacing.snappedDistinct + ' on a ' + spacing.grid + spacing.unit + ' grid' },
          { key: 'type', name: 'Type', score: typeScore, detail: type.distinct.length + ' sizes' + (type.distinct.length - type.idealCount ? ' → ' + type.idealCount + ' after merging near-pairs' : '') },
          { key: 'misc', name: 'Radius & shadow', score: miscScore, detail: misc.radii.length + ' radii · ' + misc.shadows.length + ' shadows' }
        ]
      },
      findings: []
    };

    analysis.findings = buildFindings(analysis, opts);
    analysis.tokens = buildTokens(analysis, opts);

    /* contrast matrix for the most-used colours */
    const top = colourGroups.clusters.slice(0, 6);
    analysis.matrix = {
      colours: top,
      ratios: top.map(a => top.map(b => round(contrastRatio(a.canonical.rgb, b.canonical.rgb), 2)))
    };

    return analysis;
  }

  /* ---------------- HTML extraction ---------------- */
  function extractCSS(input) {
    const text = String(input || '');
    const parts = [];
    const styles = text.match(/<style[^>]*>([\s\S]*?)<\/style>/gi);
    if (styles) styles.forEach(function (s) { parts.push(s.replace(/^<style[^>]*>/i, '').replace(/<\/style>$/i, '')); });
    const inline = text.match(/\bstyle\s*=\s*"([^"]*)"/gi);
    if (inline) {
      const decls = inline.map(function (s) {
        const m = s.match(/style\s*=\s*"([^"]*)"/i);
        return m ? m[1] : '';
      }).filter(Boolean);
      if (decls.length) parts.push('/* inlined from style="" attributes */\n.__inline__ { ' + decls.join('; ') + ' }');
    }
    if (parts.length) return { css: parts.join('\n\n'), extracted: parts.length };
    return { css: text, extracted: 0 };
  }

  /* ---------------- sample ---------------- */
  const SAMPLE = [
    '/* A plausible inherited client stylesheet. Deliberately messy. */',
    ':root {',
    '  --brand: #0d6efd;',
    '  --ink: #222;',
    '  --paper: #ffffff;',
    '  --radius: 6px;',
    '}',
    '',
    'body { color: #222222; background: #fff; font-family: Inter, Helvetica, Arial, sans-serif; font-size: 16px; line-height: 1.55; }',
    '.muted { color: #6b6b6b; }',
    '.muted-2 { color: #6a6a6a; }',
    '.muted-3 { color: #6d6d6d; }',
    '.lede { color: #696969; font-size: 18px; }',
    '.fineprint { color: #8a8a8a; font-size: 13px; }',
    '.fineprint-2 { color: #8b8b8b; font-size: 12px; }',
    'h1 { font-size: 44px; color: #191919; margin: 0 0 22px; letter-spacing: -0.02em; }',
    'h2 { font-size: 30px; color: #1c1c1c; margin: 34px 0 13px; }',
    'h3 { font-size: 21px; color: #202020; margin: 26px 0 11px; }',
    'h4 { font-size: 17px; color: #232323; margin: 22px 0 9px; }',
    '.card { background: #fefefe; border: 1px solid #e9e9e9; border-radius: 6px; padding: 18px 22px; box-shadow: 0 1px 2px rgba(0,0,0,.06); }',
    '.card--flat { background: #fdfdfd; border-color: #ebebeb; border-radius: 7px; padding: 15px 20px; }',
    '.card--raised { border-radius: 10px; box-shadow: 0 8px 24px rgba(0,0,0,.12); padding: 19px 23px; }',
    '.panel { background: #f7f7f7; border: 1px solid #e6e6e6; border-radius: 8px; padding: 16px; }',
    '.panel--dark { background: #1a1a1a; color: #ededed; }',
    '.panel--darker { background: #181818; color: #eeeeee; border-color: #262626; }',
    '.btn { display: inline-flex; gap: 7px; padding: 11px 18px; border-radius: 5px; background: #0d6efd; color: #ffffff; border: 1px solid #0c63e4; font-weight: 600; }',
    '.btn:hover { background: #0b5ed7; }',
    '.btn--ghost { background: transparent; color: #0d6efd; border: 1px solid #0d6efd; }',
    '.btn--danger { background: #dc3545; border-color: #c9302c; }',
    '.btn--warn { background: #ffc107; color: #1a1a1a; }',
    '.link { color: #0a58ca; text-decoration-color: #9ec5fe; }',
    '.rule { border-top: 1px solid #eaeaea; margin: 30px 0; }',
    '.grid { display: grid; gap: 13px; }',
    '.grid--tight { gap: 11px; }',
    '.grid--loose { gap: 15px; }',
    '.stack > * + * { margin-top: 9px; }',
    '.stack--roomy > * + * { margin-top: 25px; }',
    '.badge { background: #eef2ff; color: #3730a3; border-radius: 999px; padding: 3px 10px; font-size: 12px; }',
    '.badge--ok { background: #e7f6ec; color: #1b6e3c; }',
    '.badge--err { background: #fdecec; color: #a52020; }',
    '.field { border: 1px solid #d9d9d9; border-radius: 4px; padding: 10px 12px; background: #fff; }',
    '.field:focus { outline: 2px solid #0d6efd; outline-offset: 1px; }',
    '.field--err { border-color: #e35d5d; background: #fffbfb; }',
    '.tabs { border-bottom: 1px solid #e5e5e5; }',
    '.tabs a { padding: 12px 14px; color: #555555; }',
    '.tabs a[aria-selected="true"] { color: #111111; box-shadow: inset 0 -2px 0 #0d6efd; }',
    '.tooltip { background: rgba(17,17,17,.94); color: #fafafa; border-radius: 5px; padding: 6px 9px; font-size: 12px; }',
    '.overlay { background: rgba(0,0,0,.45); }',
    '.overlay--heavy { background: rgba(0,0,0,.55); }',
    '.hero { background: linear-gradient(160deg, #0d6efd, #6f42c1); color: #fff; padding: 62px 24px; border-radius: 14px; }',
    '.hero p { color: #e6e6ff; font-size: 19px; }',
    '.stat { font-size: 34px; color: #111; font-weight: 500; }',
    '.stat small { font-size: 23px; color: #777; }',
    '.divider { height: 1px; background: #e0e0e0; margin: 21px 0; }',
    '.aside { background: #f4f4f4; border-left: 3px solid #0d6efd; padding: 14px 16px; border-radius: 0 6px 6px 0; }',
    '.site-footer { background: #151515; color: #9a9a9a; padding: 44px 24px; font-size: 14px; }',
    '.site-footer a { color: #c9c9c9; }',
    '.pill { background: #f0f0f0; border-radius: 100px; padding: 4px 12px; font-size: 12px; color: #444; }',
    '.pill--active { background: #0d6efd1a; color: #0a58ca; }',
    '/* newer syntaxes the auditor will report but not convert */',
    '.accent-deep { color: lch(45% 60 260); }',
    '.brand-p3 { background: color(display-p3 0.05 0.43 0.99); border-color: #0d6efd; }',
    '.tone-mix { background: color-mix(in oklab, #0d6efd 20%, white); }',
    '',
    '@media (max-width: 767px) {',
    '  h1 { font-size: 32px; margin-bottom: 18px; }',
    '  h2 { font-size: 25px; }',
    '  .card { padding: 15px 17px; border-radius: 8px; }',
    '  .hero { padding: 42px 20px; }',
    '  .muted { color: #6c6c6c; }',
    '  .panel { padding: 14px; }',
    '}',
    '@media (max-width: 479px) {',
    '  h1 { font-size: 27px; }',
    '  .btn { padding: 10px 15px; }',
    '  .grid { gap: 10px; }',
    '}',
    '',
    '.legacy { z-index: 9999; color: #222 !important; margin: 0 0 0 0; }',
    '.legacy-2 { z-index: 9000; }',
    '.print-only { display: none; }',
    '@media print { .print-only { display: block; color: #000; } }'
  ].join('\n');

  /* ---------------- export ---------------- */
  root.TDA = {
    parse: parse,
    analyse: analyse,
    extractCSS: extractCSS,
    parseColor: parseColor,
    toHex8: toHex8,
    toCss: toCss,
    toRgbaString: toRgbaString,
    oklchOf: oklchOf,
    deltaEOk: deltaEOk,
    contrastRatio: contrastRatio,
    SAMPLE: SAMPLE,
    _internals: { cleanCSS: cleanCSS, splitDecls: splitDecls, collectBlocks: collectBlocks, buildSpacing: buildSpacing, buildType: buildType }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = root.TDA;
})(typeof globalThis !== 'undefined' ? globalThis : this);
