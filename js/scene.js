// Scene, camera, lighting, ground, and the render loop.

const GROUND_COLOR = 0x666666;
const CAMERA_ELEVATION_DEG = 45;
const CAMERA_AZIMUTH_DEG = 35; // arbitrary pleasing default, offset from the light

let scene, camera, renderer;
let groundMesh;
let keyLight, fillLight;
let cameraTarget = { x: 0, y: 0, z: 0 };
let cameraDistance = 10;

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
  const groundMaterial = new THREE.MeshStandardMaterial({
    color: GROUND_COLOR,
    roughness: 0.95,
    metalness: 0,
  });
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
  const azimuthRad = THREE.MathUtils.degToRad(0); // light's own azimuth, camera is offset from it
  const distance = 20;
  light.position.set(
    cameraTarget.x + distance * Math.cos(elevationRad) * Math.sin(azimuthRad),
    cameraTarget.y + distance * Math.sin(elevationRad),
    cameraTarget.z + distance * Math.cos(elevationRad) * Math.cos(azimuthRad),
  );
  light.target.position.set(cameraTarget.x, cameraTarget.y, cameraTarget.z);
}

// Camera stays at a fixed 45deg elevation and fixed azimuth; only
// `cameraDistance` (zoom) and `cameraTarget` (recentered pivot) ever change.
function updateCameraPosition() {
  const elevationRad = THREE.MathUtils.degToRad(CAMERA_ELEVATION_DEG);
  const azimuthRad = THREE.MathUtils.degToRad(CAMERA_AZIMUTH_DEG);
  camera.position.set(
    cameraTarget.x + cameraDistance * Math.cos(elevationRad) * Math.sin(azimuthRad),
    cameraTarget.y + cameraDistance * Math.sin(elevationRad),
    cameraTarget.z + cameraDistance * Math.cos(elevationRad) * Math.cos(azimuthRad),
  );
  camera.lookAt(cameraTarget.x, cameraTarget.y, cameraTarget.z);
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
  updateControls();
  // Re-applied every frame (cheap) so a recentered pivot (after a drag)
  // is reflected immediately, not just on the next explicit zoom/rotate.
  updateCameraPosition();
  positionLightAt45(keyLight);
  renderer.render(scene, camera);
}
