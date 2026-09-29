"""Chinese-card version of rag_demo.py (same FICTIONAL hotel, same facts, cards written natively in Chinese).

Differences from rag_demo.py (English), and only these:
  - cards:      handbook_zh.txt / handbook_old_zh.txt, questions in Chinese, new Page 13 in Chinese
  - word_match: TF-IDF + cosine, but words are cut by the jieba segmenter (default dictionary, precise
                mode, HMM on) instead of spaces; punctuation/whitespace dropped; a small hand-written
                Chinese stop-word list (STOP_ZH below) plays the role of stop_words='english'.
                Single-character words ARE kept (in Chinese, 车/停/狗 are real words).
  - meaning:    sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2 (model card lists zh-cn,
                zh-tw), 384 numbers per text, cosine of normalized vectors.
  - template answer and "combined input" labels are in Chinese.
Everything else (top_k, chunking rule, experiments, JSON structure) mirrors rag_demo.py.
Writes results_zh.json.  NO language model is run; answers are templates quoting card #1.
"""
import json, re, platform
import jieba
import sklearn
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

jieba.setLogLevel(60)
TOP_K = 3
# "No card" lines are OUR demo rule (not from Lewis et al. 2020); see README_zh section for evidence.
THRESHOLD = {"word_match": 0.10, "meaning": 0.30}
MODEL_NAME = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"

# Small words skipped by word_match: particles, pronouns, prepositions/conjunctions, auxiliaries,
# question words. Written by hand for this demo (sklearn has no Chinese list).
STOP_ZH = set("""的 地 得 了 着 过 是 在 有 吗 呢 吧 啊 呀 和 与 或 都 也 就 还 又 很 把 被 给 到 从 对 向 让
我 你 他 她 它 我们 你们 他们 这 那 这个 那个 什么 哪 哪里 哪儿 几 几点 怎么 为什么 谁 多少
请 可以 能 会 要 想 上 下 里 就行""".split())

QUESTIONS = [
    {"id": "q1_breakfast", "text": "早饭是几点？"},
    {"id": "q2_checkout", "text": "几点退房？"},
    {"id": "q3_pool", "text": "有游泳池吗？"},
    {"id": "q4_parking", "text": "车可以停在哪里？"},
    {"id": "q5_dog", "text": "可以带狗吗？"},
    {"id": "q6_swim", "text": "几点可以游泳？"},
    {"id": "q7_two_meals", "text": "早饭和晚饭是几点？"},
]
NEW_PAGE_13 = {"page": 13, "title": "宠物", "text": "小狗和小猫可以住在三楼的房间。请告诉前台。"}

_WORD = re.compile(r"\w", re.U)


def cut(text):
    """jieba words, lower-cased, punctuation/whitespace removed (stop words NOT removed here)."""
    return [w.lower() for w in jieba.lcut(text) if _WORD.search(w)]


def analyzer(text):
    return [w for w in cut(text) if w not in STOP_ZH]


def chunk(path):
    text = open(path, encoding="utf-8").read()
    cards = []
    for m in re.finditer(r"^## Page (\d+): ([^\n]+)\n(.+?)(?=\n## |\Z)", text, re.S | re.M):
        body = "".join(m.group(3).split())
        cards.append({"page": int(m.group(1)), "title": m.group(2).strip(), "text": body})
    for c in cards:
        c["n_words"] = len(cut(c["text"]))  # jieba words (punctuation not counted)
    return cards


class WordMatch:
    name = "word_match"

    def fit(self, cards):
        self.vec = TfidfVectorizer(analyzer=analyzer)
        self.m = self.vec.fit_transform([c["text"] for c in cards])
        return self

    def scores(self, q):
        return cosine_similarity(self.vec.transform([q]), self.m)[0]

    def explain(self, q, card_text):
        kept = analyzer(q)
        return {"question_words_kept": kept,
                "question_words_known": [w for w in kept if w in self.vec.vocabulary_],
                "shared_words": sorted(set(kept) & set(analyzer(card_text)))}


class Meaning:
    name = "meaning"
    _model = None

    def fit(self, cards):
        from sentence_transformers import SentenceTransformer
        if Meaning._model is None:
            Meaning._model = SentenceTransformer(MODEL_NAME, device="cpu")
        self.d = Meaning._model.encode([c["text"] for c in cards], normalize_embeddings=True)
        return self

    def scores(self, q):
        return self.d @ Meaning._model.encode([q], normalize_embeddings=True)[0]

    def explain(self, q, card_text):
        return {}


def ask(retr, cards, q):
    s = retr.scores(q["text"])
    order = s.argsort(kind="stable")[::-1][:TOP_K]
    top = []
    for r, i in enumerate(order):
        t = {"rank": r + 1, "page": cards[i]["page"], "title": cards[i]["title"],
             "text": cards[i]["text"], "score": round(float(s[i]), 4),
             "score_x100": int(round(float(s[i]) * 100))}
        t.update(retr.explain(q["text"], cards[i]["text"]))
        top.append(t)
    best = top[0]
    thr = THRESHOLD[retr.name]
    if best["score"] < thr:
        ans, used = "我不知道。我没找到分数过线的卡片。请问问酒店的工作人员。", None
    else:
        ans, used = f"根据第 {best['page']} 页（{best['title']}）：{best['text']}", best["page"]
    combined = "问题：" + q["text"] + "\n" + "\n".join(
        f"卡片 {t['rank']}（第 {t['page']} 页）：{t['text']}" for t in top)
    return {"id": q["id"], "question": q["text"], "top3": top, "threshold": thr,
            "combined_input_for_a_generator": combined,
            "template_answer": ans, "page_used": used}


def run_all(retr_cls, cards, cards_old4, cards_add13):
    r = retr_cls().fit(cards)
    out = {"questions": [ask(r, cards, q) for q in QUESTIONS]}
    q1 = QUESTIONS[0]; q5 = QUESTIONS[4]
    out["experiment_old_page4"] = {
        "what": "Page 4 swapped for the OLD breakfast card (7:00-10:00). Nothing retrained.",
        "result": ask(retr_cls().fit(cards_old4), cards_old4, q1)}
    out["experiment_add_page13"] = {
        "what": "New Page 13 (pets) added to the cards. Nothing retrained.",
        "new_card": NEW_PAGE_13, "result": ask(retr_cls().fit(cards_add13), cards_add13, q5)}
    return out


def main():
    cards = chunk("handbook_zh.txt")
    old4 = chunk("handbook_old_zh.txt")[0]
    cards_old4 = [old4 if c["page"] == 4 else c for c in cards]
    p13 = dict(NEW_PAGE_13, n_words=len(cut(NEW_PAGE_13["text"])))
    cards_add13 = cards + [p13]

    wm = run_all(WordMatch, cards, cards_old4, cards_add13)
    one = [{"page": 0, "title": "整本手册", "text": "".join(c["text"] for c in cards)}]
    wm["experiment_one_big_card"] = {
        "what": "Whole handbook as ONE card (word_match), question q1",
        "n_words": len(cut(one[0]["text"])),
        "result": ask(WordMatch().fit(one), one, QUESTIONS[0])["top3"]}
    wm_fit = WordMatch().fit(cards)
    wm["word_rarity"] = [
        {"word": w, "cards_with_word": [c["page"] for c in cards if w in analyzer(c["text"])],
         "idf_weight": (round(float(wm_fit.vec.idf_[wm_fit.vec.vocabulary_[w]]), 3)
                        if w in wm_fit.vec.vocabulary_ else None)}
        for w in ["前台", "房间", "时间", "退房", "早饭", "游泳池", "游泳"]]
    wm["important_words_per_card"] = {c["page"]: analyzer(c["text"]) for c in cards}
    inv = {i: w for w, i in wm_fit.vec.vocabulary_.items()}

    def shares(row):
        row = row.toarray()[0]
        return {inv[i]: round(float(row[i]), 3) for i in sorted(row.nonzero()[0], key=lambda i: -row[i])}
    wm["card_word_shares"] = {c["page"]: shares(wm_fit.m[k]) for k, c in enumerate(cards)}
    wm["question_word_shares"] = {q["id"]: shares(wm_fit.vec.transform([q["text"]])) for q in QUESTIONS}
    wm["cards_per_word"] = {w: sum(1 for c in cards if w in analyzer(c["text"])) for w in sorted(wm_fit.vec.vocabulary_)}
    # zh-only extra: how jieba cut each card / question (before stop words), for the script's pictures
    wm["jieba_cut_cards"] = {c["page"]: cut(c["text"]) for c in cards}
    wm["jieba_cut_questions"] = {q["id"]: cut(q["text"]) for q in QUESTIONS}

    me = run_all(Meaning, cards, cards_old4, cards_add13)
    mdl = Meaning._model
    v_card = mdl.encode([cards[3]["text"]], normalize_embeddings=True)[0]
    v_q = mdl.encode([QUESTIONS[0]["text"]], normalize_embeddings=True)[0]
    me["address_info"] = {
        "numbers_per_address": int(v_card.shape[0]),
        "page4_first5": [round(float(x), 3) for x in v_card[:5]],
        "q1_first5": [round(float(x), 3) for x in v_q[:5]],
        "note": "an 'address' = the normalized embedding vector; closeness score = cosine"}
    me_full = Meaning().fit(cards)
    pairs = [(6, 7), (4, 5), (2, 3), (6, 3), (4, 9)]
    me["card_pair_closeness"] = [
        {"pages": [a, b], "score": round(float(me_full.d[a - 1] @ me_full.d[b - 1]), 4),
         "score_x100": int(round(float(me_full.d[a - 1] @ me_full.d[b - 1]) * 100))} for a, b in pairs]

    # Threshold check for the Chinese cards: does 0.30 (meaning) still separate answerable vs not?
    # Answerable = every question except q5_dog (no dog page in 1-12), plus the two experiments.
    top1 = {q["id"]: q["top3"][0]["score"] for q in me["questions"]}
    answerable = {k: v for k, v in top1.items() if k != "q5_dog"}
    answerable["old_page4:q1"] = me["experiment_old_page4"]["result"]["top3"][0]["score"]
    answerable["add_page13:q5_dog"] = me["experiment_add_page13"]["result"]["top3"][0]["score"]
    threshold_check = {
        "meaning_top1_answerable": answerable,
        "meaning_top1_unanswerable": {"q5_dog": top1["q5_dog"]},
        "lowest_answerable": min(answerable.values()),
        "highest_unanswerable": top1["q5_dog"],
        "threshold_0_30_separates": bool(top1["q5_dog"] < THRESHOLD["meaning"] <= min(answerable.values())),
        "word_match_note": ("word_match gives 0.0 to some answerable questions (q4, q6, add_page13), so no "
                            "word_match threshold can separate them; that is a retriever failure, not a threshold one."),
    }

    import sentence_transformers, torch
    results = {
        "note": ("FICTIONAL hotel handbook (Hotel Hoshi / 星星酒店 is made up), Chinese cards written natively "
                 "with the same facts as handbook.txt. Retrieval scores are real outputs of rag_demo_zh.py. "
                 "Answers are TEMPLATES quoting the top card; no language model was run."),
        "settings": {"top_k": TOP_K, "no_card_threshold": THRESHOLD,
                     "threshold_note": "our own demo rule, NOT from Lewis et al. 2020",
                     "threshold_check_zh": threshold_check,
                     "word_match": ("TfidfVectorizer(analyzer=jieba precise-mode words minus punctuation "
                                    "minus STOP_ZH) + cosine_similarity"),
                     "stop_words_zh": sorted(STOP_ZH),
                     "tokenizer": "jieba " + jieba.__version__ + " (default dictionary, lcut, HMM=True)",
                     "meaning": MODEL_NAME + " (CPU), cosine of normalized embeddings",
                     "python": platform.python_version(), "scikit_learn": sklearn.__version__,
                     "sentence_transformers": sentence_transformers.__version__,
                     "torch": torch.__version__},
        "n_cards": len(cards),
        "card_word_counts": {c["page"]: c["n_words"] for c in cards},
        "cards": cards,
        "old_page4": old4,
        "word_match": wm,
        "meaning": me,
    }
    json.dump(results, open("results_zh.json", "w", encoding="utf-8"), ensure_ascii=False, indent=2)

    for name, block in (("word_match", wm), ("meaning", me)):
        print("==", name)
        for r in block["questions"]:
            print(f"  {r['question']:<12}", [(t["page"], t["score"]) for t in r["top3"]], "| used:", r["page_used"])
        e = block["experiment_old_page4"]["result"]
        print("  old p4 :", [(t["page"], t["score"]) for t in e["top3"]], e["template_answer"])
        e = block["experiment_add_page13"]["result"]
        print("  add p13:", [(t["page"], t["score"]) for t in e["top3"]], e["template_answer"])
    print("one big card:", wm["experiment_one_big_card"]["n_words"], wm["experiment_one_big_card"]["result"][0]["score"])


if __name__ == "__main__":
    main()
