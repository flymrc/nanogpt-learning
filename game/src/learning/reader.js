import './reader.css';
import { COURSES, CHAPTERS } from './curriculum.js';
import { element as el, mountExperiment } from './experiments.js';

const root = el('div', null, { id:'learning-root' });
document.body.append(root);
let lang;
try { lang=localStorage.getItem('nanogpt-lang')==='ja'?'ja':'zh'; } catch { lang='zh'; }
const L=(zh,ja)=>lang==='ja'?ja:zh;
const txt=value=>value[lang];
const sourceBase='https://github.com/flymrc/nanogpt-learning/blob/main/';
const passed=new Set();
const routeFor=(course,index)=>`#learn/${course}/${index+1}`;
// Opt-in text reader (`?reader=1`). The kid animation home stays the site root
// and never links here. Animation links leave the reader for the kid deep link.
const animationHref=target=>`${location.pathname}#${target}/0/0`;

function link(text,href) { return el('a',text,{href}); }
function focusTitle() { root.querySelector('h1')?.focus({preventScroll:true}); }
function chapterSource(chapter) { return lang==='ja'?chapter.sourceJa:chapter.source; }
function heading(section,n,title) { const h=el('h2');h.append(el('span',String(n),{class:'step-no','aria-hidden':'true'}),document.createTextNode(title));section.append(h); }
function render() {
  document.documentElement.dataset.reader='true'; root.hidden=false;
  document.documentElement.lang=lang==='ja'?'ja':'zh-CN';
  root.replaceChildren();
  root.append(link(L('跳到正文','本文へ移動'),'#reader-main'));
  root.firstChild.className='skip-link';
  root.firstChild.addEventListener('click',e=>{e.preventDefault();document.getElementById('reader-main')?.focus();});
  const header=el('header');header.append(link(L('小G学习室 · 三门课','ジーくんの学習室 · 3コース'),'#learn'));
  const language=el('button',lang==='zh'?'日本語':'中文',{type:'button',id:'reader-language'});
  language.addEventListener('click',()=>{lang=lang==='zh'?'ja':'zh';try{localStorage.setItem('nanogpt-lang',lang);}catch{}render();document.getElementById('reader-language').focus();});
  header.append(language);root.append(header);
  const match=location.hash.match(/^#learn\/(nanogpt|rag|embed)\/([1-5])$/);
  if(!match) { home();return; }
  const [,courseId,n]=match,index=Number(n)-1,chapter=CHAPTERS[courseId][index],course=COURSES.find(c=>c.id===courseId);
  document.title=`${txt(chapter.title)} · ${course.name} · ${L('小G学习室','ジーくんの学習室')}`;
  const layout=el('div',null,{class:'reader-layout'}),nav=el('nav',null,{'aria-label':L('章节目录','章の目次')});
  nav.append(el('h2',course.name));const ol=el('ol');
  CHAPTERS[courseId].forEach((c,i)=>{const li=el('li'),a=link(txt(c.title),routeFor(courseId,i));if(i===index)a.setAttribute('aria-current','page');li.append(a);ol.append(li);});nav.append(ol);layout.append(nav);
  const article=el('article',null,{id:'reader-main',tabindex:'-1'});
  article.append(el('p',`${course.name} · ${index+1} / 5`,{class:'eyebrow'}),el('h1',txt(chapter.title),{tabindex:'-1'}));
  const s1=el('section');heading(s1,1,L('问题','問い'));s1.append(el('p',txt(chapter.question),{class:'lead'}));article.append(s1);
  const s2=el('section');heading(s2,2,L('输入与输出','入力と出力'));s2.append(el('p',txt(chapter.io)),el('pre',chapter.example));article.append(s2);
  const s3=el('section');heading(s3,3,L('动手例子','試してみる'));article.append(s3);
  const s4=el('section');heading(s4,4,L('观察结果','結果を確かめる'));
  const result=el('div',L('先在上面尝试一次，结果会显示在这里。','上の例を試すと、ここに結果が出ます。'),{class:'result',role:'status','aria-live':'polite',id:'experiment-result'});s4.append(result);article.append(s4);
  mountExperiment(s3,chapter.experiment,lang,value=>{result.textContent=value.text;result.dataset.ok=String(value.ok);});
  const s5=el('section');heading(s5,5,L('原理','仕組み'));s5.append(el('p',txt(chapter.principle)));article.append(s5);
  const quiz=el('form',null,{class:'quiz','aria-label':L('换个例子检查','別の例で確認')});
  quiz.append(el('h2',L('换个例子检查','別の例で確認')));
  const fs=el('fieldset');fs.append(el('legend',txt(chapter.quiz.question)));
  chapter.quiz.options.forEach((opt,i)=>{const label=el('label');label.append(el('input',null,{type:'radio',name:'answer',value:String(i)}),document.createTextNode(txt(opt.text)));fs.append(label);});
  quiz.append(fs,el('button',L('提交答案','答えを送信'),{type:'submit'}));
  const feedback=el('p',passed.has(`${lang}:${chapter.id}`)?L('本次会话检查通过；可再次练习。','このセッションで確認済みです。再挑戦できます。'):L('浏览不计为通过。请选择答案，再看具体反馈。','閲覧だけでは確認済みにしません。答えを選び、説明を確かめます。'),{class:'result',role:'status','aria-live':'polite'});
  quiz.append(feedback);
  quiz.addEventListener('submit',event=>{event.preventDefault();const selected=new FormData(quiz).get('answer');if(selected===null){feedback.textContent=L('请先选择一个答案。','答えを選んでください。');feedback.dataset.ok='false';return;}const i=Number(selected),ok=i===chapter.quiz.answer;feedback.dataset.ok=String(ok);feedback.textContent=(ok?L('检查通过。','確認できました。'):L('再想一想。','もう一度考えましょう。'))+txt(chapter.quiz.options[i].feedback);if(ok)passed.add(`${lang}:${chapter.id}`);});
  article.append(quiz);
  const details=el('details');details.append(el('summary',L('技术进阶与证据','技術的な補足と根拠')),el('p',txt(chapter.advanced)));
  details.append(el('p',`${L('本章覆盖','この章の項目')}: ${chapter.concepts.join(' · ')}`),link(L('阅读原始资料与实验说明','元の資料・実験説明を読む'),sourceBase+chapterSource(chapter)));
  if(courseId!=='nanogpt') {details.append(el('p'),link(L('查看保存的实验数据','保存済み実験データ'),sourceBase+(courseId==='rag'?`rag/demo/results${lang==='zh'?'_zh':''}.json`:'embed/demo/results.json')));}
  const original=el('details');original.append(el('summary',L('原图画讲解 · 全部页面文字','元の絵解き · 全ページの文章')));let loaded=false;
  original.addEventListener('toggle',async()=>{if(!original.open||loaded)return;loaded=true;const loading=el('p',L('正在读取原文…','本文を読み込み中…'));original.append(loading);try{const data=await import('./original.js');loading.remove();data.appendOriginal(original,courseId,index+1,lang);}catch{loading.textContent=L('读取失败。可关闭后重试，或打开上方原始资料。','読み込めません。閉じて再試行するか、上の元資料を開いてください。');loaded=false;}});
  details.append(original);article.append(details);
  const footer=el('div',null,{class:'chapter-footer'});
  const animation=link(L('打开本章图画动画','この章の絵・アニメーションを開く'),animationHref(chapter.animation));footer.append(animation);
  if(index<4)footer.append(link(L('下一章 →','次の章 →'),routeFor(courseId,index+1)));else footer.append(link(L('返回课程首页','コース一覧へ'),'#learn'));
  article.append(footer);layout.append(article);root.append(layout);
}
function home() {
  document.title=L('小G学习室 · 从例子理解 AI','ジーくんの学習室 · 例から AI を理解する');
  const main=el('main',null,{id:'reader-main',tabindex:'-1'});
  main.append(el('p',L('观察 · 尝试 · 检查','観察 · 試す · 確かめる'),{class:'eyebrow'}),el('h1',L('先做一个例子，再理解原理。','一つ試して、仕組みをつかむ。'),{tabindex:'-1'}),el('p',L('从熟悉的文本和问题开始。每章说明输入输出，提供可操作例子，再用一道新题检查理解。原来的图画、动画和实验资料都在。','身近な文章と問いから始めます。各章で入力・出力を確認し、例を試してから別の問題で確かめます。元の絵・アニメーション・実験資料も読めます。'),{class:'lead'}));
  const cards=el('div',null,{class:'course-grid'});
  COURSES.forEach((course,i)=>{const card=el('section',null,{class:'course-card'});card.append(el('span',`0${i+1} / ${L('五章','全5章')}`,{class:'course-num'}),el('h2',course.name),el('p',txt(course.intro)),link(txt(CHAPTERS[course.id][0].title),routeFor(course.id,0)));cards.append(card);});
  main.append(cards,el('p',L('说明：不运行模型训练，不调用付费 API。练习会明确标出手动操作、实时小计算或保存的实验。检查通过仅代表本次题目答对。','モデルの訓練や有料 API は使いません。手動操作・その場の小計算・保存済み実験を区別します。確認済みは今回の問題に正解したことだけを表します。')));root.append(main);
}
window.addEventListener('hashchange',()=>{render();focusTitle();window.scrollTo(0,0);});
render();
