import { DEFAULT_SETTINGS } from './defaults.js?v=compiler-6';
import { normalisePalette, normaliseSettings } from './schema.js?v=compiler-5';
import { VALID_PRESET_IDS, paletteForPreset } from './editor-themes.js?v=compiler-7';

const PREFIX = 'orbit-theme-v2:';
const LEGACY_PREFIX = 'orbit-theme-v1:';
const LEGACY_PRESETS = new Map([
  ['codex-light', 'codex'], ['codex-dark', 'codex'],
  ['raycast-light', 'raycast'], ['github-light', 'github'],
  ['rose-pine-dawn', 'rose-pine'], ['solarized-light', 'solarized'],
  ['gruvbox-light', 'gruvbox'], ['gruvbox-dark', 'gruvbox'],
  ['mint-light', 'mint'], ['high-contrast-light', 'monochrome'],
  ['temple-dark', 'temple'], ['nord-dark', 'nord'],
  ['catppuccin-mocha', 'catppuccin'],
]);

export function exportTheme(settings) {
  const payload = {
    mode: settings.mode,
    presetId: settings.presetId,
    paletteCustom: settings.paletteCustom,
    palette: settings.palette,
    contrast: settings.contrast,
    colourUsage: settings.colourUsage,
    fonts: settings.fonts,
  };
  return `${PREFIX}${JSON.stringify(payload)}`;
}

function parse(value, prefix) {
  try { return JSON.parse(value.slice(prefix.length)); }
  catch { throw new Error('The theme payload is not valid JSON.'); }
}

function importLegacy(parsed) {
  const rawPreset = parsed.codeThemeId || parsed.presetId;
  const presetId = LEGACY_PRESETS.get(rawPreset) || rawPreset;
  if (!VALID_PRESET_IDS.has(presetId)) throw new Error('The theme preset is not registered.');
  const palette = paletteForPreset(presetId);
  const oldTheme = parsed.theme || {};
  if (oldTheme.accent) palette.accent = oldTheme.accent;
  if (oldTheme.semanticColors?.diffAdded) palette.positive = oldTheme.semanticColors.diffAdded;
  if (oldTheme.semanticColors?.diffRemoved) palette.negative = oldTheme.semanticColors.diffRemoved;
  if (oldTheme.semanticColors?.skill) palette.special = oldTheme.semanticColors.skill;
  return {
    mode: ['system', 'light', 'dark'].includes(parsed.mode) ? parsed.mode : parsed.variant || 'system',
    presetId,
    presetVersion: DEFAULT_SETTINGS.presetVersion,
    paletteCustom: true,
    palette: normalisePalette(palette, DEFAULT_SETTINGS.palette),
    contrast: Number.isFinite(Number(oldTheme.contrast)) ? Math.max(0, Math.min(100, Math.round(oldTheme.contrast))) : DEFAULT_SETTINGS.contrast,
    colourUsage: DEFAULT_SETTINGS.colourUsage,
  };
}

export function importTheme(value) {
  if (value.startsWith(LEGACY_PREFIX)) return importLegacy(parse(value, LEGACY_PREFIX));
  if (!value.startsWith(PREFIX)) throw new Error('Expected an orbit-theme-v2 string.');
  const parsed = parse(value, PREFIX);
  const normalised = normaliseSettings(parsed, DEFAULT_SETTINGS, VALID_PRESET_IDS);
  return {
    mode: normalised.mode,
    presetId: normalised.presetId,
    presetVersion: DEFAULT_SETTINGS.presetVersion,
    paletteCustom: Boolean(parsed.paletteCustom),
    palette: normalised.palette,
    contrast: normalised.contrast,
    colourUsage: normalised.colourUsage,
    fonts: normalised.fonts,
  };
}
