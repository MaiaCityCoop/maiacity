//#piece 8b09f5bb2de61f82762268b682cbf1d947f2baf56fcbad747c26a1c14fc0649d
//#piece 1efe152e2d3f4c882dfd19692fd25dce72658f88aac3d155256189629921fc58
//#piece 6bcb44f7e5b1530a02b5eefa5f4651448307e266df9fec2203d82b209356ce30
/** @typedef {{ a: V3, b: V3, on: [string, string], r: number }} Ram a cylinder: its barrel's pin on the first part, its rod's on the second */
/** @typedef {{ slew?: number, swing?: number, boom?: number, arm?: number, bucket?: number, blade?: number, wheels?: number, root?: V3 }} Joints */
/**
* @typedef {object} Spec an excavator: its joints, its rams, its parts and how it works
* @property {string} name
* @property {Record<'base' | 'house' | 'swing' | 'boom' | 'arm' | 'bucket', V3> & { blade?: V3 }} J where its joints are at rest
* @property {Record<string, Ram>} rams
* @property {{ x: number, y: number, sprocket: number, idler: number, r: number }} wheels the track centres' x, the wheels' axle height, the sprocket's z (back) and the idler's (front), their radius
* @property {() => Piece[]} parts
* @property {{ tucked: Joints, reach: Joints, curled: Joints, lifted: Joints, dump: Joints }} poses
* @property {number} [slew] how far it slews to dump (rad)
* @property {number} [period] a dig cycle (s)
* @property {number} [speed] its travelling speed (m/s)
* @property {THREE.Material[]} [materials] beyond its skin: 1 its glass
*/
