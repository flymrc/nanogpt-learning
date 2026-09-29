# Round 1 fixes (reply to review-round1.md, NOT YET, 17 items)

All 17 items are fixed. `verify.py` passes (structure 5×5 in both files; no arrows, decimals or negatives in the kids' text; every 分/てん number is traceable). `verify_pairs.py` gives 34 OK and 0 bad; its parser now strips furigana readings, which fixes the reviewer's false CHECK on 駐車場（ちゅうしゃじょう）.
`results.json` is byte-identical after the re-run. Only the PNG titles and labels changed.

| # | Sev | Where | Fix |
|---|---|---|---|
| 1 | High | zh c3-p5 | 小G的话 now says meaning search compares the whole-question arrow with whole-card arrows; the word pairs only show that different characters can still point close; and one word alone may not find the card (forward reference to c5). 小结, 做做, the chapter summary and the 看看 caption were changed to match. Data behind it: 车 alone gives Page 12/11/2, and c5-p3 agrees. |
| 2 | High | zh/ja c2-p2, c2-p4 | The table caption says it looks like the RAG table, but RAG compared whole cards and this book compares single words, so the scores differ. ja also says RAG used a different number-maker. c2-p4 adds "单词和单词比，不是整张卡片". zh c3-p4 now says 「RAG 书里整张早饭卡和整张晚饭卡 80 分」. |
| 3 | High | ja c1-p5, c3-p4, c3-p5, c5-p3, c5-p4, c5 summary | The explanation now comes before any score: c1-p5 says this book's 数字に する 人 is a different person from the RAG book's, and every RAG score is labelled 「RAG の 本の 人の 点数」. c3-p4: the 83てん card pair was removed; it now only says the measuring method (angle) is the same. c3-p5: 45てん is labelled, the right-hand word pairs are labelled as this book's person, and the 36/32 recompute sentence was deleted (fewer cross-model comparisons). c5-p3: the unverified "16 < RAG line 30 means わかりません" conclusion was removed; the page now compares 16 (car alone) with 36 (whole sentence), both from this book's model. c5-p4 and the summary label 71/74. The maker tables name the sources. |
| 4 | High | zh/ja c3-p1, c4-p1, c4-p2, c4-p4, c4 summary, tables | "384 个方向" was replaced with 「箭头住在一个有 384 根尺子的大空间里」 (ja: 「ものさしが 384本 ある 大きな 場所に いる」). Each ruler holds one of the arrow's numbers, and there is still only one arrow per word. c4-p1 was rewritten around 2 rulers on paper, 3 in a room and 384 where the arrow lives. The PCA text now says "384 根尺子压扁成 2 根". The zh map title matches. |
| 5 | Mid | zh/ja c3-p2 | Added: in chapter 1 "same length" meant the same number of squares (384); the numbers inside differ in size, so the arrows differ in length. |
| 6 | Mid | zh c2-p1 | Map caption now: 「旁边挤着「狗、小狗」，还有「退房、入住、前台、钥匙」；「猫」也挤在入住旁边」. |
| 7 | Mid | zh/ja c3-p4, c3-p3 | Added a note that the scale is not even: at half a right angle the score is still about 70, and it falls faster near 90°. The animation notes give real angles (7/47/81°; ja 28/44/82°) and scale marks (45° ≈ 71, 60° = 50). Maker tables show cos 45° ≈ 0.71 and cos 60° = 0.5. |
| 8 | Mid | zh/ja c1-p5 | The teacher first trained on "same meaning, different wording" sentences, which explains 早饭/早餐 and breakfast/morning meal. The student copied the teacher, which explains cross-language. Source added: the SBERT Paraphrase Data page (paraphrase-MiniLM-L12-v2 trained on AllNLI, quora_duplicates and others) and the model card ("multilingual version of paraphrase-MiniLM-L12-v2"). |
| 9 | Mid | map_zh.png / map_ja.png | Titles no longer show percentages: 「词的地图：压扁成 2 根尺子的影子（第 4 章再讲）」 and 「ことばの 地図：ぺちゃんこの かげ（第4章で せつめい）」. |
| 10 | Mid | zh/ja c4-p2 + summary | The text now says what is kept: how spread out the word ball originally was. All 20 words are still there. 试试 and 小结 were reworded to match. |
| 11 | Low | ja | Readings added: 猫（ねこ）, 駐車場（ちゅうしゃじょう） in c5-p2, 生徒（せいと）, and 単語（たんご） at its first use in c1 and c5 (c2–c4 don't use it). 以上 became いじょう. |
| 12 | Low | zh c3 | 算法 became 计算办法. 扇形 became 像扇子一样的地方 (kid text and animation). 夹角 became 两只胳膊中间的角, and the page title became 角越小，越近. |
| 13 | Low | zh c5-p3 | Added: the two 40s differ by a hair (0.4030 vs 0.3960). All three are above the RAG 30 line, so if 停车 were the question the fill-in sheet would bring the 失物招领 card: a wrong answer. This uses the same model as the zh RAG, so the comparison is valid. |
| 14 | Low | ja c5-p2 | Added that the book's word cards have the number-maker read the small English, so this problem doesn't happen there. The hiragana claim is kept but scoped: 「ここで ためした 3つの 語では ひらがなが にがてでした」. |
| 15 | Low | ja c1-p5 | Removed "95てん" and the conflict with the card rule. The page now says that putting 朝ごはん in as Japanese gives a strip similar to breakfast's. 95 first appears in c2-p5. |
| 16 | Low | zh/ja c1-p1 | Colour rule: the further to one side, the redder; the further to the other side, the bluer; near 0 is pale. No negatives mentioned. |
| 17 | Low | map_ja.png | Labels for the food corner (breakfast/lunch/dinner/morning meal) and for the dog/dogs/cat trio are hand-placed with leader lines. Axis margins were added so no point sits on the frame. |

## Pages in ja that would get simpler if ja RAG switches to the multilingual model (pending user decision)
- c1-p5: the "different person" paragraph could go.
- c2-p2: the caption could drop the "RAG の 本の 人" half and keep only whole card vs single word.
- c3-p4: could bring back a real card-pair example, as zh does with 80.
- c3-p5: one person, one score set. The RAG meaning score would become 36 (Page 6 32), and the labels would go.
- c5-p3: could compare 16 against the RAG 30 line again, as zh c5-p3 does.
- c5-p4 and the c5 summary: the labels on 71/74 would go. The values would need recomputing with the multilingual model.
- The RAG ja book itself would also need its numbers re-run (45, 74/47/45, 59/38/33, 83/17, and so on).
