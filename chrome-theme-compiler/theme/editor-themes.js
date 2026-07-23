const themes = [
  // Light palettes
  { id: 'codex-light', variant: 'light', name: 'Codex Light', background: '#FFFFFF', foreground: '#1A1C1F', accent: '#339CFF', added: '#00A240', removed: '#BA2623', skill: '#924FF7', keyword: '#7C3AED', string: '#087E54', number: '#B45309' },
  { id: 'raycast-light', variant: 'light', name: 'Raycast Light', background: '#FFFFFF', foreground: '#1F1F1F', accent: '#FF6363', added: '#2D9D78', removed: '#E5484D', skill: '#8E4EC6', keyword: '#D13415', string: '#0E7C66', number: '#C25100' },
  { id: 'github-light', variant: 'light', name: 'GitHub Light', background: '#FFFFFF', foreground: '#24292F', accent: '#0969DA', added: '#1A7F37', removed: '#CF222E', skill: '#8250DF', keyword: '#CF222E', string: '#0A3069', number: '#0550AE' },
  { id: 'rose-pine-dawn', variant: 'light', name: 'Rosé Pine Dawn', background: '#FAF4ED', foreground: '#575279', accent: '#D7827E', added: '#286983', removed: '#B4637A', skill: '#907AA9', keyword: '#B4637A', string: '#286983', number: '#D7827E' },
  { id: 'solarized-light', variant: 'light', name: 'Solarized Light', background: '#FDF6E3', foreground: '#586E75', accent: '#268BD2', added: '#859900', removed: '#DC322F', skill: '#6C71C4', keyword: '#859900', string: '#2AA198', number: '#D33682' },
  { id: 'gruvbox-light', variant: 'light', name: 'Gruvbox Light', background: '#FBF1C7', foreground: '#3C3836', accent: '#D79921', added: '#79740E', removed: '#9D0006', skill: '#8F3F71', keyword: '#9D0006', string: '#79740E', number: '#AF3A03' },
  { id: 'mint-light', variant: 'light', name: 'Mint Light', background: '#F3FBF7', foreground: '#17352B', accent: '#0A8F68', added: '#178A52', removed: '#C53D4A', skill: '#7656C5', keyword: '#7656C5', string: '#08775B', number: '#A84F17' },
  { id: 'high-contrast-light', variant: 'light', name: 'High Contrast Light', background: '#FFFFFF', foreground: '#000000', accent: '#005FCC', added: '#007A38', removed: '#C40024', skill: '#5A21B6', keyword: '#5A21B6', string: '#006B4F', number: '#A33A00' },

  // Dark palettes
  { id: 'codex-dark', variant: 'dark', name: 'Codex Dark', background: '#181818', foreground: '#FFFFFF', accent: '#339CFF', added: '#40C977', removed: '#FA423E', skill: '#AD7BF9', keyword: '#C084FC', string: '#6EE7B7', number: '#FDBA74' },
  { id: 'temple', variant: 'dark', name: 'Temple', background: '#02120C', foreground: '#C7E6DA', accent: '#E4F222', added: '#40C977', removed: '#FA5B55', skill: '#AD7BF9', keyword: '#E4F222', string: '#7DD3A7', number: '#FF9F66' },
  { id: 'nord', variant: 'dark', name: 'Nord', background: '#2E3440', foreground: '#D8DEE9', accent: '#88C0D0', added: '#A3BE8C', removed: '#BF616A', skill: '#B48EAD', keyword: '#81A1C1', string: '#A3BE8C', number: '#B48EAD' },
  { id: 'tokyo-night', variant: 'dark', name: 'Tokyo Night', background: '#1A1B26', foreground: '#C0CAF5', accent: '#7AA2F7', added: '#9ECE6A', removed: '#F7768E', skill: '#BB9AF7', keyword: '#BB9AF7', string: '#9ECE6A', number: '#FF9E64' },
  { id: 'dracula', variant: 'dark', name: 'Dracula', background: '#282A36', foreground: '#F8F8F2', accent: '#8BE9FD', added: '#50FA7B', removed: '#FF5555', skill: '#BD93F9', keyword: '#FF79C6', string: '#F1FA8C', number: '#BD93F9' },
  { id: 'catppuccin-mocha', variant: 'dark', name: 'Catppuccin Mocha', background: '#1E1E2E', foreground: '#CDD6F4', accent: '#89B4FA', added: '#A6E3A1', removed: '#F38BA8', skill: '#CBA6F7', keyword: '#CBA6F7', string: '#A6E3A1', number: '#FAB387' },
  { id: 'gruvbox-dark', variant: 'dark', name: 'Gruvbox Dark', background: '#282828', foreground: '#EBDBB2', accent: '#FABD2F', added: '#B8BB26', removed: '#FB4934', skill: '#D3869B', keyword: '#FB4934', string: '#B8BB26', number: '#FE8019' },
  { id: 'monokai', variant: 'dark', name: 'Monokai', background: '#272822', foreground: '#F8F8F2', accent: '#66D9EF', added: '#A6E22E', removed: '#F92672', skill: '#AE81FF', keyword: '#F92672', string: '#E6DB74', number: '#AE81FF' },
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
