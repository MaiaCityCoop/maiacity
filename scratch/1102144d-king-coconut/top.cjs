const Module=require('module');process.env.NODE_PATH='/home/user/maiacity/play/site/node_modules';Module._initPaths();
const THREE=require('three');const m=require(require('path').resolve(process.argv[2]));const r=m.recipe('king-coconut',3);
const g=r.build(+process.argv[3],'maia',1,0);g.updateMatrixWorld(true);
g.traverse(o=>{if(!o.geometry)return;const a=o.geometry.attributes.position;let best=-1e9,bi=0;const p=new THREE.Vector3();for(let i=0;i<a.count;i++){p.fromBufferAttribute(a,i);if(p.y>best){best=p.y;bi=i}}p.fromBufferAttribute(a,bi);console.log(o.material?.name||o.name, o.material?.type, p.toArray().map(x=>x.toFixed(2)).join(','))});
