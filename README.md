# nanogpt-learning

个人 **nanoGPT / 深度学习** 学习进度仓库。

对照路线来自：
- 原帖学习路径：Transformer + 字符级语言模型 + nanoGPT 验收标准
- 官方实现：[karpathy/nanoGPT](https://github.com/karpathy/nanoGPT)（核对过的 commit：`3adf61e154c3fe3fca428ad6bc3818b27a3b8291`）

> 原则：进度与笔记只记录可核对事实（官方 README / 源码 / 本机实际运行输出），不写臆测。  
> 学习方式：每一步先对着源码展开（在做什么 / 对应概念 / 如何验收），再动手跑。

---

## 当前进度

| 步骤 | 内容 | 状态 | 笔记 |
|------|------|------|------|
| 1 | 数据管道：`data/shakespeare_char/prepare.py` | **已完成**（2026-09-20） | [notes/01-prepare-data.md](notes/01-prepare-data.md) |
| 2 | 开训前：`get_batch` → `(x,y)` → `cross_entropy` 契约 | **笔记已完成**（2026-09-20） | [notes/02-batch-and-loss.md](notes/02-batch-and-loss.md) |
| 3 | 精读 `model.py`（Embedding / Causal Attention QKV / MLP / 残差 / LayerNorm） | 未开始 | 待写 |
| 4 | 开训：`python train.py config/train_shakespeare_char.py` | 未开始 | — |
| 5 | 采样：`python sample.py --out_dir=out-shakespeare-char` | 未开始 | — |

### 第 1 步实跑记录（本机）

- 路径：`/workspace/nanoGPT`（commit `3adf61e154c3fe3fca428ad6bc3818b27a3b8291`）
- 命令：`.venv/bin/python data/shakespeare_char/prepare.py`
- stdout：`length of dataset in characters: 1,115,394`；`vocab size: 65`；`train has 1,003,854 tokens`；`val has 111,540 tokens`
- 产物：`train.bin` 2,007,708 / `val.bin` 223,080 / `meta.pkl` 703（`vocab_size == 65`）

### 第 2 步要点（来自源码，详见笔记）

- `block_size=256`, `batch_size=64` → 单卡默认每 iter `16384` tokens
- `y` 是 `x` 右移 1 位的 next-token 目标
- `meta.pkl` 提供 `vocab_size=65`；loss 为 `F.cross_entropy`
- **尚未开训**（按学习顺序，下一步先读 `model.py`）

---

## 仓库结构

```
notes/          # 按步骤展开的学习笔记
game/           # Phaser 3 闯关：第 1–2 步点击动画（见 game/README.md）
experiments/    # 训练日志、loss、采样样例（待用）
code/           # 自己的改动 / 对照实现（待用）
```

想把笔记变成可点的动画，进入 [`game/`](game/)：`cd game && npm install && npm run dev`。

游戏第 1–2 关用「手机输入法 / 猜下一个字」把笔记讲成生活类比；宽屏电脑右侧会出 Live2D 助教，手机不加载。详情见 [`game/README.md`](game/README.md)。

## 参考

- [karpathy/nanoGPT](https://github.com/karpathy/nanoGPT)
- Karpathy [Zero To Hero](https://karpathy.ai/zero-to-hero.html) / [GPT video](https://www.youtube.com/watch?v=kCc8FmEb1nY)（官方 README troubleshooting 推荐）
