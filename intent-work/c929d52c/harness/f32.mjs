const f=Math.fround;
// main's first-octave coordinate across neighbouring pixels, in float32
for (const hour of [0.5,6,12,18,23]) {
  const drift=f(hour*60); const seen=new Set();
  for (let i=0;i<200;i++){ const x=f(0.5+i*0.0007); // d.x/(0.55h), ~one pixel apart
    let q=f(f(f(x*f(0.0002))+drift)*1000); const per=[];
    for(let o=0;o<4;o++){ per.push(q-Math.floor(q)); q=f(f(q*2)+f(drift*300)); }
    seen.add(per.map(v=>v.toFixed(4)).join(' ')); }
  console.log('hour',hour,'distinct cell fractions over 200 pixels:',seen.size, 'true span of q over them:',(200*0.0007*0.2).toFixed(3),'cells');
}
