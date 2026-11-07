/** the matrix that hangs a thing built down -Y from `at` along `dir`, turned round it by `spin` */
const hung = (at, dir, spin) => new three.Matrix4().compose(at, new three.Quaternion().setFromUnitVectors(DOWN, dir.clone().normalize()).multiply(new three.Quaternion().setFromAxisAngle(v3(0, 1, 0), spin)), v3(1, 1, 1));
