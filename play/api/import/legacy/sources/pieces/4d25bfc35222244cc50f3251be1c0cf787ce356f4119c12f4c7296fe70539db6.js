//#piece 2a6ad0386ff69cdbb548c456e3f68c48286274961d0c609bace6b370ea05f5de
//#region src/lib/plants/wald-lowtrees.js
//#piece a82999158b30fb3a0ed82921acc6a52ffefd907f320d529c20896aaa58977963
/** a colour by its hex, made once (a tube or sheet painted one colour asks for it at every vertex) */
const COLOURS = /* @__PURE__ */ (() => /* @__PURE__ */ new Map())();
const col = (hex) => COLOURS.get(hex) ?? COLOURS.set(hex, new three.Color(hex)).get(hex);
const UP = /* @__PURE__ */ (() => v3(0, 1, 0))();
