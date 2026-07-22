export function applyAppearance(root, tokens, theme, settings, variant, editorTheme) {
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
  root.style.setProperty('--editor-background', editorTheme.background);
  root.style.setProperty('--editor-foreground', editorTheme.foreground);
  root.style.setProperty('--editor-accent', editorTheme.accent);
  root.style.setProperty('--editor-keyword', editorTheme.keyword);
  root.style.setProperty('--editor-string', editorTheme.string);
  root.style.setProperty('--editor-number', editorTheme.number);
  root.style.setProperty('--editor-added', editorTheme.added);
  root.style.setProperty('--editor-removed', editorTheme.removed);
  root.classList.toggle('font-smoothing', settings.useFontSmoothing);
  root.classList.toggle('pointer-cursors', settings.usePointerCursors);
}
