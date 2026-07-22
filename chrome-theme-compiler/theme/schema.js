const HEX = /^#[0-9A-F]{6}$/i;
const MODES = new Set(['system', 'light', 'dark']);
const MARKERS = new Set(['color', 'symbols']);

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

export function normaliseTheme(source = {}, fallback) {
  const semantic = source.semanticColors || {};
  return {
    accent: normaliseHex(source.accent, fallback.accent),
    surface: normaliseHex(source.surface, fallback.surface),
    ink: normaliseHex(source.ink, fallback.ink),
    contrast: integer(source.contrast, fallback.contrast, 0, 100),
    fonts: {
      ui: nullableFont(source.fonts?.ui),
      code: nullableFont(source.fonts?.code),
    },
    opaqueWindows: Boolean(source.opaqueWindows),
    semanticColors: {
      diffAdded: normaliseHex(semantic.diffAdded, fallback.semanticColors.diffAdded),
      diffRemoved: normaliseHex(semantic.diffRemoved, fallback.semanticColors.diffRemoved),
      skill: normaliseHex(semantic.skill, fallback.semanticColors.skill),
    },
  };
}

export function normaliseSettings(source = {}, defaults, validEditorIds) {
  const editor = value => validEditorIds.has(value) ? value : null;
  return {
    mode: MODES.has(source.mode) ? source.mode : defaults.mode,
    lightChromeTheme: normaliseTheme(source.lightChromeTheme, defaults.lightChromeTheme),
    darkChromeTheme: normaliseTheme(source.darkChromeTheme, defaults.darkChromeTheme),
    lightCodeThemeId: editor(source.lightCodeThemeId) || defaults.lightCodeThemeId,
    darkCodeThemeId: editor(source.darkCodeThemeId) || defaults.darkCodeThemeId,
    sansFontSize: integer(source.sansFontSize, defaults.sansFontSize, 11, 20),
    codeFontSize: integer(source.codeFontSize, defaults.codeFontSize, 10, 20),
    diffMarkerStyle: MARKERS.has(source.diffMarkerStyle) ? source.diffMarkerStyle : defaults.diffMarkerStyle,
    useFontSmoothing: source.useFontSmoothing !== false,
    usePointerCursors: source.usePointerCursors !== false,
  };
}

export function isHex(value) { return HEX.test(value); }
