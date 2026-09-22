/**
 * Grounded in karpathy/nanoGPT data/shakespeare_char/prepare.py comments
 * and the repo notes (commit 3adf61e). Do not invent extra ML facts here.
 */

export const CHARSET =
  "\n" +
  " " +
  "!$&',-.3:;?" +
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ" +
  "abcdefghijklmnopqrstuvwxyz";

export const VOCAB_SIZE = CHARSET.length; // 65

if (VOCAB_SIZE !== 65) {
  throw new Error("CHARSET 必须与 prepare.py 注释中的 65 字符词表一致");
}

export const stoi = Object.fromEntries([...CHARSET].map((ch, i) => [ch, i]));
export const itos = Object.fromEntries([...CHARSET].map((ch, i) => [i, ch]));

export function encode(s) {
  return [...s].map((ch) => {
    if (!(ch in stoi)) {
      throw new Error(`不在 shakespeare_char 词表中: ${JSON.stringify(ch)}`);
    }
    return stoi[ch];
  });
}

export function displayGlyph(ch) {
  if (ch === "\n") return "↵";
  if (ch === " ") return "␣";
  return ch;
}

export function displayLabel(ch) {
  if (ch === "\n") return "\\n";
  if (ch === " ") return "空格";
  return ch;
}

/** Same 16-char window as notes/02 (train.bin i=1000, block=16). */
export const DEMO_SNIPPET = "Second Citizen:\n";
export const DEMO_NEXT_CHAR = "W";
export const DEMO_IDS = encode(DEMO_SNIPPET);
export const DEMO_STREAM = encode(DEMO_SNIPPET + DEMO_NEXT_CHAR);
export const DEMO_Y_IDS = encode(DEMO_SNIPPET.slice(1) + DEMO_NEXT_CHAR);

const EXPECTED_DEMO_IDS = [31, 43, 41, 53, 52, 42, 1, 15, 47, 58, 47, 64, 43, 52, 10, 0];
if (DEMO_IDS.join(",") !== EXPECTED_DEMO_IDS.join(",")) {
  throw new Error("演示句 encode 结果应与 notes/02 中 train.bin i=1000 切片一致");
}

export const DEMO_BLOCK = 16;
export const REAL_BLOCK = 256;
export const REAL_BATCH = 64;
export const TOKENS_PER_ITER = REAL_BATCH * REAL_BLOCK; // 16384, single-process

export const DATASET = {
  chars: 1115394,
  vocab: 65,
  trainTokens: 1003854,
  valTokens: 111540,
  split: "90 / 10",
  files: ["train.bin", "val.bin", "meta.pkl"],
};

export const CHARSET_PRINTABLE =
  "↵ !$&',-.3:;?ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

/**
 * shakespeare_char shape from config/train_shakespeare_char.py.
 * bias stays false: train.py default, and that config file does not assign bias.
 */
export const MODEL = {
  nLayer: 6,
  nHead: 6,
  nEmbd: 384,
  blockSize: REAL_BLOCK,
  dropout: 0.2,
  bias: false,
};

export const HEAD_SIZE = MODEL.nEmbd / MODEL.nHead;

if (HEAD_SIZE !== 64 || MODEL.nHead !== 6 || MODEL.nEmbd !== 384 || MODEL.nLayer !== 6) {
  throw new Error("shakespeare_char 注意力形状应是 6 层、6 头、宽 384、每头 64");
}

/**
 * shakespeare_char training loop from train.py + config/train_shakespeare_char.py
 * at commit 3adf61e. Numbers the config does not set stay at train.py defaults.
 * This repo has not logged its own loss run.
 */
export const TRAIN = {
  outDir: "out-shakespeare-char",
  evalInterval: 250,
  evalIters: 200,
  logInterval: 10,
  maxIters: 5000,
  learningRate: "1e-3",
  minLr: "1e-4",
  warmupIters: 100,
  lrDecayIters: 5000,
  beta1: 0.9,
  beta2: 0.99,
  weightDecay: 0.1,
  gradClip: 1.0,
  gradAccum: 1,
  alwaysSaveCheckpoint: false,
  initFrom: "scratch",
  prepare: "python data/shakespeare_char/prepare.py",
  command: "python train.py config/train_shakespeare_char.py",
  sample: "python sample.py --out_dir=out-shakespeare-char",
};

/**
 * sample.py defaults at commit 3adf61e, plus the README command that points
 * out_dir at the shakespeare_char checkpoint. This repo has no ckpt.pt and
 * has not reproduced a sample. top_k stays 200 in the script; the char vocab
 * is 65, so min(top_k, vocab) keeps every token.
 */
export const SAMPLE = {
  command: "python sample.py --out_dir=out-shakespeare-char",
  cpuCommand: "python sample.py --out_dir=out-shakespeare-char --device=cpu",
  outDir: "out-shakespeare-char",
  ckpt: "ckpt.pt",
  initFrom: "resume",
  start: "\n",
  numSamples: 10,
  maxNewTokens: 500,
  temperature: 0.8,
  topK: 200,
  seed: 1337,
  device: "cuda",
  compile: false,
  meta: "data/shakespeare_char/meta.pkl",
};
