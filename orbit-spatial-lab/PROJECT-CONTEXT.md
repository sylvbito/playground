# Orbit: project context

## What we are trying to build

Orbit is an experiment in personal AI workspaces.

The premise is that a useful AI workspace should feel less like a chat thread with tools attached and more like a place you can return to. Thoughts should keep their position, related work should gather naturally, and moving through the workspace should help you understand what belongs together.

The product shape is still deliberately unresolved. This prototype exists to test the interaction model before deciding what Orbit should become.

## The problem

Most AI products organise work in one of three ways:

- a chronological chat;
- a document with an assistant beside it;
- a database or canvas with AI commands added on top.

All three can be useful, but they make the AI feel separate from the work. Orbit is exploring whether AI can live inside the workspace itself: noticing relationships, proposing structure and helping with ordinary actions without taking over the interface.

The hard part is avoiding a spatial canvas that is impressive for thirty seconds and exhausting afterwards. Depth, movement and nesting have to carry meaning. If they are only visual effects, the idea falls apart.

## Working principles

### The canvas is a view, not the model

A thought is one object. It may appear in several spaces without becoming several copies. Position, grouping and relationships belong to the workspace model; the canvas is one way of looking at that model.

### Position is part of memory

The workspace should preserve a quiet geography. Returning to a familiar arrangement should reduce the work needed to reconstruct context.

### Depth is semantic

Near objects are active work. Receding objects provide context. Nested spaces represent a bounded area of work rather than another page in a hierarchy.

### Navigation should be continuous

Entering a nested space is an infinite zoom through its portal. Returning to the parent reverses the same movement. It should feel like travelling through one coherent place, not loading a different screen.

### Detail should appear when it is useful

Cards use semantic levels of detail. At a distance they are title landmarks. As they move closer, metadata and working controls are added as complete containers. The card changes size around its contents; the texture must never stretch.

### AI work must remain reviewable

Ambient AI can suggest relationships, groups and summaries, but suggestions are not silent mutations. The person decides what becomes part of the workspace. Every accepted AI action should retain provenance.

### Ordinary actions come first

Creating, editing, selecting, moving, linking, grouping, undoing and returning to a previous view have to feel solid without AI. AI should shorten those workflows, not compensate for weak fundamentals.

## What the current prototype demonstrates

- A spatial HTML workspace rendered through Three.js.
- Editable cards backed by a renderer-independent workspace model.
- Working, context and nested depth planes.
- Multi-selection, lasso, grouped dragging, snapping and alignment guides.
- Labelled relationships between thoughts.
- Converting selected thoughts into a nested space with a portal left behind.
- Continuous portal entry and sustained zoom-out to return to the parent.
- Semantic card LoD with container-based detail changes.
- Reviewable ambient AI proposals and explicit AI commands.
- Persistence, schema migration, undo and redo.
- Native HTML-in-Canvas support with a polyfill and fallback editor.

## What Orbit is not

- A free-flight 3D world that has to be searched manually.
- A conventional whiteboard with AI buttons scattered around it.
- A chat interface disguised as a canvas.
- A system where AI reorganises personal work without consent.
- A finished product direction.

## Questions still worth testing

1. Which information genuinely benefits from spatial memory?
2. When should a relationship be represented by proximity, a line, a group or a nested space?
3. Can the system surface the right area directly without turning navigation into trawling?
4. What should AI notice passively, and what should require an explicit command?
5. How much structure should exist before the workspace starts to feel bureaucratic?
6. Can the same model support focused document work as well as loose thought gathering?
7. What is the smallest real workflow where Orbit is clearly better than chat, search or a normal notes app?

## Useful comparison set

The project sits near tools such as Muse, Milanote, Heptabase, Kosmik, Capacities, Tana and Fabric, along with research into spatial hypertext, semantic zoom and personal knowledge systems. The point is not to reproduce any one of them. They are useful references for testing where cards, documents, graph structure and AI assistance do or do not work.

## Technical map

- `index.html` contains the application shell and card template.
- `styles.css` defines the interface, card states and LoD dimensions.
- `app.js` owns rendering, interaction, navigation and AI proposal presentation.
- `workspace-model.js` owns canonical records, placements, relations, spaces, history and migration.
- `workspace-model.test.mjs` tests the renderer-independent model.

There is no build step. Serve the parent directory over HTTP and open `orbit-spatial-lab/` in a modern browser. The prototype imports Three.js from a CDN.

## Current stance

The overarching idea still feels worth pursuing. The execution should stay provisional. Each iteration needs to prove that the spatial model makes personal work easier to understand or resume. If an interaction is only novel, it should be removed.
