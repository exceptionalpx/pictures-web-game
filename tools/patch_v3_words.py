# -*- coding: utf-8 -*-
"""v2 → v3：类别词单列（8 类共用，+1），联想词 2 个（全库唯一，+2），准确词（+5）"""
import io, json

f = r"E:\巧手猜图游戏\pictures-web-game\image-pack-64.json"
d = json.load(io.open(f, encoding="utf-8"))

CAT_WORD = {
    "动物": "动物", "食物": "食物", "交通工具": "交通工具", "地标建筑": "建筑",
    "职业": "职业", "自然现象": "自然", "节日文化": "节日", "运动": "运动",
}

# (id → 新联想词列表[2]) 覆盖需替换的图；其余图 = 去掉 v2 旧类别词(第1个)，保留后两个
OVERRIDE = {
    "land-eiffel": ["巴黎", "风景"],
    "land-pyramid": ["埃及", "古迹"],
    "land-lighthouse": ["海岸", "灯光"],
    "land-windmill": ["田园", "叶片"],
    "land-castle": ["欧洲", "塔楼"],
    "land-greatwall": ["中国", "蜿蜒"],
    "land-pearl": ["上海", "电视塔"],
    "land-colosseum": ["罗马", "竞技"],
    "veh-rocket": ["发射", "火焰"],
    "cul-dragonboat": ["端午", "划船"],
    "cul-pumpkin": ["鬼脸", "雕刻"],
    "cul-kite": ["放飞", "长线"],
    "cul-redenvelope": ["压岁", "拜年"],
    "spt-golf": ["球杆", "草地"],
    "spt-baseball": ["球棒", "赛场"],
}

for im in d["images"]:
    cw = CAT_WORD[im["category"]]
    if im["id"] in OVERRIDE:
        kw = OVERRIDE[im["id"]]
    else:
        kw = im["keywords"][1:3]
    im["category_word"] = cw
    im["keywords"] = kw

d["pack"] = "pictures-web-64-v3"
d["version"] = 3
d["note"] = "巧手猜图网页版 64 图词表 v3：每图=1 类别词(+1，同类共用)+2 联想词(+2，全库唯一)+1 准确词(+5)。B 级计分。词条全部 2 字以上、联想词跨图唯一、无空白标点。"

io.open(f, "w", encoding="utf-8", newline="").write(json.dumps(d, ensure_ascii=False, indent=2))
print("v3 写入完成")

# 校验
import collections
allw, lw = [], []
for im in d["images"]:
    assert len(im["keywords"]) == 2, im["id"]
    assert im["exact"] not in im["keywords"] + [im["category_word"]]
    for w in im["keywords"] + [im["exact"], im["category_word"]]:
        assert len(w) >= 2, (im["id"], w)
        assert not any(c.isspace() or c in "，。！？" for c in w), (im["id"], w)
        allw.append(w)
    lw += im["keywords"]
dup = [w for w, c in collections.Counter(lw).items() if c > 1]
assert not dup, "联想词重复: " + str(dup)
exact_dup = [w for w, c in collections.Counter(x['exact'] for x in d['images']).items() if c > 1]
assert not exact_dup, "准确词重复: " + str(exact_dup)
for w in lw:
    assert w not in [x['exact'] for x in d['images']], "联想词与准确词冲突: " + w
for im in d["images"]:
    assert im["category_word"] == CAT_WORD[im["category"]]
print("校验 OK：64 图 / 256 词条（64 类别词可重复 + 128 联想词 + 64 准确词）全部合规")
print("示例 大象:", [x for x in d['images'] if x['zh']=='大象'][0])
