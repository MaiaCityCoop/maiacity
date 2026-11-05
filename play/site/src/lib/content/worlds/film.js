// @ts-nocheck — plain JS, trusted: runs in the page
/*
 * A WORLD UNDER THE FILM CAMERA (play/SPEC.md §4.11) — the Worlds page's world handed to the film camera the way every
 * sandbox is (../sandbox-kit/film.js `connectFilm`, `window.__world`): a shot names it by the world asset's UUID and its
 * version's recipe hash (../game/film/shot.js `world.asset`, `world.recipe`; its film page `/worlds/?film&asset=…&recipe=…`,
 * ../game/film/worlds.js `filmPath`), and every frame of the shot is the world at the shot's moment:
 *
 *   clock        the world's clock is the shot's from the moment it is connected (./view.js `clock`): only advance
 *                moves it, never the page's own frames nor `window.__worldTime`, so whoever calls advance(t) gets the
 *                same world at the same t, whatever else ran between
 *   animate(t)   the world brought to t (./view.js `seek`: its build's own tick, exactly that much time, seeded; back
 *                in time, built afresh and stepped from 0), so a shot renders the same every time; its guests followed
 *                and drawn for the camera where the shot puts it
 *   settle()     on `window.__world`: resolves once the box has answered every step that moment owes (its run is in the
 *                asset box, one step behind the page; a long jump owes many), its guests then followed for the camera;
 *                a plate renderer awaits it before it draws. `settle(ms)` gives up after ms
 *   frames       the world's nodes `frame:<name>` (a seat in a vehicle): a shot's camera rides in one (camera `frame`)
 *   lights       `sun`, `sky` (its light from the lid above) and `lamps` (every light the page lights on the guests:
 *                their lit faces and glows), each scaled by the shot over what the mood gives it
 *   stage(w)     the world built and settled at the shot's clock
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
				view.sky.hemi.intensity = base.hemi;
			}
			lit.k = 1;
			view.sky.place(camera, camera.position);
			// what it plants where its nodes stand now, drawn for the camera where the shot has put it (a cut far away
			// draws what stands there in this frame, not in the next the page happens to run)
			view.drawn();
		},
		lights: {
			sun: (k, color) => {
				view.sky.sun.intensity *= k;
				if (color) view.sky.sun.color.set(color);
			},
			sky: (k) => (view.sky.hemi.intensity *= k),
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
			base.hemi = view.sky.hemi.intensity;
			await view.settle();
		},
		holds: () => view.state.phase === 'shown',
		progress: () => (view.state.phase === 'building' ? { label: 'Building the world in the asset box' } : view.building() > 0 ? { label: 'Building what it stands', done: view.state.kinds, total: view.state.kinds + view.building() } : null),
		extra: {
			world: { asset: o.asset, recipe: o.recipe },
			/** resolves once the world has come to the moment it was brought to (its box has answered every step owed),
			 *  or after `timeout` ms if one is given */
			settle: (timeout) => view.settle(timeout),
			/** whether what it stands is still being built */
			building: () => view.building()
		}
	});
}
