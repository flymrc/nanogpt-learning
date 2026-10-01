import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
const base = process.env.E2E_URL || 'http://127.0.0.1:4182/';
const out = process.env.READER_OUT || 'output/reader';
mkdirSync(out,{recursive:true});
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${base}?reader=1`);
  await page.getByRole('heading',{level:1}).waitFor();
  for(let i=0;i<8;i++){
    await page.keyboard.press('Tab');
    if(await page.evaluate(()=>document.activeElement.textContent.includes('把一段文本变成训练题')))break;
  }
  assert.match(await page.evaluate(()=>document.activeElement.textContent),/把一段文本变成训练题/);
  await page.keyboard.press('Enter');
  await page.getByLabel('y').fill('abab');
  await page.getByRole('button', { name: '检查例子' }).click();
  await page.getByText('还差一步', { exact: false }).waitFor();
  await page.getByLabel('y', { exact: true }).fill('baba');
  await page.getByRole('button', { name: '检查例子' }).click();
  await page.getByText('a → b', { exact: false }).waitFor();
  const quiz = page.getByRole('form', { name: '换个例子检查' });
  await quiz.getByLabel('abca', { exact: true }).check();
  await quiz.getByRole('button', { name: '提交答案' }).click();
  await quiz.getByText(/复制了输入/).waitFor();
  await quiz.getByLabel('bcab', { exact: true }).check();
  await quiz.getByRole('button', { name: '提交答案' }).click();
  await quiz.getByText(/检查通过/).waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  const answers={nanogpt:[1,0,1,1,0],rag:[1,0,1,0,1],embed:[0,1,0,1,0]};
  const exercise=async(course,chapter)=>{
    const values={
      'nanogpt-1':['input','y','baba'], 'nanogpt-2':['input','p','0.8'], 'nanogpt-3':['select','position','2'],
      'nanogpt-4':['input','rate','0.1'], 'nanogpt-5':['input','temperature','1'],
      'rag-1':['select','page','4'], 'rag-2':['select','method','page'], 'rag-3':['select','method','meaning'],
      'rag-4':['select','first','4'], 'rag-5':['input','score','0.4'],
      'embed-1':['select','pair',await page.locator('html').getAttribute('lang')==='ja'?'breakfast':'早餐'],
      'embed-2':['input','norm','5'], 'embed-3':['input','cos','0.996'], 'embed-4':['select','z','100'], 'embed-5':['select','claim','topic'],
    };
    const [tag,name,value]=values[`${course}-${chapter}`];
    const field=page.locator(`#learning-root ${tag}[name="${name}"]`);
    if(tag==='select')await field.selectOption(value);else await field.fill(value);
    if(course==='rag'&&chapter===1)await page.locator('#ex-time').selectOption('9:30');
    await page.locator('#learning-root form').first().locator('button[type="submit"]').click();
    assert.equal(await page.locator('#experiment-result').getAttribute('data-ok'),'true',`${course}-${chapter} example`);
    const rendered=await page.locator('#experiment-result').innerText();
    const expected={
      'nanogpt-1':/y = b a b a/, 'nanogpt-2':/0\.2231/,
      'nanogpt-3':/F · i · r/, 'nanogpt-4':/1\.9500/,
      'nanogpt-5':/a: 66\.5%\nb: 24\.5%\nc: 9\.0%/,
      'rag-1':/9:30/, 'rag-2':/Page 4.*6:30–9:30/, 'rag-4':/6:30–9:30/,
      'embed-2':/sqrt\(3²\+4²\)=5/, 'embed-3':/= 100/,
      'embed-4':/A → \[1,2\]; B → \[1,2\]/,
    }[`${course}-${chapter}`];
    if(expected)assert.match(rendered,expected);
    if(course==='nanogpt'&&chapter===3)assert.doesNotMatch(rendered,/r · s/);
    if(course==='embed'&&chapter===1){
      const ja=await page.locator('html').getAttribute('lang')==='ja';
      assert.match(rendered,ja?/breakfast: 95/:/早餐: 99/);
      assert.match(rendered,ja?/dog: 9/:/停车: 32/);
    }
    if(course==='rag'&&chapter===5){
      const ja=await page.locator('html').getAttribute('lang')==='ja';
      const threshold=ja?0.2:0.3;
      await field.fill(String(threshold));await page.locator('#learning-root form').first().locator('button').click();
      assert.match(await page.locator('#experiment-result').innerText(),ja?/しきい値以上/:/达到阈值/);
      await field.fill(String(threshold-0.01));await page.locator('#learning-root form').first().locator('button').click();
      assert.match(await page.locator('#experiment-result').innerText(),ja?/しきい値未満/:/低于阈值/);
    }
  };
  const reports=[];
  for(const viewport of [{width:390,height:844},{width:1180,height:757},{width:1440,height:900}]){
    await page.setViewportSize(viewport);
    for(const lang of ['zh','ja']){
      await page.goto(`${base}?reader=1`);
      if((await page.locator('html').getAttribute('lang')) !== (lang==='ja'?'ja':'zh-CN')) await page.locator('#reader-language').click();
      await page.screenshot({path:`${out}/home-${lang}-${viewport.width}.png`,fullPage:true});
      for(const course of ['nanogpt','rag','embed'])for(let chapter=1;chapter<=5;chapter++){
        await page.goto(`${base}#learn/${course}/${chapter}`);
        await page.locator('#learning-root article h1').waitFor();
        assert.match(await page.title(),new RegExp(course==='embed'?'Embedding':course==='rag'?'RAG':'nanoGPT'));
        await exercise(course,chapter);
        const form=page.locator('#learning-root .quiz');
        const radios=form.getByRole('radio'),correct=answers[course][chapter-1],wrong=correct===0?1:0;
        await radios.nth(wrong).check();await form.locator('button').click();
        assert.equal(await form.locator('.result').getAttribute('data-ok'),'false');
        await radios.nth(correct).check();await form.locator('button').click();
        assert.equal(await form.locator('.result').getAttribute('data-ok'),'true');
        const geometry=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,minText:Math.min(...[...document.querySelectorAll('#learning-root p,#learning-root label,#learning-root input,#learning-root select')].filter(e=>e.getClientRects().length).map(e=>parseFloat(getComputedStyle(e).fontSize)))}));
        assert.equal(geometry.overflow,false,`${course}-${chapter}:${lang}:${viewport.width}`);assert.ok(geometry.minText>=16,JSON.stringify(geometry));
        if(chapter===1){await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`${out}/${course}-${lang}-${viewport.width}.png`,fullPage:true});}
        reports.push({course,chapter,lang,width:viewport.width,...geometry});
      }
    }
  }
  // The original 149 pages remain available as actual readable text.
  await page.goto(`${base}#learn/rag/1`);
  await page.getByText('技術的な補足と根拠',{exact:true}).click();
  await page.getByText('元の絵解き · 全ページの文章',{exact:true}).click();
  await page.getByRole('heading',{name:/r1-intro/}).waitFor();
  assert.equal(await page.locator('#learning-root details details h3').count(),12);
  assert.deepEqual(errors, []);
  writeFileSync(`${out}/summary.json`,JSON.stringify({reports,errors},null,2));
  console.log(`READER_OK chapters=${reports.length} locales=2 viewports=3 keyboard=1 originalText=12 errors=0`);
} finally {
  await browser.close();
}
