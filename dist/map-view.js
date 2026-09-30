import{frame,imagePoint,zoomAt,panBy,MIN_ZOOM,MAX_ZOOM}from'./map-camera.js';
const cameras=new Map();
export function mountMap({stage,canvas,key,onPlace,onMarker,isPlacing}){
 if(!canvas)return()=>{};
 const picture=canvas.querySelector('.map-image');
 let camera=cameras.get(key)??{cx:.5,cy:.5,zoom:1};
 let dimensions={width:8615,height:3975},ready=picture.tagName.toLowerCase()==='svg',dead=false;
 let pointers=new Map(),dragged=false,start=null,pinch=null;
 const viewport=()=>({width:stage.clientWidth,height:stage.clientHeight});
 const local=e=>{const r=stage.getBoundingClientRect();return{x:e.clientX-r.left-stage.clientLeft,y:e.clientY-r.top-stage.clientTop};};
 const update=()=>{
  if(dead||!ready||!stage.clientWidth||!stage.clientHeight)return;
  camera=panBy(camera,0,0,viewport(),dimensions);cameras.set(key,camera);
  const f=frame(camera,viewport(),dimensions);
  Object.assign(canvas.style,{width:f.width+'px',height:f.height+'px',transform:`translate(${f.x}px,${f.y}px)`});
  const value=document.querySelector('.zoom-value');if(value)value.textContent=Math.round(camera.zoom*100)+'%';
  document.querySelector('#zoom-in').disabled=camera.zoom>=MAX_ZOOM;
  document.querySelector('#zoom-out').disabled=camera.zoom<=MIN_ZOOM;
 };
 const scale=(value,point)=>{if(!ready)return;camera=zoomAt(camera,value,point??{x:stage.clientWidth/2,y:stage.clientHeight/2},viewport(),dimensions);update();};
 const loaded=()=>{if(picture.naturalWidth){dimensions={width:picture.naturalWidth,height:picture.naturalHeight};ready=true;update();}};
 picture.addEventListener('load',loaded);if(picture.complete)loaded();
 const observer=new ResizeObserver(update);observer.observe(stage);
 document.querySelector('#zoom-in').onclick=()=>scale(camera.zoom*1.25);
 document.querySelector('#zoom-out').onclick=()=>scale(camera.zoom/1.25);
 document.querySelector('#reset-map').onclick=()=>{camera={cx:.5,cy:.5,zoom:1};update();};
 stage.addEventListener('wheel',e=>{e.preventDefault();const delta=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?stage.clientHeight:1);scale(camera.zoom*Math.exp(-Math.max(-160,Math.min(160,delta))*.0025),local(e));},{passive:false});
 const pinchInfo=()=>{const [a,b]=[...pointers.values()];return{mid:{x:(a.x+b.x)/2,y:(a.y+b.y)/2},distance:Math.hypot(a.x-b.x,a.y-b.y)};};
 stage.addEventListener('pointerdown',e=>{
  if(e.button!==0||!ready)return;
  stage.focus({preventScroll:true});pointers.set(e.pointerId,local(e));
  if(pointers.size===1){dragged=false;start={...local(e),marker:e.target.closest('[data-marker]')?.dataset.marker};}
  if(pointers.size===2){pinch=pinchInfo();dragged=true;}
  stage.setPointerCapture(e.pointerId);
 });
 stage.addEventListener('pointermove',e=>{
  if(!pointers.has(e.pointerId))return;
  const old=pointers.get(e.pointerId),point=local(e);pointers.set(e.pointerId,point);
  if(pointers.size===2){const next=pinchInfo();if(pinch&&pinch.distance>0){camera=zoomAt(camera,camera.zoom*next.distance/pinch.distance,pinch.mid,viewport(),dimensions);camera=panBy(camera,next.mid.x-pinch.mid.x,next.mid.y-pinch.mid.y,viewport(),dimensions);update();}pinch=next;return;}
  if(pointers.size!==1)return;
  if(!dragged&&Math.hypot(point.x-start.x,point.y-start.y)>6){dragged=true;camera=panBy(camera,point.x-start.x,point.y-start.y,viewport(),dimensions);}
  else if(dragged)camera=panBy(camera,point.x-old.x,point.y-old.y,viewport(),dimensions);
  if(dragged){stage.classList.add('dragging');update();}
 });
 stage.addEventListener('pointerup',e=>{
  if(!pointers.has(e.pointerId))return;
  const point=local(e),tap=!dragged&&pointers.size===1; pointers.delete(e.pointerId);pinch=null;
  if(stage.hasPointerCapture(e.pointerId))stage.releasePointerCapture(e.pointerId);
  stage.classList.remove('dragging');
  if(tap&&start?.marker){onMarker(start.marker);return;}
  if(tap&&isPlacing()){const p=imagePoint(camera,point,viewport(),dimensions);if(p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1)onPlace(p);}
 });
 stage.addEventListener('pointercancel',e=>{pointers.delete(e.pointerId);dragged=true;pinch=null;stage.classList.remove('dragging');});
 stage.addEventListener('lostpointercapture',e=>{pointers.delete(e.pointerId);pinch=null;stage.classList.remove('dragging');});
 // Mouse/touch actions are handled above. Native keyboard button activation remains available.
 canvas.querySelectorAll('[data-marker]').forEach(b=>b.onclick=e=>{e.stopPropagation();if(e.detail===0)onMarker(b.dataset.marker);});
 stage.addEventListener('keydown',e=>{
  if(e.target!==stage)return;
  const delta={ArrowLeft:[60,0],ArrowRight:[-60,0],ArrowUp:[0,60],ArrowDown:[0,-60]}[e.key];
  if(delta){e.preventDefault();camera=panBy(camera,...delta,viewport(),dimensions);update();}
  if(['+','=','-','0'].includes(e.key)){e.preventDefault();if(e.key==='0'){camera={cx:.5,cy:.5,zoom:1};update();}else scale(camera.zoom*(e.key==='-'?.8:1.25));}
 });
 update();return()=>{dead=true;observer.disconnect();picture.removeEventListener('load',loaded);};
}
