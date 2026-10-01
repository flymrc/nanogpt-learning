import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
const browser = await chromium.launch({...(process.env.CHROME?{executablePath:process.env.CHROME}:{}),headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader']});
try {
  const page = await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
  page.on('console',m=>{if(m.type()==='error')console.log(m.text())});
  await page.goto(`${process.env.E2E_URL||'http://127.0.0.1:4182/'}?animation=1`);
  await page.waitForFunction(()=>window.__nanoGPTTutorHiDPI?.()?.modelCount===1,{timeout:90000});
  await page.waitForFunction(()=>{
    const a=window.__nanoGPTTutorHiDPI?.()?.animation;
    return a?.pose && Math.min(a.armA,a.armB)<0.02 && Math.max(a.armA,a.armB)>0.98;
  },{timeout:20000});
  const before=await page.evaluate(()=>window.__nanoGPTTutorHiDPI().animation.elapsed);
  await page.waitForTimeout(800);
  assert.ok(await page.evaluate(()=>window.__nanoGPTTutorHiDPI().animation.elapsed)>before+200,"model ticker must advance");
  await page.waitForFunction(()=>{
    const p=window.__nanoGPTTutorHiDPI?.()?.params;
    return p?.eyeOpen>0.9 && p?.mouthOpen<0.25;
  },{timeout:15000});
  const state=await page.evaluate(()=>window.__nanoGPTTutorHiDPI());
  assert.equal(state.modelCount,1);assert.ok(state.place.bounds.h>700);
  await page.addStyleTag({content:'html,body,#app-layout,#pc-stage,#tutor-dock,#tutor-stage{background:transparent!important} #pc-stage{visibility:hidden} #tutor-dock{visibility:visible}'});
  mkdirSync('public/assets',{recursive:true});
  await page.locator('#tutor-canvas').screenshot({path:'public/assets/hiyori-guide.png',omitBackground:true});
  mkdirSync('output/quest',{recursive:true});
  await page.locator('#tutor-canvas').screenshot({path:'output/quest/hiyori-guide.png',omitBackground:true});
  writeFileSync('output/quest/tutor-render.json',JSON.stringify(state,null,2));
  console.log('TUTOR_CAPTURE_OK',JSON.stringify(state.place));
} finally {await browser.close();}
