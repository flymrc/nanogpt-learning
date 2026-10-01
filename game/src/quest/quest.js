import './quest.css';
import ZH from './copy.zh.json';
import JA from './copy.ja.json';
import { mountDemo } from './demos.js';
import { getLang, setLang } from '../i18n/locale.js';
import { applyMute, readMuted, playSfx, unlockAudio, cancelSpeech } from '../audio/sound.js';
import { emitTutor } from '../tutor/bus.js';

const STORE = 'nanogpt-quest-stars-v1';
const COURSES = {
  nanogpt: { zh:'写字森林', ja:'ことばの森', name:'nanoGPT', icon:'🌱', color:'#d9edba', prefix:'Level' },
  rag: { zh:'星星旅馆', ja:'ほしのホテル', name:'RAG', icon:'🏡', color:'#ffe1ba', prefix:'Rag' },
  embed: { zh:'词语星球', ja:'ことばの星', name:'Embedding', icon:'🪐', color:'#d9d7ff', prefix:'Embed' },
};
function el(tag, text, attrs={}) { const n=document.createElement(tag);if(text!=null)n.textContent=text;for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);return n; }
function button(text,fn,cls='') { const b=el('button',text,{type:'button',class:cls});b.addEventListener('click',fn);return b; }
function readStars(){try{return new Set(JSON.parse(localStorage.getItem(STORE)||'[]'));}catch{return new Set();}}
function saveStars(stars){try{localStorage.setItem(STORE,JSON.stringify([...stars]));}catch{}}
function list(pack){return Array.isArray(pack)?pack:(pack.quests||pack.chapters||Object.values(pack));}

export function mountQuest(scene,courseId,index=0) {
  let lang=getLang(),current=index,phase='play',cleanDemo=null,didAction=false,passed=false,disposed=false;
  const stars=readStars(),L=(zh,ja)=>lang==='ja'?ja:zh;
  const root=el('main',null,{id:'quest-root','aria-label':L('小G的AI冒险','ジーくんのAIぼうけん')});
  document.getElementById('pc-stage').append(root);
  document.documentElement.dataset.quest='true';
  document.documentElement.dataset.scene='quest';
  scene.questCourse=courseId;scene.questIndex=current;
  cancelSpeech();
  scene.game.registry.set("pendingNarration",null);
  scene.game.registry.set("pendingVoice",null);
  scene.game.registry.get("voice")?.stop();
  const go=(i,replace=false)=>{
    current=Math.max(0,Math.min(4,i));phase='play';didAction=false;passed=false;
    scene.questIndex=current;
    const hash=`#quest/${courseId}/${current+1}`;
    if(location.hash!==hash)history[replace?'replaceState':'pushState']({quest:true},'',`${location.pathname}${hash}`);
    render();
  };
  const goHome=()=>{history.pushState({},'',location.pathname);scene.scene.start('Home');};
  const onPop=()=>{
    const m=location.hash.match(/^#quest\/(nanogpt|rag|embed)\/([1-5])$/);
    if(m&&m[1]===courseId)go(Number(m[2])-1,true);
    else if(m)scene.scene.restart({course:m[1],index:Number(m[2])-1});
    else if(!location.hash)scene.scene.start('Home');
  };
  window.addEventListener('popstate',onPop);
  scene.retreat=()=>current>0?go(current-1):goHome();
  function render(){
    cleanDemo?.();cleanDemo=null;root.replaceChildren();root.scrollTop=0;
    const course=COURSES[courseId],id=`${courseId}-${current+1}`,q=list(lang==='ja'?JA:ZH).find(q=>q.id===id);
    if(!q)throw new Error(`Missing quest copy: ${id}:${lang}`);
    root.style.setProperty('--quest-accent',course.color);
    root.dataset.questId=id;root.dataset.phase=phase;
    document.title=`${q.title} · ${L('小G的AI冒险岛','ジーくんのAIぼうけん島')}`;
    emitTutor({id:`quest-${id}`,purpose:q.guide,caption:q.title});
    const top=el('header',null,{class:'quest-top'});
    const brand=button('✦ '+L('AI冒险岛','AIぼうけん島'),goHome,'quest-brand');
    const controls=el('div',null,{class:'quest-controls'});
    controls.append(button(L('选岛','島えらび'),goHome),button(lang==='zh'?'日本語':'中文',()=>setLang(lang==='zh'?'ja':'zh')));
    const sound=button(readMuted()?L('声音关','音なし'):L('声音开','音あり'),()=>{applyMute(scene.game,!readMuted());unlockAudio(scene);sound.textContent=readMuted()?L('声音关','音なし'):L('声音开','音あり');});
    sound.setAttribute('aria-pressed',String(!readMuted()));controls.append(sound);top.append(brand,controls);root.append(top);
    const trail=el('nav',null,{class:'quest-trail','aria-label':L('五个关卡','5つのステージ')});
    for(let i=0;i<5;i++){
      const item=list(lang==='ja'?JA:ZH).find(v=>v.id===`${courseId}-${i+1}`);
      const b=button(`${stars.has(item.id)?'★':String(i+1)} ${item.title}`,()=>go(i),'quest-stop');
      b.setAttribute('aria-current',i===current?'step':'false');b.dataset.chapter=String(i+1);trail.append(b);
    }
    root.append(trail);
    const board=el('section',null,{class:'quest-board'});
    const heading=el('header',null,{class:'quest-heading'});
    const tit=el('div');tit.append(el('p',`${course.icon} ${course[lang]} · ${course.name} · ${current+1}/5`,{class:'quest-eyebrow'}),el('h1',q.title,{tabindex:'-1'}));
    const score=el('span',`${[...stars].filter(s=>s.startsWith(courseId+'-')).length}/5 ★`,{class:'quest-score','aria-label':L('收集的星星','あつめた星')});heading.append(tit,score);board.append(heading);
    const dialogue=el('div',null,{class:'quest-dialogue'});
    const portrait=el('div',null,{class:'quest-portrait'});const img=el('img',null,{src:'assets/hiyori-guide.png',alt:L('助教ひより','ひより先生'),loading:'eager'});portrait.append(img);
    const bubble=el('div');bubble.append(el('strong',L('ひより · 一起试试看','ひより · いっしょにやろう')),el('p',phase==='win'?q.remember:q.guide));dialogue.append(portrait,bubble);board.append(dialogue);
    if(phase==='play'){
      const mission=el('p',q.goal,{class:'quest-mission'});board.append(mission);
      const arena=el('div',null,{class:'quest-arena'});board.append(arena);
      const result=el('div',null,{class:'quest-observation',role:'status','aria-live':'polite'});
      result.hidden=true;board.append(result);
      const actions=el('div',null,{class:'quest-actions'});
      const next=button(L('我会了，试一题','できた！もんだいへ'),()=>{phase='quiz';playSfx(scene);render();},'quest-primary');next.disabled=true;
      const hint=el('p',q.actionHint,{class:'quest-hint'});actions.append(hint,next);board.append(actions);
      cleanDemo=mountDemo(arena,id,lang,()=>{
        if(disposed||root.dataset.questId!==id)return;
        didAction=true;result.hidden=false;result.replaceChildren(el('strong',L('看，变了！','かわったね！')),el('p',q.teaching));next.disabled=false;hint.textContent=L('做到了！再用一题确认。','できたね！1もん たしかめよう。');playSfx(scene,'sfx-pop',0.25);
      });
    }else if(phase==='quiz'){
      const quiz=el('section',null,{class:'quest-quiz','aria-label':L('过关小挑战','ゴールのもんだい')});
      const robot=el('img',null,{src:'assets/robot.svg',alt:L('小G','ジーくん'),class:'quest-robot'});quiz.append(robot,el('p',L('小G想问你','ジーくんから しつもん'),{class:'quest-eyebrow'}),el('h2',q.question));
      const choices=el('div',null,{class:'quest-choices'}),feedback=el('p',L('选一个吧。答错也可以再试！','えらんでね。まちがえても だいじょうぶ！'),{class:'quest-feedback',role:'status','aria-live':'polite'});
      const next=button(L('领取星星','星をうけとる'),()=>{if(!passed||!didAction)return;stars.add(id);saveStars(stars);phase='win';playSfx(scene,'sfx-pop');render();},'quest-primary');next.disabled=true;
      q.choices.forEach((opt,i)=>{
        const b=button(opt.text,()=>{
          const ok=i===q.answer;passed=ok;feedback.textContent=(ok?L('答对啦！','せいかい！'):L('再想一想：','もういちど：'))+opt.feedback;
          feedback.dataset.ok=String(ok);next.disabled=!ok;choices.querySelectorAll('button').forEach(v=>v.removeAttribute('data-result'));b.dataset.result=ok?'correct':'retry';
        });b.dataset.answer=String(i);choices.append(b);
      });quiz.append(choices,feedback,next,button(L('回去再玩一下','もういちど やってみる'),()=>{phase='play';didAction=false;render();},'quest-secondary'));board.append(quiz);
    }else{
      const win=el('section',null,{class:'quest-win',role:'status'});
      win.append(el('div','★',{class:'quest-big-star','aria-hidden':'true'}),el('h2',L('这颗星星属于你！','星を ゲット！')),el('p',q.remember,{class:'quest-memory'}));
      if(current<4)win.append(button(L('去下一关','つぎのステージへ'),()=>go(current+1),'quest-primary'));
      else win.append(button(L('五关完成！去选另一个岛','5つクリア！べつの島へ'),goHome,'quest-primary'));
      win.append(button(L('再玩一次','もういちど'),()=>go(current),'quest-secondary'));board.append(win);
    }
    const extras=el('details',null,{class:'quest-extras'});extras.append(el('summary',L('还想多看一点？','もっと見たい？')));
    const animation=el('a',L('看完整图画动画 · 原配音','くわしい絵とアニメ · もとの音声'),{href:`?animation=1#${course.prefix}${current+1}/0/0`});
    const reading=el('a',L('进阶阅读与资料','くわしい文章と資料'),{href:`?reader=1#learn/${courseId}/${current+1}`});
    extras.append(animation,reading,el('p',L('新关卡先用文字带路。原来的录音都留在完整动画里。','新しいステージは文字で案内するよ。もとの音声は、くわしいアニメで聞けるよ。')));board.append(extras);
    root.append(board);
    const foot=el('footer',L('先猜一猜 · 动手试试 · 答一题，拿星星','予想する · やってみる · 1もん といて星をゲット'),{class:'quest-bottom'});foot.append(el("br"),el("a","Hiyori © Live2D Inc.",{href:"https://www.live2d.com/en/learn/sample/model-terms/",target:"_blank",rel:"noopener noreferrer"}));root.append(foot);
    root.querySelector('h1')?.focus({preventScroll:true});
  }
  go(index,true);
  return ()=>{disposed=true;cleanDemo?.();window.removeEventListener('popstate',onPop);root.remove();delete document.documentElement.dataset.quest;cancelSpeech();};
}
