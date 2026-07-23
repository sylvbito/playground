import { mix, readableForeground } from './color.js';

function editorInk(colour, background) {
  return readableForeground(colour, background, 4.5);
}

function editorDiffInk(colour, background) {
  let repaired = editorInk(colour, background);
  for (let index = 0; index < 3; index += 1) {
    repaired = readableForeground(repaired, mix(background, repaired, 0.14), 4.5);
  }
  return repaired;
}

export function applyPlatformAppearance(root, tokens, theme, settings, variant) {
  root.dataset.variant = variant;
  root.classList.toggle('electron-dark', variant === 'dark');
  root.classList.toggle('electron-light', variant === 'light');
  Object.entries(tokens).forEach(([name, value]) => root.style.setProperty(name, value));
  root.style.setProperty('--base-accent', theme.accent);
  root.style.setProperty('--base-surface', theme.surface);
  root.style.setProperty('--base-ink', theme.ink);
  root.style.setProperty('--base-contrast', String(theme.contrast));
  root.style.setProperty('--ui-font-size', `${settings.sansFontSize}px`);
  root.style.setProperty('--code-font-size', `${settings.codeFontSize}px`);
  root.style.setProperty('--font-sans', theme.fonts.ui ? `"${theme.fonts.ui}", var(--font-sans-default)` : 'var(--font-sans-default)');
  root.style.setProperty('--font-mono', theme.fonts.code ? `"${theme.fonts.code}", var(--font-mono-default)` : 'var(--font-mono-default)');
  root.style.setProperty('--outer-canvas', tokens['--color-background-surface-under']);
  root.style.setProperty('--outer-panel', tokens['--color-background-surface']);
  root.style.setProperty('--outer-elevated', tokens['--color-background-elevated-primary']);
  root.style.setProperty('--outer-control', tokens['--color-background-control']);
  root.style.setProperty('--outer-control-hover', tokens['--color-background-control-hover']);
  root.style.setProperty('--outer-control-active', tokens['--color-background-control-active']);
  root.style.setProperty('--outer-ink', tokens['--color-text-primary']);
  root.style.setProperty('--outer-muted', tokens['--color-text-secondary']);
  root.style.setProperty('--outer-tertiary', tokens['--color-text-tertiary']);
  root.style.setProperty('--outer-line', tokens['--color-border-light']);
  root.style.setProperty('--outer-line-strong', tokens['--color-border-normal']);
  root.style.setProperty('--outer-accent', tokens['--color-background-accent']);
  root.style.setProperty('--outer-accent-soft', tokens['--color-background-accent-soft']);
  root.style.setProperty('--outer-on-accent', tokens['--color-text-on-accent']);
  root.style.setProperty('--outer-success', tokens['--color-diff-added']);
  root.style.colorScheme = variant;
  root.classList.toggle('font-smoothing', settings.useFontSmoothing);
  root.classList.toggle('pointer-cursors', settings.usePointerCursors);
}

export function applyAppearance(root, tokens, theme, settings, variant, editorTheme) {
  applyPlatformAppearance(root, tokens, theme, settings, variant);
  root.style.setProperty('--editor-background', editorTheme.background);
  root.style.setProperty('--editor-foreground', editorInk(editorTheme.foreground, editorTheme.background));
  root.style.setProperty('--editor-accent', editorInk(editorTheme.accent, editorTheme.background));
  root.style.setProperty('--editor-keyword', editorInk(editorTheme.keyword, editorTheme.background));
  root.style.setProperty('--editor-string', editorInk(editorTheme.string, editorTheme.background));
  root.style.setProperty('--editor-number', editorInk(editorTheme.number, editorTheme.background));
  root.style.setProperty('--editor-added', editorDiffInk(editorTheme.added, editorTheme.background));
  root.style.setProperty('--editor-removed', editorDiffInk(editorTheme.removed, editorTheme.background));
}
