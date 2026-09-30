# -*- coding: utf-8 -*-
"""下载 64 张写实照片 → images-64-photo/，按类拼 4×2 预览图 + 中文主题标注"""
import io, json, os, urllib.request

BASE = r"E:\巧手猜图游戏\pictures-web-game"
IMG = os.path.join(BASE, "images-64-photo")
PRE = os.path.join(IMG, "preview")
os.makedirs(PRE, exist_ok=True)

URLS = {
 "动物": ["https://aka.doubaocdn.com/s/Hcqn9c3Zbv","https://aka.doubaocdn.com/s/55qy2cOYiV","https://aka.doubaocdn.com/s/DjN5Dsv1UT","https://aka.doubaocdn.com/s/Uzk6cQC9GI","https://aka.doubaocdn.com/s/2uvbWURkg7","https://aka.doubaocdn.com/s/z8xwWc35Ir","https://aka.doubaocdn.com/s/rlUJfdLTDp","https://aka.doubaocdn.com/s/Bs2hY5rTbV"],
 "食物": ["https://aka.doubaocdn.com/s/2NvqLxe6O3","https://aka.doubaocdn.com/s/uGaVTnwYtj","https://aka.doubaocdn.com/s/1EPrtg4wYX","https://aka.doubaocdn.com/s/mMVF2H5XSJ","https://aka.doubaocdn.com/s/23aPziUfYB","https://aka.doubaocdn.com/s/BjsVArHTgB","https://aka.doubaocdn.com/s/VCRgGvbJyz","https://aka.doubaocdn.com/s/XE0a64f9za"],
 "交通工具": ["https://aka.doubaocdn.com/s/2TEi37MMbf","https://aka.doubaocdn.com/s/bpuhAdlHf2","https://aka.doubaocdn.com/s/SfKEd15u7A","https://aka.doubaocdn.com/s/dUv55Em828","https://aka.doubaocdn.com/s/NCrVPiUCXV","https://aka.doubaocdn.com/s/VBsD7Un32p","https://aka.doubaocdn.com/s/4QHum4aZgz","https://aka.doubaocdn.com/s/I7iPSUpSTF"],
 "地标建筑": ["https://aka.doubaocdn.com/s/zgCGZc8sQ7","https://aka.doubaocdn.com/s/FYB4dyUbq4","https://aka.doubaocdn.com/s/ecUZxi44PY","https://aka.doubaocdn.com/s/wICsdGmybe","https://aka.doubaocdn.com/s/heLLcjoZsm","https://aka.doubaocdn.com/s/swNEFSWs8S","https://aka.doubaocdn.com/s/o9QLZUNZHX","https://aka.doubaocdn.com/s/M9thUQ3x4l"],
 "职业": ["https://aka.doubaocdn.com/s/flFY3u5vAr","https://aka.doubaocdn.com/s/24VxjIO0Yb","https://aka.doubaocdn.com/s/16HKk4SFU7","https://aka.doubaocdn.com/s/hggVkUzxYU","https://aka.doubaocdn.com/s/TLBHyQ3inF","https://aka.doubaocdn.com/s/NQvYcIfzwg","https://aka.doubaocdn.com/s/My8w6vQk2S","https://aka.doubaocdn.com/s/DnQkYYOOVm"],
 "自然现象": ["https://aka.doubaocdn.com/s/qVVPdKn8Dv","https://aka.doubaocdn.com/s/PV1ELrtDuN","https://aka.doubaocdn.com/s/PSFxcDbyWb","https://aka.doubaocdn.com/s/fUd7mLjQRF","https://aka.doubaocdn.com/s/zWRFmp5WxK","https://aka.doubaocdn.com/s/kiAalDm885","https://aka.doubaocdn.com/s/NQTpFpSqrL","https://aka.doubaocdn.com/s/tBUD7VGwZd"],
 "节日文化": ["https://aka.doubaocdn.com/s/C4BBev2UK9","https://aka.doubaocdn.com/s/clBEwwFI6o","https://aka.doubaocdn.com/s/yY8r3yZUik","https://aka.doubaocdn.com/s/EKfkaUydqg","https://aka.doubaocdn.com/s/JtXP9Cu00B","https://aka.doubaocdn.com/s/blAiaETEWt","https://aka.doubaocdn.com/s/tLOumT0CQU","https://aka.doubaocdn.com/s/QDBSFnsFDV"],
 "运动": ["https://aka.doubaocdn.com/s/gyHZyUo71R","https://aka.doubaocdn.com/s/66ngsO4eUk","https://aka.doubaocdn.com/s/XnOaiBLzUu","https://aka.doubaocdn.com/s/LFhy7QOyQm","https://aka.doubaocdn.com/s/e5p2q8ksDx","https://aka.doubaocdn.com/s/bOm0UTyg3r","https://aka.doubaocdn.com/s/mrj1BtaM07","https://aka.doubaocdn.com/s/C77NFtBcmX"],
}

NAMES = {
 "动物": ["大象","长颈鹿","企鹅","鲨鱼","蝴蝶","猫头鹰","乌龟","蜜蜂"],
 "食物": ["披萨","汉堡","寿司","冰淇淋","咖啡","火锅","月饼","香蕉"],
 "交通工具": ["帆船","热气球","火箭","火车","直升机","自行车","摩托车","轮船"],
 "地标建筑": ["埃菲尔铁塔","金字塔","灯塔","风车","城堡","长城","东方明珠","斗兽场"],
 "职业": ["宇航员","消防员","厨师","医生","渔民","警察","教师","画家"],
 "自然现象": ["彩虹","闪电","流星","雪山","火山","雪花","日出","星空"],
 "节日文化": ["灯笼","龙舟","舞狮","圣诞树","南瓜灯","风筝","红包","折扇"],
 "运动": ["足球","网球","射箭","高尔夫","滑雪","冲浪","棒球","滑板"],
}

def dl(url, path):
    if os.path.exists(path):
        return path
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    data = urllib.request.urlopen(req, timeout=30).read()
    with open(path, "wb") as f:
        f.write(data)
    return path

from PIL import Image, ImageDraw, ImageFont

CELL, LABEL, COLS, ROWS = 320, 44, 4, 2
W, H = COLS * CELL, ROWS * (CELL + LABEL) + 60
font = ImageFont.truetype("msyh.ttc", 26)
title_font = ImageFont.truetype("msyh.ttc", 34)

for cat, urls in URLS.items():
    names = NAMES[cat]
    canvas = Image.new("RGB", (W, H), "white")
    draw = ImageDraw.Draw(canvas)
    draw.text((12, 10), cat + " 写实照片版（类别词 +1 · 联想词 +2 · 准确词 +5）", fill="black", font=title_font)
    for i, url in enumerate(urls):
        r, c = divmod(i, COLS)
        path = dl(url, os.path.join(IMG, f"{cat}-{i+1}.png"))
        im = Image.open(path).convert("RGB").resize((CELL, CELL), Image.LANCZOS)
        x, y = c * CELL, 60 + r * (CELL + LABEL)
        canvas.paste(im, (x, y))
        draw.rectangle([x, y + CELL, x + CELL, y + CELL + LABEL], fill="black")
        draw.text((x + 12, y + CELL + 6), f"{names[i]}", fill="white", font=font)
    out = os.path.join(PRE, f"preview-{cat}.png")
    canvas.save(out)
    print("saved", out)

print("全部完成")
