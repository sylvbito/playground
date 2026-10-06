const fs = require('fs');
const path = require('path');
const TDA = require(path.join(__dirname, 'engine.js'));

function audit(name, raw, opts) {
  const ex = TDA.extractCSS(raw);
  const t0 = Date.now();
  let m, a;
  try {
    m = TDA.parse(ex.css, opts || {});
    a = TDA.analyse(m, opts || {});
  } catch (e) {
    console.log('!! CRASH on ' + name + ': ' + e.message + '\n' + e.stack.split('\n')[1]);
    return null;
  }
  const ms = Date.now() - t0;
  console.log('== ' + name + '  (' + (ex.css.length / 1024).toFixed(0) + 'KB, ' + ms + 'ms)');
  console.log('   decls ' + m.declarations + ' | colours ' + a.colours.entries.length + ' -> '
    + a.colours.clusters.length + ' tokens | score ' + a.score.overall + ' ' + a.score.band.label);
  a.score.axes.forEach(function (x) { console.log('     ' + x.name.padEnd(15) + String(x.score).padStart(3) + '  ' + x.detail); });
  console.log('   grid ' + a.spacing.grid + a.spacing.unit + ' @ ' + (a.spacing.gridFit * 100).toFixed(0) + '% | ' + a.spacing.distinct.length
    + ' space values | ' + a.type.distinct.length + ' type sizes | ' + a.misc.radii.length + ' radii | '
    + a.misc.shadows.length + ' shadows | ' + a.stats.important + ' !important');
  console.log('   tokens: ' + a.colours.clusters.slice(0, 6).map(function (c) {
    return c.token + '=' + TDA.toCss(c.canonical.rgb) + '×' + c.total;
  }).join('  '));
  /* invariant: the generated sheet must never declare the same custom property twice */
  const names = (a.tokens.css.match(/^\s*(--[a-zA-Z0-9_-]+)\s*:/gm) || []).map(function (s) {
    return s.trim().replace(/\s*:$/, '');
  });
  const dupes = names.filter(function (n, i) { return names.indexOf(n) !== i; });
  if (dupes.length) console.log('   !! DUPLICATE TOKEN NAMES: ' + Array.from(new Set(dupes)).join(', '));
  else console.log('   token names unique (' + names.length + ' declared)');
  a.findings.slice(0, 3).forEach(function (f) { console.log('   [' + f.level + '] ' + f.title); });
  return a;
}

const ROOT = path.resolve(__dirname, '..', '..');   // ~/projects
const skip = function (label) { console.log('-- skipped ' + label + ' (not present on this machine)'); };

/* 1. a real Webflow export */
const wfDir = path.join(ROOT, 'beaubnana-snapshot', 'css');
if (fs.existsSync(wfDir)) {
  const wfFiles = fs.readdirSync(wfDir).filter(function (f) { return /\.css$/.test(f); });
  audit('Real Webflow export — beaubnana (' + wfFiles.length + ' files)',
    wfFiles.map(function (f) { return fs.readFileSync(path.join(wfDir, f), 'utf8'); }).join('\n\n'));
} else skip('beaubnana-snapshot Webflow export');

/* 2. real project source CSS */
['just-plaster/src/styles/tokens.css', 'just-plaster/src/styles/theme.css'].forEach(function (p) {
  const full = path.join(ROOT, p);
  if (fs.existsSync(full)) audit('real project — ' + p, fs.readFileSync(full, 'utf8'));
});

/* 3. this repo's own generated index.html */
audit('playground index.html (generated, full HTML)', fs.readFileSync(path.join(ROOT, 'playground', 'index.html'), 'utf8'));

/* 4. this tool's own stylesheet */
audit('token-debt-audit/styles.css (self-audit)', fs.readFileSync(path.join(__dirname, 'styles.css'), 'utf8'));

/* determinism + no-crash sweep over every playground build's HTML */
let crashes = 0, tested = 0;
const pg = path.join(ROOT, 'playground');
fs.readdirSync(pg).forEach(function (d) {
  const f = path.join(pg, d, 'index.html');
  if (!fs.existsSync(f)) return;
  tested++;
  try {
    const ex = TDA.extractCSS(fs.readFileSync(f, 'utf8'));
    if (ex.css.length > 2000) TDA.analyse(TDA.parse(ex.css, {}), {});
  } catch (e) { crashes++; console.log('!! CRASH ' + d + ': ' + e.message); }
});
console.log('sweep: ' + tested + ' real in-repo HTML files, ' + crashes + ' crashes');

const s1 = JSON.stringify(TDA.analyse(TDA.parse(TDA.SAMPLE), { threshold: 3 }).colours.clusters.map(function (c) { return c.token; }));
const s2 = JSON.stringify(TDA.analyse(TDA.parse(TDA.SAMPLE), { threshold: 3 }).colours.clusters.map(function (c) { return c.token; }));
console.log('deterministic across runs: ' + (s1 === s2));
