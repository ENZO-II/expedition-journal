import{VERSION,uid,escapeHtml as h,sortEntries,transferItem,validateData,createCampaign,demoState}from'./domain.js';
const $=s=>document.querySelector(s),KEY=(location.hostname==='127.0.0.1'&&new URLSearchParams(location.search).has('qa')?'expedition-journal-qa-v1':'expedition-journal-v1'),COLORS=['#702d38','#283d59','#416044','#88552f','#655080'];
let state,storageBlocked=false;
try{const raw=localStorage.getItem(KEY);state=raw?validateData(JSON.parse(raw)):demoState();}catch(e){state=demoState();storageBlocked=true;}
let view='map',selectedMap=null,selectedMarker='marker_begin',selectedEntry='entry_begin',sort='adventure',author='',search='',editing=null,placing=false,movingMarker=null,zoom=100,saveTimer,toastTimer,undoSnapshot=null;
const blobs=new Map(),blobUrls=new Map();
const dbPromise=new Promise((resolve,reject)=>{const request=indexedDB.open('expedition-journal-assets',1);request.onupgradeneeded=()=>request.result.createObjectStore('maps');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
dbPromise.catch(()=>{});
const campaign=()=>state.campaigns.find(c=>c.id===state.currentCampaignId)??state.campaigns[0];
const currentCharacter=()=>campaign().characters.find(c=>c.id===state.currentCharacterByCampaign?.[campaign().id]);
const characterName=id=>campaign().characters.find(c=>c.id===id)?.name??'未署名';
const characterColor=id=>campaign().characters.find(c=>c.id===id)?.color??COLORS[0];
const timeText=value=>new Intl.DateTimeFormat('zh-CN',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(value));
const safeName=s=>s.replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').slice(0,80)||'远征手记';
const selected=(a,b)=>a===b?' selected':'';
const empty=(title,body,button='')=>'<div class="empty-state"><span class="ornament" aria-hidden="true">❧</span><h2>'+h(title)+'</h2><p>'+h(body)+'</p>'+button+'</div>';
function toast(message,undo=false){$('#toast').innerHTML=h(message)+(undo?' <button id="undo-action" class="toast-undo">撤销</button>':'');$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),undo?12000:4200);if(undo)$('#undo-action').onclick=undoLast;}
function persist(){
 if(storageBlocked){$('#save-status').textContent='未保存 · 请先导出备份';return false;}
 try{state.revision=(state.revision??0)+1;localStorage.setItem(KEY,JSON.stringify(state));$('#save-status').textContent='已保存在此设备';return true;}catch(e){$('#save-status').textContent='保存失败 · 请导出备份';toast('设备存储不可用或已满，请先导出备份。');return false;}
}
function mutate(fn,undo=false){const before=structuredClone(state);try{fn();if(!persist()){state=before;return false;}undoSnapshot=undo?before:null;if(!undo)$('#undo-action')?.remove();return true;}catch(e){state=before;toast(e.message);return false;}}
function undoLast(){if(!undoSnapshot)return;const previous=state;state=undoSnapshot;undoSnapshot=null;if(!persist()){undoSnapshot=state;state=previous;return;}editing=null;render();toast('已撤销上一步');}
async function storeBlob(id,blob){const db=await dbPromise;await new Promise((resolve,reject)=>{const tx=db.transaction('maps','readwrite');tx.objectStore('maps').put(blob,id);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});blobs.set(id,blob);}
async function readBlob(id){if(blobs.has(id))return blobs.get(id);const db=await dbPromise;return new Promise((resolve,reject)=>{const request=db.transaction('maps').objectStore('maps').get(id);request.onsuccess=()=>{if(request.result)blobs.set(id,request.result);resolve(request.result);};request.onerror=()=>reject(request.error);});}
async function hydrateMap(){const image=$('#custom-map-image');if(!image)return;const asset=image.dataset.asset;try{if(!blobUrls.has(asset)){const blob=await readBlob(asset.slice(5));if(!blob)throw new Error('未找到此地图图片，请从完整备份恢复。');blobUrls.set(asset,URL.createObjectURL(blob));}if(image.isConnected)image.src=blobUrls.get(asset);}catch(e){if(image.isConnected){image.alt=e.message;toast(e.message);}}}
function closeDialog(){$('#dialog').close();}
function dialog(title,html){$('#dialog-title').textContent=title;$('#dialog-content').innerHTML=html;$('#dialog').showModal();setTimeout(()=>$('#dialog-content input:not([type=hidden]),#dialog-content button')?.focus(),0);}
$('#close-dialog').onclick=closeDialog;
$('#dialog').addEventListener('click',e=>{if(e.target===$('#dialog')){const r=$('#dialog').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeDialog();}});
function flushDraft(){if(!editing)return true;clearTimeout(saveTimer);return saveDraft();}
function saveDraft(){
 if(!editing)return true;
 const body=$('#diary-body')?.value??editing.body,label=$('#adventure-label')?.value??editing.adventureLabel,orderText=$('#adventure-order')?.value;
 const order=orderText===undefined?editing.adventureOrder:orderText.trim()===''?null:Number(orderText);
 if(order!==null&&!Number.isSafeInteger(order)){$('#save-status').textContent='日序需要填写整数';return false;}
 const before=structuredClone(state),now=new Date().toISOString(),c=campaign();let entry=c.entries.find(e=>e.id===editing.id);
 const values={body,adventureLabel:label,adventureOrder:order,updatedAt:now};
 if(!entry&&body.trim()){entry={...editing,...values,sequence:state.nextSequence++,createdAt:now};c.entries.push(entry);}
 else if(entry)Object.assign(entry,values);
 Object.assign(editing,values);
 if(!entry){$('#save-status').textContent='空白草稿';return true;}
 if(!persist()){state=before;return false;}selectedEntry=entry.id;return true;
}
function setView(next){if(!flushDraft())return;editing=null;placing=false;movingMarker=null;view=next;render();}
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));
$('#campaign-select').onchange=e=>{if(!flushDraft()){e.target.value=campaign().id;return;}mutate(()=>state.currentCampaignId=e.target.value);selectedMap=null;selectedMarker=null;selectedEntry=null;author='';search='';editing=null;zoom=100;render();};
$('#new-campaign').onclick=()=>{if(!flushDraft())return;dialog('创建战役','<form id="campaign-form"><label class="field">战役名称<input name="name" maxlength="100" required placeholder="为这一段旅程命名"></label><p class="dialog-copy">新战役拥有自己的角色、地图、日记与公库。目前保存于此设备。</p><div class="dialog-actions"><button class="button primary">创建战役</button></div></form>');$('#campaign-form').onsubmit=e=>{e.preventDefault();const name=new FormData(e.target).get('name').trim();if(!name)return;if(mutate(()=>{const c=createCampaign(name);state.campaigns.push(c);state.currentCampaignId=c.id;})){closeDialog();editing=null;selectedMap=null;selectedMarker=null;selectedEntry=null;author='';search='';view='map';render();showCharacters();}};};
function showCharacters(){
 if(!flushDraft())return;
 const c=campaign(),active=currentCharacter();
 dialog('角色名册','<p class="dialog-copy">'+h(c.name)+' · 角色名册</p><div>'+c.characters.map(x=>'<button class="character-option '+(x.id===active?.id?'selected':'')+'" data-character="'+h(x.id)+'"><span class="avatar" style="background:'+x.color+'">'+h(x.name[0])+'</span><span>'+h(x.name)+'</span>'+(x.id===active?.id?'<small>当前角色</small>':'')+'</button>').join('')+'</div><form id="character-form" class="character-form"><label class="sr-only" for="character-name">新角色姓名</label><input id="character-name" name="name" maxlength="60" required placeholder="新角色姓名"><button class="button primary">登记</button></form><p class="inline-notice">可登记多个角色，切换后查看各自的行囊。这是本设备的角色名册，尚未启用多人身份验证。</p>');
 document.querySelectorAll('[data-character]').forEach(b=>b.onclick=()=>{if(mutate(()=>{state.currentCharacterByCampaign[c.id]=b.dataset.character;})){editing=null;closeDialog();render();}});
 $('#character-form').onsubmit=e=>{e.preventDefault();const name=new FormData(e.target).get('name').trim();if(!name)return;const char={id:uid('character'),name,color:COLORS[c.characters.length%COLORS.length]};if(mutate(()=>{campaign().characters.push(char);state.currentCharacterByCampaign[c.id]=char.id;})){editing=null;closeDialog();render();toast('已登记角色：'+name);}};
}
$('#character-button').onclick=showCharacters;
function filters(){return'<div class="filters"><label class="sr-only" for="sort-select">排列方式</label><select id="sort-select"><option value="adventure"'+selected(sort,'adventure')+'>按冒险时间</option><option value="written"'+selected(sort,'written')+'>按写入顺序 · 最近在前</option></select><label class="sr-only" for="author-select">筛选作者</label><select id="author-select"><option value="">所有角色</option>'+campaign().characters.map(c=>'<option value="'+h(c.id)+'"'+selected(author,c.id)+'>'+h(c.name)+'</option>').join('')+'</select>'+(view==='journal'?'<label class="sr-only" for="search-input">搜索手记</label><input id="search-input" type="search" value="'+h(search)+'" placeholder="寻找一段文字…">':'')+'</div>';}
function entriesForView(){
 let list=campaign().entries.filter(e=>(!author||e.characterId===author)&&(!search||view!=='journal'||e.body.toLowerCase().includes(search.toLowerCase())));
 if(view==='map'){const ids=new Set(campaign().markers.filter(m=>m.mapId===selectedMap).map(m=>m.id));list=list.filter(e=>selectedMarker?e.markerId===selectedMarker:ids.has(e.markerId));}
 return sortEntries(list,sort);
}
function folio(){
 const list=entriesForView();let entry=list.find(e=>e.id===selectedEntry)??list[0];if(entry)selectedEntry=entry.id;
 const marker=campaign().markers.find(m=>m.id===selectedMarker),index=list.findIndex(e=>e.id===entry?.id);
 let content='';
 if(editing){
 content='<div class="folio-body"><div class="editor-title"><h2>写手记</h2><span class="inline-notice">'+h(characterName(editing.characterId))+' 署</span></div><div class="editor-fields"><label class="field">冒险日期<input id="adventure-label" maxlength="100" value="'+h(editing.adventureLabel)+'" placeholder="例如：霜月初三"></label><label class="field">冒险日序<input type="number" step="1" id="adventure-order" value="'+h(editing.adventureOrder??'')+'" placeholder="未注明"><small>用于排序；可沿用当前第几日。</small></label></div><label class="sr-only" for="diary-body">日记正文</label><textarea id="diary-body" class="diary-input" maxlength="100000" placeholder="从这里开始写。">'+h(editing.body)+'</textarea><div class="editor-foot"><span>输入后自动保存</span><span id="word-count">'+editing.body.length+' 字</span></div></div><div class="folio-bottom"><span>'+h(marker?.name??'未关联地图地点')+'</span><button class="button primary" id="finish-edit">完成书写</button></div>';
 }else if(entry){
 const place=campaign().markers.find(m=>m.id===entry.markerId);
 content='<div class="folio-body"><div class="date-ribbon">'+h(entry.adventureLabel||'冒险日期未注明')+'</div><h2 class="entry-title">'+h(place?.name??'旅途随记')+'</h2><div class="entry-text">'+h(entry.body||'（空白手记）')+'</div><div class="author-line"><span class="avatar" style="background:'+characterColor(entry.characterId)+'">'+h(characterName(entry.characterId)[0])+'</span><div>'+h(characterName(entry.characterId))+' 署<small>写于 '+h(timeText(entry.createdAt))+' · 第 '+entry.sequence+' 篇</small></div></div></div><div class="folio-bottom"><div class="entry-nav"><button class="icon-button" id="prev-entry" aria-label="上一篇" '+(index<=0?'disabled':'')+'>‹</button><span>'+(index+1)+' / '+list.length+'</span><button class="icon-button" id="next-entry" aria-label="下一篇" '+(index>=list.length-1?'disabled':'')+'>›</button></div><div><button class="text-button" id="delete-entry">移除</button><button class="button" id="edit-entry">编辑这一页</button></div></div>';
 }else content=empty(marker?marker.name:'这里还是空白的一页',author?'这位角色还没有在这里留下手记。':'选择地图上的足迹，或写下你自己的第一篇。','<button class="button primary" id="empty-new-entry">写一篇手记</button>');
 return'<article class="manuscript illuminated-leaf '+(view==='journal'?'journal-full':'')+'">'+paperTexture()+marginArt('top')+marginArt('right')+marginArt('bottom')+'<div class="folio-top"><span class="eyebrow">手记</span><span class="folio-number">页 '+String(entry?.sequence??'—').padStart(2,'0')+'</span></div>'+content+'</article>';
}
function heading(kicker,title,subtitle,buttons){return'<div class="page-heading"><div><h1>'+title+'</h1>'+(subtitle?'<p class="subtitle">'+subtitle+'</p>':'')+'</div><div class="toolbar">'+buttons+'</div></div>';}
function renderMap(){
 const c=campaign(),map=c.maps.find(m=>m.id===selectedMap)??c.maps[0];selectedMap=map?.id??null;
 if(selectedMarker&&!c.markers.some(m=>m.id===selectedMarker&&m.mapId===selectedMap)){selectedMarker=null;selectedEntry=null;}
 const pins=c.markers.filter(m=>m.mapId===selectedMap),markers=pins.map((m,i)=>{const e=c.entries.find(e=>e.markerId===m.id);return'<button class="map-pin '+(selectedMarker===m.id?'selected':'')+'" data-marker="'+h(m.id)+'" style="left:'+m.x*100+'%;top:'+m.y*100+'%;--pin-color:'+characterColor(e?.characterId)+'" aria-label="'+h(m.name)+'" title="'+h(m.name)+'"><span><b>'+String(i+1)+'</b></span></button>';}).join('');
 const mapImage=map?.asset==='assets/portolan.jpg'?'<svg class="map-image historic-map" viewBox="0 0 8615 3975" aria-label="约1550年的地中海航海图" role="img"><image href="assets/portolan.jpg" width="3975" height="8615" transform="translate(0 3975) rotate(-90)"/></svg>':'<img id="custom-map-image" class="map-image" data-asset="'+h(map?.asset??'')+'" alt="'+h(map?.name??'地图')+'" draggable="false">';
 return heading('ATLAS ITINERIS','旅途舆图','','<button class="button" id="import-map">导入地图</button><button class="button '+(placing?'active':'primary')+'" id="place-marker" '+(!map?'disabled':'')+'>'+(placing?'取消标注':'＋ 地图标注')+'</button>')+
 '<div class="map-layout bound-volume atlas-volume"><section class="map-panel"><div class="map-topbar"><label class="sr-only" for="map-select">当前地图</label><select id="map-select">'+(c.maps.length?c.maps.map(m=>'<option value="'+h(m.id)+'"'+selected(selectedMap,m.id)+'>'+h(m.name)+'</option>').join(''):'<option>尚无地图</option>')+'</select><div class="map-actions"><button class="icon-button" id="zoom-out" aria-label="缩小地图">−</button><span class="zoom-value">'+zoom+'%</span><button class="icon-button" id="zoom-in" aria-label="放大地图">＋</button></div></div><div class="map-stage '+(placing?'placing':'')+'" id="map-stage">'+
 (map?'<div class="map-canvas '+(map.asset.startsWith('blob:')?'custom':'')+'" id="map-canvas" style="width:'+zoom+'%">'+mapImage+markers+'</div>':empty('旅程从一张地图开始','支持 JPG、PNG 和 WebP。图片保存在当前设备。','<button class="button" id="empty-import-map">选择地图图片</button>'))+
 '</div><div class="map-bottom"><span>'+(placing?(movingMarker?'点按新的位置':'点按地图，留下一处足迹'):pins.length+' 处足迹 · 放大后可滚动浏览')+'</span><button class="text-button" id="rename-marker" '+(!selectedMarker?'disabled':'')+'>地点设置</button></div></section><section class="reading-panel">'+filters()+'<div class="reading-toolbar"><span>'+h(c.markers.find(m=>m.id===selectedMarker)?.name??'全部地图手记')+'</span><button class="text-button" id="new-entry">＋ 写一篇</button></div>'+folio()+'</section></div>';
}
function renderJournal(){const list=entriesForView();if(!list.some(e=>e.id===selectedEntry))selectedEntry=list[0]?.id??null;return heading('LIBER MEMORIARUM','远征手记','','<button class="button primary" id="new-entry">＋ 写一篇手记</button>')+filters()+'<div class="journal-layout bound-volume journal-volume"><aside class="entry-list" aria-label="日记目录">'+(list.length?list.map(e=>'<button class="entry-list-button '+(e.id===selectedEntry?'active':'')+'" data-entry="'+h(e.id)+'"><span class="entry-list-date">'+h(e.adventureLabel||'日期未注明')+'</span><span class="entry-snippet">'+h(e.body.split('\n')[0]||'空白手记')+'</span><small>'+h(characterName(e.characterId))+' · '+h(timeText(e.createdAt))+'</small></button>').join(''):'<p class="subtitle">还没有匹配的手记。</p>')+'</aside>'+folio()+'</div>';}
function paperTexture(){return '<svg class="paper-texture" viewBox="900 1900 930 140" preserveAspectRatio="none" aria-hidden="true"><image href="assets/illumination.jpg" width="4000" height="2250"/></svg>';}
function marginArt(kind,extra=''){
 const boxes={top:'2050 330 1080 70',right:'2960 410 175 1230',bottom:'2050 1640 1080 230',left:'2050 410 78 1230',initial:'2140 673 430 430'};
 return '<svg class="museum-margin margin-'+kind+' '+extra+'" viewBox="'+boxes[kind]+'" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><image href="assets/illumination.jpg" width="4000" height="2250"/></svg>';
}
function renderInventory(){
 const vault=view==='vault',char=currentCharacter(),owner=vault?null:char?.id,items=campaign().items.filter(x=>x.ownerId===owner),title=vault?'公库物品簿':'随身物品簿';
 const total=items.reduce((n,i)=>n+i.quantity,0);
 return heading('',title,vault?campaign().name:char?.name??'尚未登记角色','<button class="button primary" id="new-item" '+(!vault&&!char?'disabled':'')+'>记入物品</button>')+
 '<div class="inventory-layout bound-volume"><aside class="inventory-frontispiece">'+paperTexture()+'<div class="leaf-heading"><span>'+(vault?'公库':'行囊')+'</span><span>Ⅰ</span></div><div class="miniature-scene">'+marginArt('top')+marginArt('left')+marginArt('right')+marginArt('bottom')+'<img class="inventory-illustration" src="assets/'+(vault?'inventory-coffer.png':'inventory-pouch.png')+'" alt="'+(vault?'铁箍木箱插画':'牛皮行囊插画')+'"></div><h2>'+h(vault?campaign().name:char?.name??'未署名')+'</h2><dl class="inventory-totals"><div><dt>品目</dt><dd>'+items.length+'</dd></div><div><dt>总数</dt><dd>'+total+'</dd></div></dl>'+
 (campaign().history.length?'<details class="history-list"><summary>出入记录</summary><ol>'+campaign().history.slice(0,20).map(x=>'<li>'+h(x.text)+' <small>'+h(timeText(x.at))+'</small></li>').join('')+'</ol></details>':'')+
 '</aside><section class="inventory-ledger illuminated-leaf">'+paperTexture()+marginArt('top')+marginArt('right')+marginArt('bottom')+'<div class="ledger-head"><h2>'+title+'</h2><span class="leaf-index">Ⅱ</span></div><div class="ledger-columns"><span>品名 · 注记</span><span>数量</span><span>处置</span></div><div class="ledger-entries">'+
 (items.length?items.map((item,i)=>'<article class="item-row"><span class="item-index">'+String(i+1).padStart(2,'0')+'</span><div class="item-content"><h3 class="item-name">'+h(item.name)+'</h3><p class="item-description">'+h(item.description)+'</p></div><span class="quantity">'+item.quantity+'</span><div class="item-actions"><button class="text-button" data-edit-item="'+h(item.id)+'">编辑</button><button class="button small" data-transfer-item="'+h(item.id)+'">'+(vault?'领取':'存入 / 转交')+'</button></div></article>').join(''):empty('尚无物品',vault?'从行囊存入，或直接记入公用物品。':'用“记入物品”添加名称、数量和说明。'))+
 '</div><span class="leaf-folio">物品簿 · '+items.length+' 项</span></section></div>';
}
function render(){
 const c=campaign(),char=currentCharacter();
 $('#campaign-select').innerHTML=state.campaigns.map(x=>'<option value="'+h(x.id)+'"'+selected(c.id,x.id)+'>'+h(x.name)+'</option>').join('');
 $('#character-label').textContent=char?.name??'登记角色';$('#character-button .avatar').textContent=char?.name[0]??'＋';$('#character-button .avatar').style.background=char?.color??COLORS[0];
 document.querySelectorAll('[data-view]').forEach(b=>{b.classList.toggle('active',b.dataset.view===view);if(b.dataset.view===view)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
 $('#main').innerHTML=view==='map'?renderMap():view==='journal'?renderJournal():renderInventory();
 bindContent();hydrateMap();fitHistoricMap();
}
function bindContent(){
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
 if($('#map-select'))$('#map-select').onchange=e=>{if(!flushDraft())return;editing=null;selectedMap=e.target.value;selectedMarker=null;selectedEntry=null;zoom=100;render();};
 if($('#place-marker'))$('#place-marker').onclick=()=>{if(!flushDraft())return;editing=null;placing=!placing;movingMarker=null;render();};
 if($('#map-canvas')){
 let start=null;$('#map-canvas').onpointerdown=e=>start={x:e.clientX,y:e.clientY};
 $('#map-canvas').onclick=e=>{if(!placing||e.target.closest('[data-marker]')||!start||Math.hypot(e.clientX-start.x,e.clientY-start.y)>8)return;const r=e.currentTarget.getBoundingClientRect();const x=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),y=Math.max(0,Math.min(1,(e.clientY-r.top)/r.height));if(movingMarker){if(mutate(()=>Object.assign(campaign().markers.find(m=>m.id===movingMarker),{x,y}),true)){placing=false;movingMarker=null;render();toast('标注已移动',true);}}else markerForm(x,y);};
 }
 document.querySelectorAll('[data-marker]').forEach(b=>b.onclick=e=>{e.stopPropagation();if(!flushDraft())return;editing=null;selectedMarker=b.dataset.marker;selectedEntry=null;render();});
 if($('#zoom-in'))$('#zoom-in').onclick=()=>{if(!flushDraft())return;zoom=Math.min(300,zoom+25);render();};
 if($('#zoom-out'))$('#zoom-out').onclick=()=>{if(!flushDraft())return;zoom=Math.max(50,zoom-25);render();};
 if($('#rename-marker'))$('#rename-marker').onclick=()=>editMarker();
 if($('#new-item'))$('#new-item').onclick=()=>itemForm();
 document.querySelectorAll('[data-edit-item]').forEach(b=>b.onclick=()=>itemForm(b.dataset.editItem));
 document.querySelectorAll('[data-transfer-item]').forEach(b=>b.onclick=()=>transferForm(b.dataset.transferItem));
}
function turnEntry(delta){const list=entriesForView(),i=list.findIndex(e=>e.id===selectedEntry);selectedEntry=list[i+delta]?.id??selectedEntry;render();}
function beginEntry(id){
 if(!flushDraft())return;
 const existing=campaign().entries.find(e=>e.id===id);
 if(!existing&&!currentCharacter()){showCharacters();return;}
 const c=campaign();editing=existing?structuredClone(existing):{id:uid('entry'),characterId:currentCharacter().id,authorMemberId:state.memberId,markerId:view==='map'?selectedMarker:null,body:'',adventureLabel:c.currentDate.label,adventureOrder:c.currentDate.order};
 if(view==='map'&&!editing.markerId)view='journal';
 if(existing)selectedEntry=existing.id;author='';search='';render();$('#diary-body').focus();
}
function deleteEntry(){const entry=campaign().entries.find(e=>e.id===selectedEntry);if(!entry)return;dialog('移除这一页？','<p class="dialog-copy">将移除这篇手记，地图上的地点会保留。完成后可以立即撤销。</p><div class="dialog-actions"><button class="button" id="cancel-delete">留下</button><button class="button danger" id="confirm-delete">移除手记</button></div>');$('#cancel-delete').onclick=closeDialog;$('#confirm-delete').onclick=()=>{if(mutate(()=>campaign().entries=campaign().entries.filter(e=>e.id!==entry.id),true)){closeDialog();selectedEntry=null;render();toast('手记已移除',true);}};}
function markerForm(x,y){dialog('添加地图标注','<form id="marker-form"><label class="field">地点名称<input name="name" maxlength="100" required placeholder="这个地方叫什么？"></label><div class="dialog-actions"><button class="button primary">保存标注</button></div></form>');$('#marker-form').onsubmit=e=>{e.preventDefault();const name=new FormData(e.target).get('name').trim();if(!name)return;const id=uid('marker');if(mutate(()=>campaign().markers.push({id,mapId:selectedMap,name,x,y}))){closeDialog();placing=false;selectedMarker=id;selectedEntry=null;render();if(currentCharacter())beginEntry();else showCharacters();}};}
function editMarker(){const marker=campaign().markers.find(m=>m.id===selectedMarker);if(!marker)return;dialog('地点设置','<form id="marker-edit"><label class="field">地点名称<input name="name" maxlength="100" required value="'+h(marker.name)+'"></label><div class="dialog-actions"><button type="button" class="button" id="move-marker">移动位置</button><button type="button" class="button danger" id="remove-marker">移除标注</button><button class="button primary">保存</button></div><p class="inline-notice">移除标注会保留日记，解除它们与此地点的关联。</p></form>');
 $('#marker-edit').onsubmit=e=>{e.preventDefault();const name=new FormData(e.target).get('name').trim();if(!name)return;if(mutate(()=>campaign().markers.find(m=>m.id===marker.id).name=name)){closeDialog();render();}};
 $('#move-marker').onclick=()=>{closeDialog();movingMarker=marker.id;placing=true;render();};
 $('#remove-marker').onclick=()=>{if(mutate(()=>{const c=campaign();c.markers=c.markers.filter(m=>m.id!==marker.id);c.entries.filter(e=>e.markerId===marker.id).forEach(e=>e.markerId=null);},true)){closeDialog();selectedMarker=null;render();toast('标注已移除，日记保留',true);}};
}
$('#map-upload').onchange=async e=>{
 const file=e.target.files[0];e.target.value='';if(!file)return;if(!['image/jpeg','image/png','image/webp'].includes(file.type)){toast('请选择 JPG、PNG 或 WebP 图片');return;}if(file.size>12*1024*1024){toast('单张地图请控制在 12 MB 以内');return;}
 if(!flushDraft())return;
 const importCampaignId=campaign().id;try{
 const url=URL.createObjectURL(file);let image;try{image=await new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(new Error('无法读取这张图片'));im.src=url;});if(image.naturalWidth*image.naturalHeight>80000000)throw new Error('图片尺寸过大，请使用小于 8000 万像素的地图');}finally{URL.revokeObjectURL(url);}
 const id=uid('map');await storeBlob(id,file);
 if(mutate(()=>state.campaigns.find(c=>c.id===importCampaignId).maps.push({id,name:file.name.replace(/\.[^.]+$/,'').slice(0,100),asset:'blob:'+id}))){selectedMap=id;selectedMarker=null;selectedEntry=null;editing=null;view='map';zoom=100;render();toast('地图已导入，可以落下第一处标注');}
 }catch(err){toast('地图未保存：'+err.message);}
};
function itemForm(id){
 const item=campaign().items.find(x=>x.id===id),owner=item?item.ownerId:(view==='vault'?null:currentCharacter()?.id);
 if(owner===undefined){showCharacters();return;}
 dialog(item?'修改物品':'记一件物品','<form id="item-form"><label class="field">物品名称<input name="name" maxlength="200" required value="'+h(item?.name??'')+'"></label><label class="field">数量<input name="quantity" type="number" min="1" max="999999" step="1" required value="'+(item?.quantity??1)+'"></label><label class="field">说明<textarea name="description" rows="4" maxlength="20000" placeholder="描述、用途，或直接粘贴物品文本。">'+h(item?.description??'')+'</textarea></label><div class="dialog-actions">'+(item?'<button type="button" class="button danger" id="remove-item">移除物品</button>':'')+'<button class="button primary">记入簿中</button></div></form>');
 $('#item-form').onsubmit=e=>{e.preventDefault();const f=new FormData(e.target),values={name:f.get('name').trim(),quantity:Number(f.get('quantity')),description:f.get('description')};if(!values.name||!Number.isSafeInteger(values.quantity)||values.quantity<1)return;if(mutate(()=>{if(item)Object.assign(campaign().items.find(x=>x.id===item.id),values);else campaign().items.push({id:uid('item'),ownerId:owner,...values});})){closeDialog();render();}};
 if($('#remove-item'))$('#remove-item').onclick=()=>{if(mutate(()=>campaign().items=campaign().items.filter(x=>x.id!==item.id),true)){closeDialog();render();toast('物品已移除',true);}};
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
 const c=campaign();dialog('这段远征','<form id="settings-form"><label class="field">战役名称<input name="name" maxlength="100" required value="'+h(c.name)+'"></label><label class="field">当前冒险日期<input name="date" maxlength="100" required value="'+h(c.currentDate.label)+'"><small>新日记自动沿用；可以使用你自己的历法。</small></label><label class="field">当前冒险日序<input name="order" type="number" step="1" required value="'+c.currentDate.order+'"><small>按故事先后排序。日历名称随意，日序按旅程递增。</small></label><div class="dialog-actions"><button type="button" id="settings-export" class="button">导出手记</button><button type="button" id="restore-button" class="button">导入备份</button><button class="button primary">保存设置</button></div></form>');
 $('#settings-form').onsubmit=e=>{e.preventDefault();const f=new FormData(e.target),name=f.get('name').trim(),date=f.get('date').trim(),order=Number(f.get('order'));if(!name||!date||!Number.isSafeInteger(order))return;if(mutate(()=>{campaign().name=name;campaign().currentDate={label:date,order};})){closeDialog();render();}};
 $('#settings-export').onclick=()=>$('#export-button').click();
 $('#restore-button').onclick=()=>$('#backup-upload').click();
};
$('#about-button').onclick=()=>dialog('装帧与出处','<p class="dialog-copy">远征手记 · 第一版交互样稿。日记、角色和物品保存在当前浏览器；上传地图保存在此设备。尚未接入多人同步与 Owlbear 房间，请定期导出完整备份。</p><ul class="source-list"><li><a href="https://www.metmuseum.org/art/collection/search/684184" target="_blank" rel="noopener">Simon Bening《时祷书》</a><br>约 1530–1535，Met，2015.706，8v–9r。图像为公共领域，依 Met Open Access 使用。边饰在界面内裁显，保留原文件。</li><li><a href="https://www.loc.gov/item/2010588182/" target="_blank" rel="noopener">地中海及相连海域航海图</a><br>约 1550，美国国会图书馆。公共领域原图，显示时旋转至北向上。</li><li><a href="https://github.com/ENZO-II/expedition-journal" target="_blank" rel="noopener">项目源代码</a> · MIT License<br>第三方素材按各自许可使用。</li><li>行囊与木箱是为本项目生成的原创辅助插画，不属于馆藏图像。</li></ul>');
function download(name,content,type){const url=URL.createObjectURL(content instanceof Blob?content:new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
function markdown(){const c=exportSnapshot().campaigns.find(c=>c.id===campaign().id);return'# '+c.name+'\n\n'+sortEntries(c.entries,sort).map(e=>'## '+(e.adventureLabel||'日期未注明')+' · '+characterName(e.characterId)+'\n\n'+(campaign().markers.find(m=>m.id===e.markerId)?.name?'地点：'+campaign().markers.find(m=>m.id===e.markerId).name+'\n\n':'')+e.body+'\n\n---\n写入：'+e.createdAt+' · 序号 '+e.sequence+'\n').join('\n')+'\n## 物品清单\n\n'+c.items.map(i=>'- '+i.name+' × '+i.quantity+'（'+(i.ownerId===null?'公库':characterName(i.ownerId))+'）'+(i.description?'：'+i.description:'')).join('\n');}
async function exportBackup(){
 const snapshot=exportSnapshot(),images={};$('#save-status').textContent='正在整理备份…';
 try{for(const c of snapshot.campaigns)for(const m of c.maps){if(m.asset.startsWith('blob:')&&!images[m.asset]){const blob=await readBlob(m.asset.slice(5));if(!blob)throw new Error('备份中缺少地图：'+m.name);images[m.asset]=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(blob);});}}
 download(safeName(campaign().name)+'-完整备份.json',JSON.stringify({format:'expedition-journal-backup',version:1,exportedAt:new Date().toISOString(),data:snapshot,images},null,2),'application/json');
 $('#save-status').textContent='完整备份已导出';toast('备份包含所有战役、日记、物品与上传地图');
 }catch(e){$('#save-status').textContent='备份失败';toast(e.message);}
}
$('#export-button').onclick=()=>{
 flushDraft();
 dialog('导出手记与备份','<p class="dialog-copy">阅读版导出当前战役；完整备份包含此设备上的所有战役与上传地图，可在另一台设备恢复。</p><div class="export-options"><button class="button" id="export-md">导出 Markdown 文档</button><button class="button" id="export-html">导出可打印手记</button><button class="button primary" id="export-json">导出完整备份</button></div>');
 $('#export-md').onclick=()=>{download(safeName(campaign().name)+'.md',markdown(),'text/markdown;charset=utf-8');closeDialog();};
 $('#export-html').onclick=()=>{const c=exportSnapshot().campaigns.find(c=>c.id===campaign().id),html='<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>'+h(c.name)+'</title><style>body{max-width:760px;margin:50px auto;padding:30px;color:#352b28;font-family:serif;background:#faf5e8;line-height:2}h1{color:#702d38}article{border-top:1px solid #b89b61;padding:30px 0;break-inside:avoid}p{white-space:pre-wrap}small{color:#786b56}@media print{body{margin:0;background:white}}</style><h1>'+h(c.name)+'</h1>'+sortEntries(c.entries,sort).map(e=>'<article><h2>'+h(e.adventureLabel||'日期未注明')+' · '+h(characterName(e.characterId))+'</h2><p>'+h(e.body)+'</p><small>写于 '+h(e.createdAt)+' · 第 '+e.sequence+' 篇</small></article>').join('')+'</html>';download(safeName(c.name)+'-阅读版.html',html,'text/html;charset=utf-8');closeDialog();};
 $('#export-json').onclick=()=>{closeDialog();exportBackup();};
};
$('#backup-upload').onchange=async e=>{
 const file=e.target.files[0];e.target.value='';if(!file)return;if(file.size>100*1024*1024){toast('备份超过 100 MB，暂不支持导入');return;}
 try{
 const parsed=JSON.parse(await file.text());if(parsed.format!=='expedition-journal-backup'||parsed.version!==1)throw new Error('不是受支持的备份');
 const data=validateData(parsed.data),images=parsed.images??{},needed=new Set(data.campaigns.flatMap(c=>c.maps.filter(m=>m.asset.startsWith('blob:')).map(m=>m.asset)));
 for(const key of needed)if(typeof images[key]!=='string'||!/^data:image\/(png|jpeg|webp);base64,/.test(images[key])||images[key].length>18*1024*1024)throw new Error('备份缺少地图或包含无效图像');
 closeDialog();dialog('从备份恢复','<p class="dialog-copy">将用备份中的 '+data.campaigns.length+' 个战役替换当前设备的全部数据。建议先导出当前内容。</p><div class="dialog-actions"><button class="button" id="cancel-restore">取消</button><button class="button primary" id="confirm-restore">恢复这份备份</button></div>');
 $('#cancel-restore').onclick=closeDialog;
 $('#confirm-restore').onclick=async()=>{const button=$('#confirm-restore');button.disabled=true;button.textContent='正在恢复…';try{
 // New map IDs prevent overwriting old image blobs if restoring fails partway.
 for(const key of needed){const url=images[key],comma=url.indexOf(','),bytes=Uint8Array.from(atob(url.slice(comma+1)),x=>x.charCodeAt(0)),mime=url.slice(5,url.indexOf(';')),newId=uid('map');await storeBlob(newId,new Blob([bytes],{type:mime}));for(const c of data.campaigns)for(const m of c.maps)if(m.asset===key)m.asset='blob:'+newId;}
 const old=state;state=data;storageBlocked=false;if(!persist()){state=old;throw new Error('设备空间不足，未替换当前数据');}closeDialog();editing=null;selectedMap=null;selectedMarker=null;selectedEntry=null;author='';search='';undoSnapshot=null;render();toast('备份已恢复');
 }catch(err){button.disabled=false;button.textContent='恢复这份备份';toast(err.message);}};
 }catch(err){toast('无法导入：'+err.message);}
};
window.addEventListener('pagehide',()=>flushDraft());
window.addEventListener('beforeunload',e=>{if(editing&&!flushDraft()){e.preventDefault();e.returnValue='';}});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')flushDraft();});
window.addEventListener('storage',e=>{
 if(e.key!==KEY||!e.newValue)return;
 if(editing){storageBlocked=true;$('#save-status').textContent='另一窗口更新了手记 · 请先导出当前备份';toast('另一窗口已有更新。为避免覆盖，当前编辑暂停保存，请导出备份后刷新。');return;}
 try{state=validateData(JSON.parse(e.newValue));undoSnapshot=null;render();toast('已同步此设备另一窗口的更新');}catch{}
});
if(!storageBlocked){try{if(!localStorage.getItem(KEY))persist();}catch{storageBlocked=true;}}
render();
if(storageBlocked){$('#save-status').textContent='原有数据读取失败 · 已暂停覆盖';toast('原有数据无法读取。为保护内容，已暂停自动保存。可从设置导入备份。');}

function exportSnapshot(){
 const snapshot=structuredClone(state);
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
 {name:'read_current_campaign',title:'读取当前远征',description:'Read the current device-local campaign and journal index. Does not modify data.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:true},execute(input){if(input&&Object.keys(input).length)throw new Error('No arguments accepted');const c=campaign();return{name:c.name,storage:'device-local prototype',characters:c.characters.map(x=>({id:x.id,name:x.name})),entries:sortEntries(c.entries,sort).map(x=>({id:x.id,character:characterName(x.characterId),adventureDate:x.adventureLabel,createdAt:x.createdAt,excerpt:x.body.slice(0,120)}))};}},
 {name:'open_journal_entry',title:'翻开一篇手记',description:'Navigate to an existing journal entry in the current campaign. Does not create or edit a journal.',inputSchema:{type:'object',properties:{entryId:{type:'string'}},required:['entryId'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute(input){if(!input||typeof input.entryId!=='string'||Object.keys(input).some(k=>k!=='entryId'))throw new Error('Invalid entryId');if(editing)throw new Error('Finish the current draft first');if(!campaign().entries.some(x=>x.id===input.entryId))throw new Error('Entry not found');view='journal';author='';search='';selectedEntry=input.entryId;render();return{opened:true,entryId:selectedEntry};}}
 ]){try{Promise.resolve(modelContext.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}}
 window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
}

function fitHistoricMap(){
 requestAnimationFrame(()=>{const stage=$('#map-stage'),canvas=$('#map-canvas');if(!stage||!canvas||canvas.classList.contains('custom'))return;
 const width=Math.max(stage.clientWidth,stage.clientHeight*(8615/3975))*zoom/100;
 canvas.style.width=Math.max(stage.clientWidth,width)+'px';
 const marker=campaign().markers.find(m=>m.id===selectedMarker);
 stage.scrollLeft=canvas.clientWidth*(marker?.x??.5)-stage.clientWidth/2;
 });
}
window.addEventListener('resize',fitHistoricMap);
