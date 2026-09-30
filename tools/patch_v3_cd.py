# -*- coding: utf-8 -*-
import io
f = r"E:\巧手猜图游戏\pictures-web-game\巧手猜图-Demo.html"
t = io.open(f, encoding="utf-8").read()
a = t

# 冷却 interval 500 → 100
old1 = "},500);\n  }\n  window.__pwCooldownMsg"
new1 = "},100);\n  }\n  window.__pwCooldownMsg"
assert old1 in t, "interval anchor not found"
t = t.replace(old1, new1, 1)

# 自检等待 160 → 450
old2 = "await sleep(160);\n    rec(\"冷却结束墙解锁\""
new2 = "await sleep(450);\n    rec(\"冷却结束墙解锁\""
assert old2 in t, "test wait anchor not found"
t = t.replace(old2, new2, 1)

io.open(f, "w", encoding="utf-8", newline="").write(t)
print("patched:", t != a)
