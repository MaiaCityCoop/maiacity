/*
 * THE FOREST DOME, 80 m — a geodesic dome of 80 m across whose south three quarters are a food forest under glass and
 * whose north quarter holds the rooms, four storeys stepping back from the shell as indoor terraces over the forest.
 *
 *   1. KIT        chance and noise, the painted surfaces (canvas pictures: colour, relief and roughness, a tile in
 *                 metres), the materials, the geometry helpers and the Bag that merges by material, in squares
 *   2. PLAN       the measures every part shares: the shell, the north quarter's levels, façades and rooms, the doors,
 *                 the plants and the things it names
 *   3. SHELL      the geodesic skin: glass in white bioceramic frames to the south, closed panels with triangular
 *                 windows to the north, the doors, the plinth
 *   4. OUTSIDE    a one-storey limestone arcade round the dome's foot (no terraces on it), its walk, the paths out
 *   5. GROUND     inside: the forest floor, the meandering paths, the brook and its pond, the bridges, and where each
 *                 plant of the library stands
 *   6. BUILDING   the north quarter: slabs, curved glass façades, indoor terraces with slatted oak rails, stairs, walls
 *   7. FURNISHING where each thing of the library stands, room by room and on the terraces
 *   8. RECIPE     the build and `module.exports.recipe`
 *
 * North is +z, east +x; 1 unit is 1 m; y 0 is the ground; the middle of the floor at the origin. The plants and the
 * furniture are play's own assets, each named by the hash of its recipe file: the build marks where each stands (a node
 * named `use:<hash>?values`) and the page draws it there; none of them is copied in.
 */
