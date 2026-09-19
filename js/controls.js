// Camera/group controls: left/right arrows spin the cube group, up/down
// arrows and the mouse wheel zoom. Held arrow keys animate smoothly via
// updateControls(), called once per frame from the render loop.

const ROTATE_SPEED = 1.2; // radians per second
const KEY_ZOOM_SPEED = 8; // world units per second
const WHEEL_ZOOM_SPEED = 0.01; // world units per wheel-delta unit

const ARROW_KEYS = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"];

let heldKeys = new Set();
let lastFrameTime = performance.now();

function initControls() {
  window.addEventListener("keydown", onControlsKeyDown);
  window.addEventListener("keyup", onControlsKeyUp);
  renderer.domElement.addEventListener("wheel", onWheel, { passive: false });
}

function onControlsKeyDown(event) {
  if (ARROW_KEYS.includes(event.key)) {
    event.preventDefault();
    heldKeys.add(event.key);
  }
}

function onControlsKeyUp(event) {
  heldKeys.delete(event.key);
}

function onWheel(event) {
  event.preventDefault();
  setCameraDistance(cameraDistance + event.deltaY * WHEEL_ZOOM_SPEED);
}

function updateControls() {
  const now = performance.now();
  const dt = Math.min((now - lastFrameTime) / 1000, 0.1);
  lastFrameTime = now;

  if (heldKeys.has("ArrowLeft")) cubeGroup.rotation.y += ROTATE_SPEED * dt;
  if (heldKeys.has("ArrowRight")) cubeGroup.rotation.y -= ROTATE_SPEED * dt;
  if (heldKeys.has("ArrowUp")) setCameraDistance(cameraDistance - KEY_ZOOM_SPEED * dt);
  if (heldKeys.has("ArrowDown")) setCameraDistance(cameraDistance + KEY_ZOOM_SPEED * dt);
}
