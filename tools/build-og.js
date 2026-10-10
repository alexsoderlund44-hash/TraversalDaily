#!/usr/bin/env node
/* Renders tools/og.html to og.png (1200×630), the image link previews show. Needs Playwright. */
const path = require('path'), { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1200, height: 630 } });
  await p.goto('file://' + path.join(__dirname, 'og.html')); await p.waitForSelector('body[data-ready]'); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(600);
  await p.screenshot({ path: path.join(__dirname, '..', 'og.png') }); await b.close(); console.log('wrote og.png');
})();
