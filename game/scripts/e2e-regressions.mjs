/**
 * Regressions kept from the a431ee6 review, against the kid animation home at
 * the site root (no query parameter):
 * - real pointer clicks (mouse on 1440×900, touch on 390×844) land on Phaser
 *   containers with a centred origin: RAG picture cards, embedding picture
 *   cards, phase tabs, RAG card-grid cells and the zoomed card slip;
 * - hash deep links (#Rag5/4/2, #Embed2/1/2, #Level2/1/2) open without a query;
 * - narration clips are loaded on demand (small boot audio cache);
 * - malformed hashes cannot crash startup;
 * - the text reader is opt-in at ?reader=1, starts no Phaser and no audio,
 *   and is not linked from the kid home.
 */
import assert from 'node:assert/strict';
import { launchChrome } from './browser.mjs';

const ROOT = process.env.E2E_URL || 'http://127.0.0.1:4182/';
const READER = (() => { const url = new URL(ROOT); url.searchParams.set('reader', '1'); return url.href; })();
const MOBILE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const VIEWPORTS = [
  { label: 'pc1440', viewport: { width: 1440, height: 900 }, touch: false },
  { label: 'mobile390', viewport: { width: 390, height: 844 }, touch: true },
];
// Quadrants and near-corners: the old (-w/2,-h/2) hit area only answered in
// the top-left quarter, so any of the right/bottom points catches it.
const CARD_POINTS = [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75], [0.5, 0.5]];
const EDGE_POINTS = [[0.12, 0.2], [0.88, 0.2], [0.12, 0.8], [0.88, 0.8], [0.5, 0.5]];

const browser = await launchChrome({ args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader'] });
const errors = [];
const counts = { ragCard: 0, embedCard: 0, phaseTab: 0, ragCell: 0, ragSlip: 0, deepLinks: 0, malformed: 0 };

async function openPage({ viewport, touch }, url = ROOT) {
  const page = await browser.newPage({
    viewport,
    deviceScaleFactor: touch ? 2 : 1,
    isMobile: touch,
    hasTouch: touch,
    userAgent: touch ? MOBILE_UA : undefined,
  });
  page.on('pageerror', (error) => errors.push(`${viewport.width}: ${error.message}`));
  await page.addInitScript(() => {
    for (const key of ['nanogpt-seen-guide', 'nanogpt-seen-guide-rag', 'nanogpt-seen-guide-embed']) localStorage.setItem(key, '1');
  });
  await page.goto(url, { waitUntil: 'load', timeout: 60000 });
  return page;
}

async function waitScene(page, scene, beat, phase) {
  await page.waitForFunction(([k, b, p]) => {
    const s = window.__nanoGPTState?.();
    return s?.scene === k && (b == null || s.beat === b) && (p == null || s.phase === p);
  }, [scene, beat, phase], { timeout: 60000 });
}

async function jump(page, scene, beat, phase) {
  await page.evaluate(([k, b, p]) => window.__nanoGPTJump(k, b, p), [scene, beat, phase]);
  await waitScene(page, scene, beat, phase);
  await page.waitForTimeout(450);
  if (await page.locator('#guide-overlay').isVisible()) await page.locator('#guide-close').click();
}

/** Screen point of a fraction of a Phaser container's size. Asserts the canvas is on top there. */
async function screenPoint(page, finder, fx, fy) {
  const point = await page.evaluate(([source, fx, fy]) => {
    const scene = window.__nanoGPTGame.scene.getScenes(true)[0];
    const find = new Function('scene', `return (${source})(scene);`);
    const target = find(scene);
    if (!target) return null;
    const canvas = scene.game.canvas;
    const rect = canvas.getBoundingClientRect();
    const cam = scene.cameras.main;
    const p = target.getWorldTransformMatrix().transformPoint((fx - 0.5) * target.width, (fy - 0.5) * target.height);
    const x = rect.x + (p.x - cam.worldView.x) * cam.zoom * rect.width / canvas.width;
    const y = rect.y + (p.y - cam.worldView.y) * cam.zoom * rect.height / canvas.height;
    return { x, y, onCanvas: document.elementFromPoint(x, y) === canvas };
  }, [finder.toString(), fx, fy]);
  assert.ok(point, `target missing for ${finder}`);
  assert.ok(point.onCanvas, `canvas not on top at ${JSON.stringify(point)}`);
  return point;
}

async function press(page, touch, point) {
  if (touch) await page.touchscreen.tap(point.x, point.y);
  else await page.mouse.click(point.x, point.y);
}

const schemeCard = (scene) => scene.frame.stage.list.find((o) => o.getData?.('artPart') === 'scheme' && o.input);
const phaseTab = (index) => new Function('scene', `return scene.frame.stage.list.find((o) => o.getData?.('phaseTab') === ${index});`);
const ragCell = (scene) => {
  const card = scene.frame.stage.list.find((o) => o.getData?.('artPart') === 'scheme');
  return card?.list?.find((o) => o.getData?.('ragCell') != null);
};
const ragSlip = (scene) => {
  const card = scene.frame.stage.list.find((o) => o.getData?.('artPart') === 'scheme');
  return card?.list?.find((o) => o.getData?.('ragSlip'));
};

/** A picture card click steps the picture; it must not change the phase or page. */
async function cardClicks(page, touch, scene, beat, name) {
  for (const [fx, fy] of CARD_POINTS) {
    await jump(page, scene, beat, 2);
    const before = await page.evaluate(() => ({ step: window.__nanoGPTRagStep, steps: window.__nanoGPTRagSteps }));
    assert.equal(before.step, 0, `${name} starts at step 0`);
    assert.ok(before.steps >= 1, `${name} has a step to reveal`);
    await press(page, touch, await screenPoint(page, schemeCard, fx, fy));
    await page.waitForFunction(() => window.__nanoGPTRagStep === 1, null, { timeout: 4000 })
      .catch(() => { throw new Error(`${name} click at ${fx},${fy} did not step the picture`); });
    const state = await page.evaluate(() => window.__nanoGPTState());
    assert.deepEqual([state.scene, state.beat, state.phase], [scene, beat, 2], `${name} click at ${fx},${fy} moved the lesson`);
    counts[name] += 1;
  }
}

async function tabClicks(page, touch, scene, beat) {
  const targets = [0, 1, 3, 4, 0];
  for (const [i, [fx, fy]] of EDGE_POINTS.entries()) {
    await jump(page, scene, beat, 2);
    await press(page, touch, await screenPoint(page, phaseTab(targets[i]), fx, fy));
    await page.waitForFunction((p) => window.__nanoGPTState?.().phase === p, targets[i], { timeout: 4000 })
      .catch(() => { throw new Error(`${scene} tab ${targets[i]} click at ${fx},${fy} missed`); });
    assert.equal(await page.evaluate(() => window.__nanoGPTState().beat), beat);
    counts.phaseTab += 1;
  }
}

async function gridClicks(page, touch) {
  for (const [fx, fy] of EDGE_POINTS.slice(0, 4)) {
    await jump(page, 'Rag2', 1, 2);
    // The cut picture shows a long paper first; tap the card until the grid shows.
    for (let i = 0; i < 4; i++) {
      if (await page.evaluate(new Function(`const scene = window.__nanoGPTGame.scene.getScenes(true)[0]; return Boolean((${ragCell})(scene));`))) break;
      await press(page, touch, await screenPoint(page, schemeCard, 0.5, 0.5));
      await page.waitForTimeout(700);
    }
    const page0 = await page.evaluate(() => window.__nanoGPTGame.scene.getScenes(true)[0].__ragZoom ?? null);
    assert.equal(page0, null);
    await press(page, touch, await screenPoint(page, ragCell, fx, fy));
    await page.waitForFunction(() => window.__nanoGPTGame.scene.getScenes(true)[0].__ragZoom != null, null, { timeout: 4000 })
      .catch(() => { throw new Error(`card-grid cell click at ${fx},${fy} did not zoom`); });
    counts.ragCell += 1;
    await page.waitForTimeout(400);
    await press(page, touch, await screenPoint(page, ragSlip, 1 - fx, 1 - fy));
    await page.waitForFunction(() => window.__nanoGPTGame.scene.getScenes(true)[0].__ragZoom == null, null, { timeout: 4000 })
      .catch(() => { throw new Error(`zoomed slip click at ${1 - fx},${1 - fy} did not close`); });
    counts.ragSlip += 1;
  }
}

try {
  // 1. Site root = kid animation home, fonts and Live2D on PC, no reader link.
  let bootAudio;
  for (const view of [...VIEWPORTS, { label: 'pc1920', viewport: { width: 1920, height: 1080 }, touch: false }]) {
    const page = await openPage(view);
    await waitScene(page, 'Home');
    const home = await page.evaluate(() => ({
      reader: document.documentElement.dataset.reader || '',
      learningRoot: Boolean(document.getElementById('learning-root')),
      fonts: [...document.querySelectorAll('link[rel="stylesheet"]')].some((l) => l.href.includes('fonts.googleapis.com')),
      readerLinks: [...document.querySelectorAll('a')].filter((a) => /reader/.test(a.getAttribute('href') || '')).length,
      layout: document.documentElement.dataset.layout,
    }));
    assert.deepEqual({ ...home, layout: undefined }, { reader: '', learningRoot: false, fonts: true, readerLinks: 0, layout: undefined }, view.label);
    assert.equal(home.layout, view.touch ? 'mobile' : 'pc', view.label);
    if (!view.touch) {
      await page.waitForFunction(() => document.documentElement.dataset.tutor === 'shown', null, { timeout: 45000 })
        .catch(() => { throw new Error(`${view.label}: Live2D tutor not shown on the PC home`); });
    } else {
      assert.notEqual(await page.evaluate(() => document.documentElement.dataset.tutor), 'shown', 'no Live2D on a phone');
    }
    if (view.label === 'pc1440') {
      bootAudio = await page.evaluate(() => {
        const cache = window.__nanoGPTGame.cache.audio;
        return { count: cache.getKeys().length, keys: cache.getKeys() };
      });
      assert.ok(bootAudio.count <= 4, `narration must load on demand ${JSON.stringify(bootAudio)}`);
    }
    await page.close();
  }

  // 2. Hash deep links with no query parameter.
  for (const [hash, scene, beat, phase] of [['#Rag5/4/2', 'Rag5', 4, 2], ['#Embed2/1/2', 'Embed2', 1, 2], ['#Level2/1/2', 'Level2', 1, 2]]) {
    const page = await openPage(VIEWPORTS[0], `${ROOT}${hash}`);
    await waitScene(page, scene, beat, phase);
    assert.equal(new URL(page.url()).search, '');
    counts.deepLinks += 1;
    await page.close();
  }

  // 3. Real clicks on both viewports and both languages.
  for (const view of VIEWPORTS) {
    const page = await openPage(view);
    await waitScene(page, 'Home');
    for (const lang of ['zh', 'ja']) {
      await page.evaluate((l) => window.__nanoGPTSetLang(l), lang);
      await cardClicks(page, view.touch, 'Rag1', 0, 'ragCard');
      await cardClicks(page, view.touch, 'Embed1', 1, 'embedCard');
      for (const [scene, beat] of [['Rag1', 0], ['Embed1', 1], ['Level1', 1]]) await tabClicks(page, view.touch, scene, beat);
      await gridClicks(page, view.touch);
    }
    await page.close();
  }

  // 4. Malformed hashes cannot crash startup.
  for (const hash of ['#Level1/0.5/2', '#%E0%A4%A', '#Level1/0/0.5']) {
    const page = await openPage(VIEWPORTS[0], `${ROOT}?probe=${Date.now()}${hash}`);
    await page.waitForFunction(() => ['Home', 'Level1'].includes(window.__nanoGPTState?.().scene), null, { timeout: 60000 });
    const state = await page.evaluate(() => window.__nanoGPTState());
    if (hash.startsWith('#Level1')) {
      assert.ok(Number.isInteger(state.beat) && Number.isInteger(state.phase), JSON.stringify(state));
    }
    counts.malformed += 1;
    await page.close();
  }

  // 5. Opt-in reader: no Phaser, no audio; its animation links go to the kid deep link.
  {
    const page = await openPage(VIEWPORTS[1], READER);
    await page.getByRole('heading', { level: 1 }).waitFor();
    assert.equal(await page.evaluate(() => Boolean(window.__nanoGPTGame)), false, 'reader must not initialize Phaser');
    assert.equal(await page.evaluate(() => performance.getEntriesByType('resource').filter((r) => r.name.includes('/audio/')).length), 0, 'reader must request no audio');
    await page.goto(`${READER}#learn/rag/5`);
    await page.locator('#learning-root article h1').waitFor();
    const href = await page.locator('#learning-root .chapter-footer a').first().getAttribute('href');
    assert.match(href, /^\/[^?]*#Rag5\/0\/0$/, href);
    await page.locator('#learning-root .chapter-footer a').first().click();
    await waitScene(page, 'Rag5', 0, 0);
    assert.equal(new URL(page.url()).search, '');
    await page.close();
  }

  assert.deepEqual(errors, []);
  console.log('REGRESSIONS_OK', JSON.stringify({ bootAudio: bootAudio.count, ...counts, errors: errors.length }));
} finally {
  await browser.close();
}
