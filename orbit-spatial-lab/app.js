import * as THREE from 'three';
import { InteractionManager } from 'three/addons/interaction/InteractionManager.js';
import { installHtmlInCanvasPolyfill } from 'three-html-render/polyfill';
import {
  createWorkspace,
  dispatch as dispatchWorkspace,
  materializeCards,
  undo as undoWorkspace,
  redo as redoWorkspace,
  buildAmbientProposals,
  serialiseWorkspace,
} from './workspace-model.js?v=2';

const $ = (selector, root = document) => root.querySelector(selector);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (edge0, edge1, value) => {
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
};
const easeOutCubic = (t) => 1 - (1 - t) ** 3;
const easeInOutQuint = (t) => t < 0.5 ? 16 * t ** 5 : 1 - ((-2 * t + 2) ** 5) / 2;

const nativeHtmlCanvas = 'requestPaint' in HTMLCanvasElement.prototype &&
  'texElementImage2D' in WebGLRenderingContext.prototype;

if (!nativeHtmlCanvas) {
  installHtmlInCanvasPolyfill();
  // three-html-render 0.1.2 exposes the Chrome 150 function arity while
  // implementing the earlier six-argument signature. Tell Three to use it.
  for (const prototype of [WebGLRenderingContext.prototype, WebGL2RenderingContext.prototype]) {
    const method = prototype.texElementImage2D;
    if (method) Object.defineProperty(method, 'length', { value: 6, configurable: true });
  }
}

const spaces = {
  root: {
    name: 'Loose thoughts',
    parentId: null,
    kicker: 'SPACE · 01',
    description: 'Depth is semantic: working thoughts stay near, context recedes, and nested spaces sit beyond.',
    camera: new THREE.Vector3(0, 0, 11.8),
    look: new THREE.Vector3(0, -0.2, -0.7),
  },
  project: {
    name: 'Website redesign',
    parentId: 'root',
    kicker: 'NESTED SPACE · 01.1',
    description: 'A project has emerged from the loose thoughts. The cards remain editable HTML.',
    camera: new THREE.Vector3(0.2, -0.1, -8.2),
    look: new THREE.Vector3(0.1, -0.25, -17.8),
  },
};

const seedCards = [
  {
    id: 'memory', space: 'root', kind: 'thought', title: 'The interface should feel remembered',
    body: 'Position is part of meaning. Returning here should restore the same quiet geography.',
    footer: '<span class="tag">spatial memory</span>', tone: '',
    position: [-4.15, 1.55, 1.8], rotation: [0.03, -0.035, -0.025], layer: 'working', editable: true,
  },
  {
    id: 'portal', space: 'root', kind: 'space · 4 cards', title: 'Website redesign',
    body: '<div class="portal-preview"><i></i><i></i></div>',
    footer: '<button class="space-action" type="button">Enter space <span aria-hidden="true">↗</span></button>', tone: 'green',
    position: [0.05, 0.65, -6.2], rotation: [-0.01, 0.025, 0.012], layer: 'portal', portal: true,
    destinationSpace: 'project', protected: true,
  },
  {
    id: 'model', space: 'root', kind: 'principle', title: 'The canvas is a view, not the model',
    body: 'One thought can appear in several spaces without becoming several thoughts.',
    footer: '<span class="link-chip">2 linked objects</span>', tone: 'blue',
    position: [4.05, 1.45, -3.1], rotation: [0.025, 0.055, 0.018], layer: 'context', editable: true,
  },
  {
    id: 'background-ai', space: 'root', kind: 'direction', title: 'AI in the background',
    body: 'Small assists around ordinary actions; explicit conversation only when it earns the foreground.',
    footer: '<span class="tag">product thesis</span>', tone: 'warm',
    position: [-2.15, -2.05, 0.6], rotation: [-0.02, 0.015, -0.022], layer: 'working', editable: true,
  },
  {
    id: 'question', space: 'root', kind: 'open question', title: 'How much depth is enough?',
    body: 'Use depth to communicate nesting and focus—not to make a desk float in space.',
    footer: '<span class="card-spark" aria-hidden="true"></span>', tone: 'dark',
    position: [2.7, -2.05, -4.4], rotation: [0.02, -0.04, 0.018], layer: 'context', editable: true,
  },
  {
    id: 'brief', space: 'project', kind: 'brief', title: 'Clarify what changed',
    body: 'The new homepage should reveal the service model before it asks for trust.',
    footer: '<span class="tag">priority</span>', tone: '',
    position: [-3.25, 1.25, -15.2], rotation: [0.025, -0.04, -0.015], layer: 'working', editable: true,
  },
  {
    id: 'hierarchy', space: 'project', kind: 'reference', title: 'Homepage hierarchy',
    body: 'Promise → evidence → process → proof → clear next step. No decorative detours.',
    footer: '<span class="link-chip">source · review 03</span>', tone: 'blue',
    position: [0.05, 1.35, -18.1], rotation: [-0.015, 0.02, 0.01], layer: 'context', editable: true,
  },
  {
    id: 'motion', space: 'project', kind: 'prototype', title: 'Test the reveal',
    body: 'Start narrow after navigation, then let the working surface settle into place.',
    footer: '<span class="tag">motion study</span>', tone: 'green',
    position: [3.65, 0.65, -20.3], rotation: [0.015, 0.045, 0.022], layer: 'context', editable: true,
  },
  {
    id: 'decision', space: 'project', kind: 'decision', title: 'Keep forms visible',
    body: 'The action belongs beside the evidence. Do not hide it behind a generated panel.',
    footer: '<span class="tag">accepted</span>', tone: 'warm',
    position: [-0.8, -2.15, -15.9], rotation: [-0.015, -0.025, -0.02], layer: 'working', editable: true,
  },
];

const LEGACY_STORAGE_KEY = 'orbit-spatial-lab-v3';
const STORAGE_KEY = 'orbit-spatial-lab-v4';
const legacyPersisted = loadPersistedState(LEGACY_STORAGE_KEY);
const persisted = loadPersistedState(STORAGE_KEY);
const seedSpaces = Object.entries(spaces).map(([id, space]) => ({
  id,
  name: space.name,
  parentId: space.parentId,
  kicker: space.kicker,
  description: space.description,
  camera: space.camera.toArray(),
  look: space.look.toArray(),
}));
let workspace = createWorkspace({
  seedSpaces,
  seedCards,
  persisted: persisted.workspace || legacyPersisted,
});
for (const space of workspace.spaces) {
  spaces[space.id] = {
    ...spaces[space.id],
    ...space,
    camera: new THREE.Vector3(...space.camera),
    look: new THREE.Vector3(...space.look),
  };
}
const cardData = materializeCards(workspace);
const persistedViews = persisted.views || legacyPersisted.views || {};
const initialViews = Object.fromEntries(workspace.spaces.map((space) => [space.id, {
  pan: new THREE.Vector2(...(persistedViews[space.id]?.pan || [0, 0])),
  zoom: persistedViews[space.id]?.zoom || 0,
  depth: persistedViews[space.id]?.depth || 0,
}]));
const state = {
  space: 'root', selected: null, selectedIds: new Set(), transitioning: false,
  pointer: new THREE.Vector2(), pointerSmooth: new THREE.Vector2(),
  cameraPosition: spaces.root.camera.clone(), cameraLook: spaces.root.look.clone(),
  views: initialViews,
  activeNavigation: 'overview',
  viewTween: null,
  portalZoomProgress: 0,
  portalZoomVisual: 0,
  portalEntryQueued: false,
  portalZoomHinted: false,
  portalHover: false,
  parentZoomProgress: 0,
  parentZoomVisual: 0,
  parentExitQueued: false,
  drag: null,
  panGesture: null,
  lasso: null,
  linkMode: false,
  fallbackEditing: null,
  aiDismissed: new Set(persisted.aiDismissed || []),
  transition: null,
  paintReady: false,
  lodPaintUntil: 0,
};
const restoredRootView = state.views.root;
if (restoredRootView.pan.lengthSq() > 0.001 || Math.abs(restoredRootView.zoom) > 0.001 || Math.abs(restoredRootView.depth) > 0.001) {
  state.activeNavigation = 'free';
}

let renderer;
let camera;
let scene;
let interactions;
let cardMeshes = [];
let connections = [];
let roots = {};
let portalHalo;
let portalProgressHalo;
let portalProgressCap;
let portalProgressStartCap;
let portalPreview;
let toastTimer;

await document.fonts.ready;
init();

function init() {
  const mount = $('#scene');
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.domElement.setAttribute('layoutsubtree', 'true');
  renderer.domElement.setAttribute('aria-label', 'Orbit WebGL spatial workspace');
  renderer.domElement.setAttribute('tabindex', '0');
  mount.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x090a08);
  scene.fog = new THREE.FogExp2(0x090a08, 0.021);

  camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 80);
  camera.position.copy(state.cameraPosition);
  camera.lookAt(state.cameraLook);

  interactions = new InteractionManager();
  interactions.connect(renderer, camera);

  for (const spaceId of Object.keys(spaces)) {
    roots[spaceId] = new THREE.Group();
    roots[spaceId].name = `space-${spaceId}`;
    scene.add(roots[spaceId]);
  }

  addDepthField();
  cardMeshes = cardData.map(createCard);
  renderer.domElement.onpaint = (event) => {
    const changed = event.changedElements || [];
    for (const card of cardMeshes) {
      if (changed.includes(card.userData.element)) {
        card.material.map.needsUpdate = true;
        card.visible = true;
      }
    }
    if (!state.paintReady) {
      state.paintReady = true;
      renderer.setAnimationLoop(render);
    }
  };
  renderer.domElement.requestPaint?.();
  // Painting the hidden DOM subtree is asynchronous. Give the browser one
  // complete frame to record snapshots before Three uploads them to WebGL.
  requestAnimationFrame(() => requestAnimationFrame(() => {
    if (!state.paintReady) {
      state.paintReady = true;
      for (const card of cardMeshes) card.material.map.needsUpdate = true;
      renderer.setAnimationLoop(render);
    }
  }));
  addConnections();
  addPortalHalo();
  addPortalPreview();
  updateSpaceInteractivity();
  updateDepthNavigation();
  setApiState();
  bindUi();

  window.__orbitLab = {
    state,
    camera,
    renderer,
    scene,
    cards: cardMeshes,
    connections,
    get workspace() { return workspace; },
    portalPreview,
    createThought: createThoughtAt,
    duplicateSelection,
    makeSpace: makeSpaceFromSelection,
    deleteSelection,
    undo: () => applyWorkspaceHistory('undo'),
    redo: () => applyWorkspaceHistory('redo'),
    createRelation,
    enterSpace: () => navigateSpace('project'),
    exitSpace: () => navigateSpace('root'),
    select: (id) => selectCard(cardMeshes.find((card) => card.userData.id === id)),
    focus: (id) => focusCard(cardMeshes.find((card) => card.userData.id === id)),
    focusLayer,
    overview: () => focusLayer('overview'),
    zoomAtCursor,
    worldAtPoint: getWorldPointAtScreen,
    cardAtPoint: getCardAtScreenPoint,
    nativeHtmlCanvas,
  };
}

function createCard(data) {
  const element = $('#card-template').content.firstElementChild.cloneNode(true);
  element.dataset.id = data.id;
  if (data.tone) element.dataset.tone = data.tone;
  if (data.id === 'portal') {
    element.addEventListener('pointerenter', () => { state.portalHover = true; });
    element.addEventListener('pointerleave', () => { state.portalHover = false; });
  }
  $('.card-kind', element).textContent = data.kind;
  $('.card-depth', element).textContent = `${data.layer} · z ${data.position[2].toFixed(1)}`;
  $('.card-title', element).textContent = data.title;
  $('.card-body', element).innerHTML = data.editable ? `<p>${escapeHtml(data.body || '')}</p>` : data.body;
  $('.card-footer', element).innerHTML = data.footer + (data.editable ? '<button class="edit-action" type="button">Edit</button>' : '');

  const geometry = new THREE.PlaneGeometry(3.4, 2.14);
  // Pre-attach every element so all HTML textures can upload in the same frame.
  // Three's current lazy-append path is reliable for one texture but can starve siblings.
  renderer.domElement.appendChild(element);
  const texture = new THREE.HTMLTexture(element);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: true,
    opacity: data.space === 'root' ? 1 : 0,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.visible = !state.paintReady;
  mesh.position.fromArray(data.position);
  mesh.rotation.set(...data.rotation);
  mesh.userData = {
    ...data,
    body: data.body,
    element,
    basePosition: mesh.position.clone(),
    baseRotation: mesh.rotation.clone(),
    targetLift: 0,
    semanticLevel: 'full',
    visualSelectionScale: 1,
  };
  roots[data.space].add(mesh);
  interactions.add(mesh);
  if (state.paintReady) {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      mesh.visible = true;
      mesh.material.map.needsUpdate = true;
    }));
  }

  element.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || state.transitioning || state.space !== mesh.userData.space) return;
    if (event.target.closest('button, textarea, input')) return;
    startCardDrag(mesh, event, element);
  });
  element.addEventListener('click', (event) => {
    if (performance.now() < (mesh.userData.suppressClickUntil || 0)) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (state.transitioning || state.space !== mesh.userData.space) return;
    if (state.linkMode && state.selected && state.selected !== mesh.userData.id) {
      createRelation(state.selected, mesh.userData.id, $('#relation-label')?.value || 'related');
      return;
    }
    selectCard(mesh, { additive: event.shiftKey || event.metaKey || event.ctrlKey });
    if (!event.target.closest('button, textarea, input')) element.focus({ preventScroll: true });
  });
  element.addEventListener('keydown', (event) => {
    if ((event.key === 'Enter' || event.key === ' ') && !event.target.closest('textarea, button')) {
      event.preventDefault();
      selectCard(mesh);
    }
    if (event.key === 'Escape' && spaces[mesh.userData.space]?.parentId) navigateSpace(spaces[mesh.userData.space].parentId);
  });

  $('.space-action', element)?.addEventListener('click', (event) => {
    event.stopPropagation();
    navigateSpace(data.destinationSpace || 'project');
  });
  $('.edit-action', element)?.addEventListener('click', (event) => {
    event.stopPropagation();
    beginEdit(mesh);
  });
  element.addEventListener('dblclick', (event) => {
    if (data.editable && !event.target.closest('button, textarea')) beginEdit(mesh);
  });

  return mesh;
}

function syncWorkspaceScene() {
  const selectedBefore = new Set(state.selectedIds);
  for (const space of workspace.spaces) {
    if (!spaces[space.id]) {
      spaces[space.id] = {
        ...space,
        camera: new THREE.Vector3(...space.camera),
        look: new THREE.Vector3(...space.look),
      };
      roots[space.id] = new THREE.Group();
      roots[space.id].name = `space-${space.id}`;
      scene.add(roots[space.id]);
      state.views[space.id] = { pan: new THREE.Vector2(), zoom: 0, depth: 0 };
    }
  }

  const cards = materializeCards(workspace);
  const currentIds = new Set(cards.map((card) => card.id));
  for (const mesh of [...cardMeshes]) {
    if (currentIds.has(mesh.userData.id)) continue;
    interactions.remove?.(mesh);
    mesh.parent?.remove(mesh);
    mesh.userData.element.remove();
    mesh.geometry.dispose();
    mesh.material.map?.dispose();
    mesh.material.dispose();
    cardMeshes.splice(cardMeshes.indexOf(mesh), 1);
  }

  for (const data of cards) {
    let mesh = cardMeshes.find((card) => card.userData.id === data.id);
    if (!mesh) {
      mesh = createCard(data);
      cardMeshes.push(mesh);
      continue;
    }
    if (mesh.userData.space !== data.space) roots[data.space].add(mesh);
    mesh.userData = {
      ...mesh.userData,
      ...data,
      element: mesh.userData.element,
      basePosition: mesh.userData.basePosition,
      baseRotation: mesh.userData.baseRotation,
    };
    mesh.userData.basePosition.fromArray(data.position);
    mesh.position.copy(mesh.userData.basePosition);
    mesh.rotation.set(...data.rotation);
    const element = mesh.userData.element;
    element.dataset.tone = data.tone || '';
    $('.card-depth', element).textContent = `${data.layer} · z ${data.position[2].toFixed(1)}`;
    if (!$('.card-editor', element)) {
      $('.card-title', element).textContent = data.title;
      if (data.editable) $('.card-body', element).innerHTML = `<p>${escapeHtml(data.body || '')}</p>`;
    }
  }

  state.selectedIds = new Set([...selectedBefore].filter((id) => {
    const card = cardMeshes.find((item) => item.userData.id === id);
    return card?.userData.space === state.space;
  }));
  refreshSelectionVisuals();
  rebuildConnections();
  updateSpaceInteractivity();
  updateDepthNavigation();
  renderAiProposals();
  renderer.domElement.requestPaint?.();
}

function executeWorkspaceCommand(command, message) {
  workspace = dispatchWorkspace(workspace, command);
  syncWorkspaceScene();
  persistSpatialState();
  if (message) showToast(message);
}

function createThoughtAt(clientX = window.innerWidth / 2, clientY = window.innerHeight / 2) {
  if (state.transitioning) return;
  const depth = spaces[state.space].look.z + state.views[state.space].depth + 1.2;
  const point = getWorldPointAtScreen(clientX, clientY, depth) || spaces[state.space].look.clone();
  const before = new Set(workspace.placements.map((placement) => placement.id));
  workspace = dispatchWorkspace(workspace, {
    type: 'card.create',
    payload: {
      spaceId: state.space,
      title: 'Untitled thought',
      body: '',
      position: [clamp(point.x, -11, 11), clamp(point.y, -6.5, 6.5), depth],
      layer: 'working',
    },
  });
  const createdId = workspace.placements.find((placement) => !before.has(placement.id))?.id;
  syncWorkspaceScene();
  persistSpatialState();
  const mesh = cardMeshes.find((card) => card.userData.id === createdId);
  if (mesh) {
    selectCard(mesh);
    beginEdit(mesh);
  }
  showToast('New thought · type to capture');
}

function duplicateSelection() {
  const ids = [...state.selectedIds];
  if (!ids.length) return;
  const before = new Set(workspace.placements.map((placement) => placement.id));
  workspace = dispatchWorkspace(workspace, { type: 'card.duplicate', payload: { placementIds: ids } });
  const created = workspace.placements.filter((placement) => !before.has(placement.id)).map((placement) => placement.id);
  syncWorkspaceScene();
  for (const id of created) {
    const mesh = cardMeshes.find((card) => card.userData.id === id);
    if (mesh) selectCard(mesh, { additive: state.selectedIds.size > 0 });
  }
  persistSpatialState();
  showToast(`${created.length} ${created.length === 1 ? 'thought' : 'thoughts'} duplicated`);
}

function deleteSelection() {
  const ids = [...state.selectedIds];
  if (!ids.length) return;
  const removable = ids.filter((id) => !cardMeshes.find((card) => card.userData.id === id)?.userData.portal);
  executeWorkspaceCommand({ type: 'card.delete', payload: { placementIds: ids } },
    removable.length ? `${removable.length} ${removable.length === 1 ? 'thought' : 'thoughts'} deleted` : 'Spaces are structural; move or rename them instead');
}

function makeSpaceFromSelection() {
  const ids = [...state.selectedIds].filter((id) => !cardMeshes.find((card) => card.userData.id === id)?.userData.portal);
  if (!ids.length) return;
  const selectedCards = ids.map((id) => cardMeshes.find((card) => card.userData.id === id)).filter(Boolean);
  const words = selectedCards[0].userData.title.split(/\s+/).slice(0, 3).join(' ');
  const name = selectedCards.length === 1 ? words : `${words} + ${selectedCards.length - 1}`;
  const center = selectedCards.reduce((sum, card) => sum.add(card.userData.basePosition), new THREE.Vector3()).multiplyScalar(1 / selectedCards.length);
  const portalDepth = spaces[state.space].look.z - 5.5;
  const occupied = cardMeshes.filter((card) => card.userData.space === state.space && !ids.includes(card.userData.id));
  const candidates = [
    [center.x, center.y],
    [6, -4.8],
    [-6, -4.8],
    [6, 4.4],
    [-6, 4.4],
    [0, -5.2],
  ];
  const openPosition = candidates.find(([x, y]) =>
    occupied.every((card) => Math.hypot(card.userData.basePosition.x - x, card.userData.basePosition.y - y) >= 4.1),
  ) || candidates.at(-1);
  const portalPosition = new THREE.Vector3(openPosition[0], openPosition[1], portalDepth);
  workspace = dispatchWorkspace(workspace, {
    type: 'space.createFromCards',
    payload: {
      parentSpaceId: state.space,
      placementIds: ids,
      name,
      portalPosition: portalPosition.toArray(),
    },
  });
  syncWorkspaceScene();
  persistSpatialState();
  showToast(`Created space · ${name}`);
}

function createRelation(fromId, toId, label = 'related') {
  const before = workspace.relations.length;
  workspace = dispatchWorkspace(workspace, {
    type: 'relation.create',
    payload: { spaceId: state.space, fromId, toId, label },
  });
  state.linkMode = false;
  syncWorkspaceScene();
  persistSpatialState();
  showToast(workspace.relations.length > before ? `${label} relationship added` : 'That relationship already exists');
}

function updateSelectionToolbar() {
  const toolbar = $('#selection-toolbar');
  if (!toolbar) return;
  const count = state.selectedIds.size;
  toolbar.hidden = count === 0 || state.transitioning;
  $('#selection-count').textContent = `${count} selected`;
  $('#link-selection').textContent = count >= 2 ? 'Link selected' : state.linkMode ? 'Choose target…' : 'Link';
  $('#make-space').disabled = count === 0;
  toolbar.classList.toggle('is-linking', state.linkMode);
}

function applyWorkspaceHistory(direction) {
  const next = direction === 'undo' ? undoWorkspace(workspace) : redoWorkspace(workspace);
  if (next === workspace) {
    showToast(`Nothing to ${direction}`);
    return;
  }
  workspace = next;
  syncWorkspaceScene();
  persistSpatialState();
  showToast(direction === 'undo' ? 'Undid last change' : 'Redid last change');
}

function renderAiProposals() {
  const root = $('#ai-proposals');
  if (!root) return;
  const proposals = buildAmbientProposals(workspace, state.space)
    .filter((proposal) => !state.aiDismissed.has(proposal.id));
  $('#ai-count').textContent = proposals.length;
  $('#ai-summary').textContent = proposals.length ? `${proposals.length} reviewable ${proposals.length === 1 ? 'proposal' : 'proposals'}` : 'No pending proposals';
  root.replaceChildren();
  if (!proposals.length) {
    root.innerHTML = '<p class="ai-empty">No obvious relationship is being forced. Add more thoughts or select a few to ask explicitly.</p>';
    return;
  }
  for (const proposal of proposals) {
    const item = document.createElement('article');
    item.className = 'ai-proposal';
    item.innerHTML = `<div><strong>${escapeHtml(proposal.title)}</strong><small>${escapeHtml(proposal.reason)}</small></div><menu><button type="button" data-apply>Apply</button><button type="button" data-dismiss>×</button></menu>`;
    $('[data-apply]', item).addEventListener('click', () => {
      executeWorkspaceCommand(proposal.command, 'AI proposal applied · undo remains available');
    });
    $('[data-dismiss]', item).addEventListener('click', () => {
      state.aiDismissed.add(proposal.id);
      persistSpatialState();
      renderAiProposals();
    });
    root.appendChild(item);
  }
}

function handleAiCommand(value) {
  const command = value.trim().toLowerCase();
  if (!command) return;
  if ((command.includes('connect') || command.includes('link')) && state.selectedIds.size >= 2) {
    const [fromId, toId] = [...state.selectedIds];
    createRelation(fromId, toId, $('#relation-label').value);
    return;
  }
  if ((command.includes('space') || command.includes('group') || command.includes('cluster')) && state.selectedIds.size) {
    makeSpaceFromSelection();
    return;
  }
  const cards = cardMeshes.filter((card) => card.userData.space === state.space && !card.userData.portal);
  const relations = workspace.relations.filter((relation) => relation.spaceId === state.space);
  if (command.includes('summar') || command.includes('what')) {
    showToast(`${spaces[state.space].name}: ${cards.length} thoughts · ${relations.length} explicit links`);
    return;
  }
  showToast('Try “connect selection”, “make a space”, or “summarise this space”');
}

function startCardDrag(mesh, event, captureTarget = renderer.domElement) {
  state.drag = {
    mesh,
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    lastX: event.clientX,
    lastY: event.clientY,
    moved: false,
  };
  captureTarget.setPointerCapture?.(event.pointerId);
}

function beginEdit(mesh) {
  if (state.transitioning) return;
  selectCard(mesh);
  if (!nativeHtmlCanvas) {
    state.fallbackEditing = mesh.userData.id;
    document.documentElement.classList.add('is-fallback-editing');
    $('#fallback-title').value = mesh.userData.title;
    $('#fallback-body').value = mesh.userData.body.replace(/<[^>]+>/g, '').trim();
    $('#fallback-editor').hidden = false;
    $('#fallback-title').focus();
    $('#fallback-title').select();
    return;
  }
  const { element } = mesh.userData;
  const body = $('.card-body', element);
  const title = $('.card-title', element);
  const footer = $('.card-footer', element);
  if ($('.card-editor', element)) return;

  const current = mesh.userData.body.replace(/<[^>]+>/g, '').trim();
  const currentTitle = mesh.userData.title;
  title.innerHTML = `<input class="card-title-editor" aria-label="Thought title" value="${escapeHtml(currentTitle)}">`;
  body.innerHTML = `<textarea class="card-editor" aria-label="Edit ${escapeHtml(currentTitle)}">${escapeHtml(current)}</textarea>`;
  footer.innerHTML = '<button class="done-action" type="button">Save thought</button>';
  const titleEditor = $('.card-title-editor', element);
  const editor = $('.card-editor', element);
  titleEditor.focus();
  titleEditor.select();

  const save = () => {
    const value = editor.value.trim() || 'An unwritten thought.';
    const nextTitle = titleEditor.value.trim() || 'Untitled thought';
    commitCardEdit(mesh, nextTitle, value);
    title.textContent = nextTitle;
    body.innerHTML = `<p>${escapeHtml(value)}</p>`;
    footer.innerHTML = `${mesh.userData.footer}<button class="edit-action" type="button">Edit</button>`;
    $('.edit-action', footer).addEventListener('click', (event) => {
      event.stopPropagation();
      beginEdit(mesh);
    });
    renderer.domElement.requestPaint?.();
    element.focus({ preventScroll: true });
  };

  $('.done-action', footer).addEventListener('click', (event) => {
    event.stopPropagation();
    save();
  });
  for (const input of [titleEditor, editor]) {
    input.addEventListener('keydown', (event) => {
      event.stopPropagation();
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') save();
    });
  }
  renderer.domElement.requestPaint?.();
}

function commitCardEdit(mesh, nextTitle, value) {
  mesh.userData.title = nextTitle;
  mesh.userData.body = value;
  workspace = dispatchWorkspace(workspace, {
    type: 'card.update',
    payload: { id: mesh.userData.id, title: nextTitle, body: value },
  });
  persistSpatialState();
  renderer.domElement.requestPaint?.();
  showToast('Thought updated locally');
}

function closeFallbackEditor() {
  state.fallbackEditing = null;
  document.documentElement.classList.remove('is-fallback-editing');
  $('#fallback-editor').hidden = true;
}

function selectCard(mesh, { additive = false } = {}) {
  if (!mesh || state.space !== mesh.userData.space) return;
  if (additive) {
    if (state.selectedIds.has(mesh.userData.id)) state.selectedIds.delete(mesh.userData.id);
    else state.selectedIds.add(mesh.userData.id);
  } else {
    state.selectedIds = new Set([mesh.userData.id]);
  }
  state.selected = state.selectedIds.has(mesh.userData.id)
    ? mesh.userData.id
    : [...state.selectedIds].at(-1) || null;
  $('#focus-selected').hidden = !state.selected;
  for (const card of cardMeshes) {
    const active = state.selectedIds.has(card.userData.id);
    card.userData.element.classList.toggle('is-selected', active);
    card.userData.targetLift = active ? 0.48 : 0;
    if (active) setSemanticLevel(card, 'full');
  }
  updateSelectionToolbar();
  renderer.domElement.requestPaint?.();
}

function refreshSelectionVisuals() {
  state.selected = state.selectedIds.has(state.selected)
    ? state.selected
    : [...state.selectedIds].at(-1) || null;
  $('#focus-selected').hidden = !state.selected;
  for (const card of cardMeshes) {
    const active = state.selectedIds.has(card.userData.id);
    card.userData.element.classList.toggle('is-selected', active);
    card.userData.targetLift = active ? 0.48 : 0;
    if (active) setSemanticLevel(card, 'full');
  }
  updateSelectionToolbar();
  renderer.domElement.requestPaint?.();
}

function navigateSpace(destination) {
  if (state.transitioning || destination === state.space || !spaces[destination]) return;
  const from = state.space;
  const entering = spaces[destination].parentId === from;
  const portal = entering
    ? cardMeshes.find((card) => card.userData.space === from && card.userData.destinationSpace === destination)
    : cardMeshes.find((card) => card.userData.space === destination && card.userData.destinationSpace === from);
  state.viewTween = null;
  state.transitioning = true;
  state.transition = {
    from,
    to: destination,
    entering,
    portalId: portal?.userData.id || null,
    start: performance.now(),
    duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 80 : 1900,
    fromPosition: camera.position.clone(),
    fromLook: state.cameraLook.clone(),
  };

  clearSelection();
  document.documentElement.classList.add('is-space-transitioning');
  $('.space-caption').classList.add('is-transitioning');
  $('#back-space').disabled = true;
  setGroupPointerEvents(from, false);
  setGroupPointerEvents(destination, false);

  window.setTimeout(() => {
    updateCaption(destination);
    updateDepthNavigation(destination);
    $('#back-space').hidden = !spaces[destination].parentId;
  }, state.transition.duration * 0.54);
}

function finishNavigation(destination) {
  const previous = state.transition?.from;
  if (previous) setSpaceOpacity(previous, 0);
  setSpaceOpacity(destination, 1);
  state.space = destination;
  state.transitioning = false;
  state.transition = null;
  state.portalZoomProgress = 0;
  state.portalEntryQueued = false;
  state.portalZoomHinted = false;
  state.parentZoomProgress = 0;
  state.parentZoomVisual = 0;
  state.parentExitQueued = false;
  updatePortalProgressHalo();
  updateParentZoomIndicator();
  const view = state.views[destination];
  state.activeNavigation = view.pan.lengthSq() < 0.001 && Math.abs(view.zoom) < 0.001 && Math.abs(view.depth) < 0.001
    ? 'overview' : 'free';
  state.cameraPosition.copy(getViewCamera(destination));
  state.cameraLook.copy(getViewLook(destination));
  updateSpaceInteractivity();
  updateDepthNavigation();
  renderAiProposals();
  $('#back-space').disabled = false;
  document.documentElement.classList.remove('is-space-transitioning');
  $('.space-caption').classList.remove('is-transitioning');
  showToast(`${spaces[destination].parentId ? 'Entered' : 'Returned to'} ${spaces[destination].name}`);
}

function updateCaption(spaceId) {
  const target = spaces[spaceId];
  $('#space-name').textContent = target.name;
  $('#space-kicker').textContent = target.kicker;
  $('#space-title').textContent = target.name;
  $('#space-description').textContent = target.description;
  const parent = target.parentId ? spaces[target.parentId] : null;
  $('#back-label').textContent = parent ? `Zoom out to ${parent.name}` : 'Zoom out to parent';
}

function clearSelection() {
  state.selected = null;
  state.selectedIds.clear();
  state.linkMode = false;
  $('#focus-selected').hidden = true;
  for (const card of cardMeshes) {
    card.userData.element.classList.remove('is-selected');
    card.userData.targetLift = 0;
  }
  updateSelectionToolbar();
  renderer.domElement.requestPaint?.();
}

function updateSpaceInteractivity() {
  for (const card of cardMeshes) {
    const active = card.userData.space === state.space;
    card.userData.element.style.pointerEvents = active ? 'auto' : 'none';
    card.userData.element.tabIndex = active ? 0 : -1;
  }
}

function setGroupPointerEvents(spaceId, enabled) {
  for (const card of cardMeshes.filter((item) => item.userData.space === spaceId)) {
    card.userData.element.style.pointerEvents = enabled ? 'auto' : 'none';
  }
}

function addDepthField() {
  const count = 280;
  const positions = new Float32Array(count * 3);
  let seed = 41;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  for (let i = 0; i < count; i += 1) {
    positions[i * 3] = (random() - 0.5) * 30;
    positions[i * 3 + 1] = (random() - 0.5) * 18;
    positions[i * 3 + 2] = 7 - random() * 42;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: 0x74856f, size: 0.025, transparent: true, opacity: 0.42, sizeAttenuation: true,
  });
  const points = new THREE.Points(geometry, material);
  points.name = 'depth-field';
  scene.add(points);

  const rails = new THREE.Group();
  for (let i = -3; i <= 3; i += 1) {
    const geometryLine = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(i * 3.4, -6, 4), new THREE.Vector3(i * 3.4, -6, -32),
    ]);
    rails.add(new THREE.Line(geometryLine, new THREE.LineBasicMaterial({
      color: 0x3e493a, transparent: true, opacity: i === 0 ? 0.18 : 0.08,
    })));
  }
  scene.add(rails);
}

function addConnections() {
  addCurve('root', 'memory', 'portal', 0x8fb184, 0.28);
  addCurve('root', 'portal', 'model', 0x8fb184, 0.2);
  addCurve('root', 'background-ai', 'portal', 0xc5b181, 0.16);
  addCurve('project', 'brief', 'hierarchy', 0x93b08a, 0.22);
  addCurve('project', 'hierarchy', 'motion', 0x86afbe, 0.2);
  addCurve('project', 'decision', 'hierarchy', 0xc3aa82, 0.18);
  for (const relation of workspace.relations) {
    addCurve(relation.spaceId, relation.fromId, relation.toId, 0xd9ff79, 0.5, relation.label, relation.id);
  }
}

function rebuildConnections() {
  for (const connection of connections) {
    connection.line.parent?.remove(connection.line);
    connection.line.geometry.dispose();
    connection.line.material.dispose();
    if (connection.label) {
      connection.label.parent?.remove(connection.label);
      connection.label.material.map?.dispose();
      connection.label.material.dispose();
    }
  }
  connections.splice(0);
  addConnections();
}

function createRelationLabel(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const context = canvas.getContext('2d');
  context.fillStyle = 'rgba(13, 16, 11, .86)';
  context.roundRect(12, 10, 232, 44, 15);
  context.fill();
  context.strokeStyle = 'rgba(217, 255, 121, .38)';
  context.stroke();
  context.fillStyle = '#e4f8b8';
  context.font = '500 21px IBM Plex Mono, monospace';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, 128, 32);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
  sprite.scale.set(1.7, 0.43, 1);
  sprite.renderOrder = 7;
  return sprite;
}

function addCurve(spaceId, fromId, toId, color, opacity, labelText = '', relationId = null) {
  const from = cardMeshes.find((card) => card.userData.id === fromId || card.userData.objectId === fromId);
  const to = cardMeshes.find((card) => card.userData.id === toId || card.userData.objectId === toId);
  if (!from || !to || from.userData.space !== spaceId || to.userData.space !== spaceId || !roots[spaceId]) return;
  const geometry = new THREE.BufferGeometry();
  const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity });
  const line = new THREE.Line(geometry, material);
  line.renderOrder = 2;
  roots[spaceId].add(line);
  const label = labelText ? createRelationLabel(labelText) : null;
  if (label) roots[spaceId].add(label);
  const connection = { spaceId, from, to, line, label, relationId, baseOpacity: opacity };
  connections.push(connection);
  updateConnection(connection);
}

function updateConnection({ from, to, line, label }) {
  const middle = from.position.clone().lerp(to.position, 0.5);
  middle.z -= 0.42;
  middle.y += 0.2;
  const curve = new THREE.QuadraticBezierCurve3(from.position.clone(), middle, to.position.clone());
  line.geometry.setFromPoints(curve.getPoints(36));
  line.geometry.attributes.position.needsUpdate = true;
  line.geometry.computeBoundingSphere();
  if (label) label.position.copy(middle).add(new THREE.Vector3(0, 0.18, 0.08));
}

function updateConnections() {
  for (const connection of connections) updateConnection(connection);
}

function addPortalHalo() {
  const geometry = new THREE.RingGeometry(2.15, 2.19, 96);
  const material = new THREE.MeshBasicMaterial({
    color: 0xb8f3a4, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false,
  });
  portalHalo = new THREE.Mesh(geometry, material);
  portalHalo.name = 'portal-halo';
  const portal = cardMeshes.find((card) => card.userData.id === 'portal');
  portalHalo.position.copy(portal?.userData.basePosition || new THREE.Vector3(0.05, 0.65, -6.2));
  portalHalo.position.z -= 0.12;

  const progressSegments = 128;
  const progressGeometry = new THREE.RingGeometry(2.08, 2.25, progressSegments, 1, Math.PI / 2, -Math.PI * 2);
  const arcProgress = new Float32Array(progressGeometry.attributes.position.count);
  for (let index = 0; index < arcProgress.length; index += 1) {
    arcProgress[index] = (index % (progressSegments + 1)) / progressSegments;
  }
  progressGeometry.setAttribute('arcProgress', new THREE.BufferAttribute(arcProgress, 1));

  portalProgressHalo = new THREE.Mesh(
    progressGeometry,
    new THREE.ShaderMaterial({
      uniforms: {
        uProgress: { value: 0 },
        uOpacity: { value: 0 },
      },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      vertexShader: `
        attribute float arcProgress;
        varying float vArc;
        void main() {
          vArc = arcProgress;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uProgress;
        uniform float uOpacity;
        varying float vArc;
        void main() {
          if (vArc > uProgress) discard;
          vec3 colour = vec3(0.84, 1.0, 0.48);
          gl_FragColor = vec4(colour, uOpacity * 0.94);
        }
      `,
    }),
  );
  portalProgressHalo.name = 'portal-progress';
  portalProgressHalo.position.z = 0.018;
  portalProgressHalo.renderOrder = 8;
  portalHalo.add(portalProgressHalo);

  const capGeometry = new THREE.CircleGeometry(0.085, 24);
  const capMaterial = new THREE.MeshBasicMaterial({
    color: 0xe2ff91, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false,
  });
  portalProgressCap = new THREE.Mesh(capGeometry, capMaterial);
  portalProgressCap.name = 'portal-progress-cap';
  portalProgressCap.position.z = 0.02;
  portalProgressCap.renderOrder = 9;
  portalProgressStartCap = new THREE.Mesh(capGeometry.clone(), capMaterial.clone());
  portalProgressStartCap.name = 'portal-progress-start-cap';
  portalProgressStartCap.position.set(0, 2.165, 0.02);
  portalProgressStartCap.renderOrder = 9;
  portalHalo.add(portalProgressStartCap, portalProgressCap);
  roots.root.add(portalHalo);
}

function updatePortalProgressHalo() {
  if (!portalProgressHalo) return;
  const active = state.portalZoomProgress > 0;
  $('.depth-nav').classList.toggle('has-portal-intent', active);
  if (active && state.space === 'root') {
    $('#depth-readout').textContent = state.portalEntryQueued
      ? 'Entering…'
      : `Portal ${Math.round(state.portalZoomProgress * 100)}%`;
  } else {
    updateDepthNavigation();
  }
}

function resetParentZoomIntent() {
  state.parentZoomProgress = 0;
  state.parentExitQueued = false;
  updateParentZoomIndicator();
}

function updateParentZoomIndicator() {
  const button = $('#back-space');
  if (!button) return;
  const progress = clamp(state.parentZoomVisual, 0, 1);
  button.style.setProperty('--parent-progress', progress.toFixed(3));
  button.classList.toggle('has-exit-intent', progress > 0.01);
  const parent = spaces[state.space]?.parentId ? spaces[spaces[state.space].parentId] : null;
  button.setAttribute('aria-label', parent
    ? `${state.parentExitQueued ? 'Returning to' : 'Zoom out to'} ${parent.name}`
    : 'Zoom out to parent space');
}

function updateParentZoomVisual() {
  const smoothing = state.parentZoomProgress > state.parentZoomVisual ? 0.18 : 0.12;
  state.parentZoomVisual = lerp(state.parentZoomVisual, state.parentZoomProgress, smoothing);
  if (Math.abs(state.parentZoomVisual - state.parentZoomProgress) < 0.001) {
    state.parentZoomVisual = state.parentZoomProgress;
  }
  updateParentZoomIndicator();
  if (state.parentExitQueued && !state.transition && state.parentZoomVisual >= 0.965) {
    const childView = state.views[state.space];
    childView.zoom = 0;
    navigateSpace(spaces[state.space].parentId);
  }
}

function addPortalPreview() {
  const portal = cardMeshes.find((card) => card.userData.id === 'portal');
  const projectCards = cardMeshes.filter((card) => card.userData.space === 'project');
  if (!portal || !projectCards.length) return;

  const previewScene = new THREE.Scene();
  previewScene.background = new THREE.Color(0x172216);
  const previewCamera = new THREE.PerspectiveCamera(34, 3.9, 0.1, 30);
  previewCamera.position.set(0, 0, 10.5);
  previewCamera.lookAt(0, -0.15, 0);

  const target = new THREE.WebGLRenderTarget(768, 196, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: true,
  });
  target.texture.colorSpace = THREE.SRGBColorSpace;

  const clones = projectCards.map((source) => {
    const material = new THREE.MeshBasicMaterial({
      map: source.material.map,
      transparent: true,
      opacity: 1,
      side: THREE.DoubleSide,
      depthWrite: true,
    });
    const clone = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2.14), material);
    clone.scale.setScalar(0.44);
    clone.userData.source = source;
    previewScene.add(clone);
    return clone;
  });

  const material = new THREE.MeshBasicMaterial({ map: target.texture, transparent: true, depthWrite: false });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2.72, 0.7), material);
  mesh.position.set(0, -0.28, 0.026);
  mesh.renderOrder = 4;
  portal.add(mesh);
  portalPreview = { scene: previewScene, camera: previewCamera, target, mesh, clones };
}

function renderPortalPreview() {
  if (!portalPreview) return;
  for (const clone of portalPreview.clones) {
    const source = clone.userData.source;
    clone.position.set(
      source.userData.basePosition.x * 0.72,
      source.userData.basePosition.y * 0.68,
      (source.userData.basePosition.z + 17.8) * 0.2,
    );
  }
  renderer.setRenderTarget(portalPreview.target);
  renderer.render(portalPreview.scene, portalPreview.camera);
  renderer.setRenderTarget(null);
}

function updateDepthNavigation(spaceId = state.space) {
  const labels = spaceId === 'root'
    ? {
      working: ['Working plane', 'Active thoughts'],
      context: ['Context', 'Principles + questions'],
      portal: ['Nested space', 'Live project portal'],
    }
    : {
      working: ['Working plane', 'Brief + decision'],
      context: ['Context', 'Reference + prototype'],
      portal: ['Nested space', 'No deeper space yet'],
    };

  for (const button of document.querySelectorAll('[data-depth]')) {
    const layer = button.dataset.depth;
    const cards = layer === 'overview'
      ? cardMeshes.filter((card) => card.userData.space === spaceId)
      : cardMeshes.filter((card) => card.userData.space === spaceId && card.userData.layer === layer);
    if (layer === 'portal') button.hidden = cards.length === 0;
    if (layer !== 'overview') {
      const [title, fallback] = labels[layer];
      $('span', button).firstChild.textContent = title;
      $('small', button).textContent = cards.length ? `${cards.length} ${cards.length === 1 ? 'card' : 'cards'}` : fallback;
    }
    button.setAttribute('aria-current', String(layer === state.activeNavigation));
  }
  const readout = $('#depth-readout');
  readout.textContent = state.activeNavigation === 'free'
    ? 'Free view'
    : state.activeNavigation === 'focus'
      ? 'Focused'
      : state.activeNavigation[0].toUpperCase() + state.activeNavigation.slice(1);
}

function focusLayer(layerId) {
  if (state.transitioning) return;
  resetParentZoomIntent();
  state.parentZoomVisual = 0;
  state.portalZoomProgress = 0;
  state.portalEntryQueued = false;
  state.portalZoomHinted = false;
  updatePortalProgressHalo();
  if (layerId === 'overview') {
    animateViewTo({ pan: new THREE.Vector2(0, 0), zoom: 0, depth: 0 }, 'overview');
    clearSelection();
    showToast('Overview restored');
    return;
  }
  const cards = cardMeshes.filter((card) => card.userData.space === state.space && card.userData.layer === layerId);
  if (!cards.length) return;
  const center = cards.reduce((sum, card) => sum.add(card.userData.basePosition), new THREE.Vector3()).multiplyScalar(1 / cards.length);
  const lookBase = spaces[state.space].look;
  animateViewTo({
    pan: new THREE.Vector2(center.x - lookBase.x, center.y - lookBase.y),
    zoom: layerId === 'portal' ? -3.1 : -2.35,
    depth: center.z - lookBase.z,
  }, layerId);
  clearSelection();
  showToast(`${layerId === 'portal' ? 'Nested space' : layerId} layer`);
}

function focusCard(mesh) {
  if (!mesh || mesh.userData.space !== state.space || state.transitioning) return;
  selectCard(mesh);
  const target = mesh.userData.basePosition;
  const lookBase = spaces[state.space].look;
  animateViewTo({
    pan: new THREE.Vector2(target.x - lookBase.x, target.y - lookBase.y),
    zoom: -5,
    depth: target.z - lookBase.z,
  }, 'focus');
  showToast(`Focused · ${mesh.userData.title}`);
}

function animateViewTo(target, navigation) {
  const view = state.views[state.space];
  state.pointer.set(0, 0);
  state.viewTween = {
    space: state.space,
    start: performance.now(),
    duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 1 : 720,
    from: { pan: view.pan.clone(), zoom: view.zoom, depth: view.depth },
    to: target,
  };
  state.activeNavigation = navigation;
  updateDepthNavigation();
}

function updateViewTween(time) {
  const tween = state.viewTween;
  if (!tween || tween.space !== state.space) return;
  const raw = clamp((time - tween.start) / tween.duration, 0, 1);
  const eased = easeInOutQuint(raw);
  const view = state.views[state.space];
  view.pan.lerpVectors(tween.from.pan, tween.to.pan, eased);
  view.zoom = lerp(tween.from.zoom, tween.to.zoom, eased);
  view.depth = lerp(tween.from.depth, tween.to.depth, eased);
  if (raw >= 1) {
    state.viewTween = null;
    persistSpatialState();
  }
}

function markFreeNavigation() {
  state.viewTween = null;
  state.portalZoomProgress = 0;
  state.portalEntryQueued = false;
  state.portalZoomHinted = false;
  updatePortalProgressHalo();
  if (state.activeNavigation !== 'free') {
    state.activeNavigation = 'free';
    updateDepthNavigation();
  }
}

function bindUi() {
  window.addEventListener('resize', onResize);
  window.addEventListener('pointermove', handlePointerMove, { passive: false });
  window.addEventListener('pointerup', finishPointerInteraction);
  window.addEventListener('pointercancel', finishPointerInteraction);

  renderer.domElement.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || state.transitioning) return;
    if (event.target.closest?.('.spatial-card, button, textarea, input, select')) return;
    if (event.shiftKey) {
      state.lasso = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        currentX: event.clientX,
        currentY: event.clientY,
      };
      const lasso = $('#selection-lasso');
      lasso.hidden = false;
      lasso.style.cssText = `left:${event.clientX}px;top:${event.clientY}px;width:0;height:0`;
      renderer.domElement.setPointerCapture?.(event.pointerId);
      return;
    }
    if (!nativeHtmlCanvas) {
      const card = getCardAtScreenPoint(event.clientX, event.clientY);
      if (card) {
        startCardDrag(card, event);
        return;
      }
    }
    state.panGesture = {
      pointerId: event.pointerId,
      lastX: event.clientX,
      lastY: event.clientY,
      moved: false,
    };
    renderer.domElement.setPointerCapture?.(event.pointerId);
    document.documentElement.classList.add('is-panning');
  });

  renderer.domElement.addEventListener('dblclick', (event) => {
    if (event.target.closest?.('.spatial-card, button, textarea, input, select')) return;
    if (!nativeHtmlCanvas) {
      const card = getCardAtScreenPoint(event.clientX, event.clientY);
      if (card) {
        event.preventDefault();
        if (card.userData.portal) navigateSpace(card.userData.destinationSpace);
        else if (card.userData.editable) beginEdit(card);
        return;
      }
    }
    event.preventDefault();
    createThoughtAt(event.clientX, event.clientY);
  });

  renderer.domElement.addEventListener('wheel', (event) => {
    if (state.transitioning) return;
    event.preventDefault();
    const delta = event.deltaY * (event.deltaMode === 1 ? 16 : 1);
    const hoveredCard = getCardAtScreenPoint(event.clientX, event.clientY);
    const parentTarget = spaces[state.space].parentId && delta > 0;
    const portalTarget = state.space === 'root' && delta < 0
      ? getPortalIntentTarget(event.clientX, event.clientY, hoveredCard)
      : null;

    if (parentTarget) {
      state.portalZoomProgress = 0;
      state.portalEntryQueued = false;
      zoomTowardParent(event, delta);
    } else if (portalTarget) {
      resetParentZoomIntent();
      zoomTowardPortal(portalTarget, event, delta);
    } else {
      resetParentZoomIntent();
      state.portalZoomProgress = clamp(state.portalZoomProgress - Math.abs(delta) / 520, 0, 1);
      markFreeNavigation();
      zoomAtCursor(event.clientX, event.clientY, delta);
    }
    persistSpatialState();
  }, { passive: false });

  window.addEventListener('keydown', (event) => {
    if (event.target.closest('textarea, input')) return;
    if (event.key === 'Escape' && spaces[state.space].parentId && !state.transitioning) navigateSpace(spaces[state.space].parentId);
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      applyWorkspaceHistory(event.shiftKey ? 'redo' : 'undo');
      return;
    }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'd' && state.selectedIds.size) {
      event.preventDefault();
      duplicateSelection();
      return;
    }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'a') {
      event.preventDefault();
      state.selectedIds = new Set(cardMeshes.filter((card) => card.userData.space === state.space).map((card) => card.userData.id));
      state.selected = [...state.selectedIds].at(-1) || null;
      refreshSelectionVisuals();
      return;
    }
    if ((event.key === 'Delete' || event.key === 'Backspace') && state.selectedIds.size) {
      event.preventDefault();
      deleteSelection();
      return;
    }
    if (event.key.toLowerCase() === 'n') {
      event.preventDefault();
      createThoughtAt();
      return;
    }
    if (event.key === '0' || event.key.toLowerCase() === 'o') {
      event.preventDefault();
      focusLayer('overview');
      return;
    }
    if (event.key.toLowerCase() === 'f' && state.selected) {
      event.preventDefault();
      focusCard(cardMeshes.find((card) => card.userData.id === state.selected));
      return;
    }
    if (event.target.closest('button')) return;
    const view = state.views[state.space];
    const step = event.shiftKey ? 0.85 : 0.35;
    if (event.key === 'ArrowLeft') view.pan.x -= step;
    if (event.key === 'ArrowRight') view.pan.x += step;
    if (event.key === 'ArrowUp') view.pan.y += step;
    if (event.key === 'ArrowDown') view.pan.y -= step;
    if (event.key === '=' || event.key === '+') view.zoom = clamp(view.zoom - 0.7, -6.2, 8);
    if (event.key === '-' || event.key === '_') view.zoom = clamp(view.zoom + 0.7, -6.2, 8);
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '=', '+', '-', '_'].includes(event.key)) {
      event.preventDefault();
      markFreeNavigation();
      persistSpatialState();
    }
  });
  $('#back-space').addEventListener('click', () => navigateSpace(spaces[state.space].parentId));
  $('#new-thought').addEventListener('click', () => createThoughtAt());
  $('#reset-view').addEventListener('click', () => focusLayer('overview'));
  $('#focus-selected').addEventListener('click', () => {
    focusCard(cardMeshes.find((card) => card.userData.id === state.selected));
  });
  for (const button of document.querySelectorAll('[data-depth]')) {
    button.addEventListener('click', () => focusLayer(button.dataset.depth));
  }
  $('#duplicate-selection').addEventListener('click', duplicateSelection);
  $('#delete-selection').addEventListener('click', deleteSelection);
  $('#make-space').addEventListener('click', makeSpaceFromSelection);
  $('#link-selection').addEventListener('click', () => {
    const ids = [...state.selectedIds];
    if (ids.length >= 2) createRelation(ids[0], ids[1], $('#relation-label').value);
    else {
      state.linkMode = !state.linkMode;
      updateSelectionToolbar();
      showToast(state.linkMode ? 'Choose another card to complete the relationship' : 'Link cancelled');
    }
  });
  const toggleAi = (open) => {
    $('#ai-panel').hidden = !open;
    $('#ai-dock').classList.toggle('is-open', open);
    document.documentElement.classList.toggle('is-ai-open', open);
    $('#ai-toggle').setAttribute('aria-expanded', String(open));
    if (open) renderAiProposals();
  };
  $('#ai-toggle').addEventListener('click', () => toggleAi($('#ai-panel').hidden));
  $('#ai-close').addEventListener('click', () => toggleAi(false));
  $('#ai-command').addEventListener('submit', (event) => {
    event.preventDefault();
    handleAiCommand($('#ai-command-input').value);
    $('#ai-command-input').value = '';
  });
  $('#fallback-editor-close').addEventListener('click', closeFallbackEditor);
  $('#fallback-editor').addEventListener('submit', (event) => {
    event.preventDefault();
    const mesh = cardMeshes.find((card) => card.userData.id === state.fallbackEditing);
    if (!mesh) return closeFallbackEditor();
    const nextTitle = $('#fallback-title').value.trim() || 'Untitled thought';
    const value = $('#fallback-body').value.trim() || 'An unwritten thought.';
    commitCardEdit(mesh, nextTitle, value);
    const title = $('.card-title', mesh.userData.element);
    const body = $('.card-body', mesh.userData.element);
    title.textContent = nextTitle;
    body.innerHTML = `<p>${escapeHtml(value)}</p>`;
    closeFallbackEditor();
  });
  $('#api-help').addEventListener('click', (event) => {
    event.stopPropagation();
    $('#api-popover').hidden = !$('#api-popover').hidden;
  });
  document.addEventListener('click', (event) => {
    if (!event.target.closest('#api-popover, #api-help')) $('#api-popover').hidden = true;
  });
  renderAiProposals();
}

function getWorldPointAtScreen(clientX, clientY, depthZ = spaces[state.space].look.z + state.views[state.space].depth) {
  const ndc = new THREE.Vector2(
    (clientX / window.innerWidth) * 2 - 1,
    1 - (clientY / window.innerHeight) * 2,
  );
  const raycaster = new THREE.Raycaster();
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -depthZ);
  const point = new THREE.Vector3();
  camera.updateMatrixWorld();
  raycaster.setFromCamera(ndc, camera);
  return raycaster.ray.intersectPlane(plane, point);
}

function getCardAtScreenPoint(clientX, clientY) {
  const direct = document.elementFromPoint(clientX, clientY)?.closest?.('.spatial-card');
  if (direct?.dataset.id) {
    const mesh = cardMeshes.find((card) => card.userData.id === direct.dataset.id);
    if (mesh?.userData.space === state.space) return mesh;
  }

  return cardMeshes
    .filter((card) => card.userData.space === state.space && card.material.opacity > 0.3)
    .sort((a, b) => camera.position.distanceTo(a.position) - camera.position.distanceTo(b.position))
    .find((card) => {
      const rect = card.userData.element.getBoundingClientRect();
      return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
    }) || null;
}

function getPortalIntentTarget(clientX, clientY, hoveredCard) {
  if (hoveredCard?.userData.portal) return hoveredCard;
  if (state.portalZoomProgress <= 0) return null;
  const portal = cardMeshes.find((card) => card.userData.id === 'portal');
  if (!portal) return null;
  const rect = portal.userData.element.getBoundingClientRect();
  const marginX = rect.width * 0.28;
  const marginY = rect.height * 0.38;
  const withinIntentField = clientX >= rect.left - marginX && clientX <= rect.right + marginX &&
    clientY >= rect.top - marginY && clientY <= rect.bottom + marginY;
  return withinIntentField ? portal : null;
}

function zoomAtCursor(clientX, clientY, delta) {
  const view = state.views[state.space];
  const nextZoom = clamp(view.zoom + delta * 0.006, -6.2, 8);
  if (nextZoom === view.zoom) return;

  const baseDistance = spaces[state.space].camera.z - spaces[state.space].look.z;
  const beforeDistance = Math.max(2.4, baseDistance + view.zoom);
  const afterDistance = Math.max(2.4, baseDistance + nextZoom);
  const halfFov = THREE.MathUtils.degToRad(camera.fov * 0.5);
  const beforeHeight = 2 * beforeDistance * Math.tan(halfFov);
  const afterHeight = 2 * afterDistance * Math.tan(halfFov);
  const ndcX = (clientX / window.innerWidth) * 2 - 1;
  const ndcY = 1 - (clientY / window.innerHeight) * 2;
  const heightChange = beforeHeight - afterHeight;

  view.pan.x += ndcX * heightChange * camera.aspect * 0.5;
  view.pan.y += ndcY * heightChange * 0.5;
  view.zoom = nextZoom;
  state.pointer.set(ndcX, ndcY);
}

function zoomTowardPortal(portal, event, delta) {
  if (state.portalEntryQueued) return;
  const view = state.views.root;
  const lookBase = spaces.root.look;
  const guidedDelta = -clamp(-delta, 1, 120);
  const strength = clamp(-guidedDelta / 430, 0.025, 0.22);
  view.depth = lerp(view.depth, portal.userData.basePosition.z - lookBase.z, strength * 0.72);
  zoomAtCursor(event.clientX, event.clientY, guidedDelta);

  if (state.activeNavigation !== 'portal') {
    state.viewTween = null;
    state.activeNavigation = 'portal';
    updateDepthNavigation();
  }

  const wasIdle = state.portalZoomProgress < 0.06;
  const intentStep = clamp(-guidedDelta / 420, 0.018, 0.28);
  state.portalZoomProgress = clamp(state.portalZoomProgress + intentStep, 0, 1);
  if (state.portalZoomProgress >= 1) {
    state.portalZoomProgress = 1;
    state.portalEntryQueued = true;
  }
  updatePortalProgressHalo();
  if (wasIdle && !state.portalZoomHinted) {
    state.portalZoomHinted = true;
    showToast('Keep zooming to enter Website redesign');
  }
  if (state.portalEntryQueued) showToast('Entering Website redesign');
}

function zoomTowardParent(event, delta) {
  if (state.parentExitQueued) return;
  const guidedDelta = clamp(delta, 1, 120);
  zoomAtCursor(event.clientX, event.clientY, guidedDelta);
  state.viewTween = null;
  if (state.activeNavigation !== 'free') {
    state.activeNavigation = 'free';
    updateDepthNavigation();
  }
  const wasIdle = state.parentZoomProgress < 0.06;
  const intentStep = clamp(guidedDelta / 440, 0.018, 0.24);
  state.parentZoomProgress = clamp(state.parentZoomProgress + intentStep, 0, 1);
  if (state.parentZoomProgress >= 1) {
    state.parentZoomProgress = 1;
    state.parentExitQueued = true;
  }
  if (wasIdle) showToast(`Keep zooming out to return to ${spaces[spaces[state.space].parentId].name}`);
}

function handlePointerMove(event) {
  state.pointer.x = (event.clientX / window.innerWidth - 0.5) * 2;
  state.pointer.y = (event.clientY / window.innerHeight - 0.5) * 2;

  if (state.lasso && event.pointerId === state.lasso.pointerId) {
    event.preventDefault();
    const lasso = state.lasso;
    lasso.currentX = event.clientX;
    lasso.currentY = event.clientY;
    const left = Math.min(lasso.startX, lasso.currentX);
    const top = Math.min(lasso.startY, lasso.currentY);
    const right = Math.max(lasso.startX, lasso.currentX);
    const bottom = Math.max(lasso.startY, lasso.currentY);
    const element = $('#selection-lasso');
    element.style.cssText = `left:${left}px;top:${top}px;width:${right - left}px;height:${bottom - top}px`;
    const nextIds = cardMeshes
      .filter((card) => card.userData.space === state.space && card.material.opacity > 0.25)
      .filter((card) => {
        const rect = card.userData.element.getBoundingClientRect();
        return rect.right >= left && rect.left <= right && rect.bottom >= top && rect.top <= bottom;
      })
      .map((card) => card.userData.id);
    const signature = nextIds.sort().join('|');
    if (signature !== lasso.signature) {
      lasso.signature = signature;
      state.selectedIds = new Set(nextIds);
      state.selected = nextIds.at(-1) || null;
      refreshSelectionVisuals();
    }
    return;
  }

  if (state.drag && event.pointerId === state.drag.pointerId) {
    const drag = state.drag;
    const totalDistance = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
    if (!drag.moved && totalDistance > 4) {
      drag.moved = true;
      if (!state.selectedIds.has(drag.mesh.userData.id)) selectCard(drag.mesh);
      drag.meshes = cardMeshes.filter((card) => state.selectedIds.has(card.userData.id));
      for (const mesh of drag.meshes) mesh.userData.element.classList.add('is-dragging');
      document.documentElement.classList.add('is-card-dragging');
    }
    if (!drag.moved) return;
    event.preventDefault();
    const worldPerPixel = getWorldUnitsPerPixel(drag.mesh.position.z);
    let dx = (event.clientX - drag.lastX) * worldPerPixel;
    let dy = -(event.clientY - drag.lastY) * worldPerPixel;
    const others = cardMeshes.filter((card) => card.userData.space === state.space && !state.selectedIds.has(card.userData.id));
    const xTarget = others.find((card) => Math.abs(card.userData.basePosition.x - (drag.mesh.userData.basePosition.x + dx)) < 0.16);
    const yTarget = others.find((card) => Math.abs(card.userData.basePosition.y - (drag.mesh.userData.basePosition.y + dy)) < 0.16);
    if (xTarget) dx = xTarget.userData.basePosition.x - drag.mesh.userData.basePosition.x;
    if (yTarget) dy = yTarget.userData.basePosition.y - drag.mesh.userData.basePosition.y;
    updateAlignmentGuides(xTarget, yTarget);
    for (const mesh of drag.meshes) {
      mesh.userData.basePosition.x = clamp(mesh.userData.basePosition.x + dx, -12, 12);
      mesh.userData.basePosition.y = clamp(mesh.userData.basePosition.y + dy, -7, 7);
      mesh.position.x = mesh.userData.basePosition.x;
      mesh.position.y = mesh.userData.basePosition.y;
      if (mesh.userData.id === 'portal' && portalHalo) {
        portalHalo.position.x = mesh.position.x;
        portalHalo.position.y = mesh.position.y;
      }
    }
    drag.lastX = event.clientX;
    drag.lastY = event.clientY;
    updateConnections();
    return;
  }

  if (state.panGesture && event.pointerId === state.panGesture.pointerId) {
    event.preventDefault();
    const gesture = state.panGesture;
    const dx = event.clientX - gesture.lastX;
    const dy = event.clientY - gesture.lastY;
    if (Math.hypot(dx, dy) > 0) {
      gesture.moved = true;
      markFreeNavigation();
    }
    const view = state.views[state.space];
    const worldPerPixel = getWorldUnitsPerPixel(state.cameraLook.z);
    view.pan.x -= dx * worldPerPixel;
    view.pan.y += dy * worldPerPixel;
    gesture.lastX = event.clientX;
    gesture.lastY = event.clientY;
  }
}

function updateAlignmentGuides(xTarget, yTarget) {
  const xGuide = $('#guide-x');
  const yGuide = $('#guide-y');
  xGuide.hidden = !xTarget;
  yGuide.hidden = !yTarget;
  if (xTarget) {
    const point = xTarget.position.clone().project(camera);
    xGuide.style.left = `${(point.x * 0.5 + 0.5) * window.innerWidth}px`;
  }
  if (yTarget) {
    const point = yTarget.position.clone().project(camera);
    yGuide.style.top = `${(-point.y * 0.5 + 0.5) * window.innerHeight}px`;
  }
}

function finishPointerInteraction(event) {
  if (state.lasso && event.pointerId === state.lasso.pointerId) {
    state.lasso = null;
    $('#selection-lasso').hidden = true;
    showToast(`${state.selectedIds.size} ${state.selectedIds.size === 1 ? 'thought' : 'thoughts'} selected`);
  }
  if (state.drag && event.pointerId === state.drag.pointerId) {
    const { mesh, meshes = [state.drag.mesh], moved } = state.drag;
    if (moved) {
      const positions = Object.fromEntries(meshes.map((item) => [item.userData.id, item.userData.basePosition.toArray()]));
      workspace = dispatchWorkspace(workspace, { type: 'placement.move', payload: { positions } });
      for (const item of meshes) {
        item.userData.suppressClickUntil = performance.now() + 350;
        item.userData.element.classList.remove('is-dragging');
      }
      persistSpatialState();
      showToast(`${meshes.length === 1 ? 'Card' : `${meshes.length} cards`} position saved locally`);
    } else if (!nativeHtmlCanvas) {
      if (state.linkMode && state.selected && state.selected !== mesh.userData.id) {
        createRelation(state.selected, mesh.userData.id, $('#relation-label')?.value || 'related');
      } else {
        selectCard(mesh, { additive: event.shiftKey || event.metaKey || event.ctrlKey });
      }
    }
    state.drag = null;
    $('#guide-x').hidden = true;
    $('#guide-y').hidden = true;
    document.documentElement.classList.remove('is-card-dragging');
  }
  if (state.panGesture && event.pointerId === state.panGesture.pointerId) {
    if (state.panGesture.moved) persistSpatialState();
    state.panGesture = null;
    document.documentElement.classList.remove('is-panning');
  }
}

function getWorldUnitsPerPixel(depthZ) {
  const distance = Math.max(2, Math.abs(camera.position.z - depthZ));
  const visibleHeight = 2 * distance * Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5));
  return visibleHeight / window.innerHeight;
}

function setApiState() {
  const root = $('#api-state');
  const title = $('#api-popover-title');
  const copy = $('#api-popover-copy');
  if (nativeHtmlCanvas) {
    root.classList.add('native');
    $('#api-label').textContent = 'Native HTML-in-Canvas';
    title.textContent = 'Native API active';
    copy.textContent = 'These cards are live HTML painted into WebGL textures by Chrome. Selection, focus and editing are handled by the browser—not simulated raycasts.';
  } else {
    root.classList.add('fallback');
    $('#api-label').textContent = 'HTML texture polyfill';
    title.textContent = 'Running the fallback';
    copy.textContent = 'The scene remains testable, but Chrome’s native API is off. Enable Canvas Draw Element and reload to test the actual browser implementation.';
  }
}

function updateSemanticZoom() {
  const perspective = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5));
  for (const card of cardMeshes) {
    if (card.userData.space !== state.space) continue;
    const distance = Math.max(0.1, camera.position.distanceTo(card.position));
    const projectedHeight = (2.14 / (perspective * distance)) * window.innerHeight;
    const mutedByNavigation = state.activeNavigation === 'focus'
      ? card.userData.id !== state.selected
      : ['working', 'context', 'portal'].includes(state.activeNavigation) && card.userData.layer !== state.activeNavigation;
    const promotedLayer = ['working', 'context', 'portal'].includes(state.activeNavigation) &&
      card.userData.layer === state.activeNavigation;
    const level = mutedByNavigation
      ? 'far'
      : promotedLayer || card.userData.portal || state.selectedIds.has(card.userData.id) ||
        (state.activeNavigation === 'overview' && card.userData.layer === 'working') || projectedHeight > 205
        ? 'full'
        : projectedHeight > 92 ? 'mid' : 'far';
    setSemanticLevel(card, level);
  }
}

function setSemanticLevel(card, level) {
  if (card.userData.semanticLevel === level) return;
  card.userData.semanticLevel = level;
  const element = card.userData.element;
  const meta = $('.card-meta', element);
  const detail = $('.card-detail', element);

  meta.hidden = level === 'far';
  detail.hidden = level !== 'full';
  element.classList.toggle('semantic-mid', level === 'mid');
  element.classList.toggle('semantic-far', level === 'far');
  state.lodPaintUntil = Math.max(state.lodPaintUntil, performance.now() + 360);
  renderer.domElement.requestPaint?.();
}

function updateNavigationVisibility() {
  const focusedLayer = ['working', 'context', 'portal'].includes(state.activeNavigation)
    ? state.activeNavigation : null;
  for (const card of cardMeshes) {
    if (card.userData.space !== state.space) continue;
    const isPrimary = state.activeNavigation === 'focus'
      ? card.userData.id === state.selected
      : !focusedLayer || card.userData.layer === focusedLayer;
    card.material.opacity = lerp(card.material.opacity, isPrimary ? 1 : 0.13, 0.12);
  }
  for (const connection of connections) {
    if (connection.spaceId !== state.space) continue;
    const relevant = state.activeNavigation === 'focus'
      ? [connection.from.userData.id, connection.to.userData.id].includes(state.selected)
      : !focusedLayer || (connection.from.userData.layer === focusedLayer && connection.to.userData.layer === focusedLayer);
    connection.line.material.opacity = lerp(
      connection.line.material.opacity,
      connection.baseOpacity * (relevant ? 1 : 0.13),
      0.12,
    );
    if (connection.label) {
      connection.label.material.opacity = lerp(connection.label.material.opacity, relevant ? 0.92 : 0.08, 0.12);
      connection.label.visible = connection.line.material.opacity > 0.08;
    }
  }
  if (state.space === 'root' && portalPreview) {
    const portal = cardMeshes.find((card) => card.userData.id === 'portal');
    portalPreview.mesh.material.opacity = lerp(portalPreview.mesh.material.opacity, portal.material.opacity, 0.12);
    portalHalo.material.opacity = lerp(portalHalo.material.opacity, portal.material.opacity * 0.22, 0.12);
  }
}

function updatePortalVisual() {
  if (!portalProgressHalo) return;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const smoothing = state.portalZoomProgress > state.portalZoomVisual ? 0.18 : 0.11;
  state.portalZoomVisual = reducedMotion
    ? state.portalZoomProgress
    : lerp(state.portalZoomVisual, state.portalZoomProgress, smoothing);
  if (Math.abs(state.portalZoomVisual - state.portalZoomProgress) < 0.001) {
    state.portalZoomVisual = state.portalZoomProgress;
  }

  const transitionRaw = state.transition?.progress || 0;
  const transitionFade = state.transition?.entering ? 1 - smoothstep(0.58, 0.88, transitionRaw) : 1;
  const spaceFactor = state.space === 'root' || state.transition?.entering ? 1 : 0;
  const progress = clamp(state.portalZoomVisual, 0, 1);
  const opacity = smoothstep(0.01, 0.12, state.portalZoomVisual) * 0.96 * transitionFade * spaceFactor;
  portalProgressHalo.material.uniforms.uProgress.value = progress;
  portalProgressHalo.material.uniforms.uOpacity.value = opacity;
  const capAngle = Math.PI / 2 - progress * Math.PI * 2;
  portalProgressCap.position.set(Math.cos(capAngle) * 2.165, Math.sin(capAngle) * 2.165, 0.02);
  portalProgressCap.material.opacity = opacity;
  portalProgressStartCap.material.opacity = opacity;

  if (state.portalEntryQueued && !state.transition && state.portalZoomVisual >= 0.965) {
    navigateSpace('project');
  }
}

function render(time) {
  try {
    renderFrame(time);
  } catch (error) {
    window.__orbitRuntimeError = { message: error?.message, stack: error?.stack, name: error?.name };
    console.error('[Orbit render failure]', error?.name, error?.message, error?.stack);
    renderer.setAnimationLoop(null);
  }
}

function renderFrame(time) {
  state.pointerSmooth.lerp(state.pointer, 0.035);

  if (state.viewTween && !state.transition) updateViewTween(time);
  if (state.transition) updateTransition(time);
  else updateCameraParallax();
  updateSemanticZoom();
  if (!state.transition) updateNavigationVisibility();

  for (const card of cardMeshes) {
    const selectedLift = card.userData.targetLift;
    const targetZ = card.userData.basePosition.z + selectedLift;
    card.position.z = lerp(card.position.z, targetZ, 0.09);
    const targetSelectionScale = selectedLift ? 1.035 : 1;
    card.userData.visualSelectionScale = lerp(card.userData.visualSelectionScale || 1, targetSelectionScale, 0.09);
    const style = getComputedStyle(card.userData.element);
    const width = Number.parseFloat(style.width) || 340;
    const height = Number.parseFloat(style.height) || 214;
    card.scale.x = card.userData.visualSelectionScale * width / 340;
    card.scale.y = card.userData.visualSelectionScale * height / 214;
  }
  if (time < state.lodPaintUntil) renderer.domElement.requestPaint?.();
  if (portalPreview) {
    const portal = cardMeshes.find((card) => card.userData.id === 'portal');
    portalPreview.mesh.visible = portal?.userData.semanticLevel === 'full' || state.transition?.portalId === 'portal';
  }
  updateConnections();
  updatePortalVisual();
  updateParentZoomVisual();

  if (portalHalo) {
    const transitionRaw = state.transition?.progress || 0;
    const transitionExpand = state.transition?.entering
      ? 1 + easeOutCubic(clamp((transitionRaw - 0.08) / 0.68, 0, 1)) * 0.18
      : 1;
    const hoverLift = state.portalHover && !state.transition ? 0.035 : 0;
    portalHalo.rotation.z = time * 0.000035 + state.portalZoomVisual * 0.08;
    const pulse = 1 + Math.sin(time * 0.0012) * (0.015 + hoverLift * 0.3);
    portalHalo.scale.setScalar(pulse * (1 + state.portalZoomVisual * 0.16 + hoverLift) * transitionExpand);
    if (!state.transition && state.space === 'root') {
      const hoverOpacity = state.portalHover ? 0.34 : 0.22;
      portalHalo.material.opacity = Math.max(portalHalo.material.opacity, hoverOpacity + state.portalZoomVisual * 0.56);
    }
  }

  camera.lookAt(state.cameraLook);
  renderPortalPreview();
  interactions.update();
  renderer.render(scene, camera);
}

function updateCameraParallax() {
  const base = spaces[state.space].camera;
  const lookBase = spaces[state.space].look;
  const view = state.views[state.space];
  const multiplier = state.space === 'root' ? 0.38 : 0.31;
  const targetX = base.x + view.pan.x + state.pointerSmooth.x * multiplier;
  const targetY = base.y + view.pan.y - state.pointerSmooth.y * multiplier * 0.58;
  camera.position.x = lerp(camera.position.x, targetX, 0.085);
  camera.position.y = lerp(camera.position.y, targetY, 0.085);
  camera.position.z = lerp(camera.position.z, base.z + view.depth + view.zoom, 0.085);
  state.cameraLook.x = lerp(state.cameraLook.x, lookBase.x + view.pan.x + state.pointerSmooth.x * 0.16, 0.085);
  state.cameraLook.y = lerp(state.cameraLook.y, lookBase.y + view.pan.y - state.pointerSmooth.y * 0.09, 0.085);
  state.cameraLook.z = lerp(state.cameraLook.z, lookBase.z + view.depth, 0.085);
}

function getViewCamera(spaceId) {
  const view = state.views[spaceId];
  return spaces[spaceId].camera.clone().add(new THREE.Vector3(view.pan.x, view.pan.y, view.depth + view.zoom));
}

function getViewLook(spaceId) {
  const view = state.views[spaceId];
  return spaces[spaceId].look.clone().add(new THREE.Vector3(view.pan.x, view.pan.y, view.depth));
}

function updateTransition(time) {
  const transition = state.transition;
  const raw = clamp((time - transition.start) / transition.duration, 0, 1);
  transition.progress = raw;
  const t = easeInOutQuint(raw);
  const destinationCamera = getViewCamera(transition.to);
  const destinationLook = getViewLook(transition.to);
  const portalMesh = cardMeshes.find((card) => card.userData.id === transition.portalId);
  const portal = portalMesh?.userData.basePosition || transition.fromLook;
  const cameraBefore = portal.clone().add(new THREE.Vector3(0, 0, 4.5));
  const cameraBeyond = portal.clone().add(new THREE.Vector3(0, 0, -0.9));

  if (transition.entering) {
    const lookBeyond = portal.clone().lerp(destinationLook, 0.42);
    cubicVector(camera.position, transition.fromPosition, cameraBefore, cameraBeyond, destinationCamera, t);
    cubicVector(state.cameraLook, transition.fromLook, portal, lookBeyond, destinationLook, t);
  } else {
    const lookBefore = portal.clone().lerp(transition.fromLook, 0.42);
    cubicVector(camera.position, transition.fromPosition, cameraBeyond, cameraBefore, destinationCamera, t);
    cubicVector(state.cameraLook, transition.fromLook, lookBefore, portal, destinationLook, t);
  }

  const fromOpacity = transition.entering
    ? 1 - smoothstep(0.66, 0.94, raw)
    : 1 - smoothstep(0.58, 0.92, raw);
  const toOpacity = transition.entering
    ? smoothstep(0.18, 0.62, raw)
    : smoothstep(0.24, 0.72, raw);
  setSpaceOpacity(transition.from, fromOpacity);
  setSpaceOpacity(transition.to, toOpacity);

  if (portalMesh) {
    const portalSurface = transition.entering
      ? 1 - smoothstep(0.32, 0.61, raw)
      : smoothstep(0.22, 0.56, raw);
    portalMesh.material.opacity = portalSurface * (transition.entering ? fromOpacity : toOpacity);
    if (transition.portalId === 'portal' && portalPreview) {
      const previewSurface = transition.entering
        ? 1 - smoothstep(0.18, 0.48, raw)
        : smoothstep(0.38, 0.72, raw);
      portalPreview.mesh.material.opacity = previewSurface * (transition.entering ? fromOpacity : toOpacity);
    }
  }

  if (portalHalo) {
    const rootOpacity = transition.from === 'root' ? fromOpacity : transition.to === 'root' ? toOpacity : 0;
    portalHalo.material.opacity = 0.22 * rootOpacity;
  }

  if (raw >= 1) finishNavigation(transition.to);
}

function cubicVector(out, p0, p1, p2, p3, t) {
  const inverse = 1 - t;
  out.set(
    inverse ** 3 * p0.x + 3 * inverse ** 2 * t * p1.x + 3 * inverse * t ** 2 * p2.x + t ** 3 * p3.x,
    inverse ** 3 * p0.y + 3 * inverse ** 2 * t * p1.y + 3 * inverse * t ** 2 * p2.y + t ** 3 * p3.y,
    inverse ** 3 * p0.z + 3 * inverse ** 2 * t * p1.z + 3 * inverse * t ** 2 * p2.z + t ** 3 * p3.z,
  );
}

function setSpaceOpacity(spaceId, opacity) {
  for (const child of roots[spaceId].children) {
    if (child.material && child !== portalHalo) child.material.opacity = opacity * (child.isLine ? 0.22 : 1);
  }
  if (spaceId === 'root' && portalPreview) portalPreview.mesh.material.opacity = opacity;
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.fov = window.innerWidth < 720 ? 49 : 38;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove('show'), 1800);
}

function loadPersistedState(key = STORAGE_KEY) {
  try {
    return JSON.parse(localStorage.getItem(key) || '{}');
  } catch {
    return {};
  }
}

function persistSpatialState() {
  try {
    for (const placement of workspace.placements) {
      const mesh = cardMeshes.find((card) => card.userData.id === placement.id);
      if (mesh) placement.position = mesh.userData.basePosition.toArray();
    }
    const views = Object.fromEntries(Object.entries(state.views).map(([id, view]) => [id, {
      pan: view.pan.toArray(),
      zoom: view.zoom,
      depth: view.depth,
    }]));
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      workspace: JSON.parse(serialiseWorkspace(workspace)),
      views,
      aiDismissed: [...state.aiDismissed],
    }));
  } catch {
    // Persistence is a convenience; interaction should survive blocked storage.
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
