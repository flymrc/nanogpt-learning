/**
 * Record RAG .vo lines with the same edge-tts settings as the nanoGPT lesson.
 * Files live under public/audio/vo-rag so `npm run vo` does not delete them.
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { RAG_JA } from "../src/i18n/rag/ja.js";
import { RAG_ZH } from "../src/i18n/rag/zh.js";
import { spokenVo, voHash } from "./vo-hash.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const packs = { zh: RAG_ZH, ja: RAG_JA };
const jobs = [];
const manifest = {
  algo: "sha256-12",
  voices: {
    zh: "zh-CN-XiaoxiaoNeural",
    ja: "ja-JP-NanamiNeural",
  },
  rates: { zh: "-8%", ja: "-8%" },
  pitches: { zh: "+6Hz", ja: "+0Hz" },
  zh: {},
  ja: {},
};

for (const lang of ["zh", "ja"]) {
  const dir = join(root, "public/audio/vo-rag", lang);
  mkdirSync(dir, { recursive: true });
  const expected = new Set();
  const keys = Object.keys(packs[lang]).filter((key) => key.endsWith(".vo")).sort();
  for (const key of keys) {
    const text = spokenVo(packs[lang][key]);
    const hash = voHash(text);
    manifest[lang][key] = hash;
    const name = `${key}.${hash}.mp3`;
    expected.add(name);
    jobs.push({ lang, key, hash, text, out: join(dir, name) });
  }
  for (const name of readdirSync(dir)) {
    if (!expected.has(name)) rmSync(join(dir, name));
  }
}

const jobsPath = "/tmp/rag-vo-jobs.json";
writeFileSync(jobsPath, JSON.stringify(jobs));
const py = spawnSync("python3", [join(root, "scripts/generate-audio.py"), "--lesson-vo", jobsPath], {
  stdio: "inherit",
});
if (py.status !== 0) {
  console.error("RAG_VO_FAIL generate-audio.py");
  process.exit(py.status || 1);
}

writeFileSync(join(root, "src/audio/rag-vo-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
for (const lang of ["zh", "ja"]) {
  const dir = join(root, "public/audio/vo-rag", lang);
  const files = readdirSync(dir).filter((name) => name.endsWith(".mp3"));
  const bytes = files.reduce((sum, name) => sum + statSync(join(dir, name)).size, 0);
  console.log(`RAG_VO_LOCALE ${lang} files=${files.length} bytes=${bytes}`);
}
console.log("RAG_VO_OK");
