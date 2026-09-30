# -*- coding: utf-8 -*-
import json
d = json.load(open(r"E:\巧手猜图游戏\pictures-web-game\image-pack-64.json", encoding="utf-8"))
for im in d["images"]:
    print(im["id"] + " | " + im["en_prompt"])
