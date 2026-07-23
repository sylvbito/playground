import { mix, rgbToOklch, tone } from './color.js?v=compiler-2';

const families = [
  { id: 'codex', name: 'Codex', accent: '#339CFF', atmosphere: '#566D85', positive: '#40C977', negative: '#FA423E', special: '#AD7BF9' },
  { id: 'raycast', name: 'Raycast', accent: '#FF6363', atmosphere: '#FF6363', positive: '#2D9D78', negative: '#E5484D', special: '#8E4EC6' },
  { id: 'github', name: 'GitHub', accent: '#0969DA', atmosphere: '#57606A', positive: '#1A7F37', negative: '#CF222E', special: '#8250DF' },
  { id: 'rose-pine', name: 'Rosé Pine', accent: '#D7827E', atmosphere: '#D7827E', positive: '#286983', negative: '#B4637A', special: '#907AA9' },
  { id: 'solarized', name: 'Solarized', accent: '#268BD2', atmosphere: '#B58900', positive: '#859900', negative: '#DC322F', special: '#6C71C4' },
  { id: 'gruvbox', name: 'Gruvbox', accent: '#D79921', atmosphere: '#D79921', positive: '#79740E', negative: '#9D0006', special: '#8F3F71' },
  { id: 'mint', name: 'Mint', accent: '#0A8F68', atmosphere: '#0A8F68', positive: '#178A52', negative: '#C53D4A', special: '#7656C5' },
  { id: 'temple', name: 'Temple', accent: '#E4F222', atmosphere: '#0C7A55', positive: '#40C977', negative: '#FA5B55', special: '#AD7BF9' },
  { id: 'nord', name: 'Nord', accent: '#88C0D0', atmosphere: '#5E81AC', positive: '#A3BE8C', negative: '#BF616A', special: '#B48EAD' },
  { id: 'tokyo-night', name: 'Tokyo Night', accent: '#7AA2F7', atmosphere: '#565F89', positive: '#9ECE6A', negative: '#F7768E', special: '#BB9AF7' },
  { id: 'dracula', name: 'Dracula', accent: '#BD93F9', atmosphere: '#6272A4', positive: '#50FA7B', negative: '#FF5555', special: '#FF79C6' },
  { id: 'catppuccin', name: 'Catppuccin', accent: '#89B4FA', atmosphere: '#585B70', positive: '#A6E3A1', negative: '#F38BA8', special: '#CBA6F7' },
  { id: 'monokai', name: 'Monokai', accent: '#F92672', atmosphere: '#75715E', positive: '#A6E22E', negative: '#F92672', special: '#AE81FF' },
  { id: 'monochrome', name: 'Monochrome', accent: '#000000', atmosphere: '#000000', positive: '#007A38', negative: '#C40024', special: '#5A21B6' },
];

const familyMap = new Map(families.map(family => [family.id, Object.freeze(family)]));
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const clonePalette = family => ({ accent: family.accent, atmosphere: family.atmosphere, positive: family.positive, negative: family.negative, special: family.special });

function role(seed, variant, lightness) {
  return tone(seed, variant === 'dark' ? lightness + 0.31 : lightness, 1.08);
}

export function compilePalette(palette, variant, contrast = 55, colourUsage = 65, fonts = { ui: null, code: null }) {
  if (!['light', 'dark'].includes(variant)) return null;
  const dark = variant === 'dark';
  const usage = clamp(colourUsage, 0, 100) / 100;
  const injection = usage ** 1.55;
  const strength = clamp(contrast, 0, 100) / 100;
  const atmosphere = rgbToOklch(palette.atmosphere);
  const accent = rgbToOklch(palette.accent);
  const gravity = clamp((atmosphere.l - 0.5) * 2, -1, 1) * (atmosphere.c < 0.018 ? 1 : 0.28);
  const surfaceLightness = dark
    ? 0.145 + usage * 0.075 + gravity * 0.05
    : 0.99 - injection * 0.078 + gravity * (0.012 + injection * 0.02);
  const surfaceChroma = dark ? 0.03 + usage * 0.58 : 0.01 + injection * 0.72;
  const inkLightness = dark ? 0.84 + strength * 0.12 : 0.26 - strength * 0.18;
  const accentLightness = dark
    ? clamp(accent.l, 0.68, 0.9)
    : clamp(accent.l, 0.52, 0.82);
  const derivedAccent = tone(palette.accent, accentLightness, 0.62 + usage * 0.5);
  const atmosphereSurface = tone(palette.atmosphere, surfaceLightness, surfaceChroma);
  const accentWash = tone(palette.accent, 0.92 - injection * 0.055, 0.25 + injection * 0.58);
  const surface = dark ? atmosphereSurface : mix(atmosphereSurface, accentWash, injection * 0.11);
  return {
    accent: derivedAccent,
    surface,
    ink: tone(palette.atmosphere, inkLightness, 0.08 + usage * 0.16),
    contrast: clamp(Math.round(contrast), 0, 100),
    colourUsage: clamp(Math.round(colourUsage), 0, 100),
    fonts: { ui: fonts.ui || null, code: fonts.code || null },
    opaqueWindows: false,
    semanticColors: {
      diffAdded: role(palette.positive, variant, 0.41),
      diffRemoved: role(palette.negative, variant, 0.43),
      skill: role(palette.special, variant, 0.44),
    },
  };
}

export function compileEditorPalette(palette, variant, contrast = 55, colourUsage = 65, fonts) {
  const theme = compilePalette(palette, variant, contrast, colourUsage, fonts);
  return {
    id: 'shared',
    variant,
    name: 'Shared palette',
    background: theme.surface,
    foreground: theme.ink,
    accent: theme.accent,
    added: theme.semanticColors.diffAdded,
    removed: theme.semanticColors.diffRemoved,
    skill: theme.semanticColors.skill,
    keyword: role(palette.special, variant, 0.43),
    string: role(palette.positive, variant, 0.41),
    number: role(mix(palette.accent, palette.negative, 0.42), variant, 0.45),
  };
}

export function paletteForPreset(id) {
  const family = familyMap.get(id);
  return family ? clonePalette(family) : null;
}

export function presetOptions() {
  return families.map(({ id, name }) => ({ id, name }));
}

export const PRESET_FAMILIES = familyMap;
export const VALID_PRESET_IDS = new Set(familyMap.keys());
export const VALID_EDITOR_IDS = VALID_PRESET_IDS;
