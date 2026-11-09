// @ts-nocheck — AirSup's code, kept as close to theirs as our app allows
/*
 * THE ASSET KIT — the materials, geometry, studio and effects every asset of ours can be built and shown with, taken
 * from AirSup's machine skill (`.claude/skills/machine-skill`, its `kit/lab-kit.js` at commit e0bd066), whose machines
 * are the most real we have seen: measured metals and paints, solids that cut open with clean section caps, a soft
 * studio. MIT licence:
 *
 *   Copyright (c) 2026 Air Supply Technologies Inc. (Airsup)
 *   Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
 *   documentation files (the "Software"), to deal in the Software without restriction, including without limitation
 *   the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
 *   permit persons to whom the Software is furnished to do so, subject to the following conditions: The above
 *   copyright notice and this permission notice shall be included in all copies or substantial portions of the
 *   Software. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT
 *   LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT
 *   SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF
 *   CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 *   IN THE SOFTWARE.
 *
 * What is theirs: the math, the section caps, the studio environment, the x-ray ghost and the contact shadow; their
 * shaders are TSL now, the render kit's shared nodes ($content/render/nodes, intent cb16b7a5), so they draw on
 * WebGPU too. Their materials, geometry, textures and flow streaks, which nothing of ours drew, are gone. What is ours: the
 * last two take their scene and size as arguments instead of AirSup's Lab (a page of its own that scales every machine
 * to the same size on screen); our stage (./stage.js) shows an asset at its real size instead, the camera framing it.
 * The parts, explode, cutaway, x-ray and labels of AirSup's Lab are generalised for every asset in ./parts.js and
 * ./stage.js.
 */

import * as THREE from 'three'
import { blurMaterial, cutBy, cutOf, ghostMaterial, nodeOf, poolMaterial } from '../render/nodes/index.js'
import { pmremFor } from '../render/core.js'

export { THREE, ghostMaterial }
export const LAYER_FX = 1 // transparent effects: kept out of the AO and contact shadow passes

/**
 * Whether a mesh is cut out by a picture: drawn on a sheet bigger than it (a leaf on its polar sheet), its outline in
 * an alpha map or its colour map's alpha, `alphaTest` dropping the rest. A pass that draws the scene through one
 * material of its own (the ambient occlusion's normals, the contact shadow's depth) would draw the sheet whole, a
 * pale ghost round every leaf: those passes leave it out or draw it through a material that cuts it too.
 * @param {THREE.Object3D} o
 */
export const cutOut = (o) => !!(/** @type {any} */ (o).isMesh) && (Array.isArray(o.material) ? o.material : [o.material]).some((m) => m && m.alphaTest > 0 && !!(m.alphaMap || m.map))

// ---------------------------------------------------------------- math

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x))
export const lerp = (a, b, t) => a + (b - a) * t
export const ease = {
  lin: (t) => t,
  io: (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  in: (t) => t * t * t,
  out: (t) => 1 - Math.pow(1 - t, 3),
  expo: (t) => t >= 1 ? 1 : 1 - Math.pow(2, -10 * t),
  back: (t) => { const c = 1.4; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2) },
}
/** first order lag toward target with time constant tau (s): spool-up, thermal mass, filters */
export const approach = (v, target, tau, dt) => target + (v - target) * Math.exp(-dt / Math.max(1e-6, tau))

// ---------------------------------------------------------------- section caps

/** the cut every solid of the stage is opened by: removed where dot(n, p) + w < 0 for both planes */
export const CUT = cutOf()
export const LAB_PLANES = [new THREE.Plane(new THREE.Vector3(0, 0, -1), 1e5), new THREE.Plane(new THREE.Vector3(0, 0, -1), 1e5)]

/**
 * A material as the stage draws it: a node material of the same look, opened by the section planes (the shadow pass
 * by `LAB_PLANES` too), and, given its cap's look, the back faces seen through the opening drawn as a flat machined
 * cap on the cut plane (plane normal, cap colour, a faint hatch). Every solid stays closed, no cap geometry.
 * @param {THREE.Material} m @param {{ color: THREE.ColorRepresentation, rough: number, metal: number }} [cap]
 */
export function labMaterial(m, cap) {
  const n = cutBy(nodeOf(m), CUT, cap)
  n.clippingPlanes = LAB_PLANES; n.clipIntersection = true; n.clipShadows = true
  return n
}

// ---------------------------------------------------------------- studio

export function studioEnvironment(renderer, theme) {
  // a softbox studio: big top light, a key strip, two rim strips, and black flags so metals keep contrast
  const paper = theme === 'paper'
  const s = new THREE.Scene()
  const room = new THREE.Mesh(new THREE.SphereGeometry(30, 32, 16), new THREE.MeshBasicMaterial({ color: paper ? 0x9c9a95 : 0x0a0b0d, side: THREE.BackSide }))
  s.add(room)
  const floor = new THREE.Mesh(new THREE.CircleGeometry(30, 32), new THREE.MeshBasicMaterial({ color: paper ? 0xd8d6d0 : 0x141517 }))
  floor.rotation.x = -Math.PI / 2; floor.position.y = -2; s.add(floor)
  const box = (w, h, x, y, z, k, tint = [1, 1, 1]) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(...tint).multiplyScalar(k), side: THREE.DoubleSide }))
    m.position.set(x, y, z); m.lookAt(0, 0, 0); s.add(m)
  }
  box(14, 10, 0, 14, 2, paper ? 2.6 : 3.2)                  // overhead soft box
  box(4, 14, -12, 4, 8, paper ? 4.5 : 6, [1, 0.96, 0.9])    // warm key strip, front left
  box(2.2, 14, 13, 5, -6, paper ? 6 : 9, [0.88, 0.94, 1])   // cool rim, back right
  box(2.2, 14, -11, 5, -9, paper ? 3.5 : 5)                 // second rim, back left
  box(8, 3, 6, 1.5, 12, paper ? 1.4 : 1.6)                  // low front fill
  // black flags: long dark reflections give metal its shape on a white set
  box(5, 16, 12, 4, 7, 0.02); box(4, 16, -13, 4, -2, 0.02); box(16, 3, 0, -1, -14, 0.03)
  const pm = pmremFor(renderer) // three/webgpu's on WebGPU (the stage is made once its renderer may draw)
  const rt = pm.fromScene(s, 0.02)
  pm.dispose()
  return rt.texture
}
// ---------------------------------------------------------------- contact shadow

/** how dark the pool is under what touches the floor */
const DARK = 2.2

/** ours: `lab` is any { renderer, scene, groundY, theme } and `scale` the asset's size over AirSup's 2.4 display units,
 *  so the pool is as wide and as deep for a 0.7 m cube as for a 4 m engine */

export class ContactShadow {
  // depth seen from below the floor, blurred twice: the soft dark pool under the machine
  constructor(lab, opacity, scale = 1) {
    this.lab = lab
    const S = 512, W = 7 * scale
    this.rt = new THREE.WebGLRenderTarget(S, S); this.rt.texture.generateMipmaps = false
    this.rtB = new THREE.WebGLRenderTarget(S, S); this.rtB.texture.generateMipmaps = false
    this.cam = new THREE.OrthographicCamera(-W / 2, W / 2, W / 2, -W / 2, 0, 2.4 * scale)
    this.cam.rotation.x = Math.PI / 2
    this.cam.position.y = lab.groundY
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(W, W).rotateX(Math.PI / 2), poolMaterial(this.rt.texture, lab.theme === 'paper' ? 0x3a3530 : 0x000000, opacity))
    plane.position.y = lab.groundY + 0.002 * scale; plane.scale.y = -1; plane.renderOrder = 1; plane.layers.set(LAYER_FX)
    lab.scene.add(plane, this.cam)
    this.plane = plane
    // three's own depth (white near the floor): the first blur turns it into the pool's darkness (`DARK`)
    this.depthMat = new THREE.MeshDepthMaterial()
    this.depthMat.depthTest = false; this.depthMat.depthWrite = false
    this.depthMat.clippingPlanes = LAB_PLANES; this.depthMat.clipIntersection = true
    this.hb = blurMaterial(this.rt.texture); this.vb = blurMaterial(this.rtB.texture)
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(W, W).rotateX(Math.PI / 2), this.hb); this.quad.frustumCulled = false; this.quad.position.y = lab.groundY + 0.01 * scale
  }
  // off the stage and off the graphics card: its targets, its planes and its materials (a stage shows a new one with
  // each asset, and a plant growing is shown anew many times a second)
  dispose() {
    this.lab.scene.remove(this.plane, this.cam)
    this.rt.dispose(); this.rtB.dispose()
    this.plane.geometry.dispose(); this.plane.material.dispose()
    this.quad.geometry.dispose()
    this.depthMat.dispose(); this.hb.dispose(); this.vb.dispose()
    for (const d of this.cuts?.values() ?? []) d.dispose()
  }
  /** the depth material for a cut-out mesh's material: the contact shadow's own, cutting what its picture cuts */
  cutDepth(m) {
    this.cuts ??= new Map()
    let d = this.cuts.get(m)
    if (!d) {
      d = this.depthMat.clone()
      d.map = m.map; d.alphaMap = m.alphaMap; d.alphaTest = m.alphaTest; d.side = m.side
      this.cuts.set(m, d)
    }
    return d
  }
  blur(amount, dark = 0) {
    const r = this.lab.renderer
    this.quad.material = this.hb; this.hb.blur.dir.value.set(amount / 256, 0); this.hb.blur.gain.value = dark
    r.setRenderTarget(this.rtB); r.render(this.quad, this.cam)
    this.quad.material = this.vb; this.vb.blur.dir.value.set(0, amount / 256)
    r.setRenderTarget(this.rt); r.render(this.quad, this.cam)
  }
  update() {
    const lab = this.lab, r = lab.renderer, sc = lab.scene
    const bg = sc.background, ov = sc.overrideMaterial
    const hide = [], cut = []
    sc.traverse((o) => { if ((o.userData.studio || o === this.plane) && o.visible) { o.visible = false; hide.push(o) } else if (o.visible && cutOut(o)) cut.push(o) })
    // the solid parts through the depth material, the cut-out ones aside
    for (const o of cut) o.visible = false
    sc.background = null; sc.overrideMaterial = this.depthMat
    const cc = r.getClearAlpha(); r.setClearAlpha(0)
    r.setRenderTarget(this.rt); r.clear(); r.render(sc, this.cam)
    sc.overrideMaterial = ov
    // then the cut-out ones alone, each through a depth material that drops what its picture cuts away
    if (cut.length) {
      const solid = []
      sc.traverse((o) => { if (o.visible && (o.isMesh || o.isLine || o.isPoints || o.isSprite)) { o.visible = false; solid.push(o) } })
      const was = cut.map((o) => o.material)
      for (const o of cut) { o.visible = true; o.material = Array.isArray(o.material) ? o.material.map((m) => this.cutDepth(m)) : this.cutDepth(o.material) }
      const ac = r.autoClear; r.autoClear = false
      r.render(sc, this.cam)
      r.autoClear = ac
      cut.forEach((o, i) => { o.material = was[i] })
      for (const o of solid) o.visible = true
    }
    this.blur(1.2, DARK); this.blur(0.5)
    r.setRenderTarget(null); r.setClearAlpha(cc)
    sc.background = bg
    for (const o of hide) o.visible = true
  }
}

