export function gestureAction({button,pointerType,mode='marker',marker=false,art=false,placing=false}){
 if(button===2||button===1)return'pan';
 if(button!==0)return'ignore';
 if(marker)return'marker';if(art)return'art';
 if(mode==='ink')return'ink';
 if(mode==='image'||mode==='move-art')return'place';
 if(pointerType==='touch'&&!placing)return'pan';
 return'place';
}
