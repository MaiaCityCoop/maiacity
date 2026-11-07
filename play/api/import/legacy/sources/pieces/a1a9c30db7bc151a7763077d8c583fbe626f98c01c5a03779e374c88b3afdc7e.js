//#piece 4cdbb4c593c8acd273abd3f4987486866bdc944fdb72a537aba2b7ca666d532b
});
/**
* A cube on its own, every part its own: runs (an engine and fan turning, if it has them), off, is drawn apart, is
* built. `assemblies` and `steps` are its own; the rest is `powerCubeParts`' options.
* @param {{ name: string, assemblies: import('./parts.js').Assembly[], steps: string[], stepOf: Record<string, number>, sources?: { label: string, url: string }[], hums?: boolean, len?: number, engine?: boolean, controls?: boolean, insides?: Insides }} o
* @returns {Cast}
