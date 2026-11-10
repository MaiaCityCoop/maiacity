/**
 * THE FILM RENDERER — a world's renderer as the film camera holds it (studio world shots, the Mac's plates, the shoot
 * CLI): it draws nothing itself (the film draws the canvas, when asked), runs on the shot's clock, and keeps the shot's
 * fixed size and resolution. The film's darkroom (shutter, meter, 10-bit ACEScct encode in GLSL, no caller) was deleted
 * by intent 602a8849; a later film intent brings what it needs back in TSL. The contract a world hands over
 * (`window.__world`) is $content/sandbox-kit/film.js `connectFilm`; its shots ../game/film/shot.js and reel.js.
 */
const win = () => /** @type {{ __filmDraw?: boolean, __filmPlays?: boolean, __worldTime?: number, __film?: { virtual?: boolean }, __world?: unknown }} */ (/** @type {unknown} */ (window));
/** True while the film draws the canvas itself: the world must not spend a frame drawing for nobody. */
export const filmDraws = () => !!win().__filmDraw;
/** True while a timeline plays through the film: the world keeps its own work short and never hurries a build (a dome built in 70 ms slices after a cut stuttered every frame). */
export const filmPlays = () => !!win().__filmPlays;
/** The world's clock in seconds while a film sets it (the shot's clock), else undefined: run animations on the world's own. */
export const worldTime = () => win().__worldTime;
/** True while a film holds the page's clock or draws: keep the resolution it asked for. */
export const filmHoldsSize = () => !!win().__film?.virtual || !!win().__filmDraw;
