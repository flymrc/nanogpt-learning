import { DATASET, DEMO_NEXT_CHAR, DEMO_SNIPPET, VOCAB_SIZE } from "./facts.js";

/** 每一拍都是一页课本：五个块。一拍只塞一个新想法。 */
export const LESSON_PHASES = [
  { id: "goal", label: "这一步", kicker: "这一步要干什么" },
  { id: "why", label: "为什么", kicker: "为什么需要这一步" },
  { id: "example", label: "例子", kicker: "具体例子走一遍" },
  { id: "myth", label: "误会", kicker: "常见误会" },
  { id: "remember", label: "记住", kicker: "一句话记住" },
];

export const PHASE_COUNT = LESSON_PHASES.length;

const L1 = [
  {
    id: "tape",
    purpose: "先把台词拉成一条长纸带",
    caption: "字挨着字，连成一条",
    mood: "point",
    goal: "先把一句台词拆成一个个字符，按出现顺序排成一条长纸带。",
    why: "电脑不能整句「看懂」。它要先看见每一个单独的字符。例如手机输入法，也是一个字一个字往外蹦，不是一口吞下一整句。",
    example:
      `例如这句莎翁台词：Second Citizen: 再加上换行。一共 ${DEMO_SNIPPET.length} 个字符。S-e-c-o-n-d、一个空格、C-i-t-i-z-e-n、冒号、换行。空格和换行也各占一格；换行写成 ↵。`,
    myths: ["不是按单词切开。Citizen 是 8 个字符，不是 1 个词。", "空格和换行不是装饰，它们也是纸带上的格子。"],
    remember: "台词先拉成「字挨着字」的纸带。",
    footnote: "整部莎士比亚剧本在数据里就是这样一长串字符。",
  },
  {
    id: "plates",
    purpose: "每个字符领一个号码牌",
    caption: "像通讯录，一字一号",
    vo: "vo-level1",
    mood: "talk",
    note: "bpe",
    goal: "每个字符领一张整数号码牌。电脑只认这张牌。",
    why: "电脑不认字形，只认号码。就像通讯录：名字给人看，号码给机器拨。这里大事：先把字变成号，后面才能排队、剪段、打分。",
    example:
      "走一遍 Second Citizen:↵。S→31，e→43，c→41，o→53，n→52，d→42，空格→1，C→15，i→47，t→58，i→47，z→64，e→43，n→52，冒号→10，换行→0。也就是说：16 个字符，16 张牌。",
    myths: ["GPT-2 其实用 BPE 切词，本课不用。本课是一个字符一张牌。", "号码不是含义。31 不表示 S 比较重要。"],
    remember: "一字一号，按字符领牌。",
    footnote: "源码脚注：encode() / stoi。",
  },
  {
    id: "seats",
    purpose: "号码只是座位号，不是角色性格",
    caption: "43 不代表脾气，只是座位",
    vo: "vo-map",
    mood: "talk",
    note: "plates",
    goal: "看清号码只是座位号，不是这个字的性格或重要性。",
    why: "如果把 43 当成「温柔」或「更重要」，后面评分会乱。号码只是方便排队的座位。",
    example:
      "例如这句话里有两个 e：Second 的 e，Citizen 的 e。它们都领 43。同一个字，同一张牌，跟它出现在第几格无关。",
    myths: ["大号码不是更重要。64 的 z 并不比 0 的换行更高级。", "43 不是 e 的脾气，只是座位号。"],
    remember: "号码＝座位号，不是含义。",
    footnote: "源码脚注：itos 只是反查表。",
  },
  {
    id: "sixtyfive",
    purpose: "本局只有 65 张字符牌",
    caption: "只限这套莎翁字符，不是宇宙词表",
    vo: "vo-reuse",
    mood: "talk",
    goal: "数清本局候选名单：一共只有 65 张不同的字符牌。",
    why: "后面每道填空都要面对同一份名单。名单必须先固定。这套莎翁剧本里出现过的字符才进表。",
    example: `把词表拆开数：换行 1 + 空格 1 + 标点 11 + 大写 26 + 小写 26 ＝ ${VOCAB_SIZE}。没有汉字，没有 emoji，也没有 GPT 那种几万词的大词表。`,
    myths: ["不是宇宙里所有字母。没出现过的字符，这副牌里就没有。", "不是 ChatGPT 的大词表。本局只有这 65 张。"],
    remember: "本局莎翁字符牌只有 65 张。",
    footnote: "源码脚注：vocab_size = 65。",
  },
  {
    id: "scrolls",
    purpose: "一卷分成练习卷和验收卷",
    caption: "验收卷用来抽查，不是答题纸",
    mood: "point",
    note: "scrolls",
    goal: "同一卷纸带拆成练习卷和验收卷：九成用来学，一成用来抽查。",
    why: "如果用同一页又学又考，会「背答案」。留一成出来抽查，才知道是真会了，还是只记住了练习页。",
    example: `整卷 ${DATASET.chars.toLocaleString("zh-CN")} 个字符。练习卷 ${DATASET.trainTokens.toLocaleString("zh-CN")}（九成），验收卷 ${DATASET.valTokens.toLocaleString("zh-CN")}（一成）。验收卷不是把答案写在卷上的答题纸。`,
    myths: ["验收不是答题纸，是抽查用的另一叠纸带。", "不是两本不同的书，是同一卷按 9:1 切开。"],
    remember: "九成学，一成抽查。",
    footnote: "源码脚注：train.bin / val.bin。",
  },
];

const L2 = [
  {
    id: "clip",
    purpose: "随机剪一小段，不要每次从开头读",
    caption: "每次随手剪一段来看",
    vo: "vo-level2",
    mood: "point",
    goal: "从长纸带中间随手剪一小段来看，不要每次都从剧本开头读。",
    why: "老从 First Citizen 读起，模型会偷懒只记开头。随机剪，才会看见纸带中间那些句子。",
    example:
      "纸带前面还有很长（…）。我们剪到的是 Second Citizen:↵ 这一段，长度 16。真训练会剪更长的窗；这里用短的，好让每一格都看得见。",
    myths: ["不是每次从剧本第一行开始。", "16 只是演示窗，不是唯一合法长度。"],
    remember: "随手剪一段来看。",
    footnote: "源码脚注：随机起点 i，再取一段 block。",
  },
  {
    id: "seen",
    purpose: "x 是「现在看到的牌」",
    caption: "眼前这一小段就是线索",
    mood: "talk",
    goal: "把眼前剪下来的这一小段叫做「现在看到的牌」，记成 x。",
    why: "猜下一字之前，先说清楚手里有什么线索。没有线索就变成瞎蒙。也就是说：x 是学生卷上已经印好的字。",
    example:
      "x 就是 Second Citizen:↵ 的 16 张牌：从 S(31) 一直到换行(0)。它还不是答案，只是现在看见的线索。",
    myths: ["x 不是答案。答案在右边那一格。", "x 不是整部剧本，只是剪下来的一小段。"],
    remember: "x＝现在看到的牌。",
    footnote: "源码脚注：x 是输入窗口。",
  },
  {
    id: "shift",
    purpose: "y 把答案往右挪一格",
    caption: "看见这张，猜右边那张",
    vo: "vo-shift",
    mood: "point",
    note: "shift",
    goal: "把整段答案往右挪一格，得到 y。每一格都对齐成「看见这张 → 猜右边那张」。",
    why: "一次只说「猜下一个」不够清楚。整段一起挪，每一格的答案都自动对齐。这里大事：箭头永远指向右边那一张。",
    example: `x：S e c o n d ␣ C i t i z e n : ↵\ny：e c o n d ␣ C i t i z e n : ↵ ${DEMO_NEXT_CHAR}\n第一格：看见 S，答案是 e。最后一格：看见换行，答案是 ${DEMO_NEXT_CHAR}（下一句从 We 开始）。`,
    myths: ["y 不是另一段无关文字，它就是 x 往右挪一格。", "不是往左挪，也不是随机打乱。"],
    remember: "看见这张，猜右边那张。",
    footnote: "源码脚注：y = x 右移 1。",
  },
  {
    id: "blanks",
    purpose: "一小段纸带其实是一串填空题",
    caption: "每个位置都在问：下一字？",
    vo: "vo-next",
    mood: "talk",
    goal: "看清这一小段其实是 16 道填空题，不是只猜最后一个字。",
    why: "对齐以后，每个位置都在问同一件事：下一字是谁？一次讲清楚，后面评分才知道要加 16 次。",
    example: `空1：看见 S，填 e。空2：看见 e，填 c。一路问到空16：看见换行，填 ${DEMO_NEXT_CHAR}。也就是说：16 格 = 16 题。`,
    myths: ["不是只猜最后一个字。", "不是整句翻译，是一格一格问下一字。"],
    remember: "每个位置都在问：下一字？",
    footnote: "源码脚注：next-token。",
  },
  {
    id: "choices",
    purpose: "每道题都面对 65 个候选",
    caption: "像输入法列出一排可能",
    mood: "talk",
    goal: "每道填空都面对同一份 65 张候选名单，真答案只有一个。",
    why: "答案必须从这副牌里出。像输入法列出可能的下一个字：名单固定，只能点其中一张。",
    example: `猜 S 后面是谁：65 个字符都可能被点名，但真答案只有 e。别的格子（空格、冒号、W…）这一题都不对。`,
    myths: ["不是开放写作，不能写出词表以外的字。", "名单是 65 个字符，不是英文单词表。"],
    remember: "65 个候选，真答案只有一个。",
    footnote: "源码脚注：vocab_size 个类别。",
  },
  {
    id: "desk",
    purpose: "老师把标准答案放在评分桌，不塞进线索里",
    caption: "y 只用来打分，不给偷看",
    mood: "react",
    note: "shift",
    goal: "y 只放在老师的评分桌，不塞进学生卷当线索。",
    why: "如果把答案也喂给模型当输入，它会偷看。考试时不能把答案写在卷面上。这里大事：上面是线索，下面是评分桌。",
    example: "上面一排 x 是学生卷（现在看到的牌）。下面一排 y 是老师桌。箭头的意思是：只用来对答案，不把 y 再塞回模型当输入。",
    myths: ["y 不塞进模型当线索。", "评分桌不是另一份输入窗口。"],
    remember: "y 只打分，不给偷看。",
    footnote: "源码脚注：target / label。",
  },
  {
    id: "surprise",
    purpose: "评分只问：真答案被押了多大概率？",
    caption: "押得越少，错题分越大",
    vo: "vo-loss",
    mood: "point",
    note: "penalty",
    goal: "评分只问一件事：真答案那一格被押了多大概率？押得越少，这题错题分越大。",
    why: "不用「对/错」一刀切。押对了但很犹豫，也要记一笔。也就是说：只看真答案那一格高不高，不看你乱喊的其他字。",
    example: `看第一空：真答案是 e。桌上有 65 格，我们只点亮 e。本页不写假数字。如果 e 被押得很矮，罚分就大；如果 e 被押得很稳，罚分就小。`,
    myths: ["不是看错字就扣固定 1 分。", "本游戏没有训练，也不编造 loss 数字。"],
    remember: "真答案押得少，错题分就大。",
    footnote: "源码脚注：交叉熵，口语叫「猜错罚分」。",
  },
  {
    id: "mean",
    purpose: "整段的错题分，取一个平均分",
    caption: "许多空一起算，只看平均",
    mood: "talk",
    note: "penalty",
    goal: "16 道空的错题分加起来，只看一个平均分。",
    why: "只看一道题会运气好。整段平均，才知道这段纸带整体猜得稳不稳。",
    example: "空1 到空16，每空一题。先各自记一笔猜错罚分，再加起来除以 16。这里仍然不写出假分数——本游戏没有训练。",
    myths: ["不是只看最后一个空。", "通关不等于模型已经训练好。我们只把计分规则讲清楚。"],
    remember: "许多空一起算，只看平均。",
    footnote: "源码脚注：mean loss。",
  },
];

export const LEVEL1_BEATS = L1;
export const LEVEL2_BEATS = L2;
export const SPINE_TOTAL = L1.length + L2.length;

export const TITLE_BEAT = {
  id: "title",
  purpose: "先把台词拉成纸带",
  caption: "从一条长纸带讲起",
  vo: "vo-title",
  mood: "talk",
  goal: "用课本密度讲完：纸带、号码牌、填空、猜错罚分。",
  why: "口号太短会听不懂。每一拍都要有目标、理由、例子、误会和一句记住。",
  remember: "从一条长纸带讲起。",
};

export const END_BEAT = {
  id: "end",
  purpose: "纸带、号码牌、填空都清楚了",
  caption: "通关啦！",
  vo: "vo-clear",
  mood: "react",
  goal: "回头能自己讲：纸带怎么拉、牌怎么领、y 怎么挪、分怎么算。",
  remember: "通关啦。下一关还没做。",
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
