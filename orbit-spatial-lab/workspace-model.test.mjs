import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createWorkspace,
  dispatch,
  materializeCards,
  undo,
  redo,
  buildAmbientProposals,
  serialiseWorkspace,
} from './workspace-model.js';

const seedSpaces = [
  { id: 'root', name: 'Loose thoughts', parentId: null },
  { id: 'project', name: 'Website redesign', parentId: 'root' },
];
const seedCards = [
  { id: 'a', space: 'root', title: 'Design systems need memory', body: 'Position and spatial memory matter.', position: [0, 0, 1], rotation: [0, 0, 0], layer: 'working', editable: true },
  { id: 'b', space: 'root', title: 'Spatial memory model', body: 'The model keeps placement separate.', position: [3, 0, 0], rotation: [0, 0, 0], layer: 'working', editable: true },
  { id: 'portal', space: 'root', title: 'Website redesign', body: '', position: [0, 0, -5], rotation: [0, 0, 0], layer: 'portal', portal: true, destinationSpace: 'project', protected: true },
];

const workspace = () => createWorkspace({ seedSpaces, seedCards });

// Legacy state must survive the schema migration before any new interaction is added.
test('hydrates legacy card positions and edited bodies into records and placements', () => {
  const model = createWorkspace({
    seedSpaces,
    seedCards,
    persisted: { cards: { a: [4, 2, 1] }, bodies: { a: 'Remember this edit.' } },
  });
  const card = materializeCards(model).find((item) => item.id === 'a');
  assert.deepEqual(card.position, [4, 2, 1]);
  assert.equal(card.body, 'Remember this edit.');
});

test('creates a lightweight thought in the active space as one object and one placement', () => {
  const next = dispatch(workspace(), {
    type: 'card.create',
    payload: { spaceId: 'root', title: 'Untitled thought', body: '', position: [1, 2, 1], layer: 'working' },
  });
  const created = materializeCards(next).find((item) => item.custom && item.title === 'Untitled thought');
  assert.ok(created);
  assert.equal(next.records.filter((record) => record.id === created.objectId).length, 1);
  assert.equal(next.placements.filter((placement) => placement.objectId === created.objectId).length, 1);
});

test('duplicates selected cards with new canonical IDs and offset placements', () => {
  const next = dispatch(workspace(), { type: 'card.duplicate', payload: { placementIds: ['a'], offset: [0.5, -0.5, 0] } });
  const cards = materializeCards(next).filter((item) => item.title === 'Design systems need memory');
  assert.equal(cards.length, 2);
  assert.notEqual(cards[0].id, cards[1].id);
  assert.deepEqual(cards.find((item) => item.id !== 'a').position, [0.5, -0.5, 1]);
});

test('deletes ordinary cards and their relations but protects structural portals', () => {
  let model = dispatch(workspace(), { type: 'relation.create', payload: { spaceId: 'root', fromId: 'a', toId: 'b', label: 'supports' } });
  model = dispatch(model, { type: 'card.delete', payload: { placementIds: ['a', 'portal'] } });
  const ids = materializeCards(model).map((card) => card.id);
  assert.ok(!ids.includes('a'));
  assert.ok(ids.includes('portal'));
  assert.equal(model.relations.length, 0);
});

test('deduplicates labelled relations regardless of drag direction', () => {
  let model = dispatch(workspace(), { type: 'relation.create', payload: { spaceId: 'root', fromId: 'a', toId: 'b', label: 'supports' } });
  model = dispatch(model, { type: 'relation.create', payload: { spaceId: 'root', fromId: 'b', toId: 'a', label: 'supports' } });
  assert.equal(model.relations.length, 1);
  assert.equal(model.relations[0].label, 'supports');
});

test('converts selected cards into a bounded child space and leaves a portal behind', () => {
  const next = dispatch(workspace(), {
    type: 'space.createFromCards',
    payload: {
      parentSpaceId: 'root',
      placementIds: ['a', 'b'],
      name: 'Memory system',
      portalPosition: [1.5, 0, -5],
    },
  });
  const child = next.spaces.find((space) => space.name === 'Memory system');
  assert.equal(child.parentId, 'root');
  const cards = materializeCards(next);
  assert.ok(cards.some((card) => card.portal && card.destinationSpace === child.id && card.space === 'root'));
  assert.deepEqual(cards.filter((card) => ['a', 'b'].includes(card.id)).map((card) => card.space), [child.id, child.id]);
});

test('undo and redo restore a whole transaction', () => {
  const created = dispatch(workspace(), {
    type: 'card.create',
    payload: { spaceId: 'root', title: 'Reversible', body: '', position: [0, 0, 0], layer: 'working' },
  });
  assert.equal(materializeCards(created).length, 4);
  const undone = undo(created);
  assert.equal(materializeCards(undone).length, 3);
  const redone = redo(undone);
  assert.equal(materializeCards(redone).length, 4);
});

test('ambient AI proposes reviewable relations without mutating the workspace', () => {
  const model = workspace();
  const before = serialiseWorkspace(model);
  const proposals = buildAmbientProposals(model, 'root');
  assert.ok(proposals.some((proposal) => proposal.command.type === 'relation.create'));
  assert.equal(serialiseWorkspace(model), before);
  assert.ok(proposals.every((proposal) => proposal.actor === 'ai' && proposal.status === 'proposed'));
});
