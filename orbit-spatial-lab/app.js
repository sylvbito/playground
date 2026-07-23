import * as THREE from 'three';
import { InteractionManager } from 'three/addons/interaction/InteractionManager.js';
import { installHtmlInCanvasPolyfill } from 'three-html-render/polyfill';

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
    kicker: 'SPACE · 01',
    description: 'Depth is semantic: working thoughts stay near, context recedes, and nested spaces sit beyond.',
    camera: new THREE.Vector3(0, 0, 11.8),
    look: new THREE.Vector3(0, -0.2, -0.7),
  },
  project: {
    name: 'Website redesign',
    kicker: 'NESTED SPACE · 01.1',
    description: 'A project has emerged from the loose thoughts. The cards remain editable HTML.',
    camera: new THREE.Vector3(0.2, -0.1, -5.7),
    look: new THREE.Vector3(0.1, -0.25, -17.8),
  },
};

const cardData = [
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

const STORAGE_KEY = 'orbit-spatial-lab-v3';
const persisted = loadPersistedState();
const state = {
  space: 'root', selected: null, transitioning: false,
  pointer: new THREE.Vector2(), pointerSmooth: new THREE.Vector2(),
  cameraPosition: spaces.root.camera.clone(), cameraLook: spaces.root.look.clone(),
  views: {
    root: { pan: new THREE.Vector2(...(persisted.views?.root?.pan || [0, 0])), zoom: persisted.views?.root?.zoom || 0, depth: persisted.views?.root?.depth || 0 },
    project: { pan: new THREE.Vector2(...(persisted.views?.project?.pan || [0, 0])), zoom: persisted.views?.project?.zoom || 0, depth: persisted.views?.project?.depth || 0 },
  },
  activeNavigation: 'overview',
  viewTween: null,
  portalZoomProgress: 0,
  portalZoomVisual: 0,
  portalEntryQueued: false,
  portalZoomHinted: false,
  portalHover: false,
  drag: null,
  panGesture: null,
  transition: null,
  paintReady: false,
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

  roots.root = new THREE.Group();
  roots.project = new THREE.Group();
  scene.add(roots.root, roots.project);

  addDepthField();
  cardMeshes = cardData.map(createCard);
  renderer.domElement.onpaint = (event) => {
    const changed = event.changedElements || [];
    for (const card of cardMeshes) {
      if (changed.includes(card.userData.element)) card.material.map.needsUpdate = true;
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
    portalPreview,
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
  if (data.portal) {
    element.addEventListener('pointerenter', () => { state.portalHover = true; });
    element.addEventListener('pointerleave', () => { state.portalHover = false; });
  }
  $('.card-kind', element).textContent = data.kind;
  $('.card-depth', element).textContent = `${data.layer} · z ${data.position[2].toFixed(1)}`;
  $('.card-title', element).textContent = data.title;
  const savedBody = data.editable ? persisted.bodies?.[data.id] : null;
  $('.card-body', element).innerHTML = savedBody ? `<p>${escapeHtml(savedBody)}</p>` : data.body;
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
  const savedPosition = persisted.cards?.[data.id];
  mesh.position.fromArray(Array.isArray(savedPosition) ? savedPosition : data.position);
  mesh.rotation.set(...data.rotation);
  mesh.userData = {
    ...data,
    body: savedBody || data.body,
    element,
    basePosition: mesh.position.clone(),
    baseRotation: mesh.rotation.clone(),
    targetLift: 0,
    semanticLevel: 'full',
    semanticScale: new THREE.Vector2(1, 1),
  };
  roots[data.space].add(mesh);
  interactions.add(mesh);

  element.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || state.transitioning || state.space !== data.space) return;
    if (event.target.closest('button, textarea')) return;
    state.drag = {
      mesh,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      moved: false,
    };
    element.setPointerCapture?.(event.pointerId);
  });
  element.addEventListener('click', (event) => {
    if (performance.now() < (mesh.userData.suppressClickUntil || 0)) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (state.transitioning || state.space !== data.space) return;
    selectCard(mesh);
    if (!event.target.closest('button, textarea')) element.focus({ preventScroll: true });
  });
  element.addEventListener('keydown', (event) => {
    if ((event.key === 'Enter' || event.key === ' ') && !event.target.closest('textarea, button')) {
      event.preventDefault();
      selectCard(mesh);
    }
    if (event.key === 'Escape' && data.space === 'project') navigateSpace('root');
  });

  $('.space-action', element)?.addEventListener('click', (event) => {
    event.stopPropagation();
    navigateSpace('project');
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

function beginEdit(mesh) {
  if (state.transitioning) return;
  selectCard(mesh);
  const { element } = mesh.userData;
  const body = $('.card-body', element);
  const footer = $('.card-footer', element);
  if ($('.card-editor', element)) return;

  const current = mesh.userData.body.replace(/<[^>]+>/g, '').trim();
  body.innerHTML = `<textarea class="card-editor" aria-label="Edit ${escapeHtml(mesh.userData.title)}">${escapeHtml(current)}</textarea>`;
  footer.innerHTML = '<button class="done-action" type="button">Save thought</button>';
  const editor = $('.card-editor', element);
  editor.focus();
  editor.select();

  const save = () => {
    const value = editor.value.trim() || 'An unwritten thought.';
    mesh.userData.body = value;
    body.innerHTML = `<p>${escapeHtml(value)}</p>`;
    footer.innerHTML = `${mesh.userData.footer}<button class="edit-action" type="button">Edit</button>`;
    $('.edit-action', footer).addEventListener('click', (event) => {
      event.stopPropagation();
      beginEdit(mesh);
    });
    renderer.domElement.requestPaint?.();
    persistSpatialState();
    showToast('Thought updated locally');
    element.focus({ preventScroll: true });
  };

  $('.done-action', footer).addEventListener('click', (event) => {
    event.stopPropagation();
    save();
  });
  editor.addEventListener('keydown', (event) => {
    event.stopPropagation();
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') save();
  });
  renderer.domElement.requestPaint?.();
}

function selectCard(mesh) {
  if (!mesh || state.space !== mesh.userData.space) return;
  state.selected = mesh.userData.id;
  $('#focus-selected').hidden = false;
  for (const card of cardMeshes) {
    const active = card === mesh;
    card.userData.element.classList.toggle('is-selected', active);
    card.userData.targetLift = active ? 0.48 : 0;
    if (active) setSemanticLevel(card, 'full');
  }
  renderer.domElement.requestPaint?.();
}

function navigateSpace(destination) {
  if (state.transitioning || destination === state.space) return;
  const from = state.space;
  const entering = destination === 'project';
  state.viewTween = null;
  state.transitioning = true;
  state.transition = {
    from,
    to: destination,
    entering,
    start: performance.now(),
    duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 80 : 1550,
    fromPosition: camera.position.clone(),
    fromLook: state.cameraLook.clone(),
  };

  clearSelection();
  document.documentElement.classList.add('is-space-transitioning');
  $('.space-caption').classList.add('is-transitioning');
  $('#back-space').disabled = true;
  setGroupPointerEvents('root', false);
  setGroupPointerEvents('project', false);

  window.setTimeout(() => {
    updateCaption(destination);
    updateDepthNavigation(destination);
    $('#back-space').hidden = destination !== 'project';
  }, state.transition.duration * 0.46);
}

function finishNavigation(destination) {
  state.space = destination;
  state.transitioning = false;
  state.transition = null;
  state.portalZoomProgress = 0;
  state.portalEntryQueued = false;
  state.portalZoomHinted = false;
  updatePortalProgressHalo();
  const view = state.views[destination];
  state.activeNavigation = view.pan.lengthSq() < 0.001 && Math.abs(view.zoom) < 0.001 && Math.abs(view.depth) < 0.001
    ? 'overview' : 'free';
  state.cameraPosition.copy(getViewCamera(destination));
  state.cameraLook.copy(getViewLook(destination));
  updateSpaceInteractivity();
  updateDepthNavigation();
  $('#back-space').disabled = false;
  document.documentElement.classList.remove('is-space-transitioning');
  $('.space-caption').classList.remove('is-transitioning');
  showToast(destination === 'project' ? 'Entered Website redesign' : 'Returned to Loose thoughts');
}

function updateCaption(spaceId) {
  const target = spaces[spaceId];
  $('#space-name').textContent = target.name;
  $('#space-kicker').textContent = target.kicker;
  $('#space-title').textContent = target.name;
  $('#space-description').textContent = target.description;
}

function clearSelection() {
  state.selected = null;
  $('#focus-selected').hidden = true;
  for (const card of cardMeshes) {
    card.userData.element.classList.remove('is-selected');
    card.userData.targetLift = 0;
  }
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
}

function addCurve(spaceId, fromId, toId, color, opacity) {
  const from = cardMeshes.find((card) => card.userData.id === fromId);
  const to = cardMeshes.find((card) => card.userData.id === toId);
  if (!from || !to) return;
  const geometry = new THREE.BufferGeometry();
  const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity });
  const line = new THREE.Line(geometry, material);
  roots[spaceId].add(line);
  connections.push({ spaceId, from, to, line, baseOpacity: opacity });
  updateConnection({ from, to, line });
}

function updateConnection({ from, to, line }) {
  const middle = from.position.clone().lerp(to.position, 0.5);
  middle.z -= 0.42;
  middle.y += 0.2;
  const curve = new THREE.QuadraticBezierCurve3(from.position.clone(), middle, to.position.clone());
  line.geometry.setFromPoints(curve.getPoints(36));
  line.geometry.attributes.position.needsUpdate = true;
  line.geometry.computeBoundingSphere();
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
    if (event.target.closest?.('.spatial-card, button, textarea')) return;
    state.panGesture = {
      pointerId: event.pointerId,
      lastX: event.clientX,
      lastY: event.clientY,
      moved: false,
    };
    renderer.domElement.setPointerCapture?.(event.pointerId);
    document.documentElement.classList.add('is-panning');
  });

  renderer.domElement.addEventListener('wheel', (event) => {
    if (state.transitioning) return;
    event.preventDefault();
    const delta = event.deltaY * (event.deltaMode === 1 ? 16 : 1);
    const hoveredCard = getCardAtScreenPoint(event.clientX, event.clientY);
    const portalTarget = state.space === 'root' && delta < 0
      ? getPortalIntentTarget(event.clientX, event.clientY, hoveredCard)
      : null;

    if (portalTarget) {
      zoomTowardPortal(portalTarget, event, delta);
    } else {
      state.portalZoomProgress = clamp(state.portalZoomProgress - Math.abs(delta) / 520, 0, 1);
      markFreeNavigation();
      zoomAtCursor(event.clientX, event.clientY, delta);
    }
    persistSpatialState();
  }, { passive: false });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && state.space === 'project' && !state.transitioning) navigateSpace('root');
    if (event.target.closest('textarea, input')) return;
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
  $('#back-space').addEventListener('click', () => navigateSpace('root'));
  $('#reset-view').addEventListener('click', () => focusLayer('overview'));
  $('#focus-selected').addEventListener('click', () => {
    focusCard(cardMeshes.find((card) => card.userData.id === state.selected));
  });
  for (const button of document.querySelectorAll('[data-depth]')) {
    button.addEventListener('click', () => focusLayer(button.dataset.depth));
  }
  $('#api-help').addEventListener('click', (event) => {
    event.stopPropagation();
    $('#api-popover').hidden = !$('#api-popover').hidden;
  });
  document.addEventListener('click', (event) => {
    if (!event.target.closest('#api-popover, #api-help')) $('#api-popover').hidden = true;
  });
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

function handlePointerMove(event) {
  state.pointer.x = (event.clientX / window.innerWidth - 0.5) * 2;
  state.pointer.y = (event.clientY / window.innerHeight - 0.5) * 2;

  if (state.drag && event.pointerId === state.drag.pointerId) {
    const drag = state.drag;
    const totalDistance = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
    if (!drag.moved && totalDistance > 4) {
      drag.moved = true;
      selectCard(drag.mesh);
      drag.mesh.userData.element.classList.add('is-dragging');
      document.documentElement.classList.add('is-card-dragging');
    }
    if (!drag.moved) return;
    event.preventDefault();
    const worldPerPixel = getWorldUnitsPerPixel(drag.mesh.position.z);
    const dx = (event.clientX - drag.lastX) * worldPerPixel;
    const dy = -(event.clientY - drag.lastY) * worldPerPixel;
    drag.mesh.userData.basePosition.x = clamp(drag.mesh.userData.basePosition.x + dx, -12, 12);
    drag.mesh.userData.basePosition.y = clamp(drag.mesh.userData.basePosition.y + dy, -7, 7);
    drag.mesh.position.x = drag.mesh.userData.basePosition.x;
    drag.mesh.position.y = drag.mesh.userData.basePosition.y;
    if (drag.mesh.userData.id === 'portal' && portalHalo) {
      portalHalo.position.x = drag.mesh.position.x;
      portalHalo.position.y = drag.mesh.position.y;
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

function finishPointerInteraction(event) {
  if (state.drag && event.pointerId === state.drag.pointerId) {
    const { mesh, moved } = state.drag;
    if (moved) {
      mesh.userData.suppressClickUntil = performance.now() + 350;
      mesh.userData.element.classList.remove('is-dragging');
      persistSpatialState();
      showToast('Card position saved locally');
    }
    state.drag = null;
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
      : promotedLayer || card.userData.portal || card.userData.id === state.selected ||
        (state.activeNavigation === 'overview' && card.userData.layer === 'working') || projectedHeight > 205
        ? 'full'
        : projectedHeight > 92 ? 'mid' : 'far';
    setSemanticLevel(card, level);
  }
}

function setSemanticLevel(card, level) {
  if (card.userData.semanticLevel === level) return;
  card.userData.semanticLevel = level;
  card.userData.element.classList.toggle('semantic-mid', level === 'mid');
  card.userData.element.classList.toggle('semantic-far', level === 'far');
  const scale = level === 'full'
    ? [1, 1]
    : level === 'mid' ? [300 / 340, 132 / 214] : [244 / 340, 64 / 214];
  card.userData.semanticScale.set(...scale);
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
    const selectionScale = selectedLift ? 1.035 : 1;
    const targetScaleX = selectionScale * card.userData.semanticScale.x;
    const targetScaleY = selectionScale * card.userData.semanticScale.y;
    card.scale.x = lerp(card.scale.x, targetScaleX, 0.09);
    card.scale.y = lerp(card.scale.y, targetScaleY, 0.09);
  }
  updateConnections();
  updatePortalVisual();

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

  if (transition.entering) {
    const portal = cardMeshes.find((card) => card.userData.id === 'portal').userData.basePosition;
    const approachZ = portal.z + 5;
    const focusT = clamp(raw / 0.42, 0, 1);
    const diveT = clamp((raw - 0.32) / 0.68, 0, 1);
    const focusEase = easeInOutQuint(focusT);
    const diveEase = easeInOutQuint(diveT);
    camera.position.x = raw < 0.32
      ? lerp(transition.fromPosition.x, portal.x, focusEase)
      : lerp(portal.x, destinationCamera.x, diveEase);
    camera.position.y = raw < 0.32
      ? lerp(transition.fromPosition.y, portal.y, focusEase)
      : lerp(portal.y, destinationCamera.y, diveEase);
    camera.position.z = raw < 0.32
      ? lerp(transition.fromPosition.z, approachZ, focusEase)
      : lerp(approachZ, destinationCamera.z, diveEase);
    state.cameraLook.x = raw < 0.32
      ? lerp(transition.fromLook.x, portal.x, focusEase)
      : lerp(portal.x, destinationLook.x, diveEase);
    state.cameraLook.y = raw < 0.32
      ? lerp(transition.fromLook.y, portal.y, focusEase)
      : lerp(portal.y, destinationLook.y, diveEase);
    state.cameraLook.z = raw < 0.32
      ? lerp(transition.fromLook.z, portal.z, focusEase)
      : lerp(portal.z, destinationLook.z, diveEase);
  } else {
    camera.position.lerpVectors(transition.fromPosition, destinationCamera, t);
    state.cameraLook.lerpVectors(transition.fromLook, destinationLook, t);
  }

  const rootOpacity = transition.entering ? 1 - clamp((raw - 0.32) / 0.28, 0, 1) : clamp((raw - 0.55) / 0.35, 0, 1);
  const projectOpacity = transition.entering ? clamp((raw - 0.52) / 0.36, 0, 1) : 1 - clamp((raw - 0.12) / 0.34, 0, 1);
  setSpaceOpacity('root', rootOpacity);
  setSpaceOpacity('project', projectOpacity);
  portalHalo.material.opacity = 0.22 * rootOpacity;

  if (raw >= 1) finishNavigation(transition.to);
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

function loadPersistedState() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function persistSpatialState() {
  try {
    const cards = Object.fromEntries(cardMeshes.map((card) => [card.userData.id, card.userData.basePosition.toArray()]));
    const bodies = Object.fromEntries(cardMeshes
      .filter((card) => card.userData.editable)
      .map((card) => [card.userData.id, card.userData.body]));
    const views = Object.fromEntries(Object.entries(state.views).map(([id, view]) => [id, {
      pan: view.pan.toArray(),
      zoom: view.zoom,
      depth: view.depth,
    }]));
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ cards, bodies, views }));
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
