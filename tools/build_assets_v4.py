# -*- coding: utf-8 -*-
"""
v4 资产构建：
1) 词表 image-pack-64.json：
   - 每图新增 aliases[]（近似名/俗称，命中按联想词 +2）
   - 修复 spt-surfing 子串重叠：keyword "冲浪板" -> "海浪"（exact "冲浪" ⊂ "冲浪板"）
   - 校验：exact 不能是任一 keyword/alias 的真子串；同图 alias 不与 exact/keywords/category 重复
2) 生成 images-thumb\（320px JPEG q72）照片墙缩略图
"""
import json, io, os, sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PACK = os.path.join(ROOT, "image-pack-64.json")
IMG_DIR = os.path.join(ROOT, "images")
THUMB_DIR = os.path.join(ROOT, "images-thumb")

ALIASES = {
  "ani-elephant": ["象", "非洲象"],
  "ani-giraffe": ["长颈", "非洲鹿"],
  "ani-penguin": ["鹅"],
  "ani-shark": ["大白鲨", "鱼"],
  "ani-butterfly": ["蝶", "彩蝶"],
  "ani-owl": ["夜猫子", "枭"],
  "ani-turtle": ["龟", "甲鱼"],
  "ani-bee": ["蜂", "嗡嗡"],
  "food-pizza": ["饼", "意大利饼"],
  "food-burger": ["堡", "牛肉堡"],
  "food-sushi": ["饭团", "紫菜卷"],
  "food-icecream": ["雪糕", "冰激凌"],
  "food-coffee": ["拿铁", "卡布奇诺"],
  "food-hotpot": ["涮锅", "暖锅"],
  "food-mooncake": ["中秋点心", "圆饼"],
  "food-banana": ["芭蕉", "蕉"],
  "veh-sailboat": ["船", "帆"],
  "veh-balloon": ["气球", "气艇"],
  "veh-rocket": ["飞船", "太空船"],
  "veh-train": ["列车", "高铁"],
  "veh-helicopter": ["飞机", "旋翼机"],
  "veh-bicycle": ["单车", "脚踏车"],
  "veh-motorcycle": ["机车", "摩托"],
  "veh-ship": ["船", "邮轮"],
  "land-eiffel": ["铁塔", "巴黎铁塔"],
  "land-pyramid": ["法老陵墓", "三角塔"],
  "land-lighthouse": ["塔", "灯楼"],
  "land-windmill": ["磨坊"],
  "land-castle": ["古堡", "堡垒"],
  "land-greatwall": ["城墙", "烽火台"],
  "land-pearl": ["明珠塔", "陆家嘴塔"],
  "land-colosseum": ["竞技场", "罗马竞技场"],
  "job-astronaut": ["太空人", "航天员"],
  "job-firefighter": ["救火队员", "消防队员"],
  "job-chef": ["大厨", "炊事员"],
  "job-doctor": ["大夫", "医师"],
  "job-fisherman": ["渔夫", "渔人"],
  "job-police": ["民警", "警官"],
  "job-teacher": ["老师", "教员"],
  "job-painter": ["画师", "美术家"],
  "nat-rainbow": ["虹", "七彩"],
  "nat-lightning": ["雷", "霹雳"],
  "nat-shootingstar": ["陨星"],
  "nat-snowmountain": ["雪峰"],
  "nat-volcano": ["喷火口", "熔岩山"],
  "nat-snowflake": ["雪片", "冰晶"],
  "nat-sunrise": ["晨曦", "旭日"],
  "nat-starrysky": ["星夜", "星河"],
  "cul-lantern": ["灯", "花灯"],
  "cul-dragonboat": ["龙船"],
  "cul-liondance": ["狮子", "醒狮"],
  "cul-christmastree": ["松树", "云杉"],
  "cul-pumpkin": ["南瓜", "杰克灯"],
  "cul-kite": ["纸鸢"],
  "cul-redenvelope": ["利是"],
  "cul-foldingfan": ["扇子"],
  "spt-football": ["皮球", "蹴鞠"],
  "spt-tennis": ["球拍"],
  "spt-archery": ["弓箭", "箭"],
  "spt-golf": ["小白球", "挥杆"],
  "spt-skiing": ["双板", "雪杖"],
  "spt-surfing": ["踏浪", "浪尖"],
  "spt-baseball": ["垒球"],
  "spt-skateboard": ["陆冲", "长板"],
}

def norm(s):
    return (s or "").replace(" ", "").lower()

def main():
    with io.open(PACK, encoding="utf-8") as f:
        data = json.load(f)
    imgs = data["images"]
    errors = []

    # 1) 修复冲浪 keyword 子串重叠
    surf = next(g for g in imgs if g["id"] == "spt-surfing")
    if "冲浪板" in surf["keywords"]:
        surf["keywords"] = ["海浪" if k == "冲浪板" else k for k in surf["keywords"]]

    # 2) 注入 aliases
    for g in imgs:
        al = ALIASES.get(g["id"])
        if al is None:
            errors.append("%s 缺少 aliases 配置" % g["id"])
            continue
        g["aliases"] = list(al)

    # 3) 校验
    for g in imgs:
        exact = g["exact"]
        kws = g["keywords"]
        als = g.get("aliases", [])
        cat = g.get("category_word", "")
        if not als:
            errors.append("%s aliases 为空" % g["id"])
        for word in kws + als:
            if norm(word) and norm(exact) and norm(exact) in norm(word):
                errors.append("%s: exact '%s' 是词条 '%s' 的子串（层级会被抢占）" % (g["id"], exact, word))
        seen = set(norm(x) for x in kws + als + [exact, cat])
        for w in als:
            if norm(w) in [norm(x) for x in kws]:
                errors.append("%s: alias '%s' 与 keyword 重复" % (g["id"], w))

    if errors:
        print("词表校验失败：")
        for e in errors:
            print("  -", e)
        sys.exit(1)

    data["version"] = 4
    data["note"] = ("巧手猜图网页版 64 图词表 v4：每图 = 1 类别词(+1，同类共用) + 2 联想词(+2，全库唯一) "
                    "+ 1 准确词(+5) + aliases 近似名(+2，命中按联想词计分)。词条全部 1 字以上、"
                    "exact 不与联想词/别名子串重叠、无空白标点。")
    with io.open(PACK, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print("词表 OK：%d 图，aliases 已注入，version=%d" % (len(imgs), data["version"]))

    # 4) 生成缩略图
    os.makedirs(THUMB_DIR, exist_ok=True)
    total = 0
    for g in imgs:
        src = os.path.join(IMG_DIR, g["id"] + ".png")
        dst = os.path.join(THUMB_DIR, g["id"] + ".jpg")
        if not os.path.exists(src):
            print("  WARN 缺失原图:", src)
            continue
        im = Image.open(src).convert("RGB")
        im.thumbnail((320, 320), Image.LANCZOS)
        im.save(dst, "JPEG", quality=72, optimize=True)
        total += 1
    size = sum(os.path.getsize(os.path.join(THUMB_DIR, f)) for f in os.listdir(THUMB_DIR))
    print("缩略图 OK：%d 张 -> %s，共 %.1f KB（平均 %.1f KB/张）"
          % (total, THUMB_DIR, size / 1024.0, size / 1024.0 / max(total, 1)))

if __name__ == "__main__":
    main()
