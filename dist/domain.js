import{validAvatar,validateReplies}from'./discussion.js?v=20261003-12f';
import{isAsset,validateMedia}from'./media-domain.js';
export const VERSION=1;
export const uid=(prefix='id')=>prefix+'_'+crypto.randomUUID();
export const escapeHtml=(v)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function sortEntries(entries,mode='adventure'){return [...entries].sort((a,b)=>mode==='written'?b.sequence-a.sequence:((a.adventureOrder??Infinity)-(b.adventureOrder??Infinity)||a.sequence-b.sequence));}
export function transferItem(campaign,itemId,targetOwner,quantity){
 const item=campaign.items.find(x=>x.id===itemId);
 if(!item)throw new Error('物品不存在');
 if(!Number.isInteger(quantity)||quantity<1||quantity>item.quantity)throw new Error('请输入有效数量');
 if(targetOwner!==null&&!campaign.characters.some(c=>c.id===targetOwner))throw new Error('接收角色不存在');
 if(item.ownerId===targetOwner)throw new Error('物品已经在这里');
 const origin=item.ownerId;
 if(quantity===item.quantity){item.ownerId=targetOwner;}else{item.quantity-=quantity;campaign.items.push({...item,id:uid('item'),ownerId:targetOwner,quantity});}
 const name=id=>id===null?'公库':campaign.characters.find(c=>c.id===id)?.name??'未命名角色';
 campaign.history.unshift({id:uid('event'),at:new Date().toISOString(),text:name(origin)+' → '+name(targetOwner)+'：'+item.name+' × '+quantity});
 campaign.history=campaign.history.slice(0,100);
}
export function validateData(value){
 if(!value||value.version!==VERSION||!Array.isArray(value.campaigns)||!value.campaigns.length||value.campaigns.length>100)throw new Error('不是有效的远征手记备份');
 const idSet=new Set();const checkId=id=>{if(typeof id!=='string'||!id.length||id.length>120||idSet.has(id))throw new Error('备份中有重复或无效的编号');idSet.add(id);};
 const text=(v,max)=>typeof v==='string'&&v.length<=max;
 checkId(value.memberId);
 const sequences=new Set();let highestSequence=0;
 if(!value.currentCharacterByCampaign||typeof value.currentCharacterByCampaign!=='object'||Array.isArray(value.currentCharacterByCampaign)||!value.campaigns.some(c=>c.id===value.currentCampaignId))throw new Error('当前战役或角色选择无效');
 for(const c of value.campaigns){
 sequences.clear();
 checkId(c.id);if(c.bookId!==undefined&&(!text(c.bookId,120)||!c.bookId.length))throw new Error('远征关联无效');if(!text(c.name,100)||!Array.isArray(c.characters)||!Array.isArray(c.maps)||!Array.isArray(c.markers)||!Array.isArray(c.entries)||!Array.isArray(c.items)||!Array.isArray(c.history))throw new Error('战役数据不完整');
 if(c.characters.length>500||c.entries.length>10000||c.maps.length>200||c.markers.length>20000||c.items.length>20000||c.history.length>1000)throw new Error('备份过大');
 if(!c.currentDate||!text(c.currentDate.label,100)||!Number.isSafeInteger(c.currentDate.order))throw new Error('冒险日期无效');
 const chars=new Set(c.characters.map(x=>x.id)),maps=new Set(c.maps.map(x=>x.id)),markers=new Set(c.markers.map(x=>x.id));
 for(const x of c.characters){checkId(x.id);if(!text(x.name,60)||!text(x.color,30)||!/^#[0-9a-f]{6}$/i.test(x.color))throw new Error('角色数据无效');if(!validAvatar(x.avatar))throw new Error('头像数据无效');}
 for(const x of c.maps){checkId(x.id);if(!text(x.name,100)||!text(x.asset,300)||!(x.asset==='assets/portolan.jpg'||isAsset(x.asset)))throw new Error('地图数据无效');}
 for(const x of c.markers){checkId(x.id);if(!maps.has(x.mapId)||!text(x.name,100)||!Number.isFinite(x.x)||!Number.isFinite(x.y)||x.x<0||x.x>1||x.y<0||x.y>1)throw new Error('地图标注无效');if(x.characterId!==undefined&&x.characterId!==null&&!chars.has(x.characterId))throw new Error('标注署名无效');validateReplies(x.replies,chars,checkId);}
 for(const x of c.entries){checkId(x.id);if(sequences.has(x.sequence)||x.sequence<1||!text(x.authorMemberId,120))throw new Error('日记序号或作者无效');sequences.add(x.sequence);highestSequence=Math.max(highestSequence,x.sequence);if(!chars.has(x.characterId)||(x.markerId&&!markers.has(x.markerId))||!text(x.body,100000)||!text(x.adventureLabel,100)||!(x.adventureOrder===null||Number.isSafeInteger(x.adventureOrder))||!Number.isSafeInteger(x.sequence)||!Number.isFinite(Date.parse(x.createdAt))||!Number.isFinite(Date.parse(x.updatedAt)))throw new Error('日记数据无效');validateReplies(x.replies,chars,checkId);}
 for(const x of c.items){checkId(x.id);if((x.ownerId!==null&&!chars.has(x.ownerId))||!text(x.name,200)||!text(x.description,20000)||!Number.isSafeInteger(x.quantity)||x.quantity<1)throw new Error('物品数据无效');}
 validateMedia(c,checkId);
 if(value.currentCharacterByCampaign[c.id]&&!chars.has(value.currentCharacterByCampaign[c.id]))throw new Error('当前角色不存在');
 for(const x of c.history){if(!text(x.text,1000)||!Number.isFinite(Date.parse(x.at)))throw new Error('流转记录无效');}
 }
 if(!Number.isSafeInteger(value.nextSequence)||value.nextSequence<=highestSequence)throw new Error('写入序号无效');
 return value;
}
export function createCampaign(name){const id=uid('campaign');return{id,bookId:id,name,characters:[],maps:[],markers:[],entries:[],items:[],history:[],currentDate:{label:'远征第 1 日',order:1}};}
export function demoState(){
 const c=createCampaign('演示远征');c.id='campaign_demo';c.bookId=c.id;
 c.characters=[{id:'character_traveler',name:'旅人',color:'#702d38'},{id:'character_scribe',name:'书记员',color:'#283d59'}];
 c.maps=[{id:'map_mediterranean',name:'地中海 · 十六世纪航海图',asset:'assets/portolan.jpg',source:'loc'}];
 c.markers=[{id:'marker_begin',mapId:'map_mediterranean',name:'旅途起点（示例）',x:.46,y:.5},{id:'marker_west',mapId:'map_mediterranean',name:'沿途驻足（示例）',x:.31,y:.39},{id:'marker_east',mapId:'map_mediterranean',name:'下一程（示例）',x:.64,y:.49}];
 const date='2026-09-29T00:00:00.000Z';
 c.entries=[
 {id:'entry_begin',characterId:'character_traveler',authorMemberId:'member_demo',markerId:'marker_begin',body:'这是演示手记。\n\n点“写一篇”开始日记；左键点地图可添加地点，点已有标注可展开记录。\n\n冒险日期和写入时间分别保存。回复与补充收在原篇下。',adventureLabel:'远征第 1 日',adventureOrder:1,sequence:1,createdAt:date,updatedAt:date},
 {id:'entry_west',characterId:'character_scribe',authorMemberId:'member_demo',markerId:'marker_west',body:'这是同一个地点的另一篇示例记录。\n\n点击页脚，可以翻阅大家留在这里的文字。也可以用作者筛选，只读某一位旅人的手记。',adventureLabel:'远征第 3 日',adventureOrder:3,sequence:2,createdAt:'2026-09-29T01:00:00.000Z',updatedAt:'2026-09-29T01:00:00.000Z'},
 {id:'entry_late',characterId:'character_traveler',authorMemberId:'member_demo',markerId:'marker_begin',body:'这一篇是后来补写的示例。\n\n选择“冒险时间”，它会排在第三日之前；选择“写入顺序”，它会出现在最近添加的位置。编辑正文不会改变原来的写入顺序。',adventureLabel:'远征第 2 日',adventureOrder:2,sequence:3,createdAt:'2026-09-29T02:00:00.000Z',updatedAt:'2026-09-29T02:00:00.000Z'}];
 c.items=[{id:'item_lantern',ownerId:'character_traveler',name:'提灯',quantity:1,description:'演示物品。可以存入公库，也可以交给另一位角色。'},{id:'item_food',ownerId:'character_traveler',name:'干粮',quantity:6,description:'演示物品。试着将其中两份存入公库。'},{id:'item_rope',ownerId:null,name:'麻绳',quantity:2,description:'演示共享物品。选中自己的角色后即可领取。'}];
 return{version:VERSION,memberId:uid('member'),currentCampaignId:c.id,currentCharacterByCampaign:{[c.id]:'character_traveler'},campaigns:[c],nextSequence:4,revision:0};
}
