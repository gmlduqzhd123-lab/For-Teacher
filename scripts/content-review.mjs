#!/usr/bin/env node
// 내용 검수 기록 편집 도구 (data/content-meta.json)
//
//   node scripts/content-review.mjs status
//   node scripts/content-review.mjs sources
//   node scripts/content-review.mjs show term:4
//   node scripts/content-review.mjs mark term:4 --source law-school-violence [--source ...] [--date 2026-10-25] [--scope 전국 공통]
//   node scripts/content-review.mjs flag term:4      (지침 변경 확인 필요로 표시)
//   node scripts/content-review.mjs reset term:4     (검수 전으로 되돌림)
//
// 'reviewed'는 공식 근거(--source)와 확인일이 모두 있어야 기록됩니다.
import fs from 'node:fs';

const file = new URL('../data/content-meta.json', import.meta.url);
const meta = JSON.parse(fs.readFileSync(file, 'utf8'));
const [cmd, target, ...rest] = process.argv.slice(2);

function opt(name) {
  const values = [];
  for (let i = 0; i < rest.length; i++) if (rest[i] === `--${name}`) values.push(rest[i + 1]);
  return values;
}
function fail(message) { console.error(`오류: ${message}`); process.exit(1); }
function today() { return new Date().toISOString().slice(0, 10); }
function save() { fs.writeFileSync(file, `${JSON.stringify(meta, null, 2)}\n`); }
function item(id) {
  if (!id) fail('항목 ID가 필요합니다. 예: term:4, situation:student-injury');
  const record = meta.items[id];
  if (!record) fail(`'${id}' 항목이 없습니다.`);
  return record;
}

switch (cmd) {
  case 'status': {
    const counts = {};
    for (const record of Object.values(meta.items)) counts[record.reviewStatus] = (counts[record.reviewStatus] || 0) + 1;
    console.log(`전체 ${Object.keys(meta.items).length}개`, counts);
    break;
  }
  case 'sources':
    for (const src of meta.sources) console.log(`${src.id.padEnd(26)} ${src.kind.padEnd(6)} ${src.title}`);
    break;
  case 'show':
    console.log(target, item(target));
    break;
  case 'mark': {
    const record = item(target);
    const sourceIds = opt('source');
    if (!sourceIds.length) fail('--source 로 대조한 공식 근거를 하나 이상 적어 주세요. 목록: node scripts/content-review.mjs sources');
    const unknown = sourceIds.filter(id => !meta.sources.some(src => src.id === id));
    if (unknown.length) fail(`등록되지 않은 근거: ${unknown.join(', ')}`);
    const date = opt('date')[0] || today();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) fail('--date 는 YYYY-MM-DD 형식이어야 합니다.');
    Object.assign(record, { reviewStatus: 'reviewed', checkedAt: date, sourceIds: [...new Set(sourceIds)] });
    const scope = opt('scope')[0];
    if (scope) record.scope = scope;
    save();
    console.log(`${target}: 대조 완료 (${date})`);
    break;
  }
  case 'flag': {
    const record = item(target);
    record.reviewStatus = 'needs-update';
    save();
    console.log(`${target}: 지침 변경 확인 필요`);
    break;
  }
  case 'reset': {
    Object.assign(item(target), { reviewStatus: 'needs-review', checkedAt: null, scope: null, sourceIds: [] });
    save();
    console.log(`${target}: 검수 전으로 되돌림`);
    break;
  }
  default:
    console.log('사용법: node scripts/content-review.mjs <status|sources|show|mark|flag|reset> [항목ID] [--source 근거ID] [--date YYYY-MM-DD] [--scope 범위]');
}
