import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { COURSES, CHAPTERS } from '../src/learning/curriculum.js';
import { PAGES } from '../src/i18n/skeleton.js';
import { RAG_PAGES } from '../src/i18n/rag/skeleton.js';
import { EMBED_PAGES } from '../src/i18n/embed/skeleton.js';
import { ZH } from '../src/i18n/zh.js';
import { JA } from '../src/i18n/ja.js';
import { RAG_JA } from '../src/i18n/rag/ja.js';
import { EMBED_ZH } from '../src/i18n/embed/zh.js';
import { EMBED_JA } from '../src/i18n/embed/ja.js';
import { checkBeatClips } from './vo-check.mjs';
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

test('kid copy stays in the 5cf647a picture-book voice; only the r4-p5 and breakfast-board fixes differ',()=>{
  // The r4-p5 「？」 cut and the r1-intro breakfast board are the only generated fixes.
  for(const suffix of ['does','metaphor','l1'])assert.match(RAG_JA[`pseudo.r4-p5.${suffix}`],/^「？」を タップ$/);
  assert.equal(RAG_JA['pseudo.r4-p5.l4'],'「1つの しつもんに 2まい いる ときは');
  const intro=RAG_PAGES.find(p=>p.id==='r1-intro');assert.equal(intro.shared.locales.ja.open,'ごはん・さばの みそに・みそしる');
  assert.match(readFileSync(new URL('rag/ja/01-chapter1.md',root),'utf8'),/ごはん・さばの みそに・みそしる/);
  // Kid lines keep the textbook wording, not adult jargon.
  assert.match(ZH['c3-sum.summary'],/像不像/);
  assert.doesNotMatch(ZH['c4-p5.summary'],/约5000/);
  assert.doesNotMatch(JA['c4-p5.summary'],/約5000/);
  for(const [key,value] of Object.entries(RAG_JA))assert.doesNotMatch(value,/パラメータ/,key);
  for(const [key,value] of Object.entries(EMBED_ZH))assert.doesNotMatch(value,/取整|不能反推严格同方向/,key);
  for(const [key,value] of Object.entries(EMBED_JA))assert.doesNotMatch(value,/丸めた|厳密に/,key);
});

test('every narrated kid beat plays a pre-generated mp3; there is no Web Speech fallback list',()=>{
  assert.equal(existsSync(new URL('game/src/audio/speech-fallbacks.json',root)),false);
  const { errors, clips } = checkBeatClips();
  assert.deepEqual(errors,[]);
  assert.equal(clips,(2+49)*2+(2+60)*2+(2+40)*2);
});

test('the site root boots the Phaser animation home with its web fonts; the reader is opt-in',()=>{
  const html=readFileSync(new URL('game/index.html',root),'utf8');
  assert.match(html,/<script type="module" src="\/src\/main\.js"><\/script>/);
  assert.match(html,/fonts\.googleapis\.com\/css2\?family=Fredoka/);
  assert.doesNotMatch(html,/data-reader|learning\/reader/);
  const main=readFileSync(new URL('game/src/main.js',root),'utf8');
  assert.match(main,/get\("reader"\) === "1"/);
});

test('malformed hashes cannot crash startup; fractional indexes become integers',()=>{
  globalThis.sessionStorage={getItem:()=>null};
  globalThis.location={search:'',hash:'#%E0%A4%A'};assert.equal(readEntryTarget(),null);
  location.hash='#Level1/0.5/2';assert.deepEqual(readEntryTarget(),{scene:'Level1',beat:0,phase:2});
  location.hash='#Level1/-3/0.5';assert.deepEqual(readEntryTarget(),{scene:'Level1',beat:0,phase:0});
  delete globalThis.location;delete globalThis.sessionStorage;
});
