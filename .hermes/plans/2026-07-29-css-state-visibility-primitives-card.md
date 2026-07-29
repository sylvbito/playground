# CSS State & Visibility Primitives Card — Plan

**Card 6** of the CSS feature demo family. Four primitives that let components react to style state, scroll position, column overflow, and anchor visibility — all without JavaScript observers.

## Mode 1: container style() queries

**Primitive:** `@container style(--variant: primary)` — query computed custom property values

**Concept:** A component card with three variants (default, primary, featured) driven entirely by a `--variant` custom property on the container. No class switching — one CSS variable changes layout, colour, and content emphasis through style queries.

**Specimen:** A card with headline, body, and CTA. Three variant buttons set `--variant` on the container. `@container style(--variant: primary)` changes the background and CTA colour. `@container style(--variant: featured)` adds a border glow and larger headline.

**Native:** `container-type: inline-size;` on card + `@container style(--variant: primary) { … }`
**Fallback:** Class-based variant switching with the same visual outcome.

**Control:** Three variant buttons: Default / Primary / Featured.

## Mode 2: :target-current scroll-spy

**Primitive:** `:target-current` pseudo-class with `scroll-target-group`

**Concept:** A scrollable article with 3 sections, each with an `id`. A nav with anchor links uses `:target-current` to highlight the currently visible section — CSS-native scroll-spy, no IntersectionObserver.

**Specimen:** A scrollable panel containing 3 colour-coded sections (each ~150px). Above, 3 nav links. As the user scrolls, the active section's nav link gets `:target-current` styling (accent background + bold).

**Native:** `scroll-target-group: auto` on nav + `a:target-current { … }` styling.
**Fallback:** IntersectionObserver updates `.active` class on nav links.

**Control:** Scroll the panel (inherent interaction) + auto-scroll button to jump between sections.

## Mode 3: column-wrap

**Primitive:** `column-wrap: auto` — multicolumn items wrap to balance columns

**Concept:** A content list that flows into balanced columns. As items are added/removed, `column-wrap: auto` redistributes them across available columns instead of filling one column completely before starting the next.

**Specimen:** A container with `columns: 2; column-wrap: auto; column-gap: 16px` containing 5-7 item chips. An "Add item" / "Remove item" control changes the count, and the browser redistributes chips across columns.

**Native:** `column-wrap: auto` — items balance across columns.
**Fallback:** Regular column fill (first column fills completely, then second).

**Control:** Add / Remove item buttons. Show column-wrap toggle.

## Mode 4: position-visibility

**Primitive:** `position-visibility: anchors-visible` — auto-hide anchored elements when anchor is offscreen

**Concept:** A scrollable container with an anchor element partway down. A tooltip is anchored to it. As the user scrolls past the anchor, the tooltip auto-hides via `position-visibility: anchors-visible` — no IntersectionObserver, no scroll handlers.

**Specimen:** A scrollable panel with a target button at position ~60%. A tooltip anchored above it. Scroll down past the button and the tooltip disappears. Scroll back and it reappears.

**Native:** `position-visibility: anchors-visible` on the tooltip + `anchor()` positioning.
**Fallback:** IntersectionObserver hides/shows the tooltip.

**Control:** Scroll (inherent) + a "Scroll to anchor" button to jump back.

## Visual shell

Same as all previous cards: dark rounded stage, mode tabs, control tray, footer readout + Native/Fallback badge. `?force-fallback=1` disables all native paths.

## Fallback strategy

- **style queries:** Class-based variants
- **:target-current:** IntersectionObserver + `.active` class
- **column-wrap:** Standard column fill
- **position-visibility:** IntersectionObserver visibility toggle
