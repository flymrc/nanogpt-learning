# Tiny RAG demo for the kids' tutorial (FICTIONAL hotel)

**Everything in `handbook.txt` / `handbook_old.txt` is made up.** "Hotel Hoshi" is not a real
hotel. The handbook exists only so the kids' script can show real retrieval numbers.

## What it does
1. **Chunk** – `handbook.txt` is cut into cards, one card per `## Page N: title` block
   (12 cards, 14–18 English words each).
2. **Retrieve** – two retrievers, top-3 cards per guest question:
   - `word_match`: TF-IDF bag-of-words + cosine similarity (scikit-learn),
     English stop words ("what", "is", "can", "I", ...) skipped.
   - `meaning`: small open embedding model `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`
     on CPU (since 2026-09-30; before: `all-MiniLM-L6-v2`, output kept in `results_minilm_l6.json`);
     each card/question becomes 384 numbers ("address"); score = cosine.
     This is a *dense* retriever like the RAG paper's DPR in spirit, **not** the paper's model.
3. **Combine** – the question and the top-3 cards are joined into one text
   (`combined_input_for_a_generator`), which is what a generator would read.
4. **Answer** – a **template**: `According to Page N (title): <card text>` using the top card,
   or `I don't know. I found no card with a score over the line. ...` (round 5 wording; earlier "No page in the handbook matches well") if the top score is under the no-card line
   (0.10 word_match / 0.20 meaning since the 2026-09-30 model switch, was 0.30 — our own rule, picked after looking at these few
   questions, **not** from the paper). **No language model is run; no AI-written text.**

Extra experiments (nothing is retrained in any of them):
- `experiment_old_page4`: Page 4 replaced by the old breakfast card (7:00–10:00).
- `experiment_add_page13`: a new Page 13 (pets) is added, then the dog question is asked again.
- `word_match.experiment_one_big_card`: the whole handbook as a single card.

## Rerun
```bash
cd /workspace/rag-script/demo
python3 -m venv .venv            # already exists on this box
.venv/bin/pip install --index-url https://download.pytorch.org/whl/cpu torch
.venv/bin/pip install scikit-learn sentence-transformers
.venv/bin/python rag_demo.py     # writes results.json, prints a summary
```
The first run downloads paraphrase-multilingual-MiniLM-L12-v2 (~470 MB) from Hugging Face. Two reruns on this box
produced byte-identical `results.json`. Versions used are recorded in `results.json -> settings`.

## 2026-09-30: model switch (current results)
`meaning` now uses the same model as `rag_demo_zh.py` and the embedding book. `word_match` is
unchanged (the whole `word_match` block of results.json is byte-for-byte equal to the old one).

| question | meaning top-3, new model (page: score) | old all-MiniLM-L6-v2 |
|---|---|---|
| What time is breakfast? | **4: 0.7158**, 2: 0.5214, 3: 0.4278 | 4: 0.74, 5: 0.47, 2: 0.45 |
| What time is checkout? | **2: 0.7188** (Check-in, wrong card), 3: 0.6933, 11: 0.411 | 3: 0.69, 2: 0.56, 4: 0.47 |
| Is there a swimming pool? | **6: 0.5734**, 7: 0.3602, 9: 0.1915 | 6: 0.54, 7: 0.26, 10: 0.25 |
| Where can I park my car? | **9: 0.3571**, 6: 0.3195, 11: 0.2119 | 9: 0.45, 6: 0.23, 10: 0.20 |
| Can I bring my dog? | 1: 0.1619, 12: 0.154, 10: 0.1198 | 1: 0.19, 11: 0.19, 10: 0.18 |
| What time can I swim? | **6: 0.5282**, 2: 0.3346, 7: 0.3183 | 6: 0.59, 7: 0.38, 2: 0.33 |
| What time are breakfast and dinner? | **4: 0.7442**, 5: 0.5526, 2: 0.4695 | 4: 0.72, 5: 0.63, 2: 0.42 |

Experiments: old Page 4 → Page 4 0.7042 (was 0.71); add Page 13 → Page 13 0.2718 (was 0.37).
Card pairs 4–5 / 4–9 / 6–7 / 6–3 / 2–3: 0.81 / 0.22 / 0.55 / 0.24 / 0.77 (were .83/.17/.48/.20/.68).

**Threshold.** `settings.threshold_check_en`: lowest answerable top-1 = 0.2718 (Page 13 for the dog
question), highest unanswerable = 0.1619 (dog, no Page 13). 0.30 no longer separates them (Page 13
would fall under the line). zh needs a line in (0.2821, 0.3614]; en needs one in (0.1619, 0.2718];
the ranges do not overlap, so no single line works for both. The English line is now **0.20**
(zh stays 0.30). **Confirmed by the user on 2026-09-30** (see ../fixes-model-switch.md).
Note: checkout is "answerable" and clears any line, but its top card is the wrong one (Check-in).

## Old results with all-MiniLM-L6-v2 (results_minilm_l6.json; scores rounded to 2 places here)
| question | word_match top-3 (page: score) | meaning top-3 (page: score) |
|---|---|---|
| What time is breakfast? | 3: 0.2722, 4: 0.2718, 2: 0.26 | **4: 0.74**, 5: 0.47, 2: 0.45 |
| What time is checkout? | **3: 0.59**, 11: 0.36, 2: 0.28 | **3: 0.69**, 2: 0.56, 4: 0.47 |
| Is there a swimming pool? | **6: 0.51**, 12: 0, 10: 0 | **6: 0.54**, 7: 0.26, 10: 0.25 |
| Where can I park my car? | all 0 (no shared word) | **9: 0.45**, 6: 0.23, 10: 0.20 |
| Can I bring my dog? | all 0 | 1: 0.19, 11: 0.19, 10: 0.18 → under 0.30 → "I don't know" |
| What time can I swim? | 3: 0.42, 2: 0.40, 12: 0 | **6: 0.59**, 7: 0.38, 2: 0.33 |
| What time are breakfast and dinner? | 5: 0.23, 3: 0.22, 4: 0.22 | **4: 0.72**, **5: 0.63**, 2: 0.42 |

Experiments (meaning): old Page 4 → top Page 4 (0.71), template answer says 7:00–10:00;
add Page 13 → dog question top Page 13 (0.37) → answer quotes Page 13.
Word_match still scores 0 for the dog question after adding Page 13 ("dog" ≠ "dogs").
Whole handbook as one card: 186 words, breakfast score 0.13, but there is no page to point to.

Page 1–12 of the handbook are the "cards" the script shows; the kids' script uses
`score_x100` (= round(score × 100)) as "points".

## Added in review round 1
`results.json -> word_match.word_rarity` (how many cards contain a word, and its IDF weight:
desk 6 cards / 1.619, time 2 / 2.466, checkout 2 / 2.466, breakfast 1 / 2.872) and
`word_match.important_words_per_card` (words left after skipping small words; Page 11 has 4,
Page 2 has 7 — why Page 11 scores 36 and Page 2 scores 28 for the checkout question).
All earlier fields are unchanged (verified by diffing against the previous results.json).

## Word-weight fields (added in round 2)

`word_match` in results.json also contains:

- `card_word_shares`: for each page, the L2-normalized TF-IDF weight of each important word (the squares' sizes in c3-p3).
- `question_word_shares`: the same for each question.
- `cards_per_word`: how many cards each word appears on.

The word-match score is cosine similarity of these normalized vectors:
score = Σ over matched words (question share × card share). Example: checkout question
(checkout .707, time .707) × Page 3 (checkout .418, time .418) = .591 → 59.
These fields are extra; all other fields are unchanged from round 1.

## Chinese card set (added for the zh game locale)

The zh game uses **Chinese cards**; the ja game keeps the **English cards** above.
`results.json` (English) was not touched: `rag_demo.py` was not changed, and the file's sha256 is
the same before and after the Chinese work.

| file | what |
|---|---|
| `handbook_zh.txt` | 12 Chinese cards, written in Chinese from the start (not a line-by-line translation). Same page ids, same facts, same times/prices/floors as `handbook.txt`. Still FICTIONAL. |
| `handbook_old_zh.txt` | old Page 4 in Chinese (7:00–10:00) |
| `rag_demo_zh.py` | same pipeline as `rag_demo.py`; only the tokenizer, stop words, embedding model and Chinese labels differ |
| `results_zh.json` | same structure as `results.json` (same keys), plus zh-only extras: `settings.tokenizer`, `settings.stop_words_zh`, `settings.threshold_check_zh`, `word_match.jieba_cut_cards`, `word_match.jieba_cut_questions` |

Test questions (Chinese versions of the same 7): 早饭是几点？ / 几点退房？ / 有游泳池吗？ /
车可以停在哪里？ / 可以带狗吗？ (the "I don't know" case) / 几点可以游泳？ / 早饭和晚饭是几点？
The new Page 13 is 「小狗和小猫可以住在三楼的房间。请告诉前台。」

### Tokenizer: jieba (not character bigrams)
- Chinese has no spaces, so TF-IDF needs a word cutter. We use **jieba 0.42.1**, which segments using a
  dictionary (default dictionary, precise mode `jieba.lcut`, HMM on). Source: https://github.com/fxsjy/jieba (MIT).
- Why jieba rather than character bigrams: the kids' script explains the word-match retriever as
  "the computer cuts the sentence into words, then compares words." jieba output is made of real words
  (退房, 早饭, 游泳池), so the lit-up squares on screen are words a child can read. Bigrams would give
  fragments like 泳池 or 房时. jieba also shows a real weakness honestly: it cuts
  游泳池 / 停车场 / 晚饭时间 / 带狗 as single pieces, so 游泳, 停/车, 晚饭 and 狗 do not match them.
- Punctuation and whitespace are dropped. Single-character words ARE kept (车, 停, 狗 are real words).
- Stop words: sklearn has no Chinese list, so `STOP_ZH` in `rag_demo_zh.py` is a small hand-written list
  (particles, pronouns, prepositions, auxiliaries, and question words like 几点/什么/哪里/吗). It is saved in
  `results_zh.json -> settings.stop_words_zh`.
- `n_words` / `card_word_counts` for Chinese = the number of jieba words (without punctuation).

### Embedding model: paraphrase-multilingual-MiniLM-L12-v2
- `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`, 384 numbers per text (same size as the
  English model), CPU, cosine of normalized vectors.
- Model card: https://huggingface.co/sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2 .
  Its metadata lists `zh-cn` and `zh-tw` under `language_bcp47`, among 50+ languages. License: Apache-2.0.
  The model comes from Reimers & Gurevych, Sentence-BERT (EMNLP 2019, arXiv 1908.10084).
- Snapshot used on this box: revision `e8f8c211226b894fcb81acc59f3b34ba3efd5f42` (model.safetensors 470,641,600 bytes).
- Like the English model, this is a dense retriever in the spirit of the paper's DPR, **not** the paper's model.

### Threshold check (Chinese)
The rules are unchanged: 0.30 for meaning and 0.10 for word_match. Both are our own rules, not from Lewis et al. 2020.
Evidence is recorded in `results_zh.json -> settings.threshold_check_zh`:
- meaning, top-1 score of answerable questions: 0.7356, 0.642, 0.5542, **0.3614** (parking, lowest),
  0.5273, 0.7608; old Page 4 0.7401; dog after adding Page 13 0.3702.
- meaning, top-1 of the unanswerable dog question: **0.2821**.
- 0.2821 < 0.30 ≤ 0.3614, so 0.30 still separates the two groups. **Kept 0.30.** The gap is much smaller than in English
  (English dog 0.192), so this line is fragile and would need re-checking if cards or questions change.
- word_match: some answerable questions score 0.0 (parking, swim, dog after Page 13), so no word_match line could
  separate them. That is a failure of the retriever, not of the threshold.

### Results (Chinese; copied from results_zh.json)
| question | word_match top-3 (page: score) | meaning top-3 (page: score) |
|---|---|---|
| 早饭是几点？ | **4: 0.3164**, rest 0 | **4: 0.7356**, 2: 0.4529, 5: 0.3912 |
| 几点退房？ | **3: 0.3521**, 11: 0.3076, rest 0 | **3: 0.642**, 2: 0.561, 12: 0.4817 |
| 有游泳池吗？ | **6: 0.3407**, rest 0 | **6: 0.5542**, 7: 0.3554, 9: 0.2306 |
| 车可以停在哪里？ | all 0 (车/停 vs 停车场/停一晚) | **9: 0.3614**, 11: 0.3301, 2: 0.3123 |
| 可以带狗吗？ | all 0 | 12: 0.2821, 11: 0.2073, 3: 0.1646 → under 0.30 → "我不知道" |
| 几点可以游泳？ | all 0 (游泳 vs 游泳池) | **6: 0.5273**, 7: 0.3728, 2: 0.2405 |
| 早饭和晚饭是几点？ | 4: 0.3164, rest 0 (Page 5 is cut as 晚饭时间) | **4: 0.7608**, **5: 0.5374**, 2: 0.3944 |

Experiments: old Page 4 → meaning top Page 4 0.7401 (new card 0.7356; both show as 74), answer says 7:00–10:00.
Add Page 13 → meaning top Page 13 0.3702 → answer quotes Page 13; word_match still 0 (带狗 vs 小狗).
Whole handbook as one card: 167 words, breakfast word_match 0.0629.

Differences from English worth knowing: with Chinese cards, word_match gets the breakfast question **right**
(English picked the checkout card by a hair). In the meaning results, the top card is right for every answerable Chinese question.

### Rerun (Chinese)
```bash
cd /workspace/rag-script/demo
.venv/bin/pip install jieba==0.42.1
.venv/bin/python rag_demo_zh.py   # writes results_zh.json; downloads the multilingual model (~470 MB) on first run
```
Two runs on this box produced byte-identical `results_zh.json`.

## Sources
- Lewis et al. 2020, "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks", NeurIPS 2020,
  arXiv 2005.11401v4. See the source table in `../00-outline.md`.
- jieba: https://github.com/fxsjy/jieba (v0.42.1).
- all-MiniLM-L6-v2 (English): https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2
- paraphrase-multilingual-MiniLM-L12-v2 (Chinese): https://huggingface.co/sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2
- scikit-learn TfidfVectorizer: https://scikit-learn.org/stable/modules/generated/sklearn.feature_extraction.text.TfidfVectorizer.html

## Round 5: "I don't know" wording
The template now says the retriever found no card over the line. It no longer claims the handbook has no matching page, because a word-match score of 0 can happen even when the answer is in the handbook (e.g., parking).
- en: `I don't know. I found no card with a score over the line. Please ask a hotel staff member.`
- zh: `我不知道。我没找到分数过线的卡片。请问问酒店的工作人员。`
Both scripts were re-run. Apart from `template_answer`, every field in results.json and results_zh.json is identical to the previous run. The template text changed in 4 of 18 answers in results.json and 5 of 18 in results_zh.json.
