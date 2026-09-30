import test from'node:test';
import assert from'node:assert/strict';
import{frame,zoomAt,panBy,imagePoint}from'../dist/map-camera.js';
const viewport={width:500,height:600},image={width:1200,height:800};
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
test('fit shows all of landscape and portrait maps',()=>{
 for(const image of [{width:1200,height:800},{width:800,height:1600}]){
  const f=frame({cx:.5,cy:.5,zoom:1},viewport,image);
  assert.ok(f.width<=500&&f.height<=600);assert.ok(f.x>=0&&f.y>=0);
 }
});
test('zoom retains the image point under the pointer away from edges',()=>{
 const camera={cx:.5,cy:.5,zoom:3},point={x:190,y:225};
 const before=imagePoint(camera,point,viewport,image),after=imagePoint(zoomAt(camera,4,point,viewport,image),point,viewport,image);
 close(before.x,after.x);close(before.y,after.y);
});
test('drag translates content and keeps marker coordinates consistent',()=>{
 const camera={cx:.5,cy:.5,zoom:3},p={x:220,y:270},a=imagePoint(camera,p,viewport,image);
 const moved=panBy(camera,45,-60,viewport,image),b=imagePoint(moved,{x:p.x+45,y:p.y-60},viewport,image);
 close(a.x,b.x);close(a.y,b.y);
});
test('large drags and zoom limits cannot lose the map',()=>{
 const c=panBy({cx:.5,cy:.5,zoom:30},99999,-99999,viewport,image),f=frame(c,viewport,image);
 assert.equal(c.zoom,8);assert.equal(f.x,0);close(f.y+f.height,600);
 const fit=zoomAt(c,.01,{x:0,y:0},viewport,image);assert.equal(fit.zoom,1);close(fit.cx,.5);close(fit.cy,.5);
});
test('resizing preserves normalised map centre within bounds',()=>{
 const camera={cx:.6,cy:.55,zoom:5};
 for(const viewport of [{width:500,height:600},{width:320,height:740}]){
  const p=imagePoint(camera,{x:viewport.width/2,y:viewport.height/2},viewport,image);close(p.x,camera.cx);close(p.y,camera.cy);
 }
});
