# 可选文字阅读（`?reader=1`）与原教材映射

网站根目录（`/`）是给孩子的 Phaser 动画首页：三门课的卡片、Live2D 助教（宽屏电脑）、`#Level2/1/2`、`#Rag5/4/2`、`#Embed2/1/2` 和 `?scene=` 深链接都不需要任何查询参数。孩子首页不链接到文字阅读。

文字阅读是给大人的可选入口，只在网址带 `?reader=1` 时打开（`src/learning/reader.js`，由 `src/main.js` 按需加载，不启动 Phaser，不请求音频）。每章按问题、输入输出、动手例子、结果、原理展开，并提供一道需要提交的迁移题。浏览不计检查通过；一次答对也不表示已经掌握整个主题。中日两种语言共用章节结构、实验逻辑和来源，文案在 `curriculum.js` 中成对维护。文字阅读的措辞不是孩子课文；孩子课文只在 `src/i18n/` 与 `embed/script/`、`rag/` 的源稿里。

每章“技术进阶与证据”提供原始资料、保存实验数据，以及本章全部原页面文字。“打开本章图画动画”离开文字阅读，打开孩子动画的深链接（例如 `/#Rag1/0/0`）。

| 新章节 | 保留的原页面 | 关键概念与依据 |
|---|---|---|
| nanoGPT 1 文本到训练题 | Level1 / c1，11页 | 字符词表、编码/解码、65类、训练/验证切分；新例子的x/y切片另对应 `notes/02-batch-and-loss.md` |
| nanoGPT 2 损失 | Level2 / c2，11页 | batch/window、右移目标、logits、交叉熵、多个位置平均；`notes/02-batch-and-loss.md` |
| nanoGPT 3 注意力 | Level3 / c3，9页 | Q/K/V、缩放、因果遮罩、softmax、加权、多头、残差、MLP；`notes/03-causal-self-attention.md` |
| nanoGPT 4 训练 | Level4 / c4，9页 | 参数、反向传播、AdamW、学习率、累积、验证、checkpoint；`notes/04-train.md` |
| nanoGPT 5 采样 | Level5 / c5，9页 | 提示编码、最后位置、temperature、top_k、multinomial、窗口截断、解码；`notes/05-sample.md` |
| RAG 1 依据 | Rag1 / r1，12页 | 参数知识与外部资料、过时/幻觉、可核查引用；`rag/01-chapter1.md`及对应日文版 |
| RAG 2 分段 | Rag2 / r2，12页 | 按页切分、标题/页码、片段大小与上下文；`rag/02-chapter2.md` |
| RAG 3 检索 | Rag3 / r3，12页 | TF-IDF/停用词、向量检索、语言独立分数、top-3；`rag/03-chapter3.md`、`rag/demo/results*.json` |
| RAG 4 回答 | Rag4 / r4，12页 | 上下文拼接、模板只取第一张、多页问题、生成器区别；`rag/04-chapter4.md` |
| RAG 5 失败与更新 | Rag5 / r5，12页 | 阈值、拒答、错检/漏检、旧新第4页与新增第13页；`rag/05-chapter5.md` |
| Embedding 1 文本到向量 | Embed1 / e1，8页 | 编码器、384维、保存实验、教师/学生模型；`embed/script/{zh,ja}.md`第1章 |
| Embedding 2 维度与长度 | Embed2 / e2，8页 | 分布式表示、范数、归一化、词对比较；同上第2章 |
| Embedding 3 余弦 | Embed3 / e3，8页 | 点积、余弦、方向、负数可能性、取整、RAG链接；同上第3章 |
| Embedding 4 地图 | Embed4 / e4，8页 | PCA、保留方差不足一半、投影失真、错误近邻；同上第4章 |
| Embedding 5 评估 | Embed5 / e5，8页 | 完整问题与单词检索差异、多语言局限、teacher_check、错邻居；同上第5章 |

合计149页：nanoGPT49、RAG60、Embedding40。`npm test` 检查每页归属、双语字段、原资料路径、检查题及保存数据的关键事实。未将原绘图脚本整套复制成第二套教材。

## 例子的执行性质

- **手动操作**：RAG 选页/时刻、上下文选择、片段比较。回答是固定模板，不调用生成模型。
- **浏览器计算**：字符切片、`−ln(p)`、因果可见范围、单参数 SGD 示例、三项 softmax、范数、取整、丢弃一维的投影示例。明确区分教学计算和真实模型。
- **保存实验**：Embedding词对、RAG中英文检索结果、相近但不同义的词对。直接导入仓库JSON，不下载或运行编码器；中日例子分别核对。

原始数据、PCA图、错误案例和实验记录没有重算或改写。nanoGPT 本仓库仍没有新的真实训练loss或采样输出。

## 语音与资源

孩子动画启动时只预载 BGM 和两个音效；每页旁白在需要时读取预先生成的 mp3（edge-tts zh-CN-XiaoxiaoNeural / ja-JP-NanamiNeural），最多保留 6 段解码缓存。每条孩子旁白都必须有对应 mp3：`npm run vo:check`（`npm run i18n` 也会跑）在任何一条缺少录音或文字与录音不一致时失败。没有 Web Speech 替代清单。某段录音读取失败（网络中断、被拦截）时，和 5cf647a 上没有预载到录音一样，本次会话改用 Web Speech 读这一句；日文没有声音时显示原来的缺少声音提示。

## 本地验收

```sh
cd game
npm ci
npm run check
npm run preview -- --host 127.0.0.1 --port 4182
```

另开终端，在 `game/`：

```sh
npm run e2e:reader
npm run e2e:regressions
npm run e2e
```

浏览器：设置了 `CHROME` 就用它；否则用系统的 Google Chrome（`/usr/bin/google-chrome-stable`，能播放 mp3 旁白）；都没有时用 Playwright 自带的 Chromium（`npx playwright install chromium`）。`PYTHON` 可指定 Python 解释器。`E2E_URL` 覆盖预览地址（默认 `http://127.0.0.1:4182/`），文字阅读测试自动加上 `?reader=1`。截图与报告默认输出到被 git 忽略的 `game/output/`，`npm run e2e` 可用 `E2E_OUT` 改目录。

`e2e:reader` 在 `?reader=1` 对15章×2语言×3视口逐章执行例子、错答、反馈与正确重试，并检查正文最低16px、无横向溢出、键盘课程入口和原文展开。`e2e:regressions` 在网站根目录检查孩子首页（字体、PC 上的 Live2D、没有文字阅读链接）、无查询参数的深链接、按需旁白，并在 1440×900（鼠标）和 390×844（触摸）用真实点击检查 RAG 图卡、Embedding 图卡、阶段标签、RAG 卡片格和放大的卡片；还检查异常 URL 和 `?reader=1` 不启动 Phaser。`e2e` 保留完整动画逐页和阶段中间帧检查。
