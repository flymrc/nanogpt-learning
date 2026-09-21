# nanoGPT 闯关

用 [Phaser 3](https://phaser.io/) 做的点击推进小游戏，把语言模型讲成非程序员也能跟上的微步骤。

依据 [karpathy/nanoGPT](https://github.com/karpathy/nanoGPT) 的 `shakespeare_char` 事实，但**先讲生活类比，不先甩文件名**：

- 第 1 关：手机输入法也会「看到前面、猜下一个」→ 语言模型就是下一字的概率排行榜 → 电脑更认号码，莎士比亚剧本变成 65 种字的两串号码（练习卷 / 检查卷）
- 第 2 关：一次只看一小段；左边是已经看到的，右边正确答案往后挪一格；猜错要罚分，目标是把罚分压小

**本游戏不训练模型，也不编造 loss 或架构细节。**

演示短句仍是 `Second Citizen:\n`（与笔记切片一致）。源码名如 train.bin、交叉熵只作为可选脚注出现。

每一拍只讲一个想法：顶栏固定写「这一步在干什么」，旁边一句短说明。第 1 关 13 拍、第 2 关 13 拍。

## 本地运行

需要 Node.js 18+。

```bash
cd game
npm install
npm run dev
```

浏览器打开终端里的本地地址（默认 `http://localhost:5173`）。

点击「开始」，再按「下一步」或点空白处 / 按空格推进。

右上角喇叭是 **DOM 按钮**：先立刻翻转图标并写入 `localStorage` 键 `nanogpt-game-muted`，再在下一拍才碰 BGM / 配音。不会在点击当帧重启整套音频。浏览器会拦截自动播放：第一次点「开始」或喇叭后才会解锁 Web Audio。

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
| `vo-title` | 「一起猜下一个字吧！」 | 标题页 |
| `vo-level1` | 「先想想手机输入法。」 | 第 1 关开场 |
| `vo-map` | 「每个字都排进榜。」 | 概率排行 |
| `vo-reuse` | 「同样的字，同一个号。」 | 重复字符复用号码 |
| `vo-level2` | 「看见这个，猜下一个。」 | 第 2 关开场 |
| `vo-shift` | 「正确答案往后挪一格。」 | 答案右移 |
| `vo-next` | 「看见 S，下一字是 e。」 | 一对一对看 |
| `vo-loss` | 「猜得越离谱，罚分越大。」 | 猜错罚分 |
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
