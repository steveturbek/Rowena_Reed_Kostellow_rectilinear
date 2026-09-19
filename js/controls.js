// Trackpad input: a two-finger swipe orbits the camera (like dragging the
// view cube) and a pinch zooms. Browsers report a pinch as a wheel event with
// ctrlKey set, so Ctrl + scroll on a mouse wheel zooms too.
// Touchscreen input: a two-finger pinch on the canvas zooms.

const SWIPE_ORBIT_DEG_PER_PX = 0.3;
const PINCH_ZOOM_PER_PX = 0.01;
const PINCH_MAX_DELTA_PX = 30; // keeps a Ctrl + mouse-wheel notch from jumping

const touchPointers = new Map(); // pointerId -> { x, y }, for up to two fingers on the canvas
let touchPinch = null; // { startFingerGap, startCameraDistance } while two fingers are down

function initControls() {
  // Non-passive so preventDefault can stop the browser's own page zoom and
  // its two-finger back/forward swipe.
  window.addEventListener("wheel", onWheel, { passive: false });

  renderer.domElement.addEventListener("pointerdown", onTouchPointerDown);
  window.addEventListener("pointermove", onTouchPointerMove);
  window.addEventListener("pointerup", onTouchPointerEnd);
  window.addEventListener("pointercancel", onTouchPointerEnd);
}

function onTouchPointerDown(event) {
  if (event.pointerType !== "touch" || touchPointers.size >= 2) return;

  touchPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  if (touchPointers.size < 2) return;

  // A second finger means a pinch, not an edit: undo whatever the first finger began.
  cancelManipulateDrag();
  touchPinch = { startFingerGap: fingerGap(), startCameraDistance: cameraDistance };
}

function onTouchPointerMove(event) {
  const finger = touchPointers.get(event.pointerId);
  if (!finger) return;

  finger.x = event.clientX;
  finger.y = event.clientY;
  if (!touchPinch) return;

  // Fingers apart = zoom in, so the camera distance shrinks by the same ratio.
  const gap = fingerGap();
  if (gap > 0) setCameraDistance(touchPinch.startCameraDistance * (touchPinch.startFingerGap / gap));
}

function onTouchPointerEnd(event) {
  if (!touchPointers.delete(event.pointerId)) return;
  touchPinch = null;
}

function fingerGap() {
  const [a, b] = touchPointers.values();
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function onWheel(event) {
  event.preventDefault();

  if (event.ctrlKey) {
    const delta = THREE.MathUtils.clamp(event.deltaY, -PINCH_MAX_DELTA_PX, PINCH_MAX_DELTA_PX);
    setCameraDistance(cameraDistance * Math.exp(delta * PINCH_ZOOM_PER_PX));
    return;
  }

  // With macOS natural scrolling the deltas are the opposite of the fingers'
  // motion; these signs make a swipe match dragging the view cube.
  orbitCameraBy(event.deltaX * SWIPE_ORBIT_DEG_PER_PX, -event.deltaY * SWIPE_ORBIT_DEG_PER_PX);
}
