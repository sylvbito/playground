/* colour.js — CSS Color 4 colour science. No DOM, no dependencies.
   sRGB ⇄ OKLCH (Björn Ottosson's matrices), Display P3 and Rec.2020
   transfer + primary matrices derived from the CIE primaries at D65,
   plus the CSS Color 4 §13.2 gamut-mapping algorithm. */

/* ---------- matrices ---------- */

// Ottosson: linear sRGB → LMS
const RGB2LMS = [
  [0.4122214708, 0.5363325363, 0.0514459929],
  [0.2119034982, 0.6806995451, 0.1073969566],
  [0.0883024619, 0.2817188376, 0.6299787005],
];
// Ottosson: LMS → linear sRGB. Computed as the exact inverse of RGB2LMS rather
// than copied from the paper's rounded table — the published reverse matrices are
// only ~1e-9 precise, which costs ~1e-7 on a full round trip and makes the
// "is this colour in gamut?" test at the boundary unreliable.
const LMS2RGB = [
  [+4.076741661347994, -3.307711590408193, +0.230969928729428],
  [-1.268438004092176, +2.609757400663371, -0.341319396310219],
  [-0.004196086541837, -0.703418614459449, +1.707614700930945],
];
// LMS' → OKLab
const LMSP2OKLAB = [
  [0.2104542553, 0.7936177850, -0.0040720468],
  [1.9779984951, -2.4285922050, 0.4505937099],
  [0.0259040371, 0.7827717662, -0.8086757660],
];
// OKLab → LMS' — exact inverse of LMSP2OKLAB, same reasoning as LMS2RGB.
const OKLAB2LMSP = [
  [+0.999999998450520, +0.396337792173768, +0.215803758060759],
  [+1.000000008881761, -0.105561342323656, -0.063854174771706],
  [+1.000000054672411, -0.089484182094966, -1.291485537864092],
];

// Derived from primaries at D65 (see README) — verified invertible to 4e-16.
export const SRGB_TO_P3 = [
  [+0.822461968714, +0.177538031286, +0.000000000000],
  [+0.033194198851, +0.966805801149, -0.000000000000],
  [+0.017082630721, +0.072397440664, +0.910519928615],
];
export const P3_TO_SRGB = [
  [+1.224940176281, -0.224940176281, -0.000000000000],
  [-0.042056954710, +1.042056954710, +0.000000000000],
  [-0.019637554590, -0.078636045551, +1.098273600141],
];
export const SRGB_TO_2020 = [
  [+0.627403895935, +0.329283038378, +0.043313065687],
  [+0.069097289358, +0.919540395075, +0.011362315566],
  [+0.016391438875, +0.088013307877, +0.895595253248],
];
export const R2020_TO_SRGB = [
  [+1.660491002108, -0.587641138789, -0.072849863320],
  [-0.124550474522, +1.132899897126, -0.008349422604],
  [-0.018150763355, -0.100578898008, +1.118729661363],
];

export function matVec(m, v) {
  return [
    m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2],
    m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
    m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2],
  ];
}

/* ---------- transfer functions (linear ⇄ encoded, 0..1) ---------- */

export const srgbDecode = (c) =>
  c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
export const srgbEncode = (c) =>
  c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;

const R2020_A = 1.09929682680944;
const R2020_B = 0.018053968510807;
export const rec2020Decode = (v) => {
  const s = Math.sign(v), a = Math.abs(v);
  return a < 4.5 * R2020_B ? a / 4.5 : s * Math.pow((a + R2020_A - 1) / R2020_A, 1 / 0.45);
};
export const rec2020Encode = (l) => {
  const s = Math.sign(l), a = Math.abs(l);
  return a < R2020_B ? 4.5 * a : s * (R2020_A * Math.pow(a, 0.45) - (R2020_A - 1));
};

/* ---------- colour spaces ---------- */

export const SPACES = {
  srgb: {
    id: 'srgb',
    label: 'sRGB',
    short: 'sRGB',
    cssFn: null, // hex
    toSpaceLin: (lin) => lin,
    fromSpaceLin: (v) => v,
    encode: srgbEncode,
    decode: srgbDecode,
    note: 'The web default. Every screen can show it, nothing outside it survives a screenshot.',
  },
  p3: {
    id: 'p3',
    label: 'Display P3',
    short: 'P3',
    cssFn: 'display-p3',
    toSpaceLin: (lin) => matVec(SRGB_TO_P3, lin),
    fromSpaceLin: (v) => matVec(P3_TO_SRGB, v),
    encode: srgbEncode,
    decode: srgbDecode,
    note: 'MacBook, iPhone, iPad displays. CSS `color(display-p3 …)`. A superset of sRGB.',
  },
  rec2020: {
    id: 'rec2020',
    label: 'Rec.2020',
    short: '2020',
    cssFn: 'rec2020',
    toSpaceLin: (lin) => matVec(SRGB_TO_2020, lin),
    fromSpaceLin: (v) => matVec(R2020_TO_SRGB, v),
    encode: rec2020Encode,
    decode: rec2020Decode,
    note: 'UHD/HLG reference, the widest CSS space. Almost no display reaches its corners.',
  },
};

/* ---------- OKLCH core ---------- */

export function oklabFromLinRGB(lin) {
  const [r, g, b] = lin;
  const L = RGB2LMS[0][0] * r + RGB2LMS[0][1] * g + RGB2LMS[0][2] * b;
  const M = RGB2LMS[1][0] * r + RGB2LMS[1][1] * g + RGB2LMS[1][2] * b;
  const S = RGB2LMS[2][0] * r + RGB2LMS[2][1] * g + RGB2LMS[2][2] * b;
  const Lp = Math.cbrt(L), Mp = Math.cbrt(M), Sp = Math.cbrt(S);
  return [
    LMSP2OKLAB[0][0] * Lp + LMSP2OKLAB[0][1] * Mp + LMSP2OKLAB[0][2] * Sp,
    LMSP2OKLAB[1][0] * Lp + LMSP2OKLAB[1][1] * Mp + LMSP2OKLAB[1][2] * Sp,
    LMSP2OKLAB[2][0] * Lp + LMSP2OKLAB[2][1] * Mp + LMSP2OKLAB[2][2] * Sp,
  ];
}

export function linRGBFromOKLab([L, a, b]) {
  const Lp = OKLAB2LMSP[0][0] * L + OKLAB2LMSP[0][1] * a + OKLAB2LMSP[0][2] * b;
  const Mp = OKLAB2LMSP[1][0] * L + OKLAB2LMSP[1][1] * a + OKLAB2LMSP[1][2] * b;
  const Sp = OKLAB2LMSP[2][0] * L + OKLAB2LMSP[2][1] * a + OKLAB2LMSP[2][2] * b;
  const l = Lp ** 3, m = Mp ** 3, s = Sp ** 3;
  return [
    LMS2RGB[0][0] * l + LMS2RGB[0][1] * m + LMS2RGB[0][2] * s,
    LMS2RGB[1][0] * l + LMS2RGB[1][1] * m + LMS2RGB[1][2] * s,
    LMS2RGB[2][0] * l + LMS2RGB[2][1] * m + LMS2RGB[2][2] * s,
  ];
}

export function oklabFromOKLCH({ l, c, h }) {
  const rad = (h * Math.PI) / 180;
  return [l, c * Math.cos(rad), c * Math.sin(rad)];
}

export function oklchFromOKLab([L, a, b]) {
  const c = Math.hypot(a, b);
  let h = (Math.atan2(b, a) * 180) / Math.PI;
  if (h < 0) h += 360;
  return { l: L, c, h };
}

export function oklchFromLinRGB(lin) {
  return oklchFromOKLab(oklabFromLinRGB(lin));
}

export function linRGBFromOKLCH(oklch) {
  return linRGBFromOKLab(oklabFromOKLCH(oklch));
}

/* ---------- encoded sRGB helpers ---------- */

export function linRGBFromHex(hex) {
  const s = hex.replace('#', '').trim();
  const full = s.length === 3 ? s.split('').map((ch) => ch + ch).join('') : s;
  const n = parseInt(full, 16);
  if (!/^[0-9a-fA-F]{6}$/.test(full)) throw new Error('bad hex: ' + hex);
  return [
    srgbDecode(((n >> 16) & 255) / 255),
    srgbDecode(((n >> 8) & 255) / 255),
    srgbDecode((n & 255) / 255),
  ];
}

export function hexFromLinRGB(lin, { clip = true } = {}) {
  const ch = (v) => {
    let e = srgbEncode(v);
    if (clip) e = Math.min(1, Math.max(0, e));
    return Math.round(e * 255);
  };
  const [r, g, b] = lin.map(ch);
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
}

export function oklchFromHex(hex) {
  return oklchFromLinRGB(linRGBFromHex(hex));
}

export function hexFromOKLCH(oklch) {
  return hexFromLinRGB(linRGBFromOKLCH(oklch));
}

export function inSRGBGamut(oklch, eps = 1e-6) {
  const enc = linRGBFromOKLCH(oklch).map(srgbEncode);
  return enc.every((v) => v >= -eps && v <= 1 + eps);
}

/* ---------- per-space gamut maths ---------- */

/** encoded (0..1) channel values in `space`, may fall outside 0..1 */
export function toSpaceEncoded(oklch, space) {
  const lin = linRGBFromOKLCH(oklch);
  const sp = SPACES[space].toSpaceLin(lin);
  return sp.map(SPACES[space].encode);
}

export function fromSpaceEncoded(enc, space) {
  const sp = enc.map(SPACES[space].decode);
  const lin = SPACES[space].fromSpaceLin(sp);
  return oklchFromLinRGB(lin);
}

export function inGamut(oklch, space, eps = 1e-6) {
  return toSpaceEncoded(oklch, space).every((v) => v >= -eps && v <= 1 + eps);
}

export const clipEncoded = (enc) => enc.map((v) => Math.min(1, Math.max(0, v)));

/** OKLab Euclidean distance, L in 0..1 — the CSS deltaEOK. JND ≈ 0.02 */
export function deltaEOK(a, b) {
  const A = oklabFromOKLCH(a), B = oklabFromOKLCH(b);
  return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]);
}

/** signed hue difference in degrees, -180..180 (0 when chroma is negligible) */
export function hueDelta(a, b) {
  if (a.c < 1e-4 || b.c < 1e-4) return 0;
  let d = ((a.h - b.h + 540) % 360) - 180;
  return d;
}

export function maxChromaAt(L, h, space, iters = 22) {
  if (L <= 0 || L >= 1) return 0;
  // Bracket the boundary first: grow hi until the colour leaves the gamut, then
  // bisect. (Halving down to a fitting hi is wrong — it lands *below* the
  // boundary and reports the halved value as the maximum.)
  let hi = 0.02;
  while (hi < 1 && inGamut({ l: L, c: hi, h }, space)) hi *= 2;
  let lo = 0;
  for (let i = 0; i < iters; i++) {
    const mid = (lo + hi) / 2;
    if (inGamut({ l: L, c: mid, h }, space)) lo = mid;
    else hi = mid;
  }
  return lo;
}

export function boundaryCurve(h, space, steps = 96) {
  const pts = [];
  for (let i = 0; i < steps; i++) {
    const L = i / (steps - 1);
    pts.push([maxChromaAt(L, h, space), L]);
  }
  return pts;
}

/* ---------- the three ways to resolve an out-of-gamut colour ---------- */

const JND = 0.02;
const EPSILON = 0.0001;

/** naïve: clamp the three channels in the destination space. */
export function resolveClip(oklch, space) {
  const enc = toSpaceEncoded(oklch, space);
  const wasOut = enc.some((v) => v < 0 || v > 1);
  const clippedEnc = clipEncoded(enc);
  const out = wasOut ? fromSpaceEncoded(clippedEnc, space) : { ...oklch };
  return { oklch: out, encoded: clippedEnc, wasOut, method: 'clip' };
}

/** binary search on chroma until the colour fits; keeps L and h exactly. */
export function resolveClamp(oklch, space) {
  if (inGamut(oklch, space)) {
    return { oklch: { ...oklch }, encoded: toSpaceEncoded(oklch, space), wasOut: false, method: 'clamp' };
  }
  let lo = 0, hi = oklch.c;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (inGamut({ ...oklch, c: mid }, space)) lo = mid;
    else hi = mid;
  }
  const fit = { l: oklch.l, c: lo, h: oklch.h };
  return { oklch: fit, encoded: clipEncoded(toSpaceEncoded(fit, space)), wasOut: true, method: 'clamp' };
}

/** CSS Color 4 §13.2: binary search on chroma with a deltaEOK JND tolerance.
    Lets the result stray up to 0.02 from the intended colour in exchange for
    keeping more chroma than a strict fit. */
export function resolveCss(oklch, space) {
  if (inGamut(oklch, space)) {
    return { oklch: { ...oklch }, encoded: toSpaceEncoded(oklch, space), wasOut: false, method: 'css' };
  }
  const { l, c, h } = oklch;
  if (l >= 1) return { oklch: { l: 1, c: 0, h }, encoded: [1, 1, 1], wasOut: true, method: 'css' };
  if (l <= 0) return { oklch: { l: 0, c: 0, h }, encoded: [0, 0, 0], wasOut: true, method: 'css' };

  let min = 0, max = c, minInGamut = true, current = { l, c, h };
  let clippedOklch = { l, c, h }, clippedEnc = clipEncoded(toSpaceEncoded(current, space));
  while (max - min > EPSILON) {
    const chroma = (min + max) / 2;
    current = { l, c: chroma, h };
    if (minInGamut && inGamut(current, space)) {
      min = chroma;
      continue;
    }
    clippedEnc = clipEncoded(toSpaceEncoded(current, space));
    clippedOklch = fromSpaceEncoded(clippedEnc, space);
    const E = deltaEOK(clippedOklch, current);
    if (E < JND) {
      if (JND - E < EPSILON) return { oklch: clippedOklch, encoded: clippedEnc, wasOut: true, method: 'css' };
      minInGamut = false;
      min = chroma;
    } else {
      max = chroma;
    }
  }
  return { oklch: clippedOklch, encoded: clippedEnc, wasOut: true, method: 'css' };
}

export const METHODS = {
  clip: { id: 'clip', label: 'Naïve clip', fn: resolveClip,
    blurb: 'Clamp each channel in the destination space. One line of code, and where the hue shift and the flat spots come from.' },
  clamp: { id: 'clamp', label: 'Clamp chroma', fn: resolveClamp,
    blurb: 'Binary-search chroma until the colour fits. Keeps lightness and hue exactly, gives up chroma.' },
  css: { id: 'css', label: 'CSS Color 4', fn: resolveCss,
    blurb: 'The spec algorithm: binary search with a deltaEOK ≈ 0.02 tolerance, so it keeps more chroma than a strict fit while staying perceptually identical.' },
};

export function resolve(oklch, space, method) {
  return METHODS[method].fn(oklch, space);
}

/* ---------- ramps ---------- */

export const PROFILES = {
  flat: { id: 'flat', label: 'Flat chroma', fn: () => 1 },
  arc: { id: 'arc', label: 'Arc chroma', fn: (t) => 0.35 + 0.65 * Math.sin(Math.PI * t) },
};

export function buildRamp(baseOklch, opts) {
  const { stops = 16, lMax = 0.95, lMin = 0.28, chromaFactor = 1, profile = 'flat' } = opts;
  const profileFn = (PROFILES[profile] || PROFILES.flat).fn;
  const baseChroma = baseOklch.c * chromaFactor;
  const ramp = [];
  for (let i = 0; i < stops; i++) {
    const t = stops === 1 ? 0 : i / (stops - 1);
    ramp.push({
      l: lMax + (lMin - lMax) * t,
      c: baseChroma * profileFn(t),
      h: baseOklch.h,
      t,
    });
  }
  return ramp;
}

/** per-stop diagnostics for one space + one method */
export function diagnose(ramp, space, method) {
  const rows = ramp.map((stop, i) => {
    const fits = inGamut(stop, space);
    const res = resolve(stop, space, method);
    return {
      i,
      intended: stop,
      fits,
      resolved: res.oklch,
      encoded: res.encoded,
      hexSRGB: hexFromOKLCH(res.oklch),
      dE: deltaEOK(res.oklch, stop),
      dH: hueDelta(res.oklch, stop),
      dL: res.oklch.l - stop.l,
    };
  });
  const outRows = rows.filter((r) => !r.fits);
  const hexes = new Set(rows.map((r) => r.hexSRGB));

  // What actually breaks a ramp: neighbouring stops that stop being neighbours.
  let minAdjacentDE = Infinity, collapsedPairs = 0, inversions = 0;
  for (let i = 1; i < rows.length; i++) {
    const d = deltaEOK(rows[i].resolved, rows[i - 1].resolved);
    minAdjacentDE = Math.min(minAdjacentDE, d);
    if (d < 0.01) collapsedPairs++;
    // intended ramps run light → dark; a resolved pair that reverses order is a
    // visual kink in the ramp
    const intendedDir = Math.sign(rows[i].intended.l - rows[i - 1].intended.l);
    const resolvedDir = Math.sign(rows[i].resolved.l - rows[i - 1].resolved.l);
    if (intendedDir !== 0 && resolvedDir !== 0 && intendedDir !== resolvedDir) inversions++;
  }

  return {
    rows,
    space,
    method,
    stops: rows.length,
    outOfGamut: outRows.length,
    maxDE: rows.reduce((m, r) => Math.max(m, r.dE), 0),
    maxDEOut: outRows.reduce((m, r) => Math.max(m, r.dE), 0),
    maxDH: rows.reduce((m, r) => Math.max(m, Math.abs(r.dH)), 0),
    maxDL: rows.reduce((m, r) => Math.max(m, Math.abs(r.dL)), 0),
    distinct: hexes.size,
    lostStops: rows.length - hexes.size,
    minAdjacentDE: Number.isFinite(minAdjacentDE) ? minAdjacentDE : 0,
    collapsedPairs,
    inversions,
  };
}

/* ---------- self-test ---------- */

export function selfTest() {
  const hexes = ['#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff', '#3b82f6',
    '#e6318e', '#ff5526', '#b7eb52', '#4a376c', '#f7f4e7', '#00c2ff'];
  let maxRT = 0, maxP3 = 0, worst = '';
  for (const hex of hexes) {
    const lin = linRGBFromHex(hex);
    const back = hexFromLinRGB(lin);
    const rt = parseInt(back.slice(1), 16) ^ parseInt(hex.slice(1), 16);
    const byteDelta = [16, 8, 0].reduce((m, sh) => Math.max(m, Math.abs(((rt >> sh) & 255) -
      (((rt >> sh) & 255) > 127 ? ((rt >> sh) & 255) - 256 : ((rt >> sh) & 255)))), 0);
    const dec = [16, 8, 0].map((sh) => Math.abs(((parseInt(back.slice(1), 16) >> sh) & 255) - ((parseInt(hex.slice(1), 16) >> sh) & 255)));
    const d = Math.max(...dec);
    if (d > maxRT) { maxRT = d; worst = hex; }
    // sRGB → P3 → sRGB round trip through the OKLab pipeline
    const oklch = oklchFromLinRGB(lin);
    const p3Enc = toSpaceEncoded(oklch, 'p3');
    const backLin = SPACES.p3.fromSpaceLin(p3Enc.map(srgbDecode));
    const backHex = hexFromLinRGB(backLin);
    const d2 = Math.max(...[16, 8, 0].map((sh) => Math.abs(((parseInt(backHex.slice(1), 16) >> sh) & 255) - ((parseInt(hex.slice(1), 16) >> sh) & 255))));
    if (d2 > maxP3) maxP3 = d2;
  }
  return { maxRoundTripByte: maxRT, worst, maxP3Byte: maxP3, colours: hexes.length };
}

/* ---------- css colour strings ---------- */

export function fmtOKLCH(oklch, digits = 3) {
  const p = (v, d) => Number(v.toFixed(d));
  return `oklch(${p(oklch.l, 4)} ${p(oklch.c, 4)} ${p(oklch.h, 2)})`;
}

export function cssColor(oklch, space) {
  if (space === 'srgb') return hexFromOKLCH(oklch);
  const enc = toSpaceEncoded(oklch, space).map((v) => Number(Math.min(1, Math.max(0, v)).toFixed(4)));
  return `color(${SPACES[space].cssFn} ${enc.join(' ')})`;
}
