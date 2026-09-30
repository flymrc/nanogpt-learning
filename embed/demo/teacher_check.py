"""Check the 'teacher' claim in zh c1-p5 (review-round2 item 1).
The multilingual student (paraphrase-multilingual-MiniLM-L12-v2) was distilled from paraphrase-MiniLM-L12-v2
(Reimers & Gurevych 2020). Does the English-only teacher itself tell Chinese words apart? Writes teacher_check.json."""
import json, itertools
from sentence_transformers import SentenceTransformer
WORDS = ["早饭", "早餐", "午饭", "停车", "breakfast", "morning meal", "parking"]
out = {"note": "points = round(cosine*100), normalized embeddings, CPU"}
for name in ("sentence-transformers/paraphrase-MiniLM-L12-v2", "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"):
    m = SentenceTransformer(name, device="cpu")
    v = dict(zip(WORDS, m.encode(WORDS, normalize_embeddings=True)))
    out[name] = {f"{a}|{b}": int(round(float(v[a] @ v[b]) * 100)) for a, b in itertools.combinations(WORDS, 2)}
json.dump(out, open("teacher_check.json", "w"), ensure_ascii=False, indent=1)
print(json.dumps(out, ensure_ascii=False, indent=1))
