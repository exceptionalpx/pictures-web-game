# pictures-web-game

巧手猜图网页版：把《巧手猜图》桌游做成可直接在浏览器玩的网页游戏。单文件零依赖 Demo + Node WebSocket 联机对战。

## 玩法

- **单机 Demo**：打开 `巧手猜图-Demo.html` 即可玩。两种模式：单人出题 / 本地试玩（创作 → 猜 3 幅示范作品 → 揭晓计分）。`#/selftest` 内置 14 项自检。
- **联机对战**（2–6 人）：一人拼剪影（90 秒），其他人实时观看画布；**前 30 秒锁定窗口内可无限次文字竞猜**（命中目标图答案词 +2，重复命中不叠加），解锁后**点选照片作答（最多 2 次）**：第 1 次猜中首答 +3 / 后答 +1 并锁定，第 1 次猜错剩 1 次机会，第 2 次无论对错锁定，全错 0 分；文字命中可与选图分叠加。出题人按被猜中人数（文字 ∪ 选图去重）每人 +1；轮流出题，总分最高者胜。目标在服务端保密，抓包拿不到。
- **在线房间列表**：联机入口新增「在线房间 · 点击加入」，3 秒刷新，只列出等待中且未满的房间，点击直接加入（与房间码/分享链接互补）。

## 本地运行联机

```bash
npm install
node server.js        # 监听 4000 端口
# 浏览器打开 http://localhost:4000/巧手猜图-Demo.html → 首页「联机对战」
```

`npm test` 运行后端测试（17 项：房间状态机、文字竞猜词表、2 次选图、计分叠加、锁定、轮换、目标保密、重连、倒计时自动揭晓、房间列表，含真实 WebSocket 端到端）。前端联机 UI 自检：打开页面 `#/onlinetest`（32 项）。

## 部署到线上（Render 免费层）

1. 把仓库推送到 GitHub。
2. Render 新建 **Web Service**，连接仓库。
3. Build Command：`npm install`；Start Command：`node server.js`。
4. 端口使用环境变量 `PORT`（server.js 已支持），无需额外配置。
5. 部署后，首页「联机对战」会自动使用同源 `wss://` 连接，手机/电脑都可直接玩。

## 技术结构

- `巧手猜图-Demo.html`：单文件前端（首页 / 编辑器 / 猜题 / 揭晓 / 自检 / 联机页）。
- `server.js`：Node + express + ws 单服务。房间状态机（Room/RoomManager）、WS 协议（`/ws`）、心跳与 60s 断线重连保留、目标保密分发。
- `test.js`：后端测试（`node --test --test-force-exit`，Windows 下 ws 残留句柄需 force-exit）。
- `patch_*.py`：前端联机改造的可复现补丁脚本（开发过程留档）。

## 联机 WS 协议速览

- C→S：`create{nickname}` / `join{room_id,nickname}` / `rejoin{room_id,pid}` / `start{}` / `canvas{els}` / `guess{cell}` / `word{text}`（锁定窗口内文字竞猜）/ `list{}`（在线房间列表）/ `next{}` / `ping{}`
- S→C：`created` / `joined` / `player_joined` / `round_start`（含 deadline、drawer，`target` 仅出题人可见）/ `canvas{els,ver}` / `guess_ok{correct,first,done,attempts,maxAttempts}` / `guess_status{answered,total}`（已锁定作答人数，不含对错）/ `word_res{correct,repeat}`（仅发送者）/ `word_hit{pid,nickname}`（广播，不含答案词）/ `list{rooms:[{room_id,host,players,max}]}`（只列等待中且未满）/ `reveal`（results 含 wordHit / hitCount / first / attempts）/ `game_over` / `error` / `pong`
- 文字命中判定：玩家文本归一化后包含**当前目标图**对应词表的任一答案词（32 图词表 `WORD_BANK`，2 字以上词），词对但图错不命中。
