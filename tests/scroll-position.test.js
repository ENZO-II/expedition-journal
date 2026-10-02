import test from'node:test';
import assert from'node:assert/strict';
import{placeScroll}from'../dist/scroll-position.js';
test('scroll uses the free side of the selected marker',()=>{
 assert.equal(placeScroll({x:55,y:260},{width:520,height:660}).side,'right');
 assert.equal(placeScroll({x:480,y:260},{width:520,height:660}).side,'left');
});
test('scroll stays inside the map leaf at tablet sizes and near corners',()=>{
 for(const viewport of [{width:315,height:830},{width:492,height:550},{width:380,height:630}])for(const anchor of [{x:10,y:10},{x:viewport.width-10,y:viewport.height-10},{x:viewport.width/2,y:viewport.height/2}]){
  const p=placeScroll(anchor,viewport);assert.ok(p.x>=0&&p.y>=0);assert.ok(p.x+p.width<=viewport.width);assert.ok(p.y+p.height<=viewport.height-140);assert.ok(p.width>=240||viewport.width<315);
 }
});
test('a scroll is hidden when its marker is outside the visible map',()=>{
 assert.equal(placeScroll({x:-1,y:300},{width:500,height:650}).visible,false);
 assert.equal(placeScroll({x:250,y:651},{width:500,height:650}).visible,false);
});
