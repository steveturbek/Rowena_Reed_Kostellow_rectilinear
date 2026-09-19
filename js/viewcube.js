// View cube (top right): a small, world-axis-aligned cube that mirrors the
// main camera's orientation. Drag it to orbit the camera, click a face to
// snap the camera to that view. It is drawn into a scissored corner of the
// main canvas; a transparent DOM overlay (#viewcube) receives the mouse, so
// its events never reach the scene underneath. The Home and auto-rotate
// buttons in its upper-left corner are wired up here too.

const VIEWCUBE_CAMERA_DISTANCE = 4;
const VIEWCUBE_DRAG_THRESHOLD_PX = 4;
const VIEWCUBE_TOUCH_DRAG_THRESHOLD_PX = 10; // a fingertip wobbles more than a mouse
const VIEWCUBE_ORBIT_DEG_PER_PX = 0.6;

// Material Design "play_arrow" and "pause" icon paths (24x24 viewBox).
const PLAY_ICON_PATH = "M8 5v14l11-7z";
const PAUSE_ICON_PATH = "M6 19h4V5H6v14zm8-14v14h4V5h-4z";

// Order matches BoxGeometry's material groups: +x, -x, +y, -y, +z, -z.
// A null azimuth keeps the current one. TOP uses azimuth 0 so its label reads
// upright: the +y face's texture has its top edge toward world -z.
const VIEWCUBE_FACES = [
  { label: "RIGHT", azimuth: 90, elevation: 0 },
  { label: "LEFT", azimuth: -90, elevation: 0 },
  { label: "TOP", azimuth: 0, elevation: 90 },
  { label: "BOTTOM", azimuth: null, elevation: -90 },
  { label: "FRONT", azimuth: 0, elevation: 0 },
  { label: "BACK", azimuth: 180, elevation: 0 },
];

let viewCubeEl;
let viewCubeScene;
let viewCubeCamera;
let viewCubeMesh;
let viewCubeRaycaster;
let viewCubeMaterials = [];
let viewCubeTextures = []; // per face: { normal, hover }
let viewCubeHoverIndex = -1;
let viewCubeRect = { x: 0, y: 0, size: 120 };
let viewCubeDrag = null;
let rotateButtonEl;
let rotateIconEl;

function initViewCube() {
  viewCubeEl = document.getElementById("viewcube");

  viewCubeScene = new THREE.Scene();
  viewCubeCamera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  viewCubeRaycaster = new THREE.Raycaster();

  for (const face of VIEWCUBE_FACES) {
    const textures = { normal: makeViewCubeTexture(face.label, false), hover: makeViewCubeTexture(face.label, true) };
    viewCubeTextures.push(textures);
    viewCubeMaterials.push(new THREE.MeshBasicMaterial({ map: textures.normal, toneMapped: false }));
  }
  viewCubeMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), viewCubeMaterials);
  viewCubeScene.add(viewCubeMesh);

  updateViewCubeRect();
  window.addEventListener("resize", updateViewCubeRect);
  viewCubeEl.addEventListener("pointermove", onViewCubePointerMove);
  viewCubeEl.addEventListener("pointerleave", onViewCubePointerLeave);
  viewCubeEl.addEventListener("pointerdown", onViewCubePointerDown);

  initViewButtons();
}

function makeViewCubeTexture(label, hovered) {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = hovered ? "#8fb8ff" : "#e9e9e9";
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = "#666666";
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, size - 6, size - 6);
  ctx.fillStyle = "#333333";
  ctx.font = "bold 22px -apple-system, BlinkMacSystemFont, Helvetica, Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, size / 2, size / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.encoding = THREE.sRGBEncoding;
  return texture;
}

function updateViewCubeRect() {
  const r = viewCubeEl.getBoundingClientRect();
  viewCubeRect = { x: r.left, y: window.innerHeight - r.bottom, size: r.width };
}

// Draws the view cube over the corner of the canvas, after the main scene.
function renderViewCube() {
  viewCubeCamera.position.copy(cameraDirection()).multiplyScalar(VIEWCUBE_CAMERA_DISTANCE);
  viewCubeCamera.lookAt(0, 0, 0);

  const { x, y, size } = viewCubeRect;
  renderer.autoClear = false;
  renderer.setViewport(x, y, size, size);
  renderer.setScissor(x, y, size, size);
  renderer.setScissorTest(true);
  renderer.clearDepth();
  renderer.render(viewCubeScene, viewCubeCamera);
  renderer.setScissorTest(false);
  renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
  renderer.autoClear = true;
}

// Returns the index into VIEWCUBE_FACES under the mouse, or -1.
function pickViewCubeFace(event) {
  const r = viewCubeEl.getBoundingClientRect();
  const ndc = new THREE.Vector2(
    ((event.clientX - r.left) / r.width) * 2 - 1,
    -((event.clientY - r.top) / r.height) * 2 + 1,
  );
  viewCubeRaycaster.setFromCamera(ndc, viewCubeCamera);
  const hit = viewCubeRaycaster.intersectObject(viewCubeMesh)[0];
  return hit ? hit.face.materialIndex : -1;
}

function setViewCubeHover(index) {
  if (index === viewCubeHoverIndex) return;
  viewCubeHoverIndex = index;
  viewCubeMaterials.forEach((material, i) => {
    material.map = i === index ? viewCubeTextures[i].hover : viewCubeTextures[i].normal;
  });
}

// Hover highlighting is a mouse thing; on touch it would just stick after a tap.
function onViewCubePointerMove(event) {
  if (event.pointerType === "mouse" && !viewCubeDrag) setViewCubeHover(pickViewCubeFace(event));
}

function onViewCubePointerLeave() {
  if (!viewCubeDrag) setViewCubeHover(-1);
}

function onViewCubePointerDown(event) {
  if (event.button !== 0 || !event.isPrimary) return; // ignore extra fingers
  event.preventDefault();

  viewCubeDrag = {
    pointerId: event.pointerId,
    dragThreshold: event.pointerType === "mouse" ? VIEWCUBE_DRAG_THRESHOLD_PX : VIEWCUBE_TOUCH_DRAG_THRESHOLD_PX,
    startX: event.clientX,
    startY: event.clientY,
    lastX: event.clientX,
    lastY: event.clientY,
    faceIndex: pickViewCubeFace(event),
    moved: false,
  };
  window.addEventListener("pointermove", onViewCubeDragMove);
  window.addEventListener("pointerup", onViewCubeDragEnd);
  window.addEventListener("pointercancel", onViewCubeDragEnd);
}

function onViewCubeDragMove(event) {
  const drag = viewCubeDrag;
  if (event.pointerId !== drag.pointerId) return;
  if (!drag.moved) {
    if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < drag.dragThreshold) return;
    drag.moved = true;
    setViewCubeHover(-1);
  }

  // Dragging right swings the camera left, so the scene turns with the mouse.
  orbitCameraBy(
    -(event.clientX - drag.lastX) * VIEWCUBE_ORBIT_DEG_PER_PX,
    (event.clientY - drag.lastY) * VIEWCUBE_ORBIT_DEG_PER_PX,
  );
  drag.lastX = event.clientX;
  drag.lastY = event.clientY;
}

function onViewCubeDragEnd(event) {
  if (event.pointerId !== viewCubeDrag.pointerId) return;
  window.removeEventListener("pointermove", onViewCubeDragMove);
  window.removeEventListener("pointerup", onViewCubeDragEnd);
  window.removeEventListener("pointercancel", onViewCubeDragEnd);

  const drag = viewCubeDrag;
  viewCubeDrag = null;
  if (event.type === "pointercancel") return; // the browser took the touch over; don't treat it as a tap

  if (!drag.moved && drag.faceIndex >= 0) {
    const face = VIEWCUBE_FACES[drag.faceIndex];
    snapCameraTo(face.azimuth === null ? cameraAzimuthDeg : face.azimuth, face.elevation);
  }
}

function initViewButtons() {
  document.getElementById("home-button").addEventListener("click", () => {
    snapCameraTo(DEFAULT_CAMERA_AZIMUTH_DEG, DEFAULT_CAMERA_ELEVATION_DEG);
  });

  rotateButtonEl = document.getElementById("rotate-button");
  rotateIconEl = document.getElementById("rotate-icon");
  rotateButtonEl.addEventListener("click", () => setAutoRotate(!autoRotate));
  updateAutoRotateButton();
}

// Called by scene.js whenever auto-rotate turns on or off, including when a
// manual view change pauses it.
function updateAutoRotateButton() {
  const label = autoRotate ? "Pause rotation" : "Play rotation";
  rotateIconEl.setAttribute("d", autoRotate ? PAUSE_ICON_PATH : PLAY_ICON_PATH);
  rotateButtonEl.title = label;
  rotateButtonEl.setAttribute("aria-label", label);
}
