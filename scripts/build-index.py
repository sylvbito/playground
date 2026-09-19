#!/usr/bin/env python3
"""Regenerate playground/index.html from the directories on disk.

Every subdirectory containing an index.html is a build. This script is the
single source of truth for the index page: it discovers everything present,
groups it by family, and warns loudly about anything unmapped so the index
can never silently fall out of sync again.

Usage:  python3 scripts/build-index.py
"""

import os
import re
import subprocess
import sys
from datetime import date

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "index.html")

# ---------------------------------------------------------------- families
# Ordered. Every build directory must appear in exactly one family.
FAMILIES = [
    (
        "Card studies",
        "One idea per card — centred square format, no chrome.",
        [
            ("scroll-clip-card", "Scroll Clip Card", "scroll-driven clip reveal"),
            ("css-interaction-primitives-card", "CSS Interaction Primitives Card", ":has(), popover, dialog, focus-within"),
            ("css-component-primitives-card", "CSS Component Primitives Card", "modern CSS component primitives"),
            ("css-geometry-card", "CSS Geometry Card", "shapes, aspect-ratio, clip-path geometry"),
            ("css-layout-primitives-card", "CSS Layout Primitives Card", "grid, subgrid, container queries"),
            ("css-new-primitives-card", "CSS New Primitives Card", "newly shipped CSS primitives"),
            ("css-progressive-primitives-card", "CSS Progressive Primitives Card", "progressive enhancement primitives"),
            ("css-state-visibility-primitives-card", "CSS State Primitives Card", "state and visibility primitives"),
            ("contrast-axis-card", "Contrast Axis Card", "contrast as a single adjustable axis"),
            ("colour-system-card", "Colour System Card", "one colour, a full system"),
        ],
    ),
    (
        "Labs & tools",
        "Interactive CSS tooling — generators, debuggers, reference labs.",
        [
            ("color-contrast-lab", "Colour Contrast Lab", "relative colours × contrast-color()"),
            ("view-transition-repro", "View Transition Repro", "minimal cross-document repro"),
            ("view-transition-lab", "View Transition Lab", "cross-document MPA view transitions"),
            ("form-foundry", "Form Foundry", "modern CSS form components"),
            ("modern-css-starter", "Modern CSS Starter", "build-your-own reset configurator"),
            ("theme-engine", "Theme Engine", "self-correcting WCAG-safe theme generator"),
            ("relative", "Relative", "relative colour palette builder"),
            ("concept-forge", "Concept Forge", "brand extraction & concept comparison"),
            ("text-box-trim", "text-box-trim", "typography alignment debugger"),
            ("transition-kit", "Transition Kit", "SPA-like page transitions for MPAs"),
            ("token-lab", "Token Lab", "design token playground"),
            ("css-native-ui", "CSS Native UI", "JS-free component patterns"),
            ("anchor-positioning-playground", "CSS Anchor Positioning Playground", "anchored popovers, live-editable"),
        ],
    ),
    (
        "Orbit",
        "Spatial workspace exploration — concept mock through to implementation.",
        [
            ("orbit-light-field", "Orbit Light Field", "light, thumb-first field"),
            ("orbit-living-fragment", "Orbit Living Fragment", "a living workspace, fragment"),
            ("orbit-nav", "Orbit Navigation Study", "thumb-first radial navigation"),
            ("orbit-spatial-canvas", "Orbit Spatial Canvas", "spatial canvas concept"),
            ("astryx-orbit-lab", "Astryx Orbit Lab", "Orbit internals on Astryx components"),
            ("orbit-dom-workspace", "Orbit DOM Workspace", "the live workspace UI"),
            ("codex-theme-compiler", "Codex Theme Compiler", "two palettes, direct inputs"),
            ("chrome-theme-compiler", "Chrome Theme Compiler", "one palette, two browser-target mappings"),
            ("orbit-spatial-lab", "Orbit Spatial HTML Lab", "spatial HTML study"),
            ("orbit-proof-of-practice", "Workbench", "interfaces with taste, systems with teeth"),
        ],
    ),
    (
        "Visual studies",
        "Motion, glass, and geometry — pure visual experiments.",
        [
            ("spectral-veil", "Spectral Veil", "spectral veil composite"),
            ("warp-mesh", "Warp Mesh", "warped mesh field"),
            ("organic-tether", "Organic Tether", "organic connector study"),
            ("anchor-glass", "Anchor Glass", "anchor positioning × liquid glass"),
            ("boiling-geometry", "Boiling Geometry", "SVG hand-drawn line boiling"),
            ("depth-strata", "Depth Strata", "cascade-layer glass depth"),
            ("cascade-glass", "Cascade Glass", "cascade layers × glass"),
            ("aave-glass-demo", "Aave Liquid Glass", "feDisplacementMap lens"),
            ("auroral-lenses", "Auroral Lenses", "layered aurora gradient fields"),
            ("chromatic-drift", "Chromatic Drift", "chromatic drift motion study"),
            ("stratum", "Stratum", "layered depth study"),
        ],
    ),
]


def first_commit_date(path):
    """Date the directory first landed in git — the build date convention."""
    try:
        out = subprocess.run(
            ["git", "log", "--diff-filter=A", "--format=%ad", "--date=short", "--", path],
            cwd=ROOT, capture_output=True, text=True, check=True,
        ).stdout.strip().split("\n")
        if out and out[-1]:
            return out[-1]
    except (subprocess.CalledProcessError, FileNotFoundError):
        pass
    return date.fromtimestamp(os.path.getmtime(os.path.join(ROOT, path))).isoformat()


def discover():
    return sorted(
        d for d in os.listdir(ROOT)
        if not d.startswith(".")
        and os.path.isdir(os.path.join(ROOT, d))
        and os.path.exists(os.path.join(ROOT, d, "index.html"))
    )


def build():
    on_disk = discover()
    mapped = [slug for _, _, items in FAMILIES for slug, _, _ in items]

    unmapped = [d for d in on_disk if d not in mapped]
    stale = [s for s in mapped if s not in on_disk]
    if unmapped:
        print("!! UNMAPPED directories (add them to FAMILIES):", file=sys.stderr)
        for d in unmapped:
            print(f"     - {d}", file=sys.stderr)
    if stale:
        print("!! STALE mappings (directory no longer exists):", file=sys.stderr)
        for s in stale:
            print(f"     - {s}", file=sys.stderr)

    total = len([s for s in mapped if s in on_disk])
    sections = []

    for name, blurb, items in FAMILIES:
        rows = []
        dated = []
        for slug, label, note in items:
            if slug not in on_disk:
                continue
            dated.append((first_commit_date(slug), slug, label, note))
        dated.sort(key=lambda r: (r[0], r[2]), reverse=True)

        for d, slug, label, note in dated:
            rows.append(
                f'        <a class="build" href="/playground/{slug}/" data-search="{label.lower()} {slug} {note.lower()}">\n'
                f'          <span class="build-main">\n'
                f'            <span class="build-name">{label}</span>\n'
                f'            <span class="build-note">{note}</span>\n'
                f'          </span>\n'
                f'          <span class="build-date">{d}</span>\n'
                f'        </a>'
            )
        sections.append(
            f'      <section class="group" data-count="{len(dated)}">\n'
            f'        <header class="group-head">\n'
            f'          <h2>{name}</h2>\n'
            f'          <span class="group-blurb">{blurb}</span>\n'
            f'        </header>\n'
            f'        <div class="builds">\n' + "\n".join(rows) + '\n        </div>\n'
            f'      </section>'
        )

    html = TEMPLATE.replace("<!--SECTIONS-->", "\n".join(sections))
    html = html.replace("<!--TOTAL-->", str(total))
    with open(OUT, "w", encoding="utf-8") as fh:
        fh.write(html)

    print(f"Wrote {OUT} — {total} builds across {len(FAMILIES)} families.")
    if unmapped or stale:
        print("Index is INCOMPLETE — fix the warnings above.", file=sys.stderr)
        return 1
    return 0


TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Playground — sylvbito</title>
  <meta name="description" content="Nightly builds — practical web tooling, component patterns, and interactive design experiments.">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    :root {
      --bg: #0a0a0f;
      --panel: #13131d;
      --panel-hover: #1a1a28;
      --line: #1e1e2e;
      --line-hover: #34344e;
      --text: #e4e4ed;
      --muted: #8b8b9e;
      --dim: #5c5c70;
      --accent: #7c7cff;
    }
    body {
      font-family: 'Inter', -apple-system, sans-serif;
      background: var(--bg);
      color: var(--text);
      padding: 3rem 1.5rem 4rem;
      max-width: 960px;
      margin: 0 auto;
      min-height: 100vh;
      -webkit-font-smoothing: antialiased;
    }
    header.top { margin-bottom: 2rem; }
    h1 { font-size: 1.8rem; font-weight: 600; letter-spacing: -0.02em; margin-bottom: 0.5rem; }
    .lede { color: var(--muted); font-size: 0.95rem; line-height: 1.6; max-width: 62ch; }
    .lede strong { color: var(--text); font-weight: 500; }
    .filter-wrap { position: relative; margin: 2rem 0 2.5rem; }
    #filter {
      width: 100%;
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 10px;
      color: var(--text);
      font: inherit;
      font-size: 0.95rem;
      padding: 0.85rem 3.5rem 0.85rem 2.6rem;
      outline: none;
      transition: border-color 0.2s, background 0.2s;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none' stroke='%235c5c70' stroke-width='1.6' stroke-linecap='round'%3E%3Ccircle cx='7' cy='7' r='4.5'/%3E%3Cpath d='M10.5 10.5L14 14'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: 1rem center;
      background-size: 15px 15px;
    }
    #filter:focus { border-color: var(--accent); background-color: #16161f; }
    #filter::placeholder { color: var(--dim); }
    kbd {
      position: absolute;
      right: 0.9rem;
      top: 50%;
      transform: translateY(-50%);
      font: inherit;
      font-size: 0.72rem;
      color: var(--dim);
      border: 1px solid var(--line);
      border-radius: 5px;
      padding: 0.15rem 0.4rem;
      pointer-events: none;
    }
    #filter:focus ~ kbd { opacity: 0; }
    .group { margin-bottom: 2.75rem; }
    .group[hidden] { display: none; }
    .group-head {
      display: flex;
      align-items: baseline;
      gap: 0.85rem;
      flex-wrap: wrap;
      padding-bottom: 0.7rem;
      margin-bottom: 0.9rem;
      border-bottom: 1px solid var(--line);
    }
    h2 {
      font-size: 0.82rem;
      font-weight: 600;
      letter-spacing: 0.09em;
      text-transform: uppercase;
      color: var(--accent);
    }
    .group-blurb { font-size: 0.85rem; color: var(--dim); }
    .builds { display: flex; flex-direction: column; gap: 0.5rem; }
    .build {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 10px;
      padding: 0.85rem 1.15rem;
      text-decoration: none;
      color: var(--text);
      transition: border-color 0.2s, background 0.2s, transform 0.2s;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1.5rem;
    }
    .build[hidden] { display: none; }
    .build:hover { border-color: var(--line-hover); background: var(--panel-hover); }
    .build-main { display: flex; flex-direction: column; gap: 0.2rem; min-width: 0; }
    .build-name { font-weight: 500; font-size: 0.98rem; }
    .build-note { font-size: 0.82rem; color: var(--dim); }
    .build-date {
      font-size: 0.75rem;
      color: var(--dim);
      font-variant-numeric: tabular-nums;
      flex-shrink: 0;
      padding-top: 0.15rem;
    }
    .no-results {
      text-align: center;
      padding: 3rem 0;
      color: var(--dim);
      font-size: 0.9rem;
    }
    .no-results[hidden] { display: none; }
    footer {
      margin-top: 3rem;
      padding-top: 1.5rem;
      border-top: 1px solid var(--line);
      font-size: 0.8rem;
      color: var(--dim);
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      flex-wrap: wrap;
    }
    footer a { color: var(--muted); text-decoration: none; }
    footer a:hover { color: var(--text); }
    @media (max-width: 560px) {
      body { padding: 2rem 1.1rem 3rem; }
      .build { align-items: flex-start; }
      .build-date { display: none; }
    }
  </style>
</head>
<body>
  <header class="top">
    <h1>Playground</h1>
    <p class="lede"><strong><!--TOTAL--> builds.</strong> Practical web tooling, component patterns, and interactive design experiments — built nightly-ish by Hermes.</p>
  </header>

  <div class="filter-wrap">
    <input id="filter" type="search" placeholder="Filter builds…" autocomplete="off" aria-label="Filter builds">
    <kbd>/</kbd>
  </div>

  <main>
    <!--SECTIONS-->
    <p class="no-results" hidden>Nothing matches that.</p>
  </main>

  <footer>
    <span>Built by Hermes</span>
    <a href="https://github.com/sylvbito/playground">github.com/sylvbito/playground</a>
  </footer>

  <script>
    const input = document.getElementById('filter');
    const groups = [...document.querySelectorAll('.group')];
    const builds = [...document.querySelectorAll('.build')];
    const empty = document.querySelector('.no-results');

    function apply() {
      const q = input.value.trim().toLowerCase();
      let hits = 0;
      for (const b of builds) {
        const match = !q || b.dataset.search.includes(q);
        b.hidden = !match;
        if (match) hits++;
      }
      for (const g of groups) {
        g.hidden = !g.querySelector('.build:not([hidden])');
      }
      empty.hidden = hits > 0;
    }

    input.addEventListener('input', apply);
    addEventListener('keydown', e => {
      if (e.key === '/' && document.activeElement !== input) {
        e.preventDefault();
        input.focus();
      } else if (e.key === 'Escape' && document.activeElement === input) {
        input.value = '';
        apply();
        input.blur();
      }
    });
  </script>
</body>
</html>
"""


if __name__ == "__main__":
    sys.exit(build())
