/** Explicit editorial operation: retain old recordings, speak corrected text. */
import { readFileSync, writeFileSync } from 'node:fs';
import { ZH } from '../src/i18n/zh.js';
import { JA } from '../src/i18n/ja.js';
import { RAG_ZH } from '../src/i18n/rag/zh.js';
import { RAG_JA } from '../src/i18n/rag/ja.js';
import { EMBED_ZH } from '../src/i18n/embed/zh.js';
import { EMBED_JA } from '../src/i18n/embed/ja.js';
import { voHash } from './vo-hash.mjs';
const reason=process.argv[2];
if(!reason)throw new Error('Provide the reviewed editorial reason for replacing recordings with live speech.');
const result={};
for(const [file,packs] of [['vo-manifest.json',{zh:ZH,ja:JA}],['rag-vo-manifest.json',{zh:RAG_ZH,ja:RAG_JA}],['embed-vo-manifest.json',{zh:EMBED_ZH,ja:EMBED_JA}]]){
  const manifest=JSON.parse(readFileSync(new URL(`../src/audio/${file}`,import.meta.url),'utf8'));
  for(const [lang,pack] of Object.entries(packs))for(const [key,text] of Object.entries(pack)){
    if(!key.endsWith('.vo'))continue;
    const textHash=voHash(text),retiredClip=manifest[lang][key];
    if(textHash!==retiredClip)result[`${lang}:${key}`]={textHash,retiredClip,reason};
  }
}
writeFileSync(new URL('../src/audio/speech-fallbacks.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(`Reviewed speech replacements: ${Object.keys(result).length}`);
