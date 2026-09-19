// Raycasting-based selection: click a face, double-click (or Tab/Shift+Tab)
// a whole cube. Highlight visuals are parented directly to the picked
// cube's mesh and expressed in unit-box local coordinates (+-0.5 per axis)
// so the mesh's own non-uniform scale (width/height/depth) automatically
// sizes them correctly - no manual world-space size math needed.

const FACE_DEFS = {
  "+x": { position: [0.5, 0, 0], rotation: [0, Math.PI / 2, 0] },
  "-x": { position: [-0.5, 0, 0], rotation: [0, -Math.PI / 2, 0] },
  "+y": { position: [0, 0.5, 0], rotation: [-Math.PI / 2, 0, 0] },
  "-y": { position: [0, -0.5, 0], rotation: [Math.PI / 2, 0, 0] },
  "+z": { position: [0, 0, 0.5], rotation: [0, 0, 0] },
  "-z": { position: [0, 0, -0.5], rotation: [0, Math.PI, 0] },
};

const CUBE_ORDER = ["A", "B", "C"];

let raycaster;
let pointerNDC = new THREE.Vector2();
let selection = null; // { type: 'face', cube, faceKey } | { type: 'cube', cube } | null
let faceHighlightMesh;
let cubeOutlineMesh;
let activeCubeIndex = -1;

function initSelection() {
  raycaster = new THREE.Raycaster();

  const decalMaterial = new THREE.MeshBasicMaterial({
    color: 0x3399ff,
    transparent: true,
    opacity: 0.35,
    side: THREE.DoubleSide,
    depthTest: true,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
  });
  faceHighlightMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), decalMaterial);
  faceHighlightMesh.visible = false;

  const outlineMaterial = new THREE.LineBasicMaterial({ color: 0xff9900 });
  cubeOutlineMesh = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)),
    outlineMaterial
  );
  cubeOutlineMesh.visible = false;

  renderer.domElement.addEventListener("dblclick", onDoubleClick);
  window.addEventListener("keydown", onSelectionKeyDown);
}

function faceKeyFromNormal(normal) {
  if (normal.x > 0.5) return "+x";
  if (normal.x < -0.5) return "-x";
  if (normal.y > 0.5) return "+y";
  if (normal.y < -0.5) return "-y";
  if (normal.z > 0.5) return "+z";
  return "-z";
}

// Raycasts from a mouse event into the scene, returns the first cube hit
// as { cube, faceKey, point } (point is the world-space intersection), or
// null if nothing was hit.
function raycastAtPointer(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointerNDC.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointerNDC.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointerNDC, camera);
  const meshes = cubes.map((c) => c.mesh);
  const hits = raycaster.intersectObjects(meshes);
  if (!hits.length) return null;

  const hit = hits[0];
  const cube = cubes.find((c) => c.mesh === hit.object);
  const faceKey = faceKeyFromNormal(hit.face.normal);
  return { cube, faceKey, point: hit.point };
}

function setFaceSelection(cube, faceKey) {
  selection = { type: "face", cube, faceKey };
  activeCubeIndex = CUBE_ORDER.indexOf(cube.id);
  updateSelectionVisuals();
}

function setCubeSelection(cube) {
  selection = { type: "cube", cube };
  activeCubeIndex = CUBE_ORDER.indexOf(cube.id);
  updateSelectionVisuals();
}

function clearSelection() {
  selection = null;
  activeCubeIndex = -1;
  updateSelectionVisuals();
}

function updateSelectionVisuals() {
  faceHighlightMesh.visible = false;
  cubeOutlineMesh.visible = false;
  if (faceHighlightMesh.parent) faceHighlightMesh.parent.remove(faceHighlightMesh);
  if (cubeOutlineMesh.parent) cubeOutlineMesh.parent.remove(cubeOutlineMesh);

  if (!selection) return;

  if (selection.type === "face") {
    const def = FACE_DEFS[selection.faceKey];
    faceHighlightMesh.position.set(...def.position);
    faceHighlightMesh.rotation.set(...def.rotation);
    faceHighlightMesh.scale.set(1, 1, 1);
    selection.cube.mesh.add(faceHighlightMesh);
    faceHighlightMesh.visible = true;
  } else if (selection.type === "cube") {
    cubeOutlineMesh.position.set(0, 0, 0);
    cubeOutlineMesh.rotation.set(0, 0, 0);
    cubeOutlineMesh.scale.set(1, 1, 1);
    selection.cube.mesh.add(cubeOutlineMesh);
    cubeOutlineMesh.visible = true;
  }
}

function onDoubleClick(event) {
  const hit = raycastAtPointer(event);
  if (hit) {
    setCubeSelection(hit.cube);
  } else {
    clearSelection();
  }
}

function cycleActiveCube(direction) {
  if (!cubes.length) return;
  activeCubeIndex = (activeCubeIndex + direction + CUBE_ORDER.length) % CUBE_ORDER.length;
  const cube = getCubeById(CUBE_ORDER[activeCubeIndex]);
  if (cube) setCubeSelection(cube);
}

function onSelectionKeyDown(event) {
  if (event.key === "Tab") {
    event.preventDefault();
    cycleActiveCube(event.shiftKey ? -1 : 1);
  } else if (event.key === "Escape") {
    clearSelection();
  }
}
