// The levelling as it was first brainstormed (Samuel 2026-11-04): how a village grows from one founder in a tent to
// 1,597 villagers with three master domes and an enhanced geothermal plant. Each level is reached at a Fibonacci count
// of villagers and unlocks what the village builds next, its cost in euros (rough estimates, to be researched). Every
// new villager brings €12,500 and 50,000 hearts; at each level an investor adds a multiple of what the level's new
// villagers brought in euros, the multiple growing with the village's proven traction (2× in the camp to 8× at the
// end), so a full village raises about €157M. A mind costs 10 hearts more at every level (10 at level 1), or that in
// euros at 4 hearts a euro, so the earliest villagers and investors get the most minds for their money.
export const levelling = () => ({
  schema: "levels/1",
  label: "Levelling",
  note: "How a village grows: a level at every Fibonacci count of villagers, each unlocking what the village builds next. Every villager brings €12,500 and 50,000 hearts; an investor adds a multiple of the new villagers' euros at each level. Costs are first estimates.",
  villager: { euros: 12500, hearts: 50000 },
  minds: { heartsPerMind: 10, step: 10, heartsPerEuro: 4 },
  levels: [
    { id: "l1", villagers: 1, phase: "Camp", investor: 2, unlocks: [{ label: "Tent", cost: 2000, kind: "tent" }, { label: "Old pickup", cost: 13000, kind: "vehicle" }] },
    { id: "l2", villagers: 2, phase: "Camp", investor: 2, unlocks: [{ label: "Kitchen container: shared cooking, cold store", cost: 40000, kind: "container" }] },
    { id: "l3", villagers: 3, phase: "Camp", investor: 3, unlocks: [{ label: "Sanitary container: showers, toilets, water filter", cost: 50000, kind: "container" }] },
    { id: "l4", villagers: 5, phase: "Camp", investor: 3, unlocks: [{ label: "Workshop container: tools to build it ourselves", cost: 60000, kind: "container" }] },
    { id: "l5", villagers: 8, phase: "Camp", investor: 3, unlocks: [{ label: "Tech container: 50 kWp solar, battery, Starlink, server", cost: 150000, kind: "container" }] },
    { id: "l6", villagers: 13, phase: "Hamlet", investor: 4, unlocks: [{ label: "4 glamp domes (16 m)", cost: 300000, kind: "dome" }] },
    { id: "l7", villagers: 21, phase: "Hamlet", investor: 4, unlocks: [{ label: "4 more glamp domes (16 m)", cost: 200000, kind: "dome" }, { label: "Well and water treatment", cost: 180000, kind: "water" }, { label: "Electric utility vehicles", cost: 120000, kind: "vehicle" }] },
    { id: "l8", villagers: 34, phase: "Hamlet", investor: 4, unlocks: [{ label: "First home dome (40 m): the shared house", cost: 800000, kind: "dome" }] },
    { id: "l9", villagers: 55, phase: "Village", investor: 5, unlocks: [{ label: "1 MWp solar field, battery storage, microgrid", cost: 1000000, kind: "energy" }, { label: "2nd home dome (40 m)", cost: 600000, kind: "dome" }] },
    { id: "l10", villagers: 89, phase: "Village", investor: 5, unlocks: [{ label: "Fab lab hall: CNC, 3D print, wood and metal", cost: 1300000, kind: "workshop" }, { label: "3rd and 4th home domes (40 m)", cost: 1200000, kind: "dome" }] },
    { id: "l11", villagers: 144, phase: "Village", investor: 5, unlocks: [{ label: "Large dome (70 m): food forest, aquaponics, market", cost: 4000000, kind: "dome" }] },
    { id: "l12", villagers: 233, phase: "Town", investor: 6, unlocks: [{ label: "Biogas plant, wastewater and nutrient recycling", cost: 3000000, kind: "water" }, { label: "2nd large dome (70 m)", cost: 5000000, kind: "dome" }] },
    { id: "l13", villagers: 377, phase: "Town", investor: 6, unlocks: [{ label: "Grand dome (100 m): town hall, school, clinic", cost: 12000000, kind: "dome" }] },
    { id: "l14", villagers: 610, phase: "Town", investor: 6, unlocks: [{ label: "Master dome (136 m)", cost: 14000000, kind: "dome" }, { label: "2nd grand dome (100 m)", cost: 6000000, kind: "dome" }] },
    { id: "l15", villagers: 987, phase: "Industry and energy", investor: 7, unlocks: [{ label: "Dome and glass factory: our own glass, struts and solar modules", cost: 22000000, kind: "factory" }, { label: "2nd master dome (136 m)", cost: 16000000, kind: "dome" }] },
    { id: "l16", villagers: 1597, phase: "Industry and energy", investor: 8, unlocks: [{ label: "Enhanced geothermal plant: ~5 MW electric, district heat for the domes and greenhouses", cost: 50000000, kind: "energy" }, { label: "3rd master dome (136 m)", cost: 18000000, kind: "dome" }] },
  ],
});
