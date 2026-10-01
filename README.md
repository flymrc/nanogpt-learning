# nanogpt-learning

个人 **nanoGPT / 深度学习** 学习进度仓库。

网页默认是卡通游戏首页：nanoGPT、RAG、Embedding 各五关，中日双语。每关先猜、点一下看变化，再答一题拿星星。美女助教Hiyori保留在宽屏电脑，手机优先保证游戏与文字清楚。全部149页原图画动画、原配音与进阶阅读保留为可选入口。浏览不计过关。

本地运行、验证命令、新旧章节映射及实验来源见 [学习路径与验证说明](game/LEARNING_MAP.md)。此界面不运行模型训练或付费 API；小计算与保存实验分别标明。

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
| 3 | Causal Self-Attention（`model.py` 的 QKV / 遮罩 / softmax / 加权汇总） | **笔记已完成**（2026-09-22） | [notes/03-causal-self-attention.md](notes/03-causal-self-attention.md) |
| 4 | 开训：`python train.py config/train_shakespeare_char.py` | **笔记已完成**（2026-09-22），本机未跑 loss | [notes/04-train.md](notes/04-train.md) |
| 5 | 采样：`python sample.py --out_dir=out-shakespeare-char` | **笔记已完成**（2026-09-22），本机未跑采样 | [notes/05-sample.md](notes/05-sample.md) |

### 第 1 步实跑记录（本机）

- 路径：`/workspace/nanoGPT`（commit `3adf61e154c3fe3fca428ad6bc3818b27a3b8291`）
- 命令：`.venv/bin/python data/shakespeare_char/prepare.py`
- stdout：`length of dataset in characters: 1,115,394`；`vocab size: 65`；`train has 1,003,854 tokens`；`val has 111,540 tokens`
- 产物：`train.bin` 2,007,708 / `val.bin` 223,080 / `meta.pkl` 703（`vocab_size == 65`）

### 第 2 步要点（来自源码，详见笔记）

- `block_size=256`, `batch_size=64` → 单卡默认每 iter `16384` tokens
- `y` 是 `x` 右移 1 位的 next-token 目标
- `meta.pkl` 提供 `vocab_size=65`；loss 为 `F.cross_entropy`
- **本机仍未开训，也没有采样输出。** 第 4 步只核对循环和配置。第 5 步只核对 `sample.py` / `model.generate`。上游 README 里的台词示例不是本仓库的结果。

---

## 仓库结构

```
notes/          # 按步骤展开的学习笔记
game/           # 15章双语学习主线及原149页图画动画（见 game/LEARNING_MAP.md）
experiments/    # 训练日志、loss、采样样例（待用）
code/           # 自己的改动 / 对照实现（待用）
```

进入 [`game/`](game/)：`cd game && npm ci && npm run dev`，默认打开卡通游戏，新关卡可切换到原图画动画或进阶阅读。

原动画保留 nanoGPT 49页、RAG 60页、Embedding 40页；每页可查看文字和伪代码。只有打开动画后才按需加载 Phaser 和旁白，宽屏动画可显示 Live2D 助教，手机不加载。课程映射和验收方式见 [`game/LEARNING_MAP.md`](game/LEARNING_MAP.md)。

## 参考

- [karpathy/nanoGPT](https://github.com/karpathy/nanoGPT)
- Karpathy [Zero To Hero](https://karpathy.ai/zero-to-hero.html) / [GPT video](https://www.youtube.com/watch?v=kCc8FmEb1nY)（官方 README troubleshooting 推荐）
