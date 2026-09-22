# 第 5 步：采样（讲清机制，本机不记台词）

> 依据：本机笔记核对过的 [karpathy/nanoGPT](https://github.com/karpathy/nanoGPT) @ `3adf61e154c3fe3fca428ad6bc3818b27a3b8291`  
> `sample.py`、`model.py` 的 `GPT.generate`、`config/train_shakespeare_char.py`，以及上游 README 的采样命令。  
> **本仓库没有 `ckpt.pt`，也没有自己的采样输出。** 下面不贴假台词。上游 README 里出现过的样本，只作为作者的示例被点名，不转载，也不当成我们跑出来的结果。

前四步已经钉死：纸带是整数流，`y` 是 `x` 右移一格，罚分是 `F.cross_entropy`，每一格只看左边，开训用练习卷上的罚分改数，验收罚分变小才把检查点写进 `out-shakespeare-char/ckpt.pt`。采样做的事是：读那份检查点，从一小段开头往纸带后面接新格子。

---

## 1. 采样在问什么

开训问的是：看见前面，真的下一个字被押了多少。采样不问真答案。它让模型按当前的把握抽出一格，接到末尾，再看更长的纸带。

`sample.py` 开头的默认值：

```python
init_from = 'resume' # either 'resume' (from an out_dir) or a gpt2 variant (e.g. 'gpt2-xl')
out_dir = 'out' # ignored if init_from is not 'resume'
start = "\n" # or "<|endoftext|>" or etc. Can also specify a file, use as: "FILE:prompt.txt"
num_samples = 10 # number of samples to draw
max_new_tokens = 500 # number of tokens generated in each sample
temperature = 0.8 # 1.0 = no change, < 1.0 = less random, > 1.0 = more random, in predictions
top_k = 200 # retain only the top_k most likely tokens, clamp others to have 0 probability
seed = 1337
device = 'cuda' # examples: 'cpu', 'cuda', 'cuda:0', 'cuda:1', etc.
compile = False # use PyTorch 2.0 to compile the model to be faster
```

字符课用命令行把 `out_dir` 改成 `out-shakespeare-char`。`init_from` 仍是 `'resume'`。脚本因此去读：

```python
ckpt_path = os.path.join(out_dir, 'ckpt.pt')
```

加载后会去掉 `state_dict` 键名上的 `_orig_mod.` 前缀（开训若开过 `torch.compile`，键名会带这个前缀），再 `load_state_dict`。然后 `model.eval()`、`model.to(device)`。`compile` 默认是 `False`，和 `train.py` 默认打开编译不是一回事。

`model.eval()` 让 Dropout 停用。shakespeare_char 配置里的 `dropout = 0.2` 只在训练时起作用。

种子是 `torch.manual_seed(1337)`，并且调用了 `torch.cuda.manual_seed(1337)`。

---

## 2. 开头从哪来

默认 `start = "\n"`。在 `shakespeare_char` 的字符表里，换行是第 0 号（`prepare.py` 注释里的 65 字，第一格就是换行）。

若 `start` 以 `FILE:` 开头，脚本读那个文件的全文当开头：

```python
if start.startswith('FILE:'):
    with open(start[5:], 'r', encoding='utf-8') as f:
        start = f.read()
start_ids = encode(start)
x = (torch.tensor(start_ids, dtype=torch.long, device=device)[None, ...])
```

`x` 的形状是 `(1, 开头长度)`。它不是从 `train.bin` 里剪出来的窗口，也没有配对的 `y`。

编码从检查点里的 `config['dataset']` 找 `meta.pkl`。shakespeare_char 的配置写了 `dataset = 'shakespeare_char'`，训练时这份 `config` 会进检查点，所以路径是 `data/shakespeare_char/meta.pkl`。找到的话：

```python
stoi, itos = meta['stoi'], meta['itos']
encode = lambda s: [stoi[c] for c in s]
decode = lambda l: ''.join([itos[i] for i in l])
```

找不到就打印 `No meta.pkl found, assuming GPT-2 encodings...`，改用 tiktoken 的 `gpt2`。那是另一套词表。字符课的号码对不上。本课假定已经跑过 `prepare.py`，这张表在。

---

## 3. 自回归：抽一格，接上，再抽

生成在 `torch.no_grad()` 里，外面包着和设备对应的 autocast（CPU 上是 `nullcontext`）。循环 `num_samples` 次，**每一次都从同一个 `x` 开始**，不是把上一份的结果当成下一份的开头。每一份打完再打一行 `---------------`。

真正接格子的是 `GPT.generate`：

```python
@torch.no_grad()
def generate(self, idx, max_new_tokens, temperature=1.0, top_k=None):
    for _ in range(max_new_tokens):
        idx_cond = idx if idx.size(1) <= self.config.block_size else idx[:, -self.config.block_size:]
        logits, _ = self(idx_cond)
        logits = logits[:, -1, :] / temperature
        if top_k is not None:
            v, _ = torch.topk(logits, min(top_k, logits.size(-1)))
            logits[logits < v[:, [-1]]] = -float('Inf')
        probs = F.softmax(logits, dim=-1)
        idx_next = torch.multinomial(probs, num_samples=1)
        idx = torch.cat((idx, idx_next), dim=1)
    return idx
```

和开训对齐的几点：

- 纸带长过 `block_size` 时，只把最后 `block_size` 格送进去。shakespeare_char 的配置是 `block_size = 256`，这个数存在检查点的 `model_args` 里，不是 `sample.py` 另写的一个常数。
- `forward` 在没有 `targets` 时不算 loss，并且只对最后一格做 `lm_head`。`generate` 再取 `logits[:, -1, :]`。
- 新号码用 `torch.cat` 接到末尾。下一次它就在左边。
- 抽出用的是 `multinomial`，不是 `argmax`。默认不会「永远选分数最高的那一格」。
- 默认 `max_new_tokens = 500`，所以每一份是「开头 + 500 个新号码」。默认 `num_samples = 10`。

函数自己的说明写着：把预测喂回模型，并且你多半希望此时已经在 `eval`。`sample.py` 在调用前做了 `model.eval()`。

---

## 4. 温度和 top-k（按这份源码，不按口头习惯）

温度的注释是原句：`1.0 = no change, < 1.0 = less random, > 1.0 = more random`。实现是把最后一格的 logits **除以** temperature，再 softmax。默认 `0.8`，小于 1，把握更集中，更少随机。这里不写一组假的概率。

`temperature` 为 0 时这行是除以零。源码没有把它特殊处理成「选最大」。本课只讲默认的 `0.8`。

top-k 的注释说只保留最可能的 `top_k` 个，其余概率钳成 0。实现是：

```python
v, _ = torch.topk(logits, min(top_k, logits.size(-1)))
logits[logits < v[:, [-1]]] = -float('Inf')
```

默认 `top_k = 200`。shakespeare_char 的词表是 **65**。`min(200, 65)` 是 65，阈值是全体里最小的那个 logit，`logits < 最小值` 不会丢掉任何一格。

所以：**字符课在默认参数下，top-k 不会砍字。** 温度仍会改变分布有多尖。若有人把 `top_k` 改成小于 65 的数，才会真的丢掉排在后面的字符。本课不另编一个被砍掉的例子。

---

## 5. 怎么启动（上游命令，本仓库未跑）

官方 README 在字符级 GPU 开训之后的下一行：

```sh
python sample.py --out_dir=out-shakespeare-char
```

只有 CPU 时，README 另给了：

```sh
python sample.py --out_dir=out-shakespeare-char --device=cpu
```

`sample.py` 自己的默认 `device` 是 `'cuda'`。不传 `--device=cpu` 就会走这条默认。

这两行都要求目录里已经有开训写下的 `ckpt.pt`。第 4 步的配置是 `always_save_checkpoint = False`，所以文件只在验收罚分变小且步数大于 0 时出现。本仓库没有这份文件，也没有运行上面任何一行。

### 上游 README 里出现过、但不是本仓库输出的台词

README 在 GPU 那段后面贴了一段采样，开头是 `ANGELO:`。CPU 那段后面另有一段，开头是 `GLEORKEN VINGHARD III:`。作者把它们称作大约 3 分钟训练之后的例子。

那是上游 README 的内容。`experiments/` 里没有对应日志。这篇笔记和游戏都不转载那些句子，以免被读成我们的采样结果。

---

## 6. 这不是正确率

采样打印的是 `decode` 之后的字符串，外加分隔线。它不返回 loss，也不打印百分比。

对照开训里的抽查：`estimate_loss` 在 `no_grad` 里对 `'train'` 和 `'val'` 各取 `eval_iters` 个批的 `F.cross_entropy` 平均。那是猜错罚分。README 里作者写过最好的 validation loss `1.4697`（GPU）和大约 `1.88`（缩小后的 CPU 配置）。那两句仍是作者的说法，不是本仓库的测量，也不是「对了百分之几」。

`generate` 不传 `targets`，`forward` 把 `loss` 设成 `None`。没有真答案，就没有这一格的罚分。一段读起来像不像莎翁，不能代替验收卷上的那次平均。反过来，验收罚分变小，也不等于已经印出一段台词。

采样也不调用 `backward`，不走 AdamW。读检查点的时候，模型里的数保持为存档时的数。

---

## 7. 字符课走到这里，旁边还有别的入口

对着源码，这条路是：

1. `prepare.py` 把剧本收成 65 字的整数纸带。
2. `get_batch` 剪窗口，`y` 是 `x` 右移一格，罚分是交叉熵。
3. 每一格只看左边，按重量把内容加回来。
4. 练习卷上按罚分改数；验收更好才存 `ckpt.pt`。
5. `sample.py` 从开头把新格子接到纸带后面。

还没在这条笔记里展开的，要分开说：

- 每一块里注意力之后还有 MLP（升到 `4 * n_embd`，GELU，再收回来）。开训会改它的数。第 3 步故意没有把这一层的前向拆开。
- 本仓库仍然没有训练日志，也没有采样日志。

离开这 65 个字符之后，上游 README 还有别的入口。它们不是这一课的号码牌：

| 入口 | 命令（上游原文方向） | 和字符课的差别 |
|------|----------------------|----------------|
| BPE 微调 | `python data/shakespeare/prepare.py`，然后 `python train.py config/finetune_shakespeare.py` | `dataset = 'shakespeare'`，`init_from = 'gpt2-xl'`，输出目录 `out-shakespeare`。词表不是 65。 |
| 从那份微调采样 | `python sample.py --out_dir=out-shakespeare` | README 这么写。同样不是字符课的检查点。 |
| 复现 GPT-2 | `torchrun --standalone --nproc_per_node=8 train.py config/train_gpt2.py` | OpenWebText，另一套配置。 |
| 直接抽官方 GPT-2 | `python sample.py --init_from=gpt2-xl --start=...` | 不读 `out-shakespeare-char`。 |

README 文首还注明 nanoGPT 已有一个更新的后续项目 nanochat。那是仓库自己的说明，不是这一课要跑的命令。

---

## 8. 这一课怎样算讲完

讲完是指能对着源码说出：

- 采样读 `ckpt.pt`，从开头（默认一个换行）往后续，不改数。
- 循环是：必要时裁到最后 256 格，只给最后一格打分，按温度和 top-k 得到把握，`multinomial` 抽一格，接上。
- 默认温度 `0.8`。默认 top-k `200` 在 65 字的词表上等于全留。
- 启动命令是 README 那一行。本仓库没有复跑，也不把 README 里的台词当成自己的样本。
- 采样不是验收罚分，更不是正确率。
