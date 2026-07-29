# CSS Progressive Primitives Card + iPhone Fallbacks

## Scope
1. Retrofit `/css-new-primitives-card/` so its four modes remain functional in iPhone WebKit when the demonstrated primitive is absent.
2. Build `/css-progressive-primitives-card/` as a third minimal specimen covering CSS `if()`, `progress()`, `random()`, and scroll-state container queries.

Both pages expose `?force-fallback=1` for deterministic verification of the compatibility path.

## Existing-card fallback policy
- **`corner-shape`**: generate a sampled superellipse polygon in JavaScript and feed it to `clip-path`; retain native `corner-shape` where supported.
- **`sibling-index()` / `sibling-count()`**: inject fallback index/count custom properties once. CSS keeps the same wave maths.
- **Typed `attr()`**: mirror data attributes into typed custom properties only when unsupported; mutations continue to update attributes first.
- **Generated carousel controls**: render a hidden semantic button/marker fallback and activate it only when `::scroll-button()` / `::scroll-marker` are unavailable.
- Do not ship a heavyweight polyfill library for four local primitives.

## Third demo set
1. **If** — CSS `if(style())` routes a component state; data-attribute selectors are the fallback.
2. **Progress** — `progress()` normalises one source number; plain `calc()` provides an exact fallback for the known 0–100 domain.
3. **Random** — native `random()` generates per-element variation in Safari; deterministic JS-generated variables cover Chromium and older WebKit.
4. **Scroll state** — `@container scroll-state(snapped: x)` emphasises the snapped item; `scrollend` plus geometry supplies the fallback class.

## Design system
Continue the established card family: warm-grey canvas, one near-black 390px square, white text, single lime signal, compact mode tray, no hero or explanatory sections. Native/fallback status appears only as quiet footer metadata.

## Verification
- Exercise all existing and new modes on the native path.
- Repeat with `?force-fallback=1` and inspect computed output, controls, and console errors.
- Verify both pages at 390px emulated iPhone width.
- Commit, push, and visually inspect both cache-busted GitHub Pages URLs.
