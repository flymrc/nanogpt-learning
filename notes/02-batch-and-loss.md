# 第 2 步：从 `train.bin` 到 `(x, y)` 与 loss（开训前必懂）

> 依据：本机 `/workspace/nanoGPT` @ `3adf61e154c3fe3fca428ad6bc3818b27a3b8291` 的  
> `config/train_shakespeare_char.py`、`train.py`、`model.py` **原文摘录**，以及第 1 步产物 `data/shakespeare_char/`。  
> 本步只建立「数据 → 训练目标」契约，**不启动训练**。

## 为什么先讲这个，再讲 Attention

第 1 步得到的是一条长整数序列。无论后面 Transformer 多复杂，训练目标在代码里都是：

> 看见前面的字符，预测**下一个**字符。

先把 `(x, y)` 和 loss 钉死，再读 QKV，才知道 Attention 在服务什么输入/输出。

---

## 1. config 里决定数据形状的项

`config/train_shakespeare_char.py` 相关行：

```python
out_dir = 'out-shakespeare-char'
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
warmup_iters = 100 # not super necessary potentially
```

| 项 | 值 | 含义（结合 `train.py`） |
|----|----|-------------------------|
| `dataset` | `shakespeare_char` | `data_dir = os.path.join('data', dataset)` → `data/shakespeare_char` |
| `batch_size` | `64` | 每个 batch 抽 64 条窗口 |
| `block_size` | `256` | 每条窗口 256 个字符 |
| `gradient_accumulation_steps` | `1` | 与 batch/block 一起决定每 iter 的 token 数 |

`train.py` 原文：

```python
tokens_per_iter = gradient_accumulation_steps * ddp_world_size * batch_size * block_size
```

单进程且 `gradient_accumulation_steps=1` 时：`64 × 256 = 16384`。

---

## 2. `get_batch`：如何切出 `(x, y)`

`train.py` 原文（L116–131）：

```python
def get_batch(split):
    # We recreate np.memmap every batch to avoid a memory leak, as per
    # https://stackoverflow.com/questions/45132940/numpy-memmap-memory-usage-want-to-iterate-once/61472122#61472122
    if split == 'train':
        data = np.memmap(os.path.join(data_dir, 'train.bin'), dtype=np.uint16, mode='r')
    else:
        data = np.memmap(os.path.join(data_dir, 'val.bin'), dtype=np.uint16, mode='r')
    ix = torch.randint(len(data) - block_size, (batch_size,))
    x = torch.stack([torch.from_numpy((data[i:i+block_size]).astype(np.int64)) for i in ix])
    y = torch.stack([torch.from_numpy((data[i+1:i+1+block_size]).astype(np.int64)) for i in ix])
    if device_type == 'cuda':
        # pin arrays x,y, which allows us to move them to GPU asynchronously (non_blocking=True)
        x, y = x.pin_memory().to(device, non_blocking=True), y.pin_memory().to(device, non_blocking=True)
    else:
        x, y = x.to(device), y.to(device)
    return x, y
```

逐步对应：

1. `np.memmap(..., dtype=np.uint16)`：映射第 1 步的 `train.bin` / `val.bin`。
2. `torch.randint(len(data) - block_size, (batch_size,))`：随机起点，保证窗口不越界。
3. **`x = data[i:i+block_size]`**：输入，长度 `block_size`。
4. **`y = data[i+1:i+1+block_size]`**：相对 `x` **右移 1**；位置 `t` 的标签是下一个字符。
5. `torch.stack` → 形状 `(batch_size, block_size)`，再搬到 device。

### 本机例子（`train.bin`，`i=1000`，演示 `block=16`；正式训练 `block_size=256`）

| | 内容 |
|--|------|
| `x` ids | `31, 43, 41, 53, 52, 42, 1, 15, 47, 58, 47, 64, 43, 52, 10, 0` |
| `y` ids | `43, 41, 53, 52, 42, 1, 15, 47, 58, 47, 64, 43, 52, 10, 0, 35` |
| `x` 文本 | `Second Citizen:\n` |
| `y` 文本 | `econd Citizen:\nW` |

`y` 就是整段 `x` 向后错一位。正式训练时 `x, y` 形状为 **`(64, 256)`**。

---

## 3. `vocab_size` 从哪来

`train.py` 原文：

```python
meta_path = os.path.join(data_dir, 'meta.pkl')
meta_vocab_size = None
if os.path.exists(meta_path):
    with open(meta_path, 'rb') as f:
        meta = pickle.load(f)
    meta_vocab_size = meta['vocab_size']
    print(f"found vocab_size = {meta_vocab_size} (inside {meta_path})")
```

本机：`vocab_size = 65`。从零训练时模型用该值（无 meta 才回退到 50304）。

---

## 4. loss 接口（先不展开 Attention）

`model.py` `GPT.forward` 原文：

```python
    def forward(self, idx, targets=None):
        device = idx.device
        b, t = idx.size()
        assert t <= self.config.block_size, f"Cannot forward sequence of length {t}, block size is only {self.config.block_size}"
        pos = torch.arange(0, t, dtype=torch.long, device=device) # shape (t)

        # forward the GPT model itself
        tok_emb = self.transformer.wte(idx) # token embeddings of shape (b, t, n_embd)
        pos_emb = self.transformer.wpe(pos) # position embeddings of shape (t, n_embd)
        x = self.transformer.drop(tok_emb + pos_emb)
        for block in self.transformer.h:
            x = block(x)
        x = self.transformer.ln_f(x)

        if targets is not None:
            # if we are given some desired targets also calculate the loss
            logits = self.lm_head(x)
            loss = F.cross_entropy(logits.view(-1, logits.size(-1)), targets.view(-1), ignore_index=-1)
        else:
            # inference-time mini-optimization: only forward the lm_head on the very last position
            logits = self.lm_head(x[:, [-1], :]) # note: using list [-1] to preserve the time dim
            loss = None

        return logits, loss
```

训练时：`logits, loss = model(X, Y)`（`Y` 即上面的 `y`）。

当传入 `targets` 时：

1. 序列经 Transformer 得到每个位置的表示
2. `lm_head` → `logits`，最后一维 = `vocab_size`（此处 65）
3. `F.cross_entropy(...)`：位置 `t` 的预测对齐 `targets[t]`（下一个字符）

**本步契约：**

```text
x[t]  →  模型  →  65 类上的分布  →  cross_entropy 对齐  y[t]
```

Attention / QKV 是「如何从 `x` 算出每个位置表示」的内部实现；输入输出已由 `get_batch` + `cross_entropy` 定义。

---

## 建议动手确认

1. 任取起点 `i`，打印 `data[i:i+8]` 与 `data[i+1:i+9]`，确认移位。
2. 用 `itos` decode 两段文本对照。
3. 写出 `tokens_per_iter = 64 * 256 = 16384`。

---

## 下一步

第 3 步先写因果自注意力，见 [notes/03-causal-self-attention.md](03-causal-self-attention.md)。MLP 和开训仍往后放。
