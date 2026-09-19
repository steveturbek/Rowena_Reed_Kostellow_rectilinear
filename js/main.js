// Wires up every module's init*() call, in dependency order, and starts
// the render loop. This is the only file responsible for ordering.

function init() {
  initScene();
  initViewCube();
  // initSelection() must run before initCubes(): generating the first
  // batch of cubes calls clearSelection(), which needs the highlight
  // meshes that initSelection() creates.
  initSelection();
  initManipulate();
  initControls();
  initCubes();
  renderLoop();
}

init();
