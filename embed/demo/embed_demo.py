"""Word-vector (embedding) demo for the kids' tutorial. Same model as the RAG tutorial's zh "meaning" retriever.

Model: sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2 (CPU). Every text -> 384 numbers.
We normalize every vector to length 1 (as in rag_demo_zh.py), so cosine similarity = dot product.
"closeness points" (近分) = round(cosine * 100), the same display rule as the RAG script's score_x100.
2D map = PCA (sklearn, svd_solver="full", random_state=0) of the normalized vectors. It is a SQUASHED view:
384 directions pressed flat onto 2; explained_variance_ratio tells how much spread the 2 axes keep.
Handbook cards are copied from ../../rag-script/demo (FICTIONAL hotel). Writes results.json, map_zh.png, map_en.png, map_ja.png (same points as map_en, Japanese title).
"""
import json, re, math, platform
import numpy as np

MODEL = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
ZH = ["早饭", "早餐", "午饭", "晚饭", "停车", "车位", "停车场", "车", "游泳", "泳池", "游泳池",
      "狗", "小狗", "猫", "毛巾", "枕头", "钥匙", "退房", "入住", "前台"]
EN = ["breakfast", "morning meal", "lunch", "dinner", "parking", "parking lot", "car", "swim", "swimming",
      "pool", "swimming pool", "dog", "dogs", "cat", "towel", "pillow", "key", "checkout", "check-in", "front desk"]
PAIRS_ZH = [("早饭", "早餐"), ("早饭", "午饭"), ("早饭", "晚饭"), ("早饭", "停车"), ("停车", "车位"), ("停车", "停车场"),
            ("车", "停车场"), ("游泳", "游泳池"), ("游泳", "泳池"), ("狗", "小狗"), ("狗", "猫"), ("狗", "游泳"),
            ("毛巾", "枕头"), ("退房", "入住"), ("钥匙", "狗")]
PAIRS_EN = [("breakfast", "morning meal"), ("breakfast", "lunch"), ("breakfast", "dinner"), ("breakfast", "parking"),
            ("parking", "parking lot"), ("parking", "car"), ("swim", "swimming"), ("swim", "pool"),
            ("pool", "swimming pool"), ("dog", "dogs"), ("dog", "cat"), ("dog", "swim"), ("towel", "pillow"),
            ("checkout", "check-in"), ("key", "dog")]
PAIRS_CROSS = [("早饭", "breakfast"), ("狗", "dog"), ("停车", "parking"), ("游泳池", "swimming pool"), ("早饭", "dog"),
               ("朝ごはん", "breakfast"), ("いぬ", "dog"), ("プール", "pool"), ("ちゅうしゃじょう", "parking lot"), ("朝ごはん", "dog"),
               ("犬", "dog"), ("駐車場", "parking lot"), ("いぬ", "犬"), ("ねこ", "cat"), ("猫", "cat")]
# RAG link: the word pieces that word-match could not match (rag-script c3-p4, c5-p1, c5-p6)
PAIRS_RAG = [("游泳", "游泳池"), ("车", "停车场"), ("停", "停车场"), ("带狗", "小狗"), ("park", "parking")]
PARKING_Q = {"zh": "车可以停在哪里？", "en": "Where can I park my car?"}


def chunk(path):
    text = open(path, encoding="utf-8").read()
    out = []
    for m in re.finditer(r"^## Page (\d+): ([^\n]+)\n(.+?)(?=\n## |\Z)", text, re.S | re.M):
        body = "".join(m.group(3).split()) if path.endswith("_zh.txt") else " ".join(m.group(3).split())
        out.append({"page": int(m.group(1)), "title": m.group(2).strip(), "text": body})
    return out


def main():
    from sentence_transformers import SentenceTransformer
    from sklearn.decomposition import PCA
    import sklearn, sentence_transformers, torch
    model = SentenceTransformer(MODEL, device="cpu")
    enc = lambda xs: model.encode(xs, normalize_embeddings=True)
    RAW_WORDS = ["早饭", "早餐", "停车", "breakfast", "morning meal", "parking"]
    raw = model.encode(RAW_WORDS, normalize_embeddings=False)

    cards = {"zh": chunk("handbook_zh.txt"), "en": chunk("handbook.txt")}
    words = {"zh": ZH, "en": EN}
    V = {k: enc(v) for k, v in words.items()}
    C = {k: enc([c["text"] for c in v]) for k, v in cards.items()}
    extra = sorted({w for p in PAIRS_RAG + PAIRS_CROSS for w in p} - set(ZH) - set(EN))
    E = dict(zip(extra, enc(extra)))
    vec = {**dict(zip(ZH, V["zh"])), **dict(zip(EN, V["en"])), **E}

    def pair(a, b):
        c = float(vec[a] @ vec[b])
        return {"a": a, "b": b, "cosine": round(c, 4), "points": int(round(c * 100)),
                "angle_deg": round(math.degrees(math.acos(max(-1.0, min(1.0, c)))), 1)}

    def neighbours(lang, k=3):
        M = V[lang] @ V[lang].T
        out = {}
        for i, w in enumerate(words[lang]):
            order = [j for j in np.argsort(-M[i], kind="stable") if j != i][:k]
            out[w] = [{"word": words[lang][j], "cosine": round(float(M[i, j]), 4),
                       "points": int(round(float(M[i, j]) * 100))} for j in order]
        return out

    def matrix(lang):
        M = V[lang] @ V[lang].T
        return {w: {u: round(float(M[i, j]), 4) for j, u in enumerate(words[lang])} for i, w in enumerate(words[lang])}

    def word_to_card(lang):
        M = V[lang] @ C[lang].T
        out = {}
        for i, w in enumerate(words[lang]):
            order = np.argsort(-M[i], kind="stable")[:3]
            out[w] = [{"page": cards[lang][j]["page"], "title": cards[lang][j]["title"],
                       "cosine": round(float(M[i, j]), 4), "points": int(round(float(M[i, j]) * 100))} for j in order]
        return out

    def pca(lang):
        p = PCA(n_components=2, svd_solver="full", random_state=0)
        xy = p.fit_transform(V[lang])
        # fix sign so the picture is stable: first word ends up with x>0, y>0
        s = np.sign(xy[0]); s[s == 0] = 1; xy = xy * s
        return p, {w: [round(float(x), 4), round(float(y), 4)] for w, (x, y) in zip(words[lang], xy)}

    def parking(lang):
        q = enc([PARKING_Q[lang]])[0]
        sc = C[lang] @ q
        order = np.argsort(-sc, kind="stable")[:3]
        return {"question": PARKING_Q[lang],
                "top3": [{"page": cards[lang][j]["page"], "title": cards[lang][j]["title"],
                          "score": round(float(sc[j]), 4), "score_x100": int(round(float(sc[j]) * 100))} for j in order]}

    BREAKFAST_Q = {"zh": "早饭是几点？", "en": "What time is breakfast?"}
    def old_page4(lang, rag):
        # rag-script experiment: swap in the OLD Page 4 text and ask the breakfast question (this book's model)
        q = enc([BREAKFAST_Q[lang]])[0]
        old = enc([rag["old_page4"]["text"]])[0]
        i4 = next(j for j, c in enumerate(cards[lang]) if c["page"] == 4)
        sc_new = C[lang] @ q
        sc_old = sc_new.copy(); sc_old[i4] = float(old @ q)
        def top(sc):
            order = np.argsort(-sc, kind="stable")[:3]
            return [{"page": cards[lang][j]["page"], "title": cards[lang][j]["title"],
                     "score": round(float(sc[j]), 4), "score_x100": int(round(float(sc[j]) * 100))} for j in order]
        return {"question": BREAKFAST_Q[lang], "old_text": rag["old_page4"]["text"], "new_text": cards[lang][i4]["text"],
                "with_new_page4_top3": top(sc_new), "with_old_page4_top3": top(sc_old)}

    maps, pcas = {}, {}
    for lang in ("zh", "en"):
        pcas[lang], maps[lang] = pca(lang)

    rag_zh = json.load(open("../../rag-script/demo/results_zh.json"))
    rag_en = json.load(open("../../rag-script/demo/results.json"))
    def rag_q(r, qid):
        out = {}
        for m in ("word_match", "meaning"):
            q = next(x for x in r[m]["questions"] if x["id"] == qid)
            out[m] = [{"page": t["page"], "score": t["score"], "score_x100": t["score_x100"]} for t in q["top3"]]
        return out

    res = {
        "note": ("Real outputs of embed_demo.py. Hotel Hoshi is FICTIONAL. Vectors are normalized to length 1; "
                 "cosine = dot product; points = round(cosine*100). The 2D map is a squashed PCA view."),
        "settings": {"model": MODEL, "normalize_embeddings": True,
                     "pca": "sklearn PCA(n_components=2, svd_solver='full', random_state=0), sign fixed so the first word is in the (+,+) quarter",
                     "python": platform.python_version(), "torch": torch.__version__,
                     "sentence_transformers": sentence_transformers.__version__, "scikit_learn": sklearn.__version__},
        "dimension": int(V["zh"].shape[1]),
        "raw_example": {w: {"first8_raw": [round(float(x), 4) for x in r[:8]],
                            "first8_normalized": [round(float(x), 4) for x in vec[w][:8]],
                            "raw_length": round(float(np.linalg.norm(r)), 4),
                            "min_normalized": round(float(vec[w].min()), 4), "max_normalized": round(float(vec[w].max()), 4)}
                        for w, r in zip(RAW_WORDS, raw)},
        "words": words,
        "lowest_cosine_in_word_sets": {k: round(float((V[k] @ V[k].T).min()), 4) for k in ("zh", "en")},
        "pairs": {"zh": [pair(*p) for p in PAIRS_ZH], "en": [pair(*p) for p in PAIRS_EN],
                  "cross_language": [pair(*p) for p in PAIRS_CROSS], "rag_link_words": [pair(*p) for p in PAIRS_RAG]},
        "nearest_neighbours": {"zh": neighbours("zh"), "en": neighbours("en")},
        "similarity_matrix": {"zh": matrix("zh"), "en": matrix("en")},
        "word_to_nearest_cards": {"zh": word_to_card("zh"), "en": word_to_card("en")},
        "map_2d": maps,
        "map_explained_variance_ratio": {k: [round(float(x), 4) for x in p.explained_variance_ratio_] for k, p in pcas.items()},
        "rag_link": {
            "parking_recomputed_here": {"zh": parking("zh"), "en": parking("en")},
            "rag_script_results_zh_q4_parking": rag_q(rag_zh, "q4_parking"),
            "rag_script_results_en_q4_parking": rag_q(rag_en, "q4_parking"),
            "old_page4_recomputed_here": {"zh": old_page4("zh", rag_zh), "en": old_page4("en", rag_en)},
            "note": ("rag-script zh meaning used this same model; en meaning used all-MiniLM-L6-v2, so en scores "
                     "recomputed here with the multilingual model differ from rag-script results.json."),
        },
    }
    # Squash check: which pairs sit closest on the flat map, and what is their REAL closeness?
    import itertools
    squash = {}
    for lang in ("zh", "en"):
        m = maps[lang]; ws = list(m); xy = np.array([m[w] for w in ws]); span = float(np.ptp(xy, axis=0).max())
        rows = []
        for a, b in itertools.combinations(ws, 2):
            d = float(np.linalg.norm(xy[ws.index(a)] - xy[ws.index(b)])) / span
            c = float(vec[a] @ vec[b])
            rows.append({"a": a, "b": b, "map_distance_share_of_width": round(d, 3),
                         "cosine": round(c, 4), "points": int(round(c * 100))})
        rows.sort(key=lambda r: r["map_distance_share_of_width"])
        squash[lang] = rows[:12]
    res["map_closest_pairs"] = squash
    res["map_note"] = ("map_distance_share_of_width = distance on the 2D map divided by the map's width. "
                       "Pairs can look almost on top of each other on the map yet have low real points.")
    json.dump(res, open("results.json", "w", encoding="utf-8"), ensure_ascii=False, indent=2)

    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    from matplotlib import font_manager
    for fp in ("/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc", "/usr/share/fonts/opentype/noto/NotoSerifCJK-Regular.ttc"):
        try:
            font_manager.fontManager.addfont(fp); plt.rcParams["font.family"] = font_manager.FontProperties(fname=fp).get_name(); break
        except Exception:
            pass
    from adjustText import adjust_text
    ev = res["map_explained_variance_ratio"]
    titles = {
        "zh": ("zh", "词的地图：压扁的影子（第 4 章再讲）"),
        "en": ("en", f"word map: {res['dimension']} numbers per word, squashed to 2 (keeps about {round(sum(ev['en']) * 100)}% of the spread)"),
        "ja": ("en", "ことばの 地図：ぺちゃんこの かげ（第4章で せつめい）"),
    }
    # Japanese glosses for the ja map (same wording as ja.md); the model still read the English word
    ja_gloss = {"breakfast": "朝ごはん", "morning meal": "朝の 食事", "lunch": "昼ごはん", "dinner": "夕ごはん",
                "parking": "ちゅうしゃ", "parking lot": "ちゅうしゃじょう", "car": "車", "swim": "およぐ",
                "swimming": "およぎ", "pool": "プール", "swimming pool": "水泳プール", "dog": "犬", "dogs": "犬たち",
                "cat": "ねこ", "towel": "タオル", "pillow": "まくら", "key": "かぎ", "checkout": "チェックアウト",
                "check-in": "チェックイン", "front desk": "フロント"}
    for name, (lang, title) in titles.items():
        fig, ax = plt.subplots(figsize=(9, 8), dpi=120)
        texts = []
        # hand-placed labels for the crowded food corner of the ja map (review-round1 item 17)
        manual = {"breakfast": (-40, -45), "lunch": (-150, 14), "dinner": (-170, -28), "morning meal": (-190, 12),
                  "cat": (40, 22), "dog": (40, -8), "dogs": (-120, 20)} if name == "ja" else {}
        for w, (x, y) in maps[lang].items():
            ax.scatter(x, y, s=36, color="#3b7dd8")
            label = f"{ja_gloss[w]}〔{w}〕" if name == "ja" else w
            if w in manual:
                ax.annotate(label, (x, y), xytext=manual[w], textcoords="offset points", fontsize=12,
                            arrowprops=dict(arrowstyle="-", color="#999999", lw=0.6))
            else:
                texts.append(ax.text(x, y, label, fontsize=12 if name == "ja" else 13))
        ax.margins(0.12)
        adjust_text(texts, ax=ax, arrowprops=dict(arrowstyle="-", color="#999999", lw=0.6))
        ax.set_title(title, fontsize=11)
        ax.set_xticks([]); ax.set_yticks([])
        fig.tight_layout(); fig.savefig(f"map_{name}.png"); plt.close(fig)
    print("dim", res["dimension"], "EV", res["map_explained_variance_ratio"])


if __name__ == "__main__":
    main()
