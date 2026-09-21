import {
  DATASET,
  DEMO_BLOCK,
  DEMO_IDS,
  DEMO_NEXT_CHAR,
  DEMO_SNIPPET,
  DEMO_Y_IDS,
  REAL_BATCH,
  REAL_BLOCK,
  TOKENS_PER_ITER,
  VOCAB_SIZE,
} from "./facts.js";

/** One idea + one short caption. Facts only from shakespeare_char / notes. */
export const LEVEL1_BEATS = [
  {
    id: "why",
    purpose: "把原文变成整数",
    caption: "模型不吃字母",
    vo: "vo-level1",
    mood: "point",
  },
  {
    id: "no-bpe",
    purpose: "不用 GPT-2 BPE",
    caption: "一个字符一个号",
    mood: "talk",
  },
  {
    id: "snippet",
    purpose: "先看一句原文",
    caption: "train.bin 里的一句",
    mood: "talk",
  },
  {
    id: "newline",
    purpose: "换行也要编号",
    caption: "↵ 的 id 是 0",
    mood: "talk",
  },
  {
    id: "space",
    purpose: "空格也要编号",
    caption: "␣ 的 id 是 1",
    mood: "talk",
  },
  {
    id: "encode",
    purpose: "encode 就是查表",
    caption: "S → 31",
    vo: "vo-map",
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
    id: "sentence",
    purpose: "整句都变成整数",
    caption: "16 个 id 排好",
    mood: "talk",
  },
  {
    id: "length",
    purpose: "全文有多长",
    caption: `${DATASET.chars.toLocaleString("en-US")} 个字符`,
    mood: "point",
  },
  {
    id: "vocab",
    purpose: "词表是去重",
    caption: `唯一字符 = ${VOCAB_SIZE}`,
    mood: "talk",
  },
  {
    id: "split",
    purpose: "切成 train / val",
    caption: "前 90% / 后 10%",
    mood: "talk",
  },
  {
    id: "files",
    purpose: "写到磁盘上",
    caption: "train.bin · val.bin",
    mood: "point",
  },
];

export const LEVEL2_BEATS = [
  {
    id: "why",
    purpose: "规定预测目标",
    caption: "看见前面，猜下一个",
    vo: "vo-level2",
    mood: "point",
  },
  {
    id: "stream",
    purpose: "已经是整数带",
    caption: "第 1 关的产物",
    mood: "talk",
  },
  {
    id: "x",
    purpose: "先框住输入 x",
    caption: `x = data[i:i+${DEMO_BLOCK}]`,
    vo: "vo-level2",
    mood: "talk",
  },
  {
    id: "y",
    purpose: "y 往右挪一位",
    caption: "y 是下一个字符",
    vo: "vo-shift",
    mood: "point",
  },
  {
    id: "pair-se",
    purpose: "一对一对看",
    caption: "S 的下一字是 e",
    vo: "vo-next",
    mood: "talk",
  },
  {
    id: "pair-ec",
    purpose: "每个位置都这样",
    caption: "e 的下一字是 c",
    mood: "talk",
  },
  {
    id: "pair-nw",
    purpose: "换行后面是谁",
    caption: "↵ 的下一字是 W",
    mood: "react",
  },
  {
    id: "all",
    purpose: "窗口里都在预测",
    caption: `${DEMO_BLOCK} 个位置对齐`,
    mood: "talk",
  },
  {
    id: "block",
    purpose: "正式窗口更长",
    caption: `演示 ${DEMO_BLOCK}，正式 ${REAL_BLOCK}`,
    mood: "point",
  },
  {
    id: "batch",
    purpose: "一次抽 64 条",
    caption: `形状 (${REAL_BATCH}, ${REAL_BLOCK})`,
    mood: "talk",
  },
  {
    id: "tokens",
    purpose: "每步多少 token",
    caption: `${REAL_BATCH} × ${REAL_BLOCK} = ${TOKENS_PER_ITER}`,
    mood: "talk",
  },
  {
    id: "loss",
    purpose: "65 类对齐",
    caption: "F.cross_entropy",
    vo: "vo-loss",
    mood: "point",
  },
  {
    id: "contract",
    purpose: "训练契约",
    caption: "本关不训练、不编 loss",
    mood: "talk",
  },
];

export const TITLE_BEAT = {
  id: "title",
  purpose: "一起把笔记变成关卡",
  caption: "字符变数字",
  vo: "vo-title",
  mood: "talk",
};

export const END_BEAT = {
  id: "end",
  purpose: "两关都钉死了",
  caption: "通关啦！",
  vo: "vo-clear",
  mood: "react",
};

export const SNIPPET_CHARS = [...DEMO_SNIPPET];
export const STREAM_CHARS = [...(DEMO_SNIPPET + DEMO_NEXT_CHAR)];
export { DEMO_IDS, DEMO_Y_IDS };
