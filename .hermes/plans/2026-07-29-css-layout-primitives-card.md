# CSS Layout Primitives Card — Plan

**Card 5** of the CSS feature demo family. Four newly supported layout-level primitives that demonstrate reading-order control, native gap dividers, automatic contrast resolution, and fully customizable native form controls.

## Mode 1: reading-flow

**Primitive:** `reading-flow: grid-rows` (also `flex-visual`)

**Concept:** A 3×3 grid of labelled cards where the DOM order differs from visual order (cards 1-3-5-7-9 are DOM order but visually arranged in a top-to-bottom-then-left grid). Tabbing through should follow the visual row-by-row order, not DOM order.

**Specimen:** A 3×3 grid of small numbered cards with tabindex=0. Show which card has keyboard focus. A mode switch toggles between `reading-flow: normal` (DOM order) and `reading-flow: grid-rows` (visual order). The footer readout shows which key the user should press to verify.

**Native:** `reading-flow: grid-rows` on the grid container.
**Fallback:** Tab through DOM order with an explanatory note.

**Control:** Toggle between Normal (DOM order) / Visual (grid-rows) reading flow.

## Mode 2: gap decorations

**Primitive:** `row-rule` and `column-rule` with `rule-break`

**Concept:** A 3×2 grid of dark cards with visible lime dotted dividers running through the gaps. Adjustable rule width and style. Show `rule-break` behavior at gap intersections.

**Specimen:** A grid of 6 placeholder cards. Dotted lime rules run between rows and columns through the gaps — no borders, no pseudo-elements, no nth-child tricks.

**Native:** `row-rule: 2px dotted var(--accent); column-rule: 2px dotted var(--accent); rule-break: none;`
**Fallback:** Draw rules using pseudo-elements on grid items (messy — honest fallback).

**Control:** Slider for rule width (1-4px).

## Mode 3: contrast-color()

**Primitive:** `contrast-color()` — browser auto-picks black or white

**Concept:** A dynamic colour picker (hue slider) that changes a background colour. Text on the background uses `contrast-color(var(--bg))` to automatically stay readable. Compare against a manual luminance-based solver.

**Specimen:** A large coloured panel with text reading "Auto contrast". A hue slider changes the panel colour. The text colour updates via `contrast-color()`. Show both the computed text colour and whether it passes AA.

**Native:** `color: contrast-color(var(--bg));`
**Fallback:** Manual luminance calculation (Y = 0.2126R + 0.7152G + 0.0722B → black if Y > 0.179 else white).

**Control:** Hue slider (0-360).

## Mode 4: appearance: base-select

**Primitive:** `appearance: base-select` with `::picker(select)` and `<selectedcontent>`

**Concept:** A styled native `<select>` dropdown that looks like part of the demo's design system, not an OS widget. Shows styling of button, dropdown panel, and individual options.

**Specimen:** A `<select>` with 4-5 options. The button is styled to match the card aesthetic. The dropdown (`::picker(select)`) has custom background, border-radius, and option styling. `<selectedcontent>` element mirrors the selected option.

**Native:** `select, ::picker(select) { appearance: base-select; }` plus styling.
**Fallback:** Standard OS select with a note.

**Control:** Just use the select itself — the interaction IS the demo.

## Visual shell

Same as all previous cards: dark rounded stage, mode tabs, control tray, footer readout + Native/Fallback badge. `?force-fallback=1` disables all native paths.

## Fallback strategy

- **reading-flow:** Tab order follows DOM; note explains the difference
- **gap decorations:** Pseudo-element borders on grid items (remove when unsupported)
- **contrast-color():** JS luminance solver
- **base-select:** OS default select
