# nanoGPT 闯关

用 [Phaser 3](https://phaser.io/) 做的点击推进小游戏，把 `notes/` 里第 1–2 步变成可看的动画。

依据 [karpathy/nanoGPT](https://github.com/karpathy/nanoGPT) 的 `shakespeare_char` 路径：

- 第 1 关：`data/shakespeare_char/prepare.py`（字符 → id，词表 = 唯一字符数 = 65）
- 第 2 关：`train.py` 的 `get_batch`（`x` / `y` 右移 1）与 `model.py` 里的 `F.cross_entropy`（65 类）

**本游戏不训练模型，也不编造 loss 或架构细节。**

演示短句 `Second Citizen:\n` 与笔记中 `train.bin`、`i=1000`、`block=16` 的切片一致；正式训练配置仍是 `block_size=256`、`batch_size=64`。

## 本地运行

需要 Node.js 18+。

```bash
cd game
npm install
npm run dev
```

浏览器打开终端里的本地地址（默认 `http://localhost:5173`）。

点击「开始」，再按「下一步」或点空白处 / 按空格推进。

右上角喇叭可静音 / 取消静音（写入 `localStorage` 键 `nanogpt-game-muted`）。浏览器会拦截自动播放：第一次点「开始」或喇叭后才会解锁 BGM 和配音。

## 构建

```bash
cd game
npm install
npm run build
```

静态文件在 `dist/`。可用 `npm run preview` 预览生产构建。

## 音频

| 资源 | 内容 | 何时播放 |
|------|------|----------|
| `public/audio/bgm.{ogg,mp3}` | 循环轻音乐（C 大调 4 小节） | 解锁后循环，音量低于配音 |
| `vo-title` | 「一起闯关吧！」 | 标题页 |
| `vo-level1` | 「第一关，把字符变成数字。」 | 第 1 关开场 |
| `vo-map` | 「字符变成数字了。」 | 第一次字符 → id |
| `vo-level2` | 「第二关，先框住窗口。」 | 第 2 关开场 |
| `vo-shift` | 「Y 往右挪一位。」 | 窗口右移 / y 行出现 |
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

- Phaser 3（npm）
- Vite + 原生 JavaScript
- 无后端，纯前端
