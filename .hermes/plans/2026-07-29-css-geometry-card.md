# CSS Geometry Card

## Subject and job
A focused browser specimen for understanding CSS motion-path companions and trigonometric functions by manipulating one minimal square card. The page should make each feature legible through direct interaction rather than explanatory chrome.

## Design system
- Palette: warm-grey canvas `#ececea`, near-black specimen `#191918`, white ink `#f8f8f5`, muted ink `#999992`, lime signal `#b7eb52`.
- Type: system sans for labels; system monospace for live CSS values.
- Geometry: one responsive square card with a 36px squircle radius; compact control tray below with 14px inner radii.
- Layout: centred card and controls only—no hero, navigation, prose sections, or dashboard framing.

## Demo set
1. **Ray** — particles travel along individual `ray()` paths; controls expose `offset-distance`, `offset-anchor`, and `offset-rotate`.
2. **Orbit** — indexed elements use `sin()` and `cos()` to form and rotate a radial arrangement.
3. **Point** — `atan2()` rotates an arrow toward the live pointer; `hypot()` modulates its reach.

Each mode uses the same specimen card and two compact controls. A short property readout identifies the CSS doing the work.

## Interaction and accessibility
- Modes are real buttons with pressed state and keyboard focus.
- Range inputs update geometry immediately.
- Ray mode can replay by clicking/tapping the card.
- Point mode responds to pointer movement and has a useful centred default.
- Reduced motion removes interpolation without removing state changes.

## Verification
Check all three modes at desktop and mobile widths, confirm computed CSS values change, exercise click/pointer/range interactions, verify no console errors, then publish to `/playground/css-geometry-card/`.
