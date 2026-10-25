import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const between = (start, end) => {
  const first = html.indexOf(start);
  const last = html.indexOf(end, first);
  assert(first >= 0 && last > first, `source section: ${start}`);
  return html.slice(first, last);
};

const backup = new Function(`${between("const BACKUP_EXCLUDE", "function backupData")}; return { parseBackup, validBackupDate };`)();
const wrap = data => JSON.stringify({ app: 'gyojik-baekseo-1000', version: 3, data });
assert.deepEqual(backup.parseBackup(wrap({ bookmarks: [1, 153, 295] })), [['bookmarks', [1, 153, 295]]]);
assert.deepEqual(backup.parseBackup(wrap({ checklist_3: { 0: true, 1: false } })), [['checklist_3', { 0: true, 1: false }]]);
assert.deepEqual(backup.parseBackup(wrap({ quiz_history: [{ date: '10/19/2026', score: 80, level: 'Lv.4' }] })).length, 1);
for (const bad of [
  wrap({ bookmarks: {} }),
  wrap({ bookmarks: [1, '2'] }),
  wrap({ year_task_dates: { '2026_3_1': '2026-02-30' } }),
  wrap({ settings: JSON.parse('{"__proto__": {"admin": true}}') }),
  wrap({ unknown_key: [] }),
  JSON.stringify({ app: 'other-app', version: 3, data: { bookmarks: [1] } }),
  JSON.stringify({ app: 'gyojik-baekseo-1000', version: 4, data: { bookmarks: [1] } }),
  JSON.stringify({ app: 'gyojik-baekseo-1000', version: 3, data: [] }),
]) assert.throws(() => backup.parseBackup(bad));
assert(backup.validBackupDate('2026-02-28'));
assert(!backup.validBackupDate('2026-02-30'));

const memory = new Map();
let denyWrites = false;
const storageApi = {
  getItem(key) { return memory.has(key) ? memory.get(key) : null; },
  setItem(key, value) { if (denyWrites) throw new Error('quota'); memory.set(key, value); },
  removeItem(key) { memory.delete(key); },
  get length() { return memory.size; },
  key(index) { return [...memory.keys()][index] || null; },
};
const alerts = [];
const Storage = new Function('localStorage', 'showToast', `${between('const Storage =', 'const FOOTER_HTML')}; return Storage;`)(storageApi, (...args) => alerts.push(args));
assert(Storage.set('record_drafts', { area: 'original' }));
denyWrites = true;
assert.equal(Storage.set('record_drafts', { area: 'new' }), false);
assert.deepEqual(Storage.get('record_drafts', {}), { area: 'original' });
assert(alerts.some(([, type]) => type === 'error'));
denyWrites = false;
memory.set(Storage.PREFIX + 'bookmarks', '{broken');
memory.set(Storage.LEGACY + 'bookmarks', '[153,295]');
assert.deepEqual(Storage.get('bookmarks', []), [153, 295]);
assert.equal(Storage.set('bookmarks', [11]), false);
assert.equal(memory.get(Storage.PREFIX + 'bookmarks'), '{broken');

let editor = { value: 'previous draft' };
const status = { textContent: '', innerHTML: '' };
const draftData = {};
const timers = new Map();
let timerId = 0;
const draftFunctions = new Function('Storage', 'document', 'getRecordDrafts', 'router', 'updateRecordAnalysis', 'setTimeout', 'clearTimeout',
  `let recordArea = 'a'; ${between('let pendingRecordDraft', 'function updateRecordAnalysis')} return { captureRecordDraft, saveRecordDraftNow, switchRecordArea, onRecordInput, area: () => recordArea };`
)(
  { set(key, value) { if (key !== 'record_drafts' || denyWrites) return false; Object.assign(draftData, value); return true; } },
  { getElementById(id) { return id === 'record-editor' ? editor : id === 'record-save-status' ? status : null; } },
  () => ({ ...draftData }),
  { render() { editor = { value: draftData[draftFunctions.area()] || '' }; } },
  () => {},
  callback => { const id = ++timerId; timers.set(id, callback); return id; },
  id => timers.delete(id),
);
editor.value = 'last edit';
draftFunctions.onRecordInput();
draftFunctions.switchRecordArea('b');
assert.equal(draftData.a, 'last edit');
assert.equal(draftFunctions.area(), 'b');
editor.value = 'area b';
draftFunctions.onRecordInput();
for (const callback of timers.values()) callback();
assert.equal(draftData.b, 'area b');
denyWrites = true;
editor.value = 'unsaved';
draftFunctions.onRecordInput();
draftFunctions.switchRecordArea('a');
assert.equal(draftFunctions.area(), 'b');
assert.equal(editor.value, 'unsaved');
assert(status.innerHTML.includes('다시 시도'));
denyWrites = false;

const links = JSON.parse(fs.readFileSync(new URL('../data/public-links.json', import.meta.url), 'utf8'));
const terms = JSON.parse(fs.readFileSync(new URL('../terms.json', import.meta.url), 'utf8'));
const map = JSON.parse(fs.readFileSync(new URL('../data/legacy-map.json', import.meta.url), 'utf8'));
assert.equal(new Set(links.situations.map(item => item.id)).size, terms.situations.length);
assert.equal(new Set(links.courses.map(item => item.id)).size, terms.courses.length);
assert.deepEqual(links.situations.map(item => item.title), terms.situations.map(item => item.title));
assert.deepEqual(links.courses.map(item => item.title), terms.courses.map(item => item.title));
const metadata = JSON.parse(fs.readFileSync(new URL('../data/content-meta.json', import.meta.url), 'utf8'));
assert.equal(metadata.metadataSchemaVersion, 1);
assert.equal(metadata.contentVersion, `${terms.version}-${terms.updatedAt}`);
assert.equal(Object.keys(metadata.items).length, terms.terms.length + terms.situations.length + terms.courses.length);
const sourceIds = new Set(metadata.sources.map(src => src.id));
assert.equal(sourceIds.size, metadata.sources.length);
for (const src of metadata.sources) assert.match(src.url, /^https:\/\/www\.law\.go\.kr\//);
for (const item of Object.values(metadata.items)) {
  assert.ok(['needs-review', 'reviewed', 'needs-update'].includes(item.reviewStatus));
  for (const id of item.sourceIds) assert.ok(sourceIds.has(id), `unknown source ${id}`);
  // 'reviewed' must carry both an official source and a check date
  if (item.reviewStatus === 'reviewed') {
    assert.match(item.checkedAt, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(item.sourceIds.length > 0);
  }
  if (item.reviewStatus === 'needs-review') assert.equal(item.checkedAt, null);
}
assert.equal(map.termIdMap['295'], 'term:11');
assert.equal(map.termIdMap['153'], 'term:11');

const searchCode = `${between('const CHO_LIST', 'function highlightText')}\nlet DB = [];\n${between('let LEGACY_TERM_MAP', 'let SITUATIONS')}\n${between('function rankTerms', 'function handleSearch')}\nreturn { rankTerms, setData(items, idMap) { DB = items; LEGACY_TERM_MAP = idMap; }, getChosung };`;
const search = new Function(searchCode)();
const searchable = terms.terms.map(item => ({
  ...item,
  _keywordLower: item.keyword.toLowerCase(),
  _searchText: `${item.keyword} ${(item.aliases || []).join(' ')} ${item.category} ${item.description} ${item.simple} ${(item.tags || []).join(' ')}`.toLowerCase(),
  _chosung: search.getChosung(item.keyword),
}));
for (const [id, keyword, baseId] of [[175, '초등 가족수당', 33]]) {
  const base = searchable.find(item => item.id === baseId);
  searchable.push({ ...base, id, keyword, _baseId: baseId, _keywordLower: keyword.toLowerCase(), _searchText: `${keyword} ${base._searchText}`, _chosung: search.getChosung(keyword) });
}
search.setData(searchable, map.termIdMap);
for (const [query, expected] of [
  ['현장체험학습 준비', 120], ['학생이 다쳤어요', 10], ['다침', 10],
  ['학폭', 4], ['물건 살 때', 3], ['출석인정결석', 80],
  ['초등 가족수당', 33], ['ㄱㅇㅈㅂ', 1],
]) {
  const ids = search.rankTerms(query).slice(0, 3).map(item => item.id);
  assert(ids.includes(expected), `${query}: expected ${expected}, got ${ids.join(', ')}`);
}
assert.equal(new Set(search.rankTerms('초등 가족수당').map(item => item.id)).size, search.rankTerms('초등 가족수당').length);
for (const query of ['학생이 다쳤어요', '다침']) assert(search.rankTerms(query).slice(0, 3).some(item => item.id === 1002));
console.log('Usability storage, draft, backup, search, and public ID checks passed.');
