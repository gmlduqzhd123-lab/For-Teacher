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
        async newPage({ viewport, hasTouch } = {}) {
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
          if (hasTouch) await send('Emulation.setTouchEmulationEnabled', { enabled: true });
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
// 프록시를 거쳐야 CDN(글꼴·아이콘)에 닿는 환경에서는 프록시를 쓰고, 이 정적 서버만 직접 연결
const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
const host = proxy ? 'smoke.test' : '127.0.0.1';
const base = `http://${host}:${server.address().port}/`;

const views = ['home', 'search', 'situations', 'navigator', 'map', 'year', 'career', 'quiz', 'card', 'mybox', 'start', 'tools-doc', 'tools-class', 'tools-board', 'tools-edutech', 'timetable', 'tools-record', 'counsel', 'attendance'];
const browser = await chromium.launch({
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  ...(proxy ? { proxy: { server: proxy, bypass: host }, args: ['--ignore-certificate-errors', `--host-resolver-rules=MAP ${host} 127.0.0.1`] } : {}),
});
const failures = [];
for (const viewport of [{ width: 1366, height: 900 }, { width: 390, height: 844 }, { width: 320, height: 640 }]) {
  const mobile = viewport.width < 768;
  const page = await browser.newPage({ viewport, isMobile: mobile, hasTouch: mobile });
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
  // Both base and supplemental terms must display their own verified sources.
  for (const id of [39, 71, 78, 135, 150, 3003, 3007]) {
    const rendered = await page.evaluate(termId => {
      openDetail(termId);
      const panel = document.querySelector('#modal-content [aria-label="내용 확인 정보"]');
      return panel?.textContent.includes('공식 근거와 대조 완료') && !!panel.querySelector('a[href^="https://"]');
    }, id);
    if (!rendered) failures.push(`${viewport.width}px term:${id}: verified content panel or source link missing`);
  }
  const contentReviewWorks = await page.evaluate(() => {
    const checkedPanel = selector => {
      const details = document.querySelector(selector);
      if (!details) return false;
      details.querySelector('summary').click();
      const panel = details.querySelector('[aria-label="내용 확인 정보"]');
      return details.open && panel?.textContent.includes('공식 근거와 대조 완료') && !!panel.querySelector('a[href^="https://"]');
    };
    router.navigate('situations', 'situation:01');
    const situation = checkedPanel('[id="situation-situation:01"] details');
    router.navigate('navigator', 'workflow:01');
    const workflow = checkedPanel('[id="course-workflow:01"] details');
    return situation && workflow;
  });
  if (!contentReviewWorks) failures.push(`${viewport.width}px: reviewed situation or workflow source missing`);
  const savedSituationWorks = await page.evaluate(() => {
    const id = 'situation:01';
    const saved = '2026-10-19T09:00:00.000Z';
    Storage.set('situation_runs', { [id]: { startedAt: saved, checks: { s0: saved } } });
    openSituationRun(id);
    const modal = document.querySelector('#setup-wizard-content');
    const legacyCheckSeparated = !modal.querySelector('input:checked') && modal.textContent.includes('가이드 절차가 개정되었습니다');
    const firstStep = modal.querySelector('input[data-step-key^="s:"]');
    if (!firstStep) return false;
    const key = firstStep.dataset.stepKey;
    firstStep.click();
    const checks = Storage.get('situation_runs', {})[id].checks;
    return legacyCheckSeparated && checks.s0 === saved && typeof checks[key] === 'string' && modal.querySelectorAll('input:checked').length === 1;
  });
  if (!savedSituationWorks) failures.push(`${viewport.width}px: situation checklist attached a saved check to the wrong step`);
  if (mobile) {
    const mobileIssues = await page.evaluate(async useDark => {
      const issues = [];
      const app = document.getElementById('app-view');
      const oldTheme = Storage.get('theme_mode', 'light');
      Storage.set('situation_runs', {});
      if (useDark) setThemeMode('dark', true);
      const firstScreen = node => {
        const bounds = node?.getBoundingClientRect();
        const appBounds = app.getBoundingClientRect();
        const bottom = document.querySelector('.editorial-bottom-nav').getBoundingClientRect().top;
        return bounds && bounds.height >= 40 && bounds.top >= appBounds.top - 1 && bounds.bottom <= Math.min(appBounds.bottom, bottom) &&
          bounds.left >= appBounds.left && bounds.right <= appBounds.right;
      };
      router.navigate('home');
      const input = document.getElementById('home-search-input');
      if (!firstScreen(input.form) || !firstScreen(input) || !firstScreen(document.getElementById('home-sos'))) issues.push('home search and SOS must fit the first screen');
      input.value = '학생이 다쳤어요';
      input.form.requestSubmit();
      const firstResult = () => document.querySelector('#search-featured-result article');
      const initialResult = firstResult();
      if (initialResult?.dataset.resultKind !== 'situation' || !firstScreen(initialResult.querySelector('button'))) {
        issues.push('student injury should open with a visible situation action');
      } else {
        initialResult.querySelector('button').click();
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const injury = document.getElementById('situation-situation:01');
        const action = injury?.querySelector('[data-situation-start]');
        if (!injury?.querySelector('.situation-first') || !firstScreen(action)) issues.push('injury checks and action must be easy to reach');
        action?.click();
        const modal = document.getElementById('setup-wizard-content');
        if (document.getElementById('setup-wizard-modal').classList.contains('hidden') || !modal.querySelector('[data-step-key^="s:"]')) {
          issues.push('injury action should open the checklist');
        } else {
          modal.querySelector('[data-step-key^="s:"]').click();
          closeSetupWizard();
          router.navigate('home');
          const resume = document.getElementById('home-resume-situation');
          if (resume?.dataset.publicId !== 'situation:01' || resume.previousElementSibling !== document.getElementById('home-search-input').form || !firstScreen(resume)) {
            issues.push('unfinished checklist should appear immediately below home search');
          }
        }
      }
      router.navigate('search', '물건 살 때');
      const purchasing = firstResult();
      const purchaseButtons = [...(purchasing?.querySelectorAll('button') || [])];
      if (purchasing?.dataset.resultKind !== 'workflow' || !purchasing.textContent.includes('물품 구입 한 번에 끝내기') || purchaseButtons.length !== 2 || !firstScreen(purchaseButtons[0])) {
        issues.push('purchase search should show the workflow and its form');
      } else {
        purchaseButtons[0].click();
        if (router.current !== 'navigator' || router.param !== 'workflow:06') issues.push('purchase workflow did not open');
        router.navigate('search', '물건 살 때');
        firstResult().querySelectorAll('button')[1].click();
        if (document.getElementById('doc-template-select')?.value !== 't12') issues.push('purchase form did not open');
      }
      router.navigate('search', '연가');
      const leave = firstResult();
      if (leave?.dataset.resultKind !== 'term' || leave.querySelector('h3')?.textContent !== '연가') issues.push('exact term search should prioritize the definition');
      else {
        leave.querySelector('button').click();
        if (document.querySelector('#modal-title')?.textContent.trim() !== '연가') issues.push('leave definition did not open');
        closeModal(false);
      }
      router.navigate('search', '상담');
      if (firstResult()) issues.push('broad queries should not label an unrelated result as the first answer');
      if (useDark) setThemeMode(oldTheme, true);
      return issues;
    }, viewport.width === 390);
    failures.push(...mobileIssues.map(issue => `${viewport.width}px: ${issue}`));
  }
  if (mobile) {
    const menuIssues = await page.evaluate(() => {
      const issues = [];
      const menu = document.getElementById('mobile-menu-modal');
      const panel = menu.querySelector('.editorial-menu-panel');
      const menuButton = document.getElementById('mob-menu');
      const menuTheme = menu.querySelector('[data-theme-toggle]');
      const headerInstall = document.querySelector('.editorial-header [data-ys-install-guide]');
      const savedTheme = Storage.get('theme_mode', 'light');
      const luminance = color => {
        const channels = color.match(/\d+/g).slice(0, 3).map(value => {
          const channel = Number(value) / 255;
          return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
        });
        return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
      };
      const contrast = (text, surface) => {
        const values = [luminance(getComputedStyle(text).color), luminance(getComputedStyle(surface).backgroundColor)];
        return (Math.max(...values) + 0.05) / (Math.min(...values) + 0.05);
      };
      setThemeMode('light', true);
      for (const mode of ['light', 'dark']) {
        router.navigate('search');
        const hint = document.querySelector('#app-view .editorial-help');
        if (contrast(hint, document.getElementById('app-view')) < 4.5 || !getComputedStyle(hint).fontFamily.includes('Maru Buri')) issues.push(mode + ': search guidance readability');
        if (document.querySelector('#app-view h2').textContent !== '검색' || document.getElementById('mob-search').getAttribute('aria-current') !== 'page') issues.push(mode + ': search route name or active tab');
        menuButton.focus();
        menuButton.click();
        const headings = [...menu.querySelectorAll('.editorial-menu-group h3')].map(h => h.textContent.trim()).join('|');
        if (headings !== '검색과 가이드|업무|수업과 기록|학습|설정' || menuButton.getAttribute('aria-expanded') !== 'true') issues.push(mode + ': mobile menu groups or open state');
        if (panel.scrollWidth > panel.clientWidth + 1 || document.querySelector('.editorial-bottom-nav').scrollWidth > innerWidth) issues.push(mode + ': mobile menu overflows');
        const situation = menu.querySelector('[data-menu-view="situations"]');
        if (situation.getBoundingClientRect().height < 44 || contrast(situation, situation.closest('section')) < 4.5) issues.push(mode + ': menu action size or contrast');
        situation.click();
        if (router.current !== 'situations' || !menu.classList.contains('hidden') || document.querySelector('#app-view h2').textContent !== '상황 가이드') issues.push(mode + ': menu route does not open the matching screen');
        headerInstall.focus();
        headerInstall.click();
        const appGuide = document.querySelector('.ysi-card');
        const qrButton = appGuide?.querySelector('[data-qr]');
        if (!qrButton || document.querySelector('.editorial-header [data-qr]') || contrast(appGuide.querySelector('.ysi-sub'), appGuide) < 4.5) {
          issues.push(mode + ': app and QR guide is missing or hard to read');
          appGuide?.querySelector('[data-ysi-close]').click();
        } else {
          qrButton.click();
          const qrCard = document.querySelector('.yq-card');
          if (!qrCard?.querySelector('svg[role="img"]') || document.querySelector('.ysi-back')) issues.push(mode + ': the QR dialog did not open on its own');
          qrCard?.querySelector('.yq-close').click();
          if (document.activeElement !== headerInstall) issues.push(mode + ': closing the QR should restore focus');
        }
        menuButton.click();
        if (menuTheme.textContent.trim() !== (mode === 'light' ? '다크 모드' : '라이트 모드')) issues.push(mode + ': mode switch label');
        menuTheme.click();
        if (document.documentElement.classList.contains('dark') !== (mode === 'light') || menuButton.getAttribute('aria-expanded') !== 'false') issues.push(mode + ': changing mode through settings');
      }
      setThemeMode(savedTheme, true);
      return issues;
    });
    failures.push(...menuIssues.map(issue => `${viewport.width}px: ${issue}`));
  }
  await page.close();
}
await browser.close(); server.close();
if (failures.length) {
  console.error(failures.map(f => `✗ ${f}`).join('\n'));
  if (process.env.GITHUB_ACTIONS) failures.slice(0, 20).forEach(f => console.log(`::error title=smoke-test::${f.replace(/\n/g, ' ')}`)); // Actions 화면·API에 오류 내용 표시
  process.exit(1);
}
console.log(`Smoke test passed: ${views.length} screens × 3 viewport sizes, review panels, saved checklist, mobile home → search → guide, menus in light and dark mode.`);
