# CSS New Primitives Card

## Subject and job
A sequel to the CSS Geometry Card: one minimal square specimen for four recently shipped CSS primitives that are visually useful and not covered by the earlier experiments. The page should teach through direct manipulation, with almost no explanatory interface.

## Chosen primitives
1. **Corners** — `corner-shape: superellipse()` changes an inner object from concave/notched through round to squircle-like forms.
2. **Siblings** — `sibling-index()` and `sibling-count()` generate a coherent wave without authored indices or `nth-child()` rules.
3. **Attributes** — typed `attr()` reads lengths, angles, colours and radii directly from HTML data attributes; tapping mutates attributes only.
4. **Carousel** — `::scroll-button()`, `::scroll-marker`, and `scroll-marker-group` provide generated navigation and state without JavaScript.

All four are supported in the installed Chromium browser. They are intentionally chosen over already-covered anchor positioning, scroll timelines, masks, intrinsic-size interpolation and motion-path geometry.

## Design system
- Keep the previous demo family: warm-grey canvas, near-black square specimen, white ink, one lime signal (`#b7eb52`).
- System sans for interface labels; system monospace for the live CSS readout.
- One responsive 390px square with 36px corners and one compact 16px-radius control tray.
- No hero, navigation, feature prose, decorative cards, or secondary page sections.

## Interaction
- Four compact mode buttons with pressed and focus states.
- Two contextual controls at most per mode.
- Corners exposes exponent and radius.
- Siblings exposes amplitude and phase; clicking advances the phase.
- Attributes has one Shuffle action; JavaScript changes only `data-*` values while CSS performs all presentation.
- Carousel uses browser-generated buttons and markers, keyboard order, scroll snapping, and no carousel JavaScript.
- Reduced motion keeps every state functional.

## Verification
Exercise every mode and control, inspect computed styles for each new primitive, verify generated carousel affordances by real click, check for console errors, then validate the deployed artifact at desktop and a real 390px emulated mobile viewport.
