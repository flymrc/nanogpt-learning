import { ZH } from '../i18n/zh.js';
import { JA } from '../i18n/ja.js';
import { RAG_ZH } from '../i18n/rag/zh.js';
import { RAG_JA } from '../i18n/rag/ja.js';
import { EMBED_ZH } from '../i18n/embed/zh.js';
import { EMBED_JA } from '../i18n/embed/ja.js';
import { PAGES } from '../i18n/skeleton.js';
import { RAG_PAGES } from '../i18n/rag/skeleton.js';
import { EMBED_PAGES } from '../i18n/embed/skeleton.js';
import { element as el } from './experiments.js';

export function appendOriginal(root, course, chapter, lang) {
  const [pages,packs]={nanogpt:[PAGES,{zh:ZH,ja:JA}],rag:[RAG_PAGES,{zh:RAG_ZH,ja:RAG_JA}],embed:[EMBED_PAGES,{zh:EMBED_ZH,ja:EMBED_JA}]}[course];
  const pack=packs[lang];
  for(const page of pages.filter(p=>p.chapter===chapter)) {
    const block=el('section');block.append(el('h3',`${page.id} · ${pack[page.keys.aim] || ''}`));
    for(const field of ['look','local','action','talk','summary','aside','checkQ','checkA']) {
      const value=pack[page.keys[field]];
      if(value)block.append(el('p',value));
    }
    if(pack[`${page.id}.detail`])block.append(el('p',pack[`${page.id}.detail`]));
    root.append(block);
  }
}
