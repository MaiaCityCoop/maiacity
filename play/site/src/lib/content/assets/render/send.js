/*
 * A PER-COPY BUFFER SENT WHERE IT CHANGED (intent 416c555c) — an eye that moves lays every drawing's copies out again
 * (./index.js `update`: which copy stands in which slot, at which level, how far faded in), and most come out as they
 * were. Each drawing's buffers (its copies' matrices, fades, colours, cover and wind) were uploaded whole at every
 * move, some 1,900 buffers a frame walking Sandbox 5; in Safari every upload is the main thread's. Here a buffer is
 * sent only where its values differ from those last sent, and only the span that differs.
 */

/**
 * @returns {(a: import('three').BufferAttribute, n: number) => boolean} `send(a, n)`: the buffer's first `n` values
 *   marked to be sent (`needsUpdate`, the span as its update range) where they differ from those last sent; whether
 *   any did. Every upload of a buffer goes through the one sender that knows what it holds on the graphics card.
 */
export function sender() {
	/** @type {WeakMap<object, Float32Array>} what each buffer holds on the graphics card: its values as last sent */
	const sent = new WeakMap();
	return (a, n) => {
		const A = /** @type {Float32Array} */ (a.array);
		let was = sent.get(a), from = 0, to = n - 1;
		// a buffer never sent goes whole
		if (!was) sent.set(a, (was = new Float32Array(A.length))), (to = A.length - 1);
		else {
			while (from < n && A[from] === was[from]) from++;
			if (from === n) return false;
			while (to > from && A[to] === was[to]) to--;
		}
		was.set(A.subarray(from, to + 1), from);
		// with what still waits to be sent (a drawing off screen is sent when it is next drawn; three lets go of a
		// buffer's spans as it sends them): one span over both
		const waits = a.updateRanges[0];
		if (waits) {
			const end = Math.max(waits.start + waits.count, to + 1);
			waits.start = Math.min(waits.start, from);
			waits.count = end - waits.start;
		} else a.addUpdateRange(from, to - from + 1);
		a.needsUpdate = true;
		return true;
	};
}
