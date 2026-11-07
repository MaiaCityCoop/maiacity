const C = /* @__PURE__ */ (() => new three.Color())();
const toColor = (c) => c instanceof three.Color ? c : C.set(c);
/** a colour between two, as a THREE.Color (a new one) */
const mix = (a, b, t) => new three.Color(a).lerp(new three.Color(b), clamp(t));
//#piece eaadf9c7edfc3bd9afb488d3985a19adc366c2891732a76145db6a14f213c918
