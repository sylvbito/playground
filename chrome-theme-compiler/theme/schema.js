const HEX = /^#[0-9A-F]{6}$/i;
const MODES = new Set(['system', 'light', 'dark']);
const MARKERS = new Set(['color', 'symbols']);
const LEGACY_PRESETS = new Map([
  ['codex-light', 'codex'], ['codex-dark', 'codex'],
  ['raycast-light', 'raycast'], ['github-light', 'github'],
  ['rose-pine-dawn', 'rose-pine'], ['solarized-light', 'solarized'],
  ['gruvbox-light', 'gruvbox'], ['gruvbox-dark', 'gruvbox'],
  ['mint-light', 'mint'], ['high-contrast-light', 'monochrome'],
  ['temple-dark', 'temple'], ['nord-dark', 'nord'],
  ['catppuccin-mocha', 'catppuccin'],
]);

export function normaliseHex(value, fallback) {
  return typeof value === 'string' && HEX.test(value) ? value.toUpperCase() : fallback;
}

function integer(value, fallback, min, max) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(min, Math.min(max, Math.round(number))) : fallback;
}

function nullableFont(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
}

export function normalisePalette(source = {}, fallback) {
  return {
    accent: normaliseHex(source.accent, fallback.accent),
    atmosphere: normaliseHex(source.atmosphere, fallback.atmosphere),
    positive: normaliseHex(source.positive, fallback.positive),
    negative: normaliseHex(source.negative, fallback.negative),
    special: normaliseHex(source.special, fallback.special),
  };
}

export function normaliseSettings(source = {}, defaults, validPresetIds) {
  const preset = value => {
    const migrated = LEGACY_PRESETS.get(value) || value;
    return validPresetIds.has(migrated) ? migrated : null;
  };
  const legacyPreset = source.mode === 'dark' ? source.darkCodeThemeId : source.lightCodeThemeId;
  const legacyTheme = source.mode === 'dark' ? source.darkChromeTheme : source.lightChromeTheme;
  return {
    mode: MODES.has(source.mode) ? source.mode : defaults.mode,
    presetId: preset(source.presetId) || preset(legacyPreset) || defaults.presetId,
    presetVersion: defaults.presetVersion,
    paletteCustom: Boolean(source.paletteCustom),
    palette: normalisePalette(source.palette, defaults.palette),
    contrast: integer(source.contrast ?? legacyTheme?.contrast, defaults.contrast, 0, 100),
    colourUsage: integer(source.colourUsage, defaults.colourUsage, 0, 100),
    fonts: {
      ui: nullableFont(source.fonts?.ui ?? legacyTheme?.fonts?.ui),
      code: nullableFont(source.fonts?.code ?? legacyTheme?.fonts?.code),
    },
    sansFontSize: integer(source.sansFontSize, defaults.sansFontSize, 11, 20),
    codeFontSize: integer(source.codeFontSize, defaults.codeFontSize, 10, 20),
    diffMarkerStyle: MARKERS.has(source.diffMarkerStyle) ? source.diffMarkerStyle : defaults.diffMarkerStyle,
    useFontSmoothing: source.useFontSmoothing !== false,
    usePointerCursors: source.usePointerCursors !== false,
  };
}

export function isHex(value) { return HEX.test(value); }
