import {
  DATASET,
  DEMO_BLOCK,
  DEMO_IDS,
  DEMO_NEXT_CHAR,
  DEMO_SNIPPET,
  DEMO_Y_IDS,
  REAL_BATCH,
  REAL_BLOCK,
  VOCAB_SIZE,
} from "./facts.js";

/** One idea + one spoken line. Facts only from shakespeare_char / notes. */
export const LEVEL1_BEATS = [
  {
    id: "phone",
    purpose: "看到前面，猜下一个",
    caption: "就像手机输入法",
    vo: "vo-level1",
    mood: "point",
  },
  {
    id: "rank",
    purpose: "每个字都排进榜",
    caption: "越可能的排越前",
    vo: "vo-map",
    mood: "talk",
  },
  {
    id: "lm",
    purpose: "这就是语言模型",
    caption: "专门猜下一个字",
    mood: "talk",
  },
  {
    id: "no-letters",
    purpose: "电脑更认号码",
    caption: "字母要先换成号",
    mood: "point",
  },
  {
    id: "contact",
    purpose: "一个字一个号码",
    caption: "像通讯录里的名片",
    mood: "talk",
  },
  {
    id: "newline",
    purpose: "换行也算一个字",
    caption: "空一行也要有号",
    mood: "talk",
  },
  {
    id: "space",
    purpose: "空格也算一个字",
    caption: "空着也要记一笔",
    mood: "talk",
  },
  {
    id: "reuse",
    purpose: "同样的字同一个号",
    caption: "两个 e 都是 43",
    vo: "vo-reuse",
    mood: "react",
  },
  {
    id: "snippet",
    purpose: "先看一句台词",
    caption: "莎翁剧本里的一句",
    mood: "talk",
  },
  {
    id: "sentence",
    purpose: "整句都换成号码",
    caption: "每个字都换好了",
    mood: "talk",
  },
  {
    id: "vocab",
    purpose: "一共只有 65 种字",
    caption: "去重以后就这些",
    mood: "talk",
  },
  {
    id: "split",
    purpose: "拆成练习和检查",
    caption: "九成学，一成查",
    mood: "talk",
  },
  {
    id: "tapes",
    purpose: "变成两串号码",
    caption: "长卷练习，短卷检查",
    mood: "point",
  },
];

export const LEVEL2_BEATS = [
  {
    id: "peek",
    purpose: "一次只看一小段",
    caption: "太长了记不住",
    vo: "vo-level2",
    mood: "point",
  },
  {
    id: "seen",
    purpose: "左边是已经看到的",
    caption: "眼前这一小段",
    mood: "talk",
  },
  {
    id: "answer",
    purpose: "答案往后挪一格",
    caption: "看见这个，猜下一个",
    vo: "vo-shift",
    mood: "point",
  },
  {
    id: "pair-se",
    purpose: "看见 S，猜 e",
    caption: "一对一对来看",
    vo: "vo-next",
    mood: "talk",
  },
  {
    id: "pair-ec",
    purpose: "每个位置都要猜",
    caption: "看见 e，猜 c",
    mood: "talk",
  },
  {
    id: "pair-nw",
    purpose: "换行后面也要猜",
    caption: "看见 ↵，猜 W",
    mood: "react",
  },
  {
    id: "all",
    purpose: "这一段处处在猜",
    caption: "每个位置一对答案",
    mood: "talk",
  },
  {
    id: "window",
    purpose: "真学时窗口更长",
    caption: `演示 ${DEMO_BLOCK} 格，正式 ${REAL_BLOCK} 格`,
    mood: "point",
  },
  {
    id: "many",
    purpose: "一次拿很多小段",
    caption: `正式一次拿 ${REAL_BATCH} 段`,
    mood: "talk",
  },
  {
    id: "score",
    purpose: "猜错了要打分",
    caption: "离谱的猜测罚得重",
    vo: "vo-loss",
    mood: "point",
  },
  {
    id: "choices",
    purpose: "每次有 65 个候选",
    caption: "正确答案只占一个",
    mood: "talk",
  },
  {
    id: "shrink",
    purpose: "目标是少猜错",
    caption: "把罚分一点点压小",
    mood: "talk",
  },
  {
    id: "contract",
    purpose: "这里只讲清楚规矩",
    caption: "没有真的开训",
    mood: "talk",
  },
];

export const TITLE_BEAT = {
  id: "title",
  purpose: "一起猜下一个字",
  caption: "像手机输入法那样",
  vo: "vo-title",
  mood: "talk",
};

export const END_BEAT = {
  id: "end",
  purpose: "两关都讲清楚了",
  caption: "通关啦！",
  vo: "vo-clear",
  mood: "react",
};

export const SNIPPET_CHARS = [...DEMO_SNIPPET];
export const STREAM_CHARS = [...(DEMO_SNIPPET + DEMO_NEXT_CHAR)];
export { DEMO_IDS, DEMO_Y_IDS };
