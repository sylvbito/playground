import * as THREE from 'three';
import { InteractionManager } from 'three/addons/interaction/InteractionManager.js';
import { installHtmlInCanvasPolyfill } from 'three-html-render/polyfill';

const $ = (selector, root = document) => root.querySelector(selector);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const lerp = (a, b, t) => a + (b - a) * t;
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
    description: 'Select a card, write directly into it, or enter the green space.',
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
    position: [-4.15, 1.55, 0.55], rotation: [0.03, -0.035, -0.025], editable: true,
  },
  {
    id: 'portal', space: 'root', kind: 'space · 4 cards', title: 'Website redesign',
    body: '<div class="portal-preview"><i></i><i></i></div>',
    footer: '<button class="space-action" type="button">Enter space <span aria-hidden="true">↗</span></button>', tone: 'green',
    position: [0.05, 0.65, -0.55], rotation: [-0.01, 0.025, 0.012], portal: true,
  },
  {
    id: 'model', space: 'root', kind: 'principle', title: 'The canvas is a view, not the model',
    body: 'One thought can appear in several spaces without becoming several thoughts.',
    footer: '<span class="link-chip">2 linked objects</span>', tone: 'blue',
    position: [4.05, 1.45, -1.55], rotation: [0.025, 0.055, 0.018], editable: true,
  },
  {
    id: 'background-ai', space: 'root', kind: 'direction', title: 'AI in the background',
    body: 'Small assists around ordinary actions; explicit conversation only when it earns the foreground.',
    footer: '<span class="tag">product thesis</span>', tone: 'warm',
    position: [-2.15, -2.05, -0.95], rotation: [-0.02, 0.015, -0.022], editable: true,
  },
  {
    id: 'question', space: 'root', kind: 'open question', title: 'How much depth is enough?',
    body: 'Use depth to communicate nesting and focus—not to make a desk float in space.',
    footer: '<span class="card-spark" aria-hidden="true"></span>', tone: 'dark',
    position: [2.7, -2.05, -2.05], rotation: [0.02, -0.04, 0.018], editable: true,
  },
  {
    id: 'brief', space: 'project', kind: 'brief', title: 'Clarify what changed',
    body: 'The new homepage should reveal the service model before it asks for trust.',
    footer: '<span class="tag">priority</span>', tone: '',
    position: [-3.65, 1.55, -17.15], rotation: [0.025, -0.04, -0.015], editable: true,
  },
  {
    id: 'hierarchy', space: 'project', kind: 'reference', title: 'Homepage hierarchy',
    body: 'Promise → evidence → process → proof → clear next step. No decorative detours.',
    footer: '<span class="link-chip">source · review 03</span>', tone: 'blue',
    position: [0.05, 1.35, -18.05], rotation: [-0.015, 0.02, 0.01], editable: true,
  },
  {
    id: 'motion', space: 'project', kind: 'prototype', title: 'Test the reveal',
    body: 'Start narrow after navigation, then let the working surface settle into place.',
    footer: '<span class="tag">motion study</span>', tone: 'green',
    position: [3.65, 0.65, -18.75], rotation: [0.015, 0.045, 0.022], editable: true,
  },
  {
    id: 'decision', space: 'project', kind: 'decision', title: 'Keep forms visible',
    body: 'The action belongs beside the evidence. Do not hide it behind a generated panel.',
    footer: '<span class="tag">accepted</span>', tone: 'warm',
    position: [-0.8, -2.15, -17.35], rotation: [-0.015, -0.025, -0.02], editable: true,
  },
];

const state = {
  space: 'root', selected: null, transitioning: false,
  pointer: new THREE.Vector2(), pointerSmooth: new THREE.Vector2(),
  cameraPosition: spaces.root.camera.clone(), cameraLook: spaces.root.look.clone(),
  transition: null,
  paintReady: false,
};

let renderer;
let camera;
let scene;
let interactions;
let cardMeshes = [];
let roots = {};
let portalHalo;
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
  updateSpaceInteractivity();
  setApiState();
  bindUi();

  window.__orbitLab = {
    state,
    camera,
    renderer,
    scene,
    cards: cardMeshes,
    enterSpace: () => navigateSpace('project'),
    exitSpace: () => navigateSpace('root'),
    select: (id) => selectCard(cardMeshes.find((card) => card.userData.id === id)),
    nativeHtmlCanvas,
  };
}

function createCard(data) {
  const element = $('#card-template').content.firstElementChild.cloneNode(true);
  element.dataset.id = data.id;
  if (data.tone) element.dataset.tone = data.tone;
  $('.card-kind', element).textContent = data.kind;
  $('.card-depth', element).textContent = data.space === 'root' ? `z ${data.position[2].toFixed(1)}` : 'inside 01.1';
  $('.card-title', element).textContent = data.title;
  $('.card-body', element).innerHTML = data.body;
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
  mesh.position.fromArray(data.position);
  mesh.rotation.set(...data.rotation);
  mesh.userData = {
    ...data,
    element,
    basePosition: mesh.position.clone(),
    baseRotation: mesh.rotation.clone(),
    targetLift: 0,
  };
  roots[data.space].add(mesh);
  interactions.add(mesh);

  element.addEventListener('click', (event) => {
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
  for (const card of cardMeshes) {
    const active = card === mesh;
    card.userData.element.classList.toggle('is-selected', active);
    card.userData.targetLift = active ? 0.48 : 0;
  }
  renderer.domElement.requestPaint?.();
}

function navigateSpace(destination) {
  if (state.transitioning || destination === state.space) return;
  const from = state.space;
  const entering = destination === 'project';
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
  $('.space-caption').classList.add('is-transitioning');
  $('#back-space').disabled = true;
  setGroupPointerEvents('root', false);
  setGroupPointerEvents('project', false);

  window.setTimeout(() => {
    updateCaption(destination);
    $('#back-space').hidden = destination !== 'project';
  }, state.transition.duration * 0.46);
}

function finishNavigation(destination) {
  state.space = destination;
  state.transitioning = false;
  state.transition = null;
  state.cameraPosition.copy(spaces[destination].camera);
  state.cameraLook.copy(spaces[destination].look);
  updateSpaceInteractivity();
  $('#back-space').disabled = false;
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
  const from = cardMeshes.find((card) => card.userData.id === fromId)?.position;
  const to = cardMeshes.find((card) => card.userData.id === toId)?.position;
  if (!from || !to) return;
  const middle = from.clone().lerp(to, 0.5);
  middle.z -= 0.42;
  middle.y += 0.2;
  const curve = new THREE.QuadraticBezierCurve3(from.clone(), middle, to.clone());
  const geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(36));
  const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity });
  roots[spaceId].add(new THREE.Line(geometry, material));
}

function addPortalHalo() {
  const geometry = new THREE.RingGeometry(2.15, 2.19, 96);
  const material = new THREE.MeshBasicMaterial({
    color: 0xb8f3a4, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false,
  });
  portalHalo = new THREE.Mesh(geometry, material);
  portalHalo.position.set(0.05, 0.65, -0.67);
  roots.root.add(portalHalo);
}

function bindUi() {
  window.addEventListener('resize', onResize);
  window.addEventListener('pointermove', (event) => {
    state.pointer.x = (event.clientX / window.innerWidth - 0.5) * 2;
    state.pointer.y = (event.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && state.space === 'project' && !state.transitioning) navigateSpace('root');
    if (event.key === '0' && !event.target.closest('textarea')) resetView();
  });
  $('#back-space').addEventListener('click', () => navigateSpace('root'));
  $('#reset-view').addEventListener('click', resetView);
  $('#api-help').addEventListener('click', (event) => {
    event.stopPropagation();
    $('#api-popover').hidden = !$('#api-popover').hidden;
  });
  document.addEventListener('click', (event) => {
    if (!event.target.closest('#api-popover, #api-help')) $('#api-popover').hidden = true;
  });
}

function resetView() {
  state.pointer.set(0, 0);
  state.pointerSmooth.set(0, 0);
  clearSelection();
  state.cameraPosition.copy(spaces[state.space].camera);
  state.cameraLook.copy(spaces[state.space].look);
  camera.position.copy(state.cameraPosition);
  camera.lookAt(state.cameraLook);
  showToast('View reset');
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

  if (state.transition) updateTransition(time);
  else updateCameraParallax();

  for (const card of cardMeshes) {
    const selectedLift = card.userData.targetLift;
    const targetZ = card.userData.basePosition.z + selectedLift;
    card.position.z = lerp(card.position.z, targetZ, 0.09);
    const targetScale = selectedLift ? 1.035 : 1;
    card.scale.x = lerp(card.scale.x, targetScale, 0.09);
    card.scale.y = lerp(card.scale.y, targetScale, 0.09);
  }

  if (portalHalo) {
    portalHalo.rotation.z = time * 0.000035;
    const pulse = 1 + Math.sin(time * 0.0012) * 0.015;
    portalHalo.scale.setScalar(pulse);
  }

  camera.lookAt(state.cameraLook);
  interactions.update();
  renderer.render(scene, camera);
}

function updateCameraParallax() {
  const base = spaces[state.space].camera;
  const lookBase = spaces[state.space].look;
  const multiplier = state.space === 'root' ? 0.38 : 0.31;
  const targetX = base.x + state.pointerSmooth.x * multiplier;
  const targetY = base.y - state.pointerSmooth.y * multiplier * 0.58;
  camera.position.x = lerp(camera.position.x, targetX, 0.045);
  camera.position.y = lerp(camera.position.y, targetY, 0.045);
  camera.position.z = lerp(camera.position.z, base.z, 0.045);
  state.cameraLook.x = lerp(state.cameraLook.x, lookBase.x + state.pointerSmooth.x * 0.16, 0.045);
  state.cameraLook.y = lerp(state.cameraLook.y, lookBase.y - state.pointerSmooth.y * 0.09, 0.045);
  state.cameraLook.z = lerp(state.cameraLook.z, lookBase.z, 0.045);
}

function updateTransition(time) {
  const transition = state.transition;
  const raw = clamp((time - transition.start) / transition.duration, 0, 1);
  const t = easeInOutQuint(raw);
  const destination = spaces[transition.to];

  if (transition.entering) {
    const portal = cardMeshes.find((card) => card.userData.id === 'portal').userData.basePosition;
    const focusT = clamp(raw / 0.42, 0, 1);
    const diveT = clamp((raw - 0.32) / 0.68, 0, 1);
    const focusEase = easeInOutQuint(focusT);
    const diveEase = easeInOutQuint(diveT);
    camera.position.x = lerp(transition.fromPosition.x, portal.x, focusEase);
    camera.position.y = lerp(transition.fromPosition.y, portal.y, focusEase);
    camera.position.z = raw < 0.32
      ? lerp(transition.fromPosition.z, 6.4, focusEase)
      : lerp(6.4, destination.camera.z, diveEase);
    state.cameraLook.x = lerp(transition.fromLook.x, destination.look.x, t);
    state.cameraLook.y = lerp(transition.fromLook.y, destination.look.y, t);
    state.cameraLook.z = lerp(transition.fromLook.z, destination.look.z, diveEase);
  } else {
    camera.position.lerpVectors(transition.fromPosition, destination.camera, t);
    state.cameraLook.lerpVectors(transition.fromLook, destination.look, t);
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

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
