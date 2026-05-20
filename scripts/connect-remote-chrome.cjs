const puppeteer = require('puppeteer');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const url = process.argv[2];
(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9333' });
  const pages = await browser.pages();
  console.log('PAGES=' + pages.length);
  for (const [i, p] of pages.entries()) {
    console.log(`[page ${i}] ${p.url()}`);
  }
  const page = await browser.newPage();
  page.on('console', (msg) => console.log('[console]', msg.text()));
  page.on('framenavigated', frame => {
    if (frame === page.mainFrame()) console.log('[nav]', frame.url());
  });
  if (url) {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await sleep(30000);
    console.log('FINAL_URL=' + page.url());
    await page.screenshot({ path: '/tmp/claude-remote-page.png', fullPage: true });
    console.log('SCREENSHOT_SAVED=/tmp/claude-remote-page.png');
  }
  await page.close();
  await browser.disconnect();
})().catch(err => { console.error(err.stack || err); process.exit(1); });
