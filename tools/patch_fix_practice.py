# -*- coding: utf-8 -*-
"""修复 renderEditor 对隐藏练习模式复选框的空引用"""
import io
f = r"E:\巧手猜图游戏\pictures-web-game\巧手猜图-Demo.html"
t = io.open(f, encoding="utf-8").read()
old = '  wrap.querySelector("#practice").onchange=e=>{state.practice=e.target.checked;};'
new = '  const pcEl=wrap.querySelector("#practice"); if(pcEl) pcEl.onchange=e=>{state.practice=e.target.checked;};'
assert old in t, "practice 绑定锚点缺失"
t = t.replace(old, new, 1)
io.open(f, "w", encoding="utf-8", newline="").write(t)
print("OK")
