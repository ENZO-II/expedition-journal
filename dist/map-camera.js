const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
export const MIN_ZOOM=1,MAX_ZOOM=8;
// Camera centres use image coordinates, so changing page size keeps the same place.
export function frame(camera,viewport,image){
 const fit=Math.min(viewport.width/image.width,viewport.height/image.height);
 const zoom=clamp(camera.zoom,MIN_ZOOM,MAX_ZOOM);
 const width=image.width*fit*zoom,height=image.height*fit*zoom;
 const constrain=(offset,size,limit)=>size<=limit?(limit-size)/2:clamp(offset,limit-size,0);
 return{width,height,x:constrain(viewport.width/2-camera.cx*width,width,viewport.width),y:constrain(viewport.height/2-camera.cy*height,height,viewport.height),zoom};
}
function fromOffset(x,y,zoom,viewport,image){
 const size=frame({cx:.5,cy:.5,zoom},viewport,image);
 const camera={cx:(viewport.width/2-x)/size.width,cy:(viewport.height/2-y)/size.height,zoom:size.zoom};
 const bounded=frame(camera,viewport,image);
 return{cx:(viewport.width/2-bounded.x)/bounded.width,cy:(viewport.height/2-bounded.y)/bounded.height,zoom:size.zoom};
}
export function imagePoint(camera,point,viewport,image){
 const f=frame(camera,viewport,image);
 return{x:(point.x-f.x)/f.width,y:(point.y-f.y)/f.height};
}
export function zoomAt(camera,zoom,point,viewport,image){
 const anchor=imagePoint(camera,point,viewport,image),next=frame({...camera,zoom},viewport,image);
 return fromOffset(point.x-anchor.x*next.width,point.y-anchor.y*next.height,next.zoom,viewport,image);
}
export function panBy(camera,dx,dy,viewport,image){
 const f=frame(camera,viewport,image);
 return fromOffset(f.x+dx,f.y+dy,f.zoom,viewport,image);
}
