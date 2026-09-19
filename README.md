# Playground

Interactive CSS / design experiments, published to GitHub Pages at
<https://sylvbito.github.io/playground/>.

Every subdirectory containing an `index.html` is a live build at
`https://sylvbito.github.io/playground/<dir>/`. Deployment is the GitHub Actions
workflow in `.github/workflows/deploy.yml` — pushing to `main` publishes the
whole repo as-is.

## Adding a build

1. Add the directory with its `index.html` (self-contained, no build step).
2. Register it in `scripts/build-index.py` under the right family.
3. Regenerate the index and push:

```sh
python3 scripts/build-index.py
git add -A && git commit -m "Add <name>" && git push
```

## The index page

`index.html` is **generated** — do not hand-edit it. `scripts/build-index.py`
discovers every build directory on disk, groups it by family, and derives the
build date from the directory's first commit. If a directory is not registered
in `FAMILIES` the script prints a warning and exits non-zero, so the index
cannot silently fall out of sync.

Families live in the `FAMILIES` list in the script:

| Family | What belongs there |
| --- | --- |
| Card studies | One concept per card, centred square format |
| Labs & tools | Interactive CSS tooling, generators, debuggers |
| Orbit | Spatial workspace exploration |
| Visual studies | Motion, glass, and geometry experiments |

Each entry is `(slug, label, note)`: the directory name, the display name, and
a one-line description of what it explores.
