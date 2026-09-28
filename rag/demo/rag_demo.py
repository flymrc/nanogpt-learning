"""Tiny retrieval demo for the kids' RAG tutorial.  The hotel handbook is FICTIONAL.

1) chunk:     handbook.txt -> cards (one card per "## Page N: title" block)
2) retrieve:  two retrievers, top-3 cards per guest question
     - "word_match": TF-IDF bag-of-words + cosine (scikit-learn), English stop words skipped
     - "meaning":    small open embedding model sentence-transformers/all-MiniLM-L6-v2 (CPU),
                     cosine of normalized vectors  (a dense retriever, same family of idea as
                     the RAG paper's DPR retriever, but NOT the paper's model)
3) combine:   question + top-3 cards joined into one text (what a generator would read)
4) answer:    a TEMPLATE that quotes the top card and names its page.
              NO language model is run. Nothing here is AI-generated text.
Writes results.json.  Scores are rounded to 4 decimals; score_x100 = round(score*100).
"""
import json, re, platform
import sklearn
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

TOP_K = 3
# "No card" rules are OUR demo choices (not from Lewis et al. 2020). They were picked after
# looking at the scores of these few questions, so they are illustrations, not tuned values.
THRESHOLD = {"word_match": 0.10, "meaning": 0.30}
MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"

QUESTIONS = [
    {"id": "q1_breakfast", "text": "What time is breakfast?"},
    {"id": "q2_checkout", "text": "What time is checkout?"},
    {"id": "q3_pool", "text": "Is there a swimming pool?"},
    {"id": "q4_parking", "text": "Where can I park my car?"},
    {"id": "q5_dog", "text": "Can I bring my dog?"},
    {"id": "q6_swim", "text": "What time can I swim?"},
    {"id": "q7_two_meals", "text": "What time are breakfast and dinner?"},
]
NEW_PAGE_13 = {"page": 13, "title": "Pets",
               "text": "Small dogs and cats may stay in rooms on the 3rd floor. Please tell the front desk."}


def chunk(path):
    text = open(path, encoding="utf-8").read()
    cards = []
    for m in re.finditer(r"^## Page (\d+): ([^\n]+)\n(.+?)(?=\n## |\Z)", text, re.S | re.M):
        body = " ".join(m.group(3).split())
        cards.append({"page": int(m.group(1)), "title": m.group(2).strip(), "text": body})
    for c in cards:
        c["n_words"] = len(c["text"].split())
    return cards


class WordMatch:
    name = "word_match"

    def fit(self, cards):
        self.vec = TfidfVectorizer(stop_words="english")
        self.m = self.vec.fit_transform([c["text"] for c in cards])
        return self

    def scores(self, q):
        return cosine_similarity(self.vec.transform([q]), self.m)[0]

    def explain(self, q, card_text):
        an = self.vec.build_analyzer()
        kept = an(q)
        return {"question_words_kept": kept,
                "question_words_known": [w for w in kept if w in self.vec.vocabulary_],
                "shared_words": sorted(set(kept) & set(an(card_text)))}


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
    order = s.argsort()[::-1][:TOP_K]
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
        ans, used = "I don't know. I found no card with a score over the line. Please ask a hotel staff member.", None
    else:
        ans, used = f"According to Page {best['page']} ({best['title']}): {best['text']}", best["page"]
    combined = "Question: " + q["text"] + "\n" + "\n".join(
        f"Card {t['rank']} (Page {t['page']}): {t['text']}" for t in top)
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
    cards = chunk("handbook.txt")
    old4 = chunk("handbook_old.txt")[0]
    cards_old4 = [old4 if c["page"] == 4 else c for c in cards]
    p13 = dict(NEW_PAGE_13, n_words=len(NEW_PAGE_13["text"].split()))
    cards_add13 = cards + [p13]

    wm = run_all(WordMatch, cards, cards_old4, cards_add13)
    # Why cut into cards: whole handbook as one card -> only one thing to find, no page to point to
    one = [{"page": 0, "title": "Whole handbook", "text": " ".join(c["text"] for c in cards)}]
    wm["experiment_one_big_card"] = {
        "what": "Whole handbook as ONE card (word_match), question q1",
        "n_words": len(one[0]["text"].split()),
        "result": ask(WordMatch().fit(one), one, QUESTIONS[0])["top3"]}
    # How much each word "weighs" in word_match: rarer word (fewer cards) -> bigger idf weight.
    wm_fit = WordMatch().fit(cards)
    an = wm_fit.vec.build_analyzer()
    wm["word_rarity"] = [
        {"word": w, "cards_with_word": [c["page"] for c in cards if w in an(c["text"])],
         "idf_weight": round(float(wm_fit.vec.idf_[wm_fit.vec.vocabulary_[w]]), 3)}
        for w in ["desk", "room", "time", "checkout", "breakfast", "swimming", "pool"]]
    wm["important_words_per_card"] = {c["page"]: an(c["text"]) for c in cards}
    # Share of each word inside a card / a question: the L2-normalized TF-IDF weights.
    # word_match score = sum over shared words of (question share * card share).
    inv = {i: w for w, i in wm_fit.vec.vocabulary_.items()}
    def shares(row):
        row = row.toarray()[0]
        return {inv[i]: round(float(row[i]), 3) for i in sorted(row.nonzero()[0], key=lambda i: -row[i])}
    wm["card_word_shares"] = {c["page"]: shares(wm_fit.m[k]) for k, c in enumerate(cards)}
    wm["question_word_shares"] = {q["id"]: shares(wm_fit.vec.transform([q["text"]])) for q in QUESTIONS}
    wm["cards_per_word"] = {w: sum(1 for c in cards if w in an(c["text"])) for w in sorted(wm_fit.vec.vocabulary_)}
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

    import sentence_transformers, torch
    results = {
        "note": ("FICTIONAL hotel handbook (Hotel Hoshi is made up). Retrieval scores are real outputs "
                 "of rag_demo.py. Answers are TEMPLATES quoting the top card; no language model was run."),
        "settings": {"top_k": TOP_K, "no_card_threshold": THRESHOLD,
                     "threshold_note": "our own demo rule, NOT from Lewis et al. 2020",
                     "word_match": "TfidfVectorizer(stop_words='english') + cosine_similarity",
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
    json.dump(results, open("results.json", "w", encoding="utf-8"), ensure_ascii=False, indent=2)

    for name, block in (("word_match", wm), ("meaning", me)):
        print("==", name)
        for r in block["questions"]:
            print(f"  {r['question']:<28}", [(t["page"], t["score"]) for t in r["top3"]], "| used:", r["page_used"])
        e = block["experiment_old_page4"]["result"]
        print("  old p4 :", [(t["page"], t["score"]) for t in e["top3"]], e["template_answer"])
        e = block["experiment_add_page13"]["result"]
        print("  add p13:", [(t["page"], t["score"]) for t in e["top3"]], e["template_answer"])
    print("one big card:", wm["experiment_one_big_card"]["n_words"], wm["experiment_one_big_card"]["result"][0]["score"])


if __name__ == "__main__":
    main()
