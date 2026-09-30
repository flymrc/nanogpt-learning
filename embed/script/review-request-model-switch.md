# Review request: model switch (both books), for the 8岁挑刺员

**What happened:** the user decided that the ja side of the RAG book (English Hotel Hoshi cards) should use the same
embedding model as the zh side and this book: `paraphrase-multilingual-MiniLM-L12-v2`. Before, it used `all-MiniLM-L6-v2`.
Now one model makes every "meaning" score in both books and both languages. The word-counting (TF-IDF) scores did not change.

Please review both parts, using the same bar as before (8-year-old, real numbers, no jargon without a picture, zh/ja native).
zh is unchanged in both books. You only need to check the ja pages listed below.

## Part A: RAG book, ja (`/workspace/rag-script/ja/03…05-chapter*.md`)
Full list of every old → new number: `/workspace/rag-script/fixes-model-switch.md`. Data: `rag-script/demo/results.json` (old: `results_minilm_l6.json`).

Please look hardest at:
1. **The line is now 20てん in ja (was 30; zh stays 30).** Real reason: with the new model, the new Page 13 (Pets) scores 27 for the dog
   question and the dog question without Page 13 scores 16. A 30 line would keep saying "わかりません" even after Page 13 is added,
   which breaks c5-p6. No single line fits both zh and en. **This is a proposal waiting for the user's OK.**
   Check c5-p4, c5-p6 and the header note: does the 20 line read naturally? Is anything left that still says 30?
2. **Checkout is no longer a by-meaning example.** With the new model, Check-in (72) beats Checkout (69), so the fill-in sheet would give the wrong page.
   c4-p7 たしかめよう and c4-p9 (the conveyor) now use the pool question: Page 6 57 / 7 36 / 9 19, answer Page 6.
   The word-counting aside is now "Page 6 is 51 with word counting". Is the swap clean? Does c4-p9 still link back to ch. 3 well?
3. **Breakfast's 2nd and 3rd cards changed** (now Check-in 52, Checkout 43; was Dinner 47, Check-in 45).
   Rewritten: c3-p7 (the たしかめよう answer is now Page 2), c4-p1, c4-p2 (the joined text), c4-p4 (the three cards on the desk and its たしかめよう), c5-p4 (the "wrong card over the line" example is now Check-in 52).
4. c3-p5 table (81 / 22 / 55 / 24), c3-p6 swim (53 / 33 / 32, 2nd and 3rd swapped), c4-p5 (74 / 55 / 47), c5-p3 (72, 36), c5-p4 dog (16 / 15 / 12, Page 12 おとしもの, "hair higher" remark removed), c5-p6 (27), c5-p7/p8 (70, 72).

Checker: `python3 /workspace/rag-script/verify_ja_scores.py`. It checks that every 「Nてん」 in ja is a real score, runs targeted checks on the changed claims, and bans old-model values. It passes.

## Part B: embedding book, ja (`/workspace/embed-script/ja.md`)
Because both books now share one model, ja may quote RAG-book scores again. The "re-measured with this book's strips" framing
and the "only for this question" caveats (rounds 3–4) are removed.
- **c1-p5:** added one sentence: 「RAG の 本で さがし係の まどに いたのも、この 同じ 数字に する 人です。」 (It is now true.)
- **c3-p4:** added the whole-card example (as zh does with 80): the whole 朝ごはん card and the whole 夕ごはん card scored 81 in the RAG book.
  The parenthesis says it is a whole-card score. c2's single-word 朝ごはん–夕ごはん is 63, and the c2 caption already says whole cards and single words differ.
- **c3-p5:** 「左は RAG の 本 第5章と 同じ しつもんです。」 Page 9 36 / Page 6 32 「（RAG の 本と 同じ 点数です）」. The long strip-making note is gone.
- **c5-p3:** added (as zh c5-p3 does with its 30 line): 「車」だけの 16てん is under the RAG book's line (20てん), so the fill-in sheet would say わかりません.
  This depends on the pending line decision. With a 30 line, 16 is still under it, so only the number in brackets would change.
- **c5-p4:** 「RAG の 本 第5章の じっけんを もう一度 見ます」. Old 70 / new 72 「（RAG の 本と 同じ 点数です）」. The caveat is gone.
- Creator tables (ch. 1, 3, 5) updated with the RAG `results.json` field paths.
- `verify.py`: the old ban on quoting RAG scores in ja is replaced. Now every number on a ja line that mentions RAG must be a real score in the current RAG `results.json` (or its line). Old-model values (45, 71, 83, 37) are banned. The three RAG claims are checked against the data. `embed_demo.py` now asserts that its recomputed RAG numbers equal rag-script's.
- zh.md is unchanged.

Numbers to spot-check (all points = round(cos × 100)):
parking P9 0.3571 → 36, P6 0.3195 → 32 · old P4 0.7042 → 70, new P4 0.7158 → 72 · card pair 4–5 0.8089 → 81 ·
car alone P9 0.1559 → 16 · RAG ja line 0.20.

Checks run: `verify.py` OK, `verify_pairs.py` bad 0, `rag-script/verify_ja_scores.py` OK.
