import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createJournalServer} from '../server.js';
import {demoState} from '../dist/domain.js';

test('Owlbear can load the manifest and icon; the journal API keeps its same-site boundary', async t => {
  const dataDir=await mkdtemp(join(tmpdir(),'journal-extension-'));
  const server=await createJournalServer({dataDir});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(async()=>{await new Promise(resolve=>server.close(resolve));await rm(dataDir,{recursive:true,force:true});});
  const origin='http://127.0.0.1:'+server.address().port;
  const manifestResponse=await fetch(origin+'/manifest.json',{headers:{Origin:'https://www.owlbear.rodeo'}});
  assert.equal(manifestResponse.status,200);
  assert.match(manifestResponse.headers.get('Content-Type'),/application\/json/);
  assert.equal(manifestResponse.headers.get('Access-Control-Allow-Origin'),'*');
  assert.equal(manifestResponse.headers.get('Cache-Control'),'no-cache');
  const manifest=await manifestResponse.json();
  assert.equal(manifest.manifest_version,1);
  for(const path of [manifest.action.icon,manifest.action.popover,'/vendor/obr-sdk.js']) {
    const response=await fetch(origin+path);assert.equal(response.status,200);await response.arrayBuffer();
    assert.match(response.headers.get('Content-Security-Policy'),/https:\/\/www\.owlbear\.rodeo/);
  }
  const preflight=await fetch(origin+'/manifest.json',{method:'OPTIONS',headers:{Origin:'https://www.owlbear.rodeo'}});
  assert.equal(preflight.status,204);
  const privateRequest=await fetch(origin+'/api/rooms',{method:'POST',headers:{Origin:'https://www.owlbear.rodeo','Content-Type':'application/json'},body:JSON.stringify({campaign:demoState().campaigns[0]})});
  assert.equal(privateRequest.status,403);
  assert.equal(privateRequest.headers.get('Access-Control-Allow-Origin'),null);
});
