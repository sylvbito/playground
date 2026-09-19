# Orbit DOM workspace prototype PRD

> **For Hermes:** Build this as a new standalone frontend in `orbit-dom-workspace/`. Do not refactor the WebGL prototype into this shape.

**Status:** Ready for implementation  
**Prototype type:** Desktop-first, local-only, fully working frontend  
**Goal:** Test whether a calm 2D spatial workspace helps someone capture, arrange and resume personal work better than a chat thread or document hierarchy.

## 1. Product decision

The WebGL prototype proved that spatial continuity can feel good, but it also made ordinary product work unnecessarily hard. Text editing, selection, accessibility, responsive layout and persistence became rendering problems. Orbit needs to prove the workspace model before it earns a specialised renderer.

This prototype will use normal DOM cards on a pannable 2D surface with an SVG relationship layer. It should combine:

- Kinopio's speed: click anywhere, make a small card, move it, connect it and keep going;
- Heptabase's structure: durable cards, sections, focused editing and separate whiteboards for bounded topics;
- Orbit's contribution: stable spatial memory, one object with multiple placements, and AI that proposes changes instead of silently reorganising work.

It is not a visual clone of Kinopio or Heptabase. They are reference points for the interaction model.

## 2. Product hypothesis

A personal workspace becomes useful when loose capture and deliberate structure can coexist on the same surface.

The prototype should let a person begin with scraps, organise only when the need appears, and return later without reconstructing the whole project. AI should help with the organising step while leaving the layout and final decisions under human control.

The build succeeds if Sylvain can use the dummy workspaces for at least thirty minutes, alter them substantially, reload, and continue without encountering a dead control or needing to understand the implementation.

## 3. Reference behaviour

### Kinopio lessons to keep

Kinopio treats cards as cheap individual thoughts. A user can click to create, drag to move, connect cards directly and select several cards together. The space remains loose until the user adds structure.

Orbit should preserve that low cost of capture. Creating a card must never open a form or ask for a type first.

### Heptabase lessons to keep

Heptabase separates durable cards from their placement on whiteboards. It supports sections for groups of related cards and sub-whiteboards for bounded topics. Richer editing happens in a focused card view rather than forcing every canvas card to become a full editor.

Orbit should use sections as the main organising device and a side inspector for deeper editing.

### What Orbit adds

- The same card can appear in more than one space without duplicating its content.
- Position and viewport are saved because geography is part of recall.
- AI suggestions use the same commands as manual actions.
- AI layout or semantic changes appear as proposals that can be accepted, dismissed and undone.

Reference sources:

- [Kinopio Help](https://help.kinopio.club/)
- [Kinopio: cards and connections](https://help.kinopio.club/posts/creating-cards-and-connections/)
- [Heptabase: fundamental elements](https://wiki.heptabase.com/fundamental-elements)
- [Heptabase: organise knowledge and projects](https://wiki.heptabase.com/organize-knowledge-and-projects)
- [Heptabase: interface logic](https://wiki.heptabase.com/user-interface-logic)

## 4. Intended user

A designer, developer or researcher working alone on projects that begin messily. They collect fragments, sources and questions, then gradually turn those pieces into a direction.

The prototype does not need multi-user roles, onboarding or generic team workflows.

## 5. Core jobs

The user needs to:

1. Capture a thought without choosing where it belongs first.
2. Put related material near each other and have that geography persist.
3. Draw a relationship only when the relationship itself matters.
4. Turn a loose cluster into a named section.
5. Open a card for focused editing without leaving the workspace context.
6. Move between bounded project spaces without navigating a file tree.
7. Ask AI to find patterns, links or summaries in the current selection.
8. Review and undo any structural change suggested by AI.
9. Reload the browser and find the workspace exactly where it was left.

## 6. Experience principles

### Capture first

Double-clicking blank space creates an editable card at that coordinate. The card starts as plain text. Type inference, labels and colours come later and remain optional.

### Structure is earned

Cards can remain loose forever. Sections, connections and secondary spaces appear only when the user creates or accepts them.

### One canvas, two levels of attention

The canvas is for arrangement and scanning. The inspector is for reading and editing a card in depth. Opening the inspector must not replace or dim the canvas.

### Spatial memory over automatic tidying

The system never silently moves cards. AI may preview a proposed section or arrangement, but accepting it is an explicit action and undo restores the previous geometry.

### Direct navigation over trawling

Spaces are available from a sidebar and command menu. Space cards and breadcrumbs provide contextual navigation. No one should have to pan across a huge world to find another project.

### Every visible control works

This is a product prototype, not a presentation mock-up. Buttons that are not implemented should not exist.

## 7. Application structure

### Left rail

Collapsible, 248px wide.

Contains:

- Orbit wordmark;
- workspace switcher;
- Inbox;
- list of spaces with card counts;
- `New space` action;
- `Import / export` action;
- `Reset demo` action at the bottom.

The active space is obvious. Reordering spaces is out of scope.

### Top bar

Contains:

- current space breadcrumb;
- search / command trigger (`Cmd/Ctrl + K`);
- back and forward viewport history;
- undo and redo;
- zoom controls and `Fit all`;
- `New card` action.

### Canvas

The centre of the app. It is a normal DOM world layer transformed by a camera. Cards and sections are absolutely positioned in world coordinates. SVG connectors share the same transform.

### Right inspector

Collapsible, 320px wide.

When one card is selected it shows:

- title;
- body;
- type;
- colour;
- tags;
- spaces in which the card appears;
- linked cards;
- creation and update metadata;
- `Add to another space`, `Duplicate` and `Delete`.

When several cards are selected it shows bulk actions and AI commands.

When nothing is selected it shows space details and the AI proposal queue.

### AI proposal dock

A compact status control at the lower right of the canvas. It opens a review drawer showing proposals one at a time with:

- a plain-language description;
- the affected cards;
- a visual preview on the canvas;
- `Accept`, `Dismiss` and `Why this?`;
- provenance label: `Demo AI`;
- an explicit note that the prototype uses deterministic fixtures.

## 8. Canvas interaction contract

### Creating cards

- Double-click blank canvas: create a card and edit immediately.
- Press `C`: create a card at viewport centre.
- `New card` in the top bar: same behaviour as `C`.
- `Cmd/Ctrl + Enter` saves the inline edit.
- `Escape` cancels a new empty card or exits editing while preserving existing content.

### Selecting

- Click a card: select it.
- Shift-click: add or remove a card from selection.
- Drag on blank canvas: lasso selection.
- `Cmd/Ctrl + A`: select all cards in the active space when focus is on the canvas.
- `Escape`: clear selection.

### Moving

- Drag a selected card: move the complete selection by the same delta.
- Cards snap softly to nearby card edges and centres within an 8px screen-space threshold.
- Alignment guides appear only during a drag.
- The move is recorded as one undoable transaction on pointer-up.
- Dragging cards into or out of a section updates section membership on pointer-up.

### Panning and zooming

- Hold Space and drag: pan.
- Middle-mouse drag: pan.
- Trackpad pinch or `Cmd/Ctrl + wheel`: zoom around the cursor.
- Ordinary wheel: pan according to device delta.
- Zoom range: 35% to 180%.
- `F`: fit selected cards, or fit all if nothing is selected.
- Viewport position and scale persist per space.

Plain mouse drag on empty canvas is reserved for lasso. This avoids panning competing with selection and connection handles.

### Editing

- Double-click a card or press Enter: edit its title inline.
- `Open details` or `Cmd/Ctrl + Enter` on an existing card: focus the body field in the inspector.
- Card body supports plain text with paragraph breaks. Rich text is out of scope.
- Changes write immediately to local state and persist after a short debounce.

### Connecting

- Hover or focus a card to reveal a small connection handle above its edge.
- Drag the handle to another card to create a relation.
- A live SVG curve follows the pointer.
- Droppable cards receive a visible target state.
- Dropping opens a small relation label menu: `related`, `supports`, `references`, `contrasts`.
- Duplicate undirected relations are rejected.
- Selecting a connection shows edit and delete controls.
- Connections appear at full opacity around selected cards and at reduced opacity elsewhere.

### Sections

- Toolbar action `Make section` appears for two or more selected cards.
- Creating a section draws a labelled, softly tinted frame around the cards.
- Section bounds include 32px world-space padding around members.
- The title is immediately editable.
- Dragging the section header moves every member.
- Resizing a section does not scale its cards.
- A card becomes a member when its centre is dropped inside the frame.
- Sections may not nest in this prototype.

### Spaces

- A space is a bounded 2D board with its own viewport.
- New spaces can be created from the left rail or from a selection.
- `Create space from selection` moves the selected placements into a new space and leaves a space card behind.
- Opening a space card navigates to that space using a short 180ms fade and scale transition. This is normal app navigation, not an infinite zoom.
- Breadcrumbs and the left rail always provide a direct route back.
- `Add to another space` creates another placement of the same canonical card.
- Editing either placement updates the one shared card record.

## 9. Semantic levels of detail

LoD remains useful in 2D, but it is tied only to camera scale.

- Above 85%: type, title, excerpt, tags and card actions.
- From 55% to 85%: type, title and one-line excerpt.
- Below 55%: title landmark only.

Each level adds or removes complete DOM containers. The card box animates to its new size over 180ms. Content must not be scaled or stretched. A selected or edited card always uses full detail regardless of zoom.

## 10. Search and command menu

`Cmd/Ctrl + K` opens a combined search and command menu.

Search indexes card title, body, tags, section name and space name. Results show their containing spaces. Choosing a result opens the correct space, restores that space's saved viewport, then pans to and selects the placement.

Commands included in v1:

- create card;
- create space;
- fit all;
- focus selection;
- make section;
- connect selected cards;
- add selected cards to another space;
- run an AI action;
- import JSON;
- export JSON;
- reset demo.

## 11. Demo AI behaviour

No model API is used. The prototype includes deterministic proposal fixtures keyed to the supplied demo records. AI controls are fully interactive and exercise the same domain commands that manual controls use.

### Ambient proposals

Seed at least four proposals:

1. Connect `Homepage hierarchy` to `Clarify what changed` with `supports`.
2. Group `Test the reveal` and `Keep forms visible` into a section named `Interaction experiments`.
3. Add the `Canvas is a view, not the model` card to the `Orbit principles` space as another placement.
4. Flag two deliberately similar research cards as possible duplicates without merging them automatically.

Accepting a proposal dispatches one transaction. Dismissing removes it from the queue. Undoing an accepted proposal restores both workspace state and proposal status.

### Explicit selection actions

- `Find themes`: previews one or more section proposals around the selected cards.
- `Suggest links`: proposes labelled relationships between selected cards.
- `Summarise`: creates a new summary card beside the selection and connects it to the source cards.
- `Make plan`: creates three task cards in a new section beside the selection.

Results are deterministic for the seeded demo. For user-created cards, use simple local rules based on shared tags and words. If no useful result exists, explain that rather than inventing a proposal.

## 12. Dummy data

Ship three spaces. They should feel worked in, not like component samples.

### Website redesign

A project in synthesis mode containing:

- project brief;
- homepage hierarchy;
- existing-site observations;
- three reference cards;
- open questions;
- interaction experiments;
- a `Next decisions` section;
- explicit relationships among evidence, decisions and prototypes.

### Orbit principles

A thinking space containing:

- the canvas is a view, not the model;
- position is part of memory;
- structure is earned;
- AI changes are reviewable;
- unresolved product questions;
- a section for discarded assumptions.

### Research inbox

A looser Kinopio-like capture space containing short notes, source URLs and ungrouped fragments. Some cards should be deliberately redundant so the AI proposal flow has something credible to notice.

Use 30 to 40 records in total. Include different card sizes and enough empty space to make arrangement meaningful.

## 13. Visual direction

The prototype should feel like Orbit without carrying over the WebGL aesthetic.

- 2D warm grey workspace rather than black space.
- White and pale grey cards with a restrained set of dusty accent colours.
- Manrope for interface and card content; IBM Plex Mono for metadata.
- Thin neutral borders and low, crisp shadows.
- Sections use tinted backgrounds at 6% to 10% opacity.
- Selected objects use one lime accent shared with the Orbit mark.
- Connectors are subtle SVG curves, not graph-editor pipes.
- Sidebars are dense and quiet. The canvas remains the main surface.
- Motion is short and functional: 120ms to 220ms. No springy card movement.
- A major visual should be visible on first load: the worked-in Website redesign board, not an empty-state illustration.

Support both light and dark system themes only if doing so does not delay the first playable build. Light mode is the required baseline.

## 14. Data model

```ts
type CardRecord = {
  id: string
  type: 'thought' | 'source' | 'task' | 'space'
  title: string
  body: string
  tags: string[]
  colour: string
  createdAt: string
  updatedAt: string
}

type Placement = {
  id: string
  cardId: string
  spaceId: string
  x: number
  y: number
  width: number
  height: number
  sectionId?: string
}

type SpaceRecord = {
  id: string
  title: string
  description: string
  parentSpaceId?: string
  viewport: { x: number; y: number; scale: number }
}

type SectionRecord = {
  id: string
  spaceId: string
  title: string
  x: number
  y: number
  width: number
  height: number
  colour: string
}

type Relation = {
  id: string
  fromCardId: string
  toCardId: string
  type: 'related' | 'supports' | 'references' | 'contrasts'
}

type Proposal = {
  id: string
  kind: 'relation' | 'section' | 'placement' | 'summary' | 'plan' | 'duplicate'
  status: 'pending' | 'accepted' | 'dismissed'
  title: string
  explanation: string
  affectedCardIds: string[]
  command: DomainCommand
  actor: 'demo-ai'
}
```

All durable changes pass through a command dispatcher. Commands contain an ID, actor, timestamp, transaction ID, payload and inverse operation. Pointer previews and current selection remain transient UI state.

## 15. Frontend architecture

Create a new directory. Do not import renderer code from `orbit-spatial-lab/`.

**Stack:**

- React 19;
- TypeScript;
- Vite;
- Zustand for granular record subscriptions and transient UI state;
- plain CSS with design tokens;
- native Pointer Events;
- SVG connectors;
- localStorage with a versioned schema for prototype persistence;
- Vitest for domain and geometry tests;
- Playwright for interaction regression.

Do not add React Flow, tldraw, Konva, Fabric.js, a rich-text editor, a component kit or an animation library.

### Rendering boundary

- Apply camera pan and scale to one world element with a CSS transform.
- Keep world coordinates independent of scale.
- Position cards with `translate3d(x, y, 0)`.
- Update active drag transforms through refs during pointer movement.
- Commit placement coordinates to the store on pointer-up.
- Measure actual card bounds for connectors and section fitting.
- Do not rerender every card on every camera tick.

### Persistence

- Persist one versioned workspace snapshot under `orbit-dom-workspace-v1`.
- Debounce writes by 250ms.
- Save records, placements, spaces, sections, relations, proposal status and per-space viewports.
- Do not persist hover, selection, drag previews or open menus.
- Provide readable JSON export and import.
- Invalid imports show an error without replacing current state.
- Reset restores the bundled seed exactly.

## 16. Proposed file map

```text
orbit-dom-workspace/
  index.html
  package.json
  tsconfig.json
  vite.config.ts
  src/
    main.tsx
    App.tsx
    styles/
      tokens.css
      global.css
      workspace.css
    domain/
      types.ts
      schema.ts
      seed.ts
      commands.ts
      history.ts
      persistence.ts
      ai-fixtures.ts
    store/
      workspace-store.ts
      selectors.ts
    spatial/
      camera.ts
      geometry.ts
      pointer-session.ts
      SpatialCanvas.tsx
      ConnectorLayer.tsx
      SelectionLayer.tsx
    components/
      AppShell.tsx
      SpaceRail.tsx
      TopBar.tsx
      Card.tsx
      CardInspector.tsx
      SectionFrame.tsx
      CommandMenu.tsx
      AiProposalDock.tsx
      RelationMenu.tsx
      ImportExportDialog.tsx
    tests/
      commands.test.ts
      history.test.ts
      persistence.test.ts
      camera.test.ts
      geometry.test.ts
  e2e/
    workspace.spec.ts
    ai-proposals.spec.ts
    persistence.spec.ts
  PROJECT-CONTEXT.md
  README.md
```

## 17. Implementation sequence

### Phase 1: Domain and shell

1. Scaffold the Vite React TypeScript app.
2. Add tokens and the complete desktop shell.
3. Define schemas and seed data.
4. Implement the command dispatcher, history and versioned persistence.
5. Prove create, edit, undo, redo, reset, export and import through unit tests before adding the canvas.

### Phase 2: Spatial surface

1. Implement world/screen coordinate conversion.
2. Render cards and sections as DOM elements.
3. Add cursor-anchored zoom and Space-to-pan.
4. Add selection, lasso and grouped dragging.
5. Add snapping, guides and fit-selection.
6. Persist and restore the viewport per space.

### Phase 3: Organisation

1. Add the focused inspector.
2. Add section creation, membership and grouped movement.
3. Add SVG relationship creation and editing.
4. Add additional placements across spaces.
5. Add space cards, breadcrumbs and direct space navigation.
6. Add semantic LoD.

### Phase 4: Search and demo AI

1. Add command/search menu.
2. Add proposal queue and canvas previews.
3. Route acceptance through domain commands.
4. Add explicit selection actions.
5. Verify accept, dismiss and undo behaviour.

### Phase 5: Product pass

1. Remove or implement every dead control.
2. Run the complete Playwright suite with physical pointer input.
3. Verify reload, import/export and reset.
4. Test at 1440×900, 1280×800 and 1024×768.
5. Check keyboard-only selection, editing and navigation.
6. Publish the standalone prototype separately from the WebGL study.

## 18. Acceptance criteria

### Capture and editing

- A user can create, title, edit, move, duplicate and delete a card.
- A user-created card survives reload.
- Inline editing and inspector editing update the same record.
- An empty new card disappears when creation is cancelled.

### Spatial behaviour

- Zoom remains anchored to the cursor.
- Space-drag pans without selecting cards.
- Blank drag lassos without panning.
- A grouped drag preserves relative card positions.
- Snapping guides match the final committed coordinates.
- Viewport restores independently for all three spaces.

### Structure

- Selected cards can become a section.
- Moving a section moves its members.
- Dropping a card into or out of a section updates membership.
- Relations attach to measured card bounds while cards move.
- One card can appear in two spaces and edits remain canonical.

### AI simulation

- All seeded proposals can be previewed, accepted, dismissed and undone.
- Accepting a proposal creates the same domain state as the equivalent manual action.
- User-created content receives either a rule-based result or an honest no-result state.
- Nothing moves until the user accepts a proposal.

### Reliability

- Undo and redo cover create, edit, move, delete, section, relation, placement and accepted AI proposal commands.
- Refresh during normal use does not lose the last completed action.
- Invalid imported JSON cannot damage the current workspace.
- Reset returns to a byte-equivalent seed snapshot.
- No visible control is inert.
- Browser console remains free of errors through the complete end-to-end suite.

### Accessibility

- Cards, sections, connections and controls are reachable by keyboard.
- Focus states are visible.
- Canvas shortcuts do not fire while typing.
- Inspector fields have labels.
- Buttons expose useful accessible names.
- `prefers-reduced-motion` removes non-essential transitions.

## 19. Explicit non-goals

- WebGL, Three.js or HTML-in-Canvas.
- Real AI requests, embeddings or vector search.
- Backend, accounts, cloud sync or collaboration.
- Rich text, files, image upload, PDF annotation or web clipping.
- Freehand drawing and mind maps.
- Mobile phone authoring.
- Nested sections.
- Arbitrary card resizing.
- Presentation mode.
- Plugin architecture.

These features can wait until the interaction model proves useful.

## 20. Product questions the prototype should answer

1. Does instant card capture still feel lightweight once sections and inspectors exist?
2. Do sections provide enough structure, or do users need stronger document hierarchy?
3. Are explicit connectors useful often enough to justify their visual weight?
4. Does multiple placement feel powerful or confusing?
5. Is the AI proposal queue easier to trust than a chat assistant?
6. Can the user resume a project from its geography after a day away?
7. Which controls are used naturally during a real session, and which exist only because spatial tools usually have them?

## 21. Definition of done

The repository contains a standalone frontend that opens directly into the seeded Website redesign space. Sylvain can play with every major behaviour using dummy data, reload without losing changes, reset at any time, and inspect AI-assisted organisation without connecting an API.

The WebGL prototype remains available as a separate study. No new Orbit product work depends on it.
