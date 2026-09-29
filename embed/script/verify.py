import re, json, sys
r = json.load(open('demo/results.json'))
rz = json.load(open('/workspace/rag-script/demo/results_zh.json'))
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
extra = {70: 'about cos45 (ruler note)', 50: 'cos60 animation note', 1: 'difference 40-39', 3: 'difference 36-33', 4: 'difference 36-32', 5: 'difference 35-30', 100: 'max', 0: 'zero/right angle', 45: 'RAG ja q4', 71: 'RAG ja old p4', 74: 'RAG p4', 80: 'RAG zh card pair', 83: 'RAG ja card pair', 30: 'RAG line', 36: 'rag', 33: 'rag', 31: 'rag', 32: 'rag'}
ok = True
for f, unit in (('zh.md', '分'), ('ja.md', 'てん')):
    s = open(f).read()
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
# ja must not quote RAG-book scores or a second number-maker (review-round2 decision)
jakid = '\n'.join(l for l in open('ja.md').read().splitlines() if not l.startswith('|') and not l.startswith('>'))
for l in jakid.splitlines():
    if '度で' in l: continue  # angle-ruler animation note (cos 45 deg), not a RAG score
    for n in (45, 71, 74, 83):
        if re.search(r'(?<!\d)%d\s*\**\s*てん' % n, l): print('ja RAG SCORE', n, l[:60]); ok = False
if 'RAG の 本の 人' in jakid or 'べつの 人' in jakid: print('ja SECOND PERSON'); ok = False
print('OK' if ok else 'PROBLEMS')
