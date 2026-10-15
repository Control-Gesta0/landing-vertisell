// Screenshot helper (headless Chrome via puppeteer-core already installed in ../video).
// Usage examples:
//   node tools/shot.mjs --url index.html --out dev/shots/home.png --full
//   node tools/shot.mjs --url dev/demo.html --selector "#crm-demo" --times 500,4000,9000 --out dev/shots/demo.png
//   node tools/shot.mjs --url index.html --scroll "#planos" --width 390 --height 844 --dpr 2 --out dev/shots/m.png
// Options: --width 1440 --height 900 --dpr 1 --wait 1200 (ms before first shot) --times a,b,c (ms after load,
//          one PNG per time: name_<t>.png) --selector css (element shot) --scroll css (scrollIntoView first)
//          --full (full page) --eval "js" (run before shots) --reduced (prefers-reduced-motion)
// Prints console errors / failed requests from the page.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire('C:/Users/Rodrigo Campeoti/Desktop/imagens/video/package.json');
const puppeteer = require('puppeteer-core');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const flag = k => args.includes('--' + k);

let url = opt('url', 'index.html');
if (!/^https?:|^file:/.test(url)) url = pathToFileURL(path.resolve(ROOT, url)).href;
const out = path.resolve(ROOT, opt('out', 'dev/shots/shot.png'));
const width = +opt('width', 1440), height = +opt('height', 900), dpr = +opt('dpr', 1);
const wait = +opt('wait', 1200);
const times = opt('times') ? opt('times').split(',').map(Number) : [0];
fs.mkdirSync(path.dirname(out), { recursive: true });

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find(p => fs.existsSync(p));

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: 'new',
  args: ['--allow-file-access-from-files', '--force-color-profile=srgb', '--hide-scrollbars',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding'],
});
const page = await browser.newPage();
await page.setViewport({ width, height, deviceScaleFactor: dpr, isMobile: width < 700, hasTouch: width < 700 });
if (flag('reduced')) await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
const errors = [];
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
page.on('requestfailed', r => errors.push('REQFAIL ' + r.url() + ' ' + (r.failure() && r.failure().errorText)));

await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 }).catch(e => errors.push('GOTO ' + e.message));
await page.evaluate(() => document.fonts && document.fonts.ready);
if (opt('scroll')) {
  await page.evaluate(sel => { const el = document.querySelector(sel); if (el) el.scrollIntoView({ block: 'start' }); }, opt('scroll'));
}
if (opt('eval')) await page.evaluate(opt('eval'));
await new Promise(r => setTimeout(r, wait));

const t0 = Date.now();
const written = [];
for (const t of times) {
  const dt = t - (Date.now() - t0);
  if (dt > 0) await new Promise(r => setTimeout(r, dt));
  const file = times.length > 1 ? out.replace(/\.png$/i, `_${String(t).padStart(5, '0')}.png`) : out;
  if (opt('selector')) {
    const el = await page.$(opt('selector'));
    if (el) await el.screenshot({ path: file }); else errors.push('selector not found: ' + opt('selector'));
  } else {
    await page.screenshot({ path: file, fullPage: flag('full') });
  }
  written.push(file);
}
await browser.close();
console.log(written.join('\n'));
if (errors.length) console.log('--- page errors ---\n' + errors.join('\n'));
