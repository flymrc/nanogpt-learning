import re, json, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
r = json.loads((ROOT / 'embed/demo/results.json').read_text(encoding='utf-8'))
rz = json.loads((ROOT / 'rag/demo/results_zh.json').read_text(encoding='utf-8'))
pts = set()
def walk(o):
    if isinstance(o, dict):
        for k, v in o.items():
            if k in ('points', 'score_x100') and isinstance(v, int): pts.add(v)
            walk(v)
    elif isinstance(o, list):
        for x in o: walk(x)
walk(r)
# similarity matrix cosines
for lang, m in r['similarity_matrix'].items():
    for row in (m['matrix'] if isinstance(m, dict) and 'matrix' in m else []):
        for c in row: pts.add(round(c*100))
extra = {70: 'about cos45 (ruler note)', 50: 'cos60 animation note', 1: 'difference 40-39', 3: 'difference 36-33', 4: 'difference 36-32', 5: 'difference 35-30', 100: 'max', 0: 'zero/right angle', 45: 'RAG ja q4', 71: 'RAG ja old p4', 74: 'RAG p4', 80: 'RAG zh card pair', 83: 'RAG ja card pair', 30: 'RAG zh line', 20: 'RAG en (ja) line', 81: 'RAG en card pair 4-5', 72: 'RAG en new p4', 70: 'RAG en old p4', 36: 'rag', 33: 'rag', 31: 'rag', 32: 'rag'}
ok = True
for f, unit in (('zh.md', '分'), ('ja.md', 'てん')):
    s = (Path(__file__).parent / f).read_text(encoding='utf-8')
    kid = []
    for line in s.splitlines():
        if line.startswith('|') or line.startswith('>'): continue
        kid.append(line)
    kid = '\n'.join(kid)
    if '→' in kid or '->' in kid: print(f, 'ARROW'); ok = False
    for m in re.finditer(r'(?<![\d:.])-?\d+\.\d+', kid): print(f, 'DECIMAL', m.group()); ok = False
    for m in re.finditer(r'(\d+)\s*\**\s*' + unit, kid):
        n = int(m.group(1))
        if n not in pts and n not in extra: print(f, 'UNKNOWN', n, kid[max(0, m.start()-30):m.end()]); ok = False
    print(f, 'chapters', len(re.findall(r'^# 第', s, re.M)), 'pages', len(re.findall(r'^## (第 \d+ 页|\d+ページ)', s, re.M)))
    beats = ['【小G的问题】','【目标】','【看看】','【做做】','【小G的话】','【小结】','【试试】','【动画】','【配音】'] if f=='zh.md' else ['【ジーくんの ふきだし】','【めあて】','【みてみよう】','【やってみよう】','【ジーくんのことば】','【まとめ】','【たしかめよう】','【アニメーション】','【ナレーション】']
    print(f, [s.count(b) for b in beats])
# ja may quote RAG-book scores (same model since 2026-09-30), but every number on a line that
# mentions the RAG book must be a real score in the CURRENT rag-script results.json (or its line),
# and the old all-MiniLM-L6-v2 values must not come back.
re_ = json.loads((ROOT / 'rag/demo/results.json').read_text(encoding='utf-8'))
rag_pts = set()
def walk2(o):
    if isinstance(o, dict):
        for k, v in o.items():
            if k == 'score_x100' and isinstance(v, int): rag_pts.add(v)
            walk2(v)
    elif isinstance(o, list):
        for x in o: walk2(x)
walk2(re_)
rag_line = int(round(re_['settings']['no_card_threshold']['meaning'] * 100))
jakid = '\n'.join(l for l in (Path(__file__).parent / 'ja.md').read_text(encoding='utf-8').splitlines() if not l.startswith('|') and not l.startswith('>'))
for l in jakid.splitlines():
    if 'RAG' not in l or '度で' in l: continue
    for m in re.finditer(r'(?<![\d:.])(\d+)\s*\**\s*てん', l):
        n = int(m.group(1))
        if n not in rag_pts and n not in pts and n not in extra and n not in (rag_line, 100, 0):
            print('ja RAG-line number not in results', n, l[:60]); ok = False
old_only = {45: 'q4 parking', 71: 'old p4', 83: 'card pair 4-5', 37: 'page 13'}
for n, what in old_only.items():
    if re.search(r'(?<![\d:.])%d\s*\**\s*てん' % n, jakid): print('ja OLD RAG SCORE', n, what); ok = False
m = re.search(r'RAG の 本の 線（(\d+)てん）', jakid)
if m and int(m.group(1)) != rag_line: print('ja RAG line mismatch', m.group(1), rag_line); ok = False
q = {x['id']: x for x in re_['meaning']['questions']}
checks = {
  '36てん**、2い Page 6 プール **32てん**（RAG の 本と 同じ': [c['score_x100'] for c in q['q4_parking']['top3'][:2]] == [36, 32],
  '古い カードは **70てん**、新しい カードは **72てん**（RAG の 本と 同じ': (re_['meaning']['experiment_old_page4']['result']['top3'][0]['score_x100'], q['q1_breakfast']['top3'][0]['score_x100']) == (70, 72),
  '夕ごはんの カード まるごとが 81てん': [p for p in re_['meaning']['card_pair_closeness'] if p['pages'] == [4, 5]][0]['score_x100'] == 81,
}
for text, good in checks.items():
    if text not in jakid: print('ja missing RAG claim', text); ok = False
    elif not good: print('ja RAG claim does not match results.json', text); ok = False
if 'RAG の 本の 人' in jakid or 'べつの 人' in jakid or 'はかりなお' in jakid: print('ja SECOND PERSON / re-measure framing'); ok = False
print('OK' if ok else 'PROBLEMS')
