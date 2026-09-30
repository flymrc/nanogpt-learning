# 英語カード版（日本語版が つかう）の 出典・数字の 確認表（制作者向け、子どもには 見せない）

> 日本語版は 英語の カード（demo/handbook.txt）と demo/results.json を つかいます。
> 中国語版は 中国語の カード（handbook_zh.txt／results_zh.json）に かわったので、中国語版の 付録は もう 日本語版の 確認には つかえません。
> 下の 表は、中国語版が まだ 英語カードを つかって いた ときの 付録（round 3 の 版）を うつした ものです（表の 中の ことばは 中国語）。
> **2026-09-30 モデル切りかえ**：meaning（いみの じゅうしょ）を all-MiniLM-L6-v2 から paraphrase-multilingual-MiniLM-L12-v2 に かえました（中国語版・単語ベクトルの 本と 同じ）。meaning の 行は 新しい results.json に あわせて 書きかえました（古い 値は results_minilm_l6.json、変更一覧は ../fixes-model-switch.md）。word_match の 行は かわりません。

## 1しょう（もとの 中国語版 01-chapter1.md 付録）
| 画面里的内容 | 来源 / 核对 |
|---|---|
| Hotel Hoshi、手册所有页 | 虚构。demo/handbook.txt（新）、demo/handbook_old.txt（旧 Page 4） |
| 旧 Page 4：7:00–10:00；新 Page 4：6:30–9:30 | handbook_old.txt / handbook.txt 原文；results.json `old_page4`、`cards[3]` |
| Page 6 游泳池原文 | handbook.txt；results.json `cards[5]` |
| 小G 说「7:00 到 10:00」「游泳池在 1 楼，24 小时都开」 | **故事**，不是模型输出。只是演示「只靠记忆」会怎样 |
| 「记忆」只指脑袋里的东西；卡片盒（第 2 章起）从不叫记忆 | 用词规则（review-round1） |
| 只靠参数记忆：不容易扩充或修改记忆、说不清根据、会「幻觉」 | 论文 Abstract；§1 第 1 段（"cannot easily expand or revise their memory, can't straightforwardly provide insight into their predictions, and may produce 'hallucinations'"） |
| 只靠记忆的模型要更新知识需要再训练 | 论文 §4.5 Index hot-swapping（"Parametric-only models like T5 or BART need further training to update their behavior as the world changes"） |
| 换资料就能更新，不用重新训练 | 论文 §4.5、§6（"hot-swapped to update the model without requiring any retraining"） |
| 两个助手：retriever + generator | 论文 §2 开头、Figure 1 |
| 2020 年的研究 | Lewis et al., NeurIPS 2020；arXiv 2005.11401 |
| 说出第几页 | **我们的做法**。论文只说「提供根据（provenance）」是还没解决的难题（Abstract），资料是人能读的文字所以更好检查（§5）。论文没有做页码引用 |
| 「一次改一点点，改很多次」 | 《小G学写字》第 4 章（nanoGPT），这里不写具体次数 |
| 午饭黑板、天气预报 | 本地化类比，不算分 |

## 2しょう（もとの 中国語版 02-chapter2.md 付録）
| 画面里的内容 | 来源 / 核对 |
|---|---|
| 12 页标题（Welcome … Lost and found） | demo/handbook.txt；results.json `cards` |
| 按页剪卡（一页一张） | rag_demo.py `chunk()`；**我们的做法**，不是论文的 |
| 整本 186 词 | results.json `word_match.experiment_one_big_card.n_words`（画面不再显示分数） |
| 第 3 页 15 词；12 张卡 14–18 词 | results.json `card_word_counts`（3→15；最小 14 为 Page 9/11，最大 18 为 Page 6） |
| Page 6 原文、剪成两半 | handbook.txt 原文；剪两半只是画面演示，demo 里没有这样切 |
| Page 9 原文（1,000 yen） | handbook.txt（虚构价格） |
| 维基百科切成不重叠的 100 词小段，共 2100 万段 | 论文 §3（"Each Wikipedia article is split into disjoint 100-word chunks, to make a total of 21M documents"） |
| 「一秒数一张，不吃不睡也要数大半年」 | 21,000,000 秒 ÷ 86,400 ≈ 243 天 ≈ 8 个月（由论文数字换算） |
| 卡片盒（不叫「记忆」） | 论文 §2.2 末句把文档索引叫 non-parametric memory；儿童文案按用词规则不叫记忆 |
| 资料是普通文字，人能读、人能改 | 论文 §5 Memory-based Architectures（"human-readable … human-writable, enabling us to dynamically update the model's memory by editing the document index"） |
| 脑袋里的记忆改不了一句 | 论文 §1、§4.5（只靠参数的模型要再训练才能更新） |
| 文具盒、水果篮 | 本地化/规律游戏，不算分 |

## 3しょう（もとの 中国語版 03-chapter3.md 付録）
| 画面里的内容 | 来源 / 核对 |
|---|---|
| checkout（数词）：Page 3 59、Page 11 36、Page 2 28 | results.json `word_match.questions[q2_checkout].top3`（0.5909 / 0.3634 / 0.282） |
| 跳过小词后剩 time、checkout；swim 问题剩 time、swim | results.json `question_words_kept`（TfidfVectorizer stop_words='english'） |
| 一样的词：Page 3 [checkout, time]、Page 11 [checkout]、Page 2 [time] | results.json `shared_words` |
| 其余 9 张 0 分 | TF-IDF：其余卡与问题无共同词（results 只存前 3；可用 rag_demo.py 复算） |
| 词的分量：desk 在 6 张卡、breakfast 在 1 张、time 和 checkout 各 2 张 | results.json `word_match.word_rarity`（idf 1.619 / 2.872 / 2.466 / 2.466） |
| Page 11 重要词 4 个、Page 2 7 个 | results.json `word_match.important_words_per_card` |
| 「份量」＝卡里/问题里 L2 归一后的 TF-IDF 权重；分数＝Σ(问题份量×卡片份量) | results.json `word_match.card_word_shares`、`question_word_shares` |
| checkout 题：问题份量 checkout .707、time .707；Page 3 checkout .418 + time .418 → .5909；Page 11 checkout .514 → .3634；Page 2 time .399 → .282 | 同上，逐项乘加复算一致 |
| swim 题：问题份量 time 1.0 → Page 3 .418、Page 2 .399（28→40 的原因：问题份量从 .707 变 1.0） | 同上 |
| Page 2 上 starts .464、tell .464（各只在 1 张卡上，`cards_per_word`=1）；Page 3 上没有只出现在它自己身上的词 | `card_word_shares["2"]`、`cards_per_word` |
| swim 问题：其余全 0 | results.json `word_match.questions[q6_swim].top3[2]` = 0.0 |
| swim（数词）：Page 3 42、Page 2 40、其余全 0 | results.json `word_match.questions[q6_swim].top3`（0.4178 / 0.3988 / 0.0） |
| swim（地址）：Page 6 53、Page 2 33、Page 7 32 | results.json `meaning.questions[q6_swim].top3`（0.5282 / 0.3346 / 0.3183） |
| breakfast（地址）：Page 4 72、Page 2 52、Page 3 43 | results.json `meaning.questions[q1_breakfast].top3`（0.7158 / 0.5214 / 0.4278） |
| 384 个数字（画成彩色小方块，示意） | results.json `meaning.address_info.numbers_per_address`；不再显示具体数值 |
| 地图 | **示意图**，位置不是算出来的 |
| 两张卡有多近：4–5 81、4–9 22、6–7 55、6–3 24 | results.json `meaning.card_pair_closeness` |
| 分数 = 余弦 × 100 | score_x100；我们的显示方式 |
| 研究：问题和资料都变成数字，内积最大的前 K 个（MIPS） | 论文 §2.2（DPR bi-encoder；d(z)=BERT_d(z)，q(x)=BERT_q(x)；top-k 是 MIPS 问题）；Figure 1 图注 |
| 蓝帽子里的两个「变数字的人」（query encoder / document encoder） | 论文 §2.2 |
| 资料的数字提前算好建成索引，训练时保持不变 | 论文 §2.4（"keep the document encoder (and index) fixed"）；§3（FAISS 索引） |
| 训练时取前 5 或 10 段 | 论文 §3（k ∈ {5, 10}）。我们游戏取 3，是**我们的选择** |
| 数词（BM25）vs 学出来的检索：多数任务后者好，FEVER 上 BM25 最好 | 论文 §4.5 Retrieval Ablations；Table 6 |
| 我们蓝帽子里的「变数字的人」 | sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2（2026-09-30 起；之前是 all-MiniLM-L6-v2），**不是**论文的 DPR/BERT；同一个模型同时编码问题和卡片；384 个数字不变 |
| 图书馆书架 | 本地化类比，不算分 |

## 4しょう（もとの 中国語版 04-chapter4.md 付録）
| 画面里的内容 | 来源 / 核对 |
|---|---|
| 早饭前 3 张：Page 4 72、Page 2 52、Page 3 43（c4-p4 的「不对的卡」因此是入住、退房） | results.json `meaning.questions[q1_breakfast].top3` |
| 接在一起的一段（逐字） | results.json `meaning.questions[q1_breakfast].combined_input_for_a_generator` |
| 早饭和晚饭：Page 4 74、Page 5 55、Page 2 47 | results.json `meaning.questions[q7_two_meals].top3`（0.7442 / 0.5526 / 0.4695） |
| 模板只搬第 1 张 → 漏掉晚饭 | results.json `q7_two_meals.template_answer`（只引用 Page 4） |
| 模板回答原文（早饭、游泳池）；中文句子只是意思翻译 | results.json `template_answer`；**不是模型输出** |
| 填空纸只搬第 1 张 | rag_demo.py `ask()`：`best = top[0]` |
| c4-p9 标明「意思的地址」；括号里的 51 分来自数词 | results.json `meaning…q3_pool`（0.5734）vs `word_match…q3_pool`（0.5142） |
| c4-p7、c4-p9 改用游泳池题：Page 6 57、Page 7 36、Page 9 19；模板回答 Page 6 | results.json `meaning.questions[q3_pool]`（0.5734 / 0.3602 / 0.1915）。**不再用退房题**：新模型下退房第 1 名是 Page 2 入住 0.7188 > Page 3 退房 0.6933，填空纸会搬错卡 |
| 问题和资料直接接在一起 | 论文 §2.3（"To combine the input x with the retrieved content z … we simply concatenate them"） |
| 生成器根据问题、资料和已写的字写下一个字 | 论文 §2（generator pθ(yi | x, z, y1:i−1)） |
| 一会儿看这张、一会儿看那张（合用几段资料） | 论文 §2.1 RAG-Token（"can predict each target token based on a different document"）；§4.3 + Figure 2（两段资料分别对应两本书名） |
| 裁判一对一对比较，RAG 更常被判为真 | 论文 §4.3、Table 4：Jeopardy 出题任务，452 对；RAG 更真 42.7%，BART 更真 7.1%。注意这是**出题任务**，画面只说「写出来的句子」 |
| RAG 较少「幻觉」、更常写出正确内容 | 论文 §4.2（MS-MARCO，定性观察） |
| 用对得上的卡、说出页码、模板 | **我们的做法**。论文没有页码引用 |
| R/A/G 的解释 | Retrieval-Augmented Generation 的字面意思（检索－增强－生成），儿童化说法 |
| 课本第 12 页的蘑菇题 | 本地化类比，不算分 |

## 5しょう（もとの 中国語版 05-chapter5.md 付録）
| 画面里的内容 | 来源 / 核对 |
|---|---|
| 早饭（数词）：Page 3「大约 27 分（高一根头发丝）」、Page 4「也是大约 27 分」、Page 2「大约 26 分」；共同词 time / breakfast / time | results.json `word_match.questions[q1_breakfast].top3`（0.2722 / 0.2718 / 0.2598）；`shared_words`。画面不显示小数 |
| 「30」.717 = 2 × breakfast .358（两词都只在 1 张卡上，「30」在 Page 4 出现两次） | `word_match.cards_per_word`、`card_word_shares["4"]` |
| 问题份量 breakfast .759 > time .652 | `word_match.question_word_shares.q1_breakfast` |
| 早饭卡：30 .717（出现 2 次、只在 1 张卡）、breakfast 只 .358；退房卡 time .418；入住卡 time .399 | `word_match.card_word_shares` 4 / 3 / 2；`cards_per_word["30"]`=1 |
| .759×.358 = .2718；.652×.418 = .2722；.652×.399 = .2598 | 乘积复算与 top3 分数一致。前两者几乎打平，画面说「不用细算」 |
| 填空纸搬第 1 张（数词时答退房） | results.json `word_match.questions[q1_breakfast].template_answer` |
| 早饭（数词）模板回答搬了 Page 3 | results.json `word_match.questions[q1_breakfast].template_answer` |
| 停车（数词）：全 0；park ≠ parking | results.json `word_match.questions[q4_parking]`：`question_words_known` 为空，前 3 都 0.0 |
| 早饭（地址）Page 4 72；停车（地址）Page 9 36 | results.json `meaning.questions` q1（0.7158）、q4（0.3571） |
| 小狗（地址）：Page 1 16、Page 12 15、Page 10 12 | results.json `meaning.questions[q5_dog].top3`（0.1619 / 0.154 / 0.1198） |
| 20 分线（ja；zh 仍是 30）；「我不知道」模板 | results.json `settings.no_card_threshold.meaning` = 0.20（`settings.threshold_check_en`：有答案的第 1 名最低 0.2718，狗题 0.1619；旧线 0.30 已分不开）；用户已确认（2026-09-30）；**我们自己定的**（看过这几题分数后定的），不是论文的；「我不知道」也**不是**论文内容 |
| 加 Page 13 后：Page 13 27 分，回答原文 | results.json `meaning.experiment_add_page13.result`（0.2718）。27 离 20 分线只有 7 分，要诚实看待 |
| 加 Page 13 后数词还是 0（dog vs dogs） | results.json `word_match.experiment_add_page13.result`（全 0.0） |
| 旧 Page 4：70 分、答 7:00–10:00；新 Page 4：72 分 | results.json `meaning.experiment_old_page4.result`（0.7042）；`meaning.questions[q1_breakfast]`（0.7158） |
| 多拿几张更可能包含对的资料 | 论文 §4.4：FEVER 上第 1 名来自正确文章 71%，前 10 名里 90%（画面不写数字） |
| 按意思找 vs 数词 | 论文 §4.5 Retrieval Ablations / Table 6（多数任务 dense 更好，FEVER 上 BM25 更好）。我们的两题只是例子 |
| 换卡片盒（论文里是换索引）→ 答案跟着变，不用重新训练 | 论文 §4.5 Index hot-swapping：2016 与 2018 维基百科索引，82 位变动过的世界领导人；对应索引答对 70% / 68%，错配 12% / 4%；§6 "without requiring any retraining"。「两年前」＝2016 对 2018 |
| 外部资料不会完全正确 | 论文 Broader Impact（"Wikipedia, or any potential external knowledge source, will probably never be entirely factual and completely devoid of bias"） |
| 9:45 到餐厅、客人失望 | 故事画面 |
| ○× 篮子 | 本地化游戏，不算分 |
