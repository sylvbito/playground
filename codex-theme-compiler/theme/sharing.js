import { isHex, normaliseChromeTheme } from './schema.js?v=codex-2';

const PREFIX = 'codex-theme-v1:';

export function exportTheme(settings, variant) {
  const theme = variant === 'dark' ? settings.darkChromeTheme : settings.lightChromeTheme;
  const codeThemeId = variant === 'dark' ? settings.darkCodeThemeId : settings.lightCodeThemeId;
  return `${PREFIX}${JSON.stringify({ variant, codeThemeId, theme })}`;
}

export function importTheme(value, defaults, validEditorIds) {
  if (!value.startsWith(PREFIX)) throw new Error('Expected a codex-theme-v1 string.');
  let parsed;
  try { parsed = JSON.parse(value.slice(PREFIX.length)); }
  catch { throw new Error('The theme payload is not valid JSON.'); }
  if (!['light', 'dark'].includes(parsed.variant)) throw new Error('Theme variant must be light or dark.');
  if (!validEditorIds.has(parsed.codeThemeId)) throw new Error('The editor theme is not registered.');
  const theme = parsed.theme;
  const colours = [theme?.accent, theme?.surface, theme?.ink, theme?.semanticColors?.diffAdded, theme?.semanticColors?.diffRemoved, theme?.semanticColors?.skill];
  if (colours.some(colour => !isHex(colour))) throw new Error('Every colour must use six-digit hexadecimal notation.');
  if (!Number.isInteger(theme.contrast) || theme.contrast < 0 || theme.contrast > 100) throw new Error('Contrast must be an integer from 0 to 100.');
  if (typeof theme.opaqueWindows !== 'boolean') throw new Error('Opaque windows must be true or false.');
  const validFont = value => value === null || typeof value === 'string';
  if (!theme.fonts || !validFont(theme.fonts.ui) || !validFont(theme.fonts.code)) throw new Error('Font names must be text or null.');
  const fallback = parsed.variant === 'dark' ? defaults.darkChromeTheme : defaults.lightChromeTheme;
  return {
    variant: parsed.variant,
    codeThemeId: parsed.codeThemeId,
    theme: normaliseChromeTheme(parsed.theme, fallback),
  };
}

export const SHARING_PREFIX = PREFIX;
