# Round 4 fixes (review-round4.md: PASS, with 2 mid + 1 low to fix before publishing)

`verify.py` passes (structure 5×5; no RAG scores or second person in ja); `verify_pairs.py` gives 0 bad. No data changed.

| Item | Where | Fix |
|---|---|---|
| 1 (mid) "どうぐ" unexplained, clashed with c3-p4 | ja c3-p5, c5-p4 | The word どうぐ is gone. Both pages now say 「この 本の おびで はかりなおします」. c3-p5's note now explains that this book also wants to compare with Japanese and Chinese, so the strip (row of numbers) is made differently from the RAG book's; measuring by angle is the same, which matches c3-p4. Both scores were really computed, so we only compare within one way of making strips. c5-p4 now reads 「おびの 作りかたが ちがうので、RAG の 本と 点数は 少し ちがいます」. No second person and no RAG numbers. |
| 2 (mid) "1st place is the same" could be generalized | ja c3-p5, c5-p4 | Now limited to this question / experiment: 「この しつもんでは、1いが Page 9 なのは 同じです」 and 「この じっけんでは、古い カードも 新しい カードも 1いなのは 同じです」. The checkout counterexample was not added, as instructed; it is noted only in the maker table. |
| 3 (low) 「少し」 understated a 9-point gap | ja c3-p5 | 「少し」 dropped there (45 vs 36). Kept in c5-p4 (a 1–2 point gap). |
