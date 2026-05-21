import { test, expect } from '@playwright/test';

test.describe('Production Mirror — /showcase', () => {
  test('matches baseline at 1440x900', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/showcase/');
    await page.waitForLoadState('networkidle');

    await page.waitForTimeout(1500);

    const screenshot = await page.screenshot({ fullPage: true });
    expect(screenshot).toMatchSnapshot('showcase.png', {
      maxDiffPixelRatio: 0.05,
    });
  });

  test('dev-only widgets hidden by default', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/showcase/');
    await page.waitForLoadState('networkidle');

    const devWidgets = page.locator('#devOnlyWidgets');
    await expect(devWidgets).not.toBeVisible();
  });

  test('dev-only widgets visible with ?dev=1', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/showcase/?dev=1');
    await page.waitForLoadState('networkidle');

    const devWidgets = page.locator('#devOnlyWidgets');
    await expect(devWidgets).toBeVisible();
  });

  test('triptych layout structure', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/showcase/');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('.command-layout')).toBeVisible();
    await expect(page.locator('.left-panel')).toBeVisible();
    await expect(page.locator('.top-bar')).toBeVisible();
    await expect(page.locator('.right-panel')).toBeVisible();
    await expect(page.locator('.triptych-column-body')).toBeVisible();
    await expect(page.locator('.triptych-column-mind')).toBeVisible();

    const bodyHeader = page.locator('.column-header-pink');
    await expect(bodyHeader).toHaveText('Body');

    const mindHeader = page.locator('.column-header-green');
    await expect(mindHeader).toHaveText('Mind');
  });

  test('all 13 production widgets render', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/showcase/');
    await page.waitForLoadState('networkidle');

    const previews = page.locator('[data-widget-preview]');
    const count = await previews.count();
    expect(count).toBeGreaterThanOrEqual(13);
  });

  test('live clock updates', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/showcase/');
    await page.waitForLoadState('networkidle');

    const clock = page.locator('#liveClock');
    const firstTime = await clock.textContent();
    await page.waitForTimeout(1100);
    const secondTime = await clock.textContent();
    expect(firstTime).not.toEqual(secondTime);
  });
});
