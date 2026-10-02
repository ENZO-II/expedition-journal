export function cropFrame(width,height,size,zoom=1,x=0,y=0){
 const scale=Math.max(size/width,size/height)*Math.max(1,Math.min(4,zoom));
 const w=width*scale,h=height*scale;
 const cx=Math.max(-(w-size)/2,Math.min((w-size)/2,x)),cy=Math.max(-(h-size)/2,Math.min((h-size)/2,y));
 return{scale,x:cx,y:cy,left:(size-w)/2+cx,top:(size-h)/2+cy,width:w,height:h};
}
