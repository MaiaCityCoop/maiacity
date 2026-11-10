// @ts-nocheck — plain JS, run under Bun by the census
/*
 * A WEBGPU DEVICE THAT ONLY ANSWERS (intent 416c555c) — what three's own WebGPU backend needs of `navigator.gpu` to run
 * a frame's whole main-thread work in Bun with no graphics card: an adapter, a device, its queue, buffers, textures,
 * pipelines, bind groups, command encoders and passes, none of which does anything but count. So the census counts the
 * WebGPU calls a frame makes (../census.ts --frame): the calls Safari's main thread pays for one by one, where
 * ./counting.js counts only the draws three would send.
 *
 *   const gpu = fakeGPU();            // navigator.gpu; gpu.context(canvas) a canvas's 'webgpu' context
 *   gpu.calls                         // Map: 'queue.writeBuffer' → times called since gpu.reset()
 *   gpu.bytes                         // bytes handed to queue.writeBuffer since gpu.reset()
 */

const LIMITS = { maxTextureDimension1D: 8192, maxTextureDimension2D: 8192, maxTextureDimension3D: 2048, maxTextureArrayLayers: 256, maxBindGroups: 4, maxBindGroupsPlusVertexBuffers: 24, maxBindingsPerBindGroup: 1000, maxDynamicUniformBuffersPerPipelineLayout: 8, maxDynamicStorageBuffersPerPipelineLayout: 4, maxSampledTexturesPerShaderStage: 16, maxSamplersPerShaderStage: 16, maxStorageBuffersPerShaderStage: 8, maxStorageTexturesPerShaderStage: 4, maxUniformBuffersPerShaderStage: 12, maxUniformBufferBindingSize: 65536, maxStorageBufferBindingSize: 134217728, minUniformBufferOffsetAlignment: 256, minStorageBufferOffsetAlignment: 256, maxVertexBuffers: 8, maxBufferSize: 268435456, maxVertexAttributes: 16, maxVertexBufferArrayStride: 2048, maxInterStageShaderVariables: 16, maxColorAttachments: 8, maxColorAttachmentBytesPerSample: 32, maxComputeWorkgroupStorageSize: 16384, maxComputeInvocationsPerWorkgroup: 256, maxComputeWorkgroupSizeX: 256, maxComputeWorkgroupSizeY: 256, maxComputeWorkgroupSizeZ: 64, maxComputeWorkgroupsPerDimension: 65535 };

export function fakeGPU() {
	const calls = new Map();
	const state = { bytes: 0, writes: /** @type {Map<object, number>} */ (new Map()), passes: /** @type {{ width: number, height: number, colors: number, draws: number }[]} */ ([]) };
	const hit = (name) => calls.set(name, (calls.get(name) ?? 0) + 1);
	/** an object of the API: its own fields, and every other method counted under `kind.method`, answering `answer` */
	const thing = (kind, own = {}, answer = () => undefined) =>
		new Proxy(own, {
			get(t, k) {
				if (k in t || typeof k === 'symbol' || k === 'then' || k === 'toJSON') return t[k];
				return (...a) => (hit(`${kind}.${k}`), answer(k, a));
			},
			set(t, k, v) {
				t[k] = v;
				return true;
			}
		});
	const counted = (kind, own) => {
		for (const [k, f] of Object.entries(own)) if (typeof f === 'function') own[k] = (...a) => (hit(`${kind}.${k}`), f(...a));
		return thing(kind, own);
	};
	const view = (texture) => thing('view', { label: '', texture });
	const texture = (d = {}) => {
		const size = Array.isArray(d.size) ? { width: d.size[0], height: d.size[1] ?? 1, depthOrArrayLayers: d.size[2] ?? 1 } : (d.size ?? {});
		const t = counted('texture', { label: d.label ?? '', width: size.width ?? 1, height: size.height ?? 1, depthOrArrayLayers: size.depthOrArrayLayers ?? 1, format: d.format ?? 'bgra8unorm', mipLevelCount: d.mipLevelCount ?? 1, sampleCount: d.sampleCount ?? 1, dimension: d.dimension ?? '2d', usage: d.usage ?? 0, textureBindingViewDimension: d.textureBindingViewDimension, createView: () => view(t), destroy() {} });
		return t;
	};
	const buffer = (d = {}) => {
		// three hands one descriptor over and over (reset after each): its values are read now
		const size = d.size ?? 0;
		let mapped = null;
		return counted('buffer', { label: d.label ?? '', size, usage: d.usage ?? 0, mapState: 'unmapped', getMappedRange: (o = 0, n) => ((mapped ??= new ArrayBuffer(size)), o === 0 && n === undefined ? mapped : mapped.slice(o, n === undefined ? undefined : o + n)), unmap: () => void (mapped = null), mapAsync: async () => {}, destroy() {} });
	};
	const pass = (kind) => thing(kind, { label: '' });
	/** a render pass: its target's size (its first colour's, else its depth's) and the draws sent into it */
	const renderPass = (d = {}) => {
		const t = d.colorAttachments?.[0]?.view?.texture ?? d.depthStencilAttachment?.view?.texture;
		const p = { width: t?.width ?? 0, height: t?.height ?? 0, colors: d.colorAttachments?.length ?? 0, draws: 0 };
		state.passes.push(p);
		return thing('pass', { label: '' }, (k) => void (/^draw/.test(k) && p.draws++));
	};
	const encoder = () => counted('encoder', { label: '', beginRenderPass: renderPass, beginComputePass: () => pass('compute'), finish: () => ({}) });
	const pipeline = (kind) => counted(kind, { label: '', getBindGroupLayout: () => ({}) });
	const queue = counted('queue', {
		label: '',
		writeBuffer(b, _o, data, _from, size) {
			const n = size ?? data?.byteLength ?? 0;
			state.bytes += n;
			state.writes.set(b, (state.writes.get(b) ?? 0) + 1);
		},
		writeTexture() {},
		copyExternalImageToTexture() {},
		submit() {},
		onSubmittedWorkDone: async () => {}
	});
	const features = new Set(['depth-clip-control', 'depth32float-stencil8', 'texture-compression-bc', 'texture-compression-astc', 'indirect-first-instance', 'rg11b10ufloat-renderable', 'bgra8unorm-storage', 'float32-filterable', 'float32-blendable', 'clip-distances', 'dual-source-blending']);
	const device = counted('device', {
		label: '',
		features,
		limits: LIMITS,
		queue,
		lost: new Promise(() => {}),
		adapterInfo: { vendor: 'census', architecture: '', device: '', description: 'a device that only answers' },
		createBuffer: buffer,
		createTexture: texture,
		createSampler: () => ({}),
		createShaderModule: () => ({ getCompilationInfo: async () => ({ messages: [] }) }),
		createBindGroupLayout: () => ({}),
		createPipelineLayout: () => ({}),
		createBindGroup: () => ({}),
		createRenderPipeline: () => pipeline('pipeline'),
		createComputePipeline: () => pipeline('pipeline'),
		createRenderPipelineAsync: async () => pipeline('pipeline'),
		createComputePipelineAsync: async () => pipeline('pipeline'),
		createCommandEncoder: encoder,
		createRenderBundleEncoder: () => counted('bundle', { label: '', finish: () => ({}) }),
		createQuerySet: () => thing('queryset', { label: '' }),
		pushErrorScope() {},
		popErrorScope: async () => null,
		addEventListener() {},
		removeEventListener() {},
		destroy() {}
	});
	const adapter = { features, limits: LIMITS, info: device.adapterInfo, isFallbackAdapter: false, requestDevice: async () => device, requestAdapterInfo: async () => device.adapterInfo };
	const g = /** @type {any} */ (globalThis);
	g.GPUBufferUsage ??= { MAP_READ: 1, MAP_WRITE: 2, COPY_SRC: 4, COPY_DST: 8, INDEX: 16, VERTEX: 32, UNIFORM: 64, STORAGE: 128, INDIRECT: 256, QUERY_RESOLVE: 512 };
	g.GPUTextureUsage ??= { COPY_SRC: 1, COPY_DST: 2, TEXTURE_BINDING: 4, STORAGE_BINDING: 8, RENDER_ATTACHMENT: 16 };
	g.GPUMapMode ??= { READ: 1, WRITE: 2 };
	g.GPUShaderStage ??= { VERTEX: 1, FRAGMENT: 2, COMPUTE: 4 };
	// three asks whether a pass is a bundle's: none here is
	g.GPURenderBundleEncoder ??= class GPURenderBundleEncoder {};
	g.GPUColorWrite ??= { RED: 1, GREEN: 2, BLUE: 4, ALPHA: 8, ALL: 15 };
	return {
		requestAdapter: async () => adapter,
		getPreferredCanvasFormat: () => 'bgra8unorm',
		wgslLanguageFeatures: new Set(),
		/** a canvas's 'webgpu' context */
		context: (canvas) => {
			let current = null, d = {};
			return counted('canvas', { canvas, configure: (c) => void ((d = c), (current = null)), unconfigure() {}, getConfiguration: () => d, getCurrentTexture: () => (current ??= texture({ size: { width: canvas.width || 1, height: canvas.height || 1 }, format: d.format })) });
		},
		device,
		calls,
		get bytes() {
			return state.bytes;
		},
		/** how many buffers were written since the last reset */
		get buffersWritten() {
			return state.writes.size;
		},
		/** every render pass begun since the last reset: its target's size, its colour targets, its draws */
		get passes() {
			return state.passes;
		},
		reset() {
			state.passes = [];
			calls.clear();
			state.bytes = 0;
			state.writes.clear();
		}
	};
}
