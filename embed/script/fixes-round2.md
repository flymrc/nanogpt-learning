# Round 2 fixes (reply to review-round2.md, NOT YET)

Scope: round-1 items #3 and #8 (partial) plus new items 1–9.
- `verify.py` passes. It now also fails if ja kid text quotes 45/71/74/83てん or mentions a second number-maker (「RAG の 本の 人」「べつの 人」).
- `verify_pairs.py` gives 0 bad.
- `embed_demo.py` gained `rag_link.old_page4_recomputed_here`. Two runs gave byte-identical `results.json`.
- New `demo/teacher_check.py` and `teacher_check.json` hold a real run of the teacher model and the student.

**User decision applied (ja two-model mixing):** ja no longer quotes any RAG-book score and never mentions a second 「人」. Every ja score comes from this book's model (paraphrase-multilingual-MiniLM-L12-v2). The RAG book is referred to only qualitatively (「RAG の 本で やった くらべっこを、もう一度」).

| Item | Where | Fix |
|---|---|---|
| New 1 (high) | zh c1-p5 目标 + 小G的话 | The reviewer's replacement: the teacher only knows English and gives breakfast and morning meal similar strips; the student makes both 早饭 and 早餐 look like the teacher's breakfast strip, which is why the two are alike, and the same happens across languages. I checked it with a real run (`teacher_check.json`). Teacher: 早饭/早餐/午饭/停车 all 100 against each other, 早饭–breakfast 14, breakfast–morning meal 84. Student: 早饭–breakfast 98, 早餐–breakfast 99. The kid text quotes no teacher numbers; the maker table cites the file. |
| New 2 (mid) / rule ③ | ja c5-p3 (+ 小结, chapter summary) | The reason for "take several cards" is back, using this book's numbers: whole sentence gives Page 9 36 and 2nd Page 6 32, only 4 ahead, so we take several cards (0.3571 / 0.3195). |
| New 3 (mid) 45 vs 36 | ja c3-p5, c5-p3 | 45 is gone. c3-p5 now shows this book's Page 9 36 and Page 6 32, and c5-p3 says 「36てん（第3章と 同じ）」, so the two pages agree. |
| New 4 (mid) two people / round-1 #3 | ja c1-p5, 目标, maker table | The two-person paragraph and the 目标 sentence were deleted. With no second person, there is no clash with RAG ja c3-p9 (「中に 1人」). |
| New 5 (low) 0てん source | ja c3-p5 | Now reads 「12まい ぜんぶ 0てん（RAG の 本の「同じ 語を かぞえる」やりかた。数字に する 人は つかいません）」. The maker table cites RAG `results.json` `word_match.questions[q4_parking]` (all 0.0; park and car appear on no card). |
| New 6 (low) | zh/ja chapter 4 intro | 「影子少了一根尺子（前后那根）」 and 「ものさしが 1本（前後の 1本）へって」. |
| New 7 (low) | map_zh.png | Title is now 「词的地图：压扁的影子（第 4 章再讲）」, matching ja. |
| New 8 (low) | ja c2-p1 | Added フロント: 「かぎ・チェックアウト・チェックイン・フロント」. |
| New 9 (low) | ja front matter (card rule) | 「数字に する 人は 日本語も わかりますが、この 本では RAG の 本（カードが 英語でした）と そろえる ために、小さい 英語を 読んで もらいます。」 |
| Other RAG scores in ja | c2-p2, c3-p4, c5-p4, chapter 5 summary | c2-p2 keeps only "whole card vs single word". c3-p4 says the RAG meaning score is measured the same way (angle), with no number. c5-p4 recomputes the old-card experiment with this book's model: old Page 4 70, new Page 4 72, both 1st (`rag_link.old_page4_recomputed_here.en`). The same code gives zh 74/74, matching rag-script, which confirms the method. |
| Round-1 #8 | zh c1-p5 | Resolved by New 1. ja was already correct. |

Kid-facing ja numbers that changed: c3-p5 45 became 36 (plus 2nd place 32); c5-p4 71/74 became 70/72; the c3-p4 animation note now reads 「45度でも 70てんより 上」.
