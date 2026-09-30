import { WorldGen, BIOME_NAMES } from '../js/worldgen.js';
import { buildMesh, PAD, W } from '../js/mesher.js';
import { HEIGHT } from '../js/blocks.js';
const g = new WorldGen(12345);
let t = performance.now();
const chunks = {};
for (let cx=-1;cx<=1;cx++) for (let cz=-1;cz<=1;cz++) chunks[cx+','+cz]=g.generate(cx,cz);
console.log('gen 9 chunks ms', (performance.now()-t).toFixed(1));
const counts={}; for (const v of chunks['0,0']) counts[v]=(counts[v]||0)+1; console.log(counts);
const vol = new Uint8Array(W*W*HEIGHT);
for (let y=0;y<HEIGHT;y++) for (let z=0;z<W;z++) for (let x=0;x<W;x++){
  const wx=x-PAD, wz=z-PAD; const cx=Math.floor(wx/16), cz=Math.floor(wz/16);
  vol[x+z*W+y*W*W]=chunks[cx+','+cz][(wx-cx*16)+((wz-cz*16)<<4)+(y<<8)];
}
t = performance.now();
const m = buildMesh(vol);
console.log('mesh ms', (performance.now()-t).toFixed(1), 'verts', m.solid.pos.length/3, 'water', m.water.pos.length/3);
console.log('spawn', g.findSpawn());
// biome survey
const bc={}; for (let i=0;i<2000;i++){const c=g.column((Math.random()-0.5)*6000,(Math.random()-0.5)*6000); bc[BIOME_NAMES[c.biome]]=(bc[BIOME_NAMES[c.biome]]||0)+1;} console.log(bc);
// city chunk timing
let found=null; for(let i=0;i<500&&!found;i++){const x=Math.round((Math.random()-0.5)*6000),z=Math.round((Math.random()-0.5)*6000); if(g.column(x,z).biome===3) found=[x,z];}
console.log('city at', found);
t=performance.now(); g.generate(Math.floor(found[0]/16),Math.floor(found[1]/16)); console.log('city chunk ms',(performance.now()-t).toFixed(1));
