# Word-vector demo for the kids' tutorial (FICTIONAL hotel)

This demo computes the real numbers behind "search by meaning" (意思的地址 / いみの じゅうしょ) in the RAG tutorial.
Hotel Hoshi is made up. `handbook_zh.txt` and `handbook.txt` are copies of `../../rag-script/demo/`.

## What it does (`embed_demo.py` → `results.json`, `map_zh.png`, `map_en.png`, `map_ja.png`)
- **Model:** `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2` on CPU. This is the same model the RAG tutorial's
  zh "meaning" retriever used. Model card: https://huggingface.co/sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2
  (lists zh-cn, zh-tw, ja, en among 50+ languages). The SBERT docs describe it as the "Multilingual version of
  paraphrase-MiniLM-L12-v2, trained on parallel data for 50+ languages"
  (https://www.sbert.net/docs/sentence_transformer/pretrained_models.html). The training method is Reimers & Gurevych 2020,
  "Making Monolingual Sentence Embeddings Multilingual using Knowledge Distillation" (arXiv 2004.09813): a student model learns
  to give a translated sentence the same vector that the teacher gives the original sentence.
- **Words:** 20 zh words and 20 English words about the hotel, plus a few extra words for the RAG link and
  cross-language pairs (including Japanese: 朝ごはん, いぬ, 犬, プール, ちゅうしゃじょう, 駐車場, ねこ).
- **Vectors:** `normalize_embeddings=True`, so every vector has length 1 and cosine = dot product.
  `points` = round(cosine × 100), the same display rule as the RAG script's `score_x100`.
- **Recorded fields:**
  - `dimension`: 384.
  - `raw_example`: the first 8 raw and normalized numbers, plus the raw length, for 6 words.
  - `pairs`: zh, en, cross_language and rag_link_words; each with cosine, points and angle in degrees.
  - `nearest_neighbours`: top 3 per word.
  - `similarity_matrix`: all pairs within each set.
  - `word_to_nearest_cards`: each word against the 12 handbook cards.
  - `map_2d`: PCA coordinates.
  - `map_explained_variance_ratio`: zh 0.2128 + 0.1897 ≈ 40%; en 0.1864 + 0.1688 ≈ 36%.
  - `map_closest_pairs`: pairs closest on the flat map, with their real points.
  - `lowest_cosine_in_word_sets`: zh 0.0629; en -0.0404 (front desk / swim).
  - `rag_link`: the parking question recomputed here, plus the stored rag-script results.
- **2D map:** `PCA(n_components=2, svd_solver="full", random_state=0)`. Signs are fixed so the first word is in the (+,+)
  quarter. **It is a squashed view.** 384 directions are pressed onto 2, keeping only about 40% (zh) / 36% (en) of the spread.
  Words can sit on top of each other on the map and still be far apart in reality (e.g., 猫 and 入住 look touching but score 35 points;
  dog and cat look touching but score 30).
- **RAG link check:** the zh parking question recomputed here gives Page 9 0.3614, Page 11 0.3301, Page 2 0.3123.
  This is identical to `rag-script/demo/results_zh.json`, so the model reproduces. The rag-script English meaning retriever used
  a different model (all-MiniLM-L6-v2), so the English numbers recomputed here differ from rag-script `results.json`.
  The kids' ja script quotes the RAG English scores from rag-script results.json and marks the difference.

## Extra checks
- `rag_link.old_page4_recomputed_here`: the rag-script "old Page 4" experiment recomputed with this model. zh: old and new both 74 (the same as rag-script). en: old 70, new 72, both 1st (rag-script's English used another model).
- `teacher_check.py` writes `teacher_check.json`. The English-only teacher `paraphrase-MiniLM-L12-v2` gives 早饭 / 早餐 / 午饭 / 停车 100 against each other (it cannot tell Chinese words apart), 早饭–breakfast 14, and breakfast–morning meal 84. The multilingual student gives 早饭–breakfast 98 and 早餐–breakfast 99. This check backs the zh c1-p5 wording.

## Rerun
```bash
cd /workspace/embed-script/demo
python3 -m venv .venv
.venv/bin/pip install --index-url https://download.pytorch.org/whl/cpu torch==2.14.0
.venv/bin/pip install scikit-learn==1.9.1 sentence-transformers==6.1.0 matplotlib adjustText
.venv/bin/python embed_demo.py
```
Two runs on this box produced byte-identical `results.json`. `map_ja.png` has the same points as `map_en.png`, labelled 「Japanese gloss〔English〕」 (the model read only the English word). The PNG labels use Noto Sans CJK (`/usr/share/fonts/opentype/noto`).
