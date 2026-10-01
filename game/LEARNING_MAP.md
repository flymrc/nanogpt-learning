# 儿童闯关、进阶阅读与原教材映射

默认入口为卡通课程首页，进入 `src/quest/` 的15关儿童小游戏。每关采用短句任务、动手玩具和可重试的小检查。此文以下记录保留的可选进阶阅读（`?reader=1` 或 `#learn`），其入口为 `src/learning/reader.js`。每章按问题、输入输出、动手例子、结果、原理展开，并提供一道需要提交的迁移题。浏览不计检查通过；一次答对也不表示已经掌握整个主题。中日两种语言共用章节结构、实验逻辑和来源，文案在 `curriculum.js` 中成对维护。

原教材没有删除。每章“技术进阶与证据”提供原始资料、保存实验数据，以及本章全部原页面文字；“打开本章图画动画”加载原 Phaser 课程。动画的“目录”提供“进阶阅读”链接。直接 `#Level…`、`#Rag…`、`#Embed…` 和 `?scene=` 链接仍可用。`?animation=1` 打开原动画首页。

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

可选阅读首页不加载 Phaser、Google Fonts、Live2D或音频。动画按需启动；其启动只预载BGM和两个音效，课程旁白按需取用并最多保留6段解码缓存。修改科学表述的13条旧录音保留作为历史资源，但通过 `speech-fallbacks.json` 明确停用，改读当前Web Speech文字。没有设备对应语言声音时仍显示完整文本与原缺失声音提示。

语音校验继续检查原录音存在、大小与manifest；新增校验要求替代文本hash、历史录音hash和编辑原因均匹配，禁止不带审阅记录地忽略陈旧录音。需要重新录音时使用原生成器并更新此清单。显式审阅后的语音替代可运行 `node scripts/record-speech-fallbacks.mjs "编辑原因"`，该命令不调用外部服务。

## 本地验收

```sh
cd game
npm ci
npx playwright install chromium
npm run check
npm run preview -- --host 127.0.0.1 --port 4182
```

另开终端，在 `game/`：

```sh
npm run e2e:reader
npm run e2e:regressions
npm run e2e
```

如使用已安装Chrome，设置 `CHROME` 为其绝对路径；Windows PowerShell 示例：`$env:CHROME='C:\Program Files\Google\Chrome\Application\chrome.exe'`。`PYTHON` 可指定Python解释器，默认Windows为python、其他系统为python3。`E2E_URL` 覆盖预览地址。截图与报告输出至被git忽略的 `game/output/`。

`e2e:reader` 对15章×2语言×3视口逐章执行例子、错答、反馈与正确重试，并检查正文最低16px、无横向溢出、键盘课程入口和原文展开。`e2e:regressions` 使用真实鼠标点击图卡五个区域、验证异常URL、标题和音频预算。原 `e2e` 保留完整动画逐页和阶段中间帧检查；其程序化动画步进不代替新增真实命中测试。
