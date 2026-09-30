# -*- coding: utf-8 -*-
"""下载 64 张生成图 → images-64/，按类拼 4×2 预览图 + 中文主题标注"""
import io, json, os, urllib.request

BASE = r"E:\巧手猜图游戏\pictures-web-game"
IMG = os.path.join(BASE, "images-64")
PRE = os.path.join(IMG, "preview")
os.makedirs(PRE, exist_ok=True)

URLS = {
 "动物": ["https://aka.doubaocdn.com/s/NvefrxYqDe","https://aka.doubaocdn.com/s/i3yIdjCfI5","https://aka.doubaocdn.com/s/qunzwONXsB","https://aka.doubaocdn.com/s/x4b6Q2FJxs","https://aka.doubaocdn.com/s/V0YEOTNhRX","https://aka.doubaocdn.com/s/XZcbJlWcfq","https://aka.doubaocdn.com/s/kPgSUeQ5ak","https://aka.doubaocdn.com/s/bSuXXXNzGy"],
 "食物": ["https://aka.doubaocdn.com/s/2NwoDZUI1j","https://aka.doubaocdn.com/s/Ldoa5aliR2","https://aka.doubaocdn.com/s/0PqtQuH3oZ","https://aka.doubaocdn.com/s/3wnegNWn0e","https://aka.doubaocdn.com/s/3m1xIf8jy5","https://aka.doubaocdn.com/s/TR6NpM04gn","https://aka.doubaocdn.com/s/1l7Q3GMUPv","https://aka.doubaocdn.com/s/YQUwpTsA5C"],
 "交通工具": ["https://aka.doubaocdn.com/s/32byKEzvfi","https://aka.doubaocdn.com/s/HH0jOFjZTV","https://aka.doubaocdn.com/s/UphyfmPtpv","https://aka.doubaocdn.com/s/EVRtyfQl7k","https://aka.doubaocdn.com/s/2fKEt6AhKe","https://aka.doubaocdn.com/s/EyV2TA3KqK","https://aka.doubaocdn.com/s/V7UUiYBQ3x","https://aka.doubaocdn.com/s/TEOSQ0cKF5"],
 "地标建筑": ["https://aka.doubaocdn.com/s/owQtgUJEoi","https://aka.doubaocdn.com/s/aVFE8UsNd4","https://aka.doubaocdn.com/s/4QRmvJ7kUV","https://aka.doubaocdn.com/s/JCB3y5xHeT","https://aka.doubaocdn.com/s/DzoGPUsoxV","https://aka.doubaocdn.com/s/APCYUO61zu","https://aka.doubaocdn.com/s/mvIvGDUA9r","https://aka.doubaocdn.com/s/ucVv2V8fzO"],
 "职业": ["https://aka.doubaocdn.com/s/UAottpNVCp","https://aka.doubaocdn.com/s/04VB5qgOs6","https://aka.doubaocdn.com/s/5GtEQDNYbp","https://aka.doubaocdn.com/s/wMUGVJib6g","https://aka.doubaocdn.com/s/uWP46R0qqM","https://aka.doubaocdn.com/s/CAf1D4C4Kj","https://aka.doubaocdn.com/s/dM8SbVaw93","https://aka.doubaocdn.com/s/CMDpOxqUmv"],
 "自然现象": ["https://aka.doubaocdn.com/s/Iz1MquWMQd","https://aka.doubaocdn.com/s/BPmaUcCVVv","https://aka.doubaocdn.com/s/aBF8k3hCBF","https://aka.doubaocdn.com/s/Vj8me3Tz4U","https://aka.doubaocdn.com/s/43lSBDO4VJ","https://aka.doubaocdn.com/s/AIlX8ypVuz","https://aka.doubaocdn.com/s/ilFXoSMqlL","https://aka.doubaocdn.com/s/SuzEMyJEMQ"],
 "节日文化": ["https://aka.doubaocdn.com/s/zQ4cFgd3wI","https://aka.doubaocdn.com/s/wLrhlJzvC1","https://aka.doubaocdn.com/s/8Xz1iwGdkD","https://aka.doubaocdn.com/s/zz78ZfmEpZ","https://aka.doubaocdn.com/s/tAJT6Y6YSr","https://aka.doubaocdn.com/s/NEdGyNYVzw","https://aka.doubaocdn.com/s/NysWrCe6FP","https://aka.doubaocdn.com/s/kAnO2dvRHB"],
 "运动": ["https://aka.doubaocdn.com/s/L78TeZ0ogH","https://aka.doubaocdn.com/s/SIt3FPir6Z","https://aka.doubaocdn.com/s/KlzJSvpTMJ","https://aka.doubaocdn.com/s/c57CflySV4","https://aka.doubaocdn.com/s/i7gKC0iAtq","https://aka.doubaocdn.com/s/SvMtniU0PH","https://aka.doubaocdn.com/s/cQdmM1Y3eu","https://aka.doubaocdn.com/s/exeVQdVvcl"],
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
    draw.text((12, 10), cat + "（类别词 +1 · 联想词 +2 · 准确词 +5）", fill="black", font=title_font)
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
