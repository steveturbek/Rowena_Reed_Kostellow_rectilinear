// Scene, camera, lighting, ground, and the render loop.

// Floor and sky are this one color, shown exactly as written (0xaeaeae is
// about how the old lit floor looked). The floor is a shadow-only plane over
// the sky color (see setupGround), so the two always match.
const GROUND_COLOR = 0xaeaeae;
const GROUND_SHADOW_OPACITY = 0.45;
const DEFAULT_CAMERA_ELEVATION_DEG = 45;
const DEFAULT_CAMERA_AZIMUTH_DEG = 0; // straight on: cube edges run parallel to the screen edges
// The light rides with the camera, this many degrees to its left (the spec's
// 45deg horizontal light angle). Keeping it off the camera axis is what makes
// shadows and face-to-face shading visible from every view.
const LIGHT_AZIMUTH_OFFSET_DEG = -45;
// Stops just short of straight up/down, where lookAt's up vector degenerates.
const CAMERA_ELEVATION_LIMIT_DEG = 89.5;
const CAMERA_SNAP_MS = 350;
const AUTO_ROTATE_DEG_PER_SEC = 10; // a slow turntable spin: about 36 s per turn

let scene, camera, renderer;
let groundMesh;
let keyLight, fillLight;
let cameraTarget = { x: 0, y: 0, z: 0 };
let cameraDistance = 10;
let cameraAzimuthDeg = DEFAULT_CAMERA_AZIMUTH_DEG;
let cameraElevationDeg = DEFAULT_CAMERA_ELEVATION_DEG;
let cameraSnap = null;
let autoRotate = false;
let lastFrameTime = performance.now();

function initScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(GROUND_COLOR);

  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  // Without tone mapping, lit faces clip straight to flat white instead of
  // shading smoothly - ACES compresses highlights instead of clipping them.
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputEncoding = THREE.sRGBEncoding;
  document.body.appendChild(renderer.domElement);

  setupGround();
  setupLighting();
  updateCameraPosition();

  window.addEventListener("resize", onWindowResize);
}

function setupGround() {
  const groundGeometry = new THREE.PlaneGeometry(500, 500);
  // Transparent except where the key light's shadows fall, so the "floor"
  // is the sky color itself: no lighting mismatch, no visible horizon.
  const groundMaterial = new THREE.ShadowMaterial({ opacity: GROUND_SHADOW_OPACITY });
  groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
  groundMesh.rotation.x = -Math.PI / 2;
  groundMesh.receiveShadow = true;
  scene.add(groundMesh);
}

function setupLighting() {
  // Single bright studio key light at 45deg horizontal / 45deg above subject.
  keyLight = new THREE.DirectionalLight(0xffffff, 0.8);
  positionLightAt45(keyLight);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.width = 2048;
  keyLight.shadow.mapSize.height = 2048;
  keyLight.shadow.camera.near = 0.5;
  keyLight.shadow.camera.far = 60;
  keyLight.shadow.camera.left = -15;
  keyLight.shadow.camera.right = 15;
  keyLight.shadow.camera.top = 15;
  keyLight.shadow.camera.bottom = -15;
  keyLight.shadow.bias = -0.001;
  scene.add(keyLight);
  scene.add(keyLight.target);

  // Low-intensity fill so unlit faces don't render pure black; the
  // directional light above remains the single obvious shadow-caster.
  fillLight = new THREE.AmbientLight(0xffffff, 0.3);
  scene.add(fillLight);
}

function positionLightAt45(light) {
  const elevationRad = THREE.MathUtils.degToRad(45);
  const azimuthRad = THREE.MathUtils.degToRad(cameraAzimuthDeg + LIGHT_AZIMUTH_OFFSET_DEG);
  const distance = 20;
  light.position.set(
    cameraTarget.x + distance * Math.cos(elevationRad) * Math.sin(azimuthRad),
    cameraTarget.y + distance * Math.sin(elevationRad),
    cameraTarget.z + distance * Math.cos(elevationRad) * Math.cos(azimuthRad),
  );
  light.target.position.set(cameraTarget.x, cameraTarget.y, cameraTarget.z);
}

// Unit vector from the camera target out to the camera.
function cameraDirection() {
  const elevationRad = THREE.MathUtils.degToRad(cameraElevationDeg);
  const azimuthRad = THREE.MathUtils.degToRad(cameraAzimuthDeg);
  return new THREE.Vector3(
    Math.cos(elevationRad) * Math.sin(azimuthRad),
    Math.sin(elevationRad),
    Math.cos(elevationRad) * Math.cos(azimuthRad),
  );
}

// The camera starts at the default 45deg view; the view cube changes the
// azimuth/elevation. Zoom (`cameraDistance`) and the recentered pivot
// (`cameraTarget`) change too.
function updateCameraPosition() {
  const dir = cameraDirection();
  camera.position.set(
    cameraTarget.x + cameraDistance * dir.x,
    cameraTarget.y + cameraDistance * dir.y,
    cameraTarget.z + cameraDistance * dir.z,
  );
  camera.lookAt(cameraTarget.x, cameraTarget.y, cameraTarget.z);
}

function clampElevation(deg) {
  return THREE.MathUtils.clamp(deg, -CAMERA_ELEVATION_LIMIT_DEG, CAMERA_ELEVATION_LIMIT_DEG);
}

function orbitCameraBy(deltaAzimuthDeg, deltaElevationDeg) {
  setAutoRotate(false); // a manual view change takes over from auto-rotate
  cameraSnap = null;
  cameraAzimuthDeg += deltaAzimuthDeg;
  cameraElevationDeg = clampElevation(cameraElevationDeg + deltaElevationDeg);
}

// Animates the camera to the given view, turning the short way around.
function snapCameraTo(azimuthDeg, elevationDeg) {
  setAutoRotate(false);
  const deltaAzimuth = ((((azimuthDeg - cameraAzimuthDeg + 180) % 360) + 360) % 360) - 180;
  cameraSnap = {
    startTime: performance.now(),
    fromAzimuth: cameraAzimuthDeg,
    deltaAzimuth,
    fromElevation: cameraElevationDeg,
    toElevation: clampElevation(elevationDeg),
  };
}

function updateCameraSnap() {
  if (!cameraSnap) return;
  const t = Math.min((performance.now() - cameraSnap.startTime) / CAMERA_SNAP_MS, 1);
  const eased = t * t * (3 - 2 * t);
  cameraAzimuthDeg = cameraSnap.fromAzimuth + cameraSnap.deltaAzimuth * eased;
  cameraElevationDeg = cameraSnap.fromElevation + (cameraSnap.toElevation - cameraSnap.fromElevation) * eased;
  if (t === 1) cameraSnap = null;
}

function setAutoRotate(on) {
  if (on === autoRotate) return;
  autoRotate = on;
  updateAutoRotateButton();
}

// Turns the view around the cubes like a turntable: azimuth only, so the
// pitch never changes.
function updateAutoRotate() {
  const now = performance.now();
  const dt = Math.min((now - lastFrameTime) / 1000, 0.1);
  lastFrameTime = now;
  if (autoRotate) cameraAzimuthDeg -= AUTO_ROTATE_DEG_PER_SEC * dt;
}

function setCameraDistance(distance) {
  cameraDistance = THREE.MathUtils.clamp(distance, 3, 60);
  updateCameraPosition();
}

// Frames the camera so the current cube cluster's bounding sphere fits in view.
function frameCamera() {
  if (!cubes.length) return;

  let maxRadius = 0;
  for (const cube of cubes) {
    const dx = cube.position.x - cameraTarget.x;
    const dz = cube.position.z - cameraTarget.z;
    const cubeRadius = Math.sqrt(cube.width * cube.width + cube.height * cube.height + cube.depth * cube.depth) / 2;
    const dist = Math.sqrt(dx * dx + dz * dz) + cubeRadius;
    maxRadius = Math.max(maxRadius, dist);
  }

  const fovRad = THREE.MathUtils.degToRad(camera.fov);
  const fitDistance = (maxRadius / Math.sin(fovRad / 2)) * 1.15;
  setCameraDistance(fitDistance);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function renderLoop() {
  requestAnimationFrame(renderLoop);
  updateAutoRotate();
  updateCameraSnap();
  // Re-applied every frame (cheap) so a recentered pivot (after a drag)
  // is reflected immediately, not just on the next explicit zoom/rotate.
  updateCameraPosition();
  positionLightAt45(keyLight);
  renderer.render(scene, camera);
  renderViewCube();
}
