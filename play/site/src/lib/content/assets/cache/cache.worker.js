// @ts-nocheck — plain JS, trusted: the device cache's own worker (./store.js)
/*
 * The device cache's writes, beside the page (asked `{id, op}`, answered `{id, ...}` or `{id, error}`): `png`, a build's
 * picture as a PNG file (reading a picture back off the graphics card and encoding it takes seconds on a busy software
 * GPU, so never on the page's thread); `write`, a file of the cache's OPFS folder, whole and flushed (only a worker has
 * OPFS's synchronous files); `can`, whether it can (Playwright's WebKit has no OPFS in workers: the page then writes the
 * files itself). Nothing of an asset runs here.
 */

/** a file's name in the cache's folder */
const NAME = /^[a-z0-9.-]+$/;

/** the cache's folder, opened when it is first written to */
let folder;
const folderOf = (dir) => (folder ??= navigator.storage.getDirectory().then((root) => root.getDirectoryHandle(dir, { create: true })));

/** the files being written, one after another, each answered with how it went */
let writing = Promise.resolve();

/** writes `bytes` as the file `name` of the folder `dir`, whole and flushed */
async function write({ dir, name, bytes }) {
	if (!NAME.test(dir) || !NAME.test(name) || !(bytes instanceof Uint8Array)) throw new Error('no file of the cache');
	const file = await (await (await folderOf(dir)).getFileHandle(name, { create: true })).createSyncAccessHandle();
	try {
		file.truncate(0);
		if (file.write(bytes, { at: 0 }) !== bytes.byteLength) throw new Error('not all of it was written');
		file.flush();
	} finally {
		file.close();
	}
}

/** a picture as a PNG file's bytes @param {ImageBitmap} bitmap */
async function pngOf(bitmap) {
	const c = new OffscreenCanvas(bitmap.width, bitmap.height);
	c.getContext('2d', { willReadFrequently: true }).drawImage(bitmap, 0, 0);
	bitmap.close();
	return new Uint8Array(await (await c.convertToBlob({ type: 'image/png' })).arrayBuffer());
}

self.onmessage = async (e) => {
	const { id, op } = e.data;
	try {
		if (op === 'can') {
			const { dir, name } = e.data;
			const can = await write({ dir, name, bytes: new Uint8Array(1) }).then(() => true, () => false);
			// the probe's one byte, taken away again if the browser lets it: left behind, it is only a byte
			if (can) await (await folderOf(dir)).removeEntry(name).catch(() => {});
			self.postMessage({ id, can });
		} else if (op === 'write') {
			writing = writing.then(() => write(e.data)).then(
				() => self.postMessage({ id, ok: true }),
				(err) => self.postMessage({ id, error: String(err?.message ?? err) })
			);
		} else {
			const png = await pngOf(e.data.bitmap);
			self.postMessage({ id, png }, [png.buffer]);
		}
	} catch (err) {
		self.postMessage({ id, error: String(err?.message ?? err) });
	}
};
