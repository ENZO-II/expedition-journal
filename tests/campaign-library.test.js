import test from 'node:test';
import assert from 'node:assert/strict';
import {arrangeLibrary, relatedShared} from '../dist/campaign-library.js';
import {demoState, createCampaign, validateData} from '../dist/domain.js';

test('private and shared manuscripts stay separate under one book, including after a rename', () => {
  const privateBook = createCampaign('卡塔尼亚');
  const roomBook = {...structuredClone(privateBook), id:'campaign_room', name:'卡塔尼亚 · 新篇'};
  const books = arrangeLibrary([privateBook, roomBook], {campaign_room:{id:'room'}});
  assert.equal(books.length, 1);
  assert.deepEqual(books[0].variants.map(v => v.label), ['私有', '共享']);
  assert.equal(relatedShared([privateBook, roomBook], {campaign_room:{}}, privateBook.id).id, roomBook.id);
  assert.notEqual(privateBook.id, roomBook.id);
});

test('migration recognizes an inherited v12 record trail, without merging namesakes or ambiguous originals', () => {
  const original = demoState().campaigns[0];
  const clone = structuredClone(original);
  delete original.bookId; delete clone.bookId;
  clone.id = 'campaign_shared';
  clone.entries[0].body = '同伴后来改写了正文';
  const unrelated = createCampaign(original.name);
  delete unrelated.bookId;
  const books = arrangeLibrary([original, clone, unrelated], {[clone.id]:{}});
  assert.equal(books.length, 2);
  assert.equal(original.bookId, clone.bookId);
  const a = structuredClone(original), b = structuredClone(original), s = structuredClone(clone);
  a.id='campaign_a';b.id='campaign_b';s.id='campaign_s';
  delete a.bookId;delete b.bookId;delete s.bookId;
  assert.equal(arrangeLibrary([a,b,s], {[s.id]:{}}).length, 3);
});

test('backup round trip retains grouping and keeps every recovered private copy accessible', () => {
  const state = demoState(), c = state.campaigns[0];
  const other = structuredClone(c);other.id='campaign_copy';
  // Remove entities to keep a valid independent restored copy in the backup.
  other.characters=[];other.maps=[];other.markers=[];other.entries=[];other.items=[];
  state.campaigns.push(other);
  const restored = validateData(JSON.parse(JSON.stringify(state)));
  const books=arrangeLibrary(restored.campaigns);
  assert.equal(books.length,1);
  assert.deepEqual(books[0].variants.map(v=>v.label),['私有 · 副本 1','私有 · 副本 2']);
});
