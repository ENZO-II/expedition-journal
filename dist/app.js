import{manifestURL}from'./owlbear-bridge.js?v=20261003-13d';
import{mountOwlbearBook}from'./embedded-host.js?v=20261003-13d';
import{arrangeLibrary,relatedShared}from'./campaign-library.js?v=20261003-13d';
import{mergeCampaign}from'./shared-merge.js?v=20261003-13d';
import{RoomClient,parseInvite}from'./room-client.js?v=20261003-13d';
import{assetKeys,mediaRefs,strokePath}from'./media-domain.js?v=20261003-13d';
import{addReply,markerParticipants,validAvatar}from'./discussion.js?v=20261003-13d';
import{mountAvatarCrop}from'./avatar-crop.js?v=20261003-13d';
import{placeScroll}from'./scroll-position.js?v=20261003-13d';
import{mountMap}from'./map-view.js?v=20261003-13d';
import{VERSION,uid,escapeHtml as h,sortEntries,transferItem,validateData,createCampaign,demoState}from'./domain.js?v=20261003-13d';
const $=s=>document.querySelector(s),KEY=(['127.0.0.1','localhost'].includes(location.hostname)&&new URLSearchParams(location.search).has('qa')?'expedition-journal-qa-'+(new URLSearchParams(location.search).get('qa')||'default')+'-v1':'expedition-journal-v1'),COLORS=['#702d38','#283d59','#416044','#88552f','#655080'];
let state,storageBlocked=false,firstVisit=false,saveIssue='',libraryOpen=false;
try{const raw=localStorage.getItem(KEY);firstVisit=!raw;state=raw?validateData(JSON.parse(raw)):demoState();}catch(e){state=demoState();storageBlocked=true;}
let view='map',selectedMap=null,selectedMarker='marker_begin',selectedEntry='entry_begin',sort='adventure',author='',search='',editing=null,placing=false,movingMarker=null,mapCleanup=null,mapFrame=null,openMarker=null,scrollEntryIndex=0,saveTimer,toastTimer,undoSnapshot=null,undoAfter=null;
let room=null,roomStatus='local',roomLoading=false,apiAvailable=false,mapMode='marker',inkColor='#30291f',inkWidth=3,pendingPicture=null,movingArt=null;
let pictureCallback=null,pictureCancel=null,editingBase=null;
let roomBindings={};try{roomBindings=JSON.parse(localStorage.getItem(KEY+'-rooms')??'{}');}catch{}
if(!roomBindings||typeof roomBindings!=='object'||Array.isArray(roomBindings))roomBindings={};
arrangeLibrary(state.campaigns,roomBindings);
const blobs=new Map(),blobUrls=new Map();
let dialogCleanup=null,dialogVersion=0,scrollDiscussion='entry';
const dbPromise=new Promise((resolve,reject)=>{const request=indexedDB.open('expedition-journal-assets',1);request.onupgradeneeded=()=>request.result.createObjectStore('maps');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
dbPromise.catch(()=>{});
const campaign=()=>state.campaigns.find(c=>c.id===state.currentCampaignId)??state.campaigns[0];
const currentCharacter=()=>campaign().characters.find(c=>c.id===state.currentCharacterByCampaign?.[campaign().id]);
const characterName=id=>campaign().characters.find(c=>c.id===id)?.name??'未署名';
const characterColor=id=>campaign().characters.find(c=>c.id===id)?.color??COLORS[0];
const timeText=value=>new Intl.DateTimeFormat('zh-CN',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(value));
const safeName=s=>s.replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').slice(0,80)||'远征手记';
const selected=(a,b)=>a===b?' selected':'';
const empty=(title,body,button='')=>'<div class="empty-state"><h2>'+h(title)+'</h2><p>'+h(body)+'</p>'+button+'</div>';
function toast(message,undo=false){$('#toast').innerHTML=h(message)+(undo?' <button id="undo-action" class="toast-undo">撤销</button>':'');$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),undo?12000:4200);if(undo)$('#undo-action').onclick=undoLast;}
function persist(){
 if(roomLoading){toast('正在打开共享远征，请稍候');return false;}
 if(room?.paused){updateRoomStatus();toast('同步已暂停，请先处理差异。');return false;}
 if(storageBlocked){$('#save-status').textContent='未保存 · 请先导出备份';return false;}
 let previous;
 try{previous=localStorage.getItem(KEY);state.revision=(state.revision??0)+1;localStorage.setItem(KEY,JSON.stringify(state));if(room&&room.ack?.id===campaign().id)room.enqueue(campaign());saveIssue='';updateRoomStatus();return true;}catch(e){try{if(previous!==undefined){if(previous===null)localStorage.removeItem(KEY);else localStorage.setItem(KEY,previous);}}catch{}saveIssue='保存失败 · 请导出备份';$('#save-status').textContent=saveIssue;toast('设备存储不可用或已满，请先导出备份。');return false;}
}
function mutate(fn,undo=false){const before=structuredClone(state);try{fn();if(!persist()){state=before;return false;}undoSnapshot=undo?before:null;undoAfter=undo?structuredClone(state):null;if(!undo)$('#undo-action')?.remove();return true;}catch(e){state=before;toast(e.message);return false;}}
function applyDraft(base,change,undo=false){
 if(room?.paused){toast('同步有差异，请先导出副本或采用房间版本。');return false;}
 const desired=structuredClone(base);change(desired);
 try{const merged=room?mergeCampaign(base,desired,campaign()):desired;return mutate(()=>state.campaigns[state.campaigns.findIndex(c=>c.id===merged.id)]=merged,undo);}
 catch(error){if(error.name!=='ConflictError'){toast(error.message);return false;}try{room.holdConflict(base,desired);state.campaigns[state.campaigns.findIndex(c=>c.id===desired.id)]=desired;localStorage.setItem(KEY,JSON.stringify(state));}catch{toast('本机空间不足，修改尚未留存，请立即导出副本。');return false;}toast('同伴已修改同一项。你的修改已留存，请点页底的“处理差异”。');return false;}
}

function undoLast(){if(!undoSnapshot)return;if(room&&undoAfter){try{const restored=mergeCampaign(undoAfter.campaigns.find(c=>c.id===campaign().id),undoSnapshot.campaigns.find(c=>c.id===campaign().id),campaign());if(mutate(()=>state.campaigns[state.campaigns.findIndex(c=>c.id===restored.id)]=restored)){editing=null;render();toast('已撤销上一步');}}catch{toast('这一项已有同伴修改，无法直接撤销。');}return;}const previous=state;state=undoSnapshot;undoSnapshot=null;if(!persist()){undoSnapshot=state;state=previous;return;}editing=null;render();toast('已撤销上一步');}
async function storeBlob(id,blob){if(room&&room.ack?.id===campaign().id)await room.upload(id,blob);const db=await dbPromise;await new Promise((resolve,reject)=>{const tx=db.transaction('maps','readwrite');tx.objectStore('maps').put(blob,id);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});blobs.set(id,blob);}
async function readBlob(id,owner=campaign()){if(blobs.has(id))return blobs.get(id);if(room?.ack?.id===owner.id||roomBindings[owner.id]){const client=room?.ack?.id===owner.id?room:new RoomClient(roomBindings[owner.id],{key:KEY+'-outbox-'+roomBindings[owner.id].id,onCampaign:()=>{},onStatus:()=>{},onConflict:()=>{}});try{const blob=await client.image(id);blobs.set(id,blob);return blob;}finally{if(client!==room)client.stop();}}const db=await dbPromise;return new Promise((resolve,reject)=>{const request=db.transaction('maps').objectStore('maps').get(id);request.onsuccess=()=>{if(request.result)blobs.set(id,request.result);resolve(request.result);};request.onerror=()=>reject(request.error);});}
async function hydrateMap(){const image=$('#custom-map-image');if(!image)return;const asset=image.dataset.asset;try{if(!blobUrls.has(asset)){const blob=await readBlob(asset.slice(5));if(!blob)throw new Error('未找到此地图图片，请从完整备份恢复。');blobUrls.set(asset,URL.createObjectURL(blob));}if(image.isConnected)image.src=blobUrls.get(asset);}catch(e){if(image.isConnected){image.alt=e.message;toast(e.message);}}}
function cleanupDialog(){dialogCleanup?.();dialogCleanup=null;dialogVersion++;}
function closeDialog(){cleanupDialog();$('#dialog').close();if(room&&!editing)render();}
$('#dialog').addEventListener('close',cleanupDialog);
function dialog(title,html){cleanupDialog();$('#dialog-title').innerHTML='<span class="dialog-initial" aria-hidden="true">'+h(title[0])+'</span>'+h(title.slice(1));$('#dialog-title').setAttribute('aria-label',title);$('#dialog-content').innerHTML=html;if(!$('#dialog').open)$('#dialog').showModal();setTimeout(()=>$('#dialog-content input:not([type=hidden]),#dialog-content button')?.focus(),0);}
$('#close-dialog').onclick=closeDialog;
$('#dialog').addEventListener('click',e=>{if(e.target===$('#dialog')){const r=$('#dialog').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeDialog();}});
function flushDraft(){if(!editing)return true;clearTimeout(saveTimer);return saveDraft();}
function saveDraft(){
 if(!editing)return true;
 const body=$('#diary-body')?.value??editing.body,label=$('#adventure-label')?.value??editing.adventureLabel,orderText=$('#adventure-order')?.value;
 const order=orderText===undefined?editing.adventureOrder:orderText.trim()===''?null:Number(orderText);
 if(order!==null&&!Number.isSafeInteger(order)){$('#save-status').textContent='日序需要填写整数';return false;}
 const now=new Date().toISOString(),values={body,adventureLabel:label,adventureOrder:order,updatedAt:now};Object.assign(editing,values);
 if(!body.trim()&&!editingBase?.entries.some(e=>e.id===editing.id)){$('#save-status').textContent='空白草稿';return true;}
 const base=editingBase??structuredClone(campaign());
 if(!applyDraft(base,c=>{let entry=c.entries.find(e=>e.id===editing.id);if(entry)Object.assign(entry,values);else c.entries.push({...editing,...values,sequence:state.nextSequence++,createdAt:now});}))return false;
 const saved=campaign().entries.find(e=>e.id===editing.id);Object.assign(editing,saved);editingBase=structuredClone(campaign());selectedEntry=editing.id;
 for(const [id,value]of [['#diary-body',saved.body],['#adventure-label',saved.adventureLabel],['#adventure-order',saved.adventureOrder??'']])if($(id)&&$(id).value!==String(value))$(id).value=value;
 return true;
}
function setView(next){if(!flushDraft())return;const previous=view;openMarker=null;editing=null;placing=false;movingMarker=null;mapMode='marker';pendingPicture=null;movingArt=null;view=next;render(previous!==next?(['map','journal','bag','vault'].indexOf(next)>['map','journal','bag','vault'].indexOf(previous)?'forward':'backward'):null);}
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));
$('#campaign-button').onclick=()=>toggleLibrary();
$('#campaign-button').onkeydown=e=>{if(e.key==='ArrowDown'){e.preventDefault();toggleLibrary(true);$('#campaign-list [aria-current=true]')?.focus();}};
$('#join-campaign').onclick=showJoinRoom;
document.addEventListener('click',e=>{if(libraryOpen&&!e.target.closest('#campaign-switch'))toggleLibrary(false);});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&libraryOpen){toggleLibrary(false);$('#campaign-button').focus();}});
$('#new-campaign').onclick=()=>{if(!flushDraft())return;toggleLibrary(false);dialog('新建远征','<form id="campaign-form"><label class="field">远征名称<input name="name" maxlength="100" required placeholder="为这一段旅程命名"></label><p class="dialog-copy">每段远征拥有独立的角色、地图、手记和公库。创建后可以邀请同伴共享。</p><div class="dialog-actions"><button class="button primary">新建远征</button></div></form>');$('#campaign-form').onsubmit=e=>{e.preventDefault();const name=new FormData(e.target).get('name').trim();if(!name)return;if(mutate(()=>{const c=createCampaign(name);state.campaigns.push(c);state.currentCampaignId=c.id;})){closeDialog();editing=null;selectedMap=null;selectedMarker=null;selectedEntry=null;author='';search='';view='map';connectSavedRoom();render();showCharacters();}};};
function showCharacters(){
 if(!flushDraft())return;
 const c=campaign(),active=currentCharacter();
 dialog('角色名册','<p class="dialog-copy">'+h(c.name)+' · 角色名册</p><div class="character-list">'+c.characters.map(x=>'<div class="character-row"><button class="character-option '+(x.id===active?.id?'selected':'')+'" data-character="'+h(x.id)+'">'+avatarHTML(x.id)+'<span>'+h(x.name)+'</span>'+(x.id===active?.id?'<small>当前角色</small>':'')+'</button><button class="text-button avatar-edit" data-edit-avatar="'+h(x.id)+'" aria-label="'+h(x.name)+'：上传或更换头像">'+(x.avatar?'更换头像':'上传头像')+'</button>'+(x.avatar?'<button class="text-button avatar-remove" data-remove-avatar="'+h(x.id)+'" aria-label="'+h(x.name)+'：移除头像">移除头像</button>':'')+'</div>').join('')+'</div><form id="character-form" class="character-form"><label class="sr-only" for="character-name">新角色姓名</label><input id="character-name" name="name" maxlength="60" required placeholder="新角色姓名"><button class="button primary">登记</button></form><p class="inline-notice">选择本次使用的角色，或登记一个新名字。共享远征内的同伴也能看见头像。</p>');
 document.querySelectorAll('[data-character]').forEach(b=>b.onclick=()=>{if(mutate(()=>{state.currentCharacterByCampaign[c.id]=b.dataset.character;})){editing=null;closeDialog();render();}});
 document.querySelectorAll('[data-edit-avatar]').forEach(b=>b.onclick=()=>chooseAvatar(b.dataset.editAvatar));
 document.querySelectorAll('[data-remove-avatar]').forEach(b=>b.onclick=()=>{if(mutate(()=>{campaign().characters.find(x=>x.id===b.dataset.removeAvatar).avatar=null;},true)){render();showCharacters();toast('头像已移除',true);}});
 $('#character-form').onsubmit=e=>{e.preventDefault();const name=new FormData(e.target).get('name').trim();if(!name)return;const char={id:uid('character'),name,color:COLORS[c.characters.length%COLORS.length]};if(mutate(()=>{campaign().characters.push(char);state.currentCharacterByCampaign[c.id]=char.id;})){editing=null;closeDialog();render();showCharacters();toast('已登记角色：'+name);}};
}
$('#character-button').onclick=showCharacters;
function avatarHTML(id,extra=''){
 const c=campaign().characters.find(x=>x.id===id);
 return '<span class="avatar '+extra+'" style="--avatar-color:'+h(c?.color??'#78684b')+';background:'+h(c?.color??'#78684b')+'" aria-hidden="true">'+(c?.avatar?'<img src="'+h(c.avatar)+'" alt="" draggable="false">':h(c?.name?.[0]??'？'))+'</span>';
}
function threadHTML(kind,target,compact=false){
 const replies=target.replies??[];
 return '<section class="discussion '+(compact?'compact':'')+'" aria-label="'+(kind==='entry'?'本篇回复与补充':'地点留言')+'"><div class="discussion-heading"><h3>'+(kind==='entry'?'回复与补充':'地点留言')+' <small>'+replies.length+'</small></h3><button class="text-button" data-discuss-kind="'+kind+'" data-discuss-id="'+h(target.id)+'">回复 / 补充</button></div>'+replies.map(r=>{
  const parent=replies.find(p=>p.id===r.parentId);
  return '<article class="reply-card" data-reply-id="'+h(r.id)+'" tabindex="-1"><div class="reply-byline">'+avatarHTML(r.characterId)+'<div><strong>'+h(characterName(r.characterId))+'</strong><small>'+h(timeText(r.createdAt))+(r.kind==='supplement'?' · 补充':' · 回复')+'</small></div></div>'+(parent?'<p class="reply-to">回复 '+h(characterName(parent.characterId))+'</p>':'')+'<div class="reply-body">'+h(r.body)+'</div><button class="text-button reply-action" data-discuss-kind="'+kind+'" data-discuss-id="'+h(target.id)+'" data-parent-reply="'+h(r.id)+'">回复 '+h(characterName(r.characterId))+'</button></article>';
 }).join('')+'</section>';
}
const replyDrafts=new Map();
function bindDiscussions(root=document){root.querySelectorAll('[data-discuss-kind]').forEach(b=>b.onclick=()=>replyForm(b.dataset.discussKind,b.dataset.discussId,b.dataset.parentReply??null,!!b.closest('.map-scroll')));}
function replyForm(kind,id,parentId=null,inScroll=false){
 if(!flushDraft())return;
 const c=campaign(),target=c[kind==='entry'?'entries':'markers'].find(x=>x.id===id);if(!target)return;
 if(!c.characters.length){showCharacters();return;}
 const key=[c.id,kind,id,parentId??''].join(':'),draft=replyDrafts.get(key)??{body:'',kind:'reply',characterId:currentCharacter()?.id??c.characters[0].id},parent=target.replies?.find(r=>r.id===parentId);
 dialog(kind==='entry'?'在这篇手记下续写':'在这个地点留言','<form id="reply-form"><p class="dialog-copy">'+h(kind==='entry'?(campaign().markers.find(m=>m.id===target.markerId)?.name??'旅途随记'):target.name)+(parent?' · 回复 '+h(characterName(parent.characterId)):'')+'</p><div class="reply-form-meta"><label class="field">署名<select name="character">'+c.characters.map(x=>'<option value="'+h(x.id)+'"'+selected(x.id,draft.characterId)+'>'+h(x.name)+'</option>').join('')+'</select></label><label class="field">内容类型<select name="kind"><option value="reply"'+selected(draft.kind,'reply')+'>回复</option><option value="supplement"'+selected(draft.kind,'supplement')+'>补充</option></select></label></div><label class="field">正文<textarea name="body" rows="6" maxlength="10000" required placeholder="写下回复，或补上后来发生的事。">'+h(draft.body)+'</textarea></label><p class="inline-notice">'+(kind==='entry'?'收在原手记内，不另计篇数。':'留在这个地点，和地点一起保存。')+'</p><div class="dialog-actions"><button type="button" class="text-button" id="cancel-reply">暂不提交</button><button class="button primary">留下这段文字</button></div></form>');
 const form=$('#reply-form'),stash=()=>{const f=new FormData(form);replyDrafts.set(key,{body:f.get('body'),kind:f.get('kind'),characterId:f.get('character')});};
 form.oninput=stash;form.onchange=stash;
 $('#cancel-reply').onclick=closeDialog;
 form.onsubmit=e=>{e.preventDefault();stash();const d=replyDrafts.get(key);let added;
  if(mutate(()=>{added=addReply(campaign(),kind,id,{...d,authorMemberId:state.memberId,parentId});},true)){
   replyDrafts.delete(key);if(inScroll)scrollDiscussion=kind;closeDialog();render();
   const root=inScroll?$('.map-scroll'):$('.manuscript'),card=root?.querySelector('[data-reply-id="'+CSS.escape(added.id)+'"]'),scroller=card?.closest(inScroll?'.scroll-excerpt':'.folio-body');
   if(card&&scroller){scroller.scrollTop+=card.getBoundingClientRect().top-scroller.getBoundingClientRect().top-12;card.focus({preventScroll:true});}
   toast(d.kind==='supplement'?'补充已收在原处':'回复已保存',true);
  }
 };
}
let avatarTarget=null;
function chooseAvatar(characterId){avatarTarget={campaignId:campaign().id,characterId};$('#avatar-upload').click();}
$('#avatar-upload').onchange=async e=>{
 const file=e.target.files[0],target=avatarTarget;e.target.value='';if(!file||!target)return;
 dialog('裁剪角色头像','<div id="avatar-crop-host"><p>正在读取图片…</p></div>');
 const version=dialogVersion;
 try{const cleanup=await mountAvatarCrop($('#avatar-crop-host'),file,{
  onCancel:()=>{closeDialog();showCharacters();},onError:toast,
  onSave:data=>{if(!validAvatar(data)){toast('无法保存这张头像');return;}if(mutate(()=>{const c=state.campaigns.find(x=>x.id===target.campaignId),char=c?.characters.find(x=>x.id===target.characterId);if(!char)throw new Error('这个角色已不存在');char.avatar=data;})){closeDialog();render();showCharacters();toast('头像已保存');}}
 });if(version!==dialogVersion)cleanup?.();else dialogCleanup=cleanup;
 }catch(error){if(version===dialogVersion){closeDialog();showCharacters();toast(error.message);}}
};
function replyMarkdown(target){return(target.replies??[]).map(r=>{const parent=target.replies.find(p=>p.id===r.parentId);return'\n\n### '+(r.kind==='supplement'?'补充':'回复')+' · '+characterName(r.characterId)+(parent?'\n\n回复 '+characterName(parent.characterId):'')+'\n\n'+r.body+'\n\n写于 '+r.createdAt;}).join('');}
function replyPrintHTML(target){return(target.replies??[]).map(r=>{const parent=target.replies.find(p=>p.id===r.parentId);return '<section class="reply"><div class="byline">'+avatarHTML(r.characterId)+'<b>'+h(characterName(r.characterId))+'</b> · '+(r.kind==='supplement'?'补充':'回复')+'</div>'+(parent?'<small>回复 '+h(characterName(parent.characterId))+'</small>':'')+'<p>'+h(r.body)+'</p><small>'+h(r.createdAt)+'</small></section>';}).join('');}

function filters(){return'<div class="filters"><label class="sr-only" for="sort-select">排列方式</label><select id="sort-select"><option value="adventure"'+selected(sort,'adventure')+'>按冒险时间</option><option value="written"'+selected(sort,'written')+'>按写入顺序 · 最近在前</option></select><label class="sr-only" for="author-select">筛选作者</label><select id="author-select"><option value="">所有角色</option>'+campaign().characters.map(c=>'<option value="'+h(c.id)+'"'+selected(author,c.id)+'>'+h(c.name)+'</option>').join('')+'</select>'+(view==='journal'?'<label class="sr-only" for="search-input">搜索手记</label><input id="search-input" type="search" value="'+h(search)+'" placeholder="寻找一段文字…">':'')+'</div>';}
function entriesForView(){
 let list=campaign().entries.filter(e=>(!author||e.characterId===author)&&(!search||view!=='journal'||[e.body,...(e.replies??[]).map(r=>r.body)].some(body=>body.toLowerCase().includes(search.toLowerCase()))));
 if(view==='map'){const ids=new Set(campaign().markers.filter(m=>m.mapId===selectedMap).map(m=>m.id));list=list.filter(e=>selectedMarker?e.markerId===selectedMarker:!e.markerId||ids.has(e.markerId));}
 return sortEntries(list,sort);
}
function folio(){
 const list=entriesForView();let entry=list.find(e=>e.id===selectedEntry)??list[0];if(entry)selectedEntry=entry.id;
 const marker=campaign().markers.find(m=>m.id===(editing?editing.markerId:(view==='journal'?entry?.markerId:selectedMarker))),index=list.findIndex(e=>e.id===entry?.id);
 let content='';
 if(editing){
 content='<div class="folio-body"><div class="editor-title"><h2>写手记</h2><span class="inline-notice">'+h(characterName(editing.characterId))+' 署</span></div><div class="editor-fields"><label class="field">冒险日期<input id="adventure-label" maxlength="100" value="'+h(editing.adventureLabel)+'" placeholder="例如：霜月初三"></label><label class="field">冒险日序<input type="number" step="1" id="adventure-order" value="'+h(editing.adventureOrder??'')+'" placeholder="未注明"><small>用于排序；可沿用当前第几日。</small></label></div><label class="sr-only" for="diary-body">日记正文</label><textarea id="diary-body" class="diary-input" maxlength="100000" placeholder="从这里开始写。">'+h(editing.body)+'</textarea><div class="editor-foot"><span>输入后自动保存</span><span id="word-count">'+editing.body.length+' 字</span></div></div><div class="folio-bottom"><span>'+h(marker?.name??'未关联地图地点')+'</span><button class="button primary" id="finish-edit">完成书写</button></div>';
 }else if(entry){
 const place=campaign().markers.find(m=>m.id===entry.markerId);
 content='<div class="folio-body"><div class="date-ribbon">'+h(entry.adventureLabel||'冒险日期未注明')+'</div><h2 class="entry-title">'+h(place?.name??'旅途随记')+'</h2><div class="entry-text">'+h(entry.body||'（空白手记）')+'</div><div class="author-line">'+avatarHTML(entry.characterId)+'<div>'+h(characterName(entry.characterId))+' 署<small>写于 '+h(timeText(entry.createdAt))+' · 第 '+entry.sequence+' 篇</small></div></div>'+threadHTML('entry',entry)+'</div><div class="folio-bottom"><div class="entry-nav"><button class="icon-button" id="prev-entry" aria-label="上一篇" '+(index<=0?'disabled':'')+'>‹</button><span>'+(index+1)+' / '+list.length+'</span><button class="icon-button" id="next-entry" aria-label="下一篇" '+(index>=list.length-1?'disabled':'')+'>›</button></div><div><button class="text-button quick-reply" data-discuss-kind="entry" data-discuss-id="'+h(entry.id)+'" aria-label="回复或补充这一篇">回复 <small>'+(entry.replies?.length??0)+'</small></button><button class="text-button" id="delete-entry" aria-label="移除">移除</button><button class="button" id="edit-entry" aria-label="编辑这一页">编辑这一页</button></div></div>';
 }else content=empty(marker?marker.name:'这里还是空白的一页',author?'这位角色还没有在这里留下手记。':'选择地图上的足迹，或写下你自己的第一篇。','<button class="button primary" id="empty-new-entry">写一篇手记</button>');
 return'<article class="manuscript '+(view==='journal'?'journal-full':'')+'"><div class="folio-content"><div class="folio-top"><span class="eyebrow">手记</span><span class="folio-number">页 '+(editing&&!campaign().entries.some(e=>e.id===editing.id)?'—':entry?String(entry.sequence).padStart(2,'0'):'—')+'</span></div>'+content+'</div></article>';
}
function heading(kicker,title,subtitle,buttons){return'<div class="page-heading"><div><h1>'+h(title)+'</h1>'+(subtitle?'<p class="subtitle">'+h(subtitle)+'</p>':'')+'</div><div class="toolbar">'+buttons+'</div></div>';}

function pageHead(title,number,actions=''){
 return '<div class="leaf-heading"><div><span class="leaf-number" aria-hidden="true">'+number+'</span><h2 aria-label="'+h(title)+'"><span class="illuminated-initial">'+h(title[0])+'</span>'+h(title.slice(1))+'</h2></div><div class="leaf-actions">'+actions+'</div></div>';
}
function book(left,right,kind){
 const frame='<span class="page-painted-frame" aria-hidden="true"><i class="rail-left"></i><i class="rail-right"></i><i class="rail-top"></i><i class="rail-bottom"></i></span>';
 return '<div class="book-spread '+kind+'"><section class="book-page page-left">'+frame+left+'</section><section class="book-page page-right">'+(kind==='atlas-book'?'':frame)+right+'</section><span class="book-binding" aria-hidden="true"></span></div>';
}
function readingPage(){
 return '<div class="reading-frontispiece"><div class="rubric-panel">'+pageHead('手记','I','<button class="button primary" id="new-entry">＋ 写一篇</button>')+filters()+
 '</div><div class="reading-toolbar"><span>'+h(view==='map'?(campaign().markers.find(m=>m.id===selectedMarker)?.name??'旅途随记'):entriesForView().length+' 篇手记')+'</span>'+(view==='map'?'<button class="text-button" id="expand-journal">全部手记</button>':'')+'</div><img class="rubric-junction" src="assets/rubric-junction-v7.png" alt="" aria-hidden="true"></div>'+folio();
}
function renderMap(){
 const c=campaign(),map=c.maps.find(m=>m.id===selectedMap)??c.maps[0];selectedMap=map?.id??null;
 if(selectedMarker&&!c.markers.some(m=>m.id===selectedMarker&&m.mapId===selectedMap)){selectedMarker=null;selectedEntry=null;}
 if(openMarker&&!c.markers.some(m=>m.id===openMarker&&m.mapId===selectedMap))openMarker=null;
 const pins=c.markers.filter(m=>m.mapId===selectedMap),markers=pins.map((m,i)=>{const people=markerParticipants(c,m),names=people.map(p=>p.name),caption=names.length>2?names.slice(0,2).join('、')+' 等 '+names.length+' 人':names.join('、')||'未署名';return'<button class="map-pin '+(selectedMarker===m.id?'selected':'')+'" data-marker="'+h(m.id)+'" style="left:'+m.x*100+'%;top:'+m.y*100+'%;--pin-color:'+(people[0]?.color??'#78684b')+'" aria-label="'+h(m.name)+'" title="'+h(m.name+' · '+names.join('、'))+'" aria-expanded="'+(openMarker===m.id)+'" aria-controls="map-scroll"><span class="pin-faces">'+(people.length?people.slice(0,3).map(p=>avatarHTML(p.id)).join(''):avatarHTML(null))+'</span><span class="pin-caption">'+h(caption)+'</span><span class="pin-number">'+(i+1)+'</span></button>';}).join('');
 const mapImage=map?.asset==='assets/portolan.jpg'?'<svg class="map-image historic-map" viewBox="0 0 8615 3975" aria-label="约1550年的地中海航海图" role="img"><image href="assets/portolan.jpg" width="3975" height="8615" transform="translate(0 3975) rotate(-90)"/></svg>':'<img id="custom-map-image" class="map-image" data-asset="'+h(map?.asset??'')+'" alt="'+h(map?.name??'地图')+'" draggable="false">';
 const right='<h2 class="sr-only">地图</h2><span class="sr-only" id="map-help">右键拖动地图，左键落下标注，滚轮缩放。平板用双指缩放，单指浏览；点“标注”后落标。方向键移动，加减号缩放，0 查看全图。</span>'+
 '<div class="map-stage '+(mapMode==='ink'?'pen-mode ':mapMode==='image'||placing?'placing ':'')+'" id="map-stage" tabindex="0" aria-label="可拖动的地图" aria-describedby="map-help">'+(map?'<div class="map-canvas" id="map-canvas">'+mapImage+mapArtHTML()+markers+'</div>':empty('导入一张地图','支持 JPG、PNG 和 WebP。','<button class="button" id="empty-import-map">选择地图图片</button>'))+'</div>'+
 '<div class="atlas-controls"><label class="sr-only" for="map-select">当前地图</label><select id="map-select">'+(c.maps.length?c.maps.map(m=>'<option value="'+h(m.id)+'"'+selected(selectedMap,m.id)+'>'+h(m.name)+'</option>').join(''):'<option>尚无地图</option>')+'</select><button class="text-button" id="import-map">导入</button><button class="icon-button map-tools-toggle" id="map-tools-toggle" aria-label="地图地点与工具" aria-controls="atlas-tools" aria-expanded="false">⋯</button></div>'+
 '<div class="atlas-tools" id="atlas-tools" hidden><label for="place-select">地点<select id="place-select"><option value="">选择一处标注</option>'+pins.map(m=>'<option value="'+h(m.id)+'">'+h(m.name)+'</option>').join('')+'</select></label><button class="text-button" id="rename-marker" '+(!selectedMarker?'disabled':'')+'>当前地点设置</button><p>右键拖动 · 左键落标 · 滚轮缩放'+(placing?'<br>点按地图'+(movingMarker?'选择新的位置':'添加标注'):'')+'</p></div>'+
 '<div class="atlas-bottom-controls"><button class="button '+(placing?'active':'')+'" id="place-marker" '+(!map?'disabled':'')+'>'+(placing?'取消标注':'＋ 标注')+'</button><button class="button" id="reset-map" '+(!map?'disabled':'')+'>全图</button><button class="map-pen-action" id="map-pen" aria-label="蘸水笔绘图" aria-pressed="'+(mapMode==='ink')+'" '+(!map?'disabled':'')+'><img src="assets/dip-pen.svg" alt="" aria-hidden="true"><span>蘸水笔</span></button></div>'+penPaletteHTML()+
 '<div class="atlas-zoom"><button class="icon-button" id="zoom-in" aria-label="放大地图" '+(!map?'disabled':'')+'>＋</button><span class="zoom-value" aria-live="off">100%</span><button class="icon-button" id="zoom-out" aria-label="缩小地图" '+(!map?'disabled':'')+'>−</button></div><div class="map-scroll-host"></div>';
 return book(readingPage(),right,'atlas-book');
}
function scrollEntries(){return sortEntries(campaign().entries.filter(e=>e.markerId===openMarker),sort);}
function positionMapScroll(layout=mapFrame){
 if(layout)mapFrame=layout;
 const node=$('#map-scroll'),marker=campaign().markers.find(m=>m.id===openMarker);
 if(!node||!marker||!mapFrame)return;
 const {frame:f,viewport:v}=mapFrame,p=placeScroll({x:f.x+marker.x*f.width,y:f.y+marker.y*f.height},v);
 node.hidden=!p.visible;node.dataset.side=p.side;
 Object.assign(node.style,{left:p.x+'px',top:p.y+'px'});
 node.style.setProperty('--scroll-width',p.width+'px');node.style.setProperty('--scroll-height',p.height+'px');
}
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&openMarker&&!$('#dialog').open){e.preventDefault();closeMapScroll(true);}});
function closeMapScroll(focus=false){
 const id=openMarker;openMarker=null;$('.map-scroll-host')?.replaceChildren();if($('#rename-marker'))$('#rename-marker').disabled=!selectedMarker;
 document.querySelectorAll('[data-marker]').forEach(b=>{b.setAttribute('aria-expanded','false');if(focus&&b.dataset.marker===id)b.focus({preventScroll:true});});
}
function openPlace(id){
 if(openMarker===id){closeMapScroll(true);return;}
 openMarker=id;scrollEntryIndex=0;scrollDiscussion='entry';
 const marker=campaign().markers.find(m=>m.id===id);if(marker)mapCleanup?.reveal?.(marker);
 renderMapScroll(true);$('#scroll-close')?.focus({preventScroll:true});
}
function renderMapScroll(animate=false){
 const host=$('.map-scroll-host'),marker=campaign().markers.find(m=>m.id===openMarker);if(!host||!marker)return;
 const unfolding=animate&&!matchMedia('(prefers-reduced-motion: reduce)').matches;
 const list=scrollEntries();scrollEntryIndex=Math.max(0,Math.min(scrollEntryIndex,list.length-1));const entry=list[scrollEntryIndex],people=markerParticipants(campaign(),marker),placeMode=scrollDiscussion==='marker';
 host.innerHTML='<aside class="map-scroll '+(unfolding?'unrolling':'')+'" id="map-scroll" role="dialog" aria-modal="false" aria-labelledby="scroll-title" tabindex="-1"><div class="scroll-paper"><span class="scroll-skin" aria-hidden="true"></span><div class="scroll-heading"><h3 id="scroll-title">'+h(marker.name)+'</h3><button class="icon-button" id="scroll-close" aria-label="收起地图卷轴">×</button></div>'+
 '<div class="place-contributors" aria-label="在此留下记录的角色">'+people.map(c=>'<span class="contributor">'+avatarHTML(c.id)+'<span>'+h(c.name)+'</span></span>').join('')+'</div><div class="scroll-tabs"><button id="scroll-tab-entries" aria-pressed="'+!placeMode+'">手记 '+list.length+'</button><button id="scroll-tab-place" aria-pressed="'+placeMode+'">地点留言 '+(marker.replies?.length??0)+'</button></div>'+
 '<div class="scroll-excerpt">'+(placeMode?threadHTML('marker',marker,true):entry?'<div class="scroll-author">'+avatarHTML(entry.characterId)+'<span>'+h(characterName(entry.characterId))+'<small>'+h(entry.adventureLabel||'日期未注明')+' · 第 '+entry.sequence+' 篇<br>'+h(timeText(entry.createdAt))+'</small></span></div><div class="scroll-entry-text">'+h(entry.body||'（空白手记）')+'</div>'+threadHTML('entry',entry,true):'<p>这里还没有手记。</p><button class="text-button" data-discuss-kind="marker" data-discuss-id="'+h(marker.id)+'">留下地点留言</button>')+'</div>'+
 (!placeMode&&list.length>1?'<div class="scroll-entry-nav"><button class="icon-button" id="scroll-prev" aria-label="卷轴上一篇" '+(scrollEntryIndex===0?'disabled':'')+'>‹</button><span>'+(scrollEntryIndex+1)+' / '+list.length+'</span><button class="icon-button" id="scroll-next" aria-label="卷轴下一篇" '+(scrollEntryIndex===list.length-1?'disabled':'')+'>›</button></div>':'')+
 '<div class="scroll-actions">'+(entry?'<button class="text-button" id="scroll-read">在左页阅读</button>':'<button class="text-button" id="scroll-settings">地点设置</button>')+'<button class="text-button" id="scroll-write">＋ 写手记</button></div></div><span class="scroll-roll top" aria-hidden="true"></span><span class="scroll-roll bottom" aria-hidden="true"></span></aside>';
 document.querySelectorAll('[data-marker]').forEach(b=>b.setAttribute('aria-expanded',String(b.dataset.marker===openMarker)));
 if(unfolding){const node=$('#map-scroll');node.querySelector('.scroll-skin').addEventListener('animationend',()=>node.classList.remove('unrolling'),{once:true});setTimeout(()=>node.classList.remove('unrolling'),650);}
 positionMapScroll();if($('#rename-marker'))$('#rename-marker').disabled=false;
 $('#scroll-close').onclick=()=>closeMapScroll(true);
 $('#map-scroll').onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closeMapScroll(true);}};
 if($('#scroll-read'))$('#scroll-read').onclick=()=>{if(!flushDraft())return;selectedMarker=marker.id;selectedEntry=entry.id;author='';editing=null;closeMapScroll();render();$('.entry-title')?.setAttribute('tabindex','-1');$('.entry-title')?.focus({preventScroll:true});};
 $('#scroll-write').onclick=()=>{if(!flushDraft())return;selectedMarker=marker.id;closeMapScroll();beginEntry();};
 if($('#scroll-settings'))$('#scroll-settings').onclick=()=>editMarker(marker.id);
 $('#scroll-tab-entries').onclick=()=>{scrollDiscussion='entry';renderMapScroll();$('#scroll-tab-entries').focus({preventScroll:true});};
 $('#scroll-tab-place').onclick=()=>{scrollDiscussion='marker';renderMapScroll();$('#scroll-tab-place').focus({preventScroll:true});};
 ['prev','next'].forEach((kind,i)=>{const button=$('#scroll-'+kind);if(button)button.onclick=()=>{scrollEntryIndex+=i?1:-1;renderMapScroll();const next=$('#scroll-'+kind);(next&&!next.disabled?next:$('#scroll-close'))?.focus({preventScroll:true});};});
 bindDiscussions(host);
}

function renderJournal(){
 const list=entriesForView();if(!list.some(e=>e.id===selectedEntry))selectedEntry=list[0]?.id??null;
 return book(readingPage(),pageHead('手记目录','II','<button class="text-button" id="return-map">回到地图</button>')+'<div class="catalog-summary"><span>'+list.length+' 篇手记</span><img class="page-junction" src="assets/catalog-junction-v8.png" alt="" aria-hidden="true"></div><div class="entry-list" aria-label="日记目录">'+(list.length?list.map(e=>'<button class="entry-list-button '+(e.id===selectedEntry?'active':'')+'" data-entry="'+h(e.id)+'"><span class="entry-list-date">'+h(e.adventureLabel||'日期未注明')+'</span><span class="entry-snippet">'+h(e.body.split('\n')[0]||'空白手记')+'</span><small>'+h(characterName(e.characterId))+' · '+h(timeText(e.createdAt))+'</small></button>').join(''):empty('尚无手记','在左页写下第一篇。'))+'</div>','journal-book');
}
function inventoryPage(vault){
 const char=currentCharacter(),owner=vault?null:char?.id,items=campaign().items.filter(x=>x.ownerId===owner),total=items.reduce((n,i)=>n+i.quantity,0);
 return pageHead(vault?'公库':'行囊',vault?'IV':'III','<button class="button primary" data-new-item="'+(vault?'vault':'bag')+'" '+(!vault&&!char?'disabled':'')+'>＋ 记入物品</button>')+
 '<div class="inventory-frontispiece '+(vault?'vault':'')+'"><div><h3>'+h(vault?campaign().name:char?.name??'未登记角色')+'</h3><p class="inventory-count">'+items.length+' 项物品 <span>·</span> '+total+' 件</p>'+(!vault?'<button class="text-button" id="bag-character">切换角色</button>':'<span class="inventory-owner">全体角色共享</span>')+'</div><img class="page-junction" src="assets/'+(vault?'vault-junction-v8.png':'satchel-junction-v8.png')+'" alt="" aria-hidden="true"></div>'+
 '<div class="ledger-entries">'+(items.length?items.map((item,i)=>'<article class="item-row"><span class="item-index">'+String(i+1).padStart(2,'0')+'</span><div class="item-content"><h3 class="item-name">'+h(item.name)+'</h3><p class="item-description">'+h(item.description)+'</p>'+itemPicturesHTML(item)+'<div class="item-actions"><button class="text-button" data-edit-item="'+h(item.id)+'">编辑</button><button class="text-button" data-picture-item="'+h(item.id)+'">添图</button><button class="text-button transfer-button" data-transfer-item="'+h(item.id)+'">'+(vault?'← 领取':'存入 / 转交 →')+'</button></div></div><span class="quantity">× '+item.quantity+'</span></article>').join(''):empty('尚无物品',vault?'可从行囊存入，也可以直接记入。':char?'在此记录随身携带的物品。':'先登记或选择一个角色。'))+'</div>'+
 (vault&&campaign().history.length?'<details class="history-list"><summary>出入记录</summary><ol>'+campaign().history.slice(0,20).map(x=>'<li>'+h(x.text)+' <small>'+h(timeText(x.at))+'</small></li>').join('')+'</ol></details>':'');
}
function renderInventory(){return book(inventoryPage(false),inventoryPage(true),'inventory-book');}
function render(turn=null){
 const oldPage=turn&&!matchMedia('(prefers-reduced-motion: reduce)').matches?document.querySelector(turn==='backward'?'.page-left':'.page-right')?.cloneNode(true):null;
 if(mapCleanup){mapCleanup();mapCleanup=null;}mapFrame=null;
 const c=campaign(),char=currentCharacter();
 renderLibrary();
 $('#character-label').textContent=char?.name??'登记角色';$('#character-button .avatar').outerHTML=avatarHTML(char?.id);
 document.querySelectorAll('[data-view]').forEach(b=>{const active=b.dataset.view===(view==='vault'?'bag':view);b.classList.toggle('active',active);if(active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
 $('#main').innerHTML=view==='map'?renderMap():view==='journal'?renderJournal():renderInventory();
 bindContent();bindDiscussions();hydrateMap();hydratePictures();updateRoomStatus();if(openMarker&&view==='map')renderMapScroll();
 if(oldPage){
  oldPage.classList.add('turning-leaf',turn);oldPage.inert=true;oldPage.setAttribute('aria-hidden','true');oldPage.removeAttribute('id');oldPage.querySelectorAll('[id]').forEach(x=>x.removeAttribute('id'));
  document.querySelector('.book-spread').append(oldPage);
  oldPage.addEventListener('animationend',()=>oldPage.remove(),{once:true});setTimeout(()=>oldPage.remove(),850);
 }
}
function placePoint({x,y}){
 if(mapMode==='image'&&pendingPicture){const picture=pendingPicture;if(mutate(()=>{campaign().art??=[];campaign().art.push({id:uid('art'),mapId:selectedMap,kind:'image',...picture,x,y,size:.13,characterId:currentCharacter().id,authorMemberId:state.memberId,createdAt:new Date().toISOString()});})){pendingPicture=null;mapMode='marker';render();}return;}
 if(movingArt){if(mutate(()=>Object.assign(campaign().art.find(a=>a.id===movingArt),{x,y}),true)){movingArt=null;mapMode='marker';render();toast('贴图已移动',true);}return;}
 if(movingMarker){if(mutate(()=>Object.assign(campaign().markers.find(m=>m.id===movingMarker),{x,y}),true)){placing=false;movingMarker=null;render();toast('标注已移动',true);}}
 else markerForm(x,y);
}
function bindContent(){
 if($('#expand-journal'))$('#expand-journal').onclick=()=>setView('journal');
 if($('#return-map'))$('#return-map').onclick=()=>setView('map');
 if($('#bag-character'))$('#bag-character').onclick=showCharacters;
 if($('#sort-select'))$('#sort-select').onchange=e=>{if(!flushDraft())return;sort=e.target.value;selectedEntry=null;render();};
 if($('#author-select'))$('#author-select').onchange=e=>{if(!flushDraft())return;author=e.target.value;selectedEntry=null;render();};
 if($('#search-input'))$('#search-input').oninput=e=>{if(!flushDraft())return;const pos=e.target.selectionStart;search=e.target.value;render();$('#search-input').focus();$('#search-input').setSelectionRange(pos,pos);};
 ['#new-entry','#empty-new-entry'].forEach(s=>{if($(s))$(s).onclick=()=>beginEntry();});
 if($('#edit-entry'))$('#edit-entry').onclick=()=>beginEntry(selectedEntry);
 if($('#delete-entry'))$('#delete-entry').onclick=()=>deleteEntry();
 if($('#prev-entry'))$('#prev-entry').onclick=()=>turnEntry(-1);
 if($('#next-entry'))$('#next-entry').onclick=()=>turnEntry(1);
 document.querySelectorAll('[data-entry]').forEach(b=>b.onclick=()=>{if(!flushDraft())return;editing=null;selectedEntry=b.dataset.entry;render();});
 if(editing){
 ['#diary-body','#adventure-label','#adventure-order'].forEach(s=>{if($(s))$(s).oninput=()=>{editing.body=$('#diary-body').value;editing.adventureLabel=$('#adventure-label').value;$('#word-count').textContent=editing.body.length+' 字';$('#save-status').textContent='正在保存…';clearTimeout(saveTimer);saveTimer=setTimeout(saveDraft,450);};});
 $('#finish-edit').onclick=()=>{if(flushDraft()){editing=null;render();}};
 }
 ['#import-map','#empty-import-map'].forEach(s=>{if($(s))$(s).onclick=()=>$('#map-upload').click();});
 if($('#map-select'))$('#map-select').onchange=e=>{if(!flushDraft())return;editing=null;selectedMap=e.target.value;openMarker=null;selectedMarker=null;selectedEntry=null;render();};
 if($('#place-marker'))$('#place-marker').onclick=()=>{if(!flushDraft())return;editing=null;openMarker=null;placing=!placing;movingMarker=null;mapMode='marker';pendingPicture=null;render();};
 if($('#map-canvas'))mapCleanup=mountMap({stage:$('#map-stage'),canvas:$('#map-canvas'),key:campaign().id+':'+selectedMap,onPlace:placePoint,onMarker:openPlace,onBackground:()=>closeMapScroll(),onCameraChange:positionMapScroll,isPlacing:()=>placing,tool:()=>({mode:mapMode,color:inkColor,width:inkWidth}),onStroke:saveStroke,onArt:editArt});
 bindPenTools();
 if($('#map-tools-toggle'))$('#map-tools-toggle').onclick=()=>{const panel=$('#atlas-tools');panel.hidden=!panel.hidden;$('#map-tools-toggle').setAttribute('aria-expanded',String(!panel.hidden));};
 if($('#place-select'))$('#place-select').onchange=e=>{if(e.target.value){$('#atlas-tools').hidden=true;$('#map-tools-toggle').setAttribute('aria-expanded','false');openPlace(e.target.value);e.target.value='';}};
 if($('#rename-marker'))$('#rename-marker').onclick=()=>editMarker(openMarker??selectedMarker);
 document.querySelectorAll('[data-new-item]').forEach(b=>b.onclick=()=>itemForm(null,b.dataset.newItem==='vault'?null:currentCharacter()?.id));
 document.querySelectorAll('[data-edit-item]').forEach(b=>b.onclick=()=>itemForm(b.dataset.editItem));
 document.querySelectorAll('[data-picture-item]').forEach(b=>b.onclick=()=>itemForm(b.dataset.pictureItem));
 document.querySelectorAll('[data-view-picture]').forEach(b=>b.onclick=()=>viewItemPicture(b.dataset.viewPicture,Number(b.dataset.pictureIndex)));
 document.querySelectorAll('[data-transfer-item]').forEach(b=>b.onclick=()=>transferForm(b.dataset.transferItem));
}
function turnEntry(delta){const list=entriesForView(),i=list.findIndex(e=>e.id===selectedEntry);selectedEntry=list[i+delta]?.id??selectedEntry;renderDiaryTurn(delta);}
function renderDiaryTurn(delta){render();const leaf=$('.manuscript');if(leaf&&!matchMedia('(prefers-reduced-motion: reduce)').matches)leaf.animate([{opacity:.4,transform:'perspective(900px) rotateY('+(-delta*7)+'deg)'},{opacity:1,transform:'perspective(900px) rotateY(0deg)'}],{duration:300,easing:'ease-out'});}
function beginEntry(id){
 if(!flushDraft())return;
 const existing=campaign().entries.find(e=>e.id===id);
 if(!existing&&!currentCharacter()){showCharacters();return;}
 const c=campaign();editing=existing?structuredClone(existing):{id:uid('entry'),characterId:currentCharacter().id,authorMemberId:state.memberId,markerId:view==='map'?selectedMarker:null,body:'',adventureLabel:c.currentDate.label,adventureOrder:c.currentDate.order};

 editingBase=structuredClone(campaign());if(existing)selectedEntry=existing.id;author='';search='';render();$('#diary-body').focus();
}
function deleteEntry(){const entry=campaign().entries.find(e=>e.id===selectedEntry);if(!entry)return;dialog('移除这一页？','<p class="dialog-copy">将移除这篇手记及其回复与补充，地图上的地点会保留。完成后可以立即撤销。</p><div class="dialog-actions"><button class="button" id="cancel-delete">留下</button><button class="button danger" id="confirm-delete">移除手记</button></div>');$('#cancel-delete').onclick=closeDialog;$('#confirm-delete').onclick=()=>{if(mutate(()=>campaign().entries=campaign().entries.filter(e=>e.id!==entry.id),true)){closeDialog();selectedEntry=null;render();toast('手记已移除',true);}};}
function markerForm(x,y){if(!flushDraft())return;if(!currentCharacter()){showCharacters();return;}dialog('添加地图标注','<form id="marker-form"><div class="picture-byline">'+avatarHTML(currentCharacter().id)+'<span>'+h(currentCharacter().name)+'</span></div><label class="field">地点名称<input name="name" maxlength="100" required placeholder="这个地方叫什么？"></label><div class="dialog-actions"><button class="button primary">保存标注</button></div></form>');$('#marker-form').onsubmit=e=>{e.preventDefault();const name=new FormData(e.target).get('name').trim();if(!name)return;const id=uid('marker');if(mutate(()=>campaign().markers.push({id,mapId:selectedMap,name,x,y,characterId:currentCharacter()?.id??null}))){closeDialog();placing=false;selectedMarker=id;selectedEntry=null;render();if(currentCharacter())beginEntry();else showCharacters();}};}
function editMarker(id=selectedMarker){if(!flushDraft())return;const base=structuredClone(campaign()),marker=campaign().markers.find(m=>m.id===id);if(!marker)return;dialog('地点设置','<form id="marker-edit"><label class="field">地点名称<input name="name" maxlength="100" required value="'+h(marker.name)+'"></label><div class="dialog-actions"><button type="button" class="button" id="move-marker">移动位置</button><button type="button" class="button danger" id="remove-marker">移除标注</button><button class="button primary">保存</button></div><p class="inline-notice">移除标注会一并移除地点留言；日记及其回复仍保留，并解除地点关联。</p></form>');
 $('#marker-edit').onsubmit=e=>{e.preventDefault();const name=new FormData(e.target).get('name').trim();if(!name)return;if(applyDraft(base,c=>c.markers.find(m=>m.id===marker.id).name=name)){closeDialog();render();}};
 $('#move-marker').onclick=()=>{closeDialog();openMarker=null;movingMarker=marker.id;placing=true;render();};
 $('#remove-marker').onclick=()=>{if(mutate(()=>{const c=campaign();c.markers=c.markers.filter(m=>m.id!==marker.id);c.entries.filter(e=>e.markerId===marker.id).forEach(e=>e.markerId=null);},true)){closeDialog();selectedMarker=null;render();toast('标注已移除，日记保留',true);}};
}
$('#map-upload').onchange=async e=>{
 const file=e.target.files[0];e.target.value='';if(!file)return;if(!['image/jpeg','image/png','image/webp'].includes(file.type)){toast('请选择 JPG、PNG 或 WebP 图片');return;}if(file.size>12*1024*1024){toast('单张地图请控制在 12 MB 以内');return;}
 if(!flushDraft())return;
 const importCampaignId=campaign().id;try{
 const url=URL.createObjectURL(file);let image;try{image=await new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(new Error('无法读取这张图片'));im.src=url;});if(image.naturalWidth*image.naturalHeight>80000000)throw new Error('图片尺寸过大，请使用小于 8000 万像素的地图');}finally{URL.revokeObjectURL(url);}
 const id=uid('map');await storeBlob(id,file);
 if(mutate(()=>state.campaigns.find(c=>c.id===importCampaignId).maps.push({id,name:file.name.replace(/\.[^.]+$/,'').slice(0,100),asset:'blob:'+id}))){selectedMap=id;selectedMarker=null;selectedEntry=null;editing=null;view='map';render();toast('地图已导入，可以落下第一处标注');}
 }catch(err){toast('地图未保存：'+err.message);}
};
function itemForm(id,newOwner,draft,base=structuredClone(campaign())){
 const item=base.items.find(x=>x.id===id),owner=item?item.ownerId:newOwner;
 if(owner===undefined){showCharacters();return;}
 draft??={name:item?.name??'',quantity:item?.quantity??1,description:item?.description??'',images:structuredClone(item?.images??[])};
 dialog(item?'修改物品':'记入物品','<form id="item-form"><label class="field">物品名称<input name="name" maxlength="200" required value="'+h(draft.name)+'"></label><label class="field">数量<input name="quantity" type="number" min="1" max="999999" step="1" required value="'+draft.quantity+'"></label><label class="field">说明<textarea name="description" rows="4" maxlength="20000">'+h(draft.description)+'</textarea></label><div class="item-picture-editor">'+draft.images.map((im,i)=>'<div class="picture-slot"><img data-media="'+h(im.asset)+'" class="'+im.shape+'" alt="物品图片 '+(i+1)+'"><button type="button" class="text-button" data-drop-picture="'+i+'">移除图片</button></div>').join('')+'</div><button type="button" class="text-button attach-picture" id="item-add-picture" '+(draft.images.length>=8?'disabled':'')+'>＋ 添一张图片</button><div class="dialog-actions">'+(item?'<button type="button" class="text-button danger" id="remove-item">移除物品</button>':'')+'<button class="button primary">记入簿中</button></div></form>');
 const stash=()=>{const f=new FormData($('#item-form'));Object.assign(draft,{name:f.get('name'),quantity:Number(f.get('quantity')),description:f.get('description')});};
 $('#item-add-picture').onclick=()=>{stash();choosePicture(async(data,shape)=>{const imageId=uid('image');await storeBlob(imageId,dataBlob(data));draft.images.push({id:uid('photo'),asset:'blob:'+imageId,shape});itemForm(id,owner,draft,base);},()=>itemForm(id,owner,draft,base),'裁剪物品图片');};
 document.querySelectorAll('[data-drop-picture]').forEach(b=>b.onclick=()=>{stash();draft.images.splice(Number(b.dataset.dropPicture),1);itemForm(id,owner,draft,base);});
 $('#item-form').onsubmit=e=>{e.preventDefault();stash();const values={...draft,name:draft.name.trim()};if(!values.name||!Number.isSafeInteger(values.quantity)||values.quantity<1)return;if(applyDraft(base,c=>{if(item)Object.assign(c.items.find(x=>x.id===item.id),values);else c.items.push({id:uid('item'),ownerId:owner,...values});})){closeDialog();render();}};
 if($('#remove-item'))$('#remove-item').onclick=()=>{if(applyDraft(base,c=>c.items=c.items.filter(x=>x.id!==item.id),true)){closeDialog();render();toast('物品已移除',true);}};
 hydratePictures();
}
function transferForm(id){
 const item=campaign().items.find(x=>x.id===id);if(!item)return;
 const targets=campaign().characters.filter(c=>c.id!==item.ownerId);
 if(item.ownerId===null&&!targets.length){showCharacters();return;}
 dialog(item.ownerId===null?'从公库领取':'存入或交付','<form id="transfer-form"><p>'+h(item.name)+' <span class="quantity">× '+item.quantity+'</span></p><label class="field">交给<select name="target">'+(item.ownerId!==null?'<option value="">远征公库</option>':'')+targets.map(c=>'<option value="'+h(c.id)+'"'+selected(currentCharacter()?.id,c.id)+'>'+h(c.name)+'</option>').join('')+'</select></label><label class="field">数量<input name="quantity" type="number" min="1" max="'+item.quantity+'" step="1" required value="1"></label><p class="inline-notice">从原处扣除，并放入目标行囊或公库。</p><div class="dialog-actions"><button class="button primary">确认交付</button></div></form>');
 $('#transfer-form').onsubmit=e=>{e.preventDefault();const f=new FormData(e.target),target=f.get('target')||null,quantity=Number(f.get('quantity'));if(mutate(()=>transferItem(campaign(),item.id,target,quantity),true)){closeDialog();render();toast('物品已交付',true);}};
}
$('#settings-button').onclick=()=>{
 if(!flushDraft())return;
 const c=structuredClone(campaign());dialog('这段远征','<form id="settings-form"><label class="field">远征名称<input name="name" maxlength="100" required value="'+h(c.name)+'"></label><label class="field">当前冒险日期<input name="date" maxlength="100" required value="'+h(c.currentDate.label)+'"><small>新日记自动沿用；可以使用你自己的历法。</small></label><label class="field">当前冒险日序<input name="order" type="number" step="1" required value="'+c.currentDate.order+'"><small>按故事先后排序。日历名称随意，日序按旅程递增。</small></label><div class="room-settings"><button type="button" class="text-button" id="room-settings-button">'+(room?'邀请同伴 / 共享远征':'邀请同伴共享这段远征')+'</button><button type="button" class="text-button" id="owlbear-settings-button">Owlbear 扩展</button></div><div class="dialog-actions"><button type="button" id="settings-export" class="button">导出手记</button><button type="button" id="restore-button" class="button">导入备份</button><button class="button primary">保存设置</button></div></form>');
 $('#settings-form').onsubmit=e=>{e.preventDefault();const f=new FormData(e.target),name=f.get('name').trim(),date=f.get('date').trim(),order=Number(f.get('order'));if(!name||!date||!Number.isSafeInteger(order))return;if(applyDraft(c,desired=>{desired.name=name;desired.currentDate={label:date,order};})){closeDialog();render();}};
 $('#room-settings-button').onclick=showRoom;
 $('#owlbear-settings-button').onclick=showOwlbearSetup;
 $('#settings-export').onclick=()=>$('#export-button').click();
 $('#restore-button').onclick=()=>{if(room){toast('请先切换到私有远征，再恢复本机备份。共享房间不会被备份替换。');return;}$('#backup-upload').click();};
};
$('#about-button').onclick=()=>dialog('装帧与出处','<p class="dialog-copy">远征手记。私有时保存在当前设备；共享远征会同步手记、头像、地图绘图和物品图片。邀请链接持有者可以共同编辑，请只交给同伴。支持通过 Owlbear 扩展打开已绑定的共享远征。请定期导出完整备份。</p><ul class="source-list"><li><a href="https://www.thedigitalwalters.org/Data/WaltersManuscripts/html/W183/description.html" target="_blank" rel="noopener">沃尔特斯 W.183《时祷书》，126v</a><br>约 1460–1470，布鲁日；原抄本末尾的空白犊皮纸页。原扫描保留为研究素材；当前书页与卷轴使用以它为参考生成的暖象牙色犊皮纸纹理，不是馆藏原图。<a href="https://www.thedigitalwalters.org/01_ACCESS_WALTERS_MANUSCRIPTS.html" target="_blank" rel="noopener">数字图像开放许可：CC0</a>。</li><li><a href="https://www.metmuseum.org/art/collection/search/684184" target="_blank" rel="noopener">Simon Bening《时祷书》</a><br>约 1530–1535，Met，2015.706，8v–9r。图像为公共领域，依 Met Open Access 使用。仅作美术研究参考；新版界面不再裁切使用其边饰。</li><li><a href="https://www.loc.gov/item/2010588182/" target="_blank" rel="noopener">地中海及相连海域航海图</a><br>约 1550，美国国会图书馆。公共领域原图，显示时旋转至北向上。</li><li><a href="https://github.com/ENZO-II/expedition-journal" target="_blank" rel="noopener">项目源代码</a> · MIT License<br>第三方素材按各自许可使用。</li><li>建筑龛、地图装饰、手记页、金地花鸟、栏间花枝、书记员与翼龙、彩饰首字母、鸟兽目录、旅人行囊与守库小画、绘画式斜板书桌、纸面纹理、火漆及行囊与木箱是为本项目生成的辅助插画，不属于历史馆藏或游戏原素材。</li></ul>');
function download(name,content,type){const url=URL.createObjectURL(content instanceof Blob?content:new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
function markdown(){const c=exportSnapshot().campaigns.find(c=>c.id===campaign().id);return'# '+c.name+'\n\n'+sortEntries(c.entries,sort).map(e=>'## '+(e.adventureLabel||'日期未注明')+' · '+characterName(e.characterId)+'\n\n'+(campaign().markers.find(m=>m.id===e.markerId)?.name?'地点：'+campaign().markers.find(m=>m.id===e.markerId).name+'\n\n':'')+e.body+replyMarkdown(e)+'\n\n---\n写入：'+e.createdAt+' · 序号 '+e.sequence+'\n').join('\n')+c.markers.filter(m=>m.replies?.length).map(m=>'\n## 地点留言：'+m.name+replyMarkdown(m)).join('\n')+'\n## 物品清单\n\n'+c.items.map(i=>'- '+i.name+' × '+i.quantity+'（'+(i.ownerId===null?'公库':characterName(i.ownerId))+'）'+(i.description?'：'+i.description:'')).join('\n');}
async function exportBackup(){
 const snapshot=exportSnapshot(),images={};$('#save-status').textContent='正在整理备份…';
 try{for(const c of snapshot.campaigns)for(const m of mediaRefs(c)){if(m.asset.startsWith('blob:')&&!images[m.asset]){const blob=await readBlob(m.asset.slice(5),c);if(!blob)throw new Error('备份中缺少图片：'+(m.name??'附图'));images[m.asset]=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(blob);});}}
 download(safeName(campaign().name)+'-完整备份.json',JSON.stringify({format:'expedition-journal-backup',version:1,exportedAt:new Date().toISOString(),data:snapshot,images},null,2),'application/json');
 $('#save-status').textContent='完整备份已导出';toast('备份包含手记、回复、头像、物品图片、地图和笔迹');
 }catch(e){$('#save-status').textContent='备份失败';toast(e.message);}
}
$('#export-button').onclick=()=>{
 flushDraft();
 dialog('导出手记与备份','<p class="dialog-copy">阅读版导出当前远征的文字；完整备份收录所有远征的手记、回复、头像、地图、笔迹和物品图片。备份不包含邀请链接。</p><div class="export-options"><button class="button" id="export-md">导出 Markdown 文档</button><button class="button" id="export-html">导出可打印手记</button><button class="button primary" id="export-json">导出完整备份</button></div>');
 $('#export-md').onclick=()=>{download(safeName(campaign().name)+'.md',markdown(),'text/markdown;charset=utf-8');closeDialog();};
 $('#export-html').onclick=()=>{const c=exportSnapshot().campaigns.find(c=>c.id===campaign().id),html='<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>'+h(c.name)+'</title><style>body{max-width:760px;margin:50px auto;padding:30px;color:#352b28;font-family:serif;background:#faf5e8;line-height:2}h1{color:#702d38}article{border-top:1px solid #b89b61;padding:30px 0;break-inside:avoid}p{white-space:pre-wrap}small{color:#786b56}.byline{display:flex;align-items:center;gap:8px}.avatar{display:inline-grid;place-items:center;width:32px;height:32px;border-radius:50%;overflow:hidden;color:white}.avatar img{width:100%;height:100%;object-fit:cover}.reply{border-left:2px solid #b89b61;margin:20px 0 0 15px;padding-left:15px}@media print{body{margin:0;background:white}}</style><h1>'+h(c.name)+'</h1>'+sortEntries(c.entries,sort).map(e=>'<article><h2>'+h(e.adventureLabel||'日期未注明')+' · '+h(characterName(e.characterId))+'</h2><div class="byline">'+avatarHTML(e.characterId)+h(characterName(e.characterId))+'</div><p>'+h(e.body)+'</p><small>写于 '+h(e.createdAt)+' · 第 '+e.sequence+' 篇</small>'+replyPrintHTML(e)+'</article>').join('')+c.markers.filter(m=>m.replies?.length).map(m=>'<article><h2>地点留言：'+h(m.name)+'</h2>'+replyPrintHTML(m)+'</article>').join('')+'</html>';download(safeName(c.name)+'-阅读版.html',html,'text/html;charset=utf-8');closeDialog();};
 $('#export-json').onclick=()=>{closeDialog();exportBackup();};
};
$('#backup-upload').onchange=async e=>{
 const file=e.target.files[0];e.target.value='';if(!file)return;if(room){toast('请先切换到私有远征，再恢复本机备份。');return;}if(file.size>100*1024*1024){toast('备份超过 100 MB，暂不支持导入');return;}
 try{
 const parsed=JSON.parse(await file.text());if(parsed.format!=='expedition-journal-backup'||parsed.version!==1)throw new Error('不是受支持的备份');
 const data=validateData(parsed.data),images=parsed.images??{},needed=new Set(assetKeys(data.campaigns));
 for(const key of needed)if(typeof images[key]!=='string'||!/^data:image\/(png|jpeg|webp);base64,/.test(images[key])||images[key].length>18*1024*1024)throw new Error('备份缺少地图或包含无效图像');
 closeDialog();dialog('从备份恢复','<p class="dialog-copy">将用备份中的 '+data.campaigns.length+' 个战役替换当前设备的全部数据。建议先导出当前内容。</p><div class="dialog-actions"><button class="button" id="cancel-restore">取消</button><button class="button primary" id="confirm-restore">恢复这份备份</button></div>');
 $('#cancel-restore').onclick=closeDialog;
 $('#confirm-restore').onclick=async()=>{const button=$('#confirm-restore');button.disabled=true;button.textContent='正在恢复…';try{
 // New map IDs prevent overwriting old image blobs if restoring fails partway.
 for(const key of needed){const url=images[key],comma=url.indexOf(','),bytes=Uint8Array.from(atob(url.slice(comma+1)),x=>x.charCodeAt(0)),mime=url.slice(5,url.indexOf(';')),newId=uid('map');await storeBlob(newId,new Blob([bytes],{type:mime}));for(const c of data.campaigns)for(const m of mediaRefs(c))if(m.asset===key)m.asset='blob:'+newId;}
 room?.stop();room=null;roomStatus='local';const old=state;state=data;storageBlocked=false;if(!persist()){state=old;throw new Error('设备空间不足，未替换当前数据');}for(const c of data.campaigns)delete roomBindings[c.id];localStorage.setItem(KEY+'-rooms',JSON.stringify(roomBindings));history.replaceState(null,'',location.pathname+location.search);closeDialog();editing=null;selectedMap=null;selectedMarker=null;selectedEntry=null;author='';search='';undoSnapshot=null;render();toast('备份已恢复为私有手记');
 }catch(err){button.disabled=false;button.textContent='恢复这份备份';toast(err.message);}};
 }catch(err){toast('无法导入：'+err.message);}
};
window.addEventListener('pagehide',()=>flushDraft());
window.addEventListener('beforeunload',e=>{if(editing&&!flushDraft()){e.preventDefault();e.returnValue='';}});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')flushDraft();});
window.addEventListener('storage',e=>{
 if(e.key!==KEY||!e.newValue||room)return;
 if(editing){storageBlocked=true;$('#save-status').textContent='另一窗口更新了手记 · 请先导出当前备份';toast('另一窗口已有更新。为避免覆盖，当前编辑暂停保存，请导出备份后刷新。');return;}
 try{state=validateData(JSON.parse(e.newValue));undoSnapshot=null;render();toast('已同步此设备另一窗口的更新');}catch{}
});
if(!storageBlocked){try{if(!localStorage.getItem(KEY))persist();}catch{storageBlocked=true;}}
render();startupShared().finally(()=>{if(firstVisit&&!parseInvite(location.href)&&!storageBlocked)showWelcome();});
// The SDK must subscribe before iframe load: a cached reopen can otherwise miss OBR_READY.
if(new URLSearchParams(location.search).get('embed')==='owlbear')mountOwlbearBook({beforeClose:flushDraft,onError:toast});
if(storageBlocked){$('#save-status').textContent='原有数据读取失败 · 已暂停覆盖';toast('原有数据无法读取。为保护内容，已暂停自动保存。可从设置导入备份。');}

function exportSnapshot(){
 const snapshot=structuredClone(state);
 if(editing&&$('#diary-body')){editing.body=$('#diary-body').value;editing.adventureLabel=$('#adventure-label').value;const order=$('#adventure-order').value;editing.adventureOrder=order.trim()===''?null:Number(order);}
 if(editing&&editing.body.trim()){
  const c=snapshot.campaigns.find(c=>c.id===campaign().id),old=c.entries.find(e=>e.id===editing.id),now=new Date().toISOString();
  if(old)Object.assign(old,{body:editing.body,adventureLabel:editing.adventureLabel,adventureOrder:editing.adventureOrder,updatedAt:now});
  else c.entries.push({...editing,sequence:snapshot.nextSequence++,createdAt:now,updatedAt:now});
 }
 return snapshot;
}
const modelContext=document.modelContext;
if(modelContext?.registerTool){
 const lifecycle=new AbortController();
 for(const tool of [
 {name:'read_current_campaign',title:'读取当前远征',description:'Read the current campaign and journal index. Does not modify data.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:true},execute(input){if(input&&Object.keys(input).length)throw new Error('No arguments accepted');const c=campaign();return{name:c.name,storage:room?'shared room':'device-local',characters:c.characters.map(x=>({id:x.id,name:x.name})),entries:sortEntries(c.entries,sort).map(x=>({id:x.id,character:characterName(x.characterId),adventureDate:x.adventureLabel,createdAt:x.createdAt,excerpt:x.body.slice(0,120)}))};}},
 {name:'open_journal_entry',title:'翻开一篇手记',description:'Navigate to an existing journal entry in the current campaign. Does not create or edit a journal.',inputSchema:{type:'object',properties:{entryId:{type:'string'}},required:['entryId'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute(input){if(!input||typeof input.entryId!=='string'||Object.keys(input).some(k=>k!=='entryId'))throw new Error('Invalid entryId');if(editing)throw new Error('Finish the current draft first');if(!campaign().entries.some(x=>x.id===input.entryId))throw new Error('Entry not found');view='journal';author='';search='';selectedEntry=input.entryId;render();return{opened:true,entryId:selectedEntry};}}
 ]){try{Promise.resolve(modelContext.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}}
 window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
}

function dataBlob(data){const comma=data.indexOf(','),bytes=Uint8Array.from(atob(data.slice(comma+1)),x=>x.charCodeAt(0));return new Blob([bytes],{type:data.slice(5,data.indexOf(';'))});}
function choosePicture(save,cancel,title){pictureCallback=save;pictureCancel=cancel;$('#picture-upload').dataset.title=title;$('#picture-upload').value='';$('#picture-upload').click();}
$('#picture-upload').onchange=async e=>{
 const file=e.target.files[0];e.target.value='';if(!file)return;
 const save=pictureCallback,cancel=pictureCancel;
 dialog(e.target.dataset.title,'<div id="picture-crop-host">正在读取图片…</div>');const version=dialogVersion;
 try{const cleanup=await mountAvatarCrop($('#picture-crop-host'),file,{shapes:['circle','square'],initialShape:'square',outputSize:512,label:'图片',onCancel:cancel,onError:toast,onSave:async(data,shape)=>{
  const button=$('#crop-save');button.disabled=true;button.textContent='正在收存…';try{await save(data,shape);}catch(error){toast(error.message);if(button.isConnected){button.disabled=false;button.textContent='使用这张图片';}}
 }});if(version!==dialogVersion)cleanup?.();else dialogCleanup=cleanup;
 }catch(error){cancel();toast(error.message);}
};
async function hydratePictures(){
 const nodes=[...document.querySelectorAll('img[data-media]')];
 for(const image of nodes){const asset=image.dataset.media;try{if(!blobUrls.has(asset)){const blob=await readBlob(asset.slice(5));if(!blob)throw new Error('图片未找到，请从完整备份恢复');blobUrls.set(asset,URL.createObjectURL(blob));}if(image.isConnected)image.src=blobUrls.get(asset);}catch(error){if(image.isConnected){image.alt='图片暂时无法读取';image.closest('.picture-slot')?.classList.add('unavailable');}}}
}
function itemPicturesHTML(item){return '<div class="item-pictures">'+(item.images??[]).map((im,i)=>'<button class="picture-thumb '+im.shape+'" data-view-picture="'+h(item.id)+'" data-picture-index="'+i+'" aria-label="查看'+h(item.name)+'的图片 '+(i+1)+'"><img data-media="'+h(im.asset)+'" alt="'+h(item.name)+' · 图片 '+(i+1)+'" draggable="false"></button>').join('')+'</div>';}
function viewItemPicture(id,index){const item=campaign().items.find(x=>x.id===id),im=item?.images?.[index];if(!im)return;dialog(item.name,'<figure class="picture-view"><img class="'+im.shape+'" data-media="'+h(im.asset)+'" alt="'+h(item.name)+'"><figcaption>'+h(item.description)+'</figcaption></figure>');hydratePictures();}
function mapArtHTML(){const art=(campaign().art??[]).filter(a=>a.mapId===selectedMap);return '<svg class="map-ink" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-label="玩家绘制的地图笔迹">'+art.filter(a=>a.kind==='stroke').map(a=>'<path d="'+strokePath(a.points)+'" fill="none" stroke="'+h(a.color)+'" stroke-width="'+a.width+'" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"><title>'+h(characterName(a.characterId))+' 的笔迹</title></path>').join('')+'</svg>'+art.filter(a=>a.kind==='image').map(a=>'<button class="map-art-image '+a.shape+'" data-art="'+h(a.id)+'" style="left:'+a.x*100+'%;top:'+a.y*100+'%;width:'+a.size*100+'%" aria-label="'+h(characterName(a.characterId))+'的地图贴图"><img data-media="'+h(a.asset)+'" alt="'+h(characterName(a.characterId))+'的地图贴图" draggable="false"><span class="art-signature">'+avatarHTML(a.characterId)+'</span></button>').join('');}
function penPaletteHTML(){return '<div class="pen-palette" id="pen-palette" '+(mapMode==='ink'?'':'hidden')+'><fieldset class="ink-colors"><legend>墨色</legend>'+[['#30291f','墨黑'],['#a1372d','朱红'],['#244f87','青金石'],['#3f6849','草绿']].map(([color,label])=>'<button type="button" data-ink-color="'+color+'" style="--ink:'+color+'" aria-label="'+label+'" aria-pressed="'+(inkColor===color)+'"><span aria-hidden="true"></span></button>').join('')+'</fieldset><label class="ink-width">笔宽<select id="ink-width"><option value="2"'+selected(inkWidth,2)+'>细</option><option value="3"'+selected(inkWidth,3)+'>中</option><option value="6"'+selected(inkWidth,6)+'>粗</option></select></label><div class="pen-actions"><button class="text-button" id="map-paste">贴入图片</button><button class="text-button" id="ink-undo">撤去我的上一笔</button><button class="text-button" id="ink-done">收笔</button></div></div>'+(mapMode==='image'||movingArt?'<div class="map-placement-note">点地图选择贴图位置 <button class="text-button" id="cancel-picture-place">取消</button></div>':'');}
function bindPenTools(){
 if($('#map-pen'))$('#map-pen').onclick=()=>{if(!flushDraft())return;if(!currentCharacter()){showCharacters();return;}editing=null;openMarker=null;placing=false;movingMarker=null;mapMode=mapMode==='ink'?'marker':'ink';render();};
 document.querySelectorAll('[data-ink-color]').forEach(b=>b.onclick=()=>{inkColor=b.dataset.inkColor;document.querySelectorAll('[data-ink-color]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));});
 if($('#ink-width'))$('#ink-width').onchange=e=>inkWidth=Number(e.target.value);
 if($('#ink-done'))$('#ink-done').onclick=()=>{mapMode='marker';render();};
 if($('#map-paste'))$('#map-paste').onclick=()=>choosePicture(async(data,shape)=>{const id=uid('image');await storeBlob(id,dataBlob(data));pendingPicture={asset:'blob:'+id,shape};mapMode='image';closeDialog();render();},()=>{closeDialog();render();},'裁剪地图贴图');
 if($('#cancel-picture-place'))$('#cancel-picture-place').onclick=()=>{pendingPicture=null;movingArt=null;mapMode='marker';render();};
 if($('#ink-undo'))$('#ink-undo').onclick=()=>{const last=(campaign().art??[]).findLast(a=>a.mapId===selectedMap&&a.characterId===currentCharacter()?.id&&a.kind==='stroke');if(!last){toast('还没有你的笔迹');return;}if(mutate(()=>campaign().art=campaign().art.filter(a=>a.id!==last.id),true)){render();toast('上一笔已撤去',true);}};
}
function saveStroke(stroke){if(!currentCharacter()){showCharacters();return;}if(mutate(()=>{campaign().art??=[];campaign().art.push({id:uid('art'),mapId:selectedMap,kind:'stroke',...stroke,characterId:currentCharacter().id,authorMemberId:state.memberId,createdAt:new Date().toISOString()});},true))render();}
function editArt(id){const base=structuredClone(campaign()),art=campaign().art?.find(a=>a.id===id);if(!art)return;dialog('地图贴图','<div class="picture-byline">'+avatarHTML(art.characterId)+'<span>'+h(characterName(art.characterId))+'</span></div><figure class="picture-view"><img data-media="'+h(art.asset)+'" class="'+art.shape+'" alt="地图贴图"></figure><form id="art-form"><label class="field">大小<input type="range" name="size" min="0.02" max="0.5" step="0.01" value="'+art.size+'"></label><div class="dialog-actions"><button type="button" class="text-button" id="move-art">移动</button><button type="button" class="text-button danger" id="remove-art">移除</button><button class="button primary">保存</button></div></form>');hydratePictures();$('#art-form').onsubmit=e=>{e.preventDefault();const size=Number(new FormData(e.target).get('size'));if(applyDraft(base,c=>c.art.find(a=>a.id===id).size=size)){closeDialog();render();}};$('#move-art').onclick=()=>{movingArt=id;mapMode='move-art';closeDialog();render();};$('#remove-art').onclick=()=>{if(mutate(()=>campaign().art=campaign().art.filter(a=>a.id!==id),true)){closeDialog();render();toast('贴图已移除',true);}};}

function updateRoomStatus(){
 const shared=Boolean(roomBindings[campaign().id])||room&&room.ack?.id===campaign().id;
 $('.edition').textContent=shared?'共享远征 · '+campaign().name:'私有手记 · '+campaign().name;
 $('#save-status').textContent=storageBlocked?'未保存 · 请先导出备份':saveIssue|| (roomLoading?'正在打开共享远征…':shared?({saved:'已同步',pending:'正在同步…',offline:'连接中断 · 修改已留存，等待重连',conflict:'同步暂停 · 请处理差异',local:'连接失败 · 请重新打开共享版本'}[roomStatus]??'正在连接…'):'已保存在此设备');
 const retry=$('#room-status-action');if(retry){retry.hidden=!shared||!['offline','conflict','local'].includes(roomStatus);retry.textContent=roomStatus==='conflict'?'处理差异':'重新连接';}
}
function receiveRoom(c){
 const index=state.campaigns.findIndex(x=>x.id===c.id);if(index<0)state.campaigns.push(c);else state.campaigns[index]=c;
 state.currentCampaignId=c.id;state.nextSequence=Math.max(state.nextSequence,...state.campaigns.flatMap(c=>c.entries.map(e=>e.sequence+1)));
 try{localStorage.setItem(KEY,JSON.stringify(state));}catch{toast('本机缓存空间不足，请导出备份');}
 if(!editing&&!$('#dialog').open&&!$('#map-stage')?.classList.contains('inking'))render();
}
async function connectRoom(invite,register=false){
 const cached=state.campaigns.find(c=>JSON.stringify(roomBindings[c.id])===JSON.stringify(invite));
 room?.stop();room=null;roomLoading=true;roomStatus='pending';updateRoomStatus();let client;
 try{
  client=new RoomClient(invite,{key:KEY+'-outbox-'+invite.id,onCampaign:c=>{if(room===client)receiveRoom(c);},onStatus:status=>{if(room===client){roomStatus=status;updateRoomStatus();}},onConflict:message=>toast(message)});room=client;
  try{await client.start();}catch(error){if(cached&&!error.status){client.startOffline(cached);}else throw error;}
  if(room!==client)return false;roomBindings[client.ack.id]=invite;localStorage.setItem(KEY+'-rooms',JSON.stringify(roomBindings));roomLoading=false;history.replaceState(null,'','#room='+invite.id+'.'+invite.token);render();if(register&&!currentCharacter())showCharacters();return true;
 }catch(error){if(client&&room!==client)return false;client?.stop();room=null;roomLoading=false;roomStatus='local';updateRoomStatus();toast('未能打开共享远征：'+error.message);return false;}
}
function connectSavedRoom(){const invite=roomBindings[campaign().id];if(invite){return connectRoom(invite);}room?.stop();room=null;roomLoading=false;roomStatus='local';history.replaceState(null,'',location.pathname+location.search);updateRoomStatus();}
async function startupShared(){
 try{const response=await fetch('/api/health',{signal:AbortSignal.timeout(8000)});apiAvailable=response.ok;}catch{apiAvailable=false;}
 const invite=parseInvite(location.href);if(invite){if(apiAvailable)await connectRoom(invite,true);else toast('这个地址尚未启用共享服务');}else if(roomBindings[campaign().id])connectSavedRoom();
}
function cloneForRoom(source){
 const c=structuredClone(source),ids=new Map();c.bookId=source.bookId??source.id;const scan=v=>{if(!v||typeof v!=='object')return;if(v.id&&!ids.has(v.id))ids.set(v.id,uid(v.id.split('_')[0]));for(const x of Object.values(v))if(typeof x==='object')if(Array.isArray(x))x.forEach(scan);else scan(x);};scan(c);
 const convert=v=>{if(!v||typeof v!=='object')return;for(const[key,x]of Object.entries(v)){if(['id','mapId','characterId','markerId','ownerId','parentId'].includes(key)&&ids.has(x))v[key]=ids.get(x);else if(Array.isArray(x))x.forEach(convert);else if(typeof x==='object')convert(x);}};convert(c);return{campaign:c,characterId:ids.get(currentCharacter()?.id)};
}
function showRoom(){
 if(!room?.paused&&!flushDraft())return;toggleLibrary(false);
 if(room?.paused){dialog('同步差异','<p>有人同时修改了同一项。你的待同步内容仍保存在此设备，可先导出一份副本。</p><div class="dialog-actions"><button class="button" id="conflict-export">导出我的副本</button><button class="button primary" id="conflict-adopt">采用房间版本</button></div><p class="inline-notice">采用后，待同步修改仍留在本机恢复副本中，不会覆盖同伴的记录。</p>');$('#conflict-export').onclick=exportBackup;$('#conflict-adopt').onclick=async()=>{try{clearTimeout(saveTimer);editing=null;await room.adoptRoom();closeDialog();render();}catch(error){toast(error.message);}};return;}
 if(room){const invite=location.origin+location.pathname+'#room='+room.id+'.'+room.token;dialog('邀请同伴','<p>'+h(campaign().name)+'</p><label class="field">邀请链接<input id="room-link" readonly value="'+h(invite)+'"></label><p class="inline-notice">持有链接的同伴可以共同编辑这段远征。只交给团里的玩家。</p><div class="dialog-actions"><button class="button primary" id="copy-invite">复制邀请链接</button></div>');$('#copy-invite').onclick=async()=>{try{await navigator.clipboard.writeText(invite);toast('邀请链接已复制');}catch{$('#room-link').select();toast('请复制已选中的邀请链接');}};return;}
 const existing=relatedShared(state.campaigns,roomBindings,campaign().id);
 if(!room&&existing){dialog('共享版本','<p>这段远征已有共享版本。私有手记与共享记录分别保存。</p><div class="dialog-actions"><button class="button primary" id="open-existing-room">打开共享版本</button></div>');$('#open-existing-room').onclick=()=>{closeDialog();switchCampaign(existing.id);};return;}
 dialog('共享远征','<p>将当前这段远征复制成共享房间，手记、头像、地图笔迹和物品图片一并带过去。</p><div class="dialog-actions"><button class="button primary" id="create-room" '+(apiAvailable?'':'disabled')+'>创建共享远征</button></div>'+(!apiAvailable?'<p class="inline-notice">当前地址暂未启用共享服务。私有手记仍可使用。</p>':'')+'<form id="join-room-form"><label class="field">已有邀请链接<input name="invite" required placeholder="粘贴同伴给你的完整链接"></label><button class="text-button">加入远征</button></form>');
 $('#create-room').onclick=async()=>{const button=$('#create-room');button.disabled=true;button.textContent='正在收存…';const original=campaign(),copy=cloneForRoom(original);try{
  const response=await fetch('/api/rooms',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({campaign:copy.campaign})}),data=await response.json();if(!response.ok)throw new Error(data.error);
  const client=new RoomClient(data,{key:KEY+'-outbox-'+data.id,onCampaign:()=>{},onStatus:()=>{},onConflict:()=>{}});
  for(const key of assetKeys([original])){const blob=await readBlob(key.slice(5));if(!blob)throw new Error('有一张图片尚未读取，请先恢复完整备份');await client.upload(key.slice(5),blob);}client.stop();
  state.currentCharacterByCampaign[copy.campaign.id]=copy.characterId;if(await connectRoom({id:data.id,token:data.token})){closeDialog();showRoom();}
 }catch(error){button.disabled=false;button.textContent='创建共享远征';toast(error.message);}};
 $('#join-room-form').onsubmit=e=>{e.preventDefault();const invite=parseInvite(new FormData(e.target).get('invite'));if(!invite){toast('请粘贴完整的远征邀请链接');return;}closeDialog();connectRoom(invite,true);};
}
$('#room-status-action').onclick=()=>room?.paused?showRoom():connectSavedRoom();


function toggleLibrary(force){
 libraryOpen=force??!libraryOpen;
 $('#campaign-menu').hidden=!libraryOpen;
 $('#campaign-button').setAttribute('aria-expanded',String(libraryOpen));
}
function renderLibrary(){
 const active=campaign(),books=arrangeLibrary(state.campaigns,roomBindings);
 $('#campaign-name').textContent=active.name;
 $('#campaign-list').innerHTML=books.map(book=>{
  const current=book.variants.some(v=>v.campaign.id===active.id),title=current?active.name:book.name;
  return '<details class="library-book"'+(current?' open':'')+'><summary><span>'+h(title)+'</span></summary><div class="library-variants">'+book.variants.map(v=>
   '<div class="library-variant"><button type="button" class="library-choice" data-library-campaign="'+h(v.campaign.id)+'" aria-current="'+(v.campaign.id===active.id)+'"><span class="access-mark '+v.access+'" aria-hidden="true"></span><span><strong>'+h(v.label)+'</strong><small>'+(v.access==='shared'?'同伴共同编辑':'仅保存在这台设备')+'</small></span><span class="library-tick" aria-hidden="true">'+(v.campaign.id===active.id?'✓':'')+'</span></button>'+(v.access==='shared'?'<button class="text-button library-invite" data-library-invite="'+h(v.campaign.id)+'">邀请同伴</button>':'')+'</div>'
  ).join('')+(!book.variants.some(v=>v.access==='shared')?'<button class="text-button library-share" data-library-share="'+h(book.variants[0].campaign.id)+'">建立共享版本</button>':'')+'</div></details>';
 }).join('');
 document.querySelectorAll('[data-library-campaign]').forEach(b=>b.onclick=()=>switchCampaign(b.dataset.libraryCampaign));
 document.querySelectorAll('[data-library-invite]').forEach(b=>b.onclick=async()=>{if(await switchCampaign(b.dataset.libraryInvite))showRoom();});
 document.querySelectorAll('[data-library-share]').forEach(b=>b.onclick=async()=>{if(await switchCampaign(b.dataset.libraryShare))showRoom();});
 toggleLibrary(libraryOpen);
}
async function switchCampaign(id){
 if(!state.campaigns.some(c=>c.id===id)||roomLoading)return false;
 if(id===campaign().id){toggleLibrary(false);return true;}
 if(!flushDraft())return false;
 if(!mutate(()=>state.currentCampaignId=id))return false;
 selectedMap=null;selectedMarker=null;selectedEntry=null;openMarker=null;author='';search='';editing=null;
 placing=false;movingMarker=null;mapMode='marker';pendingPicture=null;movingArt=null;undoSnapshot=null;
 toggleLibrary(false);const pending=connectSavedRoom();render();
 if(pending)await pending;return Boolean(!roomBindings[id]||room?.ack?.id===id);
}
function showJoinRoom(){
 if(!flushDraft())return;toggleLibrary(false);
 dialog('加入共享远征','<form id="join-library-form"><label class="field">邀请链接<input name="invite" type="url" required placeholder="粘贴同伴给你的完整链接"></label><p class="inline-notice">加入后，这段远征会收进上方名册的“共享”子项。</p><div class="dialog-actions"><button class="button primary">加入远征</button></div></form>');
 $('#join-library-form').onsubmit=async e=>{e.preventDefault();const input=new FormData(e.target).get('invite').trim(),invite=parseInvite(input);let url;try{url=new URL(input);}catch{}
  if(!invite||url?.origin!==location.origin){toast('请使用当前网站的完整远征邀请链接。');return;}
  const button=e.target.querySelector('button');button.disabled=true;button.textContent='正在打开…';
  if(await connectRoom(invite,false)){closeDialog();if(!currentCharacter())showCharacters();}else{button.disabled=false;button.textContent='加入远征';}
 };
}
function showWelcome(){
 dialog('开始使用远征手记','<p class="welcome-copy">为你的西征团新建一段远征，或加入同伴已有的共享记录。</p><div class="welcome-actions"><button class="button primary" id="welcome-create">新建远征</button><button class="button" id="welcome-join">加入共享远征</button><button class="text-button" id="welcome-demo">试读演示</button></div>');
 $('#welcome-create').onclick=()=>{closeDialog();$('#new-campaign').click();};
 $('#welcome-join').onclick=showJoinRoom;
 $('#welcome-demo').onclick=()=>{closeDialog();toast('当前是演示远征。新建远征后可以登记自己的角色。');};
}
function showOwlbearSetup(){
 const manifest=manifestURL(location.origin),local=['127.0.0.1','localhost'].includes(location.hostname);
 dialog('Owlbear 扩展','<p>在枭熊的扩展管理中添加下面的安装链接。进入房间后，主持人可以绑定这段远征的共享版本。</p><label class="field">安装链接<input readonly id="owlbear-install-link" value="'+h(manifest)+'"></label>'+(local?'<p class="inline-notice">当前是本机调试地址。上线后，安装链接会使用正式网站地址，其他玩家才可以一同打开。</p>':'')+'<div class="dialog-actions"><button class="button primary" id="copy-owlbear-install">复制安装链接</button><a class="text-button" href="https://extensions.owlbear.rodeo/guide" target="_blank" rel="noopener noreferrer">查看安装步骤</a></div>');
 $('#copy-owlbear-install').onclick=async()=>{try{await navigator.clipboard.writeText(manifest);toast('安装链接已复制');}catch{$('#owlbear-install-link').select();toast('请复制已选中的安装链接');}};
}
