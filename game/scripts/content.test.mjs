import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { COURSES, CHAPTERS } from '../src/learning/curriculum.js';
import { PAGES } from '../src/i18n/skeleton.js';
import { RAG_PAGES } from '../src/i18n/rag/skeleton.js';
import { EMBED_PAGES } from '../src/i18n/embed/skeleton.js';
import { ZH } from '../src/i18n/zh.js';
import { RAG_JA } from '../src/i18n/rag/ja.js';
import { EMBED_ZH } from '../src/i18n/embed/zh.js';
import { readEntryTarget } from '../src/ui/route.js';
const root = new URL('../../', import.meta.url);
const json = path => JSON.parse(readFileSync(new URL(path,root),'utf8'));

test('all 149 original pages map to one of 15 bilingual chapters with evidence and transfer checks',()=>{
  let mapped=0;
  for(const course of COURSES){
    assert.equal(CHAPTERS[course.id].length,5);
    const pages={nanogpt:PAGES,rag:RAG_PAGES,embed:EMBED_PAGES}[course.id];
    for(const [i,c] of CHAPTERS[course.id].entries()){
      for(const lang of ['zh','ja']){
        for(const field of ['title','question','io','principle','advanced'])assert.ok(c[field][lang]?.trim(),`${c.id}:${field}:${lang}`);
        assert.ok(c.quiz.question[lang]);
        for(const o of c.quiz.options){assert.ok(o.text[lang]);assert.ok(o.feedback[lang]);}
      }
      assert.ok(c.quiz.options[c.quiz.answer]);assert.ok(c.concepts.length>=4);
      assert.ok(existsSync(fileURLToPath(new URL(c.source,root))));
      assert.ok(existsSync(fileURLToPath(new URL(c.sourceJa,root))));
      const original=pages.filter(p=>p.chapter===i+1);assert.ok(original.length);mapped+=original.length;
    }
    assert.equal(pages.length,course.count);
  }
  assert.equal(mapped,149);
});

test('introductory exercises cite the saved locale-specific experiment, not invented scores',()=>{
  const embedding=json('embed/demo/results.json');assert.equal(embedding.dimension,384);
  const pairs=Object.values(embedding.pairs).flat();
  for(const [a,b,score] of [['早饭','早餐',99],['早饭','停车',32],['朝ごはん','breakfast',95],['朝ごはん','dog',9]])assert.equal(pairs.find(p=>p.a===a&&p.b===b).points,score);
  const handbook=readFileSync(new URL('rag/demo/handbook.txt',root),'utf8');
  assert.match(handbook,/Page 4: Breakfast\s+Breakfast is served from 6:30 AM to 9:30 AM/);
  assert.match(handbook,/Page 6: Swimming pool[\s\S]*?10:00 AM to 6:00 PM in summer/);
});

test('corrected scientific distinctions survive source generation',()=>{
  assert.match(ZH['c3-sum.summary'],/Q.*K/);assert.doesNotMatch(ZH['c3-sum.summary'],/像不像/);
  assert.match(ZH['c4-p5.summary'],/约5000/);
  for(const suffix of ['does','metaphor','l1'])assert.match(RAG_JA[`pseudo.r4-p5.${suffix}`],/「？」を タップ/);
  const intro=RAG_PAGES.find(p=>p.id==='r1-intro');assert.equal(intro.shared.locales.ja.open,'ごはん・さばの みそに・みそしる');
  assert.ok(Object.values(EMBED_ZH).some(s=>s.includes('不能反推严格同方向')));
});

test('malformed hashes cannot crash startup; fractional indexes become integers',()=>{
  globalThis.sessionStorage={getItem:()=>null};
  globalThis.location={search:'',hash:'#%E0%A4%A'};assert.equal(readEntryTarget(),null);
  location.hash='#Level1/0.5/2';assert.deepEqual(readEntryTarget(),{scene:'Level1',beat:0,phase:2});
  location.hash='#Level1/-3/0.5';assert.deepEqual(readEntryTarget(),{scene:'Level1',beat:0,phase:0});
  delete globalThis.location;delete globalThis.sessionStorage;
});

test('child-first quests cover 15 bilingual chapters with transfer checks',()=>{
  const zh=json('game/src/quest/copy.zh.json'),ja=json('game/src/quest/copy.ja.json');
  assert.equal(zh.length,15);assert.equal(ja.length,15);
  assert.deepEqual(zh.map(q=>q.id),ja.map(q=>q.id));
  for(const pack of [zh,ja])for(const q of pack){
    assert.match(q.id,/^(nanogpt|rag|embed)-[1-5]$/);
    for(const f of ['title','goal','guide','actionHint','teaching','remember','question'])assert.ok(q[f]?.trim(),`${q.id}:${f}`);
    assert.equal(q.choices.length,3);assert.ok(q.choices[q.answer]);
    q.choices.forEach(c=>{assert.ok(c.text.trim());assert.ok(c.feedback.trim());});
  }
  assert.deepEqual(zh.map(q=>q.answer),ja.map(q=>q.answer));
});
