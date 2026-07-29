# CSS Component Primitives Card

## Goal

Publish a fourth minimal CSS specimen card demonstrating `border-shape`, CSS custom functions, anchored container queries, and element-scoped view transitions, with honest iPhone/WebKit fallbacks and a deterministic `?force-fallback=1` QA path.

## Design direction

### Palette

Reuse the established family: `#ededec` canvas, `#1c1c1a` specimen, `#f8f8f5` ink, `#97978f` muted text, `#b7eb52` accent, and restrained white-alpha rules.

### Type

Inter/system sans for controls and labels; compact monospace for primitive names, live CSS and Native/Fallback status. Keep the existing card scale and density.

### Layout

One responsive square stage above one compact four-tab control tray. Each mode owns the same scene area and exposes only one meaningful control:

```text
+--------------------------------+
| primitive                 hint |
|                                |
|          live specimen         |
|                                |
| CSS readout        Native/Fall |
+--------------------------------+
| Border | Function | Anchor | VT|
| one contextual control         |
+--------------------------------+
```

### Signature move

Every mode demonstrates a browser primitive that changes the boundary of a component: its outline, value system, placement context, or transition scope. No decorative layer beyond the live primitive.

## Modes

1. **Border** — vary a cut value on a non-rectangular specimen. Native `border-shape: polygon(...)` keeps border and shadow aligned; fallback uses the same polygon through `clip-path` with a deliberately small faux-border treatment.
2. **Function** — vary the ratio of a five-step modular scale computed by `@function --modular(...)`. Native CSS calculates every size; fallback JavaScript writes equivalent custom-property sizes.
3. **Anchor** — move an anchor vertically until its tooltip uses `position-try-fallbacks: flip-block`. `@container anchored(fallback: flip-block)` moves and rotates the arrow and changes the resolved-state treatment; fallback JavaScript positions the bubble and sets the equivalent state.
4. **Scope** — run two concurrent `element.startViewTransition(() => update())` calls on separate component subtrees that intentionally reuse the same `view-transition-name`. Fallback uses ordinary CSS transitions without pretending to reproduce the browser snapshot tree.

## Progressive enhancement

- Preserve native CSS/API paths whenever the exact syntax is supported.
- Use `?force-fallback=1` to activate every compatibility path in Chromium.
- Keep a quiet Native/Fallback badge in the stage footer.
- Do not show duplicate native and authored affordances.
- Respect `prefers-reduced-motion`.

## Implementation

- Create `css-component-primitives-card/index.html` as one dependency-free static document.
- Reuse the shell and responsive rules from `css-progressive-primitives-card/index.html` without importing or coupling the two demos.
- Keep JavaScript limited to mode switching, controls, feature detection, state mutation, and focused fallbacks.

## Verification

1. Parse HTML and syntax-check the extracted JavaScript.
2. Preserve exact native-support probe results from Chrome 150.
3. Exercise every control and inspect computed styles in the native path.
4. Repeat against `?force-fallback=1` and verify Native/Fallback labels.
5. Inspect transition in-flight and settled states, not only the final DOM.
6. Check console errors and accessibility labels/focus.
7. Verify a proper 390×844 CDP mobile emulation in representative dense modes.
8. Stage only the new card; preserve the unrelated Orbit DOM plan.
9. Push `main`, poll GitHub Pages for a distinctive marker, and visually verify the cache-busted public URL.
