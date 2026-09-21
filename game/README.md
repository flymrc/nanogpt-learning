# nanoGPT 闯关

用 [Phaser 3](https://phaser.io/) 做的点击推进小游戏，把语言模型讲成非程序员也能跟上的微步骤。

依据 [karpathy/nanoGPT](https://github.com/karpathy/nanoGPT) 的 `shakespeare_char` 事实，按 13 拍讲完第 1–2 步。每一拍是一页课本，不是一句口号，固定五块：

1. **这一步要干什么**
2. **为什么需要这一步**
3. **具体例子走一遍**（真字符→号码、x/y 对齐、65 格只点亮真答案）
4. **常见误会**
5. **一句话记住**

关内用「下一步细节」翻这五块；翻完才到下一拍。宽屏右侧「详细笔记」一次列出五块，并跟着 Live2D 讲话。

顺序仍是：纸带 → 号码牌 → 座位号 → 65 → 练习/验收 → 随机剪段 → x → y 右移 → 填空 → 65 候选 → 评分桌 → 猜错罚分 → 平均分。

**本游戏不训练模型，也不编造 loss 或架构细节。** 源码名只作为可选脚注。演示短句仍是 `Second Citizen:\n`。第 1 关 5 拍、第 2 关 8 拍，顶栏步数连成 1/13，细节是 1/5。

## 本地运行

需要 Node.js 18+。

```bash
cd game
npm install
npm run dev
```

浏览器打开终端里的本地地址（默认 `http://localhost:5173`）。

点击「开始」，再按「下一步细节」翻完五块，或点空白处 / 按空格推进。五块标签也可直接点。

右上角喇叭是 **DOM 按钮**：先立刻翻转图标并写入 `localStorage` 键 `nanogpt-game-muted`，再在下一拍才碰 BGM / 配音。不会在点击当帧重启整套音频。浏览器会拦截自动播放：第一次点「开始」或喇叭后才会解锁 Web Audio。

旁边「看不懂？」打开词语小抄：BPE、号码牌、练习卷/验收卷、往右挪一格、罚分。**GPT-2 会用 BPE**；这一课不用 BPE，而是一个字符一个号码。电脑端还有游戏指针，会跟着悬停和点击变样子。

## 构建

```bash
cd game
npm install
npm run build
```

静态文件在 `dist/`。可用 `npm run preview` 预览生产构建。

## 宽屏 Live2D 助教

CSS 宽度 ≥ 1024 且横屏、并且不是手机 UA 时，游戏左侧，右侧出现 Live2D 助教（桃瀬ひより）。她跟当前微步骤同步：气泡写「这一步在干什么」，口型跟着配音，眼睛和头跟着整页鼠标，点按助教区域会做反应动作。启动时只创建一个 Pixi / Live2D 实例，避免叠两个助教。

手机 / 竖屏 **完全不加载** Pixi、Cubism Core 和模型，避免拖慢。

模型与授权见 [`public/assets/live2d/LICENSE.md`](public/assets/live2d/LICENSE.md)。Cubism Core 从 Live2D 官方 CDN 加载，不进仓库。

## 音频

| 资源 | 内容 | 何时播放 |
|------|------|----------|
| `public/audio/bgm.{ogg,mp3}` | 循环轻音乐（C 大调 4 小节） | 解锁后循环，音量低于配音 |
| `vo-title` | 「从一条长纸带讲起。」 | 标题页 |
| `vo-level1` | 「每个字符领一张号码牌。」 | 领号码牌 |
| `vo-map` | 「号码只是座位号。」 | 不是性格 |
| `vo-reuse` | 「本局只有六十五张字符牌。」 | 65 张牌 |
| `vo-level2` | 「每次随手剪一段来看。」 | 随机剪段 |
| `vo-shift` | 「答案往右挪一格。」 | y 右移 |
| `vo-next` | 「每个位置都在问下一字。」 | 一串填空 |
| `vo-loss` | 「押得越少，错题分越大。」 | 真答案的概率 |
| `vo-clear` | 「通关啦！」 | 结算页 |
| `sfx-tap` / `sfx-pop` | 轻点按、揭示音 | 按钮 / 空白点击、id 徽章落下 |

音乐和音效是仓库内用 NumPy 合成的**原创**素材（按 CC0 使用即可），不是商业曲或游戏 OST。配音用 Microsoft Edge 在线 TTS（`zh-CN-XiaoxiaoNeural`）；若环境没有 `edge-tts`，脚本会退回 `espeak-ng` / `espeak` 的中文朗读。

重新生成（需要 `python3`、`numpy`、`ffmpeg`，以及 `edge-tts` 或 `espeak-ng`）：

```bash
pip install edge-tts
python3 game/scripts/generate-audio.py
```

脚本把 44.1 kHz 单声道写成 80 kbps MP3 + Vorbis q3 OGG，方便 GitHub Pages 手机端。

## 技术

- Phaser 3（npm）：关卡画布，Retina DPR，header / content / footer 不重叠
- 右上角静音：HTML 按钮，不走 Phaser 点击栈
- 宽屏助教：PixiJS + `pixi-live2d-display`（仅电脑宽屏按需加载）
- Vite + 原生 JavaScript
- 无后端，纯前端
