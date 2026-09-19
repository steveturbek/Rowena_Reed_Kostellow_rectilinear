// Shareable links: the model and the view live in the query string, e.g.
//   ?a=3,2,4,0,1,0&b=2,5,2,2.5,2.5,0.75&c=4,1,3,0.5,0.5,-3.5&view=0,45,12
// a / b / c are each cube's width,height,depth,x,y,z in units; view is the
// camera's azimuth and elevation in degrees, then its distance.
// The address bar is rewritten once the state stops changing, so it is always
// a link to what is on screen. A page nobody has touched never writes it, so
// reloading that still gives fresh random cubes.

const URL_POLL_MS = 250;
const URL_MAX_SIZE = 50;
const URL_MAX_POSITION = 100;

let urlSeenState = "";
let urlWrittenState = "";

function roundTo(value, decimals) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function serializeState() {
  const parts = cubes.map((cube) => {
    const values = [cube.width, cube.height, cube.depth, cube.position.x, cube.position.y, cube.position.z];
    return `${cube.id.toLowerCase()}=${values.map((v) => roundTo(v, 3)).join(",")}`;
  });
  const azimuth = ((((cameraAzimuthDeg + 180) % 360) + 360) % 360) - 180;
  parts.push(`view=${roundTo(azimuth, 1)},${roundTo(cameraElevationDeg, 1)},${roundTo(cameraDistance, 2)}`);
  return parts.join("&");
}

// Parses "1,2,3" into exactly `count` finite numbers, or null.
function parseNumbers(text, count) {
  if (!text) return null;
  const numbers = text.split(",").map(Number);
  return numbers.length === count && numbers.every(Number.isFinite) ? numbers : null;
}

function clampSize(value) {
  return snapToStep(THREE.MathUtils.clamp(value, UNIT_STEP, URL_MAX_SIZE));
}

function clampPosition(value) {
  return snapToStep(THREE.MathUtils.clamp(value, -URL_MAX_POSITION, URL_MAX_POSITION), POSITION_STEP);
}

// Returns the cubes described by the URL, or null (so the caller falls back to
// random ones) if any cube is missing or malformed, or they don't all touch.
// Values are clamped and snapped like any other edit, so a hand-edited link
// can't put a cube below the floor or off the grid.
function cubesFromUrl() {
  const params = new URLSearchParams(location.search);
  const loaded = [];

  for (const id of CUBE_ORDER) {
    const numbers = parseNumbers(params.get(id.toLowerCase()), 6);
    if (!numbers) return null;

    const [w, h, d, x, y, z] = numbers;
    const height = clampSize(h);
    loaded.push({
      id,
      width: clampSize(w),
      height,
      depth: clampSize(d),
      position: { x: clampPosition(x), y: Math.max(clampPosition(y), height / 2), z: clampPosition(z) },
    });
  }

  if (!cubesFormConnectedChain(loaded)) return null;

  for (const cube of loaded) cube.mesh = createCubeMesh();
  return loaded;
}

function applyViewFromUrl() {
  const view = parseNumbers(new URLSearchParams(location.search).get("view"), 3);
  if (!view) return;

  cameraAzimuthDeg = view[0];
  cameraElevationDeg = clampElevation(view[1]);
  setCameraDistance(view[2]);
}

// Runs after initCubes(): the shared view has to override the auto-framed one.
function initUrlState() {
  applyViewFromUrl();
  urlSeenState = serializeState();
  urlWrittenState = urlSeenState;
  setInterval(updateUrlState, URL_POLL_MS);
}

// Writes the link once the state is unchanged between two ticks, so it is
// skipped mid-drag, mid-animation and while auto-rotating.
function updateUrlState() {
  const state = serializeState();
  const settled = state === urlSeenState;
  urlSeenState = state;
  if (!settled || state === urlWrittenState) return;

  urlWrittenState = state;
  try {
    history.replaceState(null, "", "?" + state);
  } catch (error) {
    // Some browsers refuse to rewrite the URL of a page opened from disk
    // (file://). Sharing needs the hosted page anyway, so just carry on.
  }
}
