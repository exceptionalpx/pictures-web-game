# -*- coding: utf-8 -*-
"""修复出题人计时初始显示"""
import io
f = r"E:\巧手猜图游戏\pictures-web-game\巧手猜图-Demo.html"
t = io.open(f, encoding="utf-8").read()

# 1. 模板占位
old = '    <span class="timer" id="timer">2:30</span>'
new = '    <span class="timer" id="timer">${onlineMode?"--:--":"2:30"}</span>'
assert old in t, "模板 timer 锚点缺失"
t = t.replace(old, new, 1)

# 2. 渲染后立即按 deadline 设置
old2 = '  const timerEl=wrap.querySelector("#timer");'
new2 = '  const timerEl=wrap.querySelector("#timer");\n  if(onlineMode){ const l=Math.max(0,Math.ceil((__PW.deadline-Date.now())/1000)); timerEl.textContent=`${Math.floor(l/60)}:${String(l%60).padStart(2,"0")}`; }'
assert old2 in t, "timerEl 锚点缺失"
t = t.replace(old2, new2, 1)

# 3. guess 视图解锁时刻每次计算
old3 = "  const unlockAt=__PW.deadline-(__PW.createSeconds-__PW.lockSeconds)*1000;"
new3 = "  const unlockAt=()=>__PW.deadline-(__PW.createSeconds-__PW.lockSeconds)*1000;"
assert old3 in t, "unlockAt 锚点缺失"
t = t.replace(old3, new3, 1)

old4 = "    if(locked && Date.now()>=unlockAt){"
new4 = "    if(locked && Date.now()>=unlockAt()){"
assert old4 in t, "unlockAt 使用锚点缺失"
t = t.replace(old4, new4, 1)

io.open(f, "w", encoding="utf-8", newline="").write(t)
print("OK")
