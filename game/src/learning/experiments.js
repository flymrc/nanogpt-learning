import embedding from '../../../embed/demo/results.json';
import ragZh from '../../../rag/demo/results_zh.json';
import ragEn from '../../../rag/demo/results.json';

export const evidence = { embedding, ragZh, ragEn };
export function element(tag, text, attrs = {}) {
  const el = document.createElement(tag);
  if (text != null) el.textContent = text;
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
  return el;
}

/** Real local calculations and explicit saved evidence; never fake a model request. */
export function mountExperiment(root, kind, lang, onResult) {
  const L = (zh, ja) => lang === 'ja' ? ja : zh;
  const form = element('form', null, { 'aria-label': L('动手例子', '試す例') });
  const fields = {};
  const input = (id, label, value, attrs = {}) => {
    const wrap = element('label', label);
    const field = element('input', null, { id: `ex-${id}`, name: id, value, ...attrs });
    fields[id] = field; wrap.append(field); form.append(wrap); return field;
  };
  const select = (id, label, choices) => {
    const wrap = element('label', label);
    const field = element('select', null, { id: `ex-${id}`, name: id });
    for (const [value, text] of choices) field.append(element('option', text, { value }));
    fields[id] = field; wrap.append(field); form.append(wrap); return field;
  };
  const note = text => form.append(element('p', text, { class: 'experiment-note' }));
  let mode = L('浏览器实时计算 · 教学小例子', 'ブラウザーで計算 · 教材用の小さな例');
  let run;
  if (kind === 'shift') {
    input('y', 'y', '', { autocomplete: 'off', placeholder: '? ? ? ?', maxlength: '16' });
    run = () => {
      const expected = 'ababa'.slice(1), answer = fields.y.value.replace(/\s/g, '');
      return answer === expected
        ? { ok: true, text: `y = ${[...expected].join(' ')}\na → b\nab → a\naba → b\nabab → a` }
        : { ok: false, text: L('还差一步：从原文第二个字符开始，按原顺序取四个字符。不要把 x 原样复制。', 'もう一歩：元の文章の2文字目から順番に4文字を取ります。x をそのまま写しません。') };
    };
  } else if (kind === 'evidence') {
    mode = L('手动选资料 + 固定模板 · 虚构酒店', '手動の資料選択 + 固定テンプレート · 架空のホテル');
    select('page', L('依据页', '根拠のページ'), [['','—'],['4','Page 4 · Breakfast 6:30–9:30'],['6','Page 6 · Pool 10:00–18:00 (summer)']]);
    select('time', L('结束时刻', '終了時刻'), [['','—'],['6:30','6:30'],['9:30','9:30'],['18:00','18:00']]);
    run = () => fields.page.value !== '4'
      ? { ok:false, text:L('还差一步：问题问早餐，需要选择早餐所在的第4页。', 'もう一歩：朝食の質問なので、朝食の4ページを選びます。') }
      : fields.time.value !== '9:30'
        ? { ok:false, text:L('还差一步：6:30是开始，9:30才是结束。已找到资料，还需要读对。', 'もう一歩：6:30は開始、9:30が終了です。資料を見つけた後も正しく読みます。') }
        : { ok:true, text:L('早餐9:30结束。依据：第4页。\n这是固定模板回答，没有调用生成模型。', '朝食は9:30に終了します。根拠：4ページ。\n固定テンプレートの回答で、生成モデルは呼んでいません。') };
  } else if (kind === 'pairs') {
    mode = L('保存的实验 · 点击后读取 JSON，不运行模型', '保存済み実験 · JSON を読み、モデルは実行しません');
    const a = lang === 'ja' ? '朝ごはん' : '早饭';
    const choices = lang === 'ja' ? ['breakfast', 'dog'] : ['早餐', '停车'];
    select('pair', `${a} → ${L('你认为哪个更近？','どちらが近いと思いますか？')}`, [['','—'], ...choices.map(x => [x,x])]);
    run = () => {
      if (!fields.pair.value) return { ok:false, text:L('请先做出预测，再查看保存的结果。','先に予測を選び、保存結果を確かめましょう。') };
      const rows = choices.map(b => Object.values(embedding.pairs).flat().find(p => p.a === a && p.b === b));
      const ok=fields.pair.value === choices[0];
      return { ok, text:(ok?L('预测与保存结果一致。','予測と保存結果が一致しました。'):L('这次预测不一致：第一个候选的保存分数更高。','今回は予測と異なり、最初の候補の保存得点が高くなっています。'))+'\n'+rows.map(p => `${p.a} / ${p.b}: ${p.points}`).join('\n') + '\n' + L('这是相似度，不是正确率。', 'これは類似度で、正解率ではありません。') };
    };
  } else if (kind === 'loss') {
    input('p', L('正确字符的概率 p','正解文字の確率 p'), '0.2', { type:'number', min:'0.001', max:'1', step:'0.001', required:'' });
    run = () => ({ ok:true, text:`−ln(${fields.p.value}) = ${(-Math.log(Number(fields.p.value))).toFixed(4)}` });
  } else if (kind === 'mask') {
    select('position', L('当前位置','現在位置'), [...'First'].map((x,i)=>[String(i),`${i}: ${x}`]));
    run = () => ({ ok:true, text:L('可读位置：','読める位置：') + [...'First'].filter((_,i)=>i<=Number(fields.position.value)).join(' · ') + '\n' + L('后面的字被因果遮罩挡住。','後の文字は因果マスクで隠します。') });
  } else if (kind === 'update') {
    input('rate', L('学习率','学習率'), '0.1', { type:'number', min:'0.001', max:'1', step:'0.001', required:'' });
    run=()=>({ok:true,text:`wNext = 2 − ${fields.rate.value} × 0.5 = ${(2-Number(fields.rate.value)*0.5).toFixed(4)}\n`+L('单参数 SGD 示例；不是上游 AdamW 的完整实现。','1パラメータの SGD 例で、上流 AdamW の全実装ではありません。')});
  } else if(kind==='temperature') {
    input('temperature','temperature','1',{type:'number',min:'0.1',max:'3',step:'0.1',required:''});
    run=()=>{const weights=[2,1,0].map(n=>Math.exp(n/Number(fields.temperature.value))),sum=weights.reduce((a,b)=>a+b,0);return {ok:true,text:weights.map((w,i)=>`${'abc'[i]}: ${(100*w/sum).toFixed(1)}%`).join('\n')};};
  } else if(kind==='chunk') {
    mode=L('手动选择 · 比较保留和丢失的上下文','手動選択 · 保持する文脈と失う文脈を比較');
    select('method',L('切分方式','分割方法'),[['page',L('按页保留标题','ページごと・見出しを保持')],['time',L('只留下时刻','時刻だけを残す')]]);
    run=()=>({ok:fields.method.value==='page',text:fields.method.value==='page' ? 'Page 4 · Breakfast · 6:30–9:30\nPage 6 · Pool · 10:00–18:00 (summer)' : L('6:30–9:30 / 10:00–18:00\n这些是谁的时间？主题、季节和出处丢失了。','6:30–9:30 / 10:00–18:00\n何の時刻でしょうか？主題・季節・出典を失いました。')});
  } else if(kind==='retrieval') {
    mode=L('保存的实验 · 按原 JSON 展示两种检索器','保存済み実験 · JSON の検索結果を表示');
    select('method',L('检索器','検索器'),[['word_match','TF-IDF'],['meaning','MiniLM']]);
    run=()=>{const data=lang==='ja'?ragEn:ragZh,q=data[fields.method.value].questions.find(x=>x.id==='q4_parking');return {ok:true,text:q.question+'\n'+q.top3.map(x=>`Page ${x.page} · ${x.title}: ${x.score_x100}`).join('\n')};};
  } else if(kind==='context') {
    mode=L('手动排列 + 固定模板','手動の並べ替え + 固定テンプレート');
    select('first',L('模板读取的第一张卡','テンプレートが読む1枚目'),[['6','Page 6 · Pool'],['4','Page 4 · Breakfast']]);
    run=()=>({ok:fields.first.value==='4',text:fields.first.value==='4'?L('据第4页：早餐6:30–9:30。','4ページより：朝食6:30–9:30。'):L('据第6页：泳池夏季10:00–18:00。\n有引用，但没有回答早餐问题。','6ページより：夏のプール10:00–18:00。\n出典はありますが、朝食の質問には答えていません。')});
  } else if(kind==='threshold') {
    const threshold=(lang==='ja'?ragEn:ragZh).settings.no_card_threshold.meaning;
    note(L(`演示向量阈值为 ${threshold}；判断使用未取整分数。`,`例のベクトルしきい値は ${threshold}。判定は丸め前の値で行います。`));
    input('score',L('模拟分数','仮の得点'),String(threshold),{type:'number',min:'-1',max:'1',step:'0.01',required:''});
    run=()=>({ok:true,text:Number(fields.score.value)>=threshold?L('达到阈值（含等于）：允许引用候选，但还要检查内容。','しきい値以上（等しい場合も含む）：候補を引用できても内容確認が必要です。'):L('低于阈值：本次没有找到过线资料，请询问工作人员。','しきい値未満：今回は線を超える資料が見つかりません。係員に確認してください。')});
  } else if(kind==='norm') {
    input('norm',L('[3,4] 的范数','[3,4] のノルム'),'',{type:'number',required:'',step:'any'});
    run=()=>({ok:Number(fields.norm.value)===5,text:Number(fields.norm.value)===5?'sqrt(3²+4²)=5\n[3,4]/5=[0.6,0.8]':L('还差一步：先平方、相加，最后开根号。不是把3和4直接相加。','もう一歩：二乗して足し、平方根を取ります。3と4を直接足しません。')});
  } else if(kind==='rounding') {
    input('cos','cosine','0.996',{type:'number',min:'-1',max:'1',step:'0.001',required:''});
    run=()=>({ok:true,text:`round(${fields.cos.value} × 100) = ${Math.round(Number(fields.cos.value)*100)}\n`+L('请比较 0.996 与 1.000：显示相同，原数值不同。','0.996 と1.000を比べてください。表示は同じでも元の値は異なります。')});
  } else if(kind==='projection') {
    select('z',L('B 的第三个坐标','B の第3成分'),[['10','10'],['100','100']]);
    note('A=[1,2,0], B=[1,2,z]');
    run=()=>({ok:true,text:`A → [1,2]; B → [1,2]\n`+L(`投影距离=0；原空间距离=${fields.z.value}。这不是实际PCA结果。`,`投影後の距離=0、元空間の距離=${fields.z.value}。実際のPCA出力ではありません。`)});
  } else if(kind==='failure') {
    mode=L('保存的实验 · 相近但不能互换','保存済み実験 · 近くても交換できない');
    select('claim',L('退房与入住相近，表示','checkout と check-in が近いのは'),[['same',L('时刻一定相同','時刻が必ず同じ')],['topic',L('话题相关，时刻要分别检查','話題が関連し、時刻は別に確認する')]]);
    run=()=>{const p=embedding.pairs[lang==='ja'?'en':'zh'].find(x=>x.a===(lang==='ja'?'checkout':'退房'));return {ok:fields.claim.value==='topic',text:`${p.a} / ${p.b}: ${p.points}\n`+L('相近分数不能证明时刻相同；请回到手册核实。','近さの得点は時刻が同じことを示しません。案内書で確認します。')};};
  } else throw new Error(`Unknown experiment ${kind}`);
  root.append(element('p',mode,{class:'evidence-kind'}));
  form.append(element('button',L('检查例子','例を確かめる'),{type:'submit'}));
  form.addEventListener('submit',event=>{event.preventDefault();const result=run();onResult(result);});
  root.append(form);
}
