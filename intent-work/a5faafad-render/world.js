// A small world for intent a5faafad's look (c5): a patch of ground with five glowing mushrooms standing on it, each
// named by the hash render.mjs hands the test asset in by (--guests' `as`), so it is drawn as every world draws a guest.
const AS = 'a5faafada5faafada5faafada5faafada5faafada5faafada5faafada5faafad';
module.exports.recipe = function (id, v, variant) {
  const THREE = require('three');
  return {
    meta: { group: 'worlds', id: 'graph-test-world', version: 1, label: 'Graph test world', params: [] },
    build() {
      const root = new THREE.Object3D();
      const ground = new THREE.Mesh(new THREE.CircleGeometry(3, 48), new THREE.MeshStandardMaterial({ color: 0x4a5a32, roughness: 0.95 }));
      ground.rotation.x = -Math.PI / 2;
      ground.receiveShadow = true;
      ground.name = 'ground';
      root.add(ground);
      const at = [[0, 0], [0.18, 0.06], [-0.15, 0.1], [0.08, -0.16], [-0.1, -0.12]];
      for (const [x, z] of at) {
        const n = new THREE.Object3D();
        n.name = 'use:' + AS;
        n.position.set(x, 0, z);
        root.add(n);
      }
      root.userData.views = { close: { eye: [0.35, 0.22, 0.45], target: [0, 0.07, 0] } };
      return root;
    }
  };
};
