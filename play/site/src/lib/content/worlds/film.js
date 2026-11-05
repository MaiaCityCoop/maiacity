// @ts-nocheck — plain JS, trusted: runs in the page
/*
 * A WORLD UNDER THE FILM CAMERA (play/SPEC.md §4.11) — the Worlds page's world handed to the film camera the way every
 * sandbox is (../sandbox-kit/film.js `connectFilm`, `window.__world`): a shot names it by the world asset's UUID and its
 * version's recipe hash (../game/film/shot.js `world.asset`, `world.recipe`; its film page `/worlds/?film&asset=…&recipe=…`,
 * ../game/film/worlds.js `filmPath`), and every frame of the shot is the world at the shot's moment:
 *
 *   animate(t)   the world brought to t (./view.js `seek`: its build's own tick, exactly that much time, seeded; back
 *                in time, built afresh and stepped from 0), so a shot renders the same every time
 *   settle()     on `window.__world`: resolves once the box has answered for that moment (its run is in the asset box,
 *                one step behind the page); a plate renderer awaits it before it draws
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
			/** resolves once the world has come to the moment it was brought to (its box has answered) */
			settle: () => view.settle(),
			/** whether what it stands is still being built */
			building: () => view.building()
		}
	});
}
