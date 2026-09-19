// Drag handling. What a drag does depends on the current selection:
// - whole cube selected (double-click / Tab): dragging that cube moves it,
//   within the plane of the face that was grabbed.
// - otherwise, pressing on a face selects it, and dragging pushes/pulls
//   that face in or out, CAD-style, resizing the cube along that one axis
//   while the opposite face stays anchored.
// A plain click on the selected cube (no drag) drops back to face selection.

const DRAG_THRESHOLD_PX = 5;
const EXTRUDE_MAX_FACING = 0.98; // |viewDir . faceNormal| above this = face seen head-on

let dragState = null;

function initManipulate() {
  renderer.domElement.addEventListener("mousedown", onManipulatePointerDown);
}

function worldToScreenPx(worldPos) {
  const ndc = worldPos.clone().project(camera);
  const rect = renderer.domElement.getBoundingClientRect();
  return {
    x: (ndc.x * 0.5 + 0.5) * rect.width + rect.left,
    y: (-ndc.y * 0.5 + 0.5) * rect.height + rect.top,
  };
}

function onManipulatePointerDown(event) {
  if (event.button !== 0) return;

  const hit = raycastAtPointer(event);
  if (!hit) {
    clearSelection();
    return;
  }

  const intent =
    selection && selection.type === "cube" && selection.cube === hit.cube
      ? "move"
      : "extrude";
  if (intent === "extrude") setFaceSelection(hit.cube, hit.faceKey);

  const def = FACE_DEFS[hit.faceKey];
  const axisLetter = hit.faceKey[1]; // 'x' | 'y' | 'z'
  const sign = hit.faceKey[0] === "+" ? 1 : -1;

  const localNormal = new THREE.Vector3(...def.position).normalize();
  const worldNormal = localNormal.clone().applyQuaternion(cubeGroup.quaternion);
  const movePlane = new THREE.Plane().setFromNormalAndCoplanarPoint(worldNormal, hit.point);

  const startSnapshot = {
    position: { x: hit.cube.position.x, y: hit.cube.position.y, z: hit.cube.position.z },
    width: hit.cube.width,
    height: hit.cube.height,
    depth: hit.cube.depth,
  };

  // Establish, up front, how many screen pixels correspond to one world
  // unit of travel along this face's normal, at this depth/angle - used
  // to scale extrude distance.
  const p0 = hit.point.clone();
  const p1 = p0.clone().add(worldNormal.clone().multiplyScalar(0.1));
  const s0 = worldToScreenPx(p0);
  const s1 = worldToScreenPx(p1);
  const screenNormalDir = new THREE.Vector2(s1.x - s0.x, s1.y - s0.y);
  const screenNormalLen = screenNormalDir.length();
  // A face seen head-on (e.g. the front face from the FRONT view) has no
  // usable screen direction along its normal, so it can't be pushed/pulled.
  const viewDir = p0.clone().sub(camera.position).normalize();
  const validNormalProjection = Math.abs(viewDir.dot(worldNormal)) < EXTRUDE_MAX_FACING;
  if (validNormalProjection) screenNormalDir.divideScalar(screenNormalLen);

  dragState = {
    cube: hit.cube,
    faceKey: hit.faceKey,
    intent,
    axisLetter,
    sign,
    worldNormal,
    movePlane,
    startSnapshot,
    startWorldPoint: hit.point.clone(),
    startClientX: event.clientX,
    startClientY: event.clientY,
    mode: null,
    screenNormalDir: validNormalProjection ? screenNormalDir : null,
    screenPixelsPerWorldUnit: validNormalProjection ? screenNormalLen / 0.1 : 0,
  };

  window.addEventListener("mousemove", onManipulatePointerMove);
  window.addEventListener("mouseup", onManipulatePointerUp);
}

function onManipulatePointerMove(event) {
  if (!dragState) return;

  const dx = event.clientX - dragState.startClientX;
  const dy = event.clientY - dragState.startClientY;
  const totalDeltaLen = Math.hypot(dx, dy);

  if (dragState.mode === null) {
    if (totalDeltaLen < DRAG_THRESHOLD_PX) return;
    dragState.mode = dragState.intent;
  }

  if (dragState.mode === "move") {
    applyMoveDrag(event);
  } else if (dragState.screenNormalDir) {
    applyExtrudeDrag(dx, dy);
  }
}

function applyMoveDrag(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  const ndc = new THREE.Vector2(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1
  );
  raycaster.setFromCamera(ndc, camera);

  const hitPoint = new THREE.Vector3();
  if (!raycaster.ray.intersectPlane(dragState.movePlane, hitPoint)) return;

  const worldDelta = hitPoint.clone().sub(dragState.startWorldPoint);
  const localDelta = worldDelta.applyQuaternion(cubeGroup.quaternion.clone().invert());

  const cube = dragState.cube;
  cube.position.x = dragState.startSnapshot.position.x + localDelta.x;
  cube.position.y = Math.max(
    cube.height / 2, // bottom face stops at the floor
    dragState.startSnapshot.position.y + localDelta.y
  );
  cube.position.z = dragState.startSnapshot.position.z + localDelta.z;

  syncMeshFromData(cube);
}

function applyExtrudeDrag(dx, dy) {
  const alongNormalPx = dx * dragState.screenNormalDir.x + dy * dragState.screenNormalDir.y;
  const worldDelta = alongNormalPx / dragState.screenPixelsPerWorldUnit;
  const snappedDelta = snapToStep(worldDelta, UNIT_STEP);

  const cube = dragState.cube;
  const axisKey = { x: "width", y: "height", z: "depth" }[dragState.axisLetter];
  const startSize = dragState.startSnapshot[axisKey];

  let newSize = startSize + snappedDelta;
  newSize = Math.max(UNIT_STEP, newSize);

  // Pulling the bottom face down grows the cube downward from its anchored
  // top; cap the size so the bottom can't pass through the floor.
  if (dragState.axisLetter === "y" && dragState.sign === -1) {
    const anchoredTop = dragState.startSnapshot.position.y + startSize / 2;
    const maxSize = Math.floor((anchoredTop + 1e-6) / UNIT_STEP) * UNIT_STEP;
    newSize = Math.min(newSize, maxSize);
  }

  const actualDelta = newSize - startSize;

  cube[axisKey] = newSize;

  // Keep the opposite (non-dragged) face anchored in place.
  const posKey = dragState.axisLetter;
  cube.position[posKey] =
    dragState.startSnapshot.position[posKey] + dragState.sign * (actualDelta / 2);

  syncMeshFromData(cube);
}

function onManipulatePointerUp() {
  if (!dragState) return;

  window.removeEventListener("mousemove", onManipulatePointerMove);
  window.removeEventListener("mouseup", onManipulatePointerUp);

  const cube = dragState.cube;

  if (dragState.mode !== null) {
    const stillValid = cubesFormConnectedChain(cubes);
    if (!stillValid) {
      cube.position.x = dragState.startSnapshot.position.x;
      cube.position.y = dragState.startSnapshot.position.y;
      cube.position.z = dragState.startSnapshot.position.z;
      cube.width = dragState.startSnapshot.width;
      cube.height = dragState.startSnapshot.height;
      cube.depth = dragState.startSnapshot.depth;
      syncMeshFromData(cube);
    }
    recenterGroupPivot();
  } else if (dragState.intent === "move") {
    setFaceSelection(cube, dragState.faceKey);
  }

  dragState = null;
}
