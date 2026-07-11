import { expect, test } from '@playwright/test';

test('opens a playable desktop farm from demo mode', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Token Farmer' })).toBeVisible();
  await page.getByRole('button', { name: '进入演示农场' }).click();
  await expect(page.getByRole('heading', { name: '晨露 Token 农场' })).toBeVisible();
  await expect(page.getByLabel('24格等距 Token 农场')).toBeVisible();
  await expect(page.getByRole('button', { name: '一键收获' })).toBeVisible();
  const canvas = page.getByLabel('24格等距 Token 农场');
  await expect(canvas).toHaveAttribute('data-land-layout', 'ground-anchored');
  await expect(canvas).toHaveAttribute('data-selection-style', 'edge-glow');
  await expect(canvas).toHaveAttribute('draggable', 'false');
  await expect(page.locator('.plot-inspector')).toHaveCount(0);
  await expect(page.locator('.selected-seed-hud')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '让巡逻萌犬叫一声' })).toBeVisible();
  await expect(page.locator('.stream-glint')).toHaveCount(3);
  await expect(
    page.getByRole('button', { name: '浇水' }).locator('.lucide-paint-bucket'),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: '除草' }).locator('.lucide-shovel')).toBeVisible();
  await expect(
    page.getByRole('button', { name: '除虫' }).locator('.lucide-spray-can'),
  ).toBeVisible();
  await page.getByRole('button', { name: '静音农场声音' }).click();
  await expect(page.getByRole('button', { name: '开启农场声音' })).toBeVisible();
  await page.getByRole('button', { name: '播种' }).click();
  await expect(page.getByRole('dialog', { name: '选择要播种的花种' })).toBeVisible();
  await expect(page.getByRole('button', { name: /ChatGPT 花苗.*免费/ })).toBeVisible();
  await expect(page.getByRole('button', { name: '下一页花种' })).toBeEnabled();
});

test('shows a tool cursor on land and plot details only after a plot click', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '进入演示农场' }).click();
  const canvas = page.getByLabel('24格等距 Token 农场');
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  const scale = Math.max(box!.width / 1536, box!.height / 1024);
  const center = {
    x: (box!.width - 1536 * scale) / 2 + 834 * scale,
    y: (box!.height - 1024 * scale) / 2 + 245 * scale,
  };

  await page.getByRole('button', { name: '浇水' }).click();
  await expect(canvas).toHaveAttribute('data-active-tool', 'water');
  await page.mouse.move(box!.x + center.x, box!.y + center.y);
  await expect(page.locator('.farm-tool-cursor[data-tool="water"]')).toBeVisible();
  expect(await canvas.evaluate((element) => getComputedStyle(element).cursor)).toBe('none');

  await page.locator('.tool-button').nth(0).click();
  await canvas.click({ position: center });
  await expect(page.locator('.plot-inspector')).toBeVisible();
  await canvas.click({ position: { x: 8, y: 8 } });
  await expect(page.locator('.plot-inspector')).toHaveCount(0);
});

test('uses branded model picker and supports profile and sidebar controls', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '进入演示农场' }).click();

  const picker = page.getByRole('button', { name: /调用 \/ 种植模型/ });
  await picker.click();
  await expect(page.getByRole('listbox', { name: '选择模型' })).toBeVisible();
  await expect(page.getByText('Anthropic', { exact: true })).toBeVisible();
  await page.getByRole('option', { name: /Claude Sonnet 4.6/ }).click();
  await expect(picker).toContainText('Sonnet');

  await page.getByLabel('收起好友栏').click();
  await expect(page.locator('.game-main')).toHaveClass(/sidebar-collapsed/);
  await page.getByTitle('展开好友栏').click();

  await page.getByTitle('账号与社交设置').click();
  await page.getByLabel('农场主昵称').fill('像素园丁');
  await page.getByRole('button', { name: '保存昵称' }).click();
  await expect(page.getByTitle('账号与社交设置')).toContainText('像素园丁');
});

test('claims a completed task into the unified Token balance once', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '进入演示农场' }).click();
  const balanceBefore = await page
    .getByRole('button', { name: /调用 \/ 种植模型/ })
    .locator('b')
    .textContent();
  await page.getByRole('button', { name: '任务' }).click();
  await page.getByRole('button', { name: '领取', exact: true }).click();
  await expect(page.getByRole('button', { name: '已领取' })).toBeDisabled();
  await page.getByRole('button', { name: '关闭' }).click();
  const balanceAfter = await page
    .getByRole('button', { name: /调用 \/ 种植模型/ })
    .locator('b')
    .textContent();
  expect(balanceAfter).not.toBe(balanceBefore);
  await page.getByRole('button', { name: '任务' }).click();
  await expect(page.getByRole('button', { name: '已领取' })).toBeDisabled();
});

test('blocks unsupported narrow screens', async ({ page }) => {
  await page.setViewportSize({ width: 1000, height: 800 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '请使用电脑浏览器' })).toBeVisible();
  await expect(page.getByRole('button', { name: '进入演示农场' })).toBeHidden();
});

test('opens connected game panels and completes a sandbox purchase', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '进入演示农场' }).click();

  await page.getByRole('button', { name: '商店' }).click();
  await expect(page.getByRole('heading', { name: 'Token 农场商店' })).toBeVisible();
  await page.getByRole('button', { name: '购买 Token' }).click();
  await expect(page.getByRole('heading', { name: '购买模型 Token' })).toBeVisible();
  await page.getByRole('button', { name: /庄园包/ }).click();
  await page.getByRole('button', { name: '模拟支付并入账' }).click();
  await expect(page.getByRole('button', { name: '沙箱入账完成' })).toBeDisabled();
  await page.getByRole('button', { name: '关闭' }).click();

  await page.getByRole('button', { name: '排行' }).click();
  await page.getByRole('button', { name: 'API 消耗' }).click();
  await expect(page.getByRole('button', { name: 'API 消耗' })).toHaveClass(/active/);
  await page.getByRole('button', { name: '关闭' }).click();

  await page.getByRole('button', { name: 'API' }).click();
  await page.getByRole('button', { name: '创建密钥' }).click();
  await expect(page.getByText('立即保存这枚密钥')).toBeVisible();
  await expect(page.getByText('OpenAI 兼容请求')).toHaveCount(0);
});

test('shows Token packages as a compact branded warehouse grid', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '进入演示农场' }).click();
  await page.getByRole('button', { name: '仓库' }).click();
  await expect(page.locator('.package-grid')).toBeVisible();
  await expect(page.locator('.package-card')).toHaveCount(2);
  await expect(page.locator('.package-card .model-mark')).toHaveCount(2);
  const columns = await page.locator('.package-grid').evaluate((element) => {
    return getComputedStyle(element).gridTemplateColumns.split(' ').length;
  });
  expect(columns).toBe(4);
});

test('buys dog food and equips a visible farm decoration', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '进入演示农场' }).click();
  await page.getByRole('button', { name: '商店' }).click();
  await page.getByRole('button', { name: '萌犬用品' }).click();
  await expect(page.getByText('田园肉骨头')).toBeVisible();
  await page.getByRole('button', { name: '180K Token' }).click();
  await page.getByRole('button', { name: '农场装扮' }).click();
  await page.getByRole('button', { name: '360K Token' }).click();
  await page.getByRole('button', { name: '关闭' }).click();
  await expect(page.getByLabel('已装备农场装扮')).toBeVisible();
});

test('captures the unified desktop interaction surfaces', async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  await page.goto('/');
  await page.getByRole('button', { name: '进入演示农场' }).click();
  const capturePanel = async (navName: string, fileName: string) => {
    await page.getByRole('button', { name: navName }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(fileName) });
    await page.getByRole('button', { name: '关闭' }).click();
  };
  await capturePanel('商店', 'shop.png');
  await capturePanel('仓库', 'warehouse.png');
  await capturePanel('排行', 'leaderboard.png');
  await page.getByTitle('账号与社交设置').click();
  await page.screenshot({ path: testInfo.outputPath('social.png') });
  await page.getByRole('button', { name: '关闭' }).click();
  await page.getByRole('button', { name: /调用 \/ 种植模型/ }).click();
  await page.screenshot({ path: testInfo.outputPath('model-picker.png') });
});

test('visits a friend farm and performs a probabilistic steal attempt', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '进入演示农场' }).click();
  await page.getByRole('button', { name: '访问像素阿禾' }).click();
  await expect(page.getByText('正在前往')).toBeVisible();
  await expect(page.getByText('像素阿禾的农场')).toBeVisible();
  await expect(page.getByRole('heading', { name: '像素阿禾的 Token 农场' })).toBeVisible();
  await page.getByRole('button', { name: '试着偷取' }).click();
  const canvas = page.getByLabel('24格等距 Token 农场');
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  await canvas.click({ position: { x: box!.width * 0.462, y: box!.height * 0.298 } });
  await expect(page.getByText(/偷取失败|没有偷到|成功偷到|目前不可偷取/)).toBeVisible();
  await page.getByRole('button', { name: '返回我的农场' }).click();
  await expect(page.getByRole('heading', { name: '晨露 Token 农场' })).toBeVisible();

  await page.getByRole('button', { name: '添加好友' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('textbox', { name: '好友码' }).fill('FARM-7788');
  await dialog.getByRole('button', { name: '添加好友', exact: true }).click();
  await expect(dialog.getByRole('button', { name: '请求已发送' })).toBeDisabled();
});

for (const viewport of [
  { width: 1280, height: 720 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
  { width: 2560, height: 1440 },
]) {
  test(`renders a nonblank stable farm at ${viewport.width}x${viewport.height}`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await page.getByRole('button', { name: '进入演示农场' }).click();
    const canvas = page.getByLabel('24格等距 Token 农场');
    await expect(canvas).toBeVisible();
    await page.waitForTimeout(350);
    const pixels = await canvas.evaluate((element: HTMLCanvasElement) => {
      const context = element.getContext('2d');
      if (!context) return 0;
      const data = context.getImageData(0, 0, element.width, element.height).data;
      let visible = 0;
      for (let index = 3; index < data.length; index += 32) if (data[index] > 0) visible += 1;
      return visible;
    });
    expect(pixels).toBeGreaterThan(500);
    const horizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(horizontalOverflow).toBeLessThanOrEqual(0);
    await page.screenshot({
      path: testInfo.outputPath(`farm-${viewport.width}x${viewport.height}.png`),
      fullPage: true,
    });
  });
}
