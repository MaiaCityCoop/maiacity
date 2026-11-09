// @ts-nocheck — plain JS, trusted: runs in the page
/*
 * A WORLD UNDER THE FILM CAMERA (play/SPEC.md §4.11) — the Worlds page's world handed to the film camera as every
 * sandbox is (../sandbox-kit/film.js): a shot names it by the world asset's UUID and its recipe hash
 * (../game/film/worlds.js `filmPath`). Its clock is the shot's from connection on (./view.js `clock`: only advance moves
 * it), `animate(t)` seeks the build's own tick to t (back in time: rebuilt from 0), and `settle()` resolves once the box
 * has answered every step t owes (a plate renderer awaits it; `settle(ms)` gives up). `frame:<name>` nodes are seats a
 * camera rides in; lights `sun`, `sky`, `lamps` are scaled over the mood's.
 */
import { connectFilm, createCameraHold } from '../sandbox-kit/film.js';

/**
 * @param {ReturnType<typeof import('./view.js').createWorldView>} view a world view with its world shown (or showing)
 * @param {{ asset: string, recipe: string, shown: Promise<unknown> }} o the world as the shot names it, and its showing
 */
export function connectWorldFilm(view, o) {
	const { renderer, scene, camera } = view;
	const hold = createCameraHold(camera);
	view.hold(true);
	view.clock(true);
	const base = { sun: null, hemi: null };
	const lit = { k: 1 };
	return connectFilm({
		sandbox: 'worlds',
		renderer,
		scene,
		camera,
		hold,
		place: () => {},
		animate: (t) => view.seek(t),
		advance: () => {
			// the lights as the mood has them, then each scaled by the shot (connectFilm's `lights` after this)
			if (base.sun !== null) {
				view.sky.sun.intensity = base.sun;
				scene.environmentIntensity = base.hemi;
			}
			lit.k = 1;
			// what it plants where its nodes stand now, drawn for the camera where the shot has put it (a cut far away
			// draws what stands there in this frame, not in the next the page happens to run)
			view.drawn();
		},
		lights: {
			sun: (k, color) => {
				view.sky.sun.intensity *= k;
				if (color) view.sky.sun.color.set(color);
			},
			lamps: (k) => {
				lit.k *= k;
				view.lights.group.visible = lit.k > 0.01;
			}
		},
		get frames() {
			return view.frames();
		},
		stage: async () => {
			await o.shown;
			// the lights as the world's mood set them: what a shot scales from
			base.sun = view.sky.sun.intensity;
			base.hemi = scene.environmentIntensity;
			await view.settle();
		},
		holds: () => view.state.phase === 'shown',
		progress: () => (view.state.phase === 'building' ? { label: 'Building the world in the asset box' } : view.building() > 0 ? { label: 'Building what it stands', done: view.state.kinds, total: view.state.kinds + view.building() } : null),
		extra: {
			world: { asset: o.asset, recipe: o.recipe },
			/** resolves once the world has come to the moment it was brought to (its box has answered every step owed),
			 *  or once `stall` ms (default 60 s) went by with no step answered (the box gone or stuck) */
			settle: (stall) => view.settle(stall),
			/** whether what it stands is still being built */
			building: () => view.building()
		}
	});
}
