import { DEFAULT_SETTINGS } from './theme/defaults.js?v=codex-2';
import { normaliseChromeTheme, normaliseSettings, isHex } from './theme/schema.js?v=codex-2';
import { deriveSemanticTokens, TOKEN_GROUPS } from './theme/derive-tokens.js?v=codex-2';
import { applyAppearance, applyPlatformAppearance } from './theme/apply-css.js?v=codex-2';
import { EDITOR_THEMES, VALID_EDITOR_IDS, chromeThemeForEditor, editorOptions, getEditorTheme } from './theme/editor-themes.js?v=codex-3';
import { getSystemVariant, subscribeSystemVariant } from './theme/system-theme.js';
import { createSettingsStore } from './theme/persistence.js?v=codex-2';
import { exportTheme, importTheme } from './theme/sharing.js?v=codex-2';

const clone = value => structuredClone(value);
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const store = createSettingsStore();
let settings = normaliseSettings(store.read() || clone(DEFAULT_SETTINGS), DEFAULT_SETTINGS, VALID_EDITOR_IDS);
let systemVariant = getSystemVariant();
let persistTimer;

const toast = $('#toast');
const importDialog = $('#importDialog');
const titleCase = value => value[0].toUpperCase() + value.slice(1);
const themeKey = variant => variant === 'dark' ? 'darkChromeTheme' : 'lightChromeTheme';
const codeKey = variant => variant === 'dark' ? 'darkCodeThemeId' : 'lightCodeThemeId';
const resolvedVariant = () => settings.mode === 'system' ? systemVariant : settings.mode;
const editingTheme = () => settings[themeKey(settings.editVariant)];
const activeTheme = () => settings[themeKey(resolvedVariant())];

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
    settings = normaliseSettings(store.confirmed() || clone(DEFAULT_SETTINGS), DEFAULT_SETTINGS, VALID_EDITOR_IDS);
    $('#saveStatus').textContent = 'Persistence failed';
    notify('Could not persist settings');
    render();
  }), 160);
}

function setChip(selector, theme) {
  $$(selector).forEach(chip => { chip.style.background = `linear-gradient(${theme.surface} 50%, ${theme.ink} 50%)`; });
}

function renderControls() {
  const edited = editingTheme();
  const light = settings.lightChromeTheme;
  const dark = settings.darkChromeTheme;
  $$('[data-mode]').forEach(button => button.setAttribute('aria-pressed', button.dataset.mode === settings.mode));
  $$('[data-edit-variant]').forEach(button => button.setAttribute('aria-pressed', button.dataset.editVariant === settings.editVariant));
  $('#resolvedLabel').textContent = `${titleCase(resolvedVariant())} resolved`;
  $('#editingLabel').textContent = `${titleCase(settings.editVariant)} source`;
  $('#lightSummary').textContent = `${light.surface} / ${light.ink}`;
  $('#darkSummary').textContent = `${dark.surface} / ${dark.ink}`;
  $('#lightTabSummary').textContent = `${light.surface} / ${light.ink}`;
  $('#darkTabSummary').textContent = `${dark.surface} / ${dark.ink}`;
  setChip('.light-chip', light);
  setChip('.dark-chip', dark);

  $$('[data-colour]').forEach(input => { input.value = edited[input.dataset.colour]; });
  $$('[data-hex]').forEach(input => { input.value = edited[input.dataset.hex]; });
  $$('[data-semantic-colour]').forEach(input => { input.value = edited.semanticColors[input.dataset.semanticColour]; });
  $$('[data-semantic-hex]').forEach(input => { input.value = edited.semanticColors[input.dataset.semanticHex]; });
  $$('[data-semantic-preview]').forEach(swatch => { swatch.style.background = edited.semanticColors[swatch.dataset.semanticPreview]; });

  const select = $('#editorTheme');
  select.innerHTML = editorOptions(settings.editVariant).map(option => `<option value="${option.id}">${option.name}</option>`).join('');
  select.value = settings[codeKey(settings.editVariant)];
  $('#contrastRange').value = edited.contrast;
  $('#contrastValue').textContent = edited.contrast;
  $('#uiFontSize').value = settings.sansFontSize;
  $('#codeFontSize').value = settings.codeFontSize;
  $('#uiFont').value = edited.fonts.ui || '';
  $('#codeFont').value = edited.fonts.code || '';
  $('#diffMarkerStyle').value = settings.diffMarkerStyle;
  $('#opaqueWindows').checked = edited.opaqueWindows;
  $('#fontSmoothing').checked = settings.useFontSmoothing;
  $('#pointerCursors').checked = settings.usePointerCursors;
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

function renderCode(variant, theme) {
  const strings = $$('#codePreview .syntax-string');
  if (strings[0]) strings[0].textContent = `"${themeKey(variant)}"`;
  if (strings[1]) strings[1].textContent = `"${variant}"`;
  const number = $('#codePreview .syntax-number');
  if (number) number.textContent = theme.contrast;
}

function render() {
  const variant = resolvedVariant();
  const theme = activeTheme();
  const tokens = deriveSemanticTokens(theme, variant);
  const editorId = settings[codeKey(variant)];
  const editorTheme = getEditorTheme(editorId) || getEditorTheme(DEFAULT_SETTINGS[codeKey(variant)]);
  applyPlatformAppearance(document.documentElement, tokens, theme, settings, variant);
  applyAppearance($('#productFrame'), tokens, theme, settings, variant, editorTheme);
  renderControls();
  renderInspector(tokens, theme);
  renderCode(variant, theme);
  $('#previewBadge').textContent = `${titleCase(variant)} chrome`;
  $('#modeGlyph').textContent = variant === 'dark' ? '◐' : '☼';
  $('#editorThemeName').textContent = EDITOR_THEMES.get(editorId)?.name || 'Codex';
  const tokenCount = Object.keys(tokens).filter(key => key.startsWith('--color-')).length;
  $('#tokenCount').textContent = `${tokenCount} semantic tokens`;
  $('#inlineTokenCount').textContent = `${tokenCount} roles`;
  document.title = `${titleCase(variant)} Codex Theme Compiler — Orbit Systems`;
}

function commitAndRender(message) {
  queuePersist();
  render();
  if (message) notify(message);
}

function updateThemeColour(key, value) {
  if (!isHex(value)) return false;
  editingTheme()[key] = value.toUpperCase();
  commitAndRender();
  return true;
}

function updateSemanticColour(key, value) {
  if (!isHex(value)) return false;
  editingTheme().semanticColors[key] = value.toUpperCase();
  commitAndRender();
  return true;
}

$$('[data-mode]').forEach(button => button.addEventListener('click', () => {
  settings.mode = button.dataset.mode;
  commitAndRender();
}));

$$('[data-edit-variant]').forEach(button => button.addEventListener('click', () => {
  settings.editVariant = button.dataset.editVariant;
  commitAndRender();
}));

$$('[data-colour]').forEach(input => input.addEventListener('input', event => updateThemeColour(event.currentTarget.dataset.colour, event.currentTarget.value)));
$$('[data-semantic-colour]').forEach(input => input.addEventListener('input', event => updateSemanticColour(event.currentTarget.dataset.semanticColour, event.currentTarget.value)));

function bindHex(selector, updater, dataKey) {
  $$(selector).forEach(input => {
    input.addEventListener('change', event => {
      if (!updater(event.currentTarget.dataset[dataKey], event.currentTarget.value)) {
        event.currentTarget.setAttribute('aria-invalid', 'true');
        notify('Use a six-digit hex colour');
        renderControls();
      } else event.currentTarget.removeAttribute('aria-invalid');
    });
    input.addEventListener('keydown', event => { if (event.key === 'Enter') event.currentTarget.blur(); });
  });
}
bindHex('[data-hex]', updateThemeColour, 'hex');
bindHex('[data-semantic-hex]', updateSemanticColour, 'semanticHex');

$('#contrastRange').addEventListener('input', event => {
  editingTheme().contrast = Number(event.currentTarget.value);
  commitAndRender();
});

$('#editorTheme').addEventListener('change', event => {
  const id = event.currentTarget.value;
  const seed = chromeThemeForEditor(id);
  if (!seed) return notify('Theme registration is unavailable');
  settings[codeKey(settings.editVariant)] = id;
  const current = editingTheme();
  settings[themeKey(settings.editVariant)] = normaliseChromeTheme({
    ...current,
    ...seed,
    fonts: current.fonts,
    opaqueWindows: current.opaqueWindows,
    semanticColors: { ...current.semanticColors, ...seed.semanticColors },
  }, current);
  commitAndRender(`${EDITOR_THEMES.get(id).name} applied`);
});

$('#uiFontSize').addEventListener('change', event => { settings.sansFontSize = Number(event.currentTarget.value); commitAndRender(); });
$('#codeFontSize').addEventListener('change', event => { settings.codeFontSize = Number(event.currentTarget.value); commitAndRender(); });
$('#uiFont').addEventListener('change', event => { editingTheme().fonts.ui = event.currentTarget.value.trim() || null; commitAndRender(); });
$('#codeFont').addEventListener('change', event => { editingTheme().fonts.code = event.currentTarget.value.trim() || null; commitAndRender(); });
$('#diffMarkerStyle').addEventListener('change', event => { settings.diffMarkerStyle = event.currentTarget.value; commitAndRender(); });
$('#opaqueWindows').addEventListener('change', event => { editingTheme().opaqueWindows = event.currentTarget.checked; commitAndRender(); });
$('#fontSmoothing').addEventListener('change', event => { settings.useFontSmoothing = event.currentTarget.checked; commitAndRender(); });
$('#pointerCursors').addEventListener('change', event => { settings.usePointerCursors = event.currentTarget.checked; commitAndRender(); });

$('#shareTheme').addEventListener('click', async () => {
  const value = exportTheme(settings, settings.editVariant);
  try { await navigator.clipboard.writeText(value); notify(`${titleCase(settings.editVariant)} theme copied`); }
  catch { notify('Copy blocked by browser'); }
});

$('#importTheme').addEventListener('click', () => {
  $('#importValue').value = '';
  $('#importError').textContent = '';
  importDialog.showModal();
});

$('#confirmImport').addEventListener('click', () => {
  try {
    const imported = importTheme($('#importValue').value.trim(), DEFAULT_SETTINGS, VALID_EDITOR_IDS);
    settings[themeKey(imported.variant)] = imported.theme;
    settings[codeKey(imported.variant)] = imported.codeThemeId;
    settings.editVariant = imported.variant;
    commitAndRender(`${titleCase(imported.variant)} theme imported`);
    importDialog.close();
  } catch (error) { $('#importError').textContent = error.message; }
});

$('#resetTheme').addEventListener('click', () => {
  store.clear();
  settings = normaliseSettings(clone(DEFAULT_SETTINGS), DEFAULT_SETTINGS, VALID_EDITOR_IDS);
  commitAndRender('Appearance reset');
});

$('#copyCss').addEventListener('click', async () => {
  const variant = resolvedVariant();
  const tokens = deriveSemanticTokens(activeTheme(), variant);
  const css = `:root {\n${Object.entries(tokens).filter(([key]) => key.startsWith('--color-')).map(([key, value]) => `  ${key}: ${value};`).join('\n')}\n}`;
  try { await navigator.clipboard.writeText(css); notify('Semantic CSS copied'); }
  catch { notify('Copy blocked by browser'); }
});

$('#tokenList').addEventListener('click', async event => {
  const button = event.target.closest('[data-token]');
  if (!button) return;
  try { await navigator.clipboard.writeText(button.dataset.token); notify(`${button.dataset.token} copied`); }
  catch { notify(button.dataset.token); }
});

subscribeSystemVariant(variant => {
  systemVariant = variant;
  if (settings.mode === 'system') render();
});

render();
