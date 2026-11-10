// the KTX2 loader where nothing transcodes (the census's frame device, ../fakegpu.js): render/arrays.js keeps its placeholders
export class KTX2Loader {
	setTranscoderPath() {
		return this;
	}
	setWorkerLimit() {
		return this;
	}
	detectSupport() {
		throw new Error('census: no transcoder');
	}
}
