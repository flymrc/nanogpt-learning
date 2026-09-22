# 第 3 步：Causal Self-Attention（先不开训）

> 依据：本机笔记所核对的 [karpathy/nanoGPT](https://github.com/karpathy/nanoGPT) @ `3adf61e154c3fe3fca428ad6bc3818b27a3b8291`  
> `model.py` 的 `CausalSelfAttention` / `Block`，以及 `config/train_shakespeare_char.py`、`train.py` 里已经出现的形状。  
> 这一章只讲「每一格怎么看左边」。**不启动训练，不写 loss 数字。**

## 这一步在路线里的位置

第 1 步把台词变成整数纸带。第 2 步规定：看见 `x[t]`，要猜的是右边那一格 `y[t]`，罚分用 `F.cross_entropy`。

注意力是模型内部的一步：在把 `x` 交出去打分之前，让**每一个位置**从自己和左边收集线索。它不改变「猜下一个字符」这道题。

`config/train_shakespeare_char.py` 里和这一章有关的数：

| 项 | 值 | 源码里的位置 |
|----|----|----------------|
| `n_layer` | 6 | 重复 6 个 Block |
| `n_head` | 6 | 每个注意力有 6 个头 |
| `n_embd` | 384 | 每一格的向量宽度 |
| `block_size` | 256 | 因果遮罩的最大边长，也是窗口上限 |
| `dropout` | 0.2 | 注意力权重和输出投影上都会用 |

`train.py` 默认 `bias = False`，`train_shakespeare_char.py` 没有给 `bias` 赋值，所以这一路的 `Linear` / `LayerNorm` **不带 bias**。

每头宽度是源码里的除法，不是测量值：

```text
head_size = n_embd / n_head = 384 / 6 = 64
```

`CausalSelfAttention.__init__` 里有 `assert config.n_embd % config.n_head == 0`，384 能被 6 整除。

---

## 1. 每一格只看左边（含自己）

`model.py` 注释原文：

```text
causal mask to ensure that attention is only applied to the left in the input sequence
```

纸带隐喻：格子还是第 1 章的号码牌。轮到某一格时，它能回头看从开头到自己，不能看右边。右边的字符是第 2 章里 `y` 才对得上的「下一个」，不能提前拿来当线索。

演示仍用 `Second Citizen:\n` 的开头四个字符 `S e c o`（id `31, 43, 41, 53`）。轮到 `c` 时能看 `S`、`e`、`c`，不能看 `o`。

---

## 2. 提问、标签、内容

`CausalSelfAttention.forward` 原文：

```python
B, T, C = x.size() # batch size, sequence length, embedding dimensionality (n_embd)
q, k, v = self.c_attn(x).split(self.n_embd, dim=2)
k = k.view(B, T, self.n_head, C // self.n_head).transpose(1, 2) # (B, nh, T, hs)
q = q.view(B, T, self.n_head, C // self.n_head).transpose(1, 2) # (B, nh, T, hs)
v = v.view(B, T, self.n_head, C // self.n_head).transpose(1, 2) # (B, nh, T, hs)
```

`c_attn` 是 `nn.Linear(n_embd, 3 * n_embd)`。一次线性层吐出三倍宽，再沿最后一维切成三份：

| 代码 | 这一课的叫法 | 干什么 |
|------|----------------|--------|
| `q` | 提问 | 当前格拿去问别人 |
| `k` | 标签 | 被问的那一格亮出来的标记 |
| `v` | 内容 | 决定要搬回来的东西 |

形状在切开并排好头之后是 `(B, n_head, T, head_size)`，也就是 `(批, 6, 时间, 64)`。

这三份不是原来的字符。字符在进入 Block 之前已经过 `wte` 词嵌入和 `wpe` 位置嵌入，加成宽度 384 的向量。嵌入本身这一章不展开。

---

## 3. 因果遮罩

手动实现（没有 Flash Attention 时）原文：

```python
att = (q @ k.transpose(-2, -1)) * (1.0 / math.sqrt(k.size(-1)))
att = att.masked_fill(self.bias[:,:,:T,:T] == 0, float('-inf'))
att = F.softmax(att, dim=-1)
att = self.attn_dropout(att)
y = att @ v # (B, nh, T, T) x (B, nh, T, hs) -> (B, nh, T, hs)
```

遮罩在 `__init__` 里做成下三角：

```python
self.register_buffer("bias", torch.tril(torch.ones(config.block_size, config.block_size))
                             .view(1, 1, config.block_size, config.block_size))
```

`torch.tril` 保留左下（含对角线）。`== 0` 的右上角被填成 `-inf`。softmax 之后，那些格子的重量是 0。

用四个字符看「谁在问 / 看谁」：

| 谁在问 | S | e | c | o |
|--------|---|---|---|---|
| S | 能 | 不能 | 不能 | 不能 |
| e | 能 | 能 | 不能 | 不能 |
| c | 能 | 能 | 能 | 不能 |

字没有从纸带上剪掉。只是当前格不准看右边。

PyTorch ≥ 2 时走另一条路径，规则相同：

```python
y = torch.nn.functional.scaled_dot_product_attention(
    q, k, v, attn_mask=None, dropout_p=self.dropout if self.training else 0, is_causal=True)
```

`is_causal=True` 就是「只看左边」。这一课用手动那几行讲清楚，因为它们把除法、遮罩、softmax、加权乘写在明面上。

---

## 4. 一份重量，再加权汇总

分数先除以 `sqrt(head_size)`。这里 head size 是 64，所以除以 `√64 = 8`。这是公式里的缩放，不是某次训练打出来的分数。

然后 `softmax` 把**还能看的格子**变成加起来为 1 的重量。被盖住的格子保持 0。

汇总是：

```text
这一格的新内容 = Σ 重量[j] × 内容[j]    # 只对 j ≤ 当前格
```

对应 `y = att @ v`。六个头各算一块 `(T, 64)`，再拼回去：

```python
y = y.transpose(1, 2).contiguous().view(B, T, C) # re-assemble all head outputs side by side
y = self.resid_dropout(self.c_proj(y))
```

`c_proj` 是 `nn.Linear(n_embd, n_embd)`，把拼好的 384 再投影一次。

**这里不写 0.2、0.5 这种「看起来像概率」的小数。** 模型没有训练，那些数没有来源。

---

## 5. 加回原来的这一格

`Block.forward` 原文：

```python
def forward(self, x):
    x = x + self.attn(self.ln_1(x))
    x = x + self.mlp(self.ln_2(x))
    return x
```

注意力包在残差里：先做一层 LayerNorm，再注意力，然后**加回**原来的 `x`。纸带上的这一格还在，只是多记住了左边。

同一块后面还有 `mlp`。MLP 把宽度放到 `4 * n_embd` 再收回来，用 GELU。那是下一块要拆的内容，这一章停在注意力。

`n_layer = 6`，所以上面这个 Block 会重复 6 次。重复不等于已经开训。

---

## 和猜下一个字的关系

`GPT.forward` 在所有 Block 之后才做 `lm_head`，得到每个位置在 `vocab_size`（这里是 65）上的 logits。传入 `targets` 时才算 `F.cross_entropy`。

所以这一章的输出仍是「每一格的向量」，不是下一个字符，也不是罚分。

---

## 这一章故意不写的东西

- 不跑 `train.py`，不记录 loss。
- 不编造注意力热力图上的小数。
- 不把 MLP、完整 Embedding 表、采样当成已经讲完。

## 下一步

开训见 [notes/04-train.md](04-train.md)：`python train.py config/train_shakespeare_char.py`。这一章仍然不跑训练，也不记录 loss。
