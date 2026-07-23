import { isHex } from './color.js?v=codex-2';

const MODES = new Set(['system', 'light', 'dark']);
const VARIANTS = new Set(['light', 'dark']);
const MARKERS = new Set(['color', 'symbols']);
const clampInteger = (value, fallback, min, max) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(min, Math.min(max, Math.round(number))) : fallback;
};
const hex = (value, fallback) => isHex(value) ? value.toUpperCase() : fallback;
const font = value => typeof value === 'string' && value.trim() ? value.trim() : null;

export const SETTING_SCHEMA = Object.freeze({
  mode: { default: 'system', description: 'Resolve appearance from system, light or dark.', persistenceKey: 'mode', access: 'user' },
  editVariant: { default: 'light', description: 'Choose which authored palette the form mutates.', persistenceKey: 'editVariant', access: 'user' },
  lightChromeTheme: { description: 'Authored light chrome primitives.', persistenceKey: 'lightChromeTheme', access: 'user' },
  darkChromeTheme: { description: 'Authored dark chrome primitives.', persistenceKey: 'darkChromeTheme', access: 'user' },
  lightCodeThemeId: { description: 'Independent light editor registration.', persistenceKey: 'lightCodeThemeId', access: 'user' },
  darkCodeThemeId: { description: 'Independent dark editor registration.', persistenceKey: 'darkCodeThemeId', access: 'user' },
  sansFontSize: { default: 14, description: 'UI font size.', persistenceKey: 'sansFontSize', access: 'user' },
  codeFontSize: { default: 12, description: 'Editor font size.', persistenceKey: 'codeFontSize', access: 'user' },
  diffMarkerStyle: { default: 'color', description: 'Colour or symbol diff markers.', persistenceKey: 'diffMarkerStyle', access: 'user' },
  useFontSmoothing: { default: true, description: 'Apply antialiased font smoothing.', persistenceKey: 'useFontSmoothing', access: 'user' },
  usePointerCursors: { default: false, description: 'Use pointer cursors for interactive controls.', persistenceKey: 'usePointerCursors', access: 'user' },
});

export function normaliseChromeTheme(source = {}, fallback) {
  const semantics = source.semanticColors || {};
  return {
    accent: hex(source.accent, fallback.accent),
    surface: hex(source.surface, fallback.surface),
    ink: hex(source.ink, fallback.ink),
    contrast: clampInteger(source.contrast, fallback.contrast, 0, 100),
    fonts: { ui: font(source.fonts?.ui), code: font(source.fonts?.code) },
    opaqueWindows: Boolean(source.opaqueWindows),
    semanticColors: {
      diffAdded: hex(semantics.diffAdded, fallback.semanticColors.diffAdded),
      diffRemoved: hex(semantics.diffRemoved, fallback.semanticColors.diffRemoved),
      skill: hex(semantics.skill, fallback.semanticColors.skill),
    },
  };
}

export function normaliseSettings(source = {}, defaults, validEditorIds) {
  const editorId = (value, fallback) => validEditorIds.has(value) ? value : fallback;
  return {
    mode: MODES.has(source.mode) ? source.mode : defaults.mode,
    editVariant: VARIANTS.has(source.editVariant) ? source.editVariant : defaults.editVariant,
    lightChromeTheme: normaliseChromeTheme(source.lightChromeTheme, defaults.lightChromeTheme),
    darkChromeTheme: normaliseChromeTheme(source.darkChromeTheme, defaults.darkChromeTheme),
    lightCodeThemeId: editorId(source.lightCodeThemeId, defaults.lightCodeThemeId),
    darkCodeThemeId: editorId(source.darkCodeThemeId, defaults.darkCodeThemeId),
    sansFontSize: clampInteger(source.sansFontSize, defaults.sansFontSize, 11, 20),
    codeFontSize: clampInteger(source.codeFontSize, defaults.codeFontSize, 10, 20),
    diffMarkerStyle: MARKERS.has(source.diffMarkerStyle) ? source.diffMarkerStyle : defaults.diffMarkerStyle,
    useFontSmoothing: source.useFontSmoothing !== false,
    usePointerCursors: Boolean(source.usePointerCursors),
  };
}

export { isHex };
