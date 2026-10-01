// Fast gate for course-title model readiness and all short-PC Japanese captions.
// The full animation suite still runs afterward with every original assertion.
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { embedPagesFor } from '../src/i18n/embed/skeleton.js';
const base=process.env.E2E_URL||'http://127.0.0.1:4182/';
const out='output/quest/course-readiness';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader']});
const reports=[],errors=[];
try {
  for(const [width,height] of [[1024,640],[1440,900]])for(const lang of ['zh','ja']){
    const page=await browser.newPage({viewport:{width,height}});
    page.on('pageerror',e=>errors.push(e.message));
    await page.addInitScript(lang=>{
      localStorage.setItem('nanogpt-lang',lang);
      for(const key of ['nanogpt-seen-guide','nanogpt-seen-guide-rag','nanogpt-seen-guide-embed'])localStorage.setItem(key,'1');
      localStorage.setItem('nanogpt-game-muted','1');
    },lang);
    await page.goto(`${base}?animation=1`);
    await page.waitForFunction(()=>window.__nanoGPTState?.().scene==='Home',undefined,{timeout:45000});
    await page.evaluate(()=>document.fonts.ready);
    for(const scene of ['RagTitle','EmbedTitle']){
      await page.evaluate(scene=>window.__nanoGPTJump(scene,0,0),scene);
      await page.waitForFunction(scene=>window.__nanoGPTState?.().scene===scene,scene,{timeout:20000});
      await page.waitForFunction(()=>{
        const c=document.getElementById('tutor-canvas'),r=c?.getBoundingClientRect();
        return c?.dataset.fitted==='1'&&r?.width>0&&r?.height>0&&getComputedStyle(c).display!=='none';
      },undefined,{timeout:30000});
      const result=await page.evaluate(()=>window.__nanoGPTAssertLayout());
      reports.push({name:`${scene}-${width}-${lang}`,result});
      if(!result.ok)await page.screenshot({path:`${out}/${scene}-${width}-${lang}-failure.png`});
      assert.ok(result.ok,JSON.stringify(reports.at(-1)));
    }
    if(width===1024&&lang==='ja'){
      for(let chapter=1;chapter<=5;chapter++)for(let beat=0;beat<embedPagesFor(chapter).length;beat++){
        const scene=`Embed${chapter}`;
        await page.evaluate(({scene,beat})=>window.__nanoGPTJump(scene,beat,2),{scene,beat});
        await page.waitForFunction(({scene,beat})=>{const s=window.__nanoGPTState?.();return s?.scene===scene&&s.beat===beat&&s.phase===2;},{scene,beat},{timeout:20000});
        await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
        const result=await page.evaluate(()=>window.__nanoGPTAssertLayout());
        const geometry=await page.evaluate(()=>{
          const s=window.__nanoGPTGame.scene.getScenes(true)[0];
          return {lastExample:s.frame?.lastExample,parts:(s.frame?.stage?.list||[]).filter(o=>['scheme','scheme-label'].includes(o.getData?.('artPart'))).map(o=>({part:o.getData('artPart'),x:o.x,y:o.y,width:o.getData('width')||o.width,height:o.getData('height')||o.height,shadow:o.getData('shadow'),bounds:o.getBounds?.()}))};
        });
        const name=`${scene}-${beat}-1024-ja`;reports.push({name,result,geometry});
        if(!result.ok||beat===0)await page.screenshot({path:`${out}/${name}${result.ok?'':'-failure'}.png`});
        assert.ok(result.ok,JSON.stringify(reports.at(-1)));
      }
    }
    await page.close();
  }
  assert.equal(reports.length,48);
  assert.deepEqual(errors,[]);
  console.log('COURSE_READINESS_OK',JSON.stringify({states:reports.length,errors}));
} finally {
  writeFileSync(`${out}/summary.json`,JSON.stringify({reports,errors},null,2));
  await browser.close();
}
