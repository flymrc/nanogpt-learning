# 工程审计与本地重构记录

基线：`main` / `5cf647ad616bf0de551ed0e01d20089c26c05716`。在独立克隆及 `refactor/clear-learning-path` 分支完成审计和重构。审计时 Pages 的 `gh-pages` 为 `a54dad483313ae3f13bbc8aaac101a4db57f974d`，部署 action run `36657157141`；线上 index、JS、CSS 的 SHA256 与该 main 基线本地构建匹配。此对应关系只代表审计时点，不代表之后远端不变。用户随后授权验证通过后提交并发布；新版部署对应关系以发布提交和 Pages 运行记录为准。

## 基线评分（教育项目，不按企业应用标准）

| 维度 | 分数 / 10 | 依据 |
|---|---:|---|
| 架构与维护 | 7.5 | 场景、文案、来源分离，生成器可追溯；大体量画布与布局逻辑维护较难。 |
| 正确性 | 7 | 内容/实验数据有校验；异常路由崩溃、真实点击热区和日文生成文本存在确定缺陷。 |
| 测试与 CI | 6 | 原动画检查广，但干净安装缺 Playwright，模拟 emit 漏掉热区缺陷；没有仓库 CI。 |
| 安全/隐私/依赖 | 8 | 静态站无账户、后端或密钥需求，npm 审计未发现已知漏洞；动画依赖外部字体，浏览器语音依设备实现。未做渗透测试。 |
| 性能与资源 | 5 | 首页预载全部课程两种语言旁白，测得 313 段、369,625,380 字节解码音频，移动设备代价明显。 |
| 部署可复现性 | 7 | 锁文件和 Vite 构建可重现线上资源；测试依赖/硬编码环境路径和实验路径妨碍新环境验收。 |

## 主要确定问题及处置

严重性按本项目影响定义：P1 影响普遍访问，P2 明显功能/教学错误，P3 维护缺口。异常 URL 崩溃只影响特定输入，严重性按 P2 理解。以下链接固定基线，不会随重构漂移。

| 级别 | 复现、影响及基线依据 | 本地处理 |
|---|---|---|
| P2 | `#%E0%A4%A` 触发 URIError；`#Level1/0.5/2` 取到不存在的页。见 [route.js:55](https://github.com/flymrc/nanogpt-learning/blob/5cf647ad616bf0de551ed0e01d20089c26c05716/game/src/ui/route.js#L55)。 | 安全解码、整数化、最终边界限制，真实浏览器验证三个异常路由。 |
| P1 | 首屏全部解码旁白，约 352.5 MiB；见 [sound.js:36](https://github.com/flymrc/nanogpt-learning/blob/5cf647ad616bf0de551ed0e01d20089c26c05716/game/src/audio/sound.js#L36)。 | 阅读入口零音频、零 Phaser；动画只预载 BGM/两个音效，旁白按需读取，缓存至多六段。 |
| P2 | RAG 首课纸片右上/左下/右下点击推进下一阶段，未揭示。双语均复现，并非只日文。见 [rag-art.js:718](https://github.com/flymrc/nanogpt-learning/blob/5cf647ad616bf0de551ed0e01d20089c26c05716/game/src/ui/rag-art.js#L718)。 | 修复容器局部命中坐标；真实鼠标五区域 × 双语通过，不用 emit 代替。 |
| P2 | 长正文被整体缩放成小字；见 [textbook.js:485](https://github.com/flymrc/nanogpt-learning/blob/5cf647ad616bf0de551ed0e01d20089c26c05716/game/src/ui/textbook.js#L485)。原卡片还缺键盘语义入口。 | 默认原生 HTML，正文至少 16px；三课程链接、表单、反馈均有语义。旧动画改用可打开全文的预览，仍保留画布交互。 |
| P2 | 日文 `pseudo.r4-p5` 三字段仅剩「，由句子切分误把引号内问号当句尾造成。见 [生成器:94](https://github.com/flymrc/nanogpt-learning/blob/5cf647ad616bf0de551ed0e01d20089c26c05716/game/scripts/build-rag-lesson.mjs#L94)。 | 改生成器并从源文重新生成；日文菜单完整展示原文承诺的餐食。 |
| P2 | `embed_demo.py` 引用不存在的 `rag-script/demo`；见 [embed_demo.py:120](https://github.com/flymrc/nanogpt-learning/blob/5cf647ad616bf0de551ed0e01d20089c26c05716/embed/demo/embed_demo.py#L120)。 | 使用基于脚本路径的真实 `rag/demo`，修正说明/检查脚本。不重新跑编码器。 |
| P2 | SPA 切课程标题不更新；见 [locale.js:21](https://github.com/flymrc/nanogpt-learning/blob/5cf647ad616bf0de551ed0e01d20089c26c05716/game/src/i18n/locale.js#L21)。 | 旧壳课程切换更新标题，新阅读页每章/语言更新标题。 |
| P3 | `npm ci` 后 E2E 缺 Playwright，fallback 指向机器特定 `/tmp`；见 [e2e-layout.mjs:78](https://github.com/flymrc/nanogpt-learning/blob/5cf647ad616bf0de551ed0e01d20089c26c05716/game/scripts/e2e-layout.mjs#L78)。 | 声明固定版本开发依赖，浏览器路径可配置、输出目录本地化。 |

科学措辞同步修正：模型不是原文句库；Q/K 匹配不是字符相似；100 是取整分数不能反推严格同方向；训练约 5000 次；保持模板披露、检索失败、PCA 失真和阈值局限。具体覆盖见 [新旧内容映射](LEARNING_MAP.md)。

## 已执行验证与证据

- 基线 `npm ci`、`npm run build`、`npm run i18n` 通过，`npm audit` 为 0。基线原 E2E 首次缺依赖失败；补临时测试环境后移动 245 步和桌面前 35 步通过即停止，**不是基线全套通过**。
- 修改后 `npm run check`：4 个 Node 测试通过；i18n 验证 nanoGPT 992 键/49 页、RAG 1074 键/60 页、Embedding 798 键/40 页；Vite 构建通过。
- `npm run e2e:reader`：双语 × 15 章 × 3 视口 = 90 次，实际执行例子、错答和正确重试，键盘入口、标题、最小字号及横向溢出检查通过；展开原文验证 RAG 第一章全部 12 页。截图与 JSON 在 `output/reader/`。
- `npm run e2e:regressions`：双语各五个实际纸片点击通过；三种异常 URL 不崩溃；默认阅读零音频，动画启动 3 段 / 1,976,256 字节解码数据（约 1.9 MiB）。
- 新增导航回归先在旧产物失败：无查询参数的动画深链接返回阅读时，旧场景的下一帧可能覆写 URL；浏览器后退还会留下睡眠中的动画。修复后在真实浏览器通过返回与后退操作。
- `python ../embed/script/verify.py` 为 OK；`verify_pairs.py` 为 `bad 0`。`npm audit --omit=dev --audit-level=high` 为 0；`git diff --check` 通过。
- 完整旧动画回归发现 1024×522 下编号卡片字行和色条冲突；修复为矮卡片横向排字/编号，保留 12px 字号下限和原断言。相同视口实际复测 `textOk=false → true`。另修复日文 RAG 伪代码分享表格行距不足，以及 1024×640 日文 Embedding 图卡阴影与说明间距不足；保留原重叠断言，通过实际布局坐标定位后修复。最后一轮还发现日文 Embedding 矮卡片双行标签越界、中文 RAG 带时间单位的旁白不换行；分别改为横排和中文自然换行，保留时间单位不拆分。上述场景均经真实浏览器先失败再通过。最终 `npm run e2e` 退出码 0：nanoGPT 245/49/49、RAG 600/120/120、Embedding 400/80/80（手机/1440/1024）；Live2D 8 尺寸 × 双语 × 49 页 = 784 页及首页 5 尺寸 × 双语通过。RAG_STAGE_OK checks=1749 mid=429，EMBED_STAGE_OK checks=1219 mid=339，重叠、裁切相关错误计数均为 0。最终构建上的 90 次新教程检查与专项回归亦再次全部通过。

## 限制

没有跑昂贵训练、重新下载模型、调用付费 API 或生成新旁白。13 条已修改文字的历史录音保留文件但停用，改用当前文本的 Web Speech；播放效果依赖设备语言声音。未人工逐条听音，也没有用真实屏幕阅读器通读。本次浏览器验证使用 Windows 上实际安装的 Chrome，未实测 Safari、Firefox 或真机。

默认阅读路径已可键盘操作；可选旧动画仍有画布交互，不能声称所有旧动画达到完整键盘/屏幕阅读器等价。保留全文和主线练习作为语义入口。没有新增自定义 CI；发布沿用 `gh-pages` 分支根目录及 GitHub Pages 工作流，不强推或重写分支历史。学习检查只表示本次题目答对，不代表已经掌握课程。
