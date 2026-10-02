export const MAX_REPLIES=500;
export const MAX_AVATAR_LENGTH=150000;
export function validAvatar(value){
 if(value===undefined||value===null)return true;
 if(typeof value!=='string'||value.length>MAX_AVATAR_LENGTH||!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value))return false;
 try{const raw=atob(value.split(',')[1]);return value.startsWith('data:image/png;')?raw.startsWith('\x89PNG\r\n\x1a\n'):value.startsWith('data:image/jpeg;')?raw.startsWith('\xff\xd8\xff'):raw.startsWith('RIFF')&&raw.slice(8,12)==='WEBP';}catch{return false;}
}
export function addReply(campaign,targetKind,targetId,{characterId,authorMemberId,body,kind='reply',parentId=null}){
 if(!['entry','marker'].includes(targetKind))throw new Error('回复位置无效');
 const target=campaign[targetKind==='entry'?'entries':'markers'].find(x=>x.id===targetId);
 if(!target)throw new Error('原来的手记或地点已不存在');
 if(!campaign.characters.some(x=>x.id===characterId))throw new Error('请先选择署名角色');
 if(typeof body!=='string'||!body.trim()||body.length>10000)throw new Error('请填写 1–10000 字的内容');
 if(typeof authorMemberId!=='string'||!authorMemberId||authorMemberId.length>120)throw new Error('署名无效');
 if(!['reply','supplement'].includes(kind))throw new Error('请选择回复或补充');
 const replies=target.replies??[];
 if(replies.length>=MAX_REPLIES)throw new Error('这一处已达到 500 条留言上限');
 if(parentId&&!replies.some(x=>x.id===parentId))throw new Error('被回复的条目已不存在');
 const reply={id:'reply_'+crypto.randomUUID(),characterId,authorMemberId,body:body.trim(),kind,parentId,createdAt:new Date().toISOString()};
 target.replies=[...replies,reply];return reply;
}
export function markerParticipants(campaign,marker){
 const entries=campaign.entries.filter(e=>e.markerId===marker.id);
 const ids=[marker.characterId,...entries.flatMap(e=>[e.characterId,...(e.replies??[]).map(r=>r.characterId)]),...(marker.replies??[]).map(r=>r.characterId)];
 return [...new Set(ids.filter(Boolean))].map(id=>campaign.characters.find(c=>c.id===id)).filter(Boolean);
}
export function validateReplies(replies,chars,checkId){
 if(replies===undefined)return;
 if(!Array.isArray(replies)||replies.length>MAX_REPLIES)throw new Error('回复数据无效或过多');
 const seen=new Set();
 for(const r of replies){
  if(!r||typeof r!=='object')throw new Error('回复数据无效');
  checkId(r.id);
  if(!chars.has(r.characterId)||typeof r.authorMemberId!=='string'||!r.authorMemberId||r.authorMemberId.length>120||typeof r.body!=='string'||!r.body.trim()||r.body.length>10000||!['reply','supplement'].includes(r.kind)||!Number.isFinite(Date.parse(r.createdAt))||(r.parentId!==null&&r.parentId!==undefined&&!seen.has(r.parentId)))throw new Error('回复署名、内容或关联无效');
  seen.add(r.id);
 }
}
