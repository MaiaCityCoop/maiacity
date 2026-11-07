//#piece 9cdd83f192deb45a8343feb449b6888a5c058dc15b91b9cfc4ba9940379445c1
//#piece f1cdfe18fe3b1447e7f15d9cbb1675b418512d17a2f94711b382266289929b97
}
const C$1 = /* @__PURE__ */ (() => new three.Color())();
const toColor = (c) => c instanceof three.Color ? c : C$1.set(c);
/** a colour between two, as a THREE.Color (a new one) */
const mix = (a, b, t) => new three.Color(a).lerp(new three.Color(b), clamp(t));
//#piece eaadf9c7edfc3bd9afb488d3985a19adc366c2891732a76145db6a14f213c918
//#piece b46a596c5740c3a43e021cd0ab463dbb54f46428e9a443cf3bc91414a38b005f
