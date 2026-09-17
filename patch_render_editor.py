# -*- coding: utf-8 -*-
"""renderEditor 联机分支改造（幂等：只替换未替换过的目标）"""
import io, sys

f = r"E:\巧手猜图游戏\pictures-web-game\巧手猜图-Demo.html"
t = io.open(f, encoding="utf-8").read()
orig = t

def rep(old, new, tag):
    global t
    if old in t:
        t = t.replace(old, new, 1)
        print(tag + ": OK")
    else:
        print(tag + ": NOT_FOUND (跳过)")

# 1. submit 按钮：online 模式不绑定 finishCreate
rep(
    'wrap.querySelector("#submit").onclick=()=>finishCreate(state);',
    'if(onlineMode){ const sb=wrap.querySelector("#submit"); sb.textContent="等待揭晓…"; sb.disabled=true; }else{ wrap.querySelector("#submit").onclick=()=>finishCreate(state); }',
    "submit 按钮"
)

# 2. timer interval：online 用服务端 deadline
rep(
    "timerId=setInterval(()=>{\n    if(state.finished){clearInterval(timerId);return;}\n    if(!state.practice){",
    "timerId=setInterval(()=>{\n    if(state.finished){clearInterval(timerId);return;}\n    if(onlineMode){\n      const left=Math.max(0,Math.ceil((__PW.deadline-Date.now())/1000));\n      const mm=Math.floor(left/60),ss=left%60;\n      timerEl.textContent=`${mm}:${String(ss).padStart(2,\"0\")}`;\n      timerEl.classList.toggle(\"urgent\",left<=15);\n      return;\n    }\n    if(!state.practice){",
    "timer deadline"
)

# 3. draw 函数前加节流发送
rep(
    "  /* ---------- SVG 绘制与交互 ---------- */\n  const NS=\"http://www.w3.org/2000/svg\";\n  function draw(){\n    renderArtwork(svg,state.els);",
    "  /* ---------- SVG 绘制与交互 ---------- */\n  const NS=\"http://www.w3.org/2000/svg\";\n  let canvasTimer=null;\n  function scheduleCanvas(){ if(canvasTimer)return; canvasTimer=setTimeout(()=>{canvasTimer=null; __PW.send({t:\"canvas\",els:state.els});},200); }\n  function draw(){\n    renderArtwork(svg,state.els);",
    "scheduleCanvas 定义"
)

# 4. draw 函数末尾发送（放在选中框渲染之后、函数闭合前）
rep(
    "      svg.appendChild(g);\n    }\n  }\n\n  function pt(ev){",
    "      svg.appendChild(g);\n    }\n    if(onlineMode) scheduleCanvas();\n  }\n\n  function pt(ev){",
    "draw 末尾发送"
)

io.open(f, "w", encoding="utf-8", newline="").write(t)
print("改动完成，文件字节:", len(t), "->", len(orig) if orig else 0)
