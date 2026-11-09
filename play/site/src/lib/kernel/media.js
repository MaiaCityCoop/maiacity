// @ts-nocheck — plain JS
/*
 * Sound and video start only once the browser allows it: until a person has touched the page, `play()` and an audio
 * context's `resume()` reject with NotAllowedError (the autoplay policy), and a newer `play()`, `pause()` or source
 * rejects the `play()` before with AbortError. Neither is a failure, and the page tries again on the next touch or
 * frame; anything else is, and is said.
 */

const allowed = (what) => (e) => {
	if (e?.name !== 'NotAllowedError' && e?.name !== 'AbortError') console.warn(`${what} could not start: ${e?.message ?? e}`);
	return false;
};

/** plays `el` if the browser lets it: true once it plays @param {HTMLMediaElement} el @returns {Promise<boolean>} */
export const playIfAllowed = (el) => el.play().then(() => true, allowed('a sound or video'));

/** resumes `ctx` if the browser lets it: true once it runs @param {AudioContext} ctx @returns {Promise<boolean>} */
export const resumeIfAllowed = (ctx) => ctx.resume().then(() => ctx.state === 'running', allowed("the page's sound"));
