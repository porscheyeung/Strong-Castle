const { test, expect } = require('@playwright/test');
const fs = require('fs');
const E = require('../engine.js');

const snap = (page) => page.evaluate(() => window.strongCastle.snapshot());
const saved = (page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), E.SAVE_KEY);

function make(target, fill, opts = {}) {
  const s = E.fresh({ child: opts.child || '小明', target, shape: opts.shape, seed: 77 });
  if (opts.land != null) { s.land = opts.land; s.visited = [opts.land]; }
  for (let i = 0; i < fill; i++) E.hatch(s, Date.now());
  for (let i = 0; i < (opts.train || 0); i++) E.train(s, undefined, Date.now());
  s.lifted = opts.lifted || [];
  return s;
}

async function seed(page, state, extra = {}) {
  await page.addInitScript(([key, value, more]) => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    if (value) localStorage.setItem(key, value);
    for (const [k, v] of Object.entries(more)) localStorage.setItem(k, v);
  }, [E.SAVE_KEY, state ? JSON.stringify(state) : '', extra]);
}

function watchErrors(page) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  return errors;
}

test('首次使用：建城、孵化、改名、改正、復原、重新載入保留', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/');
  await expect(page.locator('#dialog h2')).toHaveText('歡迎來到強壯城堡');
  await page.keyboard.press('Escape');
  await expect(page.locator('#dialog')).toBeVisible();
  await page.fill('#fChild', '小強');
  await page.click('[data-n="10"]');
  await page.click('[data-shape="triple"]');
  await page.click('#okSetup');
  await expect(page.locator('#title')).toHaveText('小強的強壯城堡');
  await expect(page.locator('#btnTrain')).toBeDisabled();

  for (let i = 0; i < 3; i++) await page.click('#btnHatch');
  await expect(page.locator('#count')).toHaveText('3');
  await page.waitForTimeout(1000);

  const { points } = await snap(page);
  await page.mouse.click(points[1].x, points[1].y);
  await expect(page.locator('#card')).toBeVisible();
  await page.click('#cardRename');
  await page.fill('#newName', '鐵臂阿強');
  await page.click('#okName');
  await expect(page.locator('#cardName')).toHaveText('鐵臂阿強');
  await expect(page.locator('#trainSub')).toContainText('鐵臂阿強');

  await page.click('#btnTrain');
  await expect(page.locator('#power')).toHaveText('6');
  await expect(page.locator('#cardMeta')).toContainText('小力士');
  await page.click('#btnUndo');
  await expect(page.locator('#power')).toHaveText('3');
  await page.click('#btnTrain');

  await page.reload();
  await expect(page.locator('#count')).toHaveText('3');
  await expect(page.locator('#power')).toHaveText('6');
  const s = await saved(page);
  expect(s.names['1']).toBe('鐵臂阿強');
  expect(s.shape).toBe('triple');
  expect(errors).toEqual([]);
});

test('喚醒舊積木：舊城堡存檔逐字不變，新舊存檔分開', async ({ page }) => {
  const old = JSON.stringify({ version: 2, name: '小美', target: 20, seed: 9, history: [{ type: 'add', id: 'c0' }, { type: 'add', id: 'c1' }, { type: 'shine', id: 'c0' }] });
  await seed(page, null, { 'courage-castle-save-v2': old });
  await page.goto('/');
  await expect(page.locator('.note')).toContainText('2 塊積木');
  await page.click('#wakeOld');
  await expect(page.locator('#count')).toHaveText('2');
  await expect(page.locator('#power')).toHaveText('5');
  await expect(page.locator('#title')).toHaveText('小美的強壯城堡');
  await page.click('#btnHatch');
  await page.reload();
  await expect(page.locator('#count')).toHaveText('3');
  expect(await page.evaluate(() => localStorage.getItem('courage-castle-save-v2'))).toBe(old);
});

test('舉重：力量不足鎖定，連按舉起，成為城堡皇冠，鬆手會回落', async ({ page }) => {
  await seed(page, make(30, 4));
  await page.goto('/');
  await expect(page.locator('#btnLift')).toBeDisabled();
  await expect(page.locator('#liftInfo')).toHaveText('還差 1 點力量');
  await page.click('#btnHatch');
  await expect(page.locator('#btnLift')).toBeEnabled();
  await page.click('#btnLift');
  await page.click('#btnHeave');
  const first = (await snap(page)).lifting.power;
  await page.waitForTimeout(600);
  expect((await snap(page)).lifting.power).toBeLessThan(first);

  await page.click('#btnLiftLater');
  await expect(page.locator('#mainActions')).toBeVisible();
  expect((await saved(page)).lifted).toEqual([]);

  await page.click('#btnLift');
  await page.evaluate(() => document.activeElement.blur());
  for (let i = 0; i < 16 && !(await snap(page)).lifting?.done; i++) await page.keyboard.press('Space');
  await expect(page.locator('#liftTitle')).toContainText('舉起來了');
  expect((await saved(page)).lifted).toEqual(['bun']);
  await expect(page.locator('#mainActions')).toBeVisible({ timeout: 5000 });
  await expect(page.locator('#liftName')).toContainText('大西瓜');
});

test('完成目標：城堡長腳走到新地方，孵出當地品種', async ({ page }) => {
  await seed(page, make(5, 4));
  await page.goto('/');
  await page.click('#btnHatch');
  await expect(page.locator('#dialog h2')).toContainText('站起來了', { timeout: 6000 });
  await expect(page.locator('#goWalk')).toBeDisabled();
  await page.click('[data-land="4"]');
  await page.click('[data-add="10"]');
  await page.click('#goWalk');
  await page.waitForTimeout(400);
  expect((await snap(page)).walking).toBe(true);
  await expect(page.locator('#btnHatch')).toBeDisabled();
  await expect(page.locator('#landTag')).toContainText('月球後院', { timeout: 6000 });
  await expect.poll(async () => (await snap(page)).walking, { timeout: 6000 }).toBe(false);
  await expect(page.locator('#goal')).toHaveText('15');
  await page.click('#btnHatch');
  const list = E.creatures(await saved(page));
  expect(['antenna', 'cyclops', 'ring']).toContain(list[5].species);
  await page.click('#btnDex');
  await expect(page.locator('.dex .locked')).toHaveCount(15 - new Set(list.map((c) => c.species)).size);
});

test('減少動態：不播長動畫，立即到達', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await seed(page, make(5, 5));
  await page.goto('/');
  await page.click('#btnHatch');
  await page.click('[data-land="1"]');
  await page.click('#goWalk');
  await expect(page.locator('#landTag')).toContainText('浪花灘');
  expect((await snap(page)).walking).toBe(false);
  await ctx.close();
});

test('力量操：四個動作依序完成，也可提早結束', async ({ page }) => {
  await seed(page, make(30, 10));
  await page.goto('/');
  await page.click('#btnStretch');
  await expect(page.locator('#stretchTitle')).toContainText('舉高雙手');
  await expect(page.locator('#stretchTitle')).toContainText('慢慢呼吸', { timeout: 10000 });
  await expect(page.locator('#stretchTitle')).toContainText('大力士姿勢', { timeout: 20000 });
  await expect(page.locator('#stretch')).toBeHidden({ timeout: 10000 });
  await expect(page.locator('#toast')).toContainText('休息完成');
  await page.click('#btnStretch');
  await page.click('#stretchSkip');
  await expect(page.locator('#stretch')).toBeHidden();
});

test('縮放後點按仍對準小力士，全景可還原，鍵盤可逐隻查看', async ({ page }) => {
  await seed(page, make(100, 100));
  await page.goto('/');
  await page.waitForTimeout(300);
  await page.click('#zoomIn');
  await page.click('#zoomIn');
  const s = await snap(page);
  expect(s.zoom).toBeGreaterThan(1.9);
  const box = await page.locator('#stage').boundingBox();
  const index = s.points.findIndex((p) => p.x > box.x + 150 && p.x < box.x + box.width - 150 && p.y > box.y + 120 && p.y < box.y + box.height - 120);
  await page.mouse.click(s.points[index].x, s.points[index].y);
  expect((await snap(page)).selected).toBe(index);
  await page.click('#zoomHome');
  expect((await snap(page)).zoom).toBe(1);
  await page.click('#cardClose');
  await page.focus('#stage');
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#card')).toBeVisible();
});

test('備份、壞檔、匯入、海報、開新城堡入相簿', async ({ page }, info) => {
  await seed(page, make(30, 12, { train: 2 }));
  await page.goto('/');
  await page.waitForTimeout(300);
  await page.click('#btnMenu');
  const [backup] = await Promise.all([page.waitForEvent('download'), page.click('#mBackup')]);
  const file = info.outputPath('backup.json');
  await backup.saveAs(file);
  const [poster] = await Promise.all([page.waitForEvent('download'), page.click('#mPoster')]);
  const png = info.outputPath('poster.png');
  await poster.saveAs(png);
  expect(fs.statSync(png).size).toBeGreaterThan(50000);

  await page.setInputFiles('#fileInput', { name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{"version":9}') });
  await expect(page.locator('#toast')).toContainText('不是強壯城堡的備份');
  await expect(page.locator('#count')).toHaveText('12');

  await page.click('#btnMenu');
  await page.click('#mNew');
  await page.fill('#fTarget', '10');
  await page.click('#okSetup');
  await expect(page.locator('#count')).toHaveText('0');
  expect((await saved(page)).album).toHaveLength(1);

  await page.setInputFiles('#fileInput', file);
  await page.click('#okImport');
  await expect(page.locator('#count')).toHaveText('12');
  await expect(page.locator('#power')).toHaveText('18');
  await page.click('#btnLog');
  await expect(page.locator('.album img')).toHaveCount(2);
});

test('名字內的 HTML 只當文字顯示', async ({ page }) => {
  const child = '<img src=x onerror=window.hit=1>';
  await seed(page, make(3, 3, { child }));
  await page.goto('/');
  await page.click('#btnLog');
  await page.click('[data-close]');
  await page.click('#btnMenu');
  await page.click('[data-close]');
  await page.click('#btnHatch');
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.hit)).toBeUndefined();
  await expect(page.locator('#dialogBody img')).toHaveCount(0);
});

test('各種螢幕沒有橫向溢出，按鈕可觸及', async ({ browser }) => {
  for (const [width, height] of [[320, 640], [375, 667], [390, 844], [768, 1024], [844, 390], [1280, 800]]) {
    const ctx = await browser.newContext({ viewport: { width, height }, hasTouch: width < 1000 });
    const page = await ctx.newPage();
    await seed(page, make(30, 12, { train: 3 }));
    await page.goto('/');
    await page.waitForTimeout(250);
    const r = await page.evaluate(() => {
      const bad = [...document.querySelectorAll('button')].filter((b) => {
        if (!b.offsetParent) return false;
        const q = b.getBoundingClientRect();
        return q.left < 0 || q.right > innerWidth + 0.5 || q.height < 40 || q.width < 40;
      }).map((b) => b.id || b.textContent);
      return { over: document.documentElement.scrollWidth - innerWidth, bad };
    });
    expect(r.over, `${width}`).toBeLessThanOrEqual(0);
    expect(r.bad, `${width}`).toEqual([]);
    await page.click('#btnDex');
    expect(await page.evaluate(() => document.getElementById('dialog').getBoundingClientRect().right <= innerWidth)).toBe(true);
    await ctx.close();
  }
});

test('手機觸控：輕觸孵化、查看小力士、舉重', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  await seed(page, make(30, 5));
  await page.goto('/');
  await page.waitForTimeout(300);
  await page.tap('#btnHatch');
  await expect(page.locator('#count')).toHaveText('6');
  await page.waitForTimeout(1000);
  const { points } = await snap(page);
  await page.touchscreen.tap(points[0].x, points[0].y);
  await expect(page.locator('#card')).toBeVisible();
  await page.tap('#cardClose');
  await page.tap('#btnLift');
  for (let i = 0; i < 14 && !(await snap(page)).lifting?.done; i++) await page.tap('#btnHeave');
  await expect(page.locator('#liftTitle')).toContainText('舉起來了');
  await ctx.close();
});

test('夜晚場景可正常操作', async ({ page }) => {
  const errors = watchErrors(page);
  await page.clock.setFixedTime(new Date(2026, 10, 7, 21, 0, 0));
  await seed(page, make(30, 20));
  await page.goto('/');
  await page.waitForTimeout(300);
  await page.click('#btnHatch');
  await expect(page.locator('#count')).toHaveText('21');
  expect(errors).toEqual([]);
});

test('600 隻滿員：不可再出發，只可開新城堡', async ({ page }) => {
  await seed(page, make(600, 600, { land: 4 }));
  await page.goto('/');
  await expect(page.locator('#hatchLabel')).toHaveText('城堡滿員了！');
  await page.click('#btnHatch');
  await expect(page.locator('#dialog h2')).toHaveText('城堡滿員了！');
  await page.click('#toNew');
  await expect(page.locator('#dialog h2')).toHaveText('開一座新城堡');
});
