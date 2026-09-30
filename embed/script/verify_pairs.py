import re, json
r = json.load(open('demo/results.json'))
P = {}
for grp in r['pairs'].values():
    for p in grp: P[(p['a'], p['b'])] = p['points']; P[(p['b'], p['a'])] = p['points']
for lang, m in r['similarity_matrix'].items():
    for a, row in m.items():
        for b, c in row.items(): P.setdefault((a, b), round(c*100))
ja = {'朝ごはん':'breakfast','朝の 食事':'morning meal','昼ごはん':'lunch','ちゅうしゃ':'parking','犬':'dog','およぐ':'swim','いぬ':'いぬ'}
bad = 0
for f, pat in (('zh.md', r'([\u4e00-\u9fffA-Za-z ]+?) 和 ([\u4e00-\u9fffA-Za-z ]+?)：\*\*(\d+) 分'),
               ('ja.md', r'([^\s：／]+(?: 食事)?)(?:〔[^〕]*〕)? と ([^\s：／]+(?: lot| pool| meal)?)(?:〔[^〕]*〕)?：\*\*(\d+)てん')):
    for m in re.finditer(pat, open(f).read()):
        a, b, n = m.group(1).strip().split('　')[-1], m.group(2).strip(), int(m.group(3))
        a = re.sub(r'（[^）]*）$', '', a); b = re.sub(r'（[^）]*）$', '', b)  # strip furigana readings
        key = (a, b)
        if key not in P and f == 'ja.md': key = (ja.get(a, a), ja.get(b, b) if b not in ('犬',) or a == 'いぬ' else ja.get(b, b))
        v = P.get(key)
        flag = 'OK' if v == n else 'CHECK'
        if flag != 'OK': bad += 1
        print(f, flag, a, b, n, v)
print('bad', bad)
