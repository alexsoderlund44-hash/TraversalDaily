// node render.js scene.html out.mp4            -> full 30fps video
// node render.js scene.html prev.png 0,2,5,9    -> contact sheet frames at those seconds (prev-<t>.png)
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
(async () => {
  const [html, out, stills] = process.argv.slice(2);
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--allow-file-access-from-files', '--autoplay-policy=no-user-gesture-required'] });
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('pageerror', e => console.error('PAGE ERROR', e.message));
  await p.goto('file://' + path.resolve(html));
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(400);
  const dur = await p.evaluate(() => window.DUR);
  const shot = async t => { await p.evaluate(t => window.render(t), t); return p.screenshot({ type: 'jpeg', quality: 94 }); };
  if (stills) {
    for (const s of stills.split(',')) { const buf = await shot(+s); require('fs').writeFileSync(out.replace('.png', `-${s}.jpg`), buf); }
  } else {
    const fps = 30, n = Math.round(dur * fps);
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
      '-f', 'lavfi', '-t', String(dur), '-i', 'anullsrc=r=44100:cl=stereo',
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-c:a', 'aac', '-shortest', out], { stdio: ['pipe', 'inherit', 'inherit'] });
    for (let i = 0; i < n; i++) { const buf = await shot(i / fps); if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r)); if (i % 90 === 0) console.log(html, i, '/', n); }
    ff.stdin.end(); await new Promise(r => ff.on('close', r));
  }
  await b.close();
})();
