// A book can have a device-private manuscript and a room-shared manuscript.
// Their content stays separate; this module only arranges the library.
const shared = (bindings, id) => Object.hasOwn(bindings, id);

function inheritedTrail(privateBook, roomBook) {
  if (privateBook.name !== roomBook.name || !privateBook.entries.length) return false;
  const characters = c => c.characters.map(x => x.name + '\0' + x.color).sort().join('\n');
  const maps = c => c.maps.map(x => x.name + '\0' + x.asset).sort().join('\n');
  if (characters(privateBook) !== characters(roomBook) || maps(privateBook) !== maps(roomBook)) return false;
  const trail = c => c.entries.map(e => [e.sequence, e.createdAt, e.authorMemberId,
    c.characters.find(x => x.id === e.characterId)?.name].join('\0'));
  const roomTrail = new Set(trail(roomBook));
  return trail(privateBook).filter(x => roomTrail.has(x)).length >= Math.min(2, privateBook.entries.length);
}

export function arrangeLibrary(campaigns, bindings = {}) {
  // Older shared copies did not carry a book ID. Only associate an unambiguous
  // inherited record trail; equal names alone never merge independent campaigns.
  for (const c of campaigns) {
    if (c.bookId || !shared(bindings, c.id)) continue;
    const candidates = campaigns.filter(p => !shared(bindings, p.id) && inheritedTrail(p, c));
    if (candidates.length === 1) c.bookId = candidates[0].bookId ?? candidates[0].id;
  }
  const books = new Map();
  for (const c of campaigns) {
    c.bookId ??= c.id;
    if (!books.has(c.bookId)) books.set(c.bookId, {id: c.bookId, variants: []});
    books.get(c.bookId).variants.push({campaign: c, access: shared(bindings, c.id) ? 'shared' : 'private'});
  }
  for (const book of books.values()) {
    book.variants.sort((a, b) => (a.access === 'shared') - (b.access === 'shared'));
    book.name = book.variants[0].campaign.name;
    for (const access of ['private', 'shared']) {
      const variants = book.variants.filter(x => x.access === access);
      variants.forEach((variant, index) => {
        variant.label = access === 'shared' ? '共享' : '私有';
        if (variants.length > 1) variant.label += ' · 副本 ' + (index + 1);
      });
    }
  }
  return [...books.values()];
}

export function relatedShared(campaigns, bindings, campaignId) {
  const book = arrangeLibrary(campaigns, bindings).find(b => b.variants.some(v => v.campaign.id === campaignId));
  return book?.variants.find(v => v.access === 'shared')?.campaign;
}
