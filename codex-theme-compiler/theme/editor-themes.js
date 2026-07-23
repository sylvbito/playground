const themes = [
  {
    id: 'codex-light', name: 'Codex Light', variant: 'light',
    background: '#FFFFFF', foreground: '#1A1C1F', accent: '#339CFF',
    added: '#00A240', removed: '#BA2623', skill: '#924FF7', keyword: '#7C3AED', string: '#087E3E', number: '#A54800',
    chromeSeed: { accent: '#339CFF', surface: '#FFFFFF', ink: '#1A1C1F', contrast: 45, semanticColors: { diffAdded: '#00A240', diffRemoved: '#BA2623', skill: '#924FF7' } },
  },
  {
    id: 'github-light', name: 'GitHub Light', variant: 'light',
    background: '#FFFFFF', foreground: '#24292F', accent: '#0969DA',
    added: '#1A7F37', removed: '#CF222E', skill: '#8250DF', keyword: '#CF222E', string: '#0A3069', number: '#953800',
    chromeSeed: { accent: '#0969DA', surface: '#FFFFFF', ink: '#24292F', contrast: 50, semanticColors: { diffAdded: '#1A7F37', diffRemoved: '#CF222E', skill: '#8250DF' } },
  },
  {
    id: 'solarized-light', name: 'Solarized Light', variant: 'light',
    background: '#FDF6E3', foreground: '#586E75', accent: '#268BD2',
    added: '#859900', removed: '#DC322F', skill: '#6C71C4', keyword: '#859900', string: '#2AA198', number: '#CB4B16',
    chromeSeed: { accent: '#268BD2', surface: '#FDF6E3', ink: '#586E75', contrast: 54, semanticColors: { diffAdded: '#6D7900', diffRemoved: '#C62F2B', skill: '#6C71C4' } },
  },
  {
    id: 'rose-pine-dawn', name: 'Rosé Pine Dawn', variant: 'light',
    background: '#FAF4ED', foreground: '#575279', accent: '#D7827E',
    added: '#286983', removed: '#B4637A', skill: '#907AA9', keyword: '#907AA9', string: '#56949F', number: '#EA9D34',
    chromeSeed: { accent: '#D7827E', surface: '#FAF4ED', ink: '#575279', contrast: 48, semanticColors: { diffAdded: '#286983', diffRemoved: '#B4637A', skill: '#907AA9' } },
  },
  {
    id: 'codex-dark', name: 'Codex Dark', variant: 'dark',
    background: '#181818', foreground: '#FFFFFF', accent: '#339CFF',
    added: '#40C977', removed: '#FA423E', skill: '#AD7BF9', keyword: '#C792EA', string: '#A5D6A7', number: '#F6C177',
    chromeSeed: { accent: '#339CFF', surface: '#181818', ink: '#FFFFFF', contrast: 60, semanticColors: { diffAdded: '#40C977', diffRemoved: '#FA423E', skill: '#AD7BF9' } },
  },
  {
    id: 'dracula', name: 'Dracula', variant: 'dark',
    background: '#282A36', foreground: '#F8F8F2', accent: '#BD93F9',
    added: '#50FA7B', removed: '#FF5555', skill: '#FF79C6', keyword: '#FF79C6', string: '#F1FA8C', number: '#BD93F9',
    chromeSeed: { accent: '#BD93F9', surface: '#282A36', ink: '#F8F8F2', contrast: 62, semanticColors: { diffAdded: '#50FA7B', diffRemoved: '#FF5555', skill: '#FF79C6' } },
  },
  {
    id: 'nord', name: 'Nord', variant: 'dark',
    background: '#2E3440', foreground: '#D8DEE9', accent: '#88C0D0',
    added: '#A3BE8C', removed: '#BF616A', skill: '#B48EAD', keyword: '#81A1C1', string: '#A3BE8C', number: '#B48EAD',
    chromeSeed: { accent: '#88C0D0', surface: '#2E3440', ink: '#D8DEE9', contrast: 58, semanticColors: { diffAdded: '#A3BE8C', diffRemoved: '#BF616A', skill: '#B48EAD' } },
  },
  {
    id: 'tokyo-night', name: 'Tokyo Night', variant: 'dark',
    background: '#1A1B26', foreground: '#C0CAF5', accent: '#7AA2F7',
    added: '#9ECE6A', removed: '#F7768E', skill: '#BB9AF7', keyword: '#BB9AF7', string: '#9ECE6A', number: '#FF9E64',
    chromeSeed: { accent: '#7AA2F7', surface: '#1A1B26', ink: '#C0CAF5', contrast: 64, semanticColors: { diffAdded: '#9ECE6A', diffRemoved: '#F7768E', skill: '#BB9AF7' } },
  },
  {
    id: 'catppuccin-mocha', name: 'Catppuccin Mocha', variant: 'dark',
    background: '#1E1E2E', foreground: '#CDD6F4', accent: '#89B4FA',
    added: '#A6E3A1', removed: '#F38BA8', skill: '#CBA6F7', keyword: '#CBA6F7', string: '#A6E3A1', number: '#FAB387',
    chromeSeed: { accent: '#89B4FA', surface: '#1E1E2E', ink: '#CDD6F4', contrast: 63, semanticColors: { diffAdded: '#A6E3A1', diffRemoved: '#F38BA8', skill: '#CBA6F7' } },
  },
];

const registry = new Map(themes.map(theme => [theme.id, Object.freeze(theme)]));
const clone = value => structuredClone(value);

export function editorOptions(variant) {
  return themes.filter(theme => theme.variant === variant).map(({ id, name }) => ({ id, name }));
}

export function getEditorTheme(id) {
  const theme = registry.get(id);
  return theme ? clone(theme) : null;
}

export function loadChromeThemeSeed(id) {
  const theme = registry.get(id);
  return theme ? clone(theme.chromeSeed) : null;
}

export const VALID_EDITOR_IDS = new Set(registry.keys());
export const EDITOR_THEMES = registry;
