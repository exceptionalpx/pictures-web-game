# -*- coding: utf-8 -*-
"""v3 → v3-photo：仅替换 en_prompt 为写实照片风格，其余字段（词表/计分）原样保留"""
import io, json

f = r"E:\巧手猜图游戏\pictures-web-game\image-pack-64.json"
d = json.load(io.open(f, encoding="utf-8"))

def subject(en):
    # 提取 "minimalist flat illustration of X, bold clear silhouette..." 中的主语段
    a = en.find("illustration of ")
    b = en.find(", bold clear silhouette")
    if a == -1 or b == -1:
        raise ValueError("unexpected prompt: " + en[:60])
    return en[a + len("illustration of "):b]

for im in d["images"]:
    subj = subject(im["en_prompt"])
    im["en_prompt"] = (
        "realistic photograph of " + subj +
        ", single subject, clean soft-focus background, natural lighting, "
        "professional photography, centered composition, no text, no watermark"
    )

d["pack"] = "pictures-web-64-v3-photo"
d["style_template"] = "realistic photograph of {SUBJECT}, single subject, clean soft-focus background, natural lighting, professional photography, centered composition, no text, no watermark"

io.open(f, "w", encoding="utf-8", newline="").write(json.dumps(d, ensure_ascii=False, indent=2))

# 校验：字段不变 + 提示词已换
import collections
lw, ex = [], []
for im in d["images"]:
    assert len(im["keywords"]) == 2
    assert im["en_prompt"].startswith("realistic photograph of ")
    for w in im["keywords"] + [im["exact"], im["category_word"]]:
        assert len(w) >= 2
    lw += im["keywords"]; ex.append(im["exact"])
assert not [w for w, c in collections.Counter(lw).items() if c > 1]
assert not [w for w, c in collections.Counter(ex).items() if c > 1]
print("OK 64 图提示词已换为写实照片风格，词表 v3 原样保留")
print("示例:", d["images"][0]["zh"], "→", d["images"][0]["en_prompt"][:120])
