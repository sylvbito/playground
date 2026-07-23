import { interpretPreset } from './editor-themes.js?v=compiler-4';

function defaultTheme(variant, contrast) {
  const preset = interpretPreset('codex', variant);
  return Object.freeze({
    accent: preset.accent,
    surface: preset.background,
    ink: preset.foreground,
    contrast,
    fonts: { ui: null, code: null },
    opaqueWindows: false,
    semanticColors: { diffAdded: preset.added, diffRemoved: preset.removed, skill: preset.skill },
  });
}

export const DEFAULT_THEMES = Object.freeze({
  light: defaultTheme('light', 45),
  dark: defaultTheme('dark', 60),
});

export const DEFAULT_SETTINGS = Object.freeze({
  mode: 'system',
  presetId: 'codex',
  lightChromeTheme: DEFAULT_THEMES.light,
  darkChromeTheme: DEFAULT_THEMES.dark,
  sansFontSize: 14,
  codeFontSize: 12,
  diffMarkerStyle: 'color',
  useFontSmoothing: true,
  usePointerCursors: true,
});
