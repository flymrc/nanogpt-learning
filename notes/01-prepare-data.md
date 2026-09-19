# 第 1 步：数据管道（字符级 tokenizer）

> 依据：本机 `/workspace/nanoGPT` @ `3adf61e154c3fe3fca428ad6bc3818b27a3b8291` 的 `data/shakespeare_char/prepare.py` **原文摘录**，以及同仓库产物与再次执行的 stdout。不写源码之外的推断。

## 这一步在整条路线里的位置

语言模型训练吃的是**整数序列**，不是原始字符串。`prepare.py` 把原始文本变成字符表、整数 id 和二进制文件，供后面的 `train.py` 读取。

文件头原文：

```python
"""
Prepare the Shakespeare dataset for character-level language modeling.
So instead of encoding with GPT-2 BPE tokens, we just map characters to ints.
Will save train.bin, val.bin containing the ids, and meta.pkl containing the
encoder and decoder and some other related info.
"""
```

要点（来自上面这段话）：这里**不用** GPT-2 BPE，而是把字符映射成整数。这和「字符级语言模型」路线一致。

---

## 源码按执行顺序在做什么

### 1. 下载 / 读取 `input.txt`

```python
input_file_path = os.path.join(os.path.dirname(__file__), 'input.txt')
if not os.path.exists(input_file_path):
    data_url = 'https://raw.githubusercontent.com/karpathy/char-rnn/master/data/tinyshakespeare/input.txt'
    with open(input_file_path, 'w') as f:
        f.write(requests.get(data_url).text)

with open(input_file_path, 'r') as f:
    data = f.read()
print(f"length of dataset in characters: {len(data):,}")
```

本机事实：

- `input.txt` = **1,115,394** bytes
- stdout：`length of dataset in characters: 1,115,394`

### 2. 建词表

```python
chars = sorted(list(set(data)))
vocab_size = len(chars)
print("all the unique characters:", ''.join(chars))
print(f"vocab size: {vocab_size:,}")
```

- `set(data)`：去重
- `sorted(...)`：排序，固定 id 顺序
- stdout：`vocab size: 65`

### 3. 编解码（最简 tokenizer）

```python
stoi = { ch:i for i,ch in enumerate(chars) }
itos = { i:ch for i,ch in enumerate(chars) }
def encode(s):
    return [stoi[c] for c in s] # encoder: take a string, output a list of integers
def decode(l):
    return ''.join([itos[i] for i in l]) # decoder: take a list of integers, output a string
```

| 名称 | 源码注释中的含义 |
|------|------------------|
| `encode` | take a string, output a list of integers |
| `decode` | take a list of integers, output a string |
| `vocab_size` | 65（来自 `meta.pkl`） |

本机从 `meta.pkl` 读出的几个映射（帮助建立直觉）：

| 字符 | `stoi` id |
|------|-----------|
| `\n` | 0 |
| `space` | 1 |
| `.` | 8 |
| `A` | 13 |
| `a` | 39 |

### 4. 切分 train / val

```python
n = len(data)
train_data = data[:int(n*0.9)]
val_data = data[int(n*0.9):]

train_ids = encode(train_data)
val_ids = encode(val_data)
print(f"train has {len(train_ids):,} tokens")
print(f"val has {len(val_ids):,} tokens")
```

- 按字符下标前 90% / 后 10% 切（源码字面如此）。
- 这里的 token = 一个字符 id。
- stdout：`train has 1,003,854 tokens` / `val has 111,540 tokens`

### 5. 写成二进制 + meta

```python
train_ids = np.array(train_ids, dtype=np.uint16)
val_ids = np.array(val_ids, dtype=np.uint16)
train_ids.tofile(os.path.join(os.path.dirname(__file__), 'train.bin'))
val_ids.tofile(os.path.join(os.path.dirname(__file__), 'val.bin'))

meta = {
    'vocab_size': vocab_size,
    'itos': itos,
    'stoi': stoi,
}
with open(os.path.join(os.path.dirname(__file__), 'meta.pkl'), 'wb') as f:
    pickle.dump(meta, f)
```

| 文件 | 作用 | 本机大小 |
|------|------|----------|
| `train.bin` | 训练集 id，`uint16` 原始字节 | 2,007,708 |
| `val.bin` | 验证集 id | 223,080 |
| `meta.pkl` | `vocab_size` + `stoi` / `itos`（后面 sample 要 decode） | 703 |

可核对算术（与文件大小一致）：

- `1,003,854 × 2 = 2,007,708`
- `111,540 × 2 = 223,080`

源码使用 `dtype=np.uint16`。词表 65 远小于 65535，因此放得下；脚本没有另写为什么不用 `uint8`。

---

## 和讨论帖的对应

原帖路线要求字符级语言模型；回复强调难点常在 tokenizer、数据管道、训练 loop。第 1 步覆盖的正是**字符级 tokenizer + 数据落盘**。

---

## 建议你动手确认的 3 件事

1. 自己 `pickle.load` 打开 `meta.pkl`，看 `stoi` / `itos`。
2. 对一小段明文 `encode` 再 `decode`，确认可逆。
3. 用上面的 `× 2` 核对 `.bin` 文件大小。

---

## 下一步怎么展开（学习方式）

第 2 步不会只丢训练命令。会先对照源码讲清：

1. `config/train_shakespeare_char.py` 里每个超参对应什么
2. `train.py` 如何从 `train.bin` 取出长度为 `block_size` 的窗口
3. 一次 iteration 里 loss 怎么算

讲清后再决定是否在本机开训。
