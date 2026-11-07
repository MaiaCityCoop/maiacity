const DAYS=[0,120,240,540,1100,2000,2100,2250,2380,2480];
const D=g=>{g=Math.max(0,Math.min(9,g));const i=Math.min(8,Math.floor(g));return DAYS[i]+(DAYS[i+1]-DAYS[i])*(g-i)};
const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x)),lerp=(a,b,t)=>a+(b-a)*t,smooth=x=>{const t=clamp(x);return t*t*(3-2*t)};
const span=(g,f,t)=>smooth((g-f)/(t-f));
function table(g,rows){if(g<=rows[0][0])return rows[0][1];for(let i=1;i<rows.length;i++){const[g1,v1]=rows[i];if(g<=g1){const[g0,v0]=rows[i-1];return lerp(v0,v1,smooth((g-g0)/(g1-g0)))}}return rows[rows.length-1][1]}
const r3=x=>Math.round(x*1000)/1000;
function conv(name,f,knots){const gs=[...new Set([...knots,...[0,1,2,3,4,5,6,7,8,9].filter(s=>s>=knots[0]&&s<=knots[knots.length-1])])].sort((a,b)=>a-b);
 console.log(name, JSON.stringify(gs.map(g=>[Math.round(D(g)),r3(f(g))])));}
conv('rot',g=>span(g,3.2,4.4),[3.2,4.4]);
conv('roots',g=>table(g,[[.4,0],[1,4],[2,9],[3,16],[5,34],[7,48],[9,56]]),[.4,1,2,3,5,7,9]);
conv('spread',g=>span(g,4,7),[4,7]);
conv('H',g=>table(g,[[3.8,0],[4.4,.12],[5,1],[6,1.3],[7,1.6],[8,1.9],[9,2.2]]),[3.8,4.4,5,6,7,8,9]);
conv('bole',g=>span(g,1.8,6),[1.8,6]);
conv('spike',g=>span(g,.25,1.4),[.25,1.4]);
conv('made',g=>table(g,[[1,0],[1.6,1],[2,2],[3,6],[4,13],[5,24],[6,36],[7,48],[8,60],[9,72]]),[1,1.6,2,3,4,5,6,7,8,9]);
conv('holds',g=>table(g,[[1,0],[1.6,1],[2,2],[3,5],[4,10],[5,18],[6,24],[7,28],[9,30]]),[1,1.6,2,3,4,5,6,7,9]);
conv('full',g=>table(g,[[1,.35],[2,.6],[3,1],[4,2.1],[5,3.6],[6,4.7],[9,5.4]]),[1,2,3,4,5,6,9]);
console.log('D', [1.6,2.2,3.1,3,5].map(D));
// roots born
console.log('rootBorn', [0,1,2,3].map(i=>Math.round(D(.4+i*.12))), [4,10,20,30,40,50,56].map(i=>[i,Math.round(D(1.4+(i-4)*.13))]));
let best=[1e9];
for(let U=80;U<=160;U+=1)for(let O=1800;O<=2050;O+=2)for(let S=20;S<=60;S+=1){let e=0;for(let b=0;b<7;b++)for(let s=5;s<=9;s++){const pv=s-(4.85+b*.32);if(pv<-.3)continue;const pn=(D(s)-(O+b*S))/U;e+=(pv-pn)**2}if(e<best[0])best=[e,U,O,S]}
console.log('bunchfit',best);
const [e,U,O,S]=best;for(let s=5;s<=9;s++)console.log(s,[0,1,2,3,4,5,6].map(b=>[(s-(4.85+b*.32)).toFixed(2),((D(s)-(O+b*S))/U).toFixed(2)].join('/')).join(' '));
console.log('rootgrow',[48,91,168,294,809,1802,2112,2299,2396].map(bd=>{let lo=0,hi=9;for(let i=0;i<40;i++){const m=(lo+hi)/2;if(D(m)<bd)lo=m;else hi=m}const b=lo;return [bd,Math.round(D(b+2.4)-bd),Math.round(D(b+.6)-bd),Math.round(D(b+3.1)-bd)]}));
