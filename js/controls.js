// Trackpad input: a two-finger swipe orbits the camera (like dragging the
// view cube) and a pinch zooms. Browsers report a pinch as a wheel event with
// ctrlKey set, so Ctrl + scroll on a mouse wheel zooms too.

const SWIPE_ORBIT_DEG_PER_PX = 0.3;
const PINCH_ZOOM_PER_PX = 0.01;
const PINCH_MAX_DELTA_PX = 30; // keeps a Ctrl + mouse-wheel notch from jumping

function initControls() {
  // Non-passive so preventDefault can stop the browser's own page zoom and
  // its two-finger back/forward swipe.
  window.addEventListener("wheel", onWheel, { passive: false });
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
