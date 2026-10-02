const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
export function placeScroll(anchor,viewport){
 const gap=22,padding=14,width=Math.min(270,viewport.width-54),height=Math.min(450,viewport.height-212);
 const right=viewport.width-anchor.x,left=anchor.x;
 const side=right>=width+gap+padding?'right':left>=width+gap+padding?'left':right>=left?'right':'left';
 return{side,width,height,x:clamp(side==='right'?anchor.x+gap:anchor.x-gap-width,padding,viewport.width-width-padding),y:clamp(anchor.y-height*.42,72,viewport.height-height-140),visible:anchor.x>=0&&anchor.x<=viewport.width&&anchor.y>=0&&anchor.y<=viewport.height};
}
