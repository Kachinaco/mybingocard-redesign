const puppeteer = require('puppeteer');
const fs = require('fs');

const url = process.argv[2];
if (!url) {
  console.error('Usage: node scripts/test-claude-oauth-browser.cjs <url>');
  process.exit(1);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    executablePath: '/usr/bin/google-chrome',
    userDataDir: '/root/.config/google-chrome',
    defaultViewport: { width: 1280, height: 900 },
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage();
  page.on('console', (msg) => console.log('[console]', msg.text()));
  page.on('framenavigated', frame => {
    if (frame === page.mainFrame()) {
      console.log('[nav]', frame.url());
    }
  });
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await sleep(5000);
    console.log('[cf] clicking approximate challenge coordinates');
    await page.mouse.click(210, 405, { delay: 100 });
    await sleep(30000);
    console.log('FINAL_URL=' + page.url());
    const content = await page.content();
    fs.writeFileSync('/tmp/claude-oauth-page.html', content);
    await page.screenshot({ path: '/tmp/claude-oauth-page.png', fullPage: true });
    console.log('PAGE_SAVED=/tmp/claude-oauth-page.html');
    console.log('SCREENSHOT_SAVED=/tmp/claude-oauth-page.png');
  } catch (err) {
    console.error('ERR', err.stack || err.message || String(err));
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
