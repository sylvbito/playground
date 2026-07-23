import { paletteForPreset } from './editor-themes.js?v=compiler-11';

export const DEFAULT_SETTINGS = Object.freeze({
  mode: 'system',
  presetId: 'codex',
  presetVersion: 3,
  paletteCustom: false,
  palette: Object.freeze(paletteForPreset('codex')),
  contrast: 55,
  colourUsage: 65,
  fonts: Object.freeze({ ui: null, code: null }),
  sansFontSize: 14,
  codeFontSize: 12,
  diffMarkerStyle: 'color',
  useFontSmoothing: true,
  usePointerCursors: true,
});
