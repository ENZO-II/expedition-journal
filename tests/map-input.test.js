import test from 'node:test';
import assert from 'node:assert/strict';
import {mountMap} from '../dist/map-view.js';

// Exercise the actual input handlers with a small event surface, independent of browser drivers.
test('right drag pans, left tap places, wheel zooms, and the pen records normalized points',()=>{
 const handlers=new Map(),controls=new Map(['#zoom-in','#zoom-out','#reset-map'].map(id=>[id,{}]));
 globalThis.document={querySelector:id=>controls.get(id)??null,createElementNS:()=>({setAttribute(){},remove(){}})};
 globalThis.ResizeObserver=class{observe(){}disconnect(){}};
 const classes=new Set(),captured=new Set(),picture={tagName:'IMG',complete:true,naturalWidth:1000,naturalHeight:500,addEventListener(){}};
 const stage={clientWidth:600,clientHeight:400,clientLeft:0,clientTop:0,getBoundingClientRect:()=>({left:0,top:0}),focus(){},setPointerCapture:id=>captured.add(id),hasPointerCapture:id=>captured.has(id),releasePointerCapture:id=>captured.delete(id),classList:{add:name=>classes.add(name),remove:name=>classes.delete(name)},addEventListener:(name,handler)=>handlers.set(name,handler)};
 const canvas={style:{},querySelector:s=>s==='.map-image'?picture:{append(){}},querySelectorAll:()=>[],addEventListener(){}};
 const placed=[],strokes=[];let mode='marker';
 const cleanup=mountMap({stage,canvas,key:'input-test',onPlace:p=>placed.push(p),onMarker(){},onArt(){},onStroke:s=>strokes.push(s),isPlacing:()=>false,tool:()=>({mode,color:'#244f87',width:3})});
 const send=(name,x,y,button=0)=>handlers.get(name)({clientX:x,clientY:y,button,pointerId:1,pointerType:'mouse',target:{closest:()=>null},preventDefault(){}});
 const original=canvas.style.transform;
 send('pointerdown',300,200,2);send('pointermove',250,200,2);send('pointerup',250,200,2);
 assert.notEqual(canvas.style.transform,original);assert.equal(placed.length,0);
 send('pointerdown',300,200);send('pointerup',300,200);assert.equal(placed.length,1);assert.ok(placed[0].x>.5&&placed[0].x<.7);
 const zoomWidth=parseFloat(canvas.style.width);let prevented=false;
 handlers.get('wheel')({clientX:300,clientY:200,deltaY:-80,deltaMode:0,preventDefault(){prevented=true;}});
 assert.ok(parseFloat(canvas.style.width)>zoomWidth);assert.equal(prevented,true);
 const beforeLeftDrag=canvas.style.transform;send('pointerdown',300,200);send('pointermove',330,230);send('pointerup',330,230);assert.equal(canvas.style.transform,beforeLeftDrag);assert.equal(placed.length,1);
 mode='ink';send('pointerdown',300,200);send('pointermove',330,230);send('pointerup',330,230);
 assert.equal(strokes.length,1);assert.equal(strokes[0].color,'#244f87');assert.equal(strokes[0].points.length,2);assert.ok(strokes[0].points.flat().every(n=>n>=0&&n<=1));assert.equal(classes.has('inking'),false);
 cleanup();delete globalThis.document;delete globalThis.ResizeObserver;
});
