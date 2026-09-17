"use strict";
/**
 * 巧手猜图 · 联机最小闭环服务端（规则集 pictures-web-online-v1）
 *
 * 规则（服务端权威，与设计讨论定稿一致）：
 *  - 房间 2–6 人；房主开始后按加入顺序轮换出题
 *  - 出题人作画 90 秒；前 30 秒作答锁定（只能看画布）
 *  - 每人每轮 1 次作答机会，提交即锁定
 *  - 计分：首个猜对 +3（基础 1 + 抢先奖励 2）、其余猜对 +1、猜错 0
 *         出题人按每有 1 人猜中自己 +1
 *  - 揭晓：全部作答完成则提前揭晓，否则倒计时结束揭晓
 *  - 目标保密：target 只在服务端→出题人连接上出现
 *  - 断线 60 秒内房间与画布保留，重连（room_id + pid）恢复
 */
const path = require("path");
const http = require("http");
const express = require("express");
const { WebSocketServer } = require("ws");

/* ================= 权威参数（服务端，前端只读展示） ================= */
const ONLINE = {
  ruleset_id: "pictures-web-online-v1",
  createSeconds: 90,          // 每轮作画倒计时
  lockSeconds: 30,            // 作画开始后前 N 秒作答锁定
  elementCap: 60,             // 画布元素上限（与 Demo 一致）
  minPlayers: 2,
  maxPlayers: 6,
  keepAliveMs: 60000,         // 断线保留房间时长
  baseCorrect: 1,             // 猜对基础分
  firstBonus: 2               // 首个猜对额外奖励
};

const PHOTO_POOL = ["🎈","🏠","🐟","🌵","☂️","🚲","⛵","🍕","🎸","🌋","🎪","🚀","🐘","🌮","🗼","🌻","🍎","🚗","⚽","🎂","🌈","⌛","🔔","🎃","🎁","📷","✂️","🔑","🧸","🦋","🐧","🍦"];
const STAGE = 480;

function shuffle(a){ a = a.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
function coordLabel(i){ return "ABCD"[Math.floor(i/4)] + ((i%4)+1); }
function genId(){ return "p" + Math.random().toString(36).slice(2,8); }
function genRoom(){ return Math.random().toString(36).slice(2,6).toUpperCase(); }
function sec(ms){ return Math.floor(ms/1000); }

/* ================= 房间核心逻辑（纯逻辑，无网络依赖，可测） ================= */
class Room {
  constructor(roomId, opts = {}){
    this.id = roomId;
    this.opts = {
      lockMs: opts.lockMs ?? ONLINE.lockSeconds*1000,
      createMs: opts.createMs ?? ONLINE.createSeconds*1000
    };
    this.status = "lobby";            // lobby | playing | round_end | game_over
    this.round = 0;
    this.maxRounds = 0;               // 开局后 = 人数（每人出题一轮）
    this.players = [];                // {pid,nickname,score,connected,guessed}
    this.drawerIdx = -1;
    this.wall = shuffle(PHOTO_POOL).slice(0,16);
    this.target = -1;                 // 服务端权威秘密目标
    this.canvas = { els: [], ver: 0 };
    this.roundStart = 0;
    this.deadline = 0;
    this.lastActive = Date.now();
    this._revealTimer = null;
    this.onReveal = null;   // 网络层注入：揭晓（手动或倒计时触发）后广播
  }
  touch(){ this.lastActive = Date.now(); }

  dispose(){ clearTimeout(this._revealTimer); this._revealTimer = null; }

  addPlayer(nickname){
    if(this.status !== "lobby") return { err: "game_started", msg: "游戏已开始，无法再加入" };
    if(this.players.length >= ONLINE.maxPlayers) return { err: "room_full", msg: "房间已满" };
    nickname = (nickname||"").toString().trim().slice(0,12) || ("玩家" + (this.players.length+1));
    const pid = genId();
    this.players.push({ pid, nickname, score: 0, connected: true, guessed: null });
    this.touch();
    return { pid };
  }

  removePlayer(pid){
    const i = this.players.findIndex(p => p.pid === pid);
    if(i < 0) return;
    this.players[i].connected = false;
    this.touch();
  }

  findPlayer(pid){ return this.players.find(p => p.pid === pid); }

  drawer(){ return this.players[this.drawerIdx] || null; }
  guessers(){ return this.players.filter((_,i) => i !== this.drawerIdx); }
  answeredCount(){ return this.guessers().filter(p => p.guessed).length; }
  allAnswered(){ return this.guessers().length > 0 && this.answeredCount() === this.guessers().length; }

  canStart(){ return this.status === "lobby" && this.players.length >= ONLINE.minPlayers; }

  startRound(){
    if(this.round >= this.maxRounds) return { err: "game_over" };
    this.round++;
    this.drawerIdx = (this.round - 1) % this.players.length;
    this.target = Math.floor(Math.random()*16);
    this.canvas = { els: [], ver: 0 };
    this.players.forEach(p => { p.guessed = null; });
    this.roundStart = Date.now();
    this.deadline = this.roundStart + this.opts.createMs;
    this.status = "playing";
    const self = this;
    clearTimeout(this._revealTimer);
    this._revealTimer = setTimeout(() => { if(self.status === "playing") self.reveal(); }, this.opts.createMs);
    this.touch();
    return { ok: true };
  }

  /** 出题人更新画布；仅出题人、元素数合法时生效 */
  setCanvas(pid, els){
    const d = this.drawer();
    if(this.status !== "playing" || !d || d.pid !== pid) return { err: "not_drawer" };
    if(!Array.isArray(els) || els.length > ONLINE.elementCap) return { err: "invalid" };
    this.canvas = { els, ver: this.canvas.ver + 1 };
    this.touch();
    return { ok: true, ver: this.canvas.ver };
  }

  /** 猜题人作答；锁定窗口拒绝、每人每轮 1 次 */
  submitGuess(pid, cell){
    if(this.status !== "playing") return { err: "not_playing" };
    const d = this.drawer();
    if(!d || d.pid === pid) return { err: "not_guesser", msg: "你是出题人，不能作答" };
    const p = this.findPlayer(pid);
    if(!p) return { err: "no_player" };
    if(p.guessed) return { err: "already_guessed", msg: "本轮已作答" };
    if(Date.now() < this.roundStart + this.opts.lockMs) return { err: "locked", msg: `作答尚未解锁（前 ${ONLINE.lockSeconds} 秒只能看）` };
    if(!Number.isInteger(cell) || cell < 0 || cell > 15) return { err: "invalid" };
    const correct = cell === this.target;
    p.guessed = { cell, correct, first: false, at: Date.now() };
    if(correct){
      const firstCorrect = !this.guessers().some(g => g.guessed && g.guessed.correct && g.pid !== pid);
      p.guessed.first = firstCorrect;
    }
    this.touch();
    return { ok: true, correct, first: !!p.guessed.first, answered: this.answeredCount(), total: this.guessers().length };
  }

  /** 结算本轮：猜题人 +1（首答对再 +2）；出题人按猜中人数 +1 */
  reveal(){
    if(this.status !== "playing") return null;
    clearTimeout(this._revealTimer);
    const d = this.drawer();
    const results = this.players.map(p => {
      if(p.pid === d.pid){
        const hitCount = this.guessers().filter(g => g.guessed && g.guessed.correct).length;
        const pts = hitCount * ONLINE.baseCorrect;
        p.score += pts;
        return { pid: p.pid, nickname: p.nickname, role: "drawer", guessed: null, correct: null, points: pts, hitCount };
      }
      let pts = 0;
      if(p.guessed && p.guessed.correct){ pts = ONLINE.baseCorrect + (p.guessed.first ? ONLINE.firstBonus : 0); }
      p.score += pts;
      return { pid: p.pid, nickname: p.nickname, role: "guesser", guessed: p.guessed ? p.guessed.cell : null, correct: p.guessed ? p.guessed.correct : null, first: p.guessed ? p.guessed.first : false, points: pts };
    });
    const scores = Object.fromEntries(this.players.map(p => [p.pid, p.score]));
    const isLast = this.round >= this.maxRounds;
    this.status = isLast ? "game_over" : "round_end";
    this.touch();
    const rev = {
      state: this.status,
      round: this.round,
      answer: this.target,
      answerLabel: coordLabel(this.target) + " " + this.wall[this.target],
      drawer: { pid: d.pid, nickname: d.nickname },
      results,
      scores,
      isLast
    };
    if(this.onReveal) this.onReveal(rev);
    return rev;
  }

  /** 进入下一轮（揭晓后）或结算整局 */
  nextRound(){
    if(this.status === "game_over"){
      const scores = Object.fromEntries(this.players.map(p => [p.pid, p.score]));
      const sorted = [...this.players].sort((a,b) => b.score - a.score);
      const winner = sorted[0];
      return { state: "game_over", scores, winner: { pid: winner.pid, nickname: winner.nickname, score: winner.score } };
    }
    if(this.status === "round_end"){
      const r = this.startRound();
      return { state: "playing", round: this.round, ...r };
    }
    return { err: "not_revealed" };
  }

  /** 该玩家视角的全量状态；target 只给出题人 */
  snapshotFor(pid){
    const d = this.drawer();
    const isDrawer = d && d.pid === pid;
    const s = {
      id: this.id,
      status: this.status,
      round: this.round,
      maxRounds: this.maxRounds,
      players: this.players.map(p => ({ pid: p.pid, nickname: p.nickname, score: p.score, connected: p.connected, guessed: p.guessed })),
      drawerIdx: this.drawerIdx,
      wall: this.wall,
      canvas: this.canvas,
      roundStart: this.roundStart,
      deadline: this.deadline,
      createSeconds: ONLINE.createSeconds,
      lockSeconds: ONLINE.lockSeconds,
      target: isDrawer ? this.target : undefined
    };
    return s;
  }
}

class RoomManager {
  constructor(roomOpts = {}){
    this.rooms = new Map();
    this.roomOpts = roomOpts;   // 测试注入 {lockMs, createMs}
  }
  create(nickname){
    const room = new Room(genRoom(), this.roomOpts);
    const r = room.addPlayer(nickname);
    if(r.err) return r;
    this.rooms.set(room.id, room);
    return { room, pid: r.pid };
  }
  join(roomId, nickname){
    const room = this.rooms.get(String(roomId||"").toUpperCase());
    if(!room) return { err: "not_found", msg: "房间不存在" };
    const r = room.addPlayer(nickname);
    if(r.err) return r;
    return { room, pid: r.pid };
  }
  rejoin(roomId, pid){
    const room = this.rooms.get(String(roomId||"").toUpperCase());
    if(!room) return { err: "not_found", msg: "房间不存在" };
    const p = room.findPlayer(pid);
    if(!p) return { err: "not_found", msg: "身份已失效" };
    p.connected = true;
    return { room, pid };
  }
  cleanup(now = Date.now()){
    for(const [id, room] of this.rooms){
      const alive = room.players.some(p => p.connected);
      if(!alive && now - room.lastActive > ONLINE.keepAliveMs){
        room.dispose();
        this.rooms.delete(id);
      }
    }
  }
  disposeAll(){
    for(const room of this.rooms.values()) room.dispose();
    this.rooms.clear();
  }
}

/* ================= 网络层 ================= */
function startServer(port = process.env.PORT || 4000, roomOpts = {}){
  const app = express();
  app.use(express.static(path.join(__dirname, ".")));
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: "/ws" });
  const manager = new RoomManager(roomOpts);

  wss.on("connection", (ws) => {
    let ctx = null; // {room, pid}
    ws.isAlive = true;
    ws.on("pong", () => { ws.isAlive = true; });

    const send = (obj) => { if(ws.readyState === ws.OPEN) ws.send(JSON.stringify(obj)); };
    const broadcast = (room, obj, exceptPid) => {
      for(const c of wss.clients){
        if(c.ctx && c.ctx.room === room && (!exceptPid || c.ctx.pid !== exceptPid)) c.send(JSON.stringify(obj));
      }
    };

    ws.on("message", (raw) => {
      let m; try{ m = JSON.parse(raw); }catch(e){ return; }
      const t = m.t;

      if(t === "create"){
        const r = manager.create(m.nickname);
        if(r.err){ return send({ t:"error", err: r.err, msg: r.msg }); }
        ctx = { room: r.room, pid: r.pid };
        ws.ctx = ctx;
        ctx.room.onReveal = (rev) => broadcast(ctx.room, { t:"reveal", ...rev });
        return send({ t:"created", room_id: r.room.id, pid: r.pid, nickname: r.room.players[0].nickname, players: r.room.players, wall: r.room.wall, rules: ONLINE });
      }
      if(t === "join"){
        const r = manager.join(m.room_id, m.nickname);
        if(r.err){ return send({ t:"error", err: r.err, msg: r.msg }); }
        ctx = { room: r.room, pid: r.pid };
        ws.ctx = ctx;
        ctx.room.onReveal = (rev) => broadcast(ctx.room, { t:"reveal", ...rev });
        send({ t:"joined", room_id: r.room.id, pid: r.pid, ...r.room.snapshotFor(r.pid), rules: ONLINE });
        return broadcast(r.room, { t:"player_joined", pid: r.pid, players: r.room.players.map(p => ({pid:p.pid,nickname:p.nickname,connected:p.connected})) }, r.pid);
      }
      if(t === "rejoin"){
        const r = manager.rejoin(m.room_id, m.pid);
        if(r.err){ return send({ t:"error", err: r.err, msg: r.msg }); }
        ctx = { room: r.room, pid: r.pid };
        ws.ctx = ctx;
        ctx.room.onReveal = (rev) => broadcast(ctx.room, { t:"reveal", ...rev });
        send({ t:"joined", room_id: r.room.id, pid: r.pid, ...r.room.snapshotFor(r.pid), rules: ONLINE });
        return broadcast(r.room, { t:"player_joined", pid: r.pid, players: r.room.players.map(p => ({pid:p.pid,nickname:p.nickname,connected:p.connected})) }, r.pid);
      }
      if(!ctx) return;

      const { room, pid } = ctx;

      if(t === "start"){
        if(!room.canStart()) return send({ t:"error", err:"not_ready", msg:"至少 2 人才能开始" });
        if(room.players[0].pid !== pid) return send({ t:"error", err:"not_host", msg:"只有房主可以开始" });
        room.maxRounds = room.players.length;
        const r = room.startRound();
        if(r.err) return send({ t:"error", err:r.err, msg:r.msg });
        for(const c of wss.clients){
          if(c.ctx && c.ctx.room === room){
            const isDrawer = room.drawer().pid === c.ctx.pid;
            const snap = room.snapshotFor(c.ctx.pid);
            c.send(JSON.stringify({ t:"round_start", state:"playing", round: room.round, drawer: { pid: room.drawer().pid, nickname: room.drawer().nickname }, deadline: room.deadline, lockSeconds: ONLINE.lockSeconds, createSeconds: ONLINE.createSeconds, target: snap.target }));
          }
        }
        return;
      }
      if(t === "canvas"){
        const r = room.setCanvas(pid, m.els);
        if(r.ok) broadcast(room, { t:"canvas", els: m.els, ver: r.ver }, pid);
        return;
      }
      if(t === "guess"){
        const r = room.submitGuess(pid, m.cell);
        if(r.err){ return send({ t:"error", err:r.err, msg:r.msg }); }
        send({ t:"guess_ok", correct: r.correct, first: r.first, answered: r.answered, total: r.total });
        broadcast(room, { t:"guess_status", answered: r.answered, total: r.total }, pid);   // 提示"有人已作答"，不含对错
        if(room.allAnswered()) room.reveal();   // 自动揭晓（onReveal 广播）
        return;
      }
      if(t === "next"){
        const r = room.nextRound();
        if(r.err) return send({ t:"error", err:r.err, msg:r.msg });
        if(r.state === "game_over"){
          return broadcast(room, { t:"game_over", scores: r.scores, winner: r.winner });
        }
        for(const c of wss.clients){
          if(c.ctx && c.ctx.room === room){
            const snap = room.snapshotFor(c.ctx.pid);
            c.send(JSON.stringify({ t:"round_start", state:"playing", round: room.round, drawer: { pid: room.drawer().pid, nickname: room.drawer().nickname }, deadline: room.deadline, lockSeconds: ONLINE.lockSeconds, createSeconds: ONLINE.createSeconds, target: snap.target }));
          }
        }
        return;
      }
      if(t === "ping"){ return send({ t:"pong" }); }
    });

    ws.on("close", () => {
      if(ctx){ ctx.room.removePlayer(ctx.pid); }
    });
  });

  // 心跳保活 + 断线清理
  const hb = setInterval(() => {
    for(const ws of wss.clients){
      if(!ws.isAlive){ ws.terminate(); continue; }
      ws.isAlive = false;
      ws.ping();
    }
    manager.cleanup();
  }, 30000);
  server.on("close", () => clearInterval(hb));

  let resolveReady;
  const ready = new Promise(r => { resolveReady = r; });
  server.listen(port, () => {
    resolveReady();
    if(require.main === module){
      console.log(`[pictures-web] 服务已启动: http://localhost:${port}  (ws://localhost:${port}/ws)`);
      console.log(`[pictures-web] 前端入口: http://localhost:${port}/巧手猜图-Demo.html`);
    }
  });
  return { app, server, wss, manager, ready };
}

module.exports = { ONLINE, PHOTO_POOL, STAGE, Room, RoomManager, startServer };

if(require.main === module){ startServer(); }
