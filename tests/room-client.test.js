import test from 'node:test';
import assert from 'node:assert/strict';
import {RoomClient,parseInvite} from '../dist/room-client.js';
import {demoState,transferItem} from '../dist/domain.js';

test('invite parsing accepts only a complete room credential',()=>{
 globalThis.location={href:'http://localhost/'};
 const id='a'.repeat(24),token='b'.repeat(43);
 assert.deepEqual(parseInvite('http://localhost/#room='+id+'.'+token),{id,token});
 assert.equal(parseInvite('http://localhost/#room='+id+'.short'),null);
 assert.equal(parseInvite('http://localhost/#room='+id+'.'+token+'&extra'),null);
 delete globalThis.location;
});
test('an acknowledged change survives a lost response without applying the stock transfer twice',()=>{
 const base=demoState().campaigns[0],desired=structuredClone(base);transferItem(desired,'item_food',null,2);
 const values=new Map([['outbox',JSON.stringify([{id:'lost_ack',base,desired}])]]);
 globalThis.localStorage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
 let received;
 const client=new RoomClient({id:'a'.repeat(24),token:'b'.repeat(43)},{key:'outbox',onCampaign:c=>received=c,onStatus:()=>{},onConflict:()=>assert.fail('已确认的操作不应产生差异')});
 client.accept({campaign:desired,revision:1,applied:['lost_ack']});
 assert.equal(client.queue.length,0);assert.equal(received.items.find(x=>x.id==='item_food').quantity,4);assert.equal(received.items.reduce((n,x)=>n+(x.name==='干粮'?x.quantity:0),0),6);assert.equal(values.get('outbox'),'[]');
 client.stop();delete globalThis.localStorage;
});
test('outbox storage failure prevents a change being sent',()=>{
 globalThis.localStorage={getItem:()=>null,setItem:()=>{throw new Error('quota');}};
 const base=demoState().campaigns[0],desired=structuredClone(base);desired.entries[0].body='待保存';
 const client=new RoomClient({},{key:'outbox',onCampaign:()=>{},onStatus:()=>{},onConflict:()=>{}});client.ack=base;
 client.drain=()=>assert.fail('未留存的操作不能发往共享房间');
 assert.throws(()=>client.enqueue(desired),/quota/);assert.equal(client.queue.length,0);
 client.stop();delete globalThis.localStorage;
});
test('an open form conflict is durably retained and still pauses after reopening',async()=>{
 const values=new Map();globalThis.localStorage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
 const base=demoState().campaigns[0],desired=structuredClone(base),remote=structuredClone(base);desired.items[0].description='我的说明';remote.items[0].description='同伴的说明';
 const options={key:'outbox',onCampaign:()=>assert.fail('不能覆盖本机副本'),onStatus:()=>{},onConflict:()=>{}};
 const client=new RoomClient({},options);client.drain=()=>assert.fail('尚未处理的差异不能发送');client.holdConflict(base,desired);assert.equal(client.paused,true);client.stop();
 const reopened=new RoomClient({},options);reopened.request=async()=>({json:async()=>({campaign:remote,revision:1,applied:[]})});reopened.stream=()=>{};await reopened.start();assert.equal(reopened.paused,true);assert.equal(reopened.queue[0].desired.items[0].description,'我的说明');reopened.stop();delete globalThis.localStorage;
});
test('a rejected invalid pending write pauses without retrying forever',async()=>{
 globalThis.localStorage={getItem:()=>null,setItem:()=>{}};const base=demoState().campaigns[0];let status;
 const client=new RoomClient({},{key:'outbox',onCampaign:()=>{},onStatus:s=>status=s,onConflict:()=>{}});client.ack=base;client.queue=[{id:'invalid',base,desired:base}];client.request=async()=>{throw Object.assign(new Error('无效内容'),{status:400,data:{error:'无效内容'}});};await client.drain();assert.equal(client.paused,true);assert.equal(status,'conflict');assert.equal(client.retry,undefined);assert.equal(client.queue.length,1);client.stop();delete globalThis.localStorage;
});
