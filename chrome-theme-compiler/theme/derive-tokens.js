import { bestInk, contrast, mix, readableForeground } from './color.js';

const interpolate = (min, max, amount) => min + (max - min) * amount;

export function deriveSemanticTokens(theme, variant) {
  const dark = variant === 'dark';
  const strength = theme.contrast / 100;
  const { surface, ink, accent, semanticColors } = theme;
  const primaryTextTarget = interpolate(4.5, 7, strength);
  const primary = readableForeground(ink, surface, primaryTextTarget);
  const secondary = readableForeground(mix(primary, surface, interpolate(0.31, 0.20, strength)), surface, interpolate(3.4, 4.5, strength));
  const tertiary = readableForeground(mix(primary, surface, interpolate(0.48, 0.34, strength)), surface, 3);
  const accentText = readableForeground(accent, surface, 4.5);
  const onAccent = bestInk(accent);
  const elevatedMix = dark ? interpolate(0.055, 0.11, strength) : interpolate(0.012, 0.038, strength);
  const controlMix = interpolate(0.045, 0.12, strength);

  return {
    '--color-background-surface': surface,
    '--color-background-surface-under': mix(surface, dark ? '#000000' : ink, interpolate(0.035, 0.075, strength)),
    '--color-background-elevated-primary': mix(surface, ink, elevatedMix),
    '--color-background-elevated-secondary': mix(surface, ink, elevatedMix * 1.65),
    '--color-background-control': mix(surface, ink, controlMix),
    '--color-background-control-hover': mix(surface, ink, controlMix + interpolate(0.025, 0.055, strength)),
    '--color-background-control-active': mix(surface, ink, controlMix + interpolate(0.06, 0.11, strength)),
    '--color-background-accent': accent,
    '--color-background-accent-soft': mix(accent, surface, dark ? 0.76 : 0.88),
    '--color-border-light': mix(surface, ink, interpolate(0.08, 0.15, strength)),
    '--color-border-normal': mix(surface, ink, interpolate(0.14, 0.27, strength)),
    '--color-border-heavy': mix(surface, ink, interpolate(0.25, 0.43, strength)),
    '--color-border-focus': accent,
    '--color-text-primary': primary,
    '--color-text-secondary': secondary,
    '--color-text-tertiary': tertiary,
    '--color-text-accent': accentText,
    '--color-text-on-accent': onAccent,
    '--color-icon-primary': primary,
    '--color-icon-secondary': secondary,
    '--color-diff-added': semanticColors.diffAdded,
    '--color-diff-added-soft': mix(semanticColors.diffAdded, surface, dark ? 0.78 : 0.9),
    '--color-diff-removed': semanticColors.diffRemoved,
    '--color-diff-removed-soft': mix(semanticColors.diffRemoved, surface, dark ? 0.78 : 0.9),
    '--color-skill': semanticColors.skill,
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
