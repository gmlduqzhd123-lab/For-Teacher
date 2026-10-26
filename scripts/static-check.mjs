// 정적 점검: JSON 형식, 자바스크립트 문법(인라인 포함), 로컬 파일 참조, 서비스 워커 캐시 목록
import fs from 'node:fs';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const read = file => fs.readFileSync(new URL(file, root), 'utf8');
const exists = file => fs.existsSync(new URL(file.replace(/^\.\//, ''), root));
const problems = [];

for (const file of ['terms.json', 'manifest.webmanifest', ...fs.readdirSync(new URL('data/', root)).filter(f => f.endsWith('.json')).map(f => `data/${f}`)]) {
  try { JSON.parse(read(file)); } catch (err) { problems.push(`JSON ${file}: ${err.message}`); }
}

for (const file of ['js/data.js', 'js/app.js', 'sw.js', 'ys-install.js']) {
  try { execFileSync(process.execPath, ['--check', fileURLToPath(new URL(file, root))], { stdio: 'pipe' }); }
  catch (err) { problems.push(`syntax ${file}: ${String(err.stderr || err.message).split('\n').slice(0, 4).join(' ')}`); }
}

const html = read('index.html');
[...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].forEach((m, i) => {
  try { new vm.Script(m[1], { filename: `index.html inline script #${i + 1}` }); } catch (err) { problems.push(`syntax index.html inline #${i + 1}: ${err.message}`); }
});

const localRefs = [...html.matchAll(/\b(?:src|href)="([^"#:]+)"/g)].map(m => m[1]).filter(ref => !ref.startsWith('//'));
for (const ref of new Set(localRefs)) if (!exists(ref)) problems.push(`missing file referenced by index.html: ${ref}`);

const sw = read('sw.js');
const core = JSON.parse(sw.match(/const CORE = (\[[^\]]*\])/)[1].replace(/'/g, '"'));
for (const file of core) if (file !== './' && !exists(file)) problems.push(`sw.js CORE file missing: ${file}`);
for (const ref of new Set(localRefs.filter(r => /\.(js|css)$/.test(r)))) if (!core.includes(`./${ref}`)) problems.push(`sw.js CORE does not cache ${ref}`);
const required = JSON.parse(read('js/app.js').match(/const required = (\[[^\]]*\])/)[1].replace(/'/g, '"'));
for (const file of required) if (!core.includes(file)) problems.push(`offline check expects ${file} but sw.js does not cache it`);

if (problems.length) { console.error(problems.map(p => `✗ ${p}`).join('\n')); process.exit(1); }
console.log(`Static checks passed: JSON, syntax (${core.length} cached files), references.`);
