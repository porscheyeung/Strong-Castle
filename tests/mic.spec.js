const { test, expect } = require('@playwright/test');
const E = require('../engine.js');

test.use({ launchOptions: { args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] } });

test('用喊聲舉：開啟後不按鍵也會舉起，完成後自動關閉咪高峰', async ({ page }) => {
  const s = E.fresh({ target: 30, seed: 7 });
  for (let i = 0; i < 5; i++) E.hatch(s, Date.now());
  await page.addInitScript(([k, v]) => localStorage.setItem(k, v), [E.SAVE_KEY, JSON.stringify(s)]);
  await page.goto('/');
  await page.click('#btnLift');
  await page.click('#btnShout');
  await expect(page.locator('#btnShout')).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => page.evaluate(() => {
    const l = window.strongCastle.snapshot().lifting;
    return l ? l.power : 100;
  }), { timeout: 30000 }).toBeGreaterThan(5);
  await page.click('#btnShout');
  await expect(page.locator('#btnShout')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('#shoutNote')).not.toContainText('大聲喊');
});
