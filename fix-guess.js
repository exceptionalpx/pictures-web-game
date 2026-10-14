const fs = require("fs");
const p = "E:/巧手猜图游戏/pictures-web-game/xhs-dist/assets/app.js";
let js = fs.readFileSync(p, "utf8");

// 1. 找到局部 loadPack（在 renderPuzzleEditor 内部）
// 原结构：let PACK_DATA=null; async function loadPack(){ if(!PACK_DATA){ PACK_DATA={...大JSON...}; } return PACK_DATA; }
const startMarker = "let PACK_DATA=null; async function loadPack(){ if(!PACK_DATA){ PACK_DATA={";
const si = js.indexOf(startMarker);
if (si < 0) { console.error("找不到局部 loadPack"); process.exit(1); }
// 找到对应的结束：}; } return PACK_DATA; }
const endMarker = "}; } return PACK_DATA; }";
const ei = js.indexOf(endMarker, si);
if (ei < 0) { console.error("找不到 loadPack 结尾"); process.exit(1); }
const blockEnd = ei + endMarker.length;
const jsonBlock = js.substring(si, blockEnd);
console.log("局部 loadPack 块长度:", jsonBlock.length);

// 2. 从局部删除
js = js.substring(0, si) + js.substring(blockEnd);

// 3. 在 __XHS__ 行后注入全局 loadPack（去掉 let 局部声明，保留 function）
const xhsLine = 'window.__XHS__ = true; // 小红书小工具离线模式';
const globalLoad = xhsLine + "\n" +
  "let PACK_DATA=null; " +
  // jsonBlock 是 "let PACK_DATA=null; async function loadPack(){ if(!PACK_DATA){ PACK_DATA={...}; } return PACK_DATA; }"
  // 把开头的 "let PACK_DATA=null; " 去掉（因为已经有了），保留 async function loadPack(){...}
  jsonBlock.replace(/^let PACK_DATA=null; /, "");
js = js.replace(xhsLine, globalLoad);

// 4. 隐藏"对局收藏"tab（__XHS__ 时）
// 找到 ml-games 按钮渲染处，加 __XHS__ 条件
// 原代码：card.querySelector("#ml-games").onclick=...
// 在 switchTab 附近，__XHS__ 时隐藏 games 按钮
const hideGames = `
  if(window.__XHS__){
    const gb=card.querySelector("#ml-games"); if(gb) gb.style.display="none";
    const cap=card.querySelector("#ml-cap");
  }`;
// 在 card.querySelector("#ml-mine").onclick 之前插入
const mineOnclick = 'card.querySelector("#ml-mine").onclick';
js = js.replace(mineOnclick, hideGames + "\n  " + mineOnclick);

fs.writeFileSync(p, js, "utf8");
console.log("写入完成，长度:", js.length);
