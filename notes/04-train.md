# 第 4 步：开训（先把循环讲清，本机不记 loss）

> 依据：本机笔记核对过的 [karpathy/nanoGPT](https://github.com/karpathy/nanoGPT) @ `3adf61e154c3fe3fca428ad6bc3818b27a3b8291`  
> `config/train_shakespeare_char.py`、`train.py`、`model.py` 原文，以及上游 README 的启动命令。  
> **本仓库没有自己的训练日志。** 下面不画 loss 曲线，也不把 README 里的验收分数写成我们跑出来的结果。

前三步已经钉死：纸带是整数流，`y` 是 `x` 右移一格，罚分是 `F.cross_entropy`，每一格只看左边。开训做的事是：用练习卷上的罚分，去改模型里的数。

---

## 1. 为什么要开训

`init_from` 在 `train.py` 里默认是 `'scratch'`。`shakespeare_char` 配置没有改它。

从零建模型时，`GPT._init_weights` 把线性层和 Embedding 收成正态分布，均值 `0`，标准差 `0.02`。这些数不是从莎翁里读出来的。不改它们，模型就一直在乱猜下一个字符。

目标仍然是第 2 步那句：看见前面的字符，猜下一个。练习卷是 `train.bin`，验收卷是 `val.bin`。开训用练习卷改数。验收卷只用来看罚分，不拿来改。

---

## 2. 这一课的配置（盖过 train.py 默认值）

`config/train_shakespeare_char.py` 原文里和开训有关的赋值：

```python
out_dir = 'out-shakespeare-char'
eval_interval = 250 # keep frequent because we'll overfit
eval_iters = 200
log_interval = 10 # don't print too too often

# we expect to overfit on this small dataset, so only save when val improves
always_save_checkpoint = False

dataset = 'shakespeare_char'
gradient_accumulation_steps = 1
batch_size = 64
block_size = 256 # context of up to 256 previous characters

n_layer = 6
n_head = 6
n_embd = 384
dropout = 0.2

learning_rate = 1e-3 # with baby networks can afford to go a bit higher
max_iters = 5000
lr_decay_iters = 5000 # make equal to max_iters usually
min_lr = 1e-4 # learning_rate / 10 usually
beta2 = 0.99 # make a bit bigger because number of tokens per iter is small

warmup_iters = 100 # not super necessary potentially
```

`train.py` 里这些默认值，这份配置**没有**改，所以仍然生效：

| 项 | 值 | 出处 |
|----|----|------|
| `init_from` | `'scratch'` | `train.py` 默认 |
| `weight_decay` | `1e-1` | `train.py` 默认 |
| `beta1` | `0.9` | `train.py` 默认 |
| `beta2` | `0.99` | 配置盖过默认的 `0.95` |
| `grad_clip` | `1.0` | `train.py` 默认 |
| `decay_lr` | `True` | `train.py` 默认 |
| `bias` | `False` | `train.py` 默认，配置未赋值 |
| `compile` | `True` | `train.py` 默认 |

单进程、`gradient_accumulation_steps = 1` 时，`train.py` 印出的每步 token 数仍是 `1 × 1 × 64 × 256 = 16384`。

---

## 3. 一步里面发生什么

循环在 `train.py` 的 `while True`。shakespeare_char 因为累加步数是 1，里面的 micro-step 只走一轮。顺序是源码里的顺序，不是事后重排的口诀：

1. 若 `decay_lr`，用 `get_lr(iter_num)` 设这一步的学习率，写进 `optimizer.param_groups`。
2. `iter_num % eval_interval == 0` 时先做抽查（见下一节），可能存档。
3. `get_batch('train')` 已经准备好的 `(X, Y)` 送进模型：`logits, loss = model(X, Y)`。
4. `loss = loss / gradient_accumulation_steps`（这里除以 1）。
5. 马上再 `get_batch('train')`，预取下一批。
6. `scaler.scale(loss).backward()`。
7. `grad_clip != 0` 时：`scaler.unscale_`，再 `clip_grad_norm_(..., 1.0)`。
8. `scaler.step(optimizer)`、`scaler.update()`、`optimizer.zero_grad(set_to_none=True)`。
9. 每步结束 `iter_num += 1`。`iter_num > max_iters` 时退出，打印出来的最后一档 iter 下标是 5000。

`get_lr` 是带热身的余弦：

- `it < warmup_iters`（100）：学习率从接近 0 线性升到 `1e-3`。
- 之后余弦降到 `min_lr = 1e-4`，降到 `lr_decay_iters = 5000`。
- 超过 `lr_decay_iters` 就停在 `min_lr`。

优化器不是手写的 SGD。`model.configure_optimizers(...)` 建的是 `torch.optim.AdamW`。二维参数（矩阵乘的权重和 Embedding）用 `weight_decay = 0.1`；一维参数（这里主要是 LayerNorm 的 weight；`bias=False` 时线性层没有 bias）的 `weight_decay` 是 0。CUDA 上如果当前 PyTorch 的 AdamW 接受 `fused`，就用 fused AdamW。

精度：`device_type == 'cpu'` 时前向不加 autocast。否则包在 `torch.amp.autocast` 里。`GradScaler` 只在 `dtype == 'float16'` 时 `enabled=True`；默认 dtype 在 CUDA 支持 bf16 时是 `bfloat16`，这时 scaler 是空操作。

---

## 4. 哪些数会被改

高一层看，AdamW 改的是 `requires_grad` 的参数，不是纸带上的字符：

- 号码表 `transformer.wte`。它和 `lm_head.weight` 绑在同一份上（weight tying）。
- 位置表 `transformer.wpe`。
- 每一块里的注意力投影 `attn.c_attn`、`attn.c_proj`，以及 MLP 的 `c_fc`、`c_proj`（先放到 `4 * n_embd`，GELU，再收回来）。
- 每块的 `ln_1`、`ln_2`，以及最后的 `ln_f`。

不改的东西要分开说：

- 因果遮罩 `attn.bias` 是 `register_buffer`，不是参数，优化器碰不到。右边一直盖住。
- Dropout 没有要学的权重。
- `train.bin` / `val.bin` 只被读，不会被写回。

`Block.forward` 仍是第 3 步那两行：注意力加回去，MLP 再加回去。开训不改变这个结构，只改变里面的数。

---

## 5. 验收卷：抽查，不改数

配置注释写了两句作者的预期，不是我们的测量：

- `eval_interval = 250` 旁边：keep frequent because we'll overfit。
- `always_save_checkpoint = False` 上面：we expect to overfit on this small dataset, so only save when val improves。

`estimate_loss` 原文结构：

```python
@torch.no_grad()
def estimate_loss():
    out = {}
    model.eval()
    for split in ['train', 'val']:
        losses = torch.zeros(eval_iters)
        for k in range(eval_iters):
            X, Y = get_batch(split)
            with ctx:
                logits, loss = model(X, Y)
            losses[k] = loss.item()
        out[split] = losses.mean()
    model.train()
    return out
```

所以每 250 步：模型切到 eval，练习卷和验收卷各抽 `eval_iters = 200` 个批，取平均罚分，再切回 train。这段在 `no_grad` 里，**不改数**。

练习卷罚分变小，可能只是把见过的窗口背下来。验收卷没有参加 `backward`。它不跟着变好，就是过拟合的直观说法。这里不填具体分数。

存档条件在同一段循环里：

```python
if losses['val'] < best_val_loss or always_save_checkpoint:
    best_val_loss = losses['val']
    if iter_num > 0:
        checkpoint = {
            'model': raw_model.state_dict(),
            'optimizer': optimizer.state_dict(),
            'model_args': model_args,
            'iter_num': iter_num,
            'best_val_loss': best_val_loss,
            'config': config,
        }
        torch.save(checkpoint, os.path.join(out_dir, 'ckpt.pt'))
```

这份配置 `always_save_checkpoint` 是 `False`，所以只有验收罚分严格变小才进入外层。`iter_num > 0` 才真正写入 `out-shakespeare-char/ckpt.pt`。第 0 步会更新 `best_val_loss`，但不存文件。

---

## 6. 怎么启动（上游命令，本仓库未跑）

官方 README 的字符级快速开始，两行：

```sh
python data/shakespeare_char/prepare.py
python train.py config/train_shakespeare_char.py
```

输出目录是配置里的 `out-shakespeare-char`。

这不是 `torchrun ... config/train_gpt2.py`。那条是另一份 OpenWebText / GPT-2 配置。

README 另外给了只有 CPU 时的一行，本课同样没有复跑：

```sh
python train.py config/train_shakespeare_char.py --device=cpu --compile=False --eval_iters=20 --log_interval=1 --block_size=64 --batch_size=12 --n_layer=4 --n_head=4 --n_embd=128 --max_iters=2000 --lr_decay_iters=2000 --dropout=0.0
```

### 上游 README 里出现过、但不是本仓库日志的数字

README 写：一块 A100 上，上面的 GPU 命令大约 3 分钟，最好的 validation loss 是 **1.4697**。CPU 那一行它写 loss 大约 **1.88**。  
这两句是上游作者的说法。`experiments/` 里没有对应日志。游戏和这篇笔记都不把它们当成我们的测量。

---

## 7. 这一课怎样算讲完

讲完是指能对着源码说出：

- 一步是剪批、前向、罚分、反传、AdamW。
- 改的是注意力 / MLP / 号码表里的数，遮罩不动。
- 验收卷只抽查；这份配置在验收罚分变好时才写 `ckpt.pt`。
- 启动命令是 README 那一行，`max_iters = 5000` 是停止条件，不是「写得像莎翁」的证明。

采样见 [notes/05-sample.md](05-sample.md)。上游 README 的下一行是：

```sh
python sample.py --out_dir=out-shakespeare-char
```

`model.generate` 会把新抽出的字符接回纸带再往前看。那一章才讲。本仓库没有采样输出。
