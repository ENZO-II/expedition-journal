import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {demoState,validateData,transferItem} from '../dist/domain.js';
import {mergeCampaign,ConflictError} from '../dist/shared-merge.js';
import {gestureAction} from '../dist/map-gestures.js';
import {assetKeys} from '../dist/media-domain.js';
import {createJournalServer} from '../server.js';

test('map mouse buttons and touch modes have distinct actions',()=>{
 for(const mode of ['marker','ink','image'])assert.equal(gestureAction({button:2,pointerType:'mouse',mode}),'pan');
 assert.equal(gestureAction({button:0,pointerType:'mouse'}),'place');assert.equal(gestureAction({button:0,pointerType:'mouse',marker:true}),'marker');
 assert.equal(gestureAction({button:0,pointerType:'touch'}),'pan');assert.equal(gestureAction({button:0,pointerType:'touch',placing:true}),'place');assert.equal(gestureAction({button:0,pointerType:'touch',mode:'ink'}),'ink');
});
test('independent entries and replies merge; equal concurrent stock decrements conflict',()=>{
 const base=demoState().campaigns[0],a=structuredClone(base),b=structuredClone(base);
 a.entries[0].body='第一位玩家改正文';b.entries[1].body='第二位玩家改正文';const merged=mergeCampaign(base,b,a);assert.equal(merged.entries[0].body,a.entries[0].body);assert.equal(merged.entries[1].body,b.entries[1].body);
 const first=structuredClone(base),second=structuredClone(base);transferItem(first,'item_food',null,2);transferItem(second,'item_food','character_scribe',2);
 assert.throws(()=>mergeCampaign(base,second,first),ConflictError);assert.equal(first.items.reduce((n,x)=>n+(x.name==='干粮'?x.quantity:0),0),6);
 const body=structuredClone(base),date=structuredClone(base);body.entries[0].body='正文';body.entries[0].updatedAt='2026-10-03T02:00:00Z';date.entries[0].adventureLabel='霜月';date.entries[0].updatedAt='2026-10-03T03:00:00Z';const combined=mergeCampaign(base,date,body);assert.equal(combined.entries[0].body,'正文');assert.equal(combined.entries[0].adventureLabel,'霜月');assert.equal(combined.entries[0].updatedAt,date.entries[0].updatedAt);
});
test('images travel with split items; media validation and backups include drawings',()=>{
 const state=demoState(),c=state.campaigns[0];c.items[1].images=[{id:'photo_a',asset:'blob:image_test',shape:'circle'}];transferItem(c,'item_food',null,2);
 assert.equal(c.items.at(-1).images[0].asset,'blob:image_test');assert.deepEqual(assetKeys([c]),['blob:image_test']);validateData(state);
 c.art=[{id:'art_test',kind:'stroke',mapId:c.maps[0].id,characterId:c.characters[0].id,authorMemberId:state.memberId,createdAt:new Date().toISOString(),color:'#244f87',width:3,points:[[.1,.1],[.2,.2]]}];validateData(state);c.art[0].points[1][0]=Infinity;assert.throws(()=>validateData(state),/笔迹/);
});
test('shared server isolates rooms, persists images, merges writers and rejects overclaims',async t=>{
 const dataDir=await mkdtemp(join(tmpdir(),'expedition-shared-'));let server;
 t.after(async()=>{server?.closeRooms();server?.closeAllConnections();await new Promise(r=>server?.close(r));await rm(dataDir,{recursive:true,force:true});});
 server=await createJournalServer({dataDir});await new Promise(r=>server.listen(0,'127.0.0.1',r));let origin='http://127.0.0.1:'+server.address().port;
 const request=async(path,options={})=>{const response=await fetch(origin+path,options);return{status:response.status,data:await response.json()};};
 const base=demoState().campaigns[0];const created=await request('/api/rooms',{method:'POST',body:JSON.stringify({campaign:base})});assert.equal(created.status,201);
 const {id,token}=created.data,path='/api/rooms/'+id,headers={Authorization:'Bearer '+token,'Content-Type':'application/json'};
 assert.equal((await request(path)).status,403);assert.equal((await request(path,{headers:{Authorization:'Bearer wrong'}})).status,403);
 assert.equal((await request('/data/'+id+'/room.json')).status,404);
 const change=async(id,base,desired)=>request(path+'/changes',{method:'POST',headers,body:JSON.stringify({id,base,desired})});
 const a=structuredClone(base),b=structuredClone(base);a.entries[0].body='甲';b.entries[1].body='乙';assert.equal((await change('change_a',base,a)).status,200);const result=await change('change_b',base,b);assert.equal(result.status,200);assert.equal(result.data.campaign.entries[0].body,'甲');assert.equal(result.data.campaign.entries[1].body,'乙');
 assert.equal((await change('change_b',base,b)).data.revision,result.data.revision);
 const stockBase=result.data.campaign,first=structuredClone(stockBase),second=structuredClone(stockBase);transferItem(first,'item_food',null,4);transferItem(second,'item_food','character_scribe',4);assert.equal((await change('claim_a',stockBase,first)).status,200);assert.equal((await change('claim_b',stockBase,second)).status,409);
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/L9sAAAAASUVORK5CYII=','base64');
 assert.equal((await request(path+'/assets/image_bad',{method:'PUT',headers:{Authorization:'Bearer '+token,'Content-Type':'image/png'},body:'<svg/>'})).status,400);
 assert.equal((await request(path+'/assets/image_good',{method:'PUT',headers:{Authorization:'Bearer '+token,'Content-Type':'image/png'},body:png})).status,201);
 const other=await request('/api/rooms',{method:'POST',body:JSON.stringify({campaign:demoState().campaigns[0]})});assert.equal((await request(path+'/assets/image_good',{headers:{Authorization:'Bearer '+other.data.token}})).status,403);
 const latest=(await request(path,{headers})).data.campaign,withImage=structuredClone(latest);withImage.items[0].images=[{id:'photo_good',asset:'blob:image_good',shape:'square'}];assert.equal((await change('attach',latest,withImage)).status,200);
 const events=await fetch(origin+path+'/events',{headers,signal:AbortSignal.timeout(5000)}),reader=events.body.getReader();
 const readEvent=async()=>{let text='';const decoder=new TextDecoder();while(!text.includes('\n\n')){const{value,done}=await reader.read();assert.equal(done,false,'共享连接不应在大消息时关闭');text+=decoder.decode(value,{stream:true});}return JSON.parse(text.slice(6).trim());};
 const event=await readEvent();assert.equal(event.campaign.items[0].images[0].asset,'blob:image_good');
 const large=structuredClone(event.campaign);large.entries[0].body='墨'.repeat(40000);const written=await change('large_event',event.campaign,large);assert.equal(written.status,200);assert.equal((await readEvent()).campaign.entries[0].body.length,40000);
 const after=structuredClone(written.data.campaign);after.entries[1].body='大消息之后的下一条';await change('after_large',written.data.campaign,after);assert.equal((await readEvent()).campaign.entries[1].body,after.entries[1].body);await reader.cancel();
 const parallelBase=(await request(path,{headers})).data.campaign,p=structuredClone(parallelBase),q=structuredClone(parallelBase);
 p.entries.push({...p.entries[0],id:'entry_parallel_a',body:'并行甲',sequence:4});q.entries.push({...q.entries[0],id:'entry_parallel_b',body:'并行乙',sequence:4});
 const results=await Promise.all([change('parallel_a',parallelBase,p),change('parallel_b',parallelBase,q)]);assert.deepEqual(results.map(x=>x.status),[200,200]);
 const parallel=(await request(path,{headers})).data.campaign.entries;assert.equal(new Set(parallel.map(x=>x.sequence)).size,parallel.length);assert.equal(parallel.length,5);
 server.closeRooms();server.closeAllConnections();await new Promise(r=>server.close(r));server=await createJournalServer({dataDir});await new Promise(r=>server.listen(0,'127.0.0.1',r));origin='http://127.0.0.1:'+server.address().port;
 assert.equal((await request(path,{headers})).data.campaign.items[0].images[0].asset,'blob:image_good');const image=await fetch(origin+path+'/assets/image_good',{headers});assert.equal(image.status,200);assert.deepEqual(Buffer.from(await image.arrayBuffer()),png);
});
