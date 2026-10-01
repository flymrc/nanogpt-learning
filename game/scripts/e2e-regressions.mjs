import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const base=process.env.E2E_URL || 'http://127.0.0.1:4182/';
const browser=await chromium.launch({...(process.env.CHROME?{executablePath:process.env.CHROME}:{}),args:['--use-gl=angle','--use-angle=swiftshader']});
try {
  const page=await browser.newPage({viewport:{width:390,height:844}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${base}?reader=1`);
  await page.getByRole('heading',{level:1}).waitFor();
  assert.equal(await page.evaluate(()=>Boolean(window.__nanoGPTGame)),false,'reader must not initialize Phaser');
  assert.equal(await page.evaluate(()=>performance.getEntriesByType('resource').filter(r=>r.name.includes('/audio/')).length),0,'reader must request no audio');
  await page.goto(`${base}?animation=1#Rag1/0/2`);
  await page.waitForFunction(()=>window.__nanoGPTGame?.scene.getScenes(true)[0]?.sys.settings.key==='Rag1',{timeout:60000});
  const bootAudio=await page.evaluate(()=>{const c=window.__nanoGPTGame.cache.audio;return {count:c.getKeys().length,bytes:c.getKeys().reduce((s,k)=>{const b=c.get(k);return s+(b.length||0)*(b.numberOfChannels||0)*4;},0)};});
  assert.ok(bootAudio.count<=4,JSON.stringify(bootAudio));assert.ok(bootAudio.bytes<10*1024*1024,JSON.stringify(bootAudio));
  for(const lang of ['zh','ja']) {
    await page.evaluate(l=>{localStorage.setItem('nanogpt-seen-guide-rag','1');window.__nanoGPTSetLang(l);},lang);
    for(const [fx,fy] of [[.25,.25],[.75,.25],[.25,.75],[.75,.75],[.5,.5]]) {
      await page.evaluate(()=>window.__nanoGPTJump('Rag1',0,2));
      await page.waitForTimeout(500);
      if(await page.locator('#guide-overlay').isVisible())await page.locator('#guide-close').click();
      const point=await page.evaluate(([fx,fy])=>{
        const s=window.__nanoGPTGame.scene.getScenes(true)[0],c=s.frame.stage.list.find(o=>o.getData?.('artPart')==='scheme');
        const rect=s.game.canvas.getBoundingClientRect(),cam=s.cameras.main;
        const p=c.getWorldTransformMatrix().transformPoint((fx-.5)*c.width,(fy-.5)*c.height);
        return {x:rect.x+(p.x-cam.worldView.x)*cam.zoom*rect.width/s.game.canvas.width,y:rect.y+(p.y-cam.worldView.y)*cam.zoom*rect.height/s.game.canvas.height};
      },[fx,fy]);
      await page.mouse.click(point.x,point.y);
      await page.waitForFunction(()=>window.__nanoGPTRagStep===1,{timeout:2000});
      assert.match(page.url(),/#Rag1\/0\/2$/);
    }
    assert.match(await page.title(),lang==='ja'?/フロント/:/前台/);
  }
  // Return through the real catalog control, without a floating link over
  // the animation's heading or controls.
  await page.locator('#catalog-toggle').click();
  await page.locator('#reader-return').click();
  await page.waitForURL(/#learn\/rag\/1$/);
  await page.locator('#learning-root article h1').waitFor();
  assert.equal(await page.evaluate(()=>Boolean(window.__nanoGPTGame)),false);
  // Deterministic navigation/resize race: timers may run before a queued frame.
  await page.goto(`${base}?animation=1#Level2/0/0`);
  await page.waitForFunction(()=>window.__nanoGPTState?.().scene==='Level2'&&window.__nanoGPTState?.().phase===0);
  await page.evaluate(()=>{
    const game=window.__nanoGPTGame;
    game.loop.sleep();
    window.__nanoGPTJump('Level2',0,2);
    game.scale.resize(game.scale.width-80,game.scale.height);
  });
  await page.waitForTimeout(250);
  await page.evaluate(()=>window.__nanoGPTGame.loop.wake());
  await page.waitForFunction(()=>window.__nanoGPTState?.().scene==='Level2'&&window.__nanoGPTState?.().beat===0&&window.__nanoGPTState?.().phase===2,null,{timeout:15000});
  assert.equal(await page.evaluate(()=>window.__nanoGPTGame.scene.getScenes(true).length),1);
  for(const hash of ['#Level1/0.5/2','#%E0%A4%A','#Level1/0/0.5']) {
    await page.goto(`${base}?animation=1&probe=${Date.now()}${hash}`);
    await page.waitForFunction(()=>{const key=window.__nanoGPTGame?.scene.getScenes(true)[0]?.sys.settings.key;return key==='Home'||key==='Level1';},{timeout:60000});
    const state=await page.evaluate(()=>{const s=window.__nanoGPTGame.scene.getScenes(true)[0];return {beat:s.beat,phase:s.phase};});
    if(hash.startsWith('#Level1')){assert.ok(Number.isInteger(state.beat));assert.ok(Number.isInteger(state.phase));}
  }
  await page.goto(`${base}#Rag1/0/2`);
  await page.waitForFunction(()=>window.__nanoGPTState?.().scene==='Rag1');
  await page.locator('#catalog-toggle').click();await page.locator('#reader-return').click();
  await page.waitForURL(/#learn\/rag\/1$/);
  await page.locator('#learning-root article h1').waitFor();
  await page.waitForFunction(()=>document.documentElement.dataset.reader==='true');
  await page.goBack();
  await page.waitForFunction(()=>document.documentElement.dataset.reader==='false'&&window.__nanoGPTState?.().scene==='Rag1');
  assert.match(page.url(),/#Rag1\/0\/2$/);
  assert.deepEqual(errors,[]);
  console.log('REGRESSIONS_OK',JSON.stringify({bootAudio,realCardClicks:10,malformedRoutes:3,errors}));
} catch(error) {
  for(const page of browser.contexts().flatMap(context=>context.pages())) {
    console.error('REGRESSION_STATE',await page.evaluate(()=>({url:location.href,reader:document.documentElement.dataset.reader,rootHidden:document.getElementById('learning-root')?.hidden,heading:document.querySelector('#learning-root h1')?.textContent,scene:window.__nanoGPTState?.()})).catch(()=>({closed:true})));
  }
  throw error;
} finally {await browser.close();}
