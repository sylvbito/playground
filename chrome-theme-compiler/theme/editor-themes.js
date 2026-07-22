const themes = [
  { id: 'codex-light', variant: 'light', name: 'Codex Light', background: '#FFFFFF', foreground: '#1A1C1F', accent: '#339CFF', added: '#00A240', removed: '#BA2623', skill: '#924FF7', keyword: '#7C3AED', string: '#087E54', number: '#B45309' },
  { id: 'github-light', variant: 'light', name: 'GitHub Light', background: '#FFFFFF', foreground: '#24292F', accent: '#0969DA', added: '#1A7F37', removed: '#CF222E', skill: '#8250DF', keyword: '#CF222E', string: '#0A3069', number: '#0550AE' },
  { id: 'solarized-light', variant: 'light', name: 'Solarized Light', background: '#FDF6E3', foreground: '#586E75', accent: '#268BD2', added: '#859900', removed: '#DC322F', skill: '#6C71C4', keyword: '#859900', string: '#2AA198', number: '#D33682' },
  { id: 'codex-dark', variant: 'dark', name: 'Codex Dark', background: '#181818', foreground: '#FFFFFF', accent: '#339CFF', added: '#40C977', removed: '#FA423E', skill: '#AD7BF9', keyword: '#C084FC', string: '#6EE7B7', number: '#FDBA74' },
  { id: 'nord', variant: 'dark', name: 'Nord', background: '#2E3440', foreground: '#D8DEE9', accent: '#88C0D0', added: '#A3BE8C', removed: '#BF616A', skill: '#B48EAD', keyword: '#81A1C1', string: '#A3BE8C', number: '#B48EAD' },
  { id: 'dracula', variant: 'dark', name: 'Dracula', background: '#282A36', foreground: '#F8F8F2', accent: '#8BE9FD', added: '#50FA7B', removed: '#FF5555', skill: '#BD93F9', keyword: '#FF79C6', string: '#F1FA8C', number: '#BD93F9' },
];

export const EDITOR_THEMES = new Map(themes.map(theme => [theme.id, Object.freeze(theme)]));
export const VALID_EDITOR_IDS = new Set(EDITOR_THEMES.keys());

export function editorThemesFor(variant) { return themes.filter(theme => theme.variant === variant); }
export function loadEditorTheme(id) { return Promise.resolve(EDITOR_THEMES.get(id)); }
export function loadChromeThemeSeed(id) {
  const theme = EDITOR_THEMES.get(id);
  if (!theme) return Promise.reject(new Error('Unknown editor theme'));
  return Promise.resolve({ accent: theme.accent, surface: theme.background, ink: theme.foreground, semanticColors: { diffAdded: theme.added, diffRemoved: theme.removed, skill: theme.skill } });
}
