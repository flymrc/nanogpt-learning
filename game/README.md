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

## 构建

```bash
cd game
npm install
npm run build
```

静态文件在 `dist/`。可用 `npm run preview` 预览生产构建。

## 技术

- Phaser 3（npm）
- Vite + 原生 JavaScript
- 无后端，纯前端
