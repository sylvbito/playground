import { bestInk, contrast, mix, readableForeground } from './color.js?v=codex-2';

const interpolate = (min, max, amount) => min + (max - min) * amount;

export function deriveSemanticTokens(theme, variant) {
  const dark = variant === 'dark';
  const strength = theme.contrast / 100;
  const { surface, ink, accent, semanticColors } = theme;
  const primaryTarget = interpolate(4.5, 7, strength);
  const primary = readableForeground(ink, surface, primaryTarget);
  const secondary = readableForeground(mix(primary, surface, interpolate(0.28, 0.18, strength)), surface, interpolate(4.5, 5.5, strength));
  const tertiary = readableForeground(mix(primary, surface, interpolate(0.44, 0.32, strength)), surface, 4.5);
  const accentText = readableForeground(accent, surface, 4.5);
  const focusAccent = readableForeground(accent, surface, 3);
  const onAccent = bestInk(accent);
  const under = mix(surface, dark ? '#000000' : ink, interpolate(0.025, 0.065, strength));
  const elevated = mix(surface, ink, dark ? interpolate(0.055, 0.11, strength) : interpolate(0.012, 0.035, strength));
  const elevatedSecondary = mix(surface, ink, dark ? interpolate(0.085, 0.17, strength) : interpolate(0.025, 0.065, strength));
  const control = mix(surface, ink, interpolate(0.045, 0.11, strength));
  const controlHover = mix(surface, ink, interpolate(0.075, 0.16, strength));
  const controlActive = mix(surface, ink, interpolate(0.11, 0.23, strength));

  return {
    '--color-background-surface': surface,
    '--color-background-surface-under': under,
    '--color-background-elevated-primary': elevated,
    '--color-background-elevated-secondary': elevatedSecondary,
    '--color-background-control': control,
    '--color-background-control-hover': controlHover,
    '--color-background-control-active': controlActive,
    '--color-background-accent': accent,
    '--color-background-accent-soft': mix(accent, surface, dark ? 0.78 : 0.88),
    '--color-border-light': mix(surface, ink, interpolate(0.08, 0.15, strength)),
    '--color-border-normal': mix(surface, ink, interpolate(0.15, 0.28, strength)),
    '--color-border-heavy': mix(surface, ink, interpolate(0.26, 0.44, strength)),
    '--color-border-focus': focusAccent,
    '--color-text-primary': primary,
    '--color-text-secondary': secondary,
    '--color-text-tertiary': tertiary,
    '--color-text-accent': accentText,
    '--color-text-on-accent': onAccent,
    '--color-icon-primary': primary,
    '--color-icon-secondary': secondary,
    '--color-diff-added': readableForeground(semanticColors.diffAdded, surface, 4.5),
    '--color-diff-added-soft': mix(semanticColors.diffAdded, surface, dark ? 0.78 : 0.9),
    '--color-diff-removed': readableForeground(semanticColors.diffRemoved, surface, 4.5),
    '--color-diff-removed-soft': mix(semanticColors.diffRemoved, surface, dark ? 0.78 : 0.9),
    '--color-skill': readableForeground(semanticColors.skill, surface, 4.5),
    '--color-skill-soft': mix(semanticColors.skill, surface, dark ? 0.8 : 0.9),
    '--theme-contrast-primary': contrast(primary, surface).toFixed(2),
    '--theme-contrast-accent': contrast(onAccent, accent).toFixed(2),
  };
}

export const TOKEN_GROUPS = {
  Background: ['--color-background-surface', '--color-background-surface-under', '--color-background-elevated-primary', '--color-background-control', '--color-background-accent'],
  Text: ['--color-text-primary', '--color-text-secondary', '--color-text-tertiary', '--color-text-accent', '--color-text-on-accent'],
  Border: ['--color-border-light', '--color-border-normal', '--color-border-heavy', '--color-border-focus'],
  Semantic: ['--color-diff-added', '--color-diff-removed', '--color-skill'],
};
