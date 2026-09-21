import { DATASET, DEMO_NEXT_CHAR, DEMO_SNIPPET, VOCAB_SIZE } from "./facts.js";

/** 每一课五个小块。一块只讲一个意思，句子要短。 */
export const LESSON_PHASES = [
  { id: "goal", label: "干什么", kicker: "干什么" },
  { id: "why", label: "为什么", kicker: "为什么" },
  { id: "example", label: "小例子", kicker: "完整小例子" },
  { id: "myth", label: "误会", kicker: "常见误会" },
  { id: "remember", label: "记住", kicker: "一句话记住" },
];

export const PHASE_COUNT = LESSON_PHASES.length;

const L1 = [
  {
    id: "tape",
    purpose: "把台词拉成一条纸带",
    caption: "一个字，占一格",
    mood: "point",
    goal: "把一句台词拆开。一个字符占一格。按出现的顺序，排成一条纸带。",
    why: "电脑不能一口看懂整句。它一次只看一格。",
    example: `这句是 Second Citizen: 再加一个换行。一共 ${DEMO_SNIPPET.length} 格。空格占一格。换行也占一格，写成 ↵。Citizen 是 8 格，不是 1 个词。`,
    myths: ["不是按单词切开。Citizen 要拆成 8 个字符。", "空格和换行也是格子，不是装饰。"],
    remember: "台词先变成「一个字一格」的纸带。",
    footnote: "整部莎翁剧本，就是这样一长串字符。",
  },
  {
    id: "plates",
    purpose: "每个字符领一张号码牌",
    caption: "一字一号",
    vo: "vo-level1",
    mood: "talk",
    note: "bpe",
    goal: "每个字符领一张整数号码牌。电脑只认这张牌。",
    why: "字是给人看的。号码是给电脑用的。先换成号码，后面才能排队、剪开、打分。",
    example:
      "看下面这一排。S 领 31，e 领 43，空格领 1，换行领 0。16 个字符，就有 16 张牌。牌上的数字不是这个字的意思。",
    myths: ["另一种切法叫 BPE，会把词切成小碎块。这一课不用。这里一个字符一张牌。", "号码不是意思。31 不表示 S 更重要。"],
    remember: "一个字符，一张号码牌。",
    footnote: "把字换成号码，这一步叫编码。",
  },
  {
    id: "seats",
    purpose: "号码只是座位号",
    caption: "43 不是性格",
    vo: "vo-map",
    mood: "talk",
    note: "plates",
    goal: "号码只是座位号。不是这个字的性格，也不是重要性。",
    why: "如果把 43 当成「更重要」，后面的罚分就会算乱。座位号只用来排队。",
    example: "这句里有两个 e。Second 里的 e，Citizen 里的 e。两张牌都是 43。同一个字，同一张牌。跟它站在第几格无关。",
    myths: ["号码大，不代表更高级。64 的 z，不比 0 的换行重要。", "43 不是 e 的脾气。43 是 e 的座位。"],
    remember: "号码是座位号，不是意思。",
    footnote: "从号码找回字符，把同一张表倒过来查。",
  },
  {
    id: "sixtyfive",
    purpose: "本局只有 65 张字符牌",
    caption: "只数这套剧本",
    vo: "vo-reuse",
    mood: "talk",
    goal: "不同的字符，一共 65 张牌。名单要先定死。",
    why: "后面每道「猜下一个」，都从这同一份名单里选。剧本里没出现过的字，不进名单。",
    example: `换行 1 张，空格 1 张，标点 11 张，大写 26 张，小写 26 张。加起来是 ${VOCAB_SIZE}。没有汉字，也没有表情符号。`,
    myths: ["不是全世界的字。没出现过的，牌里就没有。", "不是巨大的聊天词表。这一课只有这 65 张。"],
    remember: "这一课的字符牌，只有 65 张。",
    footnote: "这个数字写成 vocab_size，意思是名单有多长。这里是 65。",
  },
  {
    id: "scrolls",
    purpose: "纸带切成练习卷和验收卷",
    caption: "验收卷用来抽查",
    mood: "point",
    note: "scrolls",
    goal: "同一条纸带切开。九成是练习卷，用来学。一成是验收卷，用来抽查。",
    why: "同一页又学又考，等于把答案背下来。留出一成，才知道是真会了。",
    example: `整条纸带有 ${DATASET.chars.toLocaleString("zh-CN")} 个字符。练习卷 ${DATASET.trainTokens.toLocaleString("zh-CN")}。验收卷 ${DATASET.valTokens.toLocaleString("zh-CN")}。验收卷上没有印着答案。`,
    myths: ["验收卷不是答题纸。它是用来抽查的另一段纸带。", "不是两本书。是同一条纸带，大约按 9 比 1 切开。"],
    remember: "九成用来学，一成用来抽查。",
    footnote: "练习卷存在 train.bin。验收卷存在 val.bin。里面是号码，不是字形。",
  },
];

const L2 = [
  {
    id: "clip",
    purpose: "每次随手剪一段来看",
    caption: "不要总从开头读",
    vo: "vo-level2",
    mood: "point",
    goal: "从长纸带的中间，随手剪一小段。不要每次都从第一行读起。",
    why: "老从开头读，电脑会只记开头那几句。随机剪一段，才会看见中间的句子。",
    example:
      "前面还有很长，写成 …。我们剪到的是 Second Citizen:↵。这一小段是 16 格。真训练时，剪的窗会更长。这里剪短，是为了看清每一格。",
    myths: ["不是每次都从剧本第一行开始。", "16 格只是这一课的演示。不是唯一的长度。"],
    remember: "每次从纸带上随手剪一段。",
    footnote: "先随机选一个起点，再按这个长度把纸带剪下来。",
  },
  {
    id: "seen",
    purpose: "x 是现在看见的牌",
    caption: "手里的线索叫 x",
    mood: "talk",
    goal: "剪下来的这一小段，叫做 x。x 就是现在看见的牌。",
    why: "猜下一个字之前，要先说清手里有什么。没有线索，就是瞎猜。",
    example: "x 就是 Second Citizen:↵ 的 16 张牌。从 S（31）一直到换行（0）。它还不是答案。它只是线索。",
    myths: ["x 不是答案。答案在右边那一格。", "x 不是整部剧本。只是剪下来的一小段。"],
    remember: "x ＝ 现在看见的牌。",
    footnote: "x 是交给模型看的那一小段。",
  },
  {
    id: "shift",
    purpose: "答案往右挪一格",
    caption: "看见这张，猜右边那张",
    vo: "vo-shift",
    mood: "point",
    note: "shift",
    goal: "把答案整段往右挪一格，得到 y。看见这一张，就猜它右边那一张。",
    why: "只说「猜下一个」还不够清楚。整段一起挪，每一格的答案就对齐了。",
    example: `看见 S，右边是 e，所以第一格的答案是 e。看见换行，右边是 ${DEMO_NEXT_CHAR}。下一句从 We 开始。y 就是这些「右边的字」排成的一排。`,
    myths: ["y 不是另一段无关的字。它就是 x 往右挪一格。", "不是打乱顺序，也不是换成另一句。"],
    remember: "看见这张，猜右边那张。",
    footnote: "y 的每一格，都是 x 右边的那一张牌。",
  },
  {
    id: "blanks",
    purpose: "每个位置都在问下一字",
    caption: "16 格就是 16 道题",
    vo: "vo-next",
    mood: "talk",
    goal: "这 16 格是 16 道填空。不是只猜最后一个字。",
    why: "每一格都在问同一句话：下一个字符是谁？后面打分，会把 16 道都算上。",
    example: `第 1 空：看见 S，填 e。第 2 空：看见 e，填 c。第 16 空：看见换行，填 ${DEMO_NEXT_CHAR}。16 格，就是 16 题。`,
    myths: ["不是只猜最后一个字。", "不是把整句翻译成另一句。是一格一格地猜下一个。"],
    remember: "每个位置都在问：下一字？",
    footnote: "这种题叫「猜下一个字符」。",
  },
  {
    id: "choices",
    purpose: "每题都有 65 个候选",
    caption: "真答案只有一张牌",
    mood: "talk",
    goal: "每道填空都面对 65 张候选。真答案只有一张。",
    why: "答案必须从这副牌里出。像输入法列出下一个字。名单是固定的，只能点其中一张。",
    example: `猜 S 后面是谁。65 个字符都可能被点到。真的只有 e。空格、冒号、${DEMO_NEXT_CHAR}，这一题都不对。`,
    myths: ["不能写出名单以外的字。", "名单是 65 个字符，不是一堆英文单词。"],
    remember: "65 个候选，真答案只有一个。",
    footnote: "候选的个数，就是这 65 张字符牌。",
  },
  {
    id: "desk",
    purpose: "答案只放在评分桌上",
    caption: "y 用来对答案，不给偷看",
    mood: "react",
    note: "shift",
    goal: "y 只放在评分桌上。不塞进手里的线索。",
    why: "如果把答案也交给模型看，它就会偷看。卷面上只留线索。答案放在老师的桌上。",
    example: "上面一排是 x，现在看见的牌。下面一排是 y，用来对答案。不要把 y 再塞回去当线索。",
    myths: ["y 不放进模型当线索。", "评分桌不是第二份要看的纸带。"],
    remember: "y 只用来打分，不给偷看。",
    footnote: "y 是标准答案。只在打分的时候拿出来。",
  },
  {
    id: "surprise",
    purpose: "押得越少，错题分越大",
    caption: "只看真答案那一格",
    vo: "vo-loss",
    mood: "point",
    note: "penalty",
    goal: "打分只问一件事：真答案被押了多少把握？押得越少，猜错罚分越大。",
    why: "不是「对了 0 分、错了 1 分」。押对了但很犹豫，也要记一笔。只看真答案那一格高不高。",
    example: "第 1 空的真答案是 e。65 格里，只点亮 e。e 被押得很矮，罚分就大。e 被押得很稳，罚分就小。这里不写假的数字。",
    myths: ["不是猜错就固定扣 1 分。", "这一课不训练模型，也不编造罚分的数字。"],
    remember: "真答案押得越少，猜错罚分越大。",
    footnote: "这个算法叫交叉熵。我们口头叫「猜错罚分」。",
  },
  {
    id: "mean",
    purpose: "整段只看平均罚分",
    caption: "16 题加起来，再平均",
    mood: "talk",
    note: "penalty",
    goal: "16 道空各记一笔猜错罚分。加起来，再除以 16。只看这一个平均。",
    why: "只看一道题，可能刚好运气好。取个平均，才知道整段猜得稳不稳。",
    example: "从第 1 空到第 16 空，每空记一笔。加总，再除以 16。这里仍然不写出假的分数。这一课没有训练。",
    myths: ["不是只看最后一个空。", "通关不等于模型已经训练好。我们只把计分规则讲清楚。"],
    remember: "许多空一起算，只看平均罚分。",
    footnote: "把每一格的罚分求平均。没有新的题目。",
  },
];

export const LEVEL1_BEATS = L1;
export const LEVEL2_BEATS = L2;
export const SPINE_TOTAL = L1.length + L2.length;

export const TITLE_BEAT = {
  id: "title",
  purpose: "从一条长纸带讲起",
  caption: "从一条长纸带讲起",
  vo: "vo-title",
  mood: "talk",
  goal: "顺着看完：纸带、号码牌、右移一格、猜下一个、猜错罚分。",
  why: "一句口号记不住。每一课分开讲：干什么、为什么、一个小例子、一句误会、一句记住。",
  remember: "从一条长纸带讲起。",
};

export const END_BEAT = {
  id: "end",
  purpose: "纸带、号码牌、右移和罚分，都对上了",
  caption: "通关啦",
  vo: "vo-clear",
  mood: "react",
  goal: "你现在能自己讲完：纸带怎么拉，号码怎么领，答案怎么右移一格，罚分怎么算。",
  remember: "通关啦。下一课还没写。",
};

export function phaseText(beat, phase = 0) {
  const meta = LESSON_PHASES[phase] || LESSON_PHASES[0];
  if (meta.id === "goal") return beat.goal || beat.purpose;
  if (meta.id === "why") return beat.why || beat.caption;
  if (meta.id === "example") return beat.example || beat.caption;
  if (meta.id === "myth") return (beat.myths || []).join("\n");
  if (meta.id === "remember") return beat.remember || beat.caption;
  return beat.caption || "";
}

export function lessonCaption(beat, phase = 0) {
  const meta = LESSON_PHASES[phase] || LESSON_PHASES[0];
  if (meta.id === "remember") return beat.remember || beat.caption;
  if (meta.id === "goal") return beat.goal || beat.purpose;
  return beat.caption;
}
