import{cropFrame}from'./crop-geometry.js?v=20261002-9';

// All image processing stays in the browser. Nothing is uploaded to a server.
export async function mountAvatarCrop(host,file,{onSave,onCancel,onError}){
 if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>12*1024*1024)throw new Error('请选择 12 MB 以内的 PNG、JPG 或 WebP 图片');
 const url=URL.createObjectURL(file),image=new Image();
 try{image.src=url;await image.decode();if(image.naturalWidth*image.naturalHeight>40000000)throw new Error('图片过大，请使用 4000 万像素以内的图片');}catch(e){URL.revokeObjectURL(url);throw new Error(e.message==='图片过大，请使用 4000 万像素以内的图片'?e.message:'无法读取这张头像图片');}
 if(!host.isConnected){URL.revokeObjectURL(url);return()=>{};}
 host.innerHTML='<p class="crop-help" id="crop-help">拖动图片调整位置，滑动下方滑杆缩放。圆框内的部分会成为头像。</p><div class="crop-stage" role="img" aria-label="圆形头像裁剪预览" aria-describedby="crop-help" tabindex="0"><canvas width="560" height="560"></canvas><span class="crop-mask" aria-hidden="true"></span></div><label class="crop-zoom">缩放<input type="range" min="1" max="4" step="0.01" value="1" aria-label="头像缩放"></label><p class="crop-keyboard">也可用方向键移动，＋ / − 缩放。</p><div class="dialog-actions"><button class="button" id="crop-reset">重置位置</button><button class="text-button" id="crop-cancel">取消</button><button class="button primary" id="crop-save">使用这个头像</button></div>';
 const stage=host.querySelector('.crop-stage'),canvas=host.querySelector('canvas'),ctx=canvas.getContext('2d'),slider=host.querySelector('input');
 const size=280;let zoom=1,x=0,y=0,dead=false;const pointers=new Map();let pinch=null;
 const draw=()=>{const f=cropFrame(image.naturalWidth,image.naturalHeight,size,zoom,x,y);x=f.x;y=f.y;ctx.setTransform(2,0,0,2,0,0);ctx.clearRect(0,0,size,size);ctx.drawImage(image,f.left,f.top,f.width,f.height);slider.value=String(zoom);};
 const scale=value=>{const next=Math.max(1,Math.min(4,value)),ratio=next/zoom;x*=ratio;y*=ratio;zoom=next;draw();};
 const point=e=>{const r=stage.getBoundingClientRect();return{x:(e.clientX-r.left)*size/r.width,y:(e.clientY-r.top)*size/r.height};};
 stage.onpointerdown=e=>{if(e.button!==0)return;e.preventDefault();stage.focus({preventScroll:true});pointers.set(e.pointerId,point(e));stage.setPointerCapture(e.pointerId);if(pointers.size===2){const [a,b]=[...pointers.values()];pinch=Math.hypot(a.x-b.x,a.y-b.y);}};
 stage.onpointermove=e=>{if(!pointers.has(e.pointerId))return;const old=pointers.get(e.pointerId),now=point(e);pointers.set(e.pointerId,now);if(pointers.size===2){const [a,b]=[...pointers.values()],distance=Math.hypot(a.x-b.x,a.y-b.y);if(pinch>0)scale(zoom*distance/pinch);pinch=distance;}else{x+=now.x-old.x;y+=now.y-old.y;draw();}};
 const release=e=>{pointers.delete(e.pointerId);pinch=null;if(stage.hasPointerCapture(e.pointerId))stage.releasePointerCapture(e.pointerId);};
 stage.onpointerup=release;stage.onpointercancel=release;stage.onlostpointercapture=e=>{pointers.delete(e.pointerId);pinch=null;};
 stage.onkeydown=e=>{const moves={ArrowLeft:[-8,0],ArrowRight:[8,0],ArrowUp:[0,-8],ArrowDown:[0,8]};if(moves[e.key]){e.preventDefault();x+=moves[e.key][0];y+=moves[e.key][1];draw();}else if(['+','=','-'].includes(e.key)){e.preventDefault();scale(zoom+(e.key==='-'?-.1:.1));}};
 stage.onwheel=e=>{e.preventDefault();scale(zoom*Math.exp(-Math.max(-100,Math.min(100,e.deltaY))*.002));};
 slider.oninput=()=>scale(Number(slider.value));
 host.querySelector('#crop-reset').onclick=()=>{zoom=1;x=0;y=0;draw();};
 host.querySelector('#crop-cancel').onclick=onCancel;
 host.querySelector('#crop-save').onclick=()=>{if(dead)return;try{const out=document.createElement('canvas');out.width=out.height=256;const c=out.getContext('2d');c.beginPath();c.arc(128,128,128,0,Math.PI*2);c.clip();const f=cropFrame(image.naturalWidth,image.naturalHeight,size,zoom,x,y),ratio=256/size;c.drawImage(image,f.left*ratio,f.top*ratio,f.width*ratio,f.height*ratio);const data=out.toDataURL('image/webp',.88);if(data.length>150000)throw new Error('头像仍然过大，请选择较简单的图片');onSave(data);}catch(e){onError(e.message);}};
 draw();stage.focus({preventScroll:true});
 return()=>{dead=true;URL.revokeObjectURL(url);pointers.clear();};
}
