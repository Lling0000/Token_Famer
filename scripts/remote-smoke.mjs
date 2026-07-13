import { chromium } from '@playwright/test';

const baseUrl = process.argv[2];
const screenshotPath = process.argv[3] ?? 'tmp/remote-token-farmer.png';

if (!baseUrl) throw new Error('Usage: node scripts/remote-smoke.mjs <base-url> [screenshot-path]');

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30_000 });
  await page.locator('button.demo-command').click();
  await page.locator('.game-shell').waitFor({ state: 'visible' });
  const canvasPixels = await page.locator('canvas').evaluate((canvas) => {
    const context = canvas.getContext('2d');
    if (!context) return 0;
    const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let visible = 0;
    for (let index = 3; index < data.length; index += 32) {
      if (data[index] > 0) visible += 1;
    }
    return visible;
  });
  if (canvasPixels < 500) throw new Error(`Farm canvas is blank: ${canvasPixels} pixels`);
  await page.locator('.primary-nav button[title="商店"]').click();
  await page.getByText('FREE', { exact: true }).first().waitFor({ state: 'visible' });
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(JSON.stringify({ baseUrl, canvasPixels, freeSeedVisible: true }));
} finally {
  await browser.close();
}
