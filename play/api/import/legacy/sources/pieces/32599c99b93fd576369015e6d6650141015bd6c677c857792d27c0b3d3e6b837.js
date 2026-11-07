//#piece 0b4f4f3f6bb65d632dfc6aa2d0108f251f5ecf0d41ac4d471ee8320386872a7a
const H = /* @__PURE__ */ (() => CONTAINER.height)();
/** the wall's thickness (steel, insulation, lining), the floor and the ceiling inside */
const T = .1;
const FLOOR = .15;
const CEIL = 2.7;
/** the inside's edges */
const X0 = -L / 2 + T;
const X1 = L / 2 - T;
const Z0 = -W / 2 + T;
const Z1 = W / 2 - T;
/** how close a walker's middle comes to anything */
const PAD = .22;
//#piece 8b819a535bb321efe7c29cf048b57539e8f532666572c672043feef87e5c8386
