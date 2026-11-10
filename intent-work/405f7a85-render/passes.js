// the render passes of each frame on WebGPU, for the Mac's baseline (intent 405f7a85): each pass's attachment size,
// whether it has colour, its draws and triangles; frames told apart by requestAnimationFrame's ticks
(() => {
	const viewTex = new WeakMap(), topo = new WeakMap(), passOf = new WeakMap(), pipeOf = new WeakMap();
	const W = window;
	W.__passes = { frames: [], cur: [] };
	const T = W.GPUTexture?.prototype, E = W.GPUCommandEncoder?.prototype, P = W.GPURenderPassEncoder?.prototype, D = W.GPUDevice?.prototype;
	if (!T || !E || !P || !D) return;
	const cv = T.createView; T.createView = function (...a) { const v = cv.apply(this, a); viewTex.set(v, this); return v; };
	const crp = D.createRenderPipeline; D.createRenderPipeline = function (d) { const p = crp.call(this, d); topo.set(p, d?.primitive?.topology ?? 'triangle-list'); return p; };
	const crpa = D.createRenderPipelineAsync; if (crpa) D.createRenderPipelineAsync = function (d) { return crpa.call(this, d).then((p) => (topo.set(p, d?.primitive?.topology ?? 'triangle-list'), p)); };
	const brp = E.beginRenderPass; E.beginRenderPass = function (d) {
		const enc = brp.call(this, d);
		const col = (d?.colorAttachments ?? []).filter(Boolean);
		const att = col[0]?.view ?? d?.depthStencilAttachment?.view;
		const tex = att ? viewTex.get(att) : null;
		const rec = { label: d?.label ?? null, w: tex?.width ?? null, h: tex?.height ?? null, colour: col.length, depth: !!d?.depthStencilAttachment, draws: 0, tris: 0 };
		W.__passes.cur.push(rec); passOf.set(enc, rec);
		return enc;
	};
	const sp = P.setPipeline; P.setPipeline = function (p) { pipeOf.set(this, p); return sp.call(this, p); };
	const add = (enc, n, inst) => { const r = passOf.get(enc); if (!r) return; r.draws++; const t = topo.get(pipeOf.get(enc)) ?? 'triangle-list'; r.tris += (t === 'triangle-list' ? Math.floor(n / 3) : t === 'triangle-strip' ? Math.max(0, n - 2) : 0) * Math.max(1, inst ?? 1); };
	const dr = P.draw; P.draw = function (v, i, ...a) { add(this, v, i); return dr.call(this, v, i, ...a); };
	const di = P.drawIndexed; P.drawIndexed = function (n, i, ...a) { add(this, n, i); return di.call(this, n, i, ...a); };
	const dri = P.drawIndirect; P.drawIndirect = function (...a) { const r = passOf.get(this); if (r) r.draws++; return dri.apply(this, a); };
	const drii = P.drawIndexedIndirect; P.drawIndexedIndirect = function (...a) { const r = passOf.get(this); if (r) r.draws++; return drii.apply(this, a); };
	const raf = W.requestAnimationFrame.bind(W);
	let last = -1;
	const tick = (t) => { if (t !== last) { last = t; if (W.__passes.cur.length) { W.__passes.frames.push(W.__passes.cur); if (W.__passes.frames.length > 120) W.__passes.frames.shift(); } W.__passes.cur = []; } raf(tick); };
	raf(tick);
	// rAF gaps for medians, and long tasks
	W.__gaps = []; let prev = 0; const g = (t) => { if (prev) W.__gaps.push(t - prev); prev = t; if (W.__gaps.length > 20000) W.__gaps.shift(); raf(g); }; raf(g);
	W.__long = []; try { new PerformanceObserver((l) => { for (const e of l.getEntries()) W.__long.push([Math.round(e.startTime), Math.round(e.duration)]); }).observe({ type: 'longtask', buffered: true }); } catch {}
})();
