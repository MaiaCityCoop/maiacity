// @ts-nocheck — plain JS, in the kit's own style (./kit.js)
/*
 * The LifeTrac line's machines and what it carries: our additions to the factory kit (./kit.js), at their real size in
 * metres, for the line that builds the LifeTrac (play/api/import/factories/lifetrac-line/line.js). AirSup's kit
 * machines are readable stand-ins of two to three metres; a tractor line's are bigger, and fully automated, so these
 * have robots where theirs have people. `lifetrac` is our own simpler model of the tractor as it grows down the line,
 * from the same CAD numbers (OSE's v25, the asset's lifetrac.js), drawn before the last stage and as its fallback.
 */
import { T } from './three.js'
import { K } from './kit.js'

const V = (x, y, z) => new T.Vector3(x, y, z)
const ease = (x) => 0.5 - 0.5 * Math.cos(Math.PI * Math.max(0, Math.min(1, x)))

/** robot arms turning busily about a pose while a machine works; the kit's arm (K.arm) */
function swing(arm, s, k = 0, rest = [0, 0.2, 1.9, 0, 1.2, 0]) {
  if (s.state !== 'busy') return arm.pose(...rest)
  const t = s.t * 1.2 + k * 1.7
  arm.pose(Math.sin(t * 0.7) * 0.9, 0.45 + Math.sin(t) * 0.25, 1.35 + Math.sin(t * 1.3) * 0.3, 0, 0.9 + Math.sin(t * 2) * 0.25, 0.5)
}

// ---- fibre laser, 3 × 1.5 m bed, shuttle table, load-and-sort tower
K.def('fiberlaser', (o) => {
  const combo = o.variant === 'combo'
  const w = combo ? 9.6 : 9.0, d = combo ? 4.2 : 3.4
  const { g, M, body, acc } = K.sideBase(o, w, d)
  const x0 = -w / 2
  // enclosure over the cutting bed
  K.box(g, 5.8, 0.75, 2.5, M.dark, x0 + 3.1, 0, 0, { r: 0.04 })
  K.box(g, 5.8, 1.45, 2.5, body, x0 + 3.1, 0.75, 0, { r: 0.06 })
  K.box(g, 5.82, 0.16, 2.52, acc, x0 + 3.1, 2.2, 0, { r: 0.04 })
  const win = K.box(g, 4.2, 0.55, 0.03, K.glass('#3b2a1a', 0.75), x0 + 3.1, 1.25, -1.26, { r: 0 })
  win.castShadow = false
  const glowM = K.unique(K.emit('#ffb070', 0.1))
  const glow = K.box(g, 4.1, 0.5, 0.01, glowM, x0 + 3.1, 1.27, -1.24, { r: 0 })
  glow.castShadow = false
  K.live(glow)
  // the gantry and its head, seen through the window
  const gantry = K.live(K.group(g, x0 + 3.1, 1.15, 0))
  K.box(gantry, 0.18, 0.18, 2.2, K.paint(o.accent || K.C.orange, 0.45), 0, 0.25, 0, { r: 0.03 })
  const head = K.live(K.group(gantry, 0, 0, 0))
  K.box(head, 0.16, 0.42, 0.16, M.dark, 0, 0.0, 0, { r: 0.03 })
  const spark = K.unique(K.emit('#ffd27a', 0))
  K.sph(head, 0.05, spark, 0, -0.02, 0).castShadow = false
  // the exchange table outside, and the tower that loads it and sorts what was cut
  K.box(g, 3.1, 0.82, 1.7, M.dark, x0 + 7.6, 0, -0.3, { r: 0.03 })
  K.box(g, 3.0, 0.04, 1.55, M.steel, x0 + 7.6, 0.82, -0.3, { r: 0 })
  for (let i = 0; i < 11; i++) K.box(g, 0.02, 0.05, 1.5, M.dark, x0 + 6.2 + i * 0.28, 0.86, -0.3, { r: 0 })
  const tower = K.group(g, x0 + 7.6, 0, 0.75)
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) K.box(tower, 0.12, 3.4, 0.12, K.paint(K.C.graphite, 0.5), sx * 1.55, 0, sz * 0.75)
  for (let k = 0; k < 6; k++) {
    K.box(tower, 3.2, 0.06, 1.62, M.dark, 0, 0.5 + k * 0.5, 0, { r: 0 })
    K.box(tower, 3.0, 0.04 + (k % 3) * 0.02, 1.5, K.metal('#8d949b', 0.4), 0, 0.56 + k * 0.5, 0, { r: 0 })
  }
  K.box(tower, 3.3, 0.14, 1.75, acc, 0, 3.4, 0, { r: 0.03 })
  const fork = K.live(K.group(tower, 0, 2.2, -0.9))
  K.box(fork, 3.0, 0.06, 0.12, M.yellow, 0, 0, 0)
  for (let i = 0; i < 8; i++) K.cyl(fork, 0.03, 0.18, M.dark, -1.3 + i * 0.37, -0.18, 0, { seg: 8 })
  // a chiller and the source cabinet behind
  K.box(g, 1.1, 1.6, 0.8, K.paint('#d8dde0', 0.5), x0 + 0.8, 0, 1.6 - (combo ? 0.3 : 0.7), { r: 0.04 })
  K.box(g, 0.9, 1.5, 0.7, M.dark, x0 + 2.2, 0, 1.6 - (combo ? 0.3 : 0.7), { r: 0.04 })
  let chuck = null
  if (combo) { // the rotary tube axis along the front of the cell
    K.box(g, 5.6, 0.7, 0.5, M.dark, x0 + 3.1, 0, 1.75, { r: 0.03 })
    chuck = K.live(K.group(g, x0 + 1.2, 0.95, 1.75))
    K.cyl(chuck, 0.26, 0.3, K.paint(o.accent || K.C.orange, 0.45), 0, 0, 0, { axis: 'x', seg: 18 })
    K.box(g, 5.2, 0.1, 0.1, K.metal('#8d949b', 0.4), x0 + 3.6, 0.9, 1.75, { r: 0 })
  }
  K.panel(g, x0 - 0.3, 0, -1.0, 0.3, 'graph')
  return K.finish({
    g, kind: 'side', w, d, h: 3.5, entry: V(x0 + 7.6, 0.9, -d / 2 - 0.1), work: () => V(x0 + 7.6, 0.9, -0.3),
    anim(s) {
      const busy = s.state === 'busy'
      gantry.position.x = x0 + 3.1 + (busy ? Math.sin(s.t * 0.9) * 2.2 : -2.4)
      head.position.z = busy ? Math.sin(s.t * 2.3) * 0.85 : 0
      spark.emissiveIntensity = busy ? 6 + Math.random() * 6 : 0
      glowM.emissiveIntensity = busy ? 1.1 + Math.abs(Math.sin(s.t * 17)) * 1.4 : 0.05
      fork.position.y = 0.6 + (busy ? (Math.sin(s.t * 0.4) * 0.5 + 0.5) * 2.0 : 0.6)
      if (chuck) chuck.rotation.x = busy ? s.t * 2 : 0
    },
  }, o, [x0 + 5.8, 2.36, -1.0])
})

// ---- tube laser with bundle loader, inline (the tube goes in at one end and comes out cut at the other)
K.def('tubelaser', (o) => {
  const L = 12, d = 2.6
  const g = new T.Group(), M = K.M()
  const body = K.paint(o.color || K.C.cream, 0.5), acc = K.paint(o.accent || K.C.teal, 0.45)
  // bundle loader: chain rack with tubes waiting
  K.box(g, 3.4, 0.8, 2.2, M.dark, -L / 2 + 1.7, 0, 0, { r: 0.03 })
  for (let i = 0; i < 6; i++) K.box(g, 3.2, 0.08, 0.16, K.metal('#7b8187', 0.4), -L / 2 + 1.7, 0.84, -0.8 + i * 0.3, { r: 0.01 })
  // the bed with its chuck carriage
  K.box(g, 6.2, 0.75, 1.0, M.dark, -L / 2 + 6.4, 0, 0, { r: 0.03 })
  K.box(g, 6.2, 0.06, 0.2, M.steel, -L / 2 + 6.4, 0.75, 0, { r: 0 })
  const carriage = K.live(K.group(g, -L / 2 + 4.0, 0.81, 0))
  K.box(carriage, 0.5, 0.55, 0.9, acc, 0, 0, 0, { r: 0.05 })
  K.cyl(carriage, 0.22, 0.12, M.dark, 0.3, 0.3, 0, { axis: 'x', seg: 18 })
  // the cutting enclosure
  K.box(g, 1.8, 2.0, 1.9, body, -L / 2 + 8.6, 0, 0, { r: 0.06 })
  K.box(g, 1.82, 0.14, 1.92, acc, -L / 2 + 8.6, 2.0, 0, { r: 0.03 })
  const glowM = K.unique(K.emit('#ffb070', 0.1))
  K.box(g, 1.0, 0.45, 0.02, glowM, -L / 2 + 8.6, 1.0, -0.96, { r: 0 }).castShadow = false
  // the outfeed with its unloading robot
  K.box(g, 2.6, 0.78, 1.0, M.dark, L / 2 - 1.5, 0, 0, { r: 0.03 })
  const arm = K.arm(g, L / 2 - 1.6, 0, 0.95, K.C.orange, 0.8)
  K.live(arm.g)
  K.box(g, 0.9, 1.6, 0.8, M.dark, -L / 2 + 8.6, 0, 1.4, { r: 0.04 })
  K.panel(g, -L / 2 + 7.2, 0, -1.2, 0.3, 'graph')
  return K.finish({
    g, kind: 'inline', w: L, d, h: 2.4, entry: V(-L / 2, 0.85, 0), exit: V(L / 2, 0.85, 0),
    work: (i, p) => V(-L / 2 + 1.2 + p * (L - 2.4), 0.85, 0),
    anim(s) {
      const busy = s.state === 'busy'
      carriage.position.x = -L / 2 + 4.0 + (busy ? (s.p % 1) * 3.6 : 0)
      glowM.emissiveIntensity = busy ? 1.4 + Math.abs(Math.sin(s.t * 19)) * 2 : 0.05
      swing(arm, s, 1)
    },
  }, o, [-L / 2 + 9.3, 2.15, -0.8])
})

// ---- CNC angle line: infeed, three punch heads, ink-jet marker, shear, stacking robot; inline
K.def('angleline', (o) => {
  const L = 12, d = 2.2
  const g = new T.Group(), M = K.M()
  const body = K.paint(o.color || K.C.cream, 0.5), acc = K.paint(o.accent || K.C.blue, 0.45)
  K.box(g, 4.0, 0.8, 0.8, M.dark, -L / 2 + 2.0, 0, 0, { r: 0.03 })
  for (let i = 0; i < 8; i++) K.cyl(g, 0.05, 0.7, M.steel, -L / 2 + 0.3 + i * 0.5, 0.8, 0, { axis: 'z', seg: 10 })
  const rams = []
  for (let i = 0; i < 3; i++) {
    const x = -L / 2 + 4.8 + i * 1.1
    K.box(g, 0.9, 2.2, 1.4, body, x, 0, 0.1, { r: 0.05 })
    K.box(g, 0.92, 0.14, 1.42, acc, x, 2.2, 0.1, { r: 0.03 })
    const ram = K.live(K.group(g, x, 1.25, -0.2))
    K.box(ram, 0.22, 0.4, 0.22, M.steel, 0, 0, 0, { r: 0.02 })
    rams.push(ram)
  }
  K.box(g, 0.7, 1.6, 1.1, K.paint('#d8dde0', 0.5), -L / 2 + 8.2, 0, 0, { r: 0.04 }) // marker
  K.box(g, 1.0, 2.0, 1.5, body, -L / 2 + 9.3, 0, 0.1, { r: 0.05 }) // shear
  const blade = K.live(K.group(g, -L / 2 + 9.3, 1.3, -0.2))
  K.box(blade, 0.08, 0.5, 0.5, M.steel, 0, 0, 0)
  K.box(g, 2.0, 0.78, 1.0, M.dark, L / 2 - 1.0, 0, 0, { r: 0.03 })
  const arm = K.arm(g, L / 2 - 1.2, 0, 0.95, K.C.orange, 0.75)
  K.live(arm.g)
  for (let i = 0; i < 3; i++) K.bin(g, L / 2 - 0.5 - i * 0.5, 0, 1.1, K.C.blue, 0.42)
  K.panel(g, -L / 2 + 4.2, 0, -1.1, 0.3, 'list')
  return K.finish({
    g, kind: 'inline', w: L, d, h: 2.4, entry: V(-L / 2, 0.85, 0), exit: V(L / 2, 0.85, 0),
    work: (i, p) => V(-L / 2 + 0.6 + p * (L - 1.2), 0.85, 0),
    anim(s) {
      const busy = s.state === 'busy'
      rams.forEach((r, i) => (r.position.y = 1.25 - (busy ? Math.max(0, Math.sin(s.t * 9 + i * 2)) * 0.25 : 0)))
      blade.position.y = 1.3 - (busy ? Math.max(0, Math.sin(s.t * 3)) * 0.3 : 0)
      swing(arm, s, 2)
    },
  }, o, [-L / 2 + 5.2, 2.36, -0.6])
})

// ---- welding cell: two welding robots on a two-station positioner, a handling robot, a fence
K.def('weldcell', (o) => {
  const small = o.variant === 'small'
  const w = small ? 4.8 : 6.6, d = small ? 4.2 : 5.0
  const { g, M, body, acc } = K.sideBase(o, w, d)
  K.box(g, w, 0.04, d, K.paint('#9aa0a6', 0.7), 0, 0, 0, { r: 0.01 })
  K.fence(g, w, d, 2.0, 'nz', 1.8)
  // the positioner: a turning table with a screen wall between its two stations
  const pos = K.live(K.group(g, 0, 0, 0.5))
  K.cyl(pos, 1.2, 0.5, M.dark, 0, 0, 0, { seg: 32 })
  K.box(pos, 0.08, 1.6, 2.4, K.paint('#2b2d31', 0.6), 0, 0.5, 0, { r: 0 })
  for (const sx of [-1, 1]) K.box(pos, 0.9, 0.12, 1.6, M.steel, sx * 0.65, 0.5, 0, { r: 0.01 })
  // the welding robots behind it, a power source each, and a fume hood over the far station
  const arms = []
  for (const sx of small ? [0] : [-1, 1]) {
    const a = K.arm(g, sx * 1.6, 0, 1.9, o.accent || K.C.orange, 1.0)
    K.live(a.g)
    arms.push(a)
    K.box(g, 0.6, 0.9, 0.7, K.paint('#3e6ea6', 0.45), sx * 1.6 + (small ? 1.2 : sx * 1.1), 0, 2.0, { r: 0.04 })
    K.spool(g, sx * 1.6 + (small ? 1.2 : sx * 1.1), 0.9, 2.0, 0.15)
  }
  K.box(g, 2.6, 0.5, 1.6, K.paint('#c4c9cd', 0.4, 0.4), 0, 2.6, 1.0, { r: 0.04 })
  K.cyl(g, 0.22, 1.2, M.steel, 0, 3.1, 1.6, { seg: 14 })
  const handler = K.arm(g, w / 2 - 0.9, 0, -0.9, K.C.yellow, 0.9)
  K.live(handler.g)
  const sparks = K.live(K.group(g, 0.6, 0.9, 0.9))
  const sm = K.emit('#ffd27a', 5)
  for (let i = 0; i < 16; i++) { const m = K.box(sparks, 0.025, 0.025, 0.025, sm, 0, 0, 0, { r: 0 }); m.castShadow = false }
  const arc = K.unique(K.emit('#9fd0ff', 0))
  K.live(K.sph(g, 0.07, arc, 0.6, 1.0, 0.9)).castShadow = false
  K.panel(g, -w / 2 + 0.4, 0, -d / 2 - 0.4, 0.3, 'bars')
  return K.finish({
    g, kind: 'side', w, d, h: 3.4, entry: V(-0.6, 0.9, -d / 2 - 0.1), work: () => V(-0.6, 0.62, -0.1),
    anim(s) {
      const run = s.state === 'busy'
      arms.forEach((a, k) => swing(a, s, k, [0, 0.3, 1.8, 0, 1.2, 0]))
      swing(handler, s, 3)
      pos.rotation.y = run ? Math.floor(s.t / 20) * Math.PI + ease((s.t % 20) / 2) * Math.PI : 0
      const on = run && Math.sin(s.t * 9) > -0.3
      arc.emissiveIntensity = on ? 4 + Math.random() * 6 : 0
      sparks.visible = on
      if (on) sparks.children.forEach((m, i) => { const a = (i * 2.4 + s.t * 30) % 1; m.position.set(Math.sin(i * 7.1) * a * 0.5, Math.max(0, 0.25 * a - a * a * 0.6), Math.cos(i * 3.3) * a * 0.5) })
    },
  }, o, [-w / 2 + 0.3, 2.0, -d / 2 + 0.3])
})

// ---- the assembly cell the tractor stands in: a skillet, two robots, and an overhead gantry where parts are heavy
K.def('asmcell', (o) => {
  const v = o.variant || 'bolt'
  const cube = v === 'cube'
  const w = cube ? 5.2 : 7.0, d = cube ? 4.6 : 6.0
  const { g, M, body, acc } = K.sideBase(o, w, d)
  K.box(g, w, 0.04, d, K.paint('#a6aaa3', 0.75), 0, 0, 0, { r: 0.01 })
  K.fence(g, w, d, 2.0, 'nz', cube ? 1.6 : 3.2)
  // the skillet the machine (or the cube) stands on, its rails in the floor
  K.box(g, cube ? 1.6 : 2.2, 0.32, cube ? 1.6 : 3.2, K.paint('#4a5862', 0.55), 0, 0, 0.3, { r: 0.03 })
  for (const sx of [-1, 1]) K.box(g, 0.08, 0.02, d - 0.6, M.steel, sx * 0.7, 0.04, 0.2, { r: 0 })
  // two robots, one each side, with their nutrunners; a tool stand and a bowl feeder each
  const arms = []
  for (const sx of [-1, 1]) {
    const a = K.arm(g, sx * (cube ? 1.6 : 2.3), 0, 0.3, o.accent || K.C.orange, cube ? 0.85 : 1.05)
    a.g.rotation.y = sx > 0 ? Math.PI / 2 : -Math.PI / 2
    K.live(a.g)
    arms.push(a)
    K.box(g, 0.6, 0.9, 0.6, M.dark, sx * (w / 2 - 0.5), 0, d / 2 - 0.7, { r: 0.04 })
    K.cyl(g, 0.25, 0.25, K.paint('#c9ced2', 0.4, 0.3), sx * (w / 2 - 0.5), 0.9, d / 2 - 0.7, { seg: 18 })
  }
  // the gantry: four posts, two beams and a trolley with its hoist
  let trolley = null, hook = null
  if (v === 'gantry' || cube) {
    const H = cube ? 3.2 : 4.2, frame = K.paint(K.C.safety, 0.5)
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) K.box(g, 0.2, H, 0.2, frame, sx * (w / 2 - 0.25), 0, sz * (d / 2 - 0.25), { r: 0.02 })
    for (const sz of [-1, 1]) K.box(g, w - 0.3, 0.3, 0.25, frame, 0, H, sz * (d / 2 - 0.25), { r: 0.02 })
    trolley = K.live(K.group(g, 0, H, 0))
    K.box(trolley, 0.35, 0.3, d - 0.5, K.paint(K.C.graphite, 0.5), 0, 0, 0, { r: 0.02 })
    K.box(trolley, 0.5, 0.35, 0.5, M.dark, 0, -0.35, 0, { r: 0.03 })
    hook = K.live(K.group(trolley, 0, -0.4, 0))
    K.box(hook, 0.02, 1.0, 0.02, M.dark, 0, -1.0, 0, { r: 0 })
    K.box(hook, 0.5, 0.08, 0.3, M.yellow, 0, -1.08, 0, { r: 0.02 })
  }
  // the fill rig: a tank, a pump and a boom with its fill gun
  if (v === 'fill') {
    K.cyl(g, 0.45, 1.6, K.metal('#c9ced2', 0.3), -w / 2 + 0.8, 0, 1.4, { seg: 20 })
    K.cyl(g, 0.45, 1.6, K.paint(K.C.red, 0.45), -w / 2 + 0.8, 0, 2.4, { seg: 20 })
    K.box(g, 0.12, 2.4, 0.12, M.dark, -w / 2 + 1.6, 0, 1.9)
    K.box(g, 2.0, 0.12, 0.12, M.dark, -w / 2 + 2.5, 2.4, 1.9)
  }
  // the audit arch: cameras on a portal the machine passes under
  let ring = null
  if (v === 'audit') {
    const frame = K.paint(K.C.navy, 0.45)
    for (const sx of [-1, 1]) K.box(g, 0.2, 2.8, 0.3, frame, sx * 1.4, 0, 0.3, { r: 0.03 })
    K.box(g, 3.0, 0.3, 0.4, frame, 0, 2.8, 0.3, { r: 0.03 })
    ring = K.unique(K.emit('#e9f6ff', 1.2))
    for (let i = 0; i < 5; i++) K.box(g, 0.14, 0.08, 0.14, ring, -1.0 + i * 0.5, 2.72, 0.3, { r: 0.02 }).castShadow = false
  }
  K.panel(g, -w / 2 + 0.4, 0, -d / 2 - 0.4, 0.3, v === 'audit' ? 'list' : 'graph')
  return K.finish({
    g, kind: 'side', w, d, h: cube ? 3.4 : 4.4, entry: V(0, 0.9, -d / 2 - 0.1), work: () => V(0, 0.32, 0.3),
    anim(s) {
      arms.forEach((a, k) => swing(a, s, k))
      if (trolley) { trolley.position.x = s.state === 'busy' ? Math.sin(s.t * 0.35) * (w / 2 - 1.0) : 0; hook.position.y = -0.4 - (s.state === 'busy' ? (Math.sin(s.t * 0.6) * 0.5 + 0.5) * 0.9 : 0) }
      if (ring) ring.emissiveIntensity = s.busy ? (Math.sin(s.t * 20) > 0.6 ? 6 : 1.4) : 0.6
    },
  }, o, [-w / 2 + 0.3, 2.0, -d / 2 + 0.3])
})

// ---- powder booth with two painting robots behind glass, inline
K.def('booth', (o) => {
  const small = o.variant === 'small'
  const L = small ? 3.6 : 6.4, d = small ? 2.6 : 3.4, H = small ? 2.4 : 3.2
  const g = new T.Group(), M = K.M()
  const body = K.paint(o.color || '#dfe3e5', 0.45), acc = K.paint(o.accent || K.C.yellow, 0.45)
  const belt = K.mesh(g, new T.BoxGeometry(L + 1.2, 0.05, 1.0), K.beltMat(), 0, 0.82, 0)
  belt.userData.keep = true
  K.box(g, L, H, 0.08, body, 0, 0, d / 2 - 0.04, { r: 0.02 })
  for (const sx of [-1, 1]) K.box(g, 0.08, H, d, body, sx * (L / 2 - 0.04), 0, 0, { r: 0.02 })
  K.box(g, L, 0.12, d, acc, 0, H, 0, { r: 0.02 })
  const mistM = K.unique(new T.MeshStandardMaterial({ color: '#e7efe9', transparent: true, opacity: 0.0, roughness: 1, depthWrite: false }))
  const mist = K.box(g, L - 0.4, H - 0.6, d - 0.6, mistM, 0, 0.3, 0, { r: 0.1 })
  mist.castShadow = false
  K.live(mist)
  K.box(g, L - 0.2, H - 0.3, 0.03, K.glass('#d9eef2', 0.22), 0, 0.15, -d / 2 + 0.02, { r: 0 }).castShadow = false
  const arms = []
  for (const sx of small ? [0] : [-1, 1]) {
    const a = K.arm(g, sx * 1.4, 0, d / 2 - 0.6, K.C.white, small ? 0.8 : 1.0)
    a.g.rotation.y = Math.PI
    K.live(a.g)
    arms.push(a)
  }
  K.box(g, 1.2, 1.8, 0.9, K.paint('#9aa4ab', 0.45, 0.3), L / 2 + 0.7, 0, d / 2 - 0.3, { r: 0.04 }) // the cyclone and its recovery
  K.cyl(g, 0.3, 1.0, K.paint('#9aa4ab', 0.45, 0.3), L / 2 + 0.7, 1.8, d / 2 - 0.3, { seg: 16 })
  K.panel(g, -L / 2 - 0.5, 0, -d / 2 - 0.2, 0.2, 'graph')
  return K.finish({
    g, kind: 'inline', w: L + 1.2, d, h: H + 0.3, entry: V(-L / 2 - 0.6, 0.85, 0), exit: V(L / 2 + 0.6, 0.85, 0),
    work: (i, p) => V(-L / 2 - 0.3 + p * (L + 0.6), 0.85, 0),
    anim(s) { arms.forEach((a, k) => swing(a, s, k)); mistM.opacity = s.busy ? 0.18 + Math.sin(s.t * 3) * 0.04 : 0 },
  }, o, [-L / 2 + 0.3, H + 0.1, -d / 2 + 0.2])
})

// ---- the automated store: a rack with totes, its stacker crane, a pick port and the kitting robot
K.def('asrs', (o) => {
  const w = 5.6, d = 3.4
  const { g, M, body, acc } = K.sideBase(o, w, d)
  const rack = K.paint(K.C.graphite, 0.5)
  const cols = ['#3e6ea6', '#e2713a', '#5c9a63', '#eab33b', '#c7473a']
  for (let i = 0; i <= 4; i++) K.box(g, 0.08, 6.0, 0.08, rack, -w / 2 + 0.3 + i * 1.0, 0, 1.2, { r: 0 })
  for (let k = 0; k < 8; k++) {
    K.box(g, 4.1, 0.04, 0.9, rack, -w / 2 + 2.3, 0.6 + k * 0.7, 1.2, { r: 0 })
    for (let i = 0; i < 4; i++) if ((i * 7 + k * 3) % 5) K.box(g, 0.6, 0.35, 0.7, K.paint(cols[(i + k) % cols.length], 0.6), -w / 2 + 0.8 + i * 1.0, 0.64 + k * 0.7, 1.2, { r: 0.03 })
  }
  const crane = K.live(K.group(g, -w / 2 + 0.8, 0, 0.45))
  K.box(crane, 0.2, 6.2, 0.2, K.paint(K.C.safety, 0.5), 0, 0, 0, { r: 0.02 })
  const car = K.live(K.group(crane, 0, 1, 0))
  K.box(car, 0.7, 0.12, 0.6, M.dark, 0, 0, 0, { r: 0.02 })
  K.box(g, w - 0.4, 0.06, 0.12, M.steel, 0, 0, 0.45, { r: 0 })
  // the pick port and the robot that kits from it
  K.box(g, 1.2, 0.85, 0.9, M.dark, w / 2 - 0.8, 0, 0.0, { r: 0.03 })
  const arm = K.arm(g, w / 2 - 1.9, 0, -0.5, o.accent || K.C.orange, 0.95)
  K.live(arm.g)
  K.panel(g, -w / 2 + 0.2, 0, -d / 2 - 0.3, 0.3, 'list')
  return K.finish({
    g, kind: 'side', w, d, h: 6.3, entry: V(0.4, 0.9, -d / 2 - 0.1), work: () => V(0.4, 0.86, -0.9),
    anim(s) {
      const busy = s.state === 'busy'
      crane.position.x = -w / 2 + 0.8 + (busy ? (Math.sin(s.t * 0.5) * 0.5 + 0.5) * 3.0 : 0)
      car.position.y = 0.6 + (busy ? (Math.sin(s.t * 0.8) * 0.5 + 0.5) * 4.6 : 0)
      swing(arm, s, 1)
    },
  }, o, [-w / 2 + 0.3, 2.0, -d / 2 + 0.3])
})

// ---- end-of-line test: a rolling road in a cage, a test weight, a light tower, screens
K.def('testcage', (o) => {
  const w = 7.2, d = 6.2
  const { g, M, body, acc } = K.sideBase(o, w, d)
  K.box(g, w, 0.04, d, K.paint('#8f948f', 0.75), 0, 0, 0, { r: 0.01 })
  K.fence(g, w, d, 2.4, 'nz', 3.2)
  const rollers = K.live(K.group(g, 0, 0.12, 0.3))
  for (const sx of [-1, 1]) for (const sz of [-0.38, 0.38]) K.cyl(rollers, 0.12, 0.5, K.metal('#c9ced2', 0.3), sx * 0.71, 0, sz * 1.0, { axis: 'x', seg: 16 })
  K.box(g, 2.6, 0.1, 3.2, K.paint('#4a5862', 0.55), 0, 0, 0.3, { r: 0.02 })
  K.box(g, 1.1, 0.8, 0.8, K.paint(K.C.yellow, 0.5), w / 2 - 1.0, 0, d / 2 - 0.9, { r: 0.04 }) // the 300 kg test weight
  for (let i = 0; i < 3; i++) K.box(g, 0.6, 0.38, 0.05, K.screenMat(i % 2 ? 'bars' : 'graph', '#9be7ff'), -w / 2 + 0.9 + i * 0.7, 1.6, -d / 2 + 0.15, { r: 0.01 }).castShadow = false
  for (let i = 0; i < 3; i++) K.box(g, 0.05, 1.6, 0.05, M.dark, -w / 2 + 0.9 + i * 0.7, 0, -d / 2 + 0.12)
  return K.finish({
    g, kind: 'side', w, d, h: 2.6, entry: V(0, 0.9, -d / 2 - 0.1), work: () => V(0, 0.2, 0.3),
    anim(s) { rollers.children.forEach((r) => (r.rotation.x = s.state === 'busy' ? s.t * 6 : 0)) },
  }, o, [-w / 2 + 0.3, 2.4, -d / 2 + 0.3])
})

// ---- CNC cold saw with roller tables, inline
K.def('saw', (o) => {
  const L = 7, d = 1.8
  const g = new T.Group(), M = K.M()
  const body = K.paint(o.color || K.C.cream, 0.5), acc = K.paint(o.accent || K.C.orange, 0.45)
  for (const [x, l] of [[-L / 2 + 1.5, 3.0], [L / 2 - 1.3, 2.6]]) {
    K.box(g, l, 0.75, 0.7, M.dark, x, 0, 0, { r: 0.03 })
    for (let i = 0; i < Math.round(l / 0.4); i++) K.cyl(g, 0.045, 0.6, M.steel, x - l / 2 + 0.2 + i * 0.4, 0.8, 0, { axis: 'z', seg: 10 })
  }
  K.box(g, 1.3, 1.1, 1.4, body, 0.4, 0, 0.1, { r: 0.05 })
  const head = K.live(K.group(g, 0.4, 1.35, -0.1))
  K.box(head, 0.7, 0.45, 0.6, acc, 0, 0.2, 0.15, { r: 0.04 })
  const blade = K.cyl(head, 0.32, 0.02, K.metal('#d9dcdf', 0.2), 0, 0, -0.2, { axis: 'z', seg: 28 })
  K.live(blade)
  K.panel(g, -0.6, 0, -0.95, 0.3, 'graph')
  return K.finish({
    g, kind: 'inline', w: L, d, h: 2.0, entry: V(-L / 2, 0.85, 0), exit: V(L / 2, 0.85, 0),
    work: (i, p) => V(-L / 2 + 0.6 + p * (L - 1.2), 0.85, 0),
    anim(s) { const busy = s.state === 'busy'; blade.rotation.y = busy ? s.t * 30 : 0; head.position.y = 1.35 - (busy ? Math.max(0, Math.sin(s.t * 1.5)) * 0.3 : 0) },
  }, o, [0.9, 1.25, -0.5])
})

const GREEN = '#1f5e50', TEAL = '#45b58f', STEEL = '#8d9396', DARK = '#2b2d2f', ORANGE = '#ef9a1c', CHROME = '#dcdcd8', YELLOW = '#e9c21b', TYRE = '#1b1c1e', RIM = '#c9cbc6', BLUE = '#2f6fb5', GREY = '#9aa0a6'

/** a box between two points' extents (x0..x1, y0..y1, z0..z1), into `add` */
const boxAt = (add, B, color, x0, x1, y0, y1, z0, z1) => add(B(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0), 0.002), color, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)
/** a round bar from a to b ([x, y, z] m) of radius r */
function barAt(add, color, a, b, r, seg = 10) {
  const A = V(...a), Bv = V(...b), L = A.distanceTo(Bv)
  const geo = new T.CylinderGeometry(r, r, L, seg)
  geo.applyMatrix4(new T.Matrix4().compose(A.clone().add(Bv).multiplyScalar(0.5), new T.Quaternion().setFromUnitVectors(V(0, 1, 0), Bv.clone().sub(A).normalize()), V(1, 1, 1)))
  add(geo, color)
}
/** a rectangular bar from a to b, w across and h deep */
function beamAt(add, color, a, b, w, h) {
  const A = V(...a), Bv = V(...b), L = A.distanceTo(Bv)
  const geo = new T.BoxGeometry(L, h, w)
  const dir = Bv.clone().sub(A).normalize()
  geo.applyMatrix4(new T.Matrix4().compose(A.clone().add(Bv).multiplyScalar(0.5), new T.Quaternion().setFromUnitVectors(V(1, 0, 0), dir), V(1, 1, 1)))
  add(geo, color)
}

K.shapes.sheets = (add, def, { B }) => {
  for (const sx of [-1, 0, 1]) add(B(0.1, 0.08, 1.4, 0.005), '#b88a5a', sx * 1.2, 0.04, 0)
  for (let k = 0; k < 6; k++) add(B(3.0, 0.0127, 1.5, 0.001), k % 2 ? '#80868a' : '#73797d', 0, 0.086 + k * 0.0135, 0)
}
/** a kit cart (1.2 × 0.8 m) with one LifeTrac's parts at that stage standing in its rack */
K.shapes.kitcart = (add, def, { B, C }) => {
  add(B(1.2, 0.05, 0.8, 0.005), DARK, 0, 0.2, 0)
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { add(B(0.04, 0.9, 0.04, 0.004), DARK, sx * 0.58, 0.65, sz * 0.38); add(C(0.06, 0.05, 10), '#1d1e20', sx * 0.5, 0.06, sz * 0.32, Math.PI / 2) }
  const load = def.load
  const cols = load === 'painted' ? [GREEN, GREEN, TEAL, YELLOW, GREEN, '#9aa0a6', TEAL, GREEN] : ['#7b8084', '#868b8f', '#72777b']
  for (let i = 0; i < 8; i++) add(B(1.1 - (i % 3) * 0.18, 0.7 - (i % 4) * 0.08, load === 'plates' ? 0.0127 : 0.008, 0.002), cols[i % cols.length], 0, 0.6 - (i % 4) * 0.04, -0.3 + i * 0.085)
  if (load === 'weldments' || load === 'painted') {
    add(B(0.55, 0.22, 0.3, 0.004), load === 'painted' ? YELLOW : '#7b8084', -0.25, 1.17, 0)
    for (let i = 0; i < 4; i++) add(C(0.114, 0.0127, 20), load === 'painted' ? '#26282b' : '#7b8084', 0.3, 1.06 + i * 0.03, 0)
  }
}
/** a steel stillage (1.2 × 0.8 × 0.5 m) with bar, tube or angle in it, laid along its length */
K.shapes.stillage = (add, def, { B, C }) => {
  add(B(1.2, 0.04, 0.8, 0.004), DARK, 0, 0.12, 0)
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(B(0.05, 0.6, 0.05, 0.004), DARK, sx * 0.58, 0.4, sz * 0.38)
  for (const sz of [-1, 1]) add(B(1.2, 0.04, 0.04, 0.004), DARK, 0, 0.68, sz * 0.38)
  const c = def.color || STEEL
  for (let i = 0; i < 5; i++) for (let k = 0; k < 3; k++) {
    const z = -0.28 + i * 0.14, y = 0.2 + k * 0.12, l = def.load === 'cut' ? 0.5 + ((i + k) % 3) * 0.2 : 1.16
    if (def.load === 'bars') add(C(0.03, l, 12), c, 0, y, z, 0, 0, Math.PI / 2)
    else if (def.load === 'angles') { add(B(l, 0.05, 0.006, 0.001), c, 0, y, z); add(B(l, 0.006, 0.05, 0.001), c, 0, y - 0.022, z + 0.022) }
    else add(B(l, 0.1, 0.1, 0.004), c, def.load === 'cut' ? -0.3 + ((i * 3 + k) % 4) * 0.15 : 0, y, z)
  }
}
/** a tote (0.6 × 0.4 × 0.3 m) with small parts */
K.shapes.tote = (add, def, { B, C }) => {
  add(B(0.6, 0.3, 0.4, 0.02), def.color || '#3e6ea6', 0, 0.15, 0)
  const l = def.load
  for (let i = 0; i < 6; i++) {
    const x = -0.2 + (i % 3) * 0.2, z = -0.08 + Math.floor(i / 3) * 0.16
    if (l === 'harness') add(new T.TorusGeometry(0.12, 0.025, 8, 18), i % 2 ? '#e2713a' : '#26282b', 0, 0.32 + i * 0.02, 0, Math.PI / 2)
    else if (l === 'clips') { add(B(0.12, 0.05, 0.006, 0.001), STEEL, x, 0.33, z); add(B(0.12, 0.006, 0.05, 0.001), STEEL, x, 0.31, z + 0.022) }
    else add(C(l === 'pins' ? 0.019 : 0.016, l === 'pins' ? 0.23 : 0.47, 10), l === 'pins' ? '#5a5f63' : CHROME, x * 0.4, 0.33, z, 0, 0, Math.PI / 2)
  }
}
/** the wheel kit: four wheels standing, four motors, eight bearings on a carrier */
K.shapes.wheelkit = (add, def, { B, C }) => {
  add(B(1.4, 0.06, 1.1, 0.01), DARK, 0, 0.18, 0)
  for (let i = 0; i < 4; i++) {
    const x = -0.45 + i * 0.3
    add(C(0.309, 0.254, 28), TYRE, x, 0.52, -0.15, Math.PI / 2, 0, Math.PI / 2)
    add(C(0.21, 0.26, 20), RIM, x, 0.52, -0.15, Math.PI / 2, 0, Math.PI / 2)
    add(C(0.076, 0.123, 16), ORANGE, x, 0.29, 0.38)
    add(B(0.145, 0.06, 0.145, 0.01), DARK, x, 0.24, 0.2)
  }
}
/** the Power Cube (686 × 660 × 686 mm): its frame alone, or built up with its engine, tanks and cooler */
K.shapes.cube = (add, def, { B, C }) => {
  const W = 0.686, L = 0.66, H = 0.686, f = def.frame ? STEEL : DARK
  for (const sz of [-1, 1]) add(B(L, 0.1, 0.1, 0.004), f, 0, 0.05, sz * (W / 2 - 0.05))
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(B(0.05, H, 0.05, 0.003), f, sx * (L / 2 - 0.025), H / 2, sz * (W / 2 - 0.025))
  for (const sz of [-1, 1]) add(B(L, 0.05, 0.05, 0.003), f, 0, H - 0.025, sz * (W / 2 - 0.025))
  for (const sx of [-1, 1]) add(B(0.05, 0.05, W, 0.003), f, sx * (L / 2 - 0.025), H - 0.025, 0)
  add(B(0.394, 0.012, 0.203, 0.002), f, 0.05, 0.11, 0)
  if (def.frame) return
  add(B(0.36, 0.3, 0.4, 0.03), '#2f3133', 0.05, 0.27, 0) // crankcase
  for (const sz of [-1, 1]) add(B(0.16, 0.2, 0.14, 0.02), '#3a3d40', 0.05, 0.48, sz * 0.17)
  add(C(0.16, 0.06, 24), '#3a3d42', 0.24, 0.3, 0, 0, 0, Math.PI / 2) // flywheel
  add(B(0.14, 0.3, 0.55, 0.02), '#5a6066', -0.27, 0.25, 0) // reservoir
  add(B(0.36, 0.14, 0.4, 0.04), '#c7473a', 0.0, 0.7, 0) // fuel tank on top
  add(B(0.05, 0.3, 0.3, 0.01), '#26282b', 0.0, 0.4, W / 2 - 0.02) // cooler
  add(B(0.18, 0.18, 0.13, 0.01), '#1d1e20', -0.18, 0.2, -0.24) // battery
  add(C(0.045, 0.16, 14), '#2f6fb5', -0.12, 0.25, 0.22, 0, 0, Math.PI / 2) // pump
}
/** the valve manifold (400 × 102 × 76 mm), and with its four valves and eight coils on it */
K.shapes.manifold = (add, def, { B, C }) => {
  add(B(0.6, 0.12, 0.4, 0.01), DARK, 0, 0.06, 0)
  add(B(0.4, 0.076, 0.102, 0.003), '#c4c9cc', 0, 0.158, 0)
  if (!def.valves) return
  for (let i = 0; i < 4; i++) {
    const x = -0.15 + i * 0.1
    add(B(0.07, 0.07, 0.2, 0.004), BLUE, x, 0.23, 0)
    for (const sz of [-1, 1]) add(C(0.03, 0.07, 14), '#1d1e20', x, 0.23, sz * 0.13, Math.PI / 2)
  }
  add(B(0.08, 0.08, 0.08, 0.005), '#c7473a', -0.25, 0.23, 0)
}
K.shapes.reel = (add, def, { C }) => {
  add(C(0.5, 0.04, 28), '#3a3d42', 0, 0.02, 0)
  add(C(0.42, 0.36, 28), '#1d1e20', 0, 0.22, 0)
  add(C(0.5, 0.04, 28), '#3a3d42', 0, 0.42, 0)
}
/** one LifeTrac's hoses, coiled and capped, on a cart */
K.shapes.hoses = (add, def, { B }) => {
  add(B(1.0, 0.05, 0.7, 0.005), DARK, 0, 0.2, 0)
  for (let i = 0; i < 8; i++) add(new T.TorusGeometry(0.22 - (i % 3) * 0.04, 0.012, 6, 22), '#1d1e20', -0.22 + (i % 2) * 0.44, 0.24 + Math.floor(i / 2) * 0.03, 0, Math.PI / 2)
  for (let i = 0; i < 6; i++) add(B(0.03, 0.03, 0.03, 0.004), '#e2713a', -0.4 + i * 0.16, 0.26, 0.3)
}
/** the four cylinders on their rack: two lift (2.5" bore), two bucket (3"), orange barrels, chrome rods */
K.shapes.cylrack = (add, def, { B, C }) => {
  add(B(1.2, 0.05, 0.8, 0.005), DARK, 0, 0.2, 0)
  for (const sx of [-1, 1]) add(B(0.05, 0.4, 0.7, 0.004), DARK, sx * 0.55, 0.4, 0)
  const rows = [[0.038, 0.77, 0.4], [0.038, 0.77, 0.4], [0.046, 0.63, 0.33], [0.046, 0.63, 0.33]]
  rows.forEach(([r, l, rod], i) => {
    const z = -0.27 + i * 0.18, y = 0.32 + (i % 2) * 0.1
    add(C(r, l, 16), ORANGE, -0.12, y, z, 0, 0, Math.PI / 2)
    add(C(0.019, rod, 12), CHROME, -0.12 + l / 2 + rod / 2 - 0.05, y, z, 0, 0, Math.PI / 2)
  })
}
K.shapes.spools = (add, def, { B, C }) => {
  add(B(1.2, 0.1, 0.8, 0.01), '#b88a5a', 0, 0.05, 0)
  const cols = ['#c7473a', '#26282b', '#eab33b', '#3e6ea6']
  for (let i = 0; i < 4; i++) {
    const x = -0.3 + (i % 2) * 0.6, z = -0.2 + Math.floor(i / 2) * 0.4
    add(C(0.18, 0.04, 18), '#3a3d42', x, 0.12, z)
    add(C(0.14, 0.24, 18), cols[i], x, 0.26, z)
    add(C(0.18, 0.04, 18), '#3a3d42', x, 0.4, z)
  }
}
/** the controller: the node box with its clear lid, the handheld, the mast's kit, on a tray */
K.shapes.controller = (add, def, { B, C }) => {
  add(B(0.8, 0.05, 0.6, 0.01), DARK, 0, 0.12, 0)
  add(B(0.25, 0.1, 0.2, 0.01), '#9aa0a6', -0.15, 0.2, 0)
  add(B(0.24, 0.005, 0.19, 0.002), '#cfe3ea', -0.15, 0.252, 0)
  add(B(0.12, 0.04, 0.08, 0.01), '#e9c21b', 0.18, 0.165, -0.1)
  add(C(0.012, 0.02, 10), '#c7473a', 0.18, 0.195, -0.1)
  add(C(0.03, 0.06, 14), '#ffb21a', 0.2, 0.18, 0.15)
  add(C(0.004, 0.5, 6), '#1d1e20', 0.05, 0.15, 0.2, 0, 0, Math.PI / 2)
}

/** the LifeTrac's steps, in the order the line adds them (the asset's STEPS) */
const UPTO = ['frame', 'wheels', 'cube', 'hydraulics', 'arms', 'cylinders', 'platform', 'electronics']
/**
 * The LifeTrac as it grows down the line, at its real size, facing +x (forward along the line), from OSE's v25 CAD
 * numbers as the asset draws them: x = (Y − 760) mm, y = Z mm, z = X mm (lifetrac.js `P`, turned to face +x).
 */
K.shapes.lifetrac = (add, def, { B, C }) => {
  const n = UPTO.indexOf(def.upto || 'electronics') + 1
  const has = (s) => UPTO.indexOf(s) < n
  const S = 0.001, X = (Y) => (Y - 760) * S, Y_ = (Z) => Z * S, Z_ = (Xc) => Xc * S
  const at = (Xc, Y, Z) => [X(Y), Y_(Z), Z_(Xc)]
  // the frame: four side panels in two sandwiches, as the asset's `panel` outline, the floor, walls, motor plates, tubes
  const panel = (len, drop) => [[0, 150], [len, 150], [len, 480 - drop], [1300 * (len / 1392.6), 525 - drop], [330, 925 - drop], [292, 1040 - drop], [268, 1128 - drop * 0.4], [232, 1166 - drop * 0.4], [200, 1176 - drop * 0.4], [168, 1168 - drop * 0.4], [128, 1150 - drop], [0, 1150 - drop]]
  const side = (pts, X0, t) => {
    const sh = new T.Shape(pts.map(([y, z]) => new T.Vector2(X(y), Y_(z))))
    const g = new T.ExtrudeGeometry(sh, { depth: t * S, bevelEnabled: false, curveSegments: 4 })
    g.translate(0, 0, X0 * S)
    add(g, GREEN)
  }
  side(panel(1392.6, 0), 510, 12.7); side(panel(1392.6, 0), -522.7, 12.7)
  side(panel(1349.2, 32), 377.3, 12.7); side(panel(1349.2, 32), -390, 12.7)
  boxAt(add, B, GREEN, X(100), X(1297), Y_(150), Y_(156), Z_(-510), Z_(510))
  boxAt(add, B, GREEN, X(0), X(6.35), Y_(500), Y_(1150), Z_(-510), Z_(510))
  for (const sx of [-1, 1]) boxAt(add, B, GREEN, X(100), X(1297), Y_(152), Y_(406), Z_(sx * 234), Z_(sx * 241))
  for (const y of [130, 1290]) boxAt(add, B, STEEL, X(y - 25), X(y + 25), Y_(233), Y_(385), Z_(-535), Z_(535))
  for (const y of [150, 700]) boxAt(add, B, STEEL, X(y - 51), X(y + 51), Y_(448), Y_(550), Z_(-377), Z_(377))
  if (has('wheels')) for (const y of [400, 1150]) for (const sx of [-1, 1]) {
    add(C(0.30875, 0.254, 28), TYRE, X(y), Y_(308.75), Z_(sx * 707), Math.PI / 2)
    add(C(0.21, 0.26, 20), RIM, X(y), Y_(308.75), Z_(sx * 707), Math.PI / 2)
    add(C(0.076, 0.123, 16), ORANGE, X(y), Y_(308.75), Z_(sx * 160), Math.PI / 2)
    add(C(0.016, 0.47, 10), CHROME, X(y), Y_(308.75), Z_(sx * 505), Math.PI / 2)
  }
  if (has('cube')) {
    const y0 = 425 - 330, y1 = 425 + 330, z0 = 550, z1 = 1236
    for (const sx of [-1, 1]) for (const yy of [y0 + 25, y1 - 25]) boxAt(add, B, DARK, X(yy - 25), X(yy + 25), Y_(z0), Y_(z1), Z_(sx * 318), Z_(sx * 368))
    for (const sx of [-1, 1]) boxAt(add, B, DARK, X(y0), X(y1), Y_(z1 - 50), Y_(z1), Z_(sx * 318), Z_(sx * 368))
    boxAt(add, B, '#2f3133', X(260), X(620), Y_(z0 + 110), Y_(z0 + 420), Z_(-200), Z_(200))
    boxAt(add, B, '#c7473a', X(250), X(610), Y_(z1 - 190), Y_(z1 - 50), Z_(-200), Z_(200))
    boxAt(add, B, '#5a6066', X(110), X(250), Y_(z0 + 100), Y_(z0 + 400), Z_(-280), Z_(280))
  }
  if (has('hydraulics')) {
    boxAt(add, B, '#c4c9cc', X(280), X(380), Y_(1272), Y_(1348), Z_(-200), Z_(200))
    for (let i = 0; i < 4; i++) boxAt(add, B, BLUE, X(290), X(370), Y_(1348), Y_(1418), Z_(-165 + i * 110 - 35), Z_(-165 + i * 110 + 35))
    for (const sx of [-1, 1]) for (const y of [400, 1150]) barAt(add, '#1d1e20', at(sx * 120, 330, 1290), at(sx * 160, y, 390), 0.0095, 6)
  }
  // the arms: pivot (Y 200, Z 1100) → elbow (1510, 545) → tip (1644, 60), at X ±450; the cross beam between them
  if (has('arms')) {
    for (const sx of [-1, 1]) {
      beamAt(add, TEAL, at(sx * 450, 200, 1100), at(sx * 450, 1510, 545), 0.08, 0.152)
      beamAt(add, TEAL, at(sx * 450, 1510, 545), at(sx * 450, 1644, 60), 0.08, 0.152)
      add(C(0.025, 0.24, 12), CHROME, X(200), Y_(1100), Z_(sx * 450), Math.PI / 2)
    }
    beamAt(add, TEAL, at(-450, 880, 811), at(450, 880, 811), 0.152, 0.0508)
  }
  if (has('cylinders')) for (const sx of [-1, 1]) {
    barAt(add, ORANGE, at(sx * 450, 50, 600), at(sx * 450, 600, 609), 0.038, 14)
    barAt(add, CHROME, at(sx * 450, 600, 609), at(sx * 450, 880, 613), 0.019, 10)
    barAt(add, ORANGE, at(sx * 315, 798, 655), at(sx * 315, 1290, 470), 0.046, 14)
    barAt(add, CHROME, at(sx * 315, 1290, 470), at(sx * 315, 1644, 360), 0.019, 10)
  }
  if (has('platform')) {
    const bk = 1650
    boxAt(add, B, YELLOW, X(bk), X(bk + 6), Y_(0), Y_(450), Z_(-556), Z_(556))
    boxAt(add, B, YELLOW, X(bk), X(bk + 600), Y_(0), Y_(6), Z_(-556), Z_(556))
    for (const sx of [-1, 1]) boxAt(add, B, YELLOW, X(bk), X(bk + 600), Y_(0), Y_(450), Z_(sx * 550), Z_(sx * 556))
    boxAt(add, B, '#c9b11a', X(bk + 520), X(bk + 600), Y_(0), Y_(19), Z_(-550), Z_(550))
    boxAt(add, B, STEEL, X(-325), X(75), Y_(324), Y_(330), Z_(-368), Z_(368))
  }
  if (has('electronics')) {
    boxAt(add, B, '#9aa0a6', X(560), X(760), Y_(1236), Y_(1336), Z_(-125), Z_(125))
    barAt(add, GREY, at(-300, 10, 1000), at(-300, 10, 1750), 0.03, 10)
    add(C(0.05, 0.08, 14), '#ffb21a', X(10), Y_(1190), Z_(300))
    add(C(0.004, 0.3, 6), '#1d1e20', X(10), Y_(1900), Z_(-300))
  }
}

/** how our shapes stack on a pallet at a feeder or the shipping door */
K.stackOf0 = K.stackOf
K.stackOf = (def) => (def.shape === 'sheets' ? { nx: 1, nz: 1, dx: 0, dz: 0, dy: 0.1, ny: 1, s: 1 } : def.shape === 'stillage' || def.shape === 'spools' || def.shape === 'reel' ? { nx: 1, nz: 1, dx: 0, dz: 0, dy: 0.7, ny: 2, s: 1 } : K.stackOf0(def))
