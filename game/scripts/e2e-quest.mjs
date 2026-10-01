import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
const base=process.env.E2E_URL||'http://127.0.0.1:4182/';
const out=process.env.QUEST_OUT||'output/quest';mkdirSync(out,{recursive:true});
const copies={zh:JSON.parse(readFileSync('src/quest/copy.zh.json')),ja:JSON.parse(readFileSync('src/quest/copy.ja.json'))};
const success={
 'nanogpt-1':['shift'],'nanogpt-2':['more'],'nanogpt-3':['mask'],'nanogpt-4':['train'],'nanogpt-5':['sample'],
 'rag-1':['breakfast'],'rag-2':['pages'],'rag-3':['word','meaning'],'rag-4':['fix'],'rag-5':['ask','update'],
 'embed-1':['encode'],'embed-2':['two','unfold'],'embed-3':['align'],'embed-4':['reveal'],'embed-5':['out'],
};
const browser=await chromium.launch({...(process.env.CHROME?{executablePath:process.env.CHROME}:{}),args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']});
const reports=[],errors=[],failures=[];
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{localStorage.setItem('nanogpt-game-muted','1');});
 const geometry=async(label)=>{
   await page.evaluate(()=>new Promise(r=>requestAnimationFrame(r)));
   const g=await page.evaluate(()=>{
     const root=document.getElementById('quest-root'),box=root.getBoundingClientRect();
     const controls=[...root.querySelectorAll('button,a,p,strong,summary')].filter(e=>e.getClientRects().length);
     const bad=controls.filter(e=>parseFloat(getComputedStyle(e).fontSize)<16).map(e=>({text:e.textContent,size:getComputedStyle(e).fontSize}));
     const overflow=[...root.querySelectorAll('.quest-board,.quest-dialogue,.quest-arena,.qd-root,.qd-play')].filter(e=>e.scrollWidth>e.clientWidth+2).map(e=>({class:e.className,w:e.clientWidth,scroll:e.scrollWidth}));
     const pieces=[...root.querySelectorAll('.qd-tile,.qd-card,.qd-window,.qd-ticket,.qd-paper-card')].filter(e=>e.getClientRects().length);
     const collisions=[];
     for(let i=0;i<pieces.length;i++)for(let j=i+1;j<pieces.length;j++){
       if(pieces[i].parentElement!==pieces[j].parentElement)continue;
       const a=pieces[i].getBoundingClientRect(),b=pieces[j].getBoundingClientRect();
       if(Math.min(a.right,b.right)-Math.max(a.left,b.left)>1 && Math.min(a.bottom+4,b.bottom+4)-Math.max(a.top,b.top)>1)collisions.push([pieces[i].className,pieces[j].className]);
     }
     const nav=root.querySelector('.quest-trail').getBoundingClientRect(),active=root.querySelector('[aria-current="step"]').getBoundingClientRect();
     const currentNavHidden=active.left<nav.left-2||active.right>nav.right+2;
     return {currentNavHidden,collisions,rootWidth:box.width,viewport:innerWidth,horizontal:root.scrollWidth>root.clientWidth+2,bad,overflow};
   });
   if(g.currentNavHidden||g.collisions.length||g.horizontal||g.bad.length||g.overflow.length)failures.push({label,...g});
   reports.push({label,...g});
 };
 const home=async(lang)=>{
   await page.goto(base);await page.waitForFunction(()=>window.__nanoGPTGame?.scene.getScenes(true)[0]?.sys.settings.key==='Home',{timeout:60000});
   await page.evaluate(l=>window.__nanoGPTSetLang(l),lang);await page.waitForTimeout(400);
 };
 // Default is the retained illustrated game, and course cards open the new quests.
 for(const viewport of [{width:390,height:844},{width:1024,height:640},{width:1440,height:900}]){
   await page.setViewportSize(viewport);
   for(const lang of ['zh','ja']){
     await home(lang);await page.screenshot({path:`${out}/home-${lang}-${viewport.width}.png`});
     const cards=await page.evaluate(()=>window.__nanoGPTHubCards());assert.equal(cards.length,3);
     for(const card of cards){
       await home(lang);const bounds=await page.evaluate(id=>window.__nanoGPTHubCards().find(c=>c.id===id),card.id);
       await page.mouse.click(bounds.x+bounds.w/2,bounds.y+bounds.h/2);await page.locator('#quest-root').waitFor();
       assert.equal(await page.locator('#quest-root').getAttribute('data-quest-id'),`${card.id}-1`);
     }
     for(const q of copies[lang]){
       const [course,n]=q.id.split('-');
       await page.goto(`${base}#quest/${course}/${n}`);await page.locator('#quest-root').waitFor();
       assert.equal(await page.locator('#quest-root').getAttribute('data-quest-id'),q.id);
       assert.equal(await page.locator('#quest-root .quest-primary').isEnabled(),false,'viewing must not pass');
       await geometry(`${q.id}:${lang}:${viewport.width}:play`);
       for(const action of success[q.id])await page.locator(`[data-demo-action="${action}"]`).click();
       await page.waitForFunction(()=>!document.querySelector('#quest-root .quest-primary').disabled);
       await page.waitForTimeout(650);
       await geometry(`${q.id}:${lang}:${viewport.width}:done`);
       await page.locator('.quest-arena').screenshot({path:`${out}/${q.id}-${lang}-${viewport.width}-arena.png`});
       await page.evaluate(()=>document.getElementById('quest-root').scrollTo(0,0));
       await page.screenshot({path:`${out}/${q.id}-${lang}-${viewport.width}-top.png`});
       await page.locator('#quest-root .quest-primary').click();
       assert.equal(await page.locator('#quest-root').getAttribute('data-phase'),'quiz');
       const wrong=(q.answer+1)%3;await page.locator(`[data-answer="${wrong}"]`).click();
       assert.equal(await page.locator('.quest-feedback').getAttribute('data-ok'),'false');
       assert.equal(await page.locator('#quest-root .quest-primary').isEnabled(),false);
       await page.locator(`[data-answer="${q.answer}"]`).click();
       assert.equal(await page.locator('.quest-feedback').getAttribute('data-ok'),'true');
       await geometry(`${q.id}:${lang}:${viewport.width}:quiz`);
       await page.locator('#quest-root .quest-primary').click();
       assert.equal(await page.locator('#quest-root').getAttribute('data-phase'),'win');
       const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('nanogpt-quest-stars-v1')));assert.ok(saved.includes(q.id));
     }
   }
 }
 // Reload, Back/Forward, locale change, retained animations, and optional reader.
 await page.setViewportSize({width:390,height:844});
 await page.goto(`${base}#quest/nanogpt/1`);await page.locator('#quest-root').waitFor();
 await page.locator('[data-chapter="2"]').click();await page.goBack();
 await page.waitForFunction(()=>document.querySelector('#quest-root')?.dataset.questId==='nanogpt-1');
 await page.goForward();await page.waitForFunction(()=>document.querySelector('#quest-root')?.dataset.questId==='nanogpt-2');
 await page.reload();await page.locator('#quest-root').waitFor();assert.equal(await page.locator('#quest-root').getAttribute('data-quest-id'),'nanogpt-2');
 await page.locator('.quest-controls button').nth(1).click();await page.waitForFunction(()=>document.documentElement.lang==='zh-CN');
 assert.equal(await page.locator('#quest-root').getAttribute('data-quest-id'),'nanogpt-2');
 await page.locator('.quest-extras summary').click();await page.locator('.quest-extras a').first().click();
 await page.waitForFunction(()=>window.__nanoGPTGame?.scene.getScenes(true)[0]?.sys.settings.key==='Level2');
 await page.goto(`${base}?reader=1#learn/nanogpt/2`);await page.locator('#learning-root h1').waitFor();assert.equal(await page.evaluate(()=>Boolean(window.__nanoGPTGame)),false);
 // Wide Hiyori loads; narrow layout does not instantiate Live2D.
 await page.setViewportSize({width:1440,height:900});await page.goto(`${base}#quest/nanogpt/1`);await page.locator('#quest-root').waitFor();
 await page.waitForFunction(()=>window.__nanoGPTTutorHiDPI?.()?.modelCount===1,{timeout:60000});
 await page.screenshot({path:`${out}/desktop-hiyori.png`});
 await page.setViewportSize({width:390,height:844});await page.reload();await page.locator('#quest-root').waitFor();
 assert.equal(await page.locator('#tutor-dock').isVisible(),false);
 assert.equal(await page.locator('.quest-portrait').isVisible(),false);
 writeFileSync(`${out}/summary.json`,JSON.stringify({reports,errors,failures,quests:15,locales:2,viewports:3},null,2));
 assert.deepEqual(errors,[]);assert.deepEqual(failures,[],"Every quest layout must pass");
 console.log('QUEST_OK',JSON.stringify({states:reports.length,quests:15,locales:2,viewports:3,errors}));
}catch(error){
 for(const page of browser.contexts().flatMap(c=>c.pages())){console.error('QUEST_STATE',await page.locator('#quest-root').innerText().catch(()=>''));await page.screenshot({path:`${out}/failure.png`,fullPage:true}).catch(()=>{});}
 throw error;
}finally{await browser.close();}
