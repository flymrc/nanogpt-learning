# Round 3 fixes (reply to review-round3.md, NOT YET: 1 high, 3 low)

`verify.py` passes; its ja check still bans RAG scores (45/71/74/83) and any second person. `verify_pairs.py` gives 0 bad. No data changed.

| Item | Where | Fix |
|---|---|---|
| 1 (high), option A | ja front matter, c3-p5, c5-p4 | "もう一度" is now 「RAG の 本と 同じ しつもん／じっけんを、この 本の どうぐで はかりなおします」. c3-p5 adds after 32てん: 「（RAG の 本の 点数とは 少し ちがいます。この 本の どうぐで はかりなおしたからです。でも 1いが Page 9 なのは 同じです。）」. c5-p4 adds after 72てん: 「（RAG の 本と 点数は 少し ちがいますが、古い カードも 新しい カードも 1いなのは 同じです。）」. Front matter: 「RAG の 本と 同じ 英語の カードを つかう ために」. No second person and no RAG numbers. |
| 1: fact check | maker tables | "1st place is the same" holds in every case. Parking: RAG ja Page 9 1st (0.4483); here Page 9 1st (0.3571). Old Page 4: RAG 1st (0.7058); here 1st (0.7042). New Page 4: RAG 1st (0.7364); here 1st (0.7158). **Not written: "the tool is newer".** I couldn't verify it: both models show the same HF createdAt (2022-03-02, a migration date), and from SBERT's release history the paraphrase-v2 models seem to be the older ones. The kid sentence therefore only says the scores differ a little because we re-measured with this book's tool. |
| 2 (low) | zh c1-p5 看看 | 「学生（变数字的人）学过 50 多种语言，中文和日文都在里面。老师只会英文。」 |
| 3 (low) | zh c1-p5 小G的话 | 「breakfast 和 morning meal（都是「早饭」的英文说法）」 |
| 4 (low) | ja c5-p3 めあて, アニメーション, ナレーション | めあて adds 「でも 2いも すぐ うしろなので、カードは 何まいか とります」. The animation adds Page 6's needle rising to 32 right behind, so the two needles nearly line up. The narration adds 「でも 2いも すぐ うしろ。だから カードは 何まいか とります。」 |
