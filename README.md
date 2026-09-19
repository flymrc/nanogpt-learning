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
| 2 | 开训前精读：`config/train_shakespeare_char.py` + `train.py` 数据窗口 / loss | 未开始 | 待写 |
| 3 | 开训：`python train.py config/train_shakespeare_char.py` | 未开始 | — |
| 4 | 采样：`python sample.py --out_dir=out-shakespeare-char` | 未开始 | — |
| 5 | 精读 `model.py`（Attention / QKV / Multi-Head / FFN / LayerNorm / 残差） | 未开始 | 待写 |

### 第 1 步实跑记录（本机）

- 路径：`/workspace/nanoGPT`（commit `3adf61e154c3fe3fca428ad6bc3818b27a3b8291`）
- 命令：`.venv/bin/python data/shakespeare_char/prepare.py`
- stdout：
  - `length of dataset in characters: 1,115,394`
  - `vocab size: 65`
  - `train has 1,003,854 tokens`
  - `val has 111,540 tokens`
- 产物（`data/shakespeare_char/`）：
  - `train.bin` — 2,007,708 bytes
  - `val.bin` — 223,080 bytes
  - `meta.pkl` — 703 bytes；`vocab_size == 65`

与 `prepare.py` 文末注释中的数字一致。展开说明见 [notes/01-prepare-data.md](notes/01-prepare-data.md)。

### 第 2 步配置要点（来自 `config/train_shakespeare_char.py`，开训前会展开）

- `block_size=256`, `n_layer=6`, `n_head=6`, `n_embd=384`
- `batch_size=64`, `max_iters=5000`, `warmup_iters=100`
- `out_dir=out-shakespeare-char`
- 官方 README：单卡 A100 约 3 分钟，最佳 val loss 约 `1.4697`

---

## 仓库结构

```
notes/          # 按步骤展开的学习笔记
experiments/    # 训练日志、loss、采样样例（待用）
code/           # 自己的改动 / 对照实现（待用）
```

## 参考

- [karpathy/nanoGPT](https://github.com/karpathy/nanoGPT)
- Karpathy [Zero To Hero](https://karpathy.ai/zero-to-hero.html) / [GPT video](https://www.youtube.com/watch?v=kCc8FmEb1nY)（官方 README troubleshooting 推荐）
