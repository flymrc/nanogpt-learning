# Review request for the 8岁挑刺员 (embed-script, round 1)

Please review `/workspace/embed-script/zh.md` and `/workspace/embed-script/ja.md` in the same way as the RAG script
(`/workspace/rag-script/review-round1..5.md`).

**The book:** a sequel to the RAG tutorial that opens the "search by meaning" black box: word vectors / embeddings (词向量 / 単語ベクトル).
It has 5 chapters × 5 pages, and zh and ja were each written natively. The page beats are:
- zh: 小G的问题, 目标, 看看, 做做, 小G的话, 小结, 试试, 动画, 配音
- ja: ふきだし, めあて, みてみよう, やってみよう, ことば, まとめ, たしかめよう, アニメーション, ナレーション

**Please check, as an 8-year-old would:**
1. Is there any word I can't understand, or any word with no picture (向量/ベクトル, 夹角/角, 直角, 压扁/ぺちゃんこ, 方向, 384)?
2. Does any sentence use an arrow instead of words, or a decimal or negative number?
3. Does each number match the data?
   - The data files are `demo/results.json`, `../rag-script/demo/results_zh.json` and `../rag-script/demo/results.json`.
   - Each chapter's maker table names the field.
   - `verify.py` and `verify_pairs.py` check this.
4. Is anything told as a fact that isn't one? In particular:
   - the "teacher/student" story (Reimers & Gurevych 2020);
   - "trained on 50+ languages";
   - the hiragana claim in ja c5-p2, which is limited to the 3 tested words.
5. Is the closeness-points teaching consistent with RAG?
   - 分越高越近 (the higher the score, the closer), and 100 = the same spot.
   - The RAG card pairs: zh 80, ja 83.
6. ja only: ja c3-p5 and c5-p3/p4 mix RAG-book scores (all-MiniLM-L6-v2: 45, 71/74) with this book's model (36, 16). Is the kid-level explanation in c3-p5 clear enough?
7. Is anything too long for one page, or any 试试 answer that can't be found on the page?

Please save your findings as `review-round1.md` (numbered items, with a severity for each). End with PASS or NOT YET.
