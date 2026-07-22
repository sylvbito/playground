import { normaliseTheme } from './schema.js';
import { DEFAULT_THEMES } from './defaults.js';
import { VALID_EDITOR_IDS } from './editor-themes.js';

const PREFIX = 'orbit-theme-v1:';
export function exportTheme(variant, codeThemeId, theme) {
  return `${PREFIX}${JSON.stringify({ variant, codeThemeId, theme })}`;
}

export function importTheme(value) {
  if (!value.startsWith(PREFIX)) throw new Error('Expected an orbit-theme-v1 string.');
  let parsed;
  try { parsed = JSON.parse(value.slice(PREFIX.length)); } catch { throw new Error('The theme payload is not valid JSON.'); }
  if (!['light', 'dark'].includes(parsed.variant)) throw new Error('Theme variant must be light or dark.');
  if (!VALID_EDITOR_IDS.has(parsed.codeThemeId)) throw new Error('The editor theme is not registered.');
  const theme = normaliseTheme(parsed.theme, DEFAULT_THEMES[parsed.variant]);
  return { variant: parsed.variant, codeThemeId: parsed.codeThemeId, theme };
}
