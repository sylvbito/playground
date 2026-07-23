const clone = (value) => structuredClone(value);
const STOP_WORDS = new Set(['the', 'a', 'an', 'and', 'or', 'to', 'of', 'in', 'is', 'it', 'this', 'that', 'with', 'for', 'as', 'be', 'one']);

function nextId(model, prefix) {
  model.sequence = (model.sequence || 0) + 1;
  return `${prefix}-${model.sequence.toString(36)}`;
}

function recordFromCard(card) {
  const { id, space, position, rotation, layer, ...record } = card;
  return { id, type: card.portal ? 'space' : 'card', ...record };
}

function placementFromCard(card) {
  return {
    id: card.id,
    objectId: card.id,
    spaceId: card.space,
    position: [...card.position],
    rotation: [...(card.rotation || [0, 0, 0])],
    layer: card.layer || 'working',
  };
}

function domainSnapshot(model) {
  return clone({
    schemaVersion: model.schemaVersion,
    sequence: model.sequence,
    spaces: model.spaces,
    records: model.records,
    placements: model.placements,
    relations: model.relations,
  });
}

function withHistory(model) {
  return {
    ...domainSnapshot(model),
    history: {
      past: [...(model.history?.past || []), domainSnapshot(model)].slice(-60),
      future: [],
    },
  };
}

function resolveObjectId(model, id) {
  return model.placements.find((placement) => placement.id === id)?.objectId || id;
}

export function createWorkspace({ seedSpaces = [], seedCards = [], persisted = {} } = {}) {
  if (persisted?.schemaVersion === 1 && Array.isArray(persisted.records)) {
    return { ...clone(persisted), history: { past: [], future: [] } };
  }

  const records = seedCards.map(recordFromCard);
  const placements = seedCards.map(placementFromCard);
  for (const placement of placements) {
    if (Array.isArray(persisted.cards?.[placement.id])) placement.position = [...persisted.cards[placement.id]];
  }
  for (const record of records) {
    if (record.editable && typeof persisted.bodies?.[record.id] === 'string') record.body = persisted.bodies[record.id];
  }

  return {
    schemaVersion: 1,
    sequence: 0,
    spaces: clone(seedSpaces),
    records,
    placements,
    relations: [],
    history: { past: [], future: [] },
  };
}

export function materializeCards(model) {
  return model.placements.flatMap((placement) => {
    const record = model.records.find((item) => item.id === placement.objectId);
    if (!record) return [];
    return [{
      ...clone(record),
      id: placement.id,
      objectId: record.id,
      space: placement.spaceId,
      position: [...placement.position],
      rotation: [...placement.rotation],
      layer: placement.layer,
    }];
  });
}

export function dispatch(model, command) {
  const next = withHistory(model);
  const payload = command.payload || {};

  if (command.type === 'card.create') {
    const id = nextId(next, 'card');
    next.records.push({
      id,
      type: 'card',
      kind: payload.kind || 'thought',
      title: payload.title || 'Untitled thought',
      body: payload.body || '',
      footer: payload.footer || '<span class="tag">new thought</span>',
      tone: payload.tone || '',
      editable: true,
      custom: true,
    });
    next.placements.push({
      id,
      objectId: id,
      spaceId: payload.spaceId,
      position: [...payload.position],
      rotation: [...(payload.rotation || [0, 0, 0])],
      layer: payload.layer || 'working',
    });
  }

  if (command.type === 'card.update') {
    const objectId = resolveObjectId(next, payload.id);
    const record = next.records.find((item) => item.id === objectId);
    if (record) {
      if (typeof payload.title === 'string') record.title = payload.title;
      if (typeof payload.body === 'string') record.body = payload.body;
    }
  }

  if (command.type === 'placement.move') {
    for (const [id, position] of Object.entries(payload.positions || {})) {
      const placement = next.placements.find((item) => item.id === id);
      if (placement && Array.isArray(position)) placement.position = [...position];
    }
  }

  if (command.type === 'card.duplicate') {
    for (const placementId of payload.placementIds || []) {
      const sourcePlacement = next.placements.find((item) => item.id === placementId);
      const sourceRecord = next.records.find((item) => item.id === sourcePlacement?.objectId);
      if (!sourcePlacement || !sourceRecord || sourceRecord.portal) continue;
      const id = nextId(next, 'card');
      next.records.push({ ...clone(sourceRecord), id, custom: true });
      const offset = payload.offset || [0.45, -0.45, 0];
      next.placements.push({
        ...clone(sourcePlacement),
        id,
        objectId: id,
        position: sourcePlacement.position.map((value, index) => value + (offset[index] || 0)),
      });
    }
  }

  if (command.type === 'card.delete') {
    const candidates = new Set(payload.placementIds || []);
    const removable = next.placements.filter((placement) => {
      if (!candidates.has(placement.id)) return false;
      const record = next.records.find((item) => item.id === placement.objectId);
      return record && !record.protected && !record.portal;
    });
    const placementIds = new Set(removable.map((item) => item.id));
    const objectIds = new Set(removable.map((item) => item.objectId));
    next.placements = next.placements.filter((item) => !placementIds.has(item.id));
    for (const objectId of objectIds) {
      if (!next.placements.some((item) => item.objectId === objectId)) {
        next.records = next.records.filter((item) => item.id !== objectId);
        next.relations = next.relations.filter((relation) => relation.fromId !== objectId && relation.toId !== objectId);
      }
    }
  }

  if (command.type === 'relation.create') {
    const fromId = resolveObjectId(next, payload.fromId);
    const toId = resolveObjectId(next, payload.toId);
    const label = payload.label || 'related';
    const duplicate = next.relations.some((relation) => relation.spaceId === payload.spaceId &&
      relation.label === label && new Set([relation.fromId, relation.toId, fromId, toId]).size === 2);
    if (fromId && toId && fromId !== toId && !duplicate) {
      next.relations.push({
        id: nextId(next, 'relation'),
        fromId,
        toId,
        spaceId: payload.spaceId,
        type: payload.type || 'manual',
        label,
        actor: command.actor || 'user',
      });
    }
  }

  if (command.type === 'space.createFromCards') {
    const selected = next.placements.filter((placement) => (payload.placementIds || []).includes(placement.id) && placement.spaceId === payload.parentSpaceId);
    if (selected.length) {
      const spaceId = nextId(next, 'space');
      const portalId = nextId(next, 'portal');
      const portalPosition = [...payload.portalPosition];
      const lookZ = portalPosition[2] - 11.6;
      next.spaces.push({
        id: spaceId,
        name: payload.name || 'New space',
        parentId: payload.parentSpaceId,
        kicker: 'NESTED SPACE',
        description: `${selected.length} thoughts gathered into a bounded working space.`,
        camera: [0, 0, lookZ + 12.1],
        look: [0, -0.2, lookZ],
      });
      next.records.push({
        id: portalId,
        type: 'space',
        kind: `space · ${selected.length} cards`,
        title: payload.name || 'New space',
        body: '<div class="portal-preview"><i></i><i></i></div>',
        footer: '<button class="space-action" type="button">Enter space <span aria-hidden="true">↗</span></button>',
        tone: 'green',
        portal: true,
        destinationSpace: spaceId,
        protected: true,
        custom: true,
      });
      next.placements.push({
        id: portalId,
        objectId: portalId,
        spaceId: payload.parentSpaceId,
        position: portalPosition,
        rotation: [0, 0, 0],
        layer: 'portal',
      });
      selected.forEach((placement, index) => {
        const column = index % 2;
        const row = Math.floor(index / 2);
        placement.spaceId = spaceId;
        placement.position = [column ? 2.1 : -2.1, 1.3 - row * 2.6, lookZ + (placement.layer === 'context' ? -1.6 : 1.2)];
        placement.rotation = [0, 0, column ? 0.015 : -0.015];
      });
    }
  }

  return next;
}

export function undo(model) {
  const past = model.history?.past || [];
  if (!past.length) return model;
  const previous = clone(past[past.length - 1]);
  return {
    ...previous,
    history: {
      past: past.slice(0, -1),
      future: [domainSnapshot(model), ...(model.history?.future || [])].slice(0, 60),
    },
  };
}

export function redo(model) {
  const future = model.history?.future || [];
  if (!future.length) return model;
  const next = clone(future[0]);
  return {
    ...next,
    history: {
      past: [...(model.history?.past || []), domainSnapshot(model)].slice(-60),
      future: future.slice(1),
    },
  };
}

function tokens(card) {
  return new Set(`${card.title} ${card.body}`.toLowerCase().match(/[a-z]{3,}/g)?.filter((word) => !STOP_WORDS.has(word)) || []);
}

export function buildAmbientProposals(model, spaceId) {
  const cards = materializeCards(model).filter((card) => card.space === spaceId && !card.portal);
  const proposals = [];
  for (let left = 0; left < cards.length; left += 1) {
    for (let right = left + 1; right < cards.length; right += 1) {
      const a = cards[left];
      const b = cards[right];
      const overlap = [...tokens(a)].filter((token) => tokens(b).has(token));
      const alreadyLinked = model.relations.some((relation) => new Set([relation.fromId, relation.toId, a.objectId, b.objectId]).size === 2);
      if (overlap.length && !alreadyLinked) {
        proposals.push({
          id: `proposal-${a.id}-${b.id}`,
          actor: 'ai',
          status: 'proposed',
          title: `Connect “${a.title}” and “${b.title}”`,
          reason: `Shared language: ${overlap.slice(0, 3).join(', ')}`,
          command: { type: 'relation.create', actor: 'ai', payload: { spaceId, fromId: a.id, toId: b.id, label: 'related' } },
        });
      }
    }
  }
  return proposals.slice(0, 4);
}

export function serialiseWorkspace(model) {
  return JSON.stringify(domainSnapshot(model));
}
