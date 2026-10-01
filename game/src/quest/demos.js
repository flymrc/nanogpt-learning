import './demos.css';

// These small toys run only browser-side rules. They never claim to run a model.
// Hotel facts: rag/demo/handbook.txt; old breakfast: handbook_old.txt.
const esc = (value) => String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const tile = (value, cls = '') => `<span class="qd-tile ${cls}">${esc(value)}</span>`;
const button = (key, text, cls = '') => `<button type="button" class="qd-button ${cls}" data-demo-action="${key}">${esc(text)}</button>`;
const row = (values, cls = '') => `<div class="qd-tiles ${cls}">${values.map((v) => tile(v)).join('')}</div>`;
const icon = (value) => `<span class="qd-icon" aria-hidden="true">${value}</span>`;
const badge = (value) => `<span class="qd-badge">${esc(value)}</span>`;

/** Mount a bilingual toy. Success requires an action. Return cleanup for the shell. */
export function mountDemo(root, id, lang = 'zh', onComplete = () => {}) {
  const locale = lang === 'ja' ? 'ja' : 'zh';
  const t = (zh, ja) => (typeof zh === 'object' ? zh[locale] : locale === 'ja' ? ja : zh);
  let disposed = false;
  let completed = false;
  const handler = (event) => {
    const target = event.target.closest('[data-demo-action]');
    if (!target || !root.contains(target) || target.disabled || disposed) return;
    act(target.dataset.demoAction, target);
  };
  let act = () => {};
  root.classList.add('qd-root');
  root.dataset.demo = id;
  root.dataset.demoComplete = 'false';
  root.innerHTML = `<div class="qd-disclosure">${esc(t('动手玩具 · 教学示意', 'さわる教材 · 模式図'))}</div>
    <div class="qd-guide"><img class="qd-robot" src="${import.meta.env.BASE_URL}assets/robot.svg" alt=""/><p class="qd-instruction"></p></div>
    <div class="qd-play"></div><p class="qd-feedback" role="status" aria-live="polite" aria-atomic="true"></p>`;
  const instruction = root.querySelector('.qd-instruction');
  const play = root.querySelector('.qd-play');
  const feedback = root.querySelector('.qd-feedback');
  const say = (text, good = false) => {
    feedback.textContent = text;
    feedback.classList.toggle('is-good', good);
  };
  const goal = (zh, ja) => { instruction.textContent = t(zh, ja); };
  const done = (zh, ja) => {
    const text = t(zh, ja);
    say(text, true);
    if (completed || disposed) return;
    completed = true;
    root.dataset.demoComplete = 'true';
    onComplete({ text, ok: true });
  };
  const card = (key, emoji, title, detail, page, cls = '') => `<button type="button" class="qd-card ${cls}" data-demo-action="${key}">
    ${icon(emoji)}<strong>${esc(title)}</strong><span>${esc(detail)}</span>${badge(t(`第 ${page} 页`, `${page}ページ`))}</button>`;
  root.addEventListener('click', handler);

  if (id === 'nanogpt-1') {
    goal('让答案纸带向后挪一格，找到每个字的“下一个”！', '正解のテープを1文字ずらして、「次の文字」を見つけよう！');
    let shifted = false;
    const draw = () => {
      play.innerHTML = `<div class="qd-label">${esc(t('原文纸带', '元の文章'))}</div>${row(['a', 'b', 'a', 'b', 'a'], 'qd-source')}
        <div class="qd-pair-board"><div><span class="qd-label">${esc(t('看到这里', 'ここまで見る'))}</span>${row(['a', 'b', 'a', 'b'])}</div>
        <div class="qd-pair-arrows" aria-hidden="true">↓　↓　↓　↓</div>
        <div class="${shifted ? 'qd-pop' : ''}"><span class="qd-label">${esc(t('下一个字', '次の文字'))}</span>${row(shifted ? ['b', 'a', 'b', 'a'] : ['?', '?', '?', '?'], shifted ? 'qd-mint' : 'qd-unknown')}</div></div>
        ${button('shift', t(shifted ? '再看一次配对' : '把答案挪一格 →', shifted ? 'ペアをもう一度見る' : '正解を1文字ずらす →'))}`;
    };
    act = () => { shifted = true; draw(); done('配好啦！答案来自原文的下一个字，不是小G猜出来的。', 'できた！ 正解は元の文章の次の文字。ジーくんの予測ではないよ。'); };
    draw();
  } else if (id === 'nanogpt-2') {
    goal('正确答案是 b。选哪一袋，能让这次扣分变少？', '正解は b。どちらの袋なら、今回のペナルティーが小さくなる？');
    let improved = false;
    const draw = () => {
      play.innerHTML = `<div class="qd-target">${badge(t('正确答案', '正解'))}${tile('b', 'qd-tile-pink')}</div>
        <div class="qd-probability"><div class="qd-label">${esc(t('分给真答案 b 的机会', '正解 b に付けるチャンス'))}</div>
        <div class="qd-prob-track"><div class="qd-prob-fill" style="width:${improved ? 80 : 20}%">${improved ? 80 : 20}%</div></div></div>
        <div class="qd-penalty"><span>${esc(t('扣分', 'ペナルティー'))}</span><span class="qd-penalty-bar ${improved ? 'is-small' : ''}"></span><strong>${esc(t(improved ? '变少了' : '比较多', improved ? '小さい' : '大きい'))}</strong></div>
        <div class="qd-actions"><button class="qd-button qd-choice" data-demo-action="less">${icon('🎒')} b：20%</button><button class="qd-button qd-choice" data-demo-action="more">${icon('🎒')} b：80%</button></div>
        <p class="qd-note">${esc(t('机会大小是为了演示，不是真正训练的结果。', '確率は説明用の設定。学習の実測ではないよ。'))}</p>`;
    };
    act = (key) => {
      if (key === 'less') return say(t('这袋给真答案的机会少。试试另一袋！', '正解に付ける確率が小さいね。もう一つの袋は？'));
      improved = true; draw(); done('对！给同一个真答案的机会越大，这次扣分越少。', 'そう！ 同じ正解なら、付ける確率が高いほど今回のペナルティーは小さくなる。');
    };
    draw();
  } else if (id === 'nanogpt-3') {
    goal('小G站在 r 上。拉上窗帘，别让它偷看未来！', 'ジーくんは r にいるよ。カーテンで未来を隠そう！');
    let masked = false;
    const draw = () => {
      play.innerHTML = `<div class="qd-label">${esc(t('任务：猜 r 后面的字', 'ミッション：r の次の文字を予測'))}</div>
        <div class="qd-mask-row">${['F', 'i', 'r', 's', 't'].map((v, i) => `<div class="qd-window ${i === 2 ? 'is-current' : ''} ${masked && i > 2 ? 'is-masked' : ''}"><span class="qd-window-word">${masked && i > 2 ? '🔒' : v}</span><span class="qd-window-label">${esc(t(i < 2 ? '前面' : i === 2 ? '现在' : '未来', i < 2 ? '前' : i === 2 ? '今' : '未来'))}</span></div>`).join('')}</div>
        <div class="qd-attention-lines" aria-hidden="true">${masked ? 'F　＋　i　＋　r　→　🤖' : '👀　→　?　←　👀'}</div>
        ${button('mask', t(masked ? '窗帘关好啦 ✓' : '拉上未来的窗帘', masked ? '未来を隠したよ ✓' : '未来のカーテンを閉める'))}`;
    };
    act = () => { masked = true; draw(); done('F、i、r 可以读，s、t 被挡住。只能看现在和前面！', 'F・i・r は読めるけれど、s・t は隠れる。今と前だけを見よう！'); };
    draw();
  } else if (id === 'nanogpt-4') {
    goal('训练时，要调整小G身体里的数字，还是改写书？', '学習では、ジーくんの中の数字と本の文章、どちらを変える？');
    let updated = false;
    const draw = () => {
      play.innerHTML = `<div class="qd-training"><div class="qd-book">${icon('📖')}<strong>${esc(t('原文', '元の文章'))}</strong><span class="qd-book-text">a b a b a</span><span>${esc(t('一直保留', 'そのまま保存'))}</span></div>
        <div class="qd-machine ${updated ? 'qd-pop' : ''}"><span class="qd-machine-face" aria-hidden="true">● ▿ ●</span><strong>${esc(t('小G的内部数字', 'ジーくんの中の数字'))}</strong>${row(updated ? [5, 6, 3] : [4, 7, 2], 'qd-mint')}<span>${esc(t('参数', 'パラメータ'))}</span></div></div>
        <div class="qd-actions">${button('book', t('改写书上的字', '本の文字を変える'), 'qd-secondary')}${button('train', t('转动内部旋钮 ⚙', '中のつまみを回す ⚙'))}</div>
        <p class="qd-note">${esc(t('数字变化只是示意，不是一次真实训练。', '数字の変化は模式図。実際の学習結果ではないよ。'))}</p>`;
    };
    act = (key) => {
      if (key === 'book') return say(t('原文是出题用的书，保持不变。看看小G里面的旋钮！', '元の文章は問題のもと。そのままだよ。ジーくんの中を見て！'));
      updated = true; draw(); done('调好啦！变的是内部数字，书上的字没有变。', 'できた！ 中の数字を直したけれど、本の文字は変わらないよ。');
    };
    draw();
  } else if (id === 'nanogpt-5') {
    goal('从玩具抽签盒选一个字，再把它接到纸带后面。', 'おもちゃのくじ箱から1文字選んで、テープの後ろにつなげよう。');
    const tickets = ['a', 'a', 'a', 'a', 'a', 'b', 'b', 'b', 'c', 'c'];
    const sampled = [];
    let selected = -1;
    const draw = () => {
      play.innerHTML = `<div class="qd-lottery"><span class="qd-label">${esc(t('教学抽签盒：10张等机会的签', '説明用のくじ箱：同じ確率の10枚'))}</span>
        <div class="qd-tickets">${tickets.map((v, i) => `<span class="qd-ticket ${selected === i ? 'is-picked' : ''}">${v}</span>`).join('')}</div><span>a：50%　b：30%　c：20%</span></div>
        <div class="qd-label">${esc(t('纸带末尾', 'テープの末尾'))}</div><div class="qd-sample-tape">${tile('a', 'qd-fixed')}${sampled.map((v) => tile(v, 'qd-tile-pink qd-pop')).join('')}${!sampled.length ? tile('?', 'qd-unknown') : ''}</div>
        ${button('sample', t(sampled.length ? '再抽一个字 🎲' : '抽一个字 🎲', sampled.length ? 'もう1文字引く 🎲' : '1文字引く 🎲'))}
        <p class="qd-note">${esc(t('这是固定概率的玩具，不是语言模型输出。真实模型每次会重新计算概率。', '固定確率のおもちゃで、言語モデルの出力ではないよ。実際は毎回確率を計算し直すよ。'))}</p>`;
    };
    act = () => {
      selected = Math.floor(Math.random() * tickets.length); sampled.push(tickets[selected]);
      if (sampled.length > 4) sampled.shift();
      draw(); done('接上啦！按概率抽签，不代表每次都选概率最大的 a。', 'つながった！ 確率に従って選ぶので、毎回いちばん多い a とは限らないよ。');
    };
    draw();
  } else if (id === 'rag-1') {
    goal('客人问“早餐几点结束？”点开能回答的手册卡！', 'お客さんの質問は「朝食は何時まで？」。答えのあるカードを選ぼう！');
    let found = false;
    const draw = () => {
      play.innerHTML = `<div class="qd-question">${icon('🥐')}${esc(t('早餐几点结束？', '朝食は何時まで？'))}</div>
        <div class="qd-card-grid">${card('pool', '🏊', t('泳池 · 夏季', 'プール · 夏'), '10:00–18:00', 6)}${card('breakfast', '🥐', t('早餐', '朝食'), '6:30–9:30', 4, found ? 'is-selected' : '')}</div>
        ${found ? `<div class="qd-answer qd-pop">${icon('🔎')}<strong>${esc(t('早餐 9:30 结束', '朝食は9:30まで'))}</strong>${badge(t('依据：第4页', '根拠：4ページ'))}</div>` : ''}
        <p class="qd-note">${esc(t('虚构星光酒店手册 · 手动选卡，不运行模型', '架空のホテル・ホシの案内 · 手動で選択、モデル実行なし'))}</p>`;
    };
    act = (key) => {
      if (key !== 'breakfast') return say(t('这是泳池的时间。再找找早餐卡！', 'これはプールの時間だね。朝食のカードを探して！'));
      found = true; draw(); done('找到了！回答连着第4页，别人也能核对。', '見つかった！ 4ページがあるから、ほかの人も答えを確認できるね。');
    };
    draw();
  } else if (id === 'rag-2') {
    goal('把手册变成小卡片。每张卡都要保留“讲什么”和页码！', '案内書をカードにしよう。「何の話か」とページ番号を残してね！');
    let split = false;
    const draw = () => {
      play.innerHTML = split ? `<div class="qd-card-grid qd-pop"><div class="qd-paper-card">${icon('🥐')}<strong>${esc(t('早餐', '朝食'))}</strong><span>6:30–9:30</span>${badge(t('第4页', '4ページ'))}</div><div class="qd-paper-card">${icon('🏊')}<strong>${esc(t('泳池 · 夏季', 'プール · 夏'))}</strong><span>10:00–18:00</span>${badge(t('第6页', '6ページ'))}</div></div><div class="qd-cut-result">${icon('✂️')}${esc(t('主题 + 时间 + 页码，一起留下！', '話題 + 時間 + ページをセットに！'))}</div>` : `<div class="qd-handbook"><div>${badge(t('第4页', '4ページ'))}${icon('🥐')}<strong>${esc(t('早餐', '朝食'))}</strong><span>6:30–9:30</span></div><div class="qd-cut-line">✂ · · · · · · · · · ·</div><div>${badge(t('第6页', '6ページ'))}${icon('🏊')}<strong>${esc(t('泳池 · 夏季', 'プール · 夏'))}</strong><span>10:00–18:00</span></div></div>
        <div class="qd-actions">${button('times', t('只剪下时间', '時間だけ切り出す'), 'qd-secondary')}${button('pages', t('按页剪成卡 ✂', 'ページで分ける ✂'))}</div>`;
    };
    act = (key) => {
      if (key === 'times') return say(t('只剩时间，就不知道它说的是早餐还是泳池啦。', '時間だけでは、朝食とプールのどちらの話か分からないね。'));
      split = true; draw(); done('卡片做好啦！这里按页分，其他资料要选择适合的切法。', 'カードができた！ この例はページ単位。ほかの資料には合う分け方を選ぼう。');
    };
    draw();
  } else if (id === 'rag-3') {
    goal('客人说“汽车放哪儿？”试试先找同样的词，再找相关意思。', 'お客さんは「車はどこに置く？」。同じ言葉と、近い意味を比べよう。');
    let mode = 'start';
    const draw = () => {
      const shown = mode !== 'start';
      play.innerHTML = `<div class="qd-question">${icon('🚙')}${esc(t('汽车放哪儿？', '車はどこに置く？'))}</div>
        <div class="qd-bridge"><div class="qd-word-cloud">${esc(t('汽车', '車'))}</div><span aria-hidden="true">${mode === 'meaning' ? '↔' : '≠'}</span><div class="qd-word-cloud qd-mint-cloud">${esc(t('停车场', '駐車場'))}</div></div>
        <div class="qd-paper-card ${mode === 'meaning' ? 'is-selected qd-pop' : ''}">${icon('🅿️')}<strong>${esc(t('停车场', '駐車場'))}</strong><span>${esc(t('停车场就在酒店旁边。', '駐車場はホテルの隣にあります。'))}</span>${badge(t('第9页', '9ページ'))}</div>
        <div class="qd-search-result">${esc(shown ? mode === 'word' ? t('这个“完全相同词”玩具没有配上。', 'この「同じ言葉」のおもちゃでは一致しないね。') : t('意思相关，找到候选卡！还要读内容。', '意味が近い候補を発見！ 内容も読もう。') : t('先点左边的放大镜', 'まず左の虫眼鏡を押してね'))}</div>
        <div class="qd-actions">${button('word', t('① 找相同的词 🔎', '① 同じ言葉を探す 🔎'), 'qd-secondary')}${button('meaning', t('② 连相关的意思 🧲', '② 近い意味でつなぐ 🧲'))}</div>
        <p class="qd-note">${esc(t('规则玩具，不是真实检索结果；向量检索也可能找错。', 'ルールで動く教材で、実測の検索結果ではないよ。ベクトル検索も間違えることがある。'))}</p>`;
    };
    act = (key) => {
      if (key === 'word') { mode = 'word'; draw(); say(t('词不同，意思仍可能相关。现在试试磁铁！', '言葉が違っても意味は近いかも。次は磁石！')); return; }
      if (mode === 'start') return say(t('先点①，看看相同词的办法。', 'まず①で、同じ言葉を探す方法を見よう。'));
      mode = 'meaning'; draw(); done('意思相关可以帮助找候选，但排名和相似分数不保证答案正确。', '意味の近さは候補探しに役立つよ。でも順位や類似度は正解の保証ではないね。');
    };
    draw();
  } else if (id === 'rag-4') {
    goal('小G把开始时间读成结束时间了！看着卡片，帮它修好回答。', 'ジーくんが開始と終了を間違えた！ カードを見て答えを直そう。');
    let fixed = false;
    const draw = () => {
      play.innerHTML = `<div class="qd-paper-card">${icon('🥐')}<strong>${esc(t('早餐 · 第4页', '朝食 · 4ページ'))}</strong><div class="qd-time-pair"><span>${esc(t('开始', '開始'))}<b>6:30</b></span><span aria-hidden="true">→</span><span>${esc(t('结束', '終了'))}<b>9:30</b></span></div></div>
        <div class="qd-speech ${fixed ? 'is-fixed qd-pop' : ''}">${icon(fixed ? '🤖' : '🤔')}<strong>${esc(t(fixed ? '早餐 9:30 结束。' : '早餐 6:30 结束？', fixed ? '朝食は9:30まで。' : '朝食は6:30まで？'))}</strong>${badge(t('引用：第4页', '出典：4ページ'))}</div>
        <div class="qd-actions">${button('approve', t('有页码就直接通过', '出典があるので合格'), 'qd-secondary')}${button('fix', t('改成 9:30 ✓', '9:30 に直す ✓'))}</div>`;
    };
    act = (key) => {
      if (key === 'approve') return say(t('有出处也可能读错。卡片上哪一个才是结束时间？', '出典があっても読み違えるよ。終了はどちらの時刻かな？'));
      fixed = true; draw(); done('检查通过！找到资料、引用资料、读对事实，是不同的步骤。', '確認できた！ 資料を探すこと、出典を付けること、正しく読むことは別の段階だよ。');
    };
    draw();
  } else if (id === 'rag-5') {
    goal('第一轮没有找到过线的卡。先安全回答，再更新早餐资料。', 'まず、線を超えるカードが見つからなかったよ。安全に答えてから朝食資料を更新しよう。');
    let stage = 0;
    const draw = () => {
      play.innerHTML = stage === 0 ? `<div class="qd-empty-box">${icon('📭')}<strong>${esc(t('本轮：没有卡片过线', '今回は線を超えるカードなし'))}</strong><span>${esc(t('先别猜一个答案', '答えを推測しないでね'))}</span></div><div class="qd-actions">${button('guess', t('随便猜一个时间', '時刻を推測する'), 'qd-secondary')}${button('ask', t('说明没找到，请问工作人员', '見つからないと伝え、係員へ'))}</div>` : `<div class="qd-safe-answer">${icon('🛟')}<span>${esc(t('我不知道。我没找到分数过线的卡片。请问问酒店的工作人员。', '分かりません。線を超えるカードが見つかりませんでした。ホテルの係員に確認してください。'))}</span></div>
        <div class="qd-label">${esc(t('下一轮：酒店更新了早餐通知', '次のラウンド：ホテルから朝食の更新'))}</div><div class="qd-update-card ${stage === 2 ? 'qd-pop' : ''}">${icon('🥐')}<span>${esc(t('第4页 · 早餐', '4ページ · 朝食'))}</span><strong>${stage === 2 ? '6:30–9:30' : '7:00–10:00'}</strong>${badge(t(stage === 2 ? '新卡 + 新目录 ✓' : '旧卡', stage === 2 ? '新カード + 索引更新 ✓' : '古いカード'))}</div>
        ${button('update', t(stage === 2 ? '资料和找卡目录已更新 ✓' : '换新卡，也更新找卡目录 ↻', stage === 2 ? '資料と索引を更新したよ ✓' : '新カードに替え、索引を更新 ↻'))}
        <p class="qd-note">${esc(t('手册中的旧、新早餐时间；这里只演示更新步骤。', '案内書の旧・新の朝食時刻。ここでは更新手順だけを示すよ。'))}</p>`;
    };
    act = (key) => {
      if (key === 'guess') return say(t('这次依据不够，不能猜。也不能断言手册里一定没有答案。', '今回の根拠では推測しないよ。「資料に答えがない」とも断定できないね。'));
      if (key === 'ask') { stage = 1; draw(); say(t('安全回答完成！再把旧早餐卡换成新卡。', '安全に答えられたね！ 次は朝食の古いカードを更新しよう。')); return; }
      if (stage < 1) return;
      stage = 2; draw(); done('完成！没找到就先说明。资料变了，卡片和找卡目录都要更新。', 'できた！ 根拠が弱いときは限界を伝え、資料が変わったらカードと索引を更新するよ。');
    };
    draw();
  } else if (id === 'embed-1') {
    goal('把词放进教学机器，看看“数字排”怎样帮助比较。', '言葉を教材マシンへ。数字の並びで、どう比べるのかな？');
    let encoded = false;
    const draw = () => {
      const names = [t('早餐', '朝ごはん'), t('早饭', '朝食'), t('泳池', 'プール')];
      const values = [[3, 1, 2], [3, 2, 2], [1, 4, 0]];
      play.innerHTML = `<div class="qd-encoder">${icon('🎛️')}<strong>${esc(t('迷你编码机', 'ミニ符号器'))}</strong>${badge(t('手工设定的3个数', '手で決めた3個の数'))}</div>
        <div class="qd-vector-list">${names.map((name, i) => `<div class="qd-vector-line ${encoded ? 'qd-pop' : ''}"><strong>${esc(name)}</strong><span aria-hidden="true">→</span>${row(encoded ? values[i] : ['?', '?', '?'], i < 2 ? 'qd-mint' : '')}</div>`).join('')}</div>
        ${button('encode', t(encoded ? '再看数字排 ✨' : '变成数字排 ✨', encoded ? '数字をもう一度見る ✨' : '数字の並びにする ✨'))}
        <p class="qd-note">${esc(t('手工示意，不是模型的测量结果。原课程模型每段文本输出384个数。每一格没有预先指定的词义。', '手作りの模式図で、モデルの実測値ではないよ。元の教材のモデルは文章ごとに384個の数を出す。各マスに決まった語義はないよ。'))}</p>`;
    };
    act = () => { encoded = true; draw(); done('词变成了数字排！玩具里前两排比较像；真实相似度要由所选模型计算。', '数字の並びになった！ このおもちゃでは上の2列が似ているね。実際の類似度は選んだモデルで計算するよ。'); };
    draw();
  } else if (id === 'embed-2') {
    goal('先数数字有几格，再展开箭头看看长度。', 'まず数字のマスを数えよう。それから矢印の長さを見よう。');
    let counted = false;
    let unfolded = false;
    const draw = () => {
      play.innerHTML = `<div class="qd-label">${esc(t('数学小玩具', '数学のおもちゃ'))}</div>${row([3, 4], 'qd-big-tiles qd-mint')}
        ${!counted ? `<strong class="qd-center">${esc(t('这里有几个数？', '数は何個ある？'))}</strong><div class="qd-actions">${button('two', t('2个数', '2個'), '')}${button('seven', t('7个数', '7個'), 'qd-secondary')}</div>` : `<div class="qd-count-result">${badge(t('2个数 = 2维', '2個の数 = 2次元'))}</div>
        <div class="qd-vector-drawing ${unfolded ? 'is-unfolded' : ''}"><svg viewBox="0 0 260 170" role="img" aria-label="${esc(t('横向3格，纵向4格，斜箭头长5', '横3、縦4、斜めの矢印は長さ5'))}"><path d="M50 140 H140 V20" fill="none" stroke="#abc8ce" stroke-width="3" stroke-dasharray="7 5"/><path d="M50 140 L140 20" fill="none" stroke="#6655bd" stroke-width="8" stroke-linecap="round"/><path d="M122 26 L140 20 L139 40" fill="none" stroke="#6655bd" stroke-width="8" stroke-linecap="round"/><text x="88" y="165">3</text><text x="155" y="85">4</text><text x="65" y="70" class="qd-vector-five">${unfolded ? '5' : '?'}</text></svg></div>${button('unfold', t(unfolded ? '长度是5，维度是2 ✓' : '展开箭头，看看长度 ↗', unfolded ? '長さは5、次元は2 ✓' : '矢印を広げて長さを見る ↗'))}`}`;
    };
    act = (key) => {
      if (key === 'seven') return say(t('数格子，不是把数字加起来哦。这里是 [3] 和 [4] 两格。', '数字を足さずにマスを数えよう。[3] と [4] の2マスだよ。'));
      if (key === 'two') { counted = true; draw(); say(t('对，2个数就是2维。再看看箭头！', 'そう、2個だから2次元。次は矢印を見よう！')); return; }
      if (!counted) return;
      unfolded = true; draw(); done('2是数字的个数，5是这根箭头的长度。维度和长度不一样！', '2は数字の個数、5は矢印の長さ。次元と長さは違うものだね！');
    };
    draw();
  } else if (id === 'embed-3') {
    goal('两支箭头长短不同。转一转，让它们朝同一个方向！', '長さの違う2本の矢印。同じ向きになるように回そう！');
    let aligned = false;
    const draw = () => {
      play.innerHTML = `<div class="qd-compass" role="img" aria-label="${esc(t(aligned ? '长短两支箭头都朝右上' : '两支箭头方向不同', aligned ? '長さの違う2本が右上を向く' : '2本の矢印は違う向き'))}"><div class="qd-compass-ring"></div><div class="qd-arrow qd-arrow-long"></div><div class="qd-arrow qd-arrow-short ${aligned ? 'is-aligned' : ''}"></div><span class="qd-origin"></span><span class="qd-compass-tag">${esc(t(aligned ? '同方向！' : '转一转 →', aligned ? '同じ向き！' : '回そう →'))}</span></div>
        <div class="qd-legend"><span><i class="qd-key purple"></i>${esc(t('长箭头', '長い矢印'))}</span><span><i class="qd-key coral"></i>${esc(t('短箭头', '短い矢印'))}</span></div>
        ${button('align', t(aligned ? '方向对齐啦 ✓' : '转到同方向 ↗', aligned ? '向きがそろった ✓' : '同じ向きに回す ↗'))}
        <p class="qd-note">${esc(t('数学示意：余弦比较方向，不比较箭头长短。', '数学の模式図：コサインは長さではなく向きを比べるよ。'))}</p>`;
    };
    act = () => { aligned = true; draw(); done('方向一样了，长短可以不同！实际工具显示的“100分”可能取过整，不能只凭它说完全一样。', 'そろった！ 長さは違ってもいいよ。道具が見せる「100点」は丸めた数かも。同じ向きとは言い切れないね。'); };
    draw();
  } else if (id === 'embed-4') {
    goal('地图上两颗星重在一起。掀开地图，看看藏起来的数字！', '地図では2つの星が重なっているよ。地図をめくって隠れた数字を見よう！');
    let revealed = false;
    const draw = () => {
      play.innerHTML = `<div class="qd-map ${revealed ? 'is-revealed' : ''}"><span class="qd-map-label">${esc(t('只画前两格的地图', '最初の2個だけを描く地図'))}</span><span class="qd-map-star" aria-hidden="true">★</span><span class="qd-map-caption">A + B</span></div>
        <div class="qd-projection-rows"><div><strong>A</strong>${row(revealed ? [1, 2, 0] : [1, 2, '?'], revealed ? 'qd-reveal-last' : '')}</div><div><strong>B</strong>${row(revealed ? [1, 2, 9] : [1, 2, '?'], revealed ? 'qd-reveal-last' : '')}</div></div>
        ${button('reveal', t(revealed ? '第三格不一样！ ✓' : '掀开隐藏的一格 👀', revealed ? '3個目が違う！ ✓' : '隠れた数字をめくる 👀'))}
        <p class="qd-note">${esc(t('这张小地图故意藏掉第三个数。它不是原实验的地图。', 'この小さな地図は3個目を隠したもの。元の実験の地図ではないよ。'))}</p>`;
    };
    act = () => { revealed = true; draw(); done('地图上一样，原来的数字却不同。地图会漏掉东西，还要回去看全部数字。', '地図では同じでも、元の数字は違ったね。地図には出ないものもあるので、全部の数字を見よう。'); };
    draw();
  } else if (id === 'embed-5') {
    goal('两张卡都在讲酒店。客人问退房时间，该用哪张？', 'どちらもホテルの話。チェックアウト時刻を答えるには、どちらを使う？');
    let found = false;
    const draw = () => {
      play.innerHTML = `<div class="qd-question">${icon('🧳')}${esc(t('我几点要退房？', '何時にチェックアウト？'))}</div><div class="qd-topic-rope">${esc(t('同一话题：酒店住宿', '同じ話題：ホテルの宿泊'))}</div>
        <div class="qd-card-grid">${card('in', '🔑', t('入住', 'チェックイン'), t('15:00 开始', '15:00から'), 2)}${card('out', '🧳', t('退房', 'チェックアウト'), t('11:00 退房', '11:00まで'), 3, found ? 'is-selected' : '')}</div>
        ${found ? `<div class="qd-answer qd-pop"><strong>${esc(t('请在11:00退房。', 'チェックアウトは11:00です。'))}</strong>${badge(t('依据：第3页', '根拠：3ページ'))}</div>` : ''}
        <p class="qd-note">${esc(t('虚构星光酒店手册。此处没有计算相似分数。', '架空のホテル・ホシの案内。ここでは類似度を計算していないよ。'))}</p>`;
    };
    act = (key) => {
      if (key !== 'out') return say(t('入住和退房都讲酒店，但这是两件不同的事。看看另一张！', 'チェックインもホテルの話だけど、別の事実だね。もう一枚を見よう！'));
      found = true; draw(); done('答对啦！话题相关，不等于事实相同。相近的卡也要逐条核对。', '正解！ 話題が近くても同じ事実とは限らない。近いカードも内容を確かめよう。');
    };
    draw();
  } else {
    goal('这个玩具还没有准备好。', 'このおもちゃは準備中です。');
  }

  return () => { disposed = true; root.removeEventListener('click', handler); };
}
