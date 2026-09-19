// Cube data model, randomized generation, and the "must touch" constraint.
// Kept as plain data + a mesh-sync function, separate from Three.js internals,
// so the model stays simple and (eventually) trivially save/load-able.

const UNIT_STEP = 0.5;
const MIN_UNITS = 1;
const MAX_UNITS = 6;
const MIN_OVERLAP_FRACTION = 0.2;

let cubes = [];
let cubeGroup;
let sharedCubeMaterial;
let sharedUnitGeometry;

// cubeGroup.position tracks this pivot so rotation.y spins the cluster
// around its own footprint center rather than the world origin. Cube
// data positions (`cube.position`) stay in absolute ground coordinates;
// only each mesh's local position is offset by the pivot.
let groupPivot = { x: 0, z: 0 };

function randomUnits(min = MIN_UNITS, max = MAX_UNITS) {
  const steps = Math.round((max - min) / UNIT_STEP);
  return min + Math.floor(Math.random() * (steps + 1)) * UNIT_STEP;
}

function snapToStep(value, step = UNIT_STEP) {
  return Math.round(value / step) * step;
}

function cubeBounds(cube) {
  const hw = cube.width / 2;
  const hh = cube.height / 2;
  const hd = cube.depth / 2;
  return {
    min: {
      x: cube.position.x - hw,
      y: cube.position.y - hh,
      z: cube.position.z - hd,
    },
    max: {
      x: cube.position.x + hw,
      y: cube.position.y + hh,
      z: cube.position.z + hd,
    },
  };
}

function boxesTouch(cubeA, cubeB, eps = 0.001) {
  const a = cubeBounds(cubeA);
  const b = cubeBounds(cubeB);
  return (
    a.min.x <= b.max.x + eps &&
    a.max.x >= b.min.x - eps &&
    a.min.y <= b.max.y + eps &&
    a.max.y >= b.min.y - eps &&
    a.min.z <= b.max.z + eps &&
    a.max.z >= b.min.z - eps
  );
}

// Chain connectivity is enough: A-B and B-C touching satisfies the rule,
// A and C don't have to touch each other directly.
function cubesFormConnectedChain(cubeList) {
  if (cubeList.length <= 1) return true;
  const visited = new Set([cubeList[0].id]);
  const stack = [cubeList[0]];
  while (stack.length) {
    const current = stack.pop();
    for (const other of cubeList) {
      if (visited.has(other.id)) continue;
      if (boxesTouch(current, other)) {
        visited.add(other.id);
        stack.push(other);
      }
    }
  }
  return visited.size === cubeList.length;
}

function createCubeMesh() {
  const mesh = new THREE.Mesh(sharedUnitGeometry, sharedCubeMaterial);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function syncMeshFromData(cube) {
  cube.mesh.scale.set(cube.width, cube.height, cube.depth);
  cube.mesh.position.set(
    cube.position.x - groupPivot.x,
    cube.position.y,
    cube.position.z - groupPivot.z
  );
}

// Recomputes the cluster's footprint (XZ) bounding-box center and moves
// cubeGroup's pivot there, re-syncing meshes so nothing visually jumps.
function recenterGroupPivot() {
  if (!cubes.length) return;

  let minX = Infinity,
    maxX = -Infinity,
    minZ = Infinity,
    maxZ = -Infinity;
  for (const cube of cubes) {
    const hw = cube.width / 2;
    const hd = cube.depth / 2;
    minX = Math.min(minX, cube.position.x - hw);
    maxX = Math.max(maxX, cube.position.x + hw);
    minZ = Math.min(minZ, cube.position.z - hd);
    maxZ = Math.max(maxZ, cube.position.z + hd);
  }

  groupPivot.x = (minX + maxX) / 2;
  groupPivot.z = (minZ + maxZ) / 2;
  cubeGroup.position.set(groupPivot.x, 0, groupPivot.z);

  for (const cube of cubes) {
    syncMeshFromData(cube);
  }

  // Camera looks at the same ground-level pivot the group rotates around.
  cameraTarget.x = groupPivot.x;
  cameraTarget.z = groupPivot.z;
}

// Places `newCube` flush against a random face of `baseCube`, resting on the
// ground, with a randomized overlap so it never looks like a bare corner-touch.
function placeAgainstCube(newCube, baseCube) {
  const axisChoices = ["x", "z"];
  const axis = axisChoices[Math.floor(Math.random() * axisChoices.length)];
  const direction = Math.random() < 0.5 ? -1 : 1;
  const baseHalf = baseCube[axis === "x" ? "width" : "depth"] / 2;
  const newHalf = newCube[axis === "x" ? "width" : "depth"] / 2;

  newCube.position[axis] =
    baseCube.position[axis] + direction * (baseHalf + newHalf);

  // Offset along the perpendicular horizontal axis so the cubes overlap
  // by a random fraction rather than lining up corner-to-corner.
  const perpAxis = axis === "x" ? "z" : "x";
  const baseHalfPerp = baseCube[perpAxis === "x" ? "width" : "depth"] / 2;
  const newHalfPerp = newCube[perpAxis === "x" ? "width" : "depth"] / 2;
  const maxShorterHalf = Math.min(baseHalfPerp, newHalfPerp);
  const overlapFraction =
    MIN_OVERLAP_FRACTION + Math.random() * (1 - MIN_OVERLAP_FRACTION);
  const perpOffset =
    (Math.random() < 0.5 ? -1 : 1) * maxShorterHalf * (1 - overlapFraction);
  newCube.position[perpAxis] = baseCube.position[perpAxis] + perpOffset;

  // Rest on the ground.
  newCube.position.y = newCube.height / 2;
}

function buildCube(id) {
  return {
    id,
    width: randomUnits(),
    height: randomUnits(),
    depth: randomUnits(),
    position: { x: 0, y: 0, z: 0 },
    mesh: createCubeMesh(),
  };
}

function generateRandomCubes() {
  const cubeA = buildCube("A");
  cubeA.position.y = cubeA.height / 2;

  const cubeB = buildCube("B");
  placeAgainstCube(cubeB, cubeA);

  const cubeC = buildCube("C");
  const baseForC = Math.random() < 0.5 ? cubeA : cubeB;
  placeAgainstCube(cubeC, baseForC);

  const newCubes = [cubeA, cubeB, cubeC];

  if (!cubesFormConnectedChain(newCubes)) {
    // Construction guarantees touching; this is just a safety net.
    return generateRandomCubes();
  }

  return newCubes;
}

function initCubes() {
  sharedUnitGeometry = new THREE.BoxGeometry(1, 1, 1);
  sharedCubeMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.9,
    metalness: 0,
  });

  cubeGroup = new THREE.Group();
  scene.add(cubeGroup);

  regenerateCubes();
}

function regenerateCubes() {
  for (const cube of cubes) {
    cubeGroup.remove(cube.mesh);
  }

  cubes = generateRandomCubes();

  for (const cube of cubes) {
    syncMeshFromData(cube);
    cubeGroup.add(cube.mesh);
  }

  recenterGroupPivot();
  clearSelection();
  frameCamera();
}

function getCubeById(id) {
  return cubes.find((c) => c.id === id);
}
