# 第 1 步：数据管道（字符级 tokenizer）

> 依据：`karpathy/nanoGPT` @ `3adf61e154c3fe3fca428ad6bc3818b27a3b8291` 的 `data/shakespeare_char/prepare.py`，以及本机实跑输出。不写源码里没有的推断。

## 这一步在整条路线里的位置

语言模型训练吃的是 **整数序列**，不是原始字符串。`prepare.py` 做的事就是：原始文本 → 字符表 → 整数 id → 二进制文件，供后面的 `train.py` 读取。

脚本文件头写得很清楚：

> So instead of encoding with GPT-2 BPE tokens, we just map characters to ints.

也就是说：这里 **不用** GPT-2 的 BPE（`tiktoken`），而是 **一个字符一个 id**。这和原帖「字符级语言模型」一致。

---

## 源码在做什么（按执行顺序）

### 1. 拿到原始文本 `input.txt`

```python
if not os.path.exists(input_file_path):
    data_url = 'https://raw.githubusercontent.com/karpathy/char-rnn/master/data/tinyshakespeare/input.txt'
    ...
    f.write(requests.get(data_url).text)
```

- 若本地没有 `input.txt`，就从 Karpathy 的 `char-rnn` 仓库下载 tiny shakespeare。
- 本机产物：`input.txt` 大小 **1,115,394** bytes，与 `len(data)` 打印值一致。

### 2. 建词表（字符集合）

```python
chars = sorted(list(set(data)))
vocab_size = len(chars)
```

- `set(data)`：出现过的唯一字符
- `sorted(...)`：排序后固定顺序（保证 `stoi`/`itos` 可复现）
- 本机输出：`vocab size: 65`

### 3. 编解码映射

```python
stoi = { ch:i for i,ch in enumerate(chars) }  # char → id
itos = { i:ch for i,ch in enumerate(chars) }  # id → char
def encode(s): return [stoi[c] for c in s]
def decode(l): return ''.join([itos[i] for i in l])
```

这就是最简单的 tokenizer：

| 概念 | 在本脚本里 |
|------|------------|
| tokenize / encode | 字符串 → id 列表 |
| detokenize / decode | id 列表 → 字符串 |
| vocab_size | 65 |

### 4. 切分 train / val

```python
train_data = data[:int(n*0.9)]
val_data = data[int(n*0.9):]
```

- 前 90% 训练，后 10% 验证（按字符位置切，不是按句子/剧本结构切）。
- 本机：train **1,003,854** / val **111,540** tokens（此处 1 token = 1 character id）。

### 5. 落盘

```python
train_ids = np.array(train_ids, dtype=np.uint16)
...
train_ids.tofile(... 'train.bin')
val_ids.tofile(... 'val.bin')
meta = {'vocab_size': vocab_size, 'itos': itos, 'stoi': stoi}
pickle.dump(meta, ... 'meta.pkl')
```

| 文件 | 作用 | 本机大小 |
|------|------|----------|
| `train.bin` | 训练集 id 序列（`uint16` 原始字节） | 2,007,708 |
| `val.bin` | 验证集 id 序列 | 223,080 |
| `meta.pkl` | `vocab_size` + `stoi`/`itos`，采样时 decode 要用 | 703 |

为何是 `uint16`：词表只有 65，远小于 65535，用 2 字节存每个 id 足够（源码字面如此；脚本未再解释选型理由）。

---

## 和琦玉老师那条回复的对应关系

回复大意：真正耗时间的往往不是 Attention 本身，而是 tokenizer、数据管道、训练 loop。

第 1 步正好覆盖了前两块里的「字符级 tokenizer + 数据落盘」。后面 `train.py` 才会读这些 `.bin` 做 batch。

---

## 建议你自己再确认的 3 件事（动手）

1. 打开 `meta.pkl`，看 `stoi` 里空格、换行、标点各自的 id。
2. 对一小段明文 `encode` 再 `decode`，确认可逆。
3. 算一下：`train.bin` 字节数是否等于 `1003854 * 2`（uint16）。

本机已验证：`1003854 * 2 = 2007708`，与 `train.bin` 大小一致；`111540 * 2 = 223080`，与 `val.bin` 一致。

---

## 下一步预告（仍按源码展开）

第 2 步会对照 `config/train_shakespeare_char.py` + `train.py`：模型宽度/深度从哪几个超参来，数据如何被切成 `block_size` 窗口，以及一次 iter 里 loss 怎么算。开训前会先把相关代码段讲清，再决定是否在本机跑。
