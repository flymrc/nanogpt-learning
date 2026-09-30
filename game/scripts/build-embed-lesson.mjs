/**
 * Build the word-vector kid lesson from embed/script + embed/demo/results.json.
 * Picture numbers are copied from that JSON (and the RAG JSON only where the
 * brief says the Chinese pages quote the same model). Run:
 * node game/scripts/build-embed-lesson.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const embedRoot = join(root, "embed");
const outDir = join(root, "game/src/i18n/embed");
const factsPath = join(root, "game/src/data/embed-facts.js");

const TAG = {
  bubble: ["小G的问题", "ジーくんの ふきだし", "ジーくんのふきだし"],
  talk: ["小G的话", "ジーくんのことば"],
  aim: ["目标", "めあて"],
  look: ["看看", "みてみよう"],
  action: ["做做", "やってみよう"],
  summary: ["小结", "まとめ"],
  check: ["试试", "たしかめよう"],
  vo: ["配音", "ナレーション"],
  art: ["动画", "アニメーション"],
};

const JA_GLOSS = {
  breakfast: "朝ごはん",
  "morning meal": "朝の 食事",
  lunch: "昼ごはん",
  dinner: "夕ごはん",
  parking: "ちゅうしゃ",
  "parking lot": "ちゅうしゃじょう",
  car: "車",
  swim: "およぐ",
  swimming: "およぎ",
  pool: "プール",
  "swimming pool": "水泳プール",
  dog: "犬",
  dogs: "犬たち",
  cat: "ねこ",
  towel: "タオル",
  pillow: "まくら",
  key: "かぎ",
  checkout: "チェックアウト",
  "check-in": "チェックイン",
  "front desk": "フロント",
};

function clean(value) {
  return String(value || "")
    .replace(/\*\*/g, "")
    .replace(/`/g, "")
    .replace(/\n+---\s*$/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function kidOnly(text) {
  return clean(String(text || "").split(/\n---\n/)[0].split(/\n###\s/)[0]);
}

function normalizeTag(raw) {
  const tag = String(raw || "").trim();
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
    const text = kidOnly(section.slice(marks[i].end, stop));
    if (!text) continue;
    blocks[key] = blocks[key] ? `${blocks[key]}\n${text}` : text;
  }
  return blocks;
}

function sectionKind(title) {
  if (/核对|チェック|附[:：]|制作者|作る人/.test(title)) return null;
  if (/导入|はじめに|どうにゅう/.test(title)) return "intro";
  if (/ふりかえろう/.test(title)) return "rev";
  if (/まとめ|小结/.test(title)) return "sum";
  const zh = title.match(/第\s*(\d+)\s*页/);
  const ja = title.match(/(\d+)\s*ページ/);
  if (zh) return `p${zh[1]}`;
  if (ja) return `p${ja[1]}`;
  return null;
}

function parseChapter(markdown) {
  const h1 = (markdown.match(/^#\s+(.+)$/m) || [, ""])[1];
  const chunks = markdown.split(/\n(?=## )/);
  const sections = [];
  for (const chunk of chunks) {
    const titleLine = chunk.split("\n")[0].replace(/^##\s+/, "").trim();
    if (!titleLine || /^#\s/.test(chunk)) continue;
    const kind = sectionKind(titleLine);
    if (!kind) continue;
    const body = chunk.split("\n").slice(1).join("\n");
    sections.push({ kind, title: titleLine, blocks: parseBlocks(body), body: clean(body) });
  }
  return { h1, sections };
}

function parseBook(markdown) {
  markdown = markdown.replace(/\r\n?/g, '\n');
  return markdown
    .split(/\n(?=# )/)
    .filter((chunk) => /^#\s+第/.test(chunk))
    .map(parseChapter)
    .filter((chapter) => chapter.sections.length);
}

function linesOf(body) {
  return clean(body)
    .split("\n")
    .map((line) => line.replace(/^[-・*\s]+/, "").replace(/^\d+\.\s*/, "").replace(/^⭐\s*/, "").trim())
    .filter((line) => line && !line.startsWith("|") && !line.startsWith(">") && !line.startsWith("【"));
}

function firstSentence(text) {
  const cleanText = clean(text).replace(/\s+/g, " ");
  const cut = cleanText.split(/[。！？]/)[0];
  return (cut || cleanText).trim();
}

function splitQuiz(text, lang) {
  const re = lang === "ja" ? /こたえ\s*[:：]/ : /答案\s*[:：]/;
  const parts = String(text || "").split(re);
  if (parts.length < 2) return { q: clean(text), a: "" };
  return { q: clean(parts[0]), a: clean(parts.slice(1).join("")) };
}

function loadJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function bandsOf(row) {
  return row.first8_normalized.map((value) => {
    if (Math.abs(value) < 0.017) return "p";
    return value < 0 ? "b" : "r";
  });
}

function pairOf(data, group, a, b) {
  const hit = (data.pairs[group] || []).find((item) => (item.a === a && item.b === b) || (item.a === b && item.b === a));
  if (!hit) throw new Error(`missing pair ${group} ${a} ${b}`);
  return hit;
}

function neighboursOf(data, langKey, word, count = 3) {
  const rows = data.nearest_neighbours[langKey][word];
  if (!rows) throw new Error(`missing neighbours ${langKey} ${word}`);
  return rows.slice(0, count).map((row) => ({ word: row.word, points: row.points }));
}

function cardsOf(data, langKey, word, count = 3) {
  const rows = data.word_to_nearest_cards[langKey][word];
  if (!rows) throw new Error(`missing cards ${langKey} ${word}`);
  return rows.slice(0, count).map((row) => ({ page: row.page, title: row.title, points: row.points }));
}

function topOf(block, count = 3) {
  return block.top3.slice(0, count).map((row) => ({ page: row.page, title: row.title, points: row.score_x100 }));
}

function showLabel(lang, word) {
  if (lang === "ja" && JA_GLOSS[word]) return `${JA_GLOSS[word]}〔${word}〕`;
  return word;
}

function row(lang, word, cells) {
  return { word, label: showLabel(lang, word), cells };
}

function scored(lang, word, points) {
  return { word, label: showLabel(lang, word), points };
}

function linked(lang, a, b, points) {
  return { a, b, aLabel: showLabel(lang, a), bLabel: showLabel(lang, b), points };
}

function pictureFor(id, lang, data, ragZh) {
  const key = lang === "ja" ? "en" : "zh";
  const band = (word) => bandsOf(data.raw_example[word]);
  const pts = (group, a, b) => pairOf(data, group, a, b).points;
  const dim = data.dimension;
  if (dim !== 384) throw new Error(`dimension ${dim}`);
  const parking = data.rag_link.parking_recomputed_here[key];
  const oldNew = data.rag_link.old_page4_recomputed_here[key];
  const intro = {
    1: { kind: "hat" },
    2: { kind: "beans", count: data.words[key].length },
    3: { kind: "fan" },
    4: { kind: "shadow" },
    5: { kind: "twins" },
  };
  const chapter = Number(id[1]);
  if (id.endsWith("-intro")) return intro[chapter];
  if (id.endsWith("-sum")) return { kind: "rules", lines: [] };
  if (id.endsWith("-rev")) return { kind: "stars", n: 3 };
  const breakfast = lang === "ja" ? "breakfast" : "早饭";
  const meal = lang === "ja" ? "morning meal" : "早餐";
  const park = lang === "ja" ? "parking" : "停车";
  if (id === "e1-p1") return { kind: "strip", dim, item: row(lang, breakfast, band(breakfast)) };
  if (id === "e1-p2") {
    const words = lang === "ja" ? ["dog", "parking", "swimming pool"] : ["狗", "停车", "游泳池"];
    return {
      kind: "align",
      dim,
      items: words.map((word) => {
        const measured = Boolean(data.raw_example[word]);
        const cells = measured ? band(word) : ["p", "p", "p", "p", "p", "p", "p", "p"];
        return { ...row(lang, word, cells), measured };
      }),
    };
  }
  if (id === "e1-p3") {
    const words = lang === "ja" ? ["breakfast", "morning meal", "parking"] : ["早饭", "早餐", "停车"];
    return { kind: "compare", items: words.map((word) => row(lang, word, band(word))) };
  }
  if (id === "e1-p4") {
    return {
      kind: "tags",
      tags: lang === "ja"
        ? ["ベクトル", "単語ベクトル", "いみの じゅうしょ"]
        : ["向量", "词向量", "意思的地址"],
    };
  }
  if (id === "e1-p5") {
    const left = band(lang === "ja" ? "breakfast" : "早饭");
    const right = band("breakfast");
    const same = left.filter((cell, index) => cell === right[index]).length;
    return {
      kind: "class",
      dim,
      showSame: lang === "zh",
      same,
      cells: left.length,
      items: lang === "zh"
        ? [row("zh", "早饭", left), row("zh", "breakfast", right)]
        : [row("ja", "breakfast", left)],
    };
  }
  if (id === "e2-p1") {
    const groups = lang === "ja"
      ? [
        { name: "ごはん村", words: ["breakfast", "morning meal", "lunch", "dinner"] },
        { name: "およぎ村", words: ["swim", "swimming", "pool", "swimming pool"] },
        { name: "くるま村", words: ["parking", "parking lot", "car"] },
        { name: "どうぶつ村", words: ["dog", "dogs", "cat"] },
        { name: "フロント村", words: ["key", "checkout", "check-in", "front desk"] },
        { name: "まんなか", words: ["towel", "pillow"] },
      ]
      : [
        { name: "吃饭村", words: ["早饭", "早餐", "午饭", "晚饭"] },
        { name: "游泳村", words: ["游泳", "泳池", "游泳池"] },
        { name: "车子村", words: ["停车", "车位", "停车场", "车"] },
        { name: "小狗村", words: ["狗", "小狗"] },
        { name: "前台村", words: ["退房", "入住", "前台", "钥匙", "猫"] },
        { name: "中间", words: ["毛巾", "枕头"] },
      ];
    return {
      kind: "map",
      mapKey: key,
      groups: groups.map((group) => ({
        name: group.name,
        words: group.words.map((word) => ({ word, label: showLabel(lang, word) })),
      })),
    };
  }
  if (id === "e2-p2") {
    const items = lang === "ja"
      ? [
        linked("ja", "breakfast", "morning meal", pts("en", "breakfast", "morning meal")),
        linked("ja", "breakfast", "lunch", pts("en", "breakfast", "lunch")),
        linked("ja", "breakfast", "parking", pts("en", "breakfast", "parking")),
      ]
      : [
        linked("zh", "早饭", "早餐", pts("zh", "早饭", "早餐")),
        linked("zh", "早饭", "午饭", pts("zh", "早饭", "午饭")),
        linked("zh", "早饭", "停车", pts("zh", "早饭", "停车")),
      ];
    return { kind: "podium", items };
  }
  if (id === "e2-p3") {
    const items = lang === "ja"
      ? [
        linked("ja", "parking", "parking lot", pts("en", "parking", "parking lot")),
        linked("ja", "swim", "swimming", pts("en", "swim", "swimming")),
        linked("ja", "dog", "dogs", pts("en", "dog", "dogs")),
        linked("ja", "dog", "swim", pts("en", "dog", "swim")),
      ]
      : [
        linked("zh", "停车", "车位", pts("zh", "停车", "车位")),
        linked("zh", "游泳", "泳池", pts("zh", "游泳", "泳池")),
        linked("zh", "狗", "小狗", pts("zh", "狗", "小狗")),
        linked("zh", "狗", "游泳", pts("zh", "狗", "游泳")),
      ];
    return { kind: "ropes", items };
  }
  if (id === "e2-p4") {
    const focuses = lang === "ja"
      ? ["breakfast", "swimming pool"]
      : ["早饭", "游泳池"];
    return {
      kind: "rings",
      groups: focuses.map((word) => ({
        focus: scored(lang, word, 0).label,
        word,
        items: neighboursOf(data, key, word).map((item) => scored(lang, item.word, item.points)),
      })),
    };
  }
  if (id === "e2-p5") {
    const items = lang === "ja"
      ? [
        linked("ja", "朝ごはん", "breakfast", pts("cross_language", "朝ごはん", "breakfast")),
        linked("ja", "犬", "dog", pts("cross_language", "犬", "dog")),
        linked("ja", "駐車場", "parking lot", pts("cross_language", "駐車場", "parking lot")),
        linked("ja", "プール", "pool", pts("cross_language", "プール", "pool")),
        linked("ja", "朝ごはん", "dog", pts("cross_language", "朝ごはん", "dog")),
      ]
      : [
        linked("zh", "早饭", "breakfast", pts("cross_language", "早饭", "breakfast")),
        linked("zh", "狗", "dog", pts("cross_language", "狗", "dog")),
        linked("zh", "游泳池", "swimming pool", pts("cross_language", "游泳池", "swimming pool")),
        linked("zh", "早饭", "dog", pts("cross_language", "早饭", "dog")),
      ];
    return { kind: "merge", items };
  }
  if (id === "e3-p1") return { kind: "arrows", dim, words: lang === "ja" ? ["breakfast", "parking"] : ["早饭", "停车"] };
  if (id === "e3-p2") return { kind: "circle", dim };
  if (id === "e3-p3" || id === "e3-p4") {
    const items = lang === "ja"
      ? [
        linked("ja", "breakfast", "morning meal", pts("en", "breakfast", "morning meal")),
        linked("ja", "breakfast", "lunch", pts("en", "breakfast", "lunch")),
        linked("ja", "dog", "swim", pts("en", "dog", "swim")),
      ]
      : [
        linked("zh", "早饭", "早餐", pts("zh", "早饭", "早餐")),
        linked("zh", "早饭", "午饭", pts("zh", "早饭", "午饭")),
        linked("zh", "狗", "游泳", pts("zh", "狗", "游泳")),
      ];
    if (id === "e3-p3") return { kind: "angles", items };
    const picture = { kind: "ruler", items, marks: [100, 50, 0] };
    if (lang === "zh") {
      const card = ragZh.meaning.card_pair_closeness.find((pair) => pair.pages[0] === 4 && pair.pages[1] === 5);
      if (!card) throw new Error("missing rag card pair 4-5");
      picture.card = { pages: card.pages.slice(), points: card.score_x100, label: "早饭卡–晚饭卡" };
    }
    return picture;
  }
  if (id === "e3-p5") {
    const meaning = topOf(parking, lang === "ja" ? 2 : 3);
    const sides = lang === "ja"
      ? [
        linked("ja", "park", "parking", pts("rag_link_words", "park", "parking")),
        linked("ja", "swim", "swimming", pts("en", "swim", "swimming")),
        linked("ja", "dog", "dogs", pts("en", "dog", "dogs")),
      ]
      : [
        linked("zh", "车", "停车场", pts("rag_link_words", "车", "停车场")),
        linked("zh", "游泳", "游泳池", pts("rag_link_words", "游泳", "游泳池")),
        linked("zh", "带狗", "小狗", pts("rag_link_words", "带狗", "小狗")),
      ];
    const wordMatch = ragZh.word_match.questions.find((item) => item.id === "q4_parking");
    if (!wordMatch.top3.every((row) => row.score_x100 === 0)) throw new Error("word match not zero");
    return { kind: "quest", meaning, sides, wordMatch: 0, gap: meaning[0].points - meaning[1].points };
  }
  if (id === "e4-p1") return { kind: "rulers", dim };
  if (id === "e4-p2") {
    const ratio = data.map_explained_variance_ratio[key];
    if (ratio[0] + ratio[1] >= 0.5) throw new Error(`variance not under half ${key}`);
    return { kind: "squash", count: data.words[key].length };
  }
  if (id === "e4-p3" || id === "e4-p4") {
    const closest = data.map_closest_pairs[key];
    const near = (a, b) => {
      const hit = closest.find((pair) => (pair.a === a && pair.b === b) || (pair.a === b && pair.b === a));
      if (!hit) throw new Error(`closest ${key} ${a} ${b}`);
      return hit.points;
    };
    const pairs = lang === "ja"
      ? [
        linked("ja", "dog", "dogs", near("dog", "dogs")),
        linked("ja", "dog", "cat", near("dog", "cat")),
      ]
      : [
        linked("zh", "狗", "小狗", near("狗", "小狗")),
        linked("zh", "猫", "入住", near("猫", "入住")),
      ];
    return { kind: id === "e4-p3" ? "lift" : "trust", mapKey: key, items: pairs };
  }
  if (id === "e4-p5") {
    const words = lang === "ja" ? ["breakfast", "swimming pool", "towel"] : ["早饭", "游泳池", "毛巾"];
    return {
      kind: "fly",
      items: words.map((word) => {
        const card = cardsOf(data, key, word, 1)[0];
        return { ...scored(lang, word, card.points), page: card.page, title: card.title };
      }),
    };
  }
  if (id === "e5-p1") {
    const word = lang === "ja" ? "cat" : "猫";
    const also = lang === "ja" ? pts("en", "cat", "dog") : pts("zh", "猫", "狗");
    return {
      kind: "rank",
      focus: showLabel(lang, word),
      word,
      items: neighboursOf(data, key, word).map((item) => scored(lang, item.word, item.points)),
      also,
    };
  }
  if (id === "e5-p2") {
    if (lang === "ja") {
      return {
        kind: "kana",
        items: [
          linked("ja", "犬", "dog", pts("cross_language", "犬", "dog")),
          linked("ja", "いぬ", "dog", pts("cross_language", "いぬ", "dog")),
          linked("ja", "猫", "cat", pts("cross_language", "猫", "cat")),
          linked("ja", "ねこ", "cat", pts("cross_language", "ねこ", "cat")),
          linked("ja", "駐車場", "parking lot", pts("cross_language", "駐車場", "parking lot")),
          linked("ja", "ちゅうしゃじょう", "parking lot", pts("cross_language", "ちゅうしゃじょう", "parking lot")),
          linked("ja", "いぬ", "犬", pts("cross_language", "いぬ", "犬")),
        ],
      };
    }
    const near = neighboursOf(data, "zh", "停车");
    return {
      kind: "rank",
      focus: "停车",
      word: "停车",
      items: [
        ...near.map((item) => scored("zh", item.word, item.points)),
        scored("zh", "停车场", pts("zh", "停车", "停车场")),
      ],
    };
  }
  if (id === "e5-p3") {
    if (lang === "ja") {
      const alone = cardsOf(data, "en", "car", 1)[0];
      return {
        kind: "needles",
        alone: { label: showLabel("ja", "car"), page: alone.page, points: alone.points },
        sentence: topOf(parking, 2),
        gap: topOf(parking, 2)[0].points - topOf(parking, 2)[1].points,
      };
    }
    const alone = cardsOf(data, "zh", "停车", 3);
    const sentence = topOf(parking, 1)[0];
    const line = Math.round(ragZh.settings.no_card_threshold.meaning * 100);
    return {
      kind: "needles",
      alone: alone.map((card) => ({ label: card.title, page: card.page, points: card.points })),
      sentence: [sentence],
      line,
      gap: sentence.points - meaningSecond(parking),
    };
  }
  if (id === "e5-p4") {
    const fresh = oldNew.with_new_page4_top3[0].score_x100;
    const aged = oldNew.with_old_page4_top3[0].score_x100;
    if (fresh !== oldNew.with_new_page4_top3[0].score_x100) throw new Error("page4");
    return { kind: "oldnew", page: 4, old: aged, fresh };
  }
  if (id === "e5-p5") return { kind: "rules", lines: [] };
  throw new Error(`no picture for ${id} ${lang}`);
}

function meaningSecond(block) {
  return block.top3[1].score_x100;
}

function pageCopy(section, lang) {
  const blocks = section.blocks;
  if (section.kind === "sum") {
    const points = linesOf(section.body).slice(0, 5);
    while (points.length < 3) points.push(points[0] || "まとめ");
    return {
      bubble: lang === "ja" ? "この章で おぼえる こと" : "这一章记住这几句",
      aim: points[0],
      look: points.join("\n"),
      action: lang === "ja" ? "声に 出して 言ってみよう。" : "出声说一遍。",
      summary: points.join("\n"),
      talk: points[0],
      checkQ: lang === "ja" ? "この章の こと" : "这一章的话",
      checkA: points.join("\n"),
      vo: points[0],
      art: points[0],
      stars: points.slice(0, 3),
      quiz: false,
    };
  }
  if (section.kind === "rev") {
    const stars = linesOf(section.body).filter((line) => !/次の章|下一章/.test(line)).slice(0, 3);
    while (stars.length < 3) stars.push(stars[0] || "⭐");
    return {
      bubble: lang === "ja" ? "ふりかえろう" : "回头看一看",
      aim: stars[0],
      look: stars.join("\n"),
      action: lang === "ja" ? "できた ところに ⭐" : "做到的点上星星",
      summary: stars.join("\n"),
      talk: stars[0],
      checkQ: lang === "ja" ? "できた ところ" : "能做到的",
      checkA: stars.join("\n"),
      vo: stars[0],
      art: "⭐",
      stars,
      quiz: false,
    };
  }
  if (section.kind === "intro") {
    const look = blocks.look || section.title;
    const talk = blocks.talk || look;
    const aim = firstSentence(talk);
    return {
      bubble: firstSentence(look),
      aim,
      look,
      action: talk,
      summary: aim,
      talk,
      checkQ: lang === "ja" ? "この ページの 話" : "这一页在说什么",
      checkA: aim,
      vo: firstSentence(talk),
      art: blocks.art || firstSentence(look),
      stars: [],
      quiz: false,
    };
  }
  const quiz = splitQuiz(blocks.check || "", lang);
  const bubble = blocks.bubble || firstSentence(blocks.talk || blocks.aim || section.title);
  const aim = blocks.aim || firstSentence(blocks.summary || bubble);
  const talk = blocks.talk || aim;
  const look = blocks.look || aim;
  const summary = blocks.summary || aim;
  if (!quiz.q || !quiz.a) throw new Error(`quiz missing ${lang} ${section.kind} ${section.title}`);
  return {
    bubble,
    aim,
    look,
    action: blocks.action || aim,
    summary,
    talk,
    checkQ: quiz.q,
    checkA: quiz.a,
    vo: blocks.vo || firstSentence(talk),
    art: blocks.art || firstSentence(look),
    stars: [],
    quiz: true,
  };
}

const MYTH = {
  zh: {
    1: "颜色只是开头 8 格。后面还有很多格。",
    2: "地图是压扁的影子。挨着不等于近。",
    3: "近分看的是方向。箭头要先变成一样长。",
    4: "看分，不看地图上挨得近不近。",
    5: "最高分也会错。要问整句，多拿几张卡。",
  },
  ja: {
    1: "色は はじめの 8こだけ。うしろに まだ たくさん あります。",
    2: "地図は ぺちゃんこの かげ。となりでも 近いとは かぎりません。",
    3: "点数は 向きを 見ます。矢の 長さを 先に そろえます。",
    4: "地図の となりより、点数を 見ます。",
    5: "いちばん 高い 点数でも まちがう ことが あります。",
  },
};

function pseudoLines(copy, lang, chapter) {
  const bits = [copy.action, copy.summary, copy.aim, copy.bubble].map((line) => firstSentence(line)).filter(Boolean);
  while (bits.length < 4) bits.push(bits[0]);
  return {
    does: firstSentence(copy.action),
    metaphor: firstSentence(copy.art),
    myth: MYTH[lang][chapter] || MYTH[lang][1],
    l1: bits[0],
    l2: bits[1],
    l3: bits[2],
    l4: bits[3],
  };
}

function longTitle(h1) {
  return String(h1 || "").replace(/^#\s*/, "").replace(/^第\s*\d+\s*章[　\s]*/, "").trim();
}

const SHORT = {
  zh: ["变数字", "住得近", "怎么量", "压扁了", "会弄错"],
  ja: ["数字に", "近くに", "はかる", "ぺちゃんこ", "まちがえ"],
};

const CHROME = {
  zh: {
    appTitle: "小G的词向量",
    subtitle: "词怎么变成一排数字",
    bubble: "小窗里有什么？",
    tapeCaption: "词的地图",
    talkLabel: "小G的话",
    endTitle: "词向量守则学会啦",
    endSpeech: "看分，不看地图。",
    catalogLead: "五章都能进。分数都是真的电脑算出来的。",
    "guide.1.title": "打开小窗",
    "guide.1.body": "一个词进去，出来一排数字，画成彩色带子。",
    "guide.2.title": "近分",
    "guide.2.body": "意思像，分数就高。地图只是压扁的影子。",
    "guide.3.title": "也会弄错",
    "guide.3.body": "最高分不一定对。问整句话，多拿几张卡。",
    "note.vector.term": "向量",
    "note.vector.blurb": "一排数字。",
    "note.vector.note": "这里每个词都是 384 个数字。",
    "note.embed.term": "词向量",
    "note.embed.blurb": "词变出来的一排数字。",
    "note.embed.note": "和 RAG 书里的「意思的地址」是同一种东西。",
    "note.near.term": "近分",
    "note.near.blurb": "两个词有多近。",
    "note.near.note": "满分 100。分越高越近。",
    "note.angle.term": "角",
    "note.angle.blurb": "两根箭头张开的口。",
    "note.angle.note": "口越小越近。直角大约是 0 分。",
    "note.ruler.term": "尺子",
    "note.ruler.blurb": "量方向的线。",
    "note.ruler.note": "纸上只能画 2 根。真正的箭头住在 384 根尺子里。",
    "note.flat.term": "压扁",
    "note.flat.blurb": "很多尺子的影子，落在纸上。",
    "note.flat.note": "地图是压扁的。挨着不等于近。",
    "note.maker.term": "变数字的人",
    "note.maker.blurb": "坐在蓝帽子小窗里的助手。",
    "note.maker.note": "它把词变成一排数字。它也会弄错。",
    "note.class.term": "老师和学生",
    "note.class.blurb": "老师只会英文。学生照着学。",
    "note.class.note": "同一个意思，要给差不多的数字。",
    "etitle.bubble": "打开小窗看看？",
    "etitle.aim": "小G接着 RAG 课，看词怎么变成数字。",
    "etitle.look": "酒店是编的。分数是电脑算的。",
    "etitle.action": "点开始，去第 1 章。",
    "etitle.summary": "词变成一排数字，近的住得近。",
    "etitle.checkQ": "一个词进小窗，出来的是什么？",
    "etitle.checkA": "一排数字。",
    "etitle.vo": "小G打开蓝帽子的小窗，看一个词怎么变成一排数字。",
    "eend.bubble": "学会啦。",
    "eend.aim": "词向量守则：看分，不看地图。",
    "eend.look": "最高分也会错。问整句，多拿几张卡。",
    "eend.action": "回目录，可以再看每一章。",
    "eend.summary": "近，不等于答案对。卡片要常换新。",
    "eend.checkQ": "地图上挨着，就一定近吗？",
    "eend.checkA": "不一定。要看近分。",
    "eend.vo": "看近分，不看地图。问整句话，多拿几张卡。",
  },
  ja: {
    appTitle: "ジーくんの ベクトル",
    subtitle: "ことばが 数字の ならびに なる",
    bubble: "まどの 中は なに？",
    tapeCaption: "ことばの 地図",
    talkLabel: "ジーくんのことば",
    endTitle: "ベクトルの きまり おぼえた",
    endSpeech: "点数を 見て、地図は 見ない。",
    catalogLead: "5つの 章に 入れます。点数は ぜんぶ ほんとうに 計算した 数です。",
    "guide.1.title": "まどを あける",
    "guide.1.body": "語が 入ると、数字の ならびが 出て、色の おびに なります。",
    "guide.2.title": "近さの 点数",
    "guide.2.body": "いみが にて いると 点数は 高い。地図は ぺちゃんこの かげです。",
    "guide.3.title": "まちがえる",
    "guide.3.body": "いちばん 高くても まちがう ことが あります。文で 聞いて、何まいも とります。",
    "note.vector.term": "ベクトル",
    "note.vector.blurb": "数字の ならび。",
    "note.vector.note": "ここは どの 語も 384こ です。",
    "note.embed.term": "単語ベクトル",
    "note.embed.blurb": "語から できた 数字の ならび。",
    "note.embed.note": "RAG の 本の「いみの じゅうしょ」と 同じ ものです。",
    "note.near.term": "近さの 点数",
    "note.near.blurb": "2つの 語が どれだけ 近いか。",
    "note.near.note": "100てんが まんてん。高いほど 近い。",
    "note.angle.term": "角",
    "note.angle.blurb": "2本の 矢が ひらく 口。",
    "note.angle.note": "口が 小さいほど 近い。直角は およそ 0てんです。",
    "note.ruler.term": "ものさし",
    "note.ruler.blurb": "向きを はかる 線。",
    "note.ruler.note": "紙には 2本しか 描けません。矢は 384本の 中に います。",
    "note.flat.term": "ぺちゃんこ",
    "note.flat.blurb": "たくさんの ものさしの かげ。",
    "note.flat.note": "地図は ぺちゃんこです。となりでも 近いとは かぎりません。",
    "note.maker.term": "数字に する 人",
    "note.maker.blurb": "青い ぼうしの まどに いる 人。",
    "note.maker.note": "語を 数字の ならびに します。まちがえる ことも あります。",
    "note.class.term": "先生と 生徒",
    "note.class.blurb": "先生は 英語だけ。生徒は それを 見習います。",
    "note.class.note": "同じ いみには、にた 数字を 出します。",
    "etitle.bubble": "まどを あけて みる？",
    "etitle.aim": "ジーくんは RAG の つづきで、語が 数字に なる ところを 見ます。",
    "etitle.look": "ホテルは つくり話。点数は コンピューターが 計算した 数です。",
    "etitle.action": "スタートを 押して、第1章へ。",
    "etitle.summary": "語は 数字の ならび。にた いみは 近くに すむ。",
    "etitle.checkQ": "語が まどに 入ると、何が 出る？",
    "etitle.checkA": "数字の ならび。",
    "etitle.vo": "ジーくんは 青い ぼうしの まどを あけて、語が 数字の ならびに なる ところを 見ます。",
    "eend.bubble": "できたね。",
    "eend.aim": "ベクトルの きまり。点数を 見て、地図は 見ない。",
    "eend.look": "いちばん 高くても まちがう ことが あります。文で 聞いて、何まいも とります。",
    "eend.action": "目次に 戻って、もう 一度 見られます。",
    "eend.summary": "近くても、こたえが 正しいとは かぎりません。カードは 新しい ままに。",
    "eend.checkQ": "地図で となりなら、近い？",
    "eend.checkA": "かぎりません。点数を 見ます。",
    "eend.vo": "点数を 見て、地図は 見ません。文で 聞いて、何まいも とります。",
  },
};

function pointSet(data) {
  const pts = new Set([0, 8, 12, 20, 30, 50, 100, 384, 1, 2, 3, 4, 5, 7]);
  const walk = (node) => {
    if (!node || typeof node !== "object") return;
    if (typeof node.points === "number") pts.add(node.points);
    if (typeof node.score_x100 === "number") pts.add(node.score_x100);
    for (const value of Object.values(node)) walk(value);
  };
  walk(data);
  for (const matrix of Object.values(data.similarity_matrix || {})) {
    for (const row of Object.values(matrix)) {
      if (!row || typeof row !== "object") continue;
      for (const value of Object.values(row)) {
        if (typeof value === "number") pts.add(Math.round(value * 100));
      }
    }
  }
  return pts;
}

function assertCopy(text, lang, allowed, label) {
  const kid = String(text)
    .split("\n")
    .filter((line) => !line.startsWith("|") && !line.startsWith(">"))
    .join("\n");
  if (kid.includes("→") || kid.includes("->")) throw new Error(`${label} arrow`);
  if (/(?<![\d:.])-?\d+\.\d+/.test(kid)) throw new Error(`${label} decimal`);
  if (/(?<![\d.])-\d+/.test(kid)) throw new Error(`${label} negative`);
  const unit = lang === "ja" ? "てん" : "分";
  const re = new RegExp(`(\\d+)\\s*${unit}`, "g");
  let match = re.exec(kid);
  while (match) {
    const n = Number(match[1]);
    if (!allowed.has(n)) throw new Error(`${label} unknown ${n}${unit}`);
    match = re.exec(kid);
  }
  if (lang === "ja") {
    for (const line of kid.split("\n")) {
      if (line.includes("度で")) continue;
      for (const n of [45, 71, 83, 37]) {
        if (new RegExp(`(?<!\\d)${n}\\s*てん`).test(line)) throw new Error(`${label} old ja rag score ${n}`);
      }
    }
  }
}

function assertPicture(spec, allowed, lang, id) {
  const visit = (node) => {
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    if (!node || typeof node !== "object") return;
    for (const value of Object.values(node)) {
      if (typeof value === "number") {
        if (!Number.isInteger(value) || value < 0 || !allowed.has(value)) {
          throw new Error(`${id} ${lang} picture number ${value}`);
        }
      } else visit(value);
    }
  };
  visit(spec);
  if (lang === "ja") {
    const blob = JSON.stringify(spec);
    for (const n of [45, 71, 83, 37]) {
      if (new RegExp(`"points":${n}(?!\\d)`).test(blob)) throw new Error(`${id} ja shows old ${n}`);
    }
  }
}

function buildLocale(lang, chapters, data, ragZh, allowed) {
  const pack = { ...CHROME[lang] };
  for (let n = 1; n <= 5; n += 1) pack[`level${n}Title`] = "";
  const pages = [];
  chapters.forEach((chapter, index) => {
    const chapterNo = index + 1;
    const title = longTitle(chapter.h1);
    pack[`level${chapterNo}Title`] = title;
    pack[`chapter.${chapterNo}.title`] = title;
    pack[`chapter.${chapterNo}.short`] = SHORT[lang][index];
    pack[`chapter.${chapterNo}.blurb`] = firstSentence(chapter.sections[0]?.blocks?.talk || title);
    chapter.sections.forEach((section) => {
      const id = `e${chapterNo}-${section.kind}`;
      const copy = pageCopy(section, lang);
      const picture = pictureFor(id, lang, data, ragZh);
      if (picture.kind === "rules") picture.lines = (section.kind === "sum" ? copy.stars : linesOf(section.body).slice(0, 4));
      if (id === "e5-p5") {
        picture.lines = lang === "ja"
          ? ["点数を 見る", "1いでも まちがう", "文で 聞いて 何まいも", "近くても 正解とは かぎらない"]
          : ["看分不看地图", "最高分也会错", "问整句，多拿几张", "近不等于答案对"];
      }
      assertPicture(picture, allowed, lang, id);
      for (const suffix of ["bubble", "aim", "look", "action", "summary", "talk", "checkQ", "checkA", "vo", "art"]) {
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
  for (const id of ["etitle", "eend"]) {
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
  const joined = Object.values(pack).join("\n");
  assertCopy(joined, lang, allowed, `${lang} pack`);
  return { pack, pages };
}

function shellPage(id) {
  return {
    id,
    chapter: 0,
    kind: id,
    course: "embed",
    visual: "embed",
    shared: { visual: "embed" },
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

const data = loadJson(join(embedRoot, "demo/results.json"));
const ragZh = loadJson(join(root, "rag/demo/results_zh.json"));
const ragEn = loadJson(join(root, "rag/demo/results.json"));
const zhBook = parseBook(readFileSync(join(embedRoot, "script/zh.md"), "utf8"));
const jaBook = parseBook(readFileSync(join(embedRoot, "script/ja.md"), "utf8"));
if (zhBook.length !== 5 || jaBook.length !== 5) throw new Error(`chapters zh=${zhBook.length} ja=${jaBook.length}`);

const allowed = pointSet(data);
pointSet(ragZh).forEach((n) => allowed.add(n));
pointSet(ragEn).forEach((n) => allowed.add(n));
allowed.add(Math.round(ragEn.settings.no_card_threshold.meaning * 100));
allowed.add(Math.round(ragZh.settings.no_card_threshold.meaning * 100));
allowed.add(Math.round(ragEn.settings.no_card_threshold.word_match * 100));
for (const n of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 20, 30, 50, 71, 100, 384]) allowed.add(n);
const zhScript = readFileSync(join(embedRoot, "script/zh.md"), "utf8");
const jaScript = readFileSync(join(embedRoot, "script/ja.md"), "utf8");
assertCopy(zhScript, "zh", allowed, "zh.md");
assertCopy(jaScript, "ja", allowed, "ja.md");
const jaKid = jaScript.split("\n").filter((line) => !line.startsWith("|") && !line.startsWith(">")).join("\n");
if (jaKid.includes("RAG の 本の 人") || jaKid.includes("べつの 人")) throw new Error("ja second maker");

const zhRe = data.rag_link.parking_recomputed_here.zh.top3.map((row) => row.score_x100).join(",");
const ragMeaning = ragZh.meaning.questions.find((item) => item.id === "q4_parking").top3.map((row) => row.score_x100).join(",");
if (zhRe !== ragMeaning) throw new Error(`zh parking drift ${zhRe} ${ragMeaning}`);
const zhOld = data.rag_link.old_page4_recomputed_here.zh.with_new_page4_top3[0].score_x100;
const ragOld = ragZh.meaning.experiment_old_page4.result.top3[0].score_x100;
if (zhOld !== ragOld) throw new Error(`old page4 drift ${zhOld} ${ragOld}`);
if (ragEn.word_match.questions.find((item) => item.id === "q4_parking").top3.some((row) => row.score_x100 !== 0)) {
  throw new Error("en word match not zero");
}
const enPark = ragEn.meaning.questions.find((item) => item.id === "q4_parking").top3.map((row) => row.score_x100);
const embedPark = data.rag_link.parking_recomputed_here.en.top3.map((row) => row.score_x100);
if (enPark.join(",") !== embedPark.join(",")) throw new Error(`en parking drift rag=${enPark} embed=${embedPark}`);
const enOld = ragEn.meaning.experiment_old_page4.result.top3[0].score_x100;
const enNew = ragEn.meaning.questions.find((item) => item.id === "q1_breakfast").top3[0].score_x100;
const embedOld = data.rag_link.old_page4_recomputed_here.en.with_old_page4_top3[0].score_x100;
const embedNew = data.rag_link.old_page4_recomputed_here.en.with_new_page4_top3[0].score_x100;
if (enOld !== embedOld || enNew !== embedNew) throw new Error(`en page4 drift rag=${enOld}/${enNew} embed=${embedOld}/${embedNew}`);
const pair45 = ragEn.meaning.card_pair_closeness.find((pair) => pair.pages[0] === 4 && pair.pages[1] === 5);
if (!pair45) throw new Error("missing card pair 4-5");
const jaKidBook = jaScript.split("\n").filter((line) => !line.startsWith("|") && !line.startsWith(">")).join("\n");
const jaClaims = [
  [`36てん`, enPark[0] === 36 && enPark[1] === 32],
  [`32てん`, enPark[1] === 32],
  [`古い カードは **70てん**、新しい カードは **72てん**`, enOld === 70 && enNew === 72],
  [`81てん`, pair45.score_x100 === 81],
  [`RAG の 本の 線（${Math.round(ragEn.settings.no_card_threshold.meaning * 100)}てん）`, true],
];
for (const [text, good] of jaClaims) {
  if (!jaKidBook.includes(text)) throw new Error(`ja.md missing RAG claim ${text}`);
  if (!good) throw new Error(`ja.md RAG claim does not match results.json ${text}`);
}

const zhBuilt = buildLocale("zh", zhBook, data, ragZh, allowed);
const jaBuilt = buildLocale("ja", jaBook, data, ragZh, allowed);
if (zhBuilt.pages.length !== 40 || jaBuilt.pages.length !== 40) {
  throw new Error(`pages zh=${zhBuilt.pages.length} ja=${jaBuilt.pages.length}`);
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
    talk: `${page.id}.talk`,
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
    course: "embed",
    quiz: page.quiz,
    visual: "embed",
    shared: {
      visual: "embed",
      locales: { zh: page.picture, ja: other.picture },
    },
    exampleSlots: null,
    keys,
  };
});

const counts = [1, 2, 3, 4, 5].map((chapter) => skeleton.filter((page) => page.chapter === chapter).length);
if (counts.join(",") !== "8,8,8,8,8") throw new Error(`counts ${counts}`);

const angles = {};
for (const group of ["zh", "en", "cross_language", "rag_link_words"]) {
  for (const pair of data.pairs[group]) {
    angles[`${group}:${pair.a}|${pair.b}`] = pair.angle_deg;
    angles[`${group}:${pair.b}|${pair.a}`] = pair.angle_deg;
  }
}
const facts = {
  dimension: data.dimension,
  gloss: JA_GLOSS,
  bands: Object.fromEntries(Object.entries(data.raw_example).map(([word, row]) => [word, bandsOf(row)])),
  angles,
  map: data.map_2d,
  variance: data.map_explained_variance_ratio,
};
writeFileSync(factsPath, `/** Generated by game/scripts/build-embed-lesson.mjs from embed/demo/results.json. */\nexport const EMBED_FACTS = ${JSON.stringify(facts, null, 2)};\n`);
writeFileSync(join(outDir, "skeleton.js"), `/** Generated by game/scripts/build-embed-lesson.mjs. Picture numbers are copied from embed/demo/results.json. */\nexport const EMBED_PAGES = ${JSON.stringify(skeleton, null, 2)};\n\nexport const EMBED_TITLE = ${JSON.stringify(shellPage("etitle"), null, 2)};\nexport const EMBED_END = ${JSON.stringify(shellPage("eend"), null, 2)};\n\nexport function embedPagesFor(chapter) {\n  return EMBED_PAGES.filter((page) => page.chapter === chapter);\n}\n`);
writeFileSync(join(outDir, "zh.js"), `/** Generated by game/scripts/build-embed-lesson.mjs from embed/script/zh.md. */\nexport const EMBED_ZH = ${JSON.stringify(zhBuilt.pack, null, 2)};\n`);
writeFileSync(join(outDir, "ja.js"), `/** Generated by game/scripts/build-embed-lesson.mjs from embed/script/ja.md. */\nexport const EMBED_JA = ${JSON.stringify(jaBuilt.pack, null, 2)};\n`);

for (const [lang, built] of [["zh", zhBuilt], ["ja", jaBuilt]]) {
  for (const [key, value] of Object.entries(built.pack)) {
    const text = String(value);
    if (!text.trim()) throw new Error(`empty ${lang} ${key}`);
    if (text.includes("`") || text.includes("【") || text.includes("】") || text.includes("\n\n---")) {
      throw new Error(`junk ${lang} ${key}`);
    }
    if (key.endsWith(".art") && text.length < 8 && text !== "⭐") throw new Error(`short art ${lang} ${key} ${text}`);
  }
}
console.log(`EMBED_BUILD pages=${skeleton.length} zhKeys=${Object.keys(zhBuilt.pack).length} jaKeys=${Object.keys(jaBuilt.pack).length}`);
