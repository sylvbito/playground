import { rgbToOklch, tone } from './color.js?v=compiler-2';

const families = [
  { id: 'codex', name: 'Codex', seed: '#339CFF', added: '#40C977', removed: '#FA423E', skill: '#AD7BF9', keyword: '#C084FC', string: '#6EE7B7', number: '#FDBA74' },
  { id: 'raycast', name: 'Raycast', seed: '#FF6363', added: '#2D9D78', removed: '#E5484D', skill: '#8E4EC6', keyword: '#D13415', string: '#0E7C66', number: '#C25100' },
  { id: 'github', name: 'GitHub', seed: '#0969DA', added: '#1A7F37', removed: '#CF222E', skill: '#8250DF', keyword: '#CF222E', string: '#0A3069', number: '#0550AE' },
  { id: 'rose-pine', name: 'Rosé Pine', seed: '#D7827E', added: '#286983', removed: '#B4637A', skill: '#907AA9', keyword: '#B4637A', string: '#286983', number: '#EA9D34' },
  { id: 'solarized', name: 'Solarized', seed: '#268BD2', added: '#859900', removed: '#DC322F', skill: '#6C71C4', keyword: '#859900', string: '#2AA198', number: '#D33682' },
  { id: 'gruvbox', name: 'Gruvbox', seed: '#D79921', added: '#79740E', removed: '#9D0006', skill: '#8F3F71', keyword: '#9D0006', string: '#79740E', number: '#AF3A03' },
  { id: 'mint', name: 'Mint', seed: '#0A8F68', added: '#178A52', removed: '#C53D4A', skill: '#7656C5', keyword: '#7656C5', string: '#08775B', number: '#A84F17' },
  { id: 'temple', name: 'Temple', seed: '#E4F222', added: '#40C977', removed: '#FA5B55', skill: '#AD7BF9', keyword: '#E4F222', string: '#7DD3A7', number: '#FF9F66' },
  { id: 'nord', name: 'Nord', seed: '#88C0D0', added: '#A3BE8C', removed: '#BF616A', skill: '#B48EAD', keyword: '#81A1C1', string: '#A3BE8C', number: '#B48EAD' },
  { id: 'tokyo-night', name: 'Tokyo Night', seed: '#7AA2F7', added: '#9ECE6A', removed: '#F7768E', skill: '#BB9AF7', keyword: '#BB9AF7', string: '#9ECE6A', number: '#FF9E64' },
  { id: 'dracula', name: 'Dracula', seed: '#BD93F9', added: '#50FA7B', removed: '#FF5555', skill: '#BD93F9', keyword: '#FF79C6', string: '#F1FA8C', number: '#8BE9FD' },
  { id: 'catppuccin', name: 'Catppuccin', seed: '#89B4FA', added: '#A6E3A1', removed: '#F38BA8', skill: '#CBA6F7', keyword: '#CBA6F7', string: '#A6E3A1', number: '#FAB387' },
  { id: 'monokai', name: 'Monokai', seed: '#F92672', added: '#A6E22E', removed: '#F92672', skill: '#AE81FF', keyword: '#F92672', string: '#E6DB74', number: '#AE81FF' },
  { id: 'monochrome', name: 'Monochrome', seed: '#000000', added: '#007A38', removed: '#C40024', skill: '#5A21B6', keyword: '#333333', string: '#555555', number: '#777777' },
];

const familyMap = new Map(families.map(family => [family.id, Object.freeze(family)]));
const clampSigned = value => Math.max(-1, Math.min(1, value));

function interpretedRole(seed, variant, lightness) {
  return tone(seed, variant === 'dark' ? lightness + 0.31 : lightness, 1.02);
}

export function interpretPreset(id, variant) {
  const family = familyMap.get(id);
  if (!family || !['light', 'dark'].includes(variant)) return null;
  const point = rgbToOklch(family.seed);
  const gravity = clampSigned((point.l - 0.5) * 2) * (point.c < 0.018 ? 1 : 0.28);
  const dark = variant === 'dark';
  const accentLightness = dark ? Math.max(0.68, Math.min(0.86, point.l)) : Math.max(0.46, Math.min(0.56, point.l));
  const background = tone(family.seed, dark ? 0.13 + gravity * 0.09 : 0.985 + gravity * 0.01, dark ? 0.11 : 0.025);
  const foreground = tone(family.seed, dark ? 0.92 - gravity * 0.035 : 0.2 + gravity * 0.035, dark ? 0.1 : 0.14);
  return Object.freeze({
    id: family.id,
    variant,
    name: family.name,
    background,
    foreground,
    accent: tone(family.seed, accentLightness, 1.05),
    added: interpretedRole(family.added, variant, 0.41),
    removed: interpretedRole(family.removed, variant, 0.43),
    skill: interpretedRole(family.skill, variant, 0.44),
    keyword: interpretedRole(family.keyword, variant, 0.43),
    string: interpretedRole(family.string, variant, 0.41),
    number: interpretedRole(family.number, variant, 0.45),
  });
}

export const PRESET_FAMILIES = familyMap;
export const VALID_EDITOR_IDS = new Set(familyMap.keys());

export function editorThemesFor(variant) { return families.map(family => interpretPreset(family.id, variant)); }
export function loadEditorTheme(id, variant) { return Promise.resolve(interpretPreset(id, variant)); }
export function loadChromeThemeSeed(id, variant) {
  const theme = interpretPreset(id, variant);
  if (!theme) return Promise.reject(new Error('Unknown palette preset'));
  return Promise.resolve({ accent: theme.accent, surface: theme.background, ink: theme.foreground, semanticColors: { diffAdded: theme.added, diffRemoved: theme.removed, skill: theme.skill } });
}
