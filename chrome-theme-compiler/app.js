import { DEFAULT_SETTINGS } from './theme/defaults.js';
import { normaliseSettings, isHex } from './theme/schema.js';
import { deriveSemanticTokens, TOKEN_GROUPS } from './theme/derive-tokens.js?v=compiler-2';
import { applyAppearance, applyPlatformAppearance } from './theme/apply-css.js?v=compiler-2';
import { EDITOR_THEMES, VALID_EDITOR_IDS, editorThemesFor, loadChromeThemeSeed, loadEditorTheme } from './theme/editor-themes.js';
import { getSystemVariant, subscribeSystemVariant } from './theme/system-theme.js';
import { createSettingsStore } from './theme/persistence.js';
import { exportTheme, importTheme } from './theme/sharing.js';
import { contrast } from './theme/color.js';

const clone = value => structuredClone(value);
const store = createSettingsStore();
let settings = normaliseSettings(store.read() || clone(DEFAULT_SETTINGS), DEFAULT_SETTINGS, VALID_EDITOR_IDS);
let systemVariant = getSystemVariant();
let editVariant = 'light';
let persistTimer;

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const toast = $('#toast');
const importDialog = $('#importDialog');
const colourPath = key => ['diffAdded', 'diffRemoved', 'skill'].includes(key) ? ['semanticColors', key] : [key];

function themeKey(variant) { return variant === 'dark' ? 'darkChromeTheme' : 'lightChromeTheme'; }
function codeKey(variant) { return variant === 'dark' ? 'darkCodeThemeId' : 'lightCodeThemeId'; }
function currentTheme() { return settings[themeKey(editVariant)]; }
function resolvedVariant() { return settings.mode === 'system' ? systemVariant : settings.mode; }

function setNested(target, path, value) {
  let cursor = target;
  path.slice(0, -1).forEach(key => { cursor = cursor[key]; });
  cursor[path.at(-1)] = value;
}

function notify(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => toast.classList.remove('show'), 1800);
}

function queuePersist() {
  $('#saveStatus').textContent = 'Saving appearance…';
  clearTimeout(persistTimer);
  persistTimer = setTimeout(() => store.write(settings).then(() => {
    $('#saveStatus').textContent = 'Settings confirmed';
  }).catch(() => {
    $('#saveStatus').textContent = 'Persistence failed';
    notify('Could not persist settings');
  }), 180);
}

function renderControls() {
  const theme = currentTheme();
  $$('[data-mode]').forEach(button => button.setAttribute('aria-pressed', button.dataset.mode === settings.mode));
  $$('[data-palette]').forEach(button => button.setAttribute('aria-pressed', button.dataset.palette === editVariant));
  $('#editingLabel').textContent = editVariant[0].toUpperCase() + editVariant.slice(1);
  $('#resolvedLabel').textContent = `${resolvedVariant()[0].toUpperCase() + resolvedVariant().slice(1)} resolved`;
  $('#lightSummary').textContent = `${settings.lightChromeTheme.surface} / ${settings.lightChromeTheme.ink}`;
  $('#darkSummary').textContent = `${settings.darkChromeTheme.surface} / ${settings.darkChromeTheme.ink}`;
  $$('[data-colour]').forEach(input => {
    const path = colourPath(input.dataset.colour);
    const value = path.length === 1 ? theme[path[0]] : theme[path[0]][path[1]];
    input.value = value;
  });
  $$('[data-hex]').forEach(input => {
    const path = colourPath(input.dataset.hex);
    const value = path.length === 1 ? theme[path[0]] : theme[path[0]][path[1]];
    input.value = value;
  });
  $('#contrastRange').value = theme.contrast;
  $('#contrastValue').textContent = theme.contrast;
  $('#uiFontSize').value = settings.sansFontSize;
  $('#codeFontSize').value = settings.codeFontSize;
  $('#uiFont').value = theme.fonts.ui || '';
  $('#codeFont').value = theme.fonts.code || '';
  $('#fontSmoothing').checked = settings.useFontSmoothing;
  $('#pointerCursors').checked = settings.usePointerCursors;

  const select = $('#editorTheme');
  const options = editorThemesFor(editVariant);
  select.innerHTML = options.map(themeOption => `<option value="${themeOption.id}">${themeOption.name}</option>`).join('');
  select.value = settings[codeKey(editVariant)];
}

function renderInspector(tokens, theme) {
  $('#primitiveStrip').innerHTML = [
    ['Surface', theme.surface], ['Ink', theme.ink], ['Accent', theme.accent],
    ['Added', theme.semanticColors.diffAdded], ['Removed', theme.semanticColors.diffRemoved], ['Skill', theme.semanticColors.skill],
  ].map(([label, value]) => `<div style="--swatch:${value}"><i></i><span>${label}<code>${value}</code></span></div>`).join('');

  $('#tokenList').innerHTML = Object.entries(TOKEN_GROUPS).map(([group, names]) => `<section><h3>${group}</h3>${names.map(name => `<button data-token="${name}" title="Copy ${name}"><i style="--swatch:${tokens[name]}"></i><span>${name.replace('--color-', '')}</span><code>${tokens[name]}</code></button>`).join('')}</section>`).join('');
  const primaryRatio = Number(tokens['--theme-contrast-primary']);
  const accentRatio = Number(tokens['--theme-contrast-accent']);
  const target = 4.5 + 2.5 * theme.contrast / 100;
  const targetMet = primaryRatio + 0.005 >= target && accentRatio >= 4.5;
  $('#contrastProof').innerHTML = `<div><span>Primary / surface</span><b>${primaryRatio.toFixed(2)}:1</b><em class="${primaryRatio >= 4.5 ? 'pass' : 'fail'}">${primaryRatio >= 7 ? 'AAA' : primaryRatio >= 4.5 ? 'AA' : 'Fail'}</em></div><div><span>Ink / accent</span><b>${accentRatio.toFixed(2)}:1</b><em class="${accentRatio >= 4.5 ? 'pass' : 'fail'}">${accentRatio >= 7 ? 'AAA' : accentRatio >= 4.5 ? 'AA' : 'Fail'}</em></div>`;
  $('#contrastFooter').classList.toggle('warning', !targetMet);
  $('#contrastFooter b').textContent = targetMet ? 'Target met' : 'Target limited';
  $('#contrastFooter small').textContent = `${target.toFixed(1)}:1 text policy`;
}

async function render() {
  const variant = resolvedVariant();
  const theme = settings[themeKey(variant)];
  const tokens = deriveSemanticTokens(theme, variant);
  const editorTheme = await loadEditorTheme(settings[codeKey(variant)]);
  applyPlatformAppearance(document.documentElement, tokens, theme, settings, variant);
  applyAppearance($('#productFrame'), tokens, theme, settings, variant, editorTheme);
  renderControls();
  renderInspector(tokens, theme);
  $('#previewBadge').textContent = `${variant[0].toUpperCase() + variant.slice(1)} palette`;
  $('#modeGlyph').textContent = variant === 'dark' ? '◐' : '☼';
  $('#editorThemeName').textContent = editorTheme.name;
  $('#codePreview .syntax-string').textContent = `"${theme.surface.toLowerCase()}"`;
  const strings = $$('#codePreview .syntax-string');
  if (strings[1]) strings[1].textContent = `"${theme.accent.toLowerCase()}"`;
  $('#codePreview .syntax-number').textContent = theme.contrast;
  const tokenCount = Object.keys(tokens).filter(key => key.startsWith('--color-')).length;
  $('#tokenCount').textContent = `${tokenCount} semantic tokens`;
  $('#inlineTokenCount').textContent = `${tokenCount} roles`;
  document.documentElement.style.setProperty('--outer-accent', theme.accent);
  document.title = `${variant === 'dark' ? 'Dark' : 'Light'} Theme Compiler — Orbit Systems`;
}

function updateColour(key, value) {
  if (!isHex(value)) return false;
  setNested(currentTheme(), colourPath(key), value.toUpperCase());
  queuePersist();
  render();
  return true;
}

$$('[data-mode]').forEach(button => button.addEventListener('click', () => {
  settings.mode = button.dataset.mode;
  queuePersist(); render();
}));

$$('[data-palette]').forEach(button => button.addEventListener('click', () => {
  editVariant = button.dataset.palette;
  render();
}));

$$('[data-colour]').forEach(input => input.addEventListener('input', event => updateColour(event.currentTarget.dataset.colour, event.currentTarget.value)));
$$('[data-hex]').forEach(input => {
  input.addEventListener('change', event => {
    if (!updateColour(event.currentTarget.dataset.hex, event.currentTarget.value)) {
      event.currentTarget.setAttribute('aria-invalid', 'true');
      notify('Use a six-digit hex colour'); renderControls();
    } else event.currentTarget.removeAttribute('aria-invalid');
  });
  input.addEventListener('keydown', event => { if (event.key === 'Enter') event.currentTarget.blur(); });
});

$('#contrastRange').addEventListener('input', event => {
  currentTheme().contrast = Number(event.currentTarget.value);
  $('#contrastValue').textContent = event.currentTarget.value;
  queuePersist(); render();
});

$('#editorTheme').addEventListener('change', async event => {
  const variant = editVariant;
  const themeId = event.currentTarget.value;
  settings[codeKey(variant)] = themeId;
  const seed = await loadChromeThemeSeed(themeId);
  const theme = settings[themeKey(variant)];
  Object.assign(theme, { accent: seed.accent, surface: seed.surface, ink: seed.ink });
  Object.assign(theme.semanticColors, seed.semanticColors);
  queuePersist(); await render(); notify(`${variant === 'dark' ? 'Dark' : 'Light'} preset applied`);
});

$('#uiFontSize').addEventListener('change', event => { settings.sansFontSize = Number(event.currentTarget.value); queuePersist(); render(); });
$('#codeFontSize').addEventListener('change', event => { settings.codeFontSize = Number(event.currentTarget.value); queuePersist(); render(); });
$('#uiFont').addEventListener('change', event => { currentTheme().fonts.ui = event.currentTarget.value.trim() || null; queuePersist(); render(); });
$('#codeFont').addEventListener('change', event => { currentTheme().fonts.code = event.currentTarget.value.trim() || null; queuePersist(); render(); });
$('#fontSmoothing').addEventListener('change', event => { settings.useFontSmoothing = event.currentTarget.checked; queuePersist(); render(); });
$('#pointerCursors').addEventListener('change', event => { settings.usePointerCursors = event.currentTarget.checked; queuePersist(); render(); });

$('#shareTheme').addEventListener('click', async () => {
  const value = exportTheme(editVariant, settings[codeKey(editVariant)], currentTheme());
  try { await navigator.clipboard.writeText(value); notify('Versioned theme copied'); }
  catch { notify('Copy blocked by browser'); }
});

$('#importTheme').addEventListener('click', () => { $('#importValue').value = ''; $('#importError').textContent = ''; importDialog.showModal(); });
$('#confirmImport').addEventListener('click', async () => {
  try {
    const imported = importTheme($('#importValue').value.trim());
    editVariant = imported.variant;
    settings[themeKey(imported.variant)] = imported.theme;
    settings[codeKey(imported.variant)] = imported.codeThemeId;
    queuePersist(); await render(); importDialog.close(); notify('Theme imported');
  } catch (error) { $('#importError').textContent = error.message; }
});

$('#resetTheme').addEventListener('click', async () => {
  store.clear(); settings = normaliseSettings(clone(DEFAULT_SETTINGS), DEFAULT_SETTINGS, VALID_EDITOR_IDS);
  editVariant = 'light';
  await render(); queuePersist(); notify('Appearance reset');
});

$('#copyCss').addEventListener('click', async () => {
  const variant = resolvedVariant(), theme = settings[themeKey(variant)], tokens = deriveSemanticTokens(theme, variant);
  const css = `:root {\n${Object.entries(tokens).filter(([key]) => key.startsWith('--color-')).map(([key, value]) => `  ${key}: ${value};`).join('\n')}\n}`;
  try { await navigator.clipboard.writeText(css); notify('Semantic CSS copied'); } catch { notify('Copy blocked by browser'); }
});

$('#tokenList').addEventListener('click', async event => {
  const button = event.target.closest('[data-token]'); if (!button) return;
  try { await navigator.clipboard.writeText(button.dataset.token); notify(`${button.dataset.token} copied`); } catch { notify(button.dataset.token); }
});

subscribeSystemVariant(variant => {
  systemVariant = variant;
  if (settings.mode === 'system') render();
});

render();
