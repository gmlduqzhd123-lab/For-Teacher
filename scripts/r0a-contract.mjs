import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash, pbkdf2Sync, createCipheriv, createDecipheriv } from 'node:crypto';
import assert from 'node:assert/strict';

const baselineCommit = '1aae4b714acd73fd6c6a6da4fb38f6e1d2fdb03f';
const app = 'gyojik-baekseo-1000';
const prefixes = ['eb_1000_final_', 'eb_1000_v7_'];
const text = path => readFileSync(path, 'utf8');
const json = path => JSON.parse(text(path));
const sha256 = value => createHash('sha256').update(value).digest('hex');
const baselineHtml = execFileSync('git', ['show', `${baselineCommit}:index.html`], { encoding: 'utf8', maxBuffer: 2_000_000 });
const baselineData = JSON.parse(baselineHtml.match(/^\s*const DEFAULT_DATA = (\{.*\});\s*$/m)?.[1] || 'null');
assert(baselineData, 'baseline DEFAULT_DATA not found');

function legacyMap(data) {
  const terms = data.terms.filter(t => t && t.id != null && t.keyword && t.description && t.simple);
  const usedIds = new Set(terms.map(t => t.id));
  const byKeyword = new Map(terms.map(t => [t.keyword, t]));
  const topics = data.topics.map(s => String(s).trim()).filter(Boolean);
  const prefixesForTitle = ['', '초등 ', '학교 ', '실무 ', '교육 ', '기본 ', '현장 ', '행정 ', '운영 ', '지원 '];
  const entries = terms.map(t => ({ legacyId: t.id, legacyKeyword: t.keyword, termId: `term:${t.id}`, kind: 'original' }));
  const seenKeyword = new Set(terms.map(t => t.keyword));
  const generated = [];
  for (let i = 0; i < 990 && topics.length; i++) {
    const id = 11 + i;
    if (usedIds.has(id)) continue;
    const topic = topics[i % topics.length];
    const cycle = Math.floor(i / topics.length);
    if (cycle > 0 && data.variants === false) continue;
    let keyword = cycle === 0 ? topic : `${prefixesForTitle[cycle % prefixesForTitle.length]}${topic}`;
    if (seenKeyword.has(keyword)) keyword += ' 관련 지침';
    const base = byKeyword.get(topic);
    assert(base, `generated ID ${id} has no original term: ${topic}`);
    generated.push({ legacyId: id, legacyKeyword: keyword, termId: `term:${base.id}`, kind: 'generated' });
    seenKeyword.add(keyword);
  }
  entries.push(...generated);
  entries.sort((a, b) => a.legacyId - b.legacyId);
  const termIdMap = Object.fromEntries(entries.map(e => [e.legacyId, e.termId]));
  const keywordMap = {};
  for (const e of entries) {
    assert(!Object.hasOwn(keywordMap, e.legacyKeyword) || keywordMap[e.legacyKeyword] === e.termId,
      `ambiguous legacy keyword: ${e.legacyKeyword}`);
    keywordMap[e.legacyKeyword] = e.termId;
  }
  const yearTaskMap = {};
  for (let month = 1; month <= 12; month++) {
    (data.yearTasks[month] || []).forEach((task, index) => {
      yearTaskMap[`${month}_${index}`] = {
        taskId: `year-task:${String(month).padStart(2, '0')}:${String(index).padStart(2, '0')}`,
        month, legacyIndex: index, title: task.title,
        legacyIcsUidPattern: `{academicYear}-${month}-${index}@gyojik-baekseo-1000`
      };
    });
  }
  return {
    baselineCommit, baselineDataSha256: sha256(JSON.stringify(data)),
    originalCount: terms.length, generatedCount: generated.length,
    termIdMap, keywordMap, yearTaskMap
  };
}

function inventory(storage) {
  const rows = [];
  for (const [fullKey, raw] of Object.entries(storage)) {
    const prefix = prefixes.find(p => fullKey.startsWith(p));
    if (!prefix) continue;
    let parsed, valid = true;
    try { parsed = JSON.parse(raw); } catch { valid = false; }
    rows.push({ fullKey, suffix: fullKey.slice(prefix.length), prefix,
      sha256: sha256(raw), validJson: valid,
      count: !valid ? null : Array.isArray(parsed) ? parsed.length : parsed && typeof parsed === 'object' ? Object.keys(parsed).length : 1 });
  }
  return rows.sort((a, b) => a.fullKey.localeCompare(b.fullKey));
}

function fixtures() {
  const raw = value => JSON.stringify(value);
  const storageCases = {
    bothPrefixesAndCorruptCurrent: {
      [`${prefixes[0]}bookmarks`]: raw([153, 295, 437, 11]),
      [`${prefixes[1]}bookmarks`]: raw([12, 153]),
      [`${prefixes[0]}recent_searches`]: '[broken JSON',
      [`${prefixes[1]}recent_searches`]: raw(['합성 검색 문구']),
      [`${prefixes[0]}checklist_3`]: raw({ 0: true }),
      [`${prefixes[1]}checklist_3`]: raw({ 1: true }),
      [`${prefixes[0]}ics_year`]: raw(2026),
      [`${prefixes[0]}year_task_dates`]: raw({ '2026_3_0': '2026-03-04' }),
      [`${prefixes[0]}board_title`]: raw('합성 행사'),
      [`${prefixes[0]}board_tasks`]: raw({ t1: { title: '합성 할 일', done: true } }),
      [`${prefixes[0]}record_drafts`]: raw({ behavior: '합성 초안' }),
      [`${prefixes[0]}counsel_records`]: raw([{ id: 'synthetic-counsel-1', student: '가상 학생', summary: '합성 상담' }]),
      [`${prefixes[1]}unsupported_legacy_key`]: raw({ note: '암호화 스냅샷에만 보존' }),
      'other_app_private_record': raw('읽거나 수정하지 않음')
    },
    neverSavedBoard: { [`${prefixes[0]}theme_mode`]: raw('system') },
    savedEmptyBoard: { [`${prefixes[0]}board_tasks`]: raw({}) }
  };
  const plain = { bookmarks: [153], record_drafts: { behavior: '합성 초안' } };
  const v3 = { app, version: 3, exportedAt: '2026-10-18T00:00:00.000Z', data: plain };
  const password = 'synthetic-only-password';
  const salt = Buffer.from('00112233445566778899aabbccddeeff', 'hex');
  const iv = Buffer.from('00112233445566778899aabb', 'hex');
  const key = pbkdf2Sync(password, salt, 250000, 32, 'sha256');
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const payload = { records: [{ id: 'synthetic-counsel-1', student: '가상 학생', summary: '합성 상담' }], exportedAt: '2026-10-18T00:00:00.000Z' };
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final(), cipher.getAuthTag()]);
  const counselEncryptedV1 = { app, type: 'counsel-encrypted', v: 1, kdf: 'PBKDF2-SHA256', iterations: 250000,
    salt: salt.toString('base64'), iv: iv.toString('base64'), data: encrypted.toString('base64') };
  const expectedInventory = Object.fromEntries(Object.entries(storageCases).map(([name, values]) => [name, inventory(values)]));
  const urlCases = [
    { hash: `#keyword=${encodeURIComponent('초등 학교폭력')}`, keyword: '초등 학교폭력' },
    { hash: `#keyword=${encodeURIComponent('현장 체험학습')}`, keyword: '현장 체험학습' },
    { hash: `#view=search&param=${encodeURIComponent('100% 확인')}`, param: '100% 확인' }
  ];
  return { syntheticOnly: true, storageCases, expectedInventory, urlCases,
    backups: { legacyFlat: plain, v3, counselEncryptedV1 }, testPassword: password };
}

function verify(map, fixture) {
  const ids = Object.keys(map.termIdMap);
  assert.equal(ids.length, 1009);
  assert.equal(map.originalCount, 161);
  assert.equal(map.generatedCount, 848);
  assert.equal(Object.keys(map.keywordMap).length, 1009);
  assert.equal(Object.keys(map.yearTaskMap).length, 24);
  assert.equal(new Set(ids).size, 1009);
  const targets = new Set(baselineData.terms.map(t => `term:${t.id}`));
  for (const id of ids) assert(targets.has(map.termIdMap[id]), `missing target for ${id}`);
  for (const t of baselineData.terms) assert.equal(map.termIdMap[t.id], `term:${t.id}`);
  for (const id of [153, 295, 437]) assert.equal(map.termIdMap[id], 'term:11');
  assert.equal(new Set(Object.values(map.yearTaskMap).map(x => x.taskId)).size, 24);
  assert.deepEqual(map, legacyMap(baselineData), 'frozen map differs from baseline');
  const current = json('terms.json');
  delete current._설명;
  assert.equal(sha256(JSON.stringify(current)), sha256(JSON.stringify(baselineData)), 'terms.json content differs from embedded baseline data');
  assert.equal(current.situations.length, 15);
  assert.equal(current.courses.length, 10);
  const storage = json('data/storage-map.json');
  assert.deepEqual(storage.prefixes, prefixes);
  const source = text('index.html');
  const literalKeys = [...source.matchAll(/Storage\.(?:get|set)\('([^']+)'/g)].map(m => m[1]);
  for (const key of literalKeys) assert(Object.hasOwn(storage.keys, key), `storage key lacks contract: ${key}`);
  for (let month = 1; month <= 12; month++) assert(Object.hasOwn(storage.keys, `checklist_${month}`));
  assert.equal(Object.keys(storage.keys).length, 35);
  assert(source.includes('eb_1000_final_') && source.includes('eb_1000_v7_'));
  assert.equal(fixture.syntheticOnly, true);
  const cases = fixture.storageCases;
  for (const [name, values] of Object.entries(cases)) assert.deepEqual(inventory(values), fixture.expectedInventory[name], `inventory mismatch: ${name}`);
  assert.equal(fixture.expectedInventory.bothPrefixesAndCorruptCurrent.filter(r => !r.validJson).length, 1);
  assert.equal(fixture.expectedInventory.bothPrefixesAndCorruptCurrent.some(r => r.fullKey === 'other_app_private_record'), false);
  assert(cases.bothPrefixesAndCorruptCurrent[`${prefixes[0]}recent_searches`] === '[broken JSON');
  assert(Object.hasOwn(cases.bothPrefixesAndCorruptCurrent, `${prefixes[1]}recent_searches`));
  assert(!Object.hasOwn(cases.neverSavedBoard, `${prefixes[0]}board_tasks`));
  assert.deepEqual(JSON.parse(cases.savedEmptyBoard[`${prefixes[0]}board_tasks`]), {});
  assert.deepEqual(JSON.parse(cases.bothPrefixesAndCorruptCurrent[`${prefixes[0]}record_drafts`]), { behavior: '합성 초안' });
  assert(Object.hasOwn(cases.bothPrefixesAndCorruptCurrent, 'other_app_private_record'));
  for (const sample of fixture.urlCases) {
    if (sample.keyword) assert.equal(decodeURIComponent(sample.hash.slice(9)), sample.keyword);
    else assert.equal(new URLSearchParams(sample.hash.slice(1)).get('param'), sample.param);
  }
  assert.equal(fixture.backups.v3.version, 3);
  assert.equal(fixture.backups.counselEncryptedV1.type, 'counsel-encrypted');
  const env = fixture.backups.counselEncryptedV1;
  const bytes = Buffer.from(env.data, 'base64');
  const decipher = createDecipheriv('aes-256-gcm', pbkdf2Sync(fixture.testPassword, Buffer.from(env.salt, 'base64'), env.iterations, 32, 'sha256'), Buffer.from(env.iv, 'base64'));
  decipher.setAuthTag(bytes.subarray(-16));
  const decoded = JSON.parse(Buffer.concat([decipher.update(bytes.subarray(0, -16)), decipher.final()]).toString('utf8'));
  assert.equal(decoded.records.length, 1);
  assert.equal(fixture.backups.legacyFlat.record_drafts.behavior, '합성 초안');
  console.log(`PASS: ${ids.length} legacy IDs -> ${targets.size} original terms; ${map.generatedCount} generated; ${Object.keys(map.yearTaskMap).length} year tasks`);
  console.log(`PASS: embedded/terms.json alignment; ${Object.keys(storage.keys).length} storage keys; synthetic dual-prefix, corrupt, board, draft and backup fixtures`);
  console.log('PARTIAL Q01/Q02: contract fixtures checked; runtime migration, URL navigation and interruption recovery not yet implemented');
}

const mode = process.argv[2] || 'verify';
if (mode === 'generate') {
  mkdirSync('data', { recursive: true });
  mkdirSync('fixtures/r0a', { recursive: true });
  writeFileSync('data/legacy-map.json', JSON.stringify(legacyMap(baselineData), null, 2) + '\n');
  writeFileSync('fixtures/r0a/synthetic.json', JSON.stringify(fixtures(), null, 2) + '\n');
} else assert.equal(mode, 'verify', 'usage: node scripts/r0a-contract.mjs [generate|verify]');
verify(json('data/legacy-map.json'), json('fixtures/r0a/synthetic.json'));
