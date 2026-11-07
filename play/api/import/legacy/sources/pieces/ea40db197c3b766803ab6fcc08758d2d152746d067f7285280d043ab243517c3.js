* Add a Power Cube's parts to a machine's kit, its foot's middle at `at` (actor metres), its front towards +z.
* Its moving parts ride the joints named in `joints` (flywheel, coupling, fan: bones the caller makes at the points
* `powerCubeJoints` gives); every other part rides `base`. With `unit`, the cube goes into the machine's build already
* built, all its parts at once.
* @param {ReturnType<typeof machineKit>} kit
* Another cube on the same frame gives its own `insides` in place of the hydraulics, its own length (`len`, mm), and
* leaves out the engine or the fuel and controls it has none of.
* @param {{ at: V3, base: string, joints: { flywheel: string, coupling: string, fan: string }, assembly: (g: Group) => string, step: (g: Group) => number, prefix?: string, unit?: string, len?: number, engine?: boolean, controls?: boolean, insides?: Insides }} o
