import test from 'node:test';
import assert from 'node:assert/strict';
import {ROOM_KEY,BOOK_MODAL,manifestURL,parseBinding,parseRoomLink,journalURL,OwlbearBridge} from '../dist/owlbear-bridge.js';

const origin='https://journal.example';
const invitation={roomId:'a'.repeat(24),token:'b'.repeat(43)};
const binding={version:1,origin,...invitation,name:'卡塔尼亚'};
const link=journalURL(binding);

function host(role='GM') {
  let metadata={},listener,playerListener;
  const writes=[],opened=[];
  return {
    isAvailable:true,isReady:true,
    room:{id:'owlbear-test',getMetadata:async()=>structuredClone(metadata),
      onMetadataChange:fn=>{listener=fn;return()=>listener=null;},
      setMetadata:async value=>{writes.push(value);metadata={...metadata,...value};listener?.(metadata);}},
    player:{getRole:async()=>role,onChange:fn=>{playerListener=fn;return()=>playerListener=null;}},
    modal:{open:async value=>opened.push(value)},
    writes,opened,setRole(value){role=value;playerListener?.({role});},
    async remote(value){await this.room.setMetadata({[ROOM_KEY]:value});},
    subscriptions:()=>Boolean(listener||playerListener)
  };
}

test('Owlbear binding validates its site and credentials before reading a room', () => {
  assert.deepEqual(parseRoomLink(link,origin),invitation);
  assert.throws(()=>parseRoomLink(link,'https://other.example'),/另一个网站/);
  assert.throws(()=>parseRoomLink('javascript:alert(1)',origin));
  assert.throws(()=>parseRoomLink(origin+'/#room=bad',origin),/不完整/);
  assert.equal(parseBinding({...binding,token:'bad'},origin),null);
  assert.equal(parseBinding({...binding,origin:'https://other.example'},origin),null);
  assert.equal(new URL(journalURL(binding,true)).searchParams.get('embed'),'owlbear');
});

test('local installation uses localhost; only the same port and protocol may share its numeric loopback invitation',()=>{
  const local='http://localhost:4173',numeric='http://127.0.0.1:4173';
  const localLink=journalURL({...binding,origin:numeric});
  assert.equal(manifestURL(numeric),local+'/manifest.json');
  assert.equal(manifestURL(origin),origin+'/manifest.json');
  assert.deepEqual(parseRoomLink(localLink,local),invitation);
  assert.throws(()=>parseRoomLink(localLink,'http://localhost:4181'),/另一个网站/);
  assert.throws(()=>parseRoomLink(localLink,'https://localhost:4173'),/另一个网站/);
  assert.throws(()=>parseRoomLink(journalURL({...binding,origin:'http://localhost.attacker.example:4173'}),local),/另一个网站/);
});

test('GM binds the validated shared room; all players open the same manuscript, and unbinding keeps its data intact', async () => {
  const sdk=host(),requests=[],changes=[];
  const bridge=new OwlbearBridge(sdk,{origin,onChange:value=>changes.push(value),fetcher:async(path,options)=>{
    requests.push({path,options});return {ok:true,json:async()=>({campaign:{name:'卡塔尼亚'}})};
  }});
  await bridge.start();await bridge.bind(link);
  assert.equal(requests[0].path,'/api/rooms/'+invitation.roomId);
  assert.equal(requests[0].options.headers.Authorization,'Bearer '+invitation.token);
  assert.deepEqual(sdk.writes[0],{[ROOM_KEY]:binding});
  sdk.setRole('PLAYER');await bridge.open();
  assert.deepEqual(sdk.opened[0],{id:BOOK_MODAL,url:journalURL(binding,true),fullScreen:true,hidePaper:true});
  sdk.setRole('GM');await bridge.unbind();
  assert.equal(bridge.binding,null);
  assert.deepEqual(sdk.writes.at(-1),{[ROOM_KEY]:null});
  assert.equal(requests.length,1); // Unbinding makes no write to the journal service.
  assert.equal(changes.at(-1).role,'GM');
  bridge.stop();assert.equal(sdk.subscriptions(),false);
});

test('a player cannot bind, and a role change during validation cannot write room settings', async () => {
  const sdk=host('PLAYER');
  const bridge=new OwlbearBridge(sdk,{origin,fetcher:()=>assert.fail('A player must not request a binding')});
  await bridge.start();await assert.rejects(bridge.bind(link),/主持人/);
  await assert.rejects(bridge.unbind(),/主持人/);assert.equal(sdk.writes.length,0);
  sdk.setRole('GM');bridge.fetcher=async()=>{sdk.setRole('PLAYER');return {ok:true,json:async()=>({campaign:{name:'卡塔尼亚'}})};};
  await assert.rejects(bridge.bind(link),/主持人/);assert.equal(sdk.writes.length,0);bridge.stop();
});

test('remote binding changes during a pending validation are preserved, and malformed metadata never opens another site', async () => {
  const sdk=host(),other={...binding,roomId:'c'.repeat(24),name:'另一段远征'};
  const bridge=new OwlbearBridge(sdk,{origin,fetcher:async()=>{await sdk.remote(other);return {ok:true,json:async()=>({campaign:{name:'卡塔尼亚'}})};}});
  await bridge.start();await assert.rejects(bridge.bind(link),/已经改变/);
  assert.deepEqual(bridge.binding,other);
  await sdk.remote({...binding,origin:'https://hostile.example'});
  await assert.rejects(bridge.open(),/还没有绑定/);assert.equal(sdk.opened.length,0);bridge.stop();
});

test('an expired invitation leaves the current binding untouched', async () => {
  const sdk=host(),bridge=new OwlbearBridge(sdk,{origin,fetcher:async()=>({ok:false,status:403})});
  await bridge.start();await sdk.remote(binding);
  await assert.rejects(bridge.bind(link),/失效/);
  assert.deepEqual(bridge.binding,binding);assert.equal(sdk.writes.length,1);bridge.stop();
});

test('the default browser fetch is invoked without the bridge as its receiver',async()=>{
  const saved=globalThis.fetch,sdk=host();let bridge,requested=false;
  globalThis.fetch=function(){assert.notEqual(this,bridge);requested=true;return Promise.resolve({ok:true,json:async()=>({campaign:{name:'卡塔尼亚'}})});};
  try{bridge=new OwlbearBridge(sdk,{origin});await bridge.start();await bridge.bind(link);assert.equal(requested,true);}
  finally{globalThis.fetch=saved;bridge?.stop();}
});
