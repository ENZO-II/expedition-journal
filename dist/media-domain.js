export const IMAGE_TYPES=['image/png','image/jpeg','image/webp'];
export const isAsset=value=>typeof value==='string'&&/^blob:(map|image)_[a-zA-Z0-9_-]{1,100}$/.test(value);
export const mediaRefs=c=>[...c.maps,...c.items.flatMap(i=>i.images??[]),...(c.art??[]).filter(a=>a.kind==='image')];
export const assetKeys=campaigns=>[...new Set(campaigns.flatMap(c=>mediaRefs(c).map(x=>x.asset)).filter(isAsset))];
export function validateMedia(c,checkId){
 const chars=new Set(c.characters.map(x=>x.id)),maps=new Set(c.maps.map(x=>x.id));
 for(const item of c.items){
  if(item.images===undefined)continue;
  if(!Array.isArray(item.images)||item.images.length>8)throw new Error('每件物品最多附八张图片');
  for(const image of item.images)if(!image||!isAsset(image.asset)||!['circle','square'].includes(image.shape))throw new Error('物品图片无效');
 }
 if(c.art===undefined)return;
 if(!Array.isArray(c.art)||c.art.length>5000)throw new Error('地图绘图数量过多');
 for(const a of c.art){
  checkId(a.id);
  if(!maps.has(a.mapId)||!chars.has(a.characterId)||typeof a.authorMemberId!=='string'||!a.authorMemberId||a.authorMemberId.length>120||!Number.isFinite(Date.parse(a.createdAt)))throw new Error('绘图位置或署名无效');
  if(a.kind==='stroke'){
   if(!/^#[0-9a-f]{6}$/i.test(a.color)||!Number.isFinite(a.width)||a.width<1||a.width>12||!Array.isArray(a.points)||a.points.length<2||a.points.length>2000||a.points.some(p=>!Array.isArray(p)||p.length!==2||p.some(v=>!Number.isFinite(v)||v<0||v>1)))throw new Error('笔迹数据无效');
  }else if(a.kind==='image'){
   if(!isAsset(a.asset)||!['circle','square'].includes(a.shape)||![a.x,a.y,a.size].every(Number.isFinite)||a.x<0||a.x>1||a.y<0||a.y>1||a.size<.02||a.size>.5)throw new Error('地图贴图无效');
  }else throw new Error('未知地图绘图类型');
 }
}
export function strokePath(points){return points.map((p,i)=>(i?'L':'M')+(p[0]*1000).toFixed(2)+' '+(p[1]*1000).toFixed(2)).join(' ');}
