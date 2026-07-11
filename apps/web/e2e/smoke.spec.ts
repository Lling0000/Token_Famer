import { expect, test } from '@playwright/test';

test('opens a playable desktop farm from demo mode', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Token Farmer' })).toBeVisible();
  await page.getByRole('button', { name: '进入演示农场' }).click();
  await expect(page.getByRole('heading', { name: '晨露 Token 农场' })).toBeVisible();
  await expect(page.getByLabel('24格等距 Token 农场')).toBeVisible();
  await expect(page.getByRole('button', { name: '一键收获' })).toBeVisible();
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
  await expect(page.getByRole('heading', { name: 'Token 花种商店' })).toBeVisible();
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
});

test('visits a friend farm and performs a probabilistic steal attempt', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '进入演示农场' }).click();
  await page.getByRole('button', { name: '访问像素阿禾' }).click();
  await expect(page.getByRole('heading', { name: '像素阿禾的 Token 农场' })).toBeVisible();
  await page.getByRole('button', { name: '试着偷取' }).click();
  const canvas = page.getByLabel('24格等距 Token 农场');
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  await canvas.click({ position: { x: box!.width * 0.7, y: box!.height * 0.39 } });
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
