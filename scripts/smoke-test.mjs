// 화면 점검: 정적 서버로 앱을 띄워 모든 화면을 열고, 페이지 오류가 하나라도 나면 실패
// 실행: npm i --no-save playwright && npx playwright install chromium && node scripts/smoke-test.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

let chromium;
try { ({ chromium } = await import('playwright')); } catch { ({ chromium } = await import('playwright-core')); }

const root = path.resolve(new URL('..', import.meta.url).pathname);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg' };
const server = http.createServer((req, res) => {
  const file = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/\/$/, '/index.html'));
  if (!file.startsWith(root) || !fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}/`;

const views = ['home', 'search', 'situations', 'navigator', 'map', 'year', 'career', 'quiz', 'card', 'mybox', 'start', 'tools-doc', 'tools-class', 'tools-board', 'tools-edutech', 'timetable', 'tools-record', 'counsel'];
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const failures = [];
for (const viewport of [{ width: 1366, height: 900 }, { width: 390, height: 844 }]) {
  const page = await browser.newPage({ viewport });
  page.on('pageerror', err => failures.push(`${viewport.width}px ${page.url()}: ${err.message}`));
  page.on('dialog', d => d.dismiss());
  await page.goto(base, { waitUntil: 'load' });
  await page.waitForFunction(() => typeof router !== 'undefined' && document.querySelector('#app-view')?.textContent.length > 50, null, { timeout: 30000 });
  for (const view of views) {
    await page.evaluate(v => router.navigate(v), view);
    await page.waitForTimeout(150);
    const text = await page.evaluate(() => document.getElementById('app-view').textContent);
    if (text.includes('화면 로딩 오류')) failures.push(`${viewport.width}px ${view}: error screen shown`);
  }
  await page.evaluate(() => openDetail(1)); await page.waitForTimeout(150);
  await page.close();
}
await browser.close(); server.close();
if (failures.length) { console.error(failures.map(f => `✗ ${f}`).join('\n')); process.exit(1); }
console.log(`Smoke test passed: ${views.length} screens × 2 viewport sizes, term detail.`);
