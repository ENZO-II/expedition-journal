import test from 'node:test';
import assert from 'node:assert/strict';
import{demoState,validateData,sortEntries}from'../dist/domain.js';
import{addReply,markerParticipants,validAvatar}from'../dist/discussion.js';
import{cropFrame}from'../dist/crop-geometry.js';

test('legacy records remain valid without avatars or replies',()=>{const s=demoState();assert.equal(validateData(s),s);assert.equal(s.campaigns[0].entries[0].replies,undefined);});
test('reply and supplement belong to the original entry without a new sequence or date',()=>{
 const s=demoState(),c=s.campaigns[0],original=structuredClone(c.entries[0]),order=sortEntries(c.entries).map(x=>x.id),next=s.nextSequence;
 const reply=addReply(c,'entry',original.id,{characterId:'character_scribe',authorMemberId:s.memberId,body:'同伴的回复'});
 addReply(c,'entry',original.id,{characterId:'character_traveler',authorMemberId:s.memberId,kind:'supplement',body:'后来的补充',parentId:reply.id});
 assert.equal(c.entries.length,3);assert.equal(s.nextSequence,next);assert.equal(c.entries[0].updatedAt,original.updatedAt);assert.deepEqual(sortEntries(c.entries).map(x=>x.id),order);
 assert.equal(validateData(JSON.parse(JSON.stringify(s))).campaigns[0].entries[0].replies.length,2);
});
test('map participants include original author, entry responders and place contributors once',()=>{
 const s=demoState(),c=s.campaigns[0],m=c.markers[0];m.characterId='character_traveler';
 addReply(c,'entry',c.entries[0].id,{characterId:'character_scribe',authorMemberId:s.memberId,body:'补记'});
 addReply(c,'marker',m.id,{characterId:'character_scribe',authorMemberId:s.memberId,body:'地点留言'});
 assert.deepEqual(markerParticipants(c,m).map(x=>x.id),['character_traveler','character_scribe']);assert.equal(c.entries.length,3);validateData(s);
});
test('invalid and cross-thread replies do not change data',()=>{
 const s=demoState(),c=s.campaigns[0],base={characterId:'character_scribe',authorMemberId:s.memberId,body:'文字'};
 for(const values of [{body:'  '},{body:'x'.repeat(10001)},{characterId:'missing'},{kind:'bad'},{parentId:'foreign-reply'}]){const before=structuredClone(c);assert.throws(()=>addReply(c,'entry',c.entries[0].id,{...base,...values}));assert.deepEqual(c,before);}
});
test('backup rejects forged reply authors, duplicate IDs and cross-thread parents',()=>{
 for(const corrupt of [s=>s.campaigns[0].entries[0].replies[0].characterId='missing',s=>s.campaigns[0].entries[0].replies[0].id=s.campaigns[0].entries[0].id,s=>s.campaigns[0].entries[0].replies[0].parentId='not-in-thread',s=>s.campaigns[0].entries[0].replies[0].body='']){
 const s=demoState();addReply(s.campaigns[0],'entry','entry_begin',{characterId:'character_scribe',authorMemberId:s.memberId,body:'test'});corrupt(s);assert.throws(()=>validateData(s));}
});
test('avatar validation allows raster data only and rejects external or mislabeled content',()=>{
 const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==';
 assert.ok(validAvatar(png));const s=demoState();s.campaigns[0].characters[0].avatar=png;assert.equal(validateData(JSON.parse(JSON.stringify(s))).campaigns[0].characters[0].avatar,png);
 for(const bad of ['https://example.com/a.png','data:image/svg+xml;base64,PHN2Zz4=','data:image/png;base64,PHNjcmlwdD4=',png+'x'.repeat(150000)]){assert.equal(validAvatar(bad),false);s.campaigns[0].characters[0].avatar=bad;assert.throws(()=>validateData(s));}
});
test('crop covers the circle for portrait and landscape at zoom and drag limits',()=>{
 for(const [w,h] of [[1600,900],[800,1600],[100,100]])for(const z of [1,2,4])for(const [x,y] of [[0,0],[1e6,-1e6],[-1e6,1e6]]){
 const f=cropFrame(w,h,280,z,x,y);assert.ok(f.left<=.001&&f.top<=.001);assert.ok(f.left+f.width>=279.999&&f.top+f.height>=279.999);assert.equal(f.width/f.height,w/h);
 }
});
