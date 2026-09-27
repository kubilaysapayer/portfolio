// Renders a showreel page frame-by-frame to MP4 (H.264 + AAC).
//
//   node showreel/render.mjs [page.html] [out.mp4]
//   node showreel/render.mjs [page.html] --stills 0.5,3,5.2   (QA snapshots only)
//
// Requires Playwright (Chromium) and an ffmpeg with libx264; set FFMPEG to its path
// if it is not on PATH.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); } catch { playwright = require('/opt/node22/lib/node_modules/playwright'); }

const here = dirname(new URL(import.meta.url).pathname);
const page = resolve(process.argv[2] || `${here}/intro/index.html`);
const stillsArg = process.argv.indexOf('--stills');
const out = resolve(stillsArg === -1 && process.argv[3] ? process.argv[3] : `${here}/out/intro.mp4`);
const FFMPEG = process.env.FFMPEG || 'ffmpeg';

const browser = await playwright.chromium.launch();
const tab = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
await tab.goto(pathToFileURL(page).href + '?render');
await tab.waitForFunction(() => window.SHOWREEL && document.fonts.status === 'loaded');
await tab.waitForTimeout(300);
const { DUR, FPS } = await tab.evaluate(() => ({ DUR: SHOWREEL.DUR, FPS: SHOWREEL.FPS }));
mkdirSync(dirname(out), { recursive: true });

if (stillsArg !== -1) {
  for (const t of process.argv[stillsArg + 1].split(',').map(Number)) {
    await tab.evaluate(t => SHOWREEL.render(t), t);
    const file = `${dirname(out)}/still-${t.toFixed(2)}.png`;
    await tab.screenshot({ path: file });
    console.log(file);
  }
  await browser.close();
  process.exit(0);
}

const wav = out.replace(/\.mp4$/, '.wav');
writeFileSync(wav, Buffer.from(await tab.evaluate(() => SHOWREEL.renderAudioWav()), 'base64'));

const ff = spawn(FFMPEG, [
  '-y', '-loglevel', 'error',
  '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
  '-i', wav,
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-profile:v', 'high',
  '-af', 'volume=4dB,alimiter=limit=0.89:level=false',
  '-c:a', 'aac', '-b:a', '256k',
  '-t', String(DUR), '-movflags', '+faststart', out,
], { stdio: ['pipe', 'inherit', 'inherit'] });
const done = new Promise((ok, fail) => ff.on('close', c => (c ? fail(new Error(`ffmpeg exited ${c}`)) : ok())));

const frames = Math.round(DUR * FPS);
for (let f = 0; f < frames; f++) {
  await tab.evaluate(t => SHOWREEL.render(t), f / FPS);
  const jpg = await tab.screenshot({ type: 'jpeg', quality: 95 });
  if (!ff.stdin.write(jpg)) await new Promise(r => ff.stdin.once('drain', r));
  if (f % 120 === 0) process.stdout.write(`frame ${f}/${frames}\n`);
}
ff.stdin.end();
await done;
await browser.close();
console.log(`wrote ${out}`);
