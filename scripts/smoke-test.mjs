// 화면 점검: 정적 서버로 앱을 띄워 모든 화면을 열고, 페이지 오류가 하나라도 나면 실패
// 실행: npm i --no-save playwright && npx playwright install chromium && node scripts/smoke-test.mjs
//   (설치된 Chrome 사용: npm i --no-save playwright-core && CHROMIUM_PATH=/usr/bin/google-chrome node scripts/smoke-test.mjs)
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

function findLocalBrowser() {
  const candidates = [
    process.env.CHROMIUM_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  ].filter(Boolean);
  return candidates.find(p => fs.existsSync(p));
}

function createCdpChromium() {
  return {
    async launch(opts = {}) {
      const exe = opts.executablePath || findLocalBrowser();
      if (!exe) throw new Error('Playwright or local Chrome/Chromium not found');
      const port = 9300 + Math.floor(Math.random() * 500);
      const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gb1000-smoke-'));
      const proc = spawn(exe, [
        '--headless=new',
        `--remote-debugging-port=${port}`,
        `--user-data-dir=${userDataDir}`,
        '--disable-gpu',
        '--no-first-run',
        'about:blank'
      ]);
      for (let i = 0; i < 40; i++) {
        try {
          const r = await fetch(`http://127.0.0.1:${port}/json/version`);
          if (r.ok) break;
        } catch {}
        await new Promise(r => setTimeout(r, 100));
      }
      return {
        async newPage({ viewport } = {}) {
          const targets = await fetch(`http://127.0.0.1:${port}/json`).then(r => r.json());
          const target = targets.find(t => t.type === 'page') || (await fetch(`http://127.0.0.1:${port}/json/new`, { method: 'PUT' }).then(r => r.json()));
          const ws = new WebSocket(target.webSocketDebuggerUrl);
          await new Promise(r => { ws.onopen = r; });
          let seq = 1, currentUrl = 'about:blank';
          const pending = new Map(), listeners = { pageerror: [], dialog: [] };
          ws.onmessage = ev => {
            const msg = JSON.parse(ev.data);
            if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
            if (msg.method === 'Runtime.exceptionThrown') {
              const text = msg.params?.exceptionDetails?.exception?.description || msg.params?.exceptionDetails?.text || 'Uncaught exception';
              listeners.pageerror.forEach(fn => fn(new Error(text)));
            }
            if (msg.method === 'Page.javascriptDialogOpening') {
              listeners.dialog.forEach(fn => fn({ dismiss: () => send('Page.handleJavaScriptDialog', { accept: false }) }));
            }
          };
          const send = (method, params = {}) => new Promise(resolve => {
            const id = seq++; pending.set(id, resolve); ws.send(JSON.stringify({ id, method, params }));
          });
          await send('Page.enable');
          await send('Runtime.enable');
          if (viewport) await send('Emulation.setDeviceMetricsOverride', { width: viewport.width, height: viewport.height, deviceScaleFactor: 1, mobile: viewport.width < 768 });
          return {
            on(evt, fn) { if (listeners[evt]) listeners[evt].push(fn); },
            url() { return currentUrl; },
            async goto(url) { currentUrl = url; await send('Page.navigate', { url }); await new Promise(r => setTimeout(r, 400)); },
            async evaluate(fn, arg) {
              const expr = typeof fn === 'function' ? `(${fn.toString()})(${arg === undefined ? '' : JSON.stringify(arg)})` : String(fn);
              const res = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
              return res.result?.result?.value;
            },
            async waitForFunction(fn, _arg, { timeout = 30000 } = {}) {
              const deadline = Date.now() + timeout;
              while (Date.now() < deadline) {
                if (await this.evaluate(fn)) return;
                await new Promise(r => setTimeout(r, 100));
              }
              throw new Error('waitForFunction timeout');
            },
            async waitForTimeout(ms) { await new Promise(r => setTimeout(r, ms)); },
            async close() { ws.close(); }
          };
        },
        async close() {
          proc.kill();
          try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch {}
        }
      };
    }
  };
}

let chromium;
try { ({ chromium } = await import('playwright')); }
catch { try { ({ chromium } = await import('playwright-core')); } catch { chromium = createCdpChromium(); } }

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
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
for (const viewport of [{ width: 1366, height: 900 }, { width: 390, height: 844 }, { width: 320, height: 640 }]) {
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
    // 휴대폰에서 화면이 옆으로 밀리면(가로 넘침) 버튼이 화면 밖으로 나가므로 실패로 봄
    const overflow = await page.evaluate(() => { const a = document.getElementById('app-view'); return a.scrollWidth - a.clientWidth; });
    if (overflow > 1) failures.push(`${viewport.width}px ${view}: content is ${overflow}px wider than the screen`);
  }
  await page.evaluate(() => openDetail(1)); await page.waitForTimeout(150);
  await page.close();
}
await browser.close(); server.close();
if (failures.length) { console.error(failures.map(f => `✗ ${f}`).join('\n')); process.exit(1); }
console.log(`Smoke test passed: ${views.length} screens × 3 viewport sizes, term detail.`);
