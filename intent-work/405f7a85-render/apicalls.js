// the WebGPU API's calls per frame (intent 405f7a85, part B): each wrapped call counted and timed while __api.on, frames
// told apart by requestAnimationFrame's ticks, each frame's own JS (its rAF callbacks) beside them
(() => {
	const W = window; const S = (W.__api = { on: false, frames: [], cur: {} });
	const now = () => performance.now();
	const wrap = (proto, name, key) => {
		const f = proto?.[name]; if (!f) return;
		proto[name] = function (...a) {
			if (!S.on) return f.apply(this, a);
			const t = now();
			try { return f.apply(this, a); } finally { const c = (S.cur[key] ??= [0, 0]); c[0]++; c[1] += now() - t; }
		};
	};
	const Q = W.GPUQueue?.prototype, D = W.GPUDevice?.prototype, P = W.GPURenderPassEncoder?.prototype, E = W.GPUCommandEncoder?.prototype, C = W.GPUComputePassEncoder?.prototype;
	for (const n of ['writeBuffer', 'writeTexture', 'submit', 'copyExternalImageToTexture', 'onSubmittedWorkDone']) wrap(Q, n, 'queue.' + n);
	for (const n of ['createBindGroup', 'createBuffer', 'createTexture', 'createRenderPipeline', 'createRenderPipelineAsync', 'createShaderModule', 'createSampler', 'createBindGroupLayout', 'createPipelineLayout', 'createCommandEncoder', 'createComputePipeline', 'createComputePipelineAsync', 'createQuerySet']) wrap(D, n, 'device.' + n);
	for (const n of ['setPipeline', 'setBindGroup', 'setVertexBuffer', 'setIndexBuffer', 'draw', 'drawIndexed', 'drawIndirect', 'drawIndexedIndirect', 'setViewport', 'setScissorRect', 'end']) wrap(P, n, 'pass.' + n);
	for (const n of ['beginRenderPass', 'beginComputePass', 'finish', 'copyBufferToBuffer', 'copyTextureToTexture', 'resolveQuerySet', 'clearBuffer']) wrap(E, n, 'encoder.' + n);
	for (const n of ['dispatchWorkgroups', 'setPipeline', 'setBindGroup', 'end']) wrap(C, n, 'compute.' + n);
	for (const [o, n] of [[W.GPUBuffer?.prototype, 'mapAsync'], [W.GPUBuffer?.prototype, 'destroy'], [W.GPUTexture?.prototype, 'createView'], [W.GPUTexture?.prototype, 'destroy']]) wrap(o, n, (o === W.GPUBuffer?.prototype ? 'buffer.' : 'texture.') + n);
	const raf = W.requestAnimationFrame.bind(W);
	let js = 0, last = -1;
	W.requestAnimationFrame = (cb) => raf((t) => {
		if (t !== last) { if (S.on && last >= 0) { S.frames.push({ api: S.cur, js }); if (S.frames.length > 2000) S.frames.shift(); } S.cur = {}; js = 0; last = t; }
		const s = now();
		try { cb(t); } finally { js += now() - s; }
	});
})();
