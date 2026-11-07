/** @typedef {{ x0: number, x1: number, z0: number, z1: number }} Rect a footprint on the floor that is in the way */
/** @typedef {{ u0: number, u1: number, y0: number, y1: number, door?: boolean, glass?: 'clear' | 'frosted' }} Hole an opening in a wall, along it from u0 to u1 */
/**
* @typedef {object} Walk how to walk a container: where to start, facing which way (the walker's yaw), what may be stood on
* @property {number} x
* @property {number} z
* @property {number} yaw
* @property {(x: number, z: number, here: number, ground: number, from: { x: number, z: number }) => boolean} canStand
* @property {(x: number, z: number) => number} floorAt
* @property {[number, number, number][]} lamps where the ceiling lights are
