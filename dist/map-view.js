import{frame,imagePoint,zoomAt,panBy,MIN_ZOOM,MAX_ZOOM}from'./map-camera.js';
import{gestureAction}from'./map-gestures.js';
import{strokePath}from'./media-domain.js';
const cameras=new Map();
export function mountMap({stage,canvas,key,onPlace,onMarker,onArt,onStroke,onBackground,onCameraChange,isPlacing,tool}){
 if(!canvas)return()=>{};
 const picture=canvas.querySelector('.map-image'),controller=new AbortController(),options={signal:controller.signal};
 let camera=cameras.get(key)??{cx:.5,cy:.5,zoom:1},initialCover=cameras.get(key)?.autoCover??!cameras.has(key);
 let dimensions={width:8615,height:3975},ready=picture.tagName.toLowerCase()==='svg',dead=false;
 let pointers=new Map(),dragged=false,start=null,pinch=null,stroke=null;
 const viewport=()=>({width:stage.clientWidth,height:stage.clientHeight});
 const local=e=>{const r=stage.getBoundingClientRect();return{x:e.clientX-r.left-stage.clientLeft,y:e.clientY-r.top-stage.clientTop};};
 const imageLocal=e=>imagePoint(camera,local(e),viewport(),dimensions);
 const bounded=p=>[Math.max(0,Math.min(1,p.x)),Math.max(0,Math.min(1,p.y))];
 const update=()=>{
  if(dead||!ready||!stage.clientWidth||!stage.clientHeight)return;
  if(initialCover){const v=viewport(),sx=v.width/dimensions.width,sy=v.height/dimensions.height;camera.zoom=Math.min(MAX_ZOOM,Math.max(sx,sy)/Math.min(sx,sy));}
  camera=panBy(camera,0,0,viewport(),dimensions);cameras.set(key,{...camera,autoCover:initialCover});
  const f=frame(camera,viewport(),dimensions);Object.assign(canvas.style,{width:f.width+'px',height:f.height+'px',transform:`translate(${f.x}px,${f.y}px)`});
  const value=document.querySelector('.zoom-value');if(value)value.textContent=Math.round(camera.zoom*100)+'%';
  document.querySelector('#zoom-in').disabled=camera.zoom>=MAX_ZOOM;document.querySelector('#zoom-out').disabled=camera.zoom<=MIN_ZOOM;
  onCameraChange?.({frame:f,viewport:viewport()});
 };
 const scale=(value,point)=>{if(!ready)return;initialCover=false;camera=zoomAt(camera,value,point??{x:stage.clientWidth/2,y:stage.clientHeight/2},viewport(),dimensions);update();};
 const loaded=()=>{if(picture.naturalWidth){dimensions={width:picture.naturalWidth,height:picture.naturalHeight};ready=true;update();}};
 picture.addEventListener('load',loaded,options);if(picture.complete)loaded();
 const observer=new ResizeObserver(update);observer.observe(stage);
 document.querySelector('#zoom-in').onclick=()=>scale(camera.zoom*1.25);document.querySelector('#zoom-out').onclick=()=>scale(camera.zoom/1.25);
 document.querySelector('#reset-map').onclick=()=>{initialCover=false;camera={cx:.5,cy:.5,zoom:1};update();};
 stage.addEventListener('contextmenu',e=>e.preventDefault(),options);
 stage.addEventListener('wheel',e=>{e.preventDefault();const delta=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?stage.clientHeight:1);scale(camera.zoom*Math.exp(-Math.max(-160,Math.min(160,delta))*.0025),local(e));},{...options,passive:false});
 const pinchInfo=()=>{const[a,b]=[...pointers.values()];return{mid:{x:(a.x+b.x)/2,y:(a.y+b.y)/2},distance:Math.hypot(a.x-b.x,a.y-b.y)};};
 const cancelStroke=()=>{stroke?.node.remove();stroke=null;stage.classList.remove('inking');};
 stage.addEventListener('pointerdown',e=>{
  if(!ready)return;
  const settings=tool(),action=gestureAction({button:e.button,pointerType:e.pointerType,mode:settings.mode,marker:!!e.target.closest('[data-marker]'),art:!!e.target.closest('[data-art]'),placing:isPlacing()});
  if(action==='ignore')return;e.preventDefault();stage.focus({preventScroll:true});initialCover=false;pointers.set(e.pointerId,local(e));
  if(pointers.size===1){dragged=false;start={...local(e),action,marker:e.target.closest('[data-marker]')?.dataset.marker,art:e.target.closest('[data-art]')?.dataset.art};
   if(action==='ink'){
    const node=document.createElementNS('http://www.w3.org/2000/svg','path');for(const[k,v]of Object.entries({fill:'none',stroke:settings.color,'stroke-width':settings.width,'vector-effect':'non-scaling-stroke','stroke-linecap':'round','stroke-linejoin':'round'}))node.setAttribute(k,v);canvas.querySelector('.map-ink').append(node);
    stroke={node,points:[bounded(imageLocal(e))],color:settings.color,width:settings.width};stage.classList.add('inking');
   }
  }
  if(pointers.size===2){cancelStroke();pinch=pinchInfo();dragged=true;}stage.setPointerCapture(e.pointerId);
 },options);
 stage.addEventListener('pointermove',e=>{
  if(!pointers.has(e.pointerId))return;const old=pointers.get(e.pointerId),point=local(e);pointers.set(e.pointerId,point);
  if(pointers.size===2){const next=pinchInfo();if(pinch?.distance>0){camera=zoomAt(camera,camera.zoom*next.distance/pinch.distance,pinch.mid,viewport(),dimensions);camera=panBy(camera,next.mid.x-pinch.mid.x,next.mid.y-pinch.mid.y,viewport(),dimensions);update();}pinch=next;return;}
  if(pointers.size!==1)return;
  if(stroke){const p=bounded(imageLocal(e)),last=stroke.points.at(-1),f=frame(camera,viewport(),dimensions);if(Math.hypot((p[0]-last[0])*f.width,(p[1]-last[1])*f.height)>1.5&&stroke.points.length<2000){stroke.points.push(p);stroke.node.setAttribute('d',strokePath(stroke.points));}return;}
  if(!dragged&&Math.hypot(point.x-start.x,point.y-start.y)>6){dragged=true;if(start.action==='pan')camera=panBy(camera,point.x-start.x,point.y-start.y,viewport(),dimensions);}
  else if(dragged&&start.action==='pan')camera=panBy(camera,point.x-old.x,point.y-old.y,viewport(),dimensions);
  if(dragged&&start.action==='pan'){stage.classList.add('dragging');update();}
 },options);
 stage.addEventListener('pointerup',e=>{
  if(!pointers.has(e.pointerId))return;const point=local(e),tap=!dragged&&pointers.size===1,action=start?.action;pointers.delete(e.pointerId);pinch=null;
  if(stage.hasPointerCapture(e.pointerId))stage.releasePointerCapture(e.pointerId);stage.classList.remove('dragging');
  if(stroke){const result={points:stroke.points,color:stroke.color,width:stroke.width};cancelStroke();if(result.points.length>1)onStroke(result);return;}
  if(!tap)return;if(action==='marker'){onMarker(start.marker);return;}if(action==='art'){onArt(start.art);return;}
  if(action==='place'){const p=imagePoint(camera,point,viewport(),dimensions);if(p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1)onPlace(p);}else onBackground?.();
 },options);
 stage.addEventListener('pointercancel',e=>{pointers.delete(e.pointerId);dragged=true;pinch=null;cancelStroke();stage.classList.remove('dragging');},options);
 stage.addEventListener('lostpointercapture',e=>{pointers.delete(e.pointerId);pinch=null;stage.classList.remove('dragging');},options);
 canvas.querySelectorAll('[data-marker]').forEach(b=>b.onclick=e=>{e.stopPropagation();if(e.detail===0)onMarker(b.dataset.marker);});
 canvas.querySelectorAll('[data-art]').forEach(b=>b.onclick=e=>{e.stopPropagation();if(e.detail===0)onArt(b.dataset.art);});
 stage.addEventListener('keydown',e=>{
  if(e.target!==stage)return;const delta={ArrowLeft:[60,0],ArrowRight:[-60,0],ArrowUp:[0,60],ArrowDown:[0,-60]}[e.key];
  if(delta){initialCover=false;e.preventDefault();camera=panBy(camera,...delta,viewport(),dimensions);update();}
  if(['+','=','-','0'].includes(e.key)){initialCover=false;e.preventDefault();if(e.key==='0'){camera={cx:.5,cy:.5,zoom:1};update();}else scale(camera.zoom*(e.key==='-'?.8:1.25));}
 },options);
 update();const cleanup=()=>{dead=true;observer.disconnect();controller.abort();cancelStroke();};
 cleanup.reveal=point=>{
  if(!ready)return;const v=viewport(),f=frame(camera,v,dimensions),x=f.x+point.x*f.width,y=f.y+point.y*f.height,space=Math.min(270,v.width-54)+36;let targetX=x,targetY=y;
  if(x<24||x>v.width-24||Math.max(x,v.width-x)<space)targetX=x<v.width/2?Math.max(30,v.width-space):Math.min(v.width-30,space);
  if(y<80||y>v.height-60)targetY=v.height/2;if(targetX!==x||targetY!==y){camera=panBy(camera,targetX-x,targetY-y,v,dimensions);update();}
 };
 canvas.addEventListener('focusin',e=>{const pin=e.target.closest('[data-marker]');if(pin)cleanup.reveal({x:parseFloat(pin.style.left)/100,y:parseFloat(pin.style.top)/100});},options);
 return cleanup;
}
