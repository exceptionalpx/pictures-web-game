const fs = require("fs");
const p = "E:/巧手猜图游戏/pictures-web-game/xhs-dist/assets/app.js";
let js = fs.readFileSync(p, "utf8");

// 1. capEl.textContent 在 __XHS__ 时不显示对局收藏
js = js.replace(
  "capEl.textContent=`本机存储 · 我的图库 ${mine.length} 张 · 对局收藏 ${games.length} 张${t}`;",
  "capEl.textContent = window.__XHS__ ? `本机存储 · 我的图库 ${mine.length} 张${t}` : `本机存储 · 我的图库 ${mine.length} 张 · 对局收藏 ${games.length} 张${t}`;"
);

// 2. 默认 tab 在 __XHS__ 时切到 mine（找到 switchTab 初始化调用）
// 原代码末尾应该有 switchTab("games") 或 switchTab("mine") 初始化
// 在 __XHS__ 隐藏块后，强制切到 mine
js = js.replace(
  `if(window.__XHS__){
    const gb=card.querySelector("#ml-games"); if(gb) gb.style.display="none";
    const cap=card.querySelector("#ml-cap");
  }`,
  `if(window.__XHS__){
    const gb=card.querySelector("#ml-games"); if(gb) gb.style.display="none";
    const cap=card.querySelector("#ml-cap");
    // 离线版强制默认 mine tab
    const _origSwitch = switchTab;
    switchTab = function(t){ if(window.__XHS__ && t==="games") t="mine"; _origSwitch(t); };
  }`
);

fs.writeFileSync(p, js, "utf8");
console.log("done, length:", js.length);
