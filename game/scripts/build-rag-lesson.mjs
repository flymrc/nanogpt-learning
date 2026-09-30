/**
 * Build the RAG kid lesson from rag/ chapters + demo JSON.
 * Numbers on screen are copied from results.json / results_zh.json.
 * Run: node game/scripts/build-rag-lesson.mjs
 */
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const ragRoot = join(root, "rag");
const outDir = join(root, "game/src/i18n/rag");

const TAG = {
  bubble: ["小G的吹き出し", "ジーくんのふきだし"],
  speech: ["小G的话", "ジーくんのことば"],
  aim: ["めあて"],
  look: ["看一看", "みてみよう"],
  action: ["做一做", "やってみよう"],
  summary: ["まとめ"],
  check: ["たしかめよう"],
  vo: ["配音", "ナレーション"],
  art: ["动画", "アニメーション"],
  next: ["下一章预告", "つぎの章の よ告", "次の章"],
};

function clean(value) {
  return String(value || "")
    .replace(/\*\*/g, "")
    .replace(/【本地化图：zh】/g, "")
    .replace(/【ローカライズ画像：ja】/g, "")
    .replace(/[┌└│─]/g, "")
    .replace(/`/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeTag(raw) {
  const tag = String(raw || "").trim();
  if (/本地化|ローカライズ/.test(tag)) return null;
  for (const [key, names] of Object.entries(TAG)) {
    if (names.some((name) => tag.startsWith(name))) return key;
  }
  return null;
}

function parseBlocks(section) {
  const marks = [];
  const re = /【([^】]+)】/g;
  let match = re.exec(section);
  while (match) {
    marks.push({ tag: match[1], index: match.index, end: match.index + match[0].length });
    match = re.exec(section);
  }
  const blocks = {};
  for (let i = 0; i < marks.length; i += 1) {
    const key = normalizeTag(marks[i].tag);
    if (!key) continue;
    const stop = i + 1 < marks.length ? marks[i + 1].index : section.length;
    const text = clean(section.slice(marks[i].end, stop));
    if (!text) continue;
    blocks[key] = blocks[key] ? `${blocks[key]}\n${text}` : text;
  }
  return blocks;
}

function sectionKind(title) {
  if (/导入|どうにゅう/.test(title)) return "intro";
  if (/ふりかえろう/.test(title)) return "rev";
  if (/まとめ/.test(title)) return "sum";
  const zh = title.match(/第\s*(\d+)\s*页/);
  const ja = title.match(/(\d+)\s*ページ/);
  if (zh) return `p${zh[1]}`;
  if (ja) return `p${ja[1]}`;
  return null;
}

function splitQuiz(text, lang) {
  const re = lang === "ja" ? /こたえ\s*[:：]/ : /答案\s*[:：]/;
  const parts = String(text || "").split(re);
  if (parts.length < 2) return { q: clean(text), a: clean(text) };
  return { q: clean(parts[0]), a: clean(parts.slice(1).join("")) };
}

function linesOf(body) {
  return clean(body)
    .split("\n")
    .map((line) => line.replace(/^[-・*\s]+/, "").replace(/^\d+\.\s*/, "").replace(/^⭐\s*/, "").trim())
    .filter((line) => line && !line.startsWith("【"));
}

function firstSentence(text) {
  const cleanText = clean(text).replace(/\s+/g, " ");
  const cut = cleanText.split(/[。！？]/)[0];
  return (cut || cleanText).trim();
}

/** Producer tables sit after the kid page. They must not become lesson copy. */
function kidOnly(text) {
  return String(text || "")
    .split(/\n---\n/)[0]
    .replace(/\n+---\s*$/g, "")
    .split(/\n###\s*附/)[0]
    .split(/\n（出典/)[0]
    .trim();
}

function shareBoards(data, qid) {
  const q = question(data, "word_match", qid);
  const hot = new Set(Object.keys(data.word_match.question_word_shares[qid] || {}));
  return q.top3
    .filter((row) => row.score_x100 > 0)
    .map((row) => ({
      page: row.page,
      title: row.title,
      score: row.score_x100,
      words: Object.entries(data.word_match.card_word_shares[String(row.page)] || {})
        .map(([text, share]) => ({
          text,
          share: Math.round(Number(share) * 1000) / 1000,
          hot: hot.has(text),
        }))
        .sort((a, b) => b.share - a.share),
    }));
}

function parseChapter(markdown) {
  const h1 = (markdown.match(/^#\s+(.+)$/m) || [, ""])[1];
  const chunks = markdown.split(/\n(?=## )/);
  const sections = [];
  for (const chunk of chunks) {
    const titleLine = chunk.split("\n")[0].replace(/^##\s+/, "").trim();
    if (!titleLine || /^#\s/.test(chunk) || /附[:：]|制作者|確認表|核对/.test(titleLine)) continue;
    const kind = sectionKind(titleLine);
    if (!kind) continue;
    const body = chunk.split("\n").slice(1).join("\n");
    sections.push({ kind, title: titleLine, blocks: parseBlocks(body), body: clean(body) });
  }
  return { h1, sections };
}

function loadJson(name) {
  return JSON.parse(readFileSync(join(ragRoot, "demo", name), "utf8"));
}

function question(data, bucket, id) {
  const found = data[bucket].questions.find((item) => item.id === id);
  if (!found) throw new Error(`missing ${bucket} ${id}`);
  return found;
}

function barsOf(q) {
  return q.top3.map((row) => ({
    page: row.page,
    score: row.score_x100,
    title: row.title,
    hot: row.rank === 1 && row.score_x100 > 0,
  }));
}

function packFacts(data) {
  const counts = data.card_word_counts;
  const countValues = Object.values(counts).map((n) => Number(n));
  const wordLine = data.settings.no_card_threshold.word_match;
  const meaningLine = data.settings.no_card_threshold.meaning;
  if (wordLine !== 0.1 || (meaningLine !== 0.2 && meaningLine !== 0.3)) {
    throw new Error(`unexpected thresholds ${wordLine} ${meaningLine}`);
  }
  const enCheck = data.settings.threshold_check_en;
  if (enCheck) {
    if (enCheck.threshold_used_separates !== true) throw new Error("en meaning line does not separate");
    if (Number(enCheck.threshold_used) !== meaningLine) {
      throw new Error(`en threshold_check ${enCheck.threshold_used} != ${meaningLine}`);
    }
  }
  const zhCheck = data.settings.threshold_check_zh;
  if (zhCheck) {
    if (zhCheck.threshold_0_30_separates !== true || meaningLine !== 0.3) {
      throw new Error("zh meaning line must stay 0.30");
    }
  }
  const grab = (bucket, id) => {
    const q = question(data, bucket, id);
    return {
      question: q.question,
      template: q.template_answer,
      items: barsOf(q),
      zero: q.top3.every((row) => row.score_x100 === 0),
    };
  };
  return {
    cards: data.cards.map((card) => ({
      page: card.page,
      title: card.title,
      text: card.text,
      words: card.n_words,
    })),
    counts,
    wholeWords: data.word_match.experiment_one_big_card.n_words,
    countMin: Math.min(...countValues),
    countMax: Math.max(...countValues),
    address: data.meaning.address_info.numbers_per_address,
    wordLine: Math.round(wordLine * 100),
    meaningLine: Math.round(meaningLine * 100),
    old: {
      text: data.old_page4.text,
      items: barsOf(data.meaning.experiment_old_page4.result),
      template: data.meaning.experiment_old_page4.result.template_answer,
    },
    added: {
      text: data.meaning.experiment_add_page13.new_card.text,
      title: data.meaning.experiment_add_page13.new_card.title,
      page: data.meaning.experiment_add_page13.new_card.page,
      items: barsOf(data.meaning.experiment_add_page13.result),
      template: data.meaning.experiment_add_page13.result.template_answer,
      wordItems: barsOf(data.word_match.experiment_add_page13.result),
    },
    closeness: data.meaning.card_pair_closeness.map((pair) => ({
      pages: pair.pages,
      score: pair.score_x100,
    })),
    shareCheckout: shareBoards(data, "q2_checkout"),
    q: {
      breakfastWord: grab("word_match", "q1_breakfast"),
      checkoutWord: grab("word_match", "q2_checkout"),
      poolWord: grab("word_match", "q3_pool"),
      parkWord: grab("word_match", "q4_parking"),
      dogWord: grab("word_match", "q5_dog"),
      swimWord: grab("word_match", "q6_swim"),
      mealsWord: grab("word_match", "q7_two_meals"),
      breakfast: grab("meaning", "q1_breakfast"),
      checkout: grab("meaning", "q2_checkout"),
      pool: grab("meaning", "q3_pool"),
      park: grab("meaning", "q4_parking"),
      dog: grab("meaning", "q5_dog"),
      swim: grab("meaning", "q6_swim"),
      meals: grab("meaning", "q7_two_meals"),
    },
  };
}

function pictureFor(id, lang, facts) {
  const q = facts.q;
  const breakfastCard = facts.cards.find((card) => card.page === 4);
  const poolCard = facts.cards.find((card) => card.page === 6);
  const cards = facts.cards.map((card) => ({ page: card.page, title: card.title, text: card.text }));
  if (id.endsWith("-sum")) return { kind: "rules", lines: [] };
  if (id.endsWith("-rev")) return { kind: "stars", n: 3 };
  const table = {
    "r1-intro": { kind: "board", covered: lang === "ja" ? "きょうの きゅうしょく" : "今天的午饭", open: lang === "ja" ? "ごはん" : "米饭和番茄炒蛋" },
    "r1-p1": { kind: "sign", title: lang === "ja" ? "ホテル・ホシ" : "星星酒店", sub: "Hotel Hoshi" },
    "r1-p2": { kind: "memory", line: lang === "ja" ? "7:00–10:00" : "7:00–10:00", caption: lang === "ja" ? "あたまの 中" : "脑袋里的旧话" },
    "r1-p3": { kind: "book", page: 4, line: breakfastCard.text, badge: lang === "ja" ? "いまの 本" : "今天的手册" },
    "r1-p4": { kind: "pair", left: { title: lang === "ja" ? "つくった 話" : "编的", body: lang === "ja" ? "1かい・24時間" : "1楼·24小时" }, right: { title: lang === "ja" ? "Page 6" : "第6页", body: lang === "ja" ? "おくじょう" : "屋顶" } },
    "r1-p5": { kind: "pair", left: { title: lang === "ja" ? "もういちど 練習" : "重新练习", body: lang === "ja" ? "とても 長い" : "要很久" }, right: { title: lang === "ja" ? "ページを かえる" : "换一页", body: lang === "ja" ? "すぐ" : "马上" } },
    "r1-p6": { kind: "flow", steps: lang === "ja" ? ["本を 見る", "こたえる"] : ["先查手册", "再回答"] },
    "r1-p7": { kind: "swap", oldLine: facts.old.text, newLine: breakfastCard.text },
    "r1-p8": { kind: "cite", page: 4, line: lang === "ja" ? "Page 4" : "第4页" },
    "r1-p9": {
      kind: "hats",
      page: 4,
      line: breakfastCard.text,
      question: lang === "ja" ? "朝ごはんは 何時？" : "早饭是几点？",
    },
    "r2-intro": { kind: "pair", left: { title: lang === "ja" ? "大きな はこ" : "大箱子", body: lang === "ja" ? "みつけにくい" : "不好找" }, right: { title: lang === "ja" ? "小さな はこ" : "小格子", body: lang === "ja" ? "すぐ" : "一下就找到" } },
    "r2-p1": { kind: "cards", items: cards },
    "r2-p2": { kind: "big", words: facts.wholeWords },
    "r2-p3": { kind: "cards", items: cards, cut: true },
    "r2-p4": { kind: "counts", min: facts.countMin, max: facts.countMax, focus: facts.cards.find((card) => card.page === 3).words },
    "r2-p5": { kind: "cards", items: cards, labeled: true },
    "r2-p6": { kind: "pair", left: { title: lang === "ja" ? "It is open" : "夏天开放", body: lang === "ja" ? "それ？" : "什么开放？" }, right: { title: "Page 6", body: poolCard.title } },
    "r2-p7": { kind: "flow", steps: lang === "ja" ? ["100語", "1くぎり"] : ["100个词", "切一段"] },
    "r2-p8": { kind: "sign", title: lang === "ja" ? "カードばこ" : "卡片盒", sub: lang === "ja" ? "12まい" : "12张" },
    "r2-p9": { kind: "pair", left: { title: lang === "ja" ? "カードの 字" : "卡片上的字", body: lang === "ja" ? "読める・直せる" : "能看能改" }, right: { title: lang === "ja" ? "きおく" : "记忆", body: lang === "ja" ? "1文 直せない" : "改不了一句" } },
    "r3-intro": { kind: "pair", left: { title: lang === "ja" ? "しつもん" : "问题", body: "?" }, right: { title: lang === "ja" ? "ともだちカード" : "朋友卡", body: "★" } },
    "r3-p1": { kind: "flow", steps: lang === "ja" ? ["12まいに 点", "高い カード"] : ["12张打分", "挑分高的"] },
    "r3-p2": { kind: "chips", chips: lang === "ja"
      ? [{ text: "What", on: false }, { text: "time", on: true }, { text: "is", on: false }, { text: "checkout", on: true }]
      : [{ text: "几点", on: false }, { text: "退房", on: true }] },
    "r3-p3": { kind: "shares", boards: facts.shareCheckout },
    "r3-p4": q.swimWord.zero ? { kind: "zeros", n: 12 } : { kind: "bars", items: visibleBars(q.swimWord.items) },
    "r3-p5": { kind: "address", n: facts.address },
    "r3-p6": { kind: "bars", items: visibleBars(q.swim.items) },
    "r3-p7": { kind: "bars", items: visibleBars(q.breakfast.items) },
    "r3-p8": { kind: "flow", steps: lang === "ja" ? ["カードの 住所", "じゅうしょちょう", "しつもんだけ"] : ["卡片的地址", "地址簿", "只算问题"] },
    "r3-p9": { kind: "hats", note: lang === "ja" ? "青ぼうしの 中" : "在蓝帽子里" },
    "r4-intro": { kind: "pair", left: { title: lang === "ja" ? "本を 見る" : "看着课本", body: lang === "ja" ? "あたりやすい" : "更准" }, right: { title: lang === "ja" ? "見ない" : "不看", body: lang === "ja" ? "あてる" : "靠猜" } },
    "r4-p1": { kind: "bars", items: visibleBars(q.breakfast.items) },
    "r4-p2": { kind: "join", question: q.breakfast.question, items: q.breakfast.items },
    "r4-p3": { kind: "flow", steps: lang === "ja" ? ["一文字", "また 一文字"] : ["一个字", "再一个字"] },
    "r4-p4": { kind: "cite", page: q.breakfast.items[0].page, line: lang === "ja" ? "1まいめだけ" : "只搬第1张" },
    "r4-p5": { kind: "bars", items: visibleBars(q.meals.items) },
    "r4-p6": { kind: "cite", page: q.breakfast.items[0].page, line: q.breakfast.template },
    "r4-p7": { kind: "cite", page: 4, line: lang === "ja" ? "Page 4" : "第4页" },
    "r4-p8": { kind: "pair", left: { title: lang === "ja" ? "本を 見た" : "查过再答", body: lang === "ja" ? "より ほんとう" : "更常是真的" }, right: { title: lang === "ja" ? "きおくだけ" : "只靠记忆", body: lang === "ja" ? "はずれる" : "会编" } },
    "r4-p9": lang === "ja"
      ? { kind: "bars", items: visibleBars(q.pool.items) }
      : { kind: "flow", steps: ["问", "找", "接上", "写", "第几页"] },
    "r5-intro": { kind: "pair", left: { title: lang === "ja" ? "本に ある" : "手册里有", body: "○" }, right: { title: lang === "ja" ? "本に ない" : "手册里没有", body: "×" } },
    "r5-p4": { kind: "line", items: q.dog.items, meaningLine: facts.meaningLine, wordLine: facts.wordLine },
    "r5-p5": { kind: "cite", page: 0, line: q.dog.template },
    "r5-p6": { kind: "bars", items: facts.added.items },
    "r5-p7": { kind: "bars", items: facts.old.items },
    "r5-p8": { kind: "pair", left: { title: lang === "ja" ? "本が まちがい" : "手册写错", body: lang === "ja" ? "こたえも まちがい" : "回答也错" }, right: { title: lang === "ja" ? "本を 直す" : "把手册改对", body: lang === "ja" ? "すぐ 使える" : "马上能用" } },
    "r5-p9": { kind: "rules", lines: [] },
  };
  if (lang === "ja") {
    const wordTop = q.breakfastWord.items;
    const rightPage = q.breakfast.items[0].page;
    table["r5-p1"] = { kind: "bars", items: visibleBars(wordTop), hair: true };
    table["r5-p2"] = {
      kind: "take",
      one: wordTop[0],
      many: wordTop,
      pick: wordTop.find((item) => item.page === rightPage)?.page ?? wordTop[0].page,
      carry: wordTop[0].page,
    };
    table["r5-p3"] = { kind: "pair", left: { title: "朝ごはん", body: `Page ${q.breakfast.items[0].page} · ${q.breakfast.items[0].score}` }, right: { title: "park", body: q.park.zero ? "0" : `Page ${q.park.items[0].page} · ${q.park.items[0].score}` } };
  } else {
    table["r5-p1"] = { kind: "zeros", n: 12 };
    table["r5-p2"] = { kind: "pair", left: { title: "停车", body: `第${q.park.items[0].page}页 · ${q.park.items[0].score}` }, right: { title: "游泳", body: `第${q.swim.items[0].page}页 · ${q.swim.items[0].score}` } };
    table["r5-p3"] = { kind: "bars", items: visibleBars(q.park.items) };
  }
  const picture = table[id];
  if (!picture) throw new Error(`no picture for ${id}`);
  return picture;
}

function pageCopy(section, lang) {
  const blocks = Object.fromEntries(Object.entries(section.blocks).map(([key, value]) => [key, kidOnly(value)]));
  if (section.kind === "sum") {
    const points = linesOf(section.body).slice(0, 3);
    while (points.length < 3) points.push(points[0] || "まとめ");
    return {
      bubble: lang === "ja" ? "この章で おぼえる 三つの こと" : "这一章记住三句话",
      aim: points[0],
      look: points.join("\n"),
      action: lang === "ja" ? "三つ とも、声に 出して 言ってみよう。" : "三句都出声说一遍。",
      summary: points.join("\n"),
      checkQ: lang === "ja" ? "この章の 三つの こと" : "这一章的三句话",
      checkA: points.join("\n"),
      vo: points[0],
      art: lang === "ja" ? "三つの まとめ" : "三句话",
      stars: points,
      quiz: false,
    };
  }
  if (section.kind === "rev") {
    const stars = linesOf(section.body).filter((line) => !/次の章|下一章|よ告|预告/.test(line)).slice(0, 3);
    while (stars.length < 3) stars.push(stars[0] || "⭐");
    const next = blocks.next || "";
    return {
      bubble: lang === "ja" ? "ふりかえろう" : "回头看一看",
      aim: stars[0],
      look: stars.join("\n"),
      action: next || (lang === "ja" ? "できた ところに ⭐" : "做到的点上星星"),
      summary: stars.join("\n"),
      checkQ: lang === "ja" ? "できた ところ" : "能做到的",
      checkA: stars.join("\n"),
      vo: stars[0],
      art: "⭐",
      stars,
      quiz: false,
    };
  }
  const quiz = splitQuiz(blocks.check || "", lang);
  const bubble = blocks.bubble || firstSentence(blocks.speech || blocks.aim || section.title);
  const aim = blocks.aim || firstSentence(blocks.summary || bubble);
  const look = [blocks.look, blocks.speech].filter(Boolean).join("\n");
  const action = blocks.action || aim;
  const summary = blocks.summary || aim;
  const vo = blocks.vo || summary;
  if (!quiz.q || !quiz.a) throw new Error(`quiz missing ${lang} ${section.kind}`);
  return {
    bubble,
    aim,
    look: look || aim,
    action,
    summary,
    checkQ: quiz.q,
    checkA: quiz.a,
    vo,
    art: blocks.art || blocks.action || firstSentence(blocks.look || aim),
    stars: [],
    quiz: true,
  };
}

const MYTH = {
  zh: {
    1: "记忆只在脑袋里。卡片盒不叫记忆。",
    2: "剪太碎，就看不出在说什么。",
    3: "数一样的词会上当。意思的地址看的是近不近。",
    4: "填空纸只会搬第1张。它不会挑卡。",
    5: "线下面，只是这个办法没找到。不一定是手册里没有。",
  },
  ja: {
    1: "きおくは 頭の 中だけ。カードばこは きおくと よびません。",
    2: "切りすぎると、何の 話か わかりません。",
    3: "同じ 語を 数えると、だまされます。意味の 住所は 近さを 見ます。",
    4: "かきこみ紙は 1まいめしか 運びません。自分では 選びません。",
    5: "線の 下は、この やり方では 見つからなかった、という ことです。",
  },
};

function pseudoLines(copy, lang, chapter) {
  const bits = [copy.action, copy.summary, copy.aim, copy.bubble].map((line) => firstSentence(line)).filter(Boolean);
  while (bits.length < 4) bits.push(bits[0]);
  return {
    does: firstSentence(copy.action),
    metaphor: firstSentence(copy.art),
    myth: MYTH[lang][chapter],
    l1: bits[0],
    l2: bits[1],
    l3: bits[2],
    l4: bits[3],
  };
}

function longTitle(h1, lang) {
  const text = String(h1 || "").trim();
  if (lang === "zh") return text.replace(/^第\s*\d+\s*章[　\s]*/, "").trim();
  return text.replace(/^だい\d*しょう[　\s]*/, "").trim();
}

function visibleBars(items) {
  if (!items?.length) return [];
  if (items.every((item) => item.score === 0)) return items;
  return items.filter((item) => item.score > 0);
}

const SHORT = {
  zh: ["会答错", "剪卡片", "找卡片", "写回答", "出错了"],
  ja: ["まちがえる", "カードに", "さがす", "書いて", "こまったら"],
};

const CHROME = {
  zh: {
    appTitle: "小G当前台",
    subtitle: "先查手册，再回答",
    bubble: "先查一查，再回答？",
    tapeCaption: "先查手册",
    endTitle: "前台守则学会啦",
    endSpeech: "先查，再答，说页码。",
    catalogLead: "五章都能进。图画上的分来自真的查找，不编回答。",
    "level1Title": "",
    "level2Title": "",
    "level3Title": "",
    "level4Title": "",
    "level5Title": "",
    "guide.1.title": "先查再答",
    "guide.1.body": "客人问问题。小G先翻手册，再回答。",
    "guide.2.title": "两顶帽子",
    "guide.2.body": "蓝帽子找卡片。黄帽子看着卡片写。",
    "guide.3.title": "没有就说不知道",
    "guide.3.body": "分比线低，就老实说不知道。不编。",
    "note.memory.term": "记忆",
    "note.memory.blurb": "脑袋里记住的句子。",
    "note.memory.note": "记得句子，不记得是哪一页。卡片盒不叫记忆。",
    "note.ai.term": "AI",
    "note.ai.blurb": "自己会写句子的程序。",
    "note.ai.note": "小G就是这样的程序。",
    "note.rag.term": "RAG",
    "note.rag.blurb": "先找资料，再写回答。",
    "note.rag.note": "三个字母，一个一个读：R、A、G。",
    "note.finder.term": "蓝帽子",
    "note.finder.blurb": "找卡片的助手。",
    "note.finder.note": "大人叫它检索器。",
    "note.writer.term": "黄帽子",
    "note.writer.blurb": "写回答的助手。",
    "note.writer.note": "大人叫它生成器。还是一个字一个字往下写。",
    "note.card.term": "卡片",
    "note.card.blurb": "手册的一页。",
    "note.card.note": "一页一张卡，写着页码。放在卡片盒里。",
    "note.line.term": "分数线",
    "note.line.blurb": "游戏自己定的线。",
    "note.line.note": "数一样的词是10分。意思的地址是30分。线下面是这个办法没找到。",
    "rtitle.bubble": "先查一查？",
    "rtitle.aim": "小G在星星酒店当前台。",
    "rtitle.look": "酒店是编的。手册也是编的。",
    "rtitle.action": "点开始，去第1章。",
    "rtitle.summary": "先查手册，再回答。",
    "rtitle.checkQ": "小G回答前先做什么？",
    "rtitle.checkA": "先查手册。",
    "rtitle.vo": "小G要去酒店前台。先查手册，再回答。",
    "rend.bubble": "学会啦。",
    "rend.aim": "前台守则：先查，再答，说页码。",
    "rend.look": "没有对得上的卡，就说不知道。",
    "rend.action": "回目录，可以再看每一章。",
    "rend.summary": "手册要写对，还要常换新。",
    "rend.checkQ": "没有卡的时候怎么说？",
    "rend.checkA": "说不知道。",
    "rend.vo": "先查，再答，说出第几页。没有就说不知道。",
  },
  ja: {
    appTitle: "フロントの ジーくん",
    subtitle: "まず 本を 見て、こたえる",
    bubble: "まず しらべる？",
    tapeCaption: "まず 本を 見る",
    endTitle: "フロントの やくそく",
    endSpeech: "見て、こたえて、ページを 言う。",
    catalogLead: "五つの 章に 入れます。点は 本当の さがしの 結果です。答えは 作りません。",
    "level1Title": "",
    "level2Title": "",
    "level3Title": "",
    "level4Title": "",
    "level5Title": "",
    "guide.1.title": "見てから こたえる",
    "guide.1.body": "お客さんが 聞きます。ジーくんは まず 本を 見て、それから こたえます。",
    "guide.2.title": "二つの ぼうし",
    "guide.2.body": "青ぼうしが カードを さがします。黄ぼうしが 見ながら 書きます。",
    "guide.3.title": "なければ わからない",
    "guide.3.body": "点が 線より 低ければ、わからないと 言います。作りません。",
    "note.memory.term": "きおく",
    "note.memory.blurb": "頭の 中に 残った 文。",
    "note.memory.note": "文は おぼえて いても、何ページかは おぼえて いません。カードばこは きおくと よびません。",
    "note.ai.term": "AI",
    "note.ai.blurb": "自分で 文を 書く プログラム。",
    "note.ai.note": "ジーくんが それです。エーアイと 読みます。",
    "note.rag.term": "RAG",
    "note.rag.blurb": "資料を 見つけてから 書く。",
    "note.rag.note": "三つの 英字を 一つずつ 読みます。アール、エー、ジー。",
    "note.finder.term": "さがし係",
    "note.finder.blurb": "青ぼうしの 助手。",
    "note.finder.note": "カードを 見つける 人です。",
    "note.writer.term": "書き係",
    "note.writer.blurb": "黄ぼうしの 助手。",
    "note.writer.note": "カードを 見ながら、一文字ずつ 書きます。",
    "note.card.term": "カード",
    "note.card.blurb": "あんないの 本の 1ページ。",
    "note.card.note": "1ページが 1まい。ページばんごうが あります。カードばこに 入ります。",
    "note.line.term": "点の 線",
    "note.line.blurb": "この ゲームが 決めた 線。",
    "note.line.note": "同じ 語を 数える ときは 10てん。意味の 住所は 30てん。線の 下は、この やり方では 見つからなかった、ということです。",
    "rtitle.bubble": "まず しらべる？",
    "rtitle.aim": "ジーくんは ホテル・ホシの フロントです。",
    "rtitle.look": "ホテルも 本も つくり話です。",
    "rtitle.action": "スタートを 押して、第1章へ。",
    "rtitle.summary": "まず 本を 見て、こたえる。",
    "rtitle.checkQ": "こたえる 前に 何を する？",
    "rtitle.checkA": "まず 本を 見る。",
    "rtitle.vo": "ジーくんは ホテルの フロントへ 行きます。まず 本を 見て、それから こたえます。",
    "rend.bubble": "できたね。",
    "rend.aim": "見て、こたえて、ページを 言う。",
    "rend.look": "合う カードが なければ、わからないと 言う。",
    "rend.action": "目次に 戻って、もう 一度 見られます。",
    "rend.summary": "本は 正しく 書いて、新しい ページに かえます。",
    "rend.checkQ": "カードが ない とき、何と 言う？",
    "rend.checkA": "わからない、と 言います。",
    "rend.vo": "まず 見て、こたえて、何ページか 言います。なければ、わからないと 言います。",
  },
};

function lineNote(lang, facts) {
  if (lang === "ja") {
    return `同じ 語を 数える ときは ${facts.wordLine}てん。意味の 住所は ${facts.meaningLine}てん。線の 下は、この やり方では 見つからなかった、ということです。`;
  }
  return `数一样的词是${facts.wordLine}分。意思的地址是${facts.meaningLine}分。线下面是这个办法没找到。`;
}

function buildLocale(lang, chapters, facts) {
  const pack = { ...CHROME[lang], "note.line.note": lineNote(lang, facts) };
  const pages = [];
  chapters.forEach((chapter, index) => {
    const chapterNo = index + 1;
    const title = longTitle(chapter.h1, lang);
    pack[`level${chapterNo}Title`] = title;
    pack[`chapter.${chapterNo}.title`] = title;
    pack[`chapter.${chapterNo}.short`] = SHORT[lang][index];
    pack[`chapter.${chapterNo}.blurb`] = firstSentence(chapter.sections[0]?.blocks?.aim || title);
    chapter.sections.forEach((section) => {
      const id = `r${chapterNo}-${section.kind}`;
      const copy = pageCopy(section, lang);
      const picture = pictureFor(id, lang, facts);
      if (picture.kind === "rules") picture.lines = copy.stars.slice();
      for (const suffix of ["bubble", "aim", "look", "action", "summary", "checkQ", "checkA", "vo", "art"]) {
        pack[`${id}.${suffix}`] = copy[suffix];
      }
      copy.stars.forEach((line, starIndex) => {
        pack[`${id}.star${starIndex + 1}`] = line;
      });
      const steps = pseudoLines(copy, lang, chapterNo);
      for (const suffix of ["does", "metaphor", "myth", "l1", "l2", "l3", "l4"]) {
        pack[`pseudo.${id}.${suffix}`] = steps[suffix];
      }
      pages.push({ id, chapter: chapterNo, kind: section.kind, copy, picture, quiz: copy.quiz });
    });
  });
  for (const id of ["rtitle", "rend"]) {
    const steps = pseudoLines({
      action: pack[`${id}.action`],
      summary: pack[`${id}.summary`],
      aim: pack[`${id}.aim`],
      bubble: pack[`${id}.bubble`],
      art: pack.tapeCaption,
    }, lang, 1);
    for (const suffix of ["does", "metaphor", "myth", "l1", "l2", "l3", "l4"]) {
      pack[`pseudo.${id}.${suffix}`] = steps[suffix];
    }
  }
  return { pack, pages };
}

function shellPage(id) {
  return {
    id,
    chapter: 0,
    kind: id,
    course: "rag",
    visual: "rag",
    shared: { visual: "rag" },
    exampleSlots: null,
    keys: {
      bubble: `${id}.bubble`,
      aim: `${id}.aim`,
      look: `${id}.look`,
      action: `${id}.action`,
      summary: `${id}.summary`,
      checkQ: `${id}.checkQ`,
      checkA: `${id}.checkA`,
      vo: `${id}.vo`,
    },
  };
}

const zhFacts = packFacts(loadJson("results_zh.json"));
const jaFacts = packFacts(loadJson("results.json"));
const zhChapters = [1, 2, 3, 4, 5].map((n) => parseChapter(readFileSync(join(ragRoot, `0${n}-chapter${n}.md`), "utf8")));
const jaChapters = [1, 2, 3, 4, 5].map((n) => parseChapter(readFileSync(join(ragRoot, "ja", `0${n}-chapter${n}.md`), "utf8")));
const zhBuilt = buildLocale("zh", zhChapters, zhFacts);
const jaBuilt = buildLocale("ja", jaChapters, jaFacts);

if (zhBuilt.pages.length !== jaBuilt.pages.length) {
  throw new Error(`page mismatch zh=${zhBuilt.pages.length} ja=${jaBuilt.pages.length}`);
}

const skeleton = zhBuilt.pages.map((page, index) => {
  const other = jaBuilt.pages[index];
  if (page.id !== other.id) throw new Error(`id mismatch ${page.id} ${other.id}`);
  const keys = {
    bubble: `${page.id}.bubble`,
    aim: `${page.id}.aim`,
    look: `${page.id}.look`,
    action: `${page.id}.action`,
    summary: `${page.id}.summary`,
    checkQ: `${page.id}.checkQ`,
    checkA: `${page.id}.checkA`,
    vo: `${page.id}.vo`,
    art: `${page.id}.art`,
  };
  page.copy.stars.forEach((_, starIndex) => {
    keys[`star${starIndex + 1}`] = `${page.id}.star${starIndex + 1}`;
  });
  return {
    id: page.id,
    chapter: page.chapter,
    kind: page.kind === "intro" ? "intro" : page.kind === "sum" || page.kind === "rev" ? "summary" : "page",
    course: "rag",
    quiz: page.quiz,
    visual: "rag",
    shared: {
      visual: "rag",
      locales: {
        zh: page.picture,
        ja: other.picture,
      },
    },
    exampleSlots: null,
    keys,
  };
});

const counts = [1, 2, 3, 4, 5].map((chapter) => skeleton.filter((page) => page.chapter === chapter).length);
if (counts.join(",") !== "12,12,12,12,12") throw new Error(`counts ${counts}`);
const quizzes = [1, 2, 3, 4, 5].map((chapter) => skeleton.filter((page) => page.chapter === chapter && page.quiz).length);
if (quizzes.join(",") !== "10,10,10,10,10") throw new Error(`quizzes ${quizzes}`);

writeFileSync(join(outDir, "skeleton.js"), `/** Generated by game/scripts/build-rag-lesson.mjs. Picture numbers are copied from rag/demo JSON. */\nexport const RAG_PAGES = ${JSON.stringify(skeleton, null, 2)};\n\nexport const RAG_TITLE = ${JSON.stringify(shellPage("rtitle"), null, 2)};\nexport const RAG_END = ${JSON.stringify(shellPage("rend"), null, 2)};\n\nexport function ragPagesFor(chapter) {\n  return RAG_PAGES.filter((page) => page.chapter === chapter);\n}\n`);
writeFileSync(join(outDir, "zh.js"), `/** Generated by game/scripts/build-rag-lesson.mjs from rag/zh chapters. */\nexport const RAG_ZH = ${JSON.stringify(zhBuilt.pack, null, 2)};\n`);
writeFileSync(join(outDir, "ja.js"), `/** Generated by game/scripts/build-rag-lesson.mjs from rag/ja chapters. */\nexport const RAG_JA = ${JSON.stringify(jaBuilt.pack, null, 2)};\n`);

const banned = ["随便猜", "手册里没有对得上的页", "最高分比线还低，就是手册里没有"];
const joined = Object.values(zhBuilt.pack).join("\n");
for (const word of banned) {
  if (joined.includes(word)) throw new Error(`reintroduced ${word}`);
}
if (!joined.includes("我没找到分数过线的卡片")) throw new Error("round-5 template missing");
for (const [lang, built] of [["zh", zhBuilt], ["ja", jaBuilt]]) {
  for (const [key, value] of Object.entries(built.pack)) {
    const text = String(value);
    if (text.includes("→") || text.includes("…") || text.includes("⋯")) {
      throw new Error(`kid glyph ${lang} ${key}`);
    }
  }
}
if (!Object.values(jaBuilt.pack).join("\n").includes("I don't know") && !jaBuilt.pages.some((page) => JSON.stringify(page.picture).includes("I don't know"))) {
  const jaJoined = JSON.stringify(jaBuilt.pages);
  if (!jaJoined.includes("I don't know")) throw new Error("english template missing from pictures");
}
const jaLine = jaFacts.meaningLine;
const zhLine = zhFacts.meaningLine;
const jaPic = (id) => jaBuilt.pages.find((page) => page.id === id)?.picture;
const zhPic = (id) => zhBuilt.pages.find((page) => page.id === id)?.picture;
if (jaLine !== 20 || zhLine !== 30) throw new Error(`lines ja=${jaLine} zh=${zhLine}`);
if (jaPic("r5-p4")?.meaningLine !== jaLine || zhPic("r5-p4")?.meaningLine !== zhLine) {
  throw new Error("threshold picture drifted from its locale json");
}
if (jaPic("r4-p9")?.items?.[0]?.page !== 6 || jaPic("r4-p9")?.items?.[0]?.score !== jaFacts.q.pool.items[0].score) {
  throw new Error("ja pool conveyor is not the meaning top card");
}
const jaKid = Object.values(jaBuilt.pack).join("\n");
if (/(?<![\d.:])30てん/.test(jaKid)) throw new Error("ja still says 30てん");
for (const needle of ["20てん", "57てん", "81てん", "27てん", "16てん"]) {
  if (!jaKid.includes(needle)) throw new Error(`ja pack missing ${needle}`);
}
const verified = spawnSync("python3", ["verify_ja_scores.py"], { cwd: ragRoot, encoding: "utf8" });
if (verified.status !== 0) {
  throw new Error(verified.stdout || verified.stderr || "verify_ja_scores.py failed");
}
console.log(String(verified.stdout).trim());
console.log(`RAG_BUILD pages=${skeleton.length} zhKeys=${Object.keys(zhBuilt.pack).length} jaKeys=${Object.keys(jaBuilt.pack).length}`);
