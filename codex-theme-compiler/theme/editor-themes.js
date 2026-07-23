function defineTheme(id, name, variant, values) {
  const { background, foreground, accent, added, removed, skill, keyword, string, number, contrast } = values;
  return {
    id, name, variant, background, foreground, accent, added, removed, skill, keyword, string, number,
    chromeTheme: {
      accent,
      surface: background,
      ink: foreground,
      contrast,
      semanticColors: { diffAdded: added, diffRemoved: removed, skill },
    },
  };
}

const themes = [
  defineTheme('codex-light', 'Codex Light', 'light', {
    background: '#FFFFFF', foreground: '#1A1C1F', accent: '#339CFF', added: '#00A240', removed: '#BA2623', skill: '#924FF7', keyword: '#7C3AED', string: '#087E3E', number: '#A54800', contrast: 45,
  }),
  defineTheme('github-light', 'GitHub Light', 'light', {
    background: '#FFFFFF', foreground: '#24292F', accent: '#0969DA', added: '#1A7F37', removed: '#CF222E', skill: '#8250DF', keyword: '#CF222E', string: '#0A3069', number: '#953800', contrast: 50,
  }),
  defineTheme('solarized-light', 'Solarized Light', 'light', {
    background: '#FDF6E3', foreground: '#586E75', accent: '#268BD2', added: '#6D7900', removed: '#C62F2B', skill: '#6C71C4', keyword: '#859900', string: '#2AA198', number: '#CB4B16', contrast: 54,
  }),
  defineTheme('rose-pine-dawn', 'Rosé Pine Dawn', 'light', {
    background: '#FAF4ED', foreground: '#575279', accent: '#D7827E', added: '#286983', removed: '#B4637A', skill: '#907AA9', keyword: '#907AA9', string: '#56949F', number: '#EA9D34', contrast: 48,
  }),
  defineTheme('raycast-light', 'Raycast Light', 'light', {
    background: '#FFF8F7', foreground: '#262424', accent: '#FF6363', added: '#1F9D63', removed: '#E5484D', skill: '#8E4EC6', keyword: '#A13D63', string: '#2B8A3E', number: '#D9480F', contrast: 50,
  }),
  defineTheme('catppuccin-latte', 'Catppuccin Latte', 'light', {
    background: '#EFF1F5', foreground: '#4C4F69', accent: '#1E66F5', added: '#40A02B', removed: '#D20F39', skill: '#8839EF', keyword: '#8839EF', string: '#40A02B', number: '#FE640B', contrast: 52,
  }),
  defineTheme('gruvbox-light', 'Gruvbox Light', 'light', {
    background: '#FBF1C7', foreground: '#3C3836', accent: '#D65D0E', added: '#79740E', removed: '#9D0006', skill: '#8F3F71', keyword: '#9D0006', string: '#79740E', number: '#8F3F71', contrast: 54,
  }),
  defineTheme('one-light', 'One Light', 'light', {
    background: '#FAFAFA', foreground: '#383A42', accent: '#4078F2', added: '#50A14F', removed: '#E45649', skill: '#A626A4', keyword: '#A626A4', string: '#50A14F', number: '#986801', contrast: 50,
  }),
  defineTheme('tokyo-night-day', 'Tokyo Night Day', 'light', {
    background: '#E1E2E7', foreground: '#3760BF', accent: '#2E7DE9', added: '#587539', removed: '#F52A65', skill: '#9854F1', keyword: '#9854F1', string: '#587539', number: '#B15C00', contrast: 55,
  }),
  defineTheme('mint-light', 'Mint Light', 'light', {
    background: '#F3FBF7', foreground: '#18392B', accent: '#0F9F6E', added: '#16875D', removed: '#C84646', skill: '#7C5AC7', keyword: '#7C5AC7', string: '#16875D', number: '#B35C00', contrast: 50,
  }),

  defineTheme('codex-dark', 'Codex Dark', 'dark', {
    background: '#181818', foreground: '#FFFFFF', accent: '#339CFF', added: '#40C977', removed: '#FA423E', skill: '#AD7BF9', keyword: '#C792EA', string: '#A5D6A7', number: '#F6C177', contrast: 60,
  }),
  defineTheme('dracula', 'Dracula', 'dark', {
    background: '#282A36', foreground: '#F8F8F2', accent: '#BD93F9', added: '#50FA7B', removed: '#FF5555', skill: '#FF79C6', keyword: '#FF79C6', string: '#F1FA8C', number: '#BD93F9', contrast: 62,
  }),
  defineTheme('nord', 'Nord', 'dark', {
    background: '#2E3440', foreground: '#D8DEE9', accent: '#88C0D0', added: '#A3BE8C', removed: '#BF616A', skill: '#B48EAD', keyword: '#81A1C1', string: '#A3BE8C', number: '#B48EAD', contrast: 58,
  }),
  defineTheme('tokyo-night', 'Tokyo Night', 'dark', {
    background: '#1A1B26', foreground: '#C0CAF5', accent: '#7AA2F7', added: '#9ECE6A', removed: '#F7768E', skill: '#BB9AF7', keyword: '#BB9AF7', string: '#9ECE6A', number: '#FF9E64', contrast: 64,
  }),
  defineTheme('catppuccin-mocha', 'Catppuccin Mocha', 'dark', {
    background: '#1E1E2E', foreground: '#CDD6F4', accent: '#89B4FA', added: '#A6E3A1', removed: '#F38BA8', skill: '#CBA6F7', keyword: '#CBA6F7', string: '#A6E3A1', number: '#FAB387', contrast: 63,
  }),
  defineTheme('github-dark', 'GitHub Dark', 'dark', {
    background: '#0D1117', foreground: '#C9D1D9', accent: '#58A6FF', added: '#3FB950', removed: '#F85149', skill: '#BC8CFF', keyword: '#FF7B72', string: '#A5D6FF', number: '#79C0FF', contrast: 64,
  }),
  defineTheme('solarized-dark', 'Solarized Dark', 'dark', {
    background: '#002B36', foreground: '#93A1A1', accent: '#268BD2', added: '#859900', removed: '#DC322F', skill: '#6C71C4', keyword: '#B58900', string: '#2AA198', number: '#D33682', contrast: 60,
  }),
  defineTheme('gruvbox-dark', 'Gruvbox Dark', 'dark', {
    background: '#282828', foreground: '#EBDBB2', accent: '#FE8019', added: '#B8BB26', removed: '#FB4934', skill: '#D3869B', keyword: '#FB4934', string: '#B8BB26', number: '#D3869B', contrast: 62,
  }),
  defineTheme('monokai', 'Monokai', 'dark', {
    background: '#272822', foreground: '#F8F8F2', accent: '#FD971F', added: '#A6E22E', removed: '#F92672', skill: '#AE81FF', keyword: '#F92672', string: '#E6DB74', number: '#AE81FF', contrast: 63,
  }),
  defineTheme('rose-pine', 'Rosé Pine', 'dark', {
    background: '#191724', foreground: '#E0DEF4', accent: '#EBBCBA', added: '#9CCFD8', removed: '#EB6F92', skill: '#C4A7E7', keyword: '#C4A7E7', string: '#9CCFD8', number: '#F6C177', contrast: 62,
  }),
  defineTheme('temple-dark', 'Temple Dark', 'dark', {
    background: '#02120C', foreground: '#C7E6DA', accent: '#E4F222', added: '#60D394', removed: '#FF5D5D', skill: '#B89CFF', keyword: '#E4F222', string: '#7DD3A7', number: '#FF9F66', contrast: 66,
  }),
  defineTheme('raycast-dark', 'Raycast Dark', 'dark', {
    background: '#1F1F1F', foreground: '#F5F5F5', accent: '#FF6363', added: '#4CC38A', removed: '#FF6369', skill: '#AB4ABA', keyword: '#FF6363', string: '#5BB98C', number: '#F5D90A', contrast: 62,
  }),
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

export function chromeThemeForEditor(id) {
  const theme = registry.get(id);
  return theme ? clone(theme.chromeTheme) : null;
}

export const VALID_EDITOR_IDS = new Set(registry.keys());
export const EDITOR_THEMES = registry;
