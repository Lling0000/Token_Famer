import { expect, test } from '@playwright/test';

for (const viewport of [
  { width: 1280, height: 720 },
  { width: 1440, height: 900 },
]) {
  test(`shows the complete welcome setup at ${viewport.width} × ${viewport.height}`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.route('**/api/auth/**', (route) => {
      if (route.request().url().endsWith('/session'))
        return route.fulfill({ status: 401, json: {} });
      return route.fulfill({
        json: {
          email: 'farmer@example.com',
          displayName: '园丁',
          firstLoginGrant: true,
          expiresInSeconds: 2592000,
        },
      });
    });
    await page.goto('/');
    await page.getByLabel('邮箱').fill('farmer@example.com');
    await page.getByLabel('密码', { exact: true }).fill('Farm-Password-2026!');
    await page.getByLabel('两步验证码').fill('123456');
    await page.getByRole('button', { name: '登录农场', exact: true }).click();
    await expect(page.getByText('80,000', { exact: true })).toBeVisible();
    const submit = page.getByRole('button', { name: '领取并进入农场' });
    const rect = (await submit.boundingBox())!;
    expect(rect.y + rect.height).toBeLessThanOrEqual(viewport.height);
    await expect(submit).toBeEnabled();
    await page.screenshot({ path: testInfo.outputPath(`onboarding-${viewport.width}.png`) });
    await page.getByLabel('农场昵称').fill('晨露园丁');
    await submit.click();
    await expect(page.getByRole('heading', { name: '晨露 Token 农场' })).toBeVisible();
    await expect(page.getByRole('button', { name: '一键收获' })).toBeDisabled();
  });
}
