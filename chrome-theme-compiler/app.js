import { DEFAULT_SETTINGS } from './theme/defaults.js?v=compiler-8';
import { normaliseSettings, isHex } from './theme/schema.js?v=compiler-5';
import { deriveSemanticTokens, TOKEN_GROUPS } from './theme/derive-tokens.js?v=compiler-8';
import { applyAppearance, applyPlatformAppearance } from './theme/apply-css.js?v=compiler-4';
import { PRESET_FAMILIES, VALID_PRESET_IDS, compileEditorPalette, compilePalette, paletteForPreset, presetOptions } from './theme/editor-themes.js?v=compiler-9';
import { getSystemVariant, subscribeSystemVariant } from './theme/system-theme.js';
import { createSettingsStore } from './theme/persistence.js';
import { exportTheme, importTheme } from './theme/sharing.js?v=compiler-8';

const clone = value => structuredClone(value);
const store = createSettingsStore();
const storedSettings = store.read();
const needsPresetMigration = Boolean(storedSettings && (!storedSettings.palette || storedSettings.presetVersion !== DEFAULT_SETTINGS.presetVersion));
let settings = normaliseSettings(storedSettings || clone(DEFAULT_SETTINGS), DEFAULT_SETTINGS, VALID_PRESET_IDS);
let systemVariant = getSystemVariant();
let persistTimer;

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const toast = $('#toast');
const importDialog = $('#importDialog');

function resolvedVariant() { return settings.mode === 'system' ? systemVariant : settings.mode; }
function compiled(variant) { return compilePalette(settings.palette, variant, settings.contrast, settings.colourUsage, settings.fonts); }
function editorCompiled(variant) { return compileEditorPalette(settings.palette, variant, settings.contrast, settings.colourUsage, settings.fonts); }

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
  const light = compiled('light');
  const dark = compiled('dark');
  $$('[data-mode]').forEach(button => button.setAttribute('aria-pressed', button.dataset.mode === settings.mode));
  $('#resolvedLabel').textContent = `${resolvedVariant()[0].toUpperCase() + resolvedVariant().slice(1)} resolved`;
  $('#lightSummary').textContent = `${light.surface} / ${light.ink}`;
  $('#darkSummary').textContent = `${dark.surface} / ${dark.ink}`;
  $('.light-chip').style.background = `linear-gradient(${light.surface} 50%, ${light.ink} 50%)`;
  $('.dark-chip').style.background = `linear-gradient(${dark.surface} 50%, ${dark.ink} 50%)`;
  $$('[data-colour]').forEach(input => { input.value = settings.palette[input.dataset.colour]; });
  $$('[data-hex]').forEach(input => { input.value = settings.palette[input.dataset.hex]; });
  $$('[data-palette-preview]').forEach(swatch => { swatch.style.background = settings.palette[swatch.dataset.palettePreview]; });
  $('#contrastRange').value = settings.contrast;
  $('#contrastValue').textContent = settings.contrast;
  $('#colourUsageRange').value = settings.colourUsage;
  $('#colourUsageValue').textContent = settings.colourUsage;
  $('#uiFontSize').value = settings.sansFontSize;
  $('#codeFontSize').value = settings.codeFontSize;
  $('#uiFont').value = settings.fonts.ui || '';
  $('#codeFont').value = settings.fonts.code || '';
  $('#fontSmoothing').checked = settings.useFontSmoothing;
  $('#pointerCursors').checked = settings.usePointerCursors;

  const select = $('#editorTheme');
  const options = presetOptions();
  select.innerHTML = options.map(option => `<option value="${option.id}">${option.name}</option>`).join('');
  if (settings.paletteCustom) {
    const baseName = PRESET_FAMILIES.get(settings.presetId)?.name || 'preset';
    select.insertAdjacentHTML('beforeend', `<option value="custom" disabled>Custom · ${baseName}</option>`);
    select.value = 'custom';
  } else select.value = settings.presetId;
}

function renderInspector(tokens, theme) {
  $('#primitiveStrip').innerHTML = [
    ['Surface', theme.surface], ['Ink', theme.ink], ['Accent', theme.accent],
    ['Positive', theme.semanticColors.diffAdded], ['Negative', theme.semanticColors.diffRemoved], ['Special', theme.semanticColors.skill],
  ].map(([label, value]) => `<div style="--swatch:${value}"><i></i><span>${label}<code>${value}</code></span></div>`).join('');

  $('#tokenList').innerHTML = Object.entries(TOKEN_GROUPS).map(([group, names]) => `<section><h3>${group}</h3>${names.map(name => `<button data-token="${name}" title="Copy ${name}"><i style="--swatch:${tokens[name]}"></i><span>${name.replace('--color-', '')}</span><code>${tokens[name]}</code></button>`).join('')}</section>`).join('');
  const primaryRatio = Number(tokens['--theme-contrast-primary']);
  const accentRatio = Number(tokens['--theme-contrast-accent']);
  const target = 4.5 + 2.5 * settings.contrast / 100;
  const targetMet = primaryRatio + 0.005 >= target && accentRatio >= 4.5;
  $('#contrastProof').innerHTML = `<div><span>Primary / surface</span><b>${primaryRatio.toFixed(2)}:1</b><em class="${primaryRatio >= 4.5 ? 'pass' : 'fail'}">${primaryRatio >= 7 ? 'AAA' : primaryRatio >= 4.5 ? 'AA' : 'Fail'}</em></div><div><span>Ink / accent</span><b>${accentRatio.toFixed(2)}:1</b><em class="${accentRatio >= 4.5 ? 'pass' : 'fail'}">${accentRatio >= 7 ? 'AAA' : accentRatio >= 4.5 ? 'AA' : 'Fail'}</em></div>`;
  $('#contrastFooter').classList.toggle('warning', !targetMet);
  $('#contrastFooter b').textContent = targetMet ? 'Target met' : 'Target limited';
  $('#contrastFooter small').textContent = `${target.toFixed(1)}:1 text policy`;
}

async function render() {
  const variant = resolvedVariant();
  const theme = compiled(variant);
  const tokens = deriveSemanticTokens(theme, variant);
  const editorTheme = editorCompiled(variant);
  applyPlatformAppearance(document.documentElement, tokens, theme, settings, variant);
  applyAppearance($('#productFrame'), tokens, theme, settings, variant, editorTheme);
  renderControls();
  renderInspector(tokens, theme);
  $('#previewBadge').textContent = `${variant[0].toUpperCase() + variant.slice(1)} mapping`;
  $('#modeGlyph').textContent = variant === 'dark' ? '◐' : '☼';
  const baseName = PRESET_FAMILIES.get(settings.presetId)?.name || 'Shared';
  $('#editorThemeName').textContent = `${baseName}${settings.paletteCustom ? ' · custom' : ''}`;
  const strings = $$('#codePreview .syntax-string');
  if (strings[0]) strings[0].textContent = `"${variant}"`;
  const numbers = $$('#codePreview .syntax-number');
  if (numbers[0]) numbers[0].textContent = settings.contrast;
  if (numbers[1]) numbers[1].textContent = settings.colourUsage;
  const tokenCount = Object.keys(tokens).filter(key => key.startsWith('--color-')).length;
  $('#tokenCount').textContent = `${tokenCount} semantic tokens`;
  $('#inlineTokenCount').textContent = `${tokenCount} roles`;
  document.documentElement.style.setProperty('--outer-accent', theme.accent);
  document.title = `${variant === 'dark' ? 'Dark' : 'Light'} Theme Compiler — Orbit Systems`;
}

function updateColour(key, value) {
  if (!isHex(value)) return false;
  settings.palette[key] = value.toUpperCase();
  settings.paletteCustom = true;
  queuePersist();
  render();
  return true;
}

function applyPreset(id) {
  const palette = paletteForPreset(id);
  if (!palette) throw new Error('Unknown palette preset');
  settings.presetId = id;
  settings.presetVersion = DEFAULT_SETTINGS.presetVersion;
  settings.paletteCustom = false;
  settings.palette = palette;
}

$$('[data-mode]').forEach(button => button.addEventListener('click', () => {
  settings.mode = button.dataset.mode;
  queuePersist(); render();
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
  settings.contrast = Number(event.currentTarget.value);
  $('#contrastValue').textContent = event.currentTarget.value;
  queuePersist(); render();
});

$('#colourUsageRange').addEventListener('input', event => {
  settings.colourUsage = Number(event.currentTarget.value);
  $('#colourUsageValue').textContent = event.currentTarget.value;
  queuePersist(); render();
});

$('#editorTheme').addEventListener('change', event => {
  if (event.currentTarget.value === 'custom') return;
  applyPreset(event.currentTarget.value);
  queuePersist(); render(); notify('Shared palette loaded');
});

$('#uiFontSize').addEventListener('change', event => { settings.sansFontSize = Number(event.currentTarget.value); queuePersist(); render(); });
$('#codeFontSize').addEventListener('change', event => { settings.codeFontSize = Number(event.currentTarget.value); queuePersist(); render(); });
$('#uiFont').addEventListener('change', event => { settings.fonts.ui = event.currentTarget.value.trim() || null; queuePersist(); render(); });
$('#codeFont').addEventListener('change', event => { settings.fonts.code = event.currentTarget.value.trim() || null; queuePersist(); render(); });
$('#fontSmoothing').addEventListener('change', event => { settings.useFontSmoothing = event.currentTarget.checked; queuePersist(); render(); });
$('#pointerCursors').addEventListener('change', event => { settings.usePointerCursors = event.currentTarget.checked; queuePersist(); render(); });

$('#shareTheme').addEventListener('click', async () => {
  const value = exportTheme(settings);
  try { await navigator.clipboard.writeText(value); notify('Shared palette copied'); }
  catch { notify('Copy blocked by browser'); }
});

$('#importTheme').addEventListener('click', () => { $('#importValue').value = ''; $('#importError').textContent = ''; importDialog.showModal(); });
$('#confirmImport').addEventListener('click', () => {
  try {
    const imported = importTheme($('#importValue').value.trim());
    Object.assign(settings, imported);
    queuePersist(); render(); importDialog.close(); notify('Shared palette imported');
  } catch (error) { $('#importError').textContent = error.message; }
});

$('#resetTheme').addEventListener('click', () => {
  store.clear(); settings = normaliseSettings(clone(DEFAULT_SETTINGS), DEFAULT_SETTINGS, VALID_PRESET_IDS);
  render(); queuePersist(); notify('Appearance reset');
});

$('#copyCss').addEventListener('click', async () => {
  const variant = resolvedVariant(), theme = compiled(variant), tokens = deriveSemanticTokens(theme, variant);
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

if (needsPresetMigration) {
  applyPreset(settings.presetId);
  queuePersist(); render();
} else render();
