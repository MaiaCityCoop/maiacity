// A glowing mushroom that sways in the wind: the test asset of intent a5faafad (GPU 14/14, c5), a recipe whose cap
// brings its own look as a node graph of the one allowlist (../graph.js), declared as a plain literal for play to
// check when it is proposed and set on the cap's material for the box to carry out. Real size: a 14 cm mushroom.

module.exports.graphs = {
  // the cap: a teal glow that pulses, mottled by noise, its top swaying with the wind
  cap: {
    format: 1,
    nodes: [
      { op: 'positionLocal' }, // 0
      { op: 'time' }, // 1
      { op: 'swizzle', in: [0], mask: 'y' }, // 2 how high on the cap
      { op: 'wind' }, // 3 the world's wind
      { op: 'mul', in: [3, 2] }, // 4 more sway the higher
      { op: 'float', value: 1.7 }, // 5
      { op: 'mul', in: [1, 5] }, // 6
      { op: 'sin', in: [6] }, // 7
      { op: 'float', value: 0.04 }, // 8
      { op: 'mul', in: [7, 8] }, // 9
      { op: 'mul', in: [4, 9] }, // 10
      { op: 'add', in: [0, 10] }, // 11 the vertex moved
      { op: 'float', value: 30 }, // 12
      { op: 'mul', in: [0, 12] }, // 13
      { op: 'fbm', in: [13], octaves: 4 }, // 14 mottling
      { op: 'color', value: 0x2bd4a8 }, // 15 teal
      { op: 'color', value: 0x0b3d2e }, // 16 deep green
      { op: 'saturate', in: [14] }, // 17
      { op: 'mix', in: [16, 15, 17] }, // 18 its colour
      { op: 'sin', in: [6] }, // 19
      { op: 'float', value: 0.5 }, // 20
      { op: 'mul', in: [19, 20] }, // 21
      { op: 'add', in: [21, 20] }, // 22 a pulse, 0 to 1
      { op: 'float', value: 1.6 }, // 23
      { op: 'mul', in: [22, 23] }, // 24
      { op: 'mul', in: [15, 24] } // 25 its glow
    ],
    out: { position: 11, color: 18, emissive: 25 }
  }
};

module.exports.recipe = function (id, v, variant) {
  const THREE = require('three');
  return {
    meta: { group: 'things', id: 'glow-mushroom', version: 1, label: 'Glowing mushroom', params: [] },
    build() {
      const root = new THREE.Object3D();
      root.name = 'glow-mushroom';
      // the stem: 9 cm tall, 1.6 cm across, plain
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.009, 0.09, 16), new THREE.MeshStandardMaterial({ color: 0xe8e2d0, roughness: 0.8 }));
      stem.position.y = 0.045;
      stem.name = 'stem';
      // the cap: 7 cm across, its look its own graph
      const look = new THREE.MeshStandardMaterial({ color: 0x2bd4a8, roughness: 0.5, emissive: 0x2bd4a8, emissiveIntensity: 1 });
      look.userData.graph = module.exports.graphs.cap;
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.035, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), look);
      cap.position.y = 0.088;
      cap.scale.y = 0.75;
      cap.name = 'cap';
      for (const m of [stem, cap]) m.castShadow = m.receiveShadow = true;
      root.add(stem, cap);
      return root;
    }
  };
};
