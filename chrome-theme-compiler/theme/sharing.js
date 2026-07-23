import { normaliseTheme } from './schema.js?v=compiler-2';
import { DEFAULT_THEMES } from './defaults.js?v=compiler-2';
import { VALID_EDITOR_IDS } from './editor-themes.js?v=compiler-4';

const PREFIX = 'orbit-theme-v1:';
const LEGACY_PRESETS = new Map([
  ['codex-light', 'codex'], ['codex-dark', 'codex'],
  ['raycast-light', 'raycast'], ['github-light', 'github'],
  ['rose-pine-dawn', 'rose-pine'], ['solarized-light', 'solarized'],
  ['gruvbox-light', 'gruvbox'], ['gruvbox-dark', 'gruvbox'],
  ['mint-light', 'mint'], ['high-contrast-light', 'monochrome'],
  ['catppuccin-mocha', 'catppuccin'],
]);
export function exportTheme(variant, codeThemeId, theme) {
  return `${PREFIX}${JSON.stringify({ variant, codeThemeId, theme })}`;
}

export function importTheme(value) {
  if (!value.startsWith(PREFIX)) throw new Error('Expected an orbit-theme-v1 string.');
  let parsed;
  try { parsed = JSON.parse(value.slice(PREFIX.length)); } catch { throw new Error('The theme payload is not valid JSON.'); }
  if (!['light', 'dark'].includes(parsed.variant)) throw new Error('Theme variant must be light or dark.');
  const codeThemeId = LEGACY_PRESETS.get(parsed.codeThemeId) || parsed.codeThemeId;
  if (!VALID_EDITOR_IDS.has(codeThemeId)) throw new Error('The theme preset is not registered.');
  const theme = normaliseTheme(parsed.theme, DEFAULT_THEMES[parsed.variant]);
  return { variant: parsed.variant, codeThemeId, theme };
}
