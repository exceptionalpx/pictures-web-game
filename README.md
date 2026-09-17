# pictures-web-game

巧手猜图网页版：把《巧手猜图》桌游做成可直接在浏览器玩的网页游戏。单文件零依赖 Demo + Node WebSocket 联机对战。

## 玩法

- **单机 Demo**：打开 `巧手猜图-Demo.html` 即可玩。两种模式：单人出题 / 本地试玩（创作 → 猜 3 幅示范作品 → 揭晓计分）。`#/selftest` 内置 14 项自检。
- **联机对战**（2–6 人）：一人拼剪影（90 秒，前 30 秒作答锁定），其他人实时观看画布并抢答；首个猜对 +3、其余 +1、出题人被猜中 +1；轮流出题，总分最高者胜。目标在服务端保密，抓包拿不到。

## 本地运行联机

```bash
npm install
node server.js        # 监听 4000 端口
# 浏览器打开 http://localhost:4000/巧手猜图-Demo.html → 首页「联机对战」
```

`npm test` 运行后端测试（13 项：房间状态机、计分、锁定、轮换、目标保密、重连、倒计时自动揭晓，含真实 WebSocket 端到端）。前端联机 UI 自检：打开页面 `#/onlinetest`（22 项）。

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

- C→S：`create{nickname}` / `join{room_id,nickname}` / `rejoin{room_id,pid}` / `start{}` / `canvas{els}` / `guess{cell}` / `next{}` / `ping{}`
- S→C：`created` / `joined` / `player_joined` / `round_start`（含 deadline、drawer，`target` 仅出题人可见）/ `canvas{els,ver}` / `guess_ok` / `guess_status{answered,total}`（不含对错）/ `reveal` / `game_over` / `error` / `pong`
