import test from 'node:test';
import assert from 'node:assert/strict';
import {demoState, validateData, sortEntries, transferItem, escapeHtml} from '../dist/domain.js';

test('adventure date and creation order differ; edits retain order',()=>{
 const s=demoState(),e=s.campaigns[0].entries;
 assert.deepEqual(sortEntries(e).map(x=>x.sequence),[1,3,2]);
 e[0].updatedAt=new Date().toISOString();
 assert.deepEqual(sortEntries(e,'written').map(x=>x.sequence),[3,2,1]);
 assert.deepEqual(e.map(x=>x.sequence),[1,2,3]);
});
test('partial and complete transfers conserve total quantity and descriptions',()=>{
 const c=demoState().campaigns[0],before=c.items.filter(x=>x.name==='干粮').reduce((n,x)=>n+x.quantity,0);
 transferItem(c,'item_food',null,2);
 assert.equal(c.items.find(x=>x.id==='item_food').quantity,4);
 const inVault=c.items.find(x=>x.name==='干粮'&&x.ownerId===null);
 assert.equal(inVault.quantity,2);
 transferItem(c,inVault.id,'character_scribe',2);
 assert.equal(c.items.filter(x=>x.name==='干粮').reduce((n,x)=>n+x.quantity,0),before);
 assert.equal(c.items.find(x=>x.id===inVault.id).ownerId,'character_scribe');
 assert.equal(c.history.length,2);
 assert.ok(inVault.description);
});
test('invalid transfers do not mutate campaign',()=>{
 for(const [target,amount] of [[null,0],[null,1.5],[null,99],['missing',1],['character_traveler',1]]){
 const c=demoState().campaigns[0],before=structuredClone(c);
 assert.throws(()=>transferItem(c,'item_food',target,amount));
 assert.deepEqual(c,before);
 }
});
test('backup survives a JSON round trip',()=>{
 const s=demoState();
 assert.deepEqual(validateData(JSON.parse(JSON.stringify(s))),s);
});
test('malformed or inconsistent backups are rejected',()=>{
 const corruptions=[
 s=>s.campaigns[0].entries[1].sequence=1,
 s=>s.nextSequence=1,
 s=>s.currentCampaignId='missing',
 s=>s.currentCharacterByCampaign=null,
 s=>s.campaigns[0].entries[0].markerId='missing',
 s=>s.campaigns[0].characters[0].color='red;background:url(bad)',
 s=>s.campaigns[0].maps[0].asset='https://evil.example/map',
 s=>s.campaigns[0].items[0].quantity=-1,
 s=>s.campaigns[0].markers[0].x=2,
 s=>s.campaigns[0].entries[0].createdAt='not-a-date'
 ];
 for(const corrupt of corruptions){const s=demoState();corrupt(s);assert.throws(()=>validateData(s));}
});
test('free text cannot inject HTML',()=>{
 assert.equal(escapeHtml('<img src=x onerror="alert(1)">'), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
});
