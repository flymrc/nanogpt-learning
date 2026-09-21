import { DEMO_NEXT_CHAR, DEMO_SNIPPET, DEMO_IDS, DEMO_Y_IDS } from "./facts.js";

/** Exact 13-beat spine. One idea + one spoken line. */
export const LEVEL1_BEATS = [
  {
    id: "tape",
    purpose: "先把台词拉成一条长纸带",
    caption: "字挨着字，连成一条",
    mood: "point",
  },
  {
    id: "plates",
    purpose: "每个字符领一个号码牌",
    caption: "像通讯录，一字一号",
    vo: "vo-level1",
    mood: "talk",
  },
  {
    id: "seats",
    purpose: "号码只是座位号，不是角色性格",
    caption: "43 不代表脾气，只是座位",
    vo: "vo-map",
    mood: "talk",
  },
  {
    id: "sixtyfive",
    purpose: "本局只有 65 张字符牌",
    caption: "只限这套莎翁字符，不是宇宙词表",
    vo: "vo-reuse",
    mood: "talk",
  },
  {
    id: "scrolls",
    purpose: "一卷分成练习卷和验收卷",
    caption: "验收卷用来抽查，不是答题纸",
    mood: "point",
  },
];

export const LEVEL2_BEATS = [
  {
    id: "clip",
    purpose: "随机剪一小段，不要每次从开头读",
    caption: "每次随手剪一段来看",
    vo: "vo-level2",
    mood: "point",
  },
  {
    id: "seen",
    purpose: "x 是「现在看到的牌」",
    caption: "眼前这一小段就是线索",
    mood: "talk",
  },
  {
    id: "shift",
    purpose: "y 把答案往右挪一格",
    caption: "看见这张，猜右边那张",
    vo: "vo-shift",
    mood: "point",
  },
  {
    id: "blanks",
    purpose: "一小段纸带其实是一串填空题",
    caption: "每个位置都在问：下一字？",
    vo: "vo-next",
    mood: "talk",
  },
  {
    id: "choices",
    purpose: "每道题都面对 65 个候选",
    caption: "像输入法列出一排可能",
    mood: "talk",
  },
  {
    id: "desk",
    purpose: "老师把标准答案放在评分桌，不塞进线索里",
    caption: "y 只用来打分，不给偷看",
    mood: "react",
  },
  {
    id: "surprise",
    purpose: "评分只问：真答案被押了多大概率？",
    caption: "押得越少，错题分越大",
    vo: "vo-loss",
    mood: "point",
  },
  {
    id: "mean",
    purpose: "整段的错题分，取一个平均分",
    caption: "许多空一起算，只看平均",
    mood: "talk",
  },
];

export const SPINE_TOTAL = LEVEL1_BEATS.length + LEVEL2_BEATS.length;

export const TITLE_BEAT = {
  id: "title",
  purpose: "先把台词拉成纸带",
  caption: "从一条长纸带讲起",
  vo: "vo-title",
  mood: "talk",
};

export const END_BEAT = {
  id: "end",
  purpose: "纸带、号码牌、填空都清楚了",
  caption: "通关啦！",
  vo: "vo-clear",
  mood: "react",
};

export const SNIPPET_CHARS = [...DEMO_SNIPPET];
export const STREAM_CHARS = [...(DEMO_SNIPPET + DEMO_NEXT_CHAR)];
export { DEMO_IDS, DEMO_Y_IDS };
