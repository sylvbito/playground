# View transition repro

Tiny static repro of the Webflow experiment at:

- https://playground-fa35cf.webflow.io/
- https://playground-fa35cf.webflow.io/home-copy

## What it recreates

- Same two-page structure.
- Same parent `.message-box` and child `.chat` naming.
- Same `@view-transition { navigation: auto; }` setup.
- Same `.chat` height/opacity transition.
- Same 4s `::view-transition-group(...)` timing.

Default variant is `nested`, which is the faithful repro of the current setup.

## Run

```bash
cd /Users/sylvaingirard/projects/view-transition-repro
python3 -m http.server 4173
```

Then open:

- http://127.0.0.1:4173/index.html?variant=nested
- http://127.0.0.1:4173/home-copy.html?variant=nested

## Variants

- `nested` — parent and child both named, plus `.chat` keeps its own CSS transition.
- `parent-only` — only `.message-box` participates.
- `child-only` — only `.chat` participates.
- `nested-groups` — experimental parent/child grouping attempt.
- `parent-only-fix` — parent-only plus `height: 100%` on old/new snapshots.

Switch variants with the links below the component or by editing the `variant` query param.

## Files

- `index.html`
- `home-copy.html`
- `styles.css`
- `script.js`

## Notes

This is deliberately throwaway. The point is to isolate the browser behaviour without Webflow noise.
