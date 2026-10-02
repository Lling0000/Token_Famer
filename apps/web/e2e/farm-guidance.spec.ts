import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '进入演示农场' }).click();
});

test('locates and waters a crop, then activates packages in the unified balance', async ({
  page,
}) => {
  await page.getByRole('button', { name: '定位缺水地块' }).click();
  await expect(page.locator('.plot-inspector')).toContainText('需要浇水');
  await page.getByRole('button', { name: '浇水这块地' }).click();
  await expect(page.locator('.plot-inspector')).toContainText('水分充足');
  await expect(page.getByRole('button', { name: '浇水这块地' })).toHaveCount(0);
  await page.getByRole('button', { name: /2 个 Token 包待激活/ }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('统一 Token Credit');
  await dialog.getByRole('button', { name: '全部激活' }).click();
  await expect(dialog.getByRole('button', { name: '全部激活' })).toBeDisabled();
  await expect(dialog).toContainText('仓库里还没有 Token 包');
  await page.keyboard.press('Escape');
  await expect(page.locator('.nav-badge')).toHaveCount(0);
});

test('keeps dialog focus inside and restores the navigation trigger', async ({ page }) => {
  const trigger = page.getByRole('button', { name: '仓库', exact: true });
  await trigger.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  for (let index = 0; index < 9; index++) {
    await page.keyboard.press('Tab');
    expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
});

test('offers a clear empty friend search and uses effects-only audio by default', async ({
  page,
}) => {
  await expect(page.getByRole('button', { name: '开启背景音乐' })).toBeVisible();
  await page.getByLabel('搜索好友').fill('does-not-exist');
  await expect(page.getByText('没有找到这位好友')).toBeVisible();
  await page.getByRole('button', { name: '清空搜索' }).click();
  await expect(page.locator('.friend-row')).toHaveCount(6);
});

test('uses the same pixel tool in the dock and on the land', async ({ page }) => {
  await page.getByRole('button', { name: '浇水', exact: true }).click();
  await expect(page.locator('.tool-status')).toContainText('浇水模式');
  const canvas = page.getByLabel('24格等距 Token 农场');
  const box = (await canvas.boundingBox())!;
  const scale = Math.max(box.width / 1536, box.height / 1024);
  await page.mouse.move(
    box.x + (box.width - 1536 * scale) / 2 + 834 * scale,
    box.y + (box.height - 1024 * scale) / 2 + 374 * scale,
  );
  const cursor = page.locator('.farm-tool-cursor');
  await expect(cursor).toBeVisible();
  await expect(cursor.locator('[data-tool-icon="water"]')).toBeVisible();
  expect(
    await page
      .getByRole('button', { name: '浇水', exact: true })
      .locator('svg')
      .getAttribute('data-tool-icon'),
  ).toBe(await cursor.locator('svg').getAttribute('data-tool-icon'));
});

test('clicking the visible central land selects plot 13 and successful actions show their own tool', async ({
  page,
}) => {
  const canvas = page.getByLabel('24格等距 Token 农场');
  const box = (await canvas.boundingBox())!;
  const scale = Math.max(box.width / 1536, box.height / 1024);
  const point = (x: number, y: number) => ({
    x: (box.width - 1536 * scale) / 2 + x * scale,
    y: (box.height - 1024 * scale) / 2 + y * scale,
  });
  await canvas.click({ position: point(834, 500) });
  await expect(page.locator('.plot-inspector')).toContainText('#13');
  await page.getByRole('button', { name: '浇水', exact: true }).click();
  await canvas.click({ position: point(953, 311) });
  await expect(canvas).toHaveAttribute('data-last-action', 'water');
});
