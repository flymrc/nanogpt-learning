"""Check every 「Nてん」 in the ja chapters (kid text; '>' note lines skipped) against the SPECIFIC
question / field of demo/results.json it belongs to, in page order.  Exit 1 on any problem.
Run: python3 verify_ja_scores.py

Each chapter has an ordered list of expected entries (value, source).  The script extracts all
「Nてん」 of that chapter in reading order and compares them one by one, so a number that is real
but belongs to another question (or an old-model value) fails.  There is no blanket allowance:
the only non-score numbers are listed explicitly (full marks 100, a computed gap, the two lines).
"""
import json, re, sys
R = json.load(open("demo/results.json"))
M, W = R["meaning"], R["word_match"]
MQ = {q["id"]: q for q in M["questions"]}
WQ = {q["id"]: q for q in W["questions"]}
x = lambda s: int(round(s * 100))

def top(block, qid, rank, page=None):
    t = block[qid]["top3"][rank - 1]
    if page is not None: assert t["page"] == page, (qid, rank, t["page"], page)
    return t["score_x100"], f"{qid} top3[{rank - 1}] (Page {t['page']})"

def wm_all(qid):
    """word_match score of EVERY card = sum(question share * card share) (L2-normalized TF-IDF), from results.json."""
    q = W["question_word_shares"][qid]
    return {int(p): x(sum(q[w] * sh.get(w, 0) for w in q)) for p, sh in W["card_word_shares"].items()}

def all_zero_except(qid, pages):
    s = wm_all(qid)
    bad = {p: v for p, v in s.items() if p not in pages and v != 0}
    assert not bad, (qid, bad)
    return 0, f"word_match {qid}: every other card 0 (recomputed from shares)"

def pair(a, b):
    p = [c for c in M["card_pair_closeness"] if c["pages"] == [a, b]][0]
    return p["score_x100"], f"meaning.card_pair_closeness {a}-{b}"

LINE_M = (x(R["settings"]["no_card_threshold"]["meaning"]), "settings.no_card_threshold.meaning")
LINE_W = (x(R["settings"]["no_card_threshold"]["word_match"]), "settings.no_card_threshold.word_match")
FULL = (100, "definition: full marks")
old4 = lambda: (M["experiment_old_page4"]["result"]["top3"][0]["score_x100"], "meaning.experiment_old_page4 top1")
p13 = lambda: (M["experiment_add_page13"]["result"]["top3"][0]["score_x100"], "meaning.experiment_add_page13 top1")
p13wm = lambda: (W["experiment_add_page13"]["result"]["top3"][0]["score_x100"], "word_match.experiment_add_page13 top1")
assert M["experiment_add_page13"]["result"]["top3"][0]["page"] == 13
q4wm_zero = lambda: (max(t["score_x100"] for t in WQ["q4_parking"]["top3"]) or all_zero_except("q4_parking", [])[0],
                     "word_match q4_parking: all 12 cards 0")
assert wm_all("q4_parking") == {p: 0 for p in range(1, 13)}
gap = (top(WQ, "q6_swim", 1, 3)[0] - top(WQ, "q6_swim", 2, 2)[0], "gap word_match q6 Page 3 - Page 2")

EXPECT = {
 "03": [top(WQ, "q2_checkout", 1, 3), top(WQ, "q2_checkout", 3, 2), top(WQ, "q2_checkout", 1, 3),
        top(WQ, "q2_checkout", 1, 3), top(WQ, "q2_checkout", 2, 11), top(WQ, "q2_checkout", 3, 2), all_zero_except("q2_checkout", [3, 11, 2]),
        top(WQ, "q2_checkout", 1, 3), top(WQ, "q2_checkout", 2, 11), top(WQ, "q2_checkout", 3, 2),
        top(WQ, "q2_checkout", 1, 3),
        top(WQ, "q6_swim", 1, 3), top(WQ, "q6_swim", 2, 2), all_zero_except("q6_swim", [3, 2]), (wm_all("q6_swim")[6], "word_match q6_swim Page 6 (recomputed)"),
        top(WQ, "q2_checkout", 3, 2), top(WQ, "q6_swim", 2, 2), gap,
        pair(4, 5), pair(4, 9), pair(6, 7), pair(6, 3), FULL, pair(4, 5), pair(4, 9),
        top(MQ, "q6_swim", 1, 6), top(MQ, "q6_swim", 2, 2), top(MQ, "q6_swim", 3, 7), top(MQ, "q6_swim", 1, 6),
        top(MQ, "q1_breakfast", 1, 4), top(MQ, "q1_breakfast", 2, 2), top(MQ, "q1_breakfast", 3, 3)],
 "04": [top(MQ, "q1_breakfast", 1, 4), top(MQ, "q1_breakfast", 2, 2), top(MQ, "q1_breakfast", 3, 3),
        top(MQ, "q7_two_meals", 1, 4), top(MQ, "q7_two_meals", 2, 5), top(MQ, "q7_two_meals", 3, 2),
        top(MQ, "q3_pool", 1, 6), top(MQ, "q3_pool", 2, 7), top(MQ, "q3_pool", 3, 9), top(WQ, "q3_pool", 1, 6)],
 "05": [top(WQ, "q1_breakfast", 1, 3), top(WQ, "q1_breakfast", 2, 4), top(WQ, "q1_breakfast", 3, 2), top(WQ, "q1_breakfast", 3, 2),
        top(WQ, "q1_breakfast", 1, 3), top(MQ, "q1_breakfast", 1, 4), q4wm_zero(), top(MQ, "q4_parking", 1, 9),
        top(MQ, "q5_dog", 1, 1), top(MQ, "q5_dog", 2, 12), top(MQ, "q5_dog", 3, 10), LINE_M, LINE_M, LINE_W,
        top(MQ, "q5_dog", 1, 1), LINE_M, q4wm_zero(), LINE_W, top(MQ, "q1_breakfast", 2, 2),
        top(MQ, "q5_dog", 1, 1), LINE_M, top(MQ, "q5_dog", 1, 1), top(MQ, "q5_dog", 1, 1), LINE_M,
        p13(), LINE_M, p13wm(), old4(), top(MQ, "q1_breakfast", 1, 4), old4()],
}
# the rules the pages state must hold in the data
assert MQ["q5_dog"]["top3"][0]["score"] < R["settings"]["no_card_threshold"]["meaning"] <= M["experiment_add_page13"]["result"]["top3"][0]["score"]
assert MQ["q3_pool"]["top3"][0]["page"] == 6 and WQ["q3_pool"]["top3"][0]["page"] == 6
bad = []
for ch, exp in EXPECT.items():
    fn = {"03": "ja/03-chapter3.md", "04": "ja/04-chapter4.md", "05": "ja/05-chapter5.md"}[ch]
    got = []
    for i, l in enumerate(open(fn, encoding="utf-8").read().splitlines(), 1):
        if l.startswith(">"): continue
        got += [(int(m.group(1)), i) for m in re.finditer(r"(?<![\d.:])(\d+)てん", l)]
    if len(got) != len(exp):
        bad.append(f"ch{ch}: {len(got)} てん numbers in text, {len(exp)} expected")
    for (g, line), (e, src) in zip(got, exp):
        if g != e: bad.append(f"ch{ch} line {line}: {g}てん, expected {e} from {src}")
for fn in ("ja/01-chapter1.md", "ja/02-chapter2.md"):
    s = "\n".join(l for l in open(fn, encoding="utf-8").read().splitlines() if not l.startswith(">"))
    if re.search(r"(?<![\d.:])\d+てん", s): bad.append(f"{fn}: has a score, add it to EXPECT")
print("\n".join(bad) or "OK: every ja てん matches its own question/field in demo/results.json")
sys.exit(1 if bad else 0)
