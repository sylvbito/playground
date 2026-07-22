export const DEFAULT_THEMES = Object.freeze({
  light: Object.freeze({
    accent: '#339CFF', surface: '#FFFFFF', ink: '#1A1C1F', contrast: 45,
    fonts: { ui: null, code: null }, opaqueWindows: false,
    semanticColors: { diffAdded: '#00A240', diffRemoved: '#BA2623', skill: '#924FF7' },
  }),
  dark: Object.freeze({
    accent: '#339CFF', surface: '#181818', ink: '#FFFFFF', contrast: 60,
    fonts: { ui: null, code: null }, opaqueWindows: false,
    semanticColors: { diffAdded: '#40C977', diffRemoved: '#FA423E', skill: '#AD7BF9' },
  }),
});

export const DEFAULT_SETTINGS = Object.freeze({
  mode: 'system',
  lightChromeTheme: DEFAULT_THEMES.light,
  darkChromeTheme: DEFAULT_THEMES.dark,
  lightCodeThemeId: 'codex-light',
  darkCodeThemeId: 'codex-dark',
  sansFontSize: 14,
  codeFontSize: 12,
  diffMarkerStyle: 'color',
  useFontSmoothing: true,
  usePointerCursors: true,
});
