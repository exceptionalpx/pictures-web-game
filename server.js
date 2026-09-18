"use strict";
/**
 * 巧手猜图 · 联机服务端（正式版初版 · 规则集 pictures-web-online-v1）
 *
 * 规则（服务端权威，与设计讨论定稿一致）：
 *  - 房间 2–6 人；房主开始后按加入顺序轮换出题；每轮从 64 张写实照片随机抽 16 张
 *  - 出题人看目标照片（写实图）作画 90 秒；前 30 秒作答锁定（只能看画布）
 *  - 文字竞猜全程开放、不限次数：准确词 +5 / 联想词 +2 / 类别词 +1（可与选图分叠加，先中最高层级）
 *  - 解锁后选图：不限次数（猜错该格 ✗ + 10s 冷却，首答对 +3 / 后答对 +1，全错 0 分）
 *  - 出题人按"猜中人数"（文字命中 ∪ 选图对，去重）每人 +1
 *  - 揭晓：全部锁定作答完成则提前揭晓，否则倒计时结束揭晓
 *  - 目标保密：target 只在服务端→出题人连接上出现
 *  - 断线 60 秒内房间与画布保留，重连（room_id + pid）恢复
 */
const path = require("path");
const http = require("http");
const fs = require("fs");
const express = require("express");
const { WebSocketServer } = require("ws");

/* ================= 权威参数（服务端，前端只读展示） ================= */
const ONLINE = {
  ruleset_id: "pictures-web-online-v1",
  createSeconds: 90,          // 每轮作画倒计时
  lockSeconds: 30,            // 作画开始后前 N 秒作答锁定
  elementCap: 60,             // 画布元素上限
  minPlayers: 2,
  maxPlayers: 6,
  keepAliveMs: 60000,         // 断线保留房间时长
  baseCorrect: 1,             // 猜对基础分
  firstBonus: 2,              // 首个选图正确额外奖励
  wordScore: { category: 1, keyword: 2, exact: 5 },  // 文字竞猜三级计分：类别词 +1 / 联想词 +2 / 准确词 +5
  wordCap: 8,                 // 每轮每人文字命中得分封顶（类别1+联想级最多4+准确5=8）
  cooldownMs: 10000           // 选图猜错后的冷却时长（冷却内不能再选图，可继续文字竞猜）
};

const STAGE = 480;

/* ================= 64 图图库（v4-photo 写实照片版，词表来自 image-pack-64.json） ================= */
const PACK = JSON.parse(fs.readFileSync(path.join(__dirname, "image-pack-64.json"), "utf8"));
/** IMAGES: {id, category, category_word, zh, keywords[2], aliases[], exact, en_prompt, img, thumb} */
const IMAGES = PACK.images.map(g => ({ ...g, img: "/images/" + g.id + ".png", thumb: "/images-thumb/" + g.id + ".jpg" }));

function normalizeWord(s){ return (s||"").toString().toLowerCase().replace(/[\s\u3000.,!?，。！？、~～\-]/g,""); }
/**
 * 文字竞猜三级命中判定（针对一张目标图）：
 *  1. 准确词 exact 命中 → +5（最高优先级）
 *  2. 联想词 keywords 任一命中 → +2
 *  3. 类别词 category_word 命中 → +1
 * 判定 = 玩家输入归一化后包含对应词条；先中最高层级，不叠加。
 */
function matchLevel(text, img){
  const t = normalizeWord(text);
  if(!t || !img) return { hit:false };
  if(t.includes(img.exact)) return { hit:true, level:"exact", pts: ONLINE.wordScore.exact, word: img.exact };
  const kw = (img.keywords||[]).find(k => t.includes(k));
  if(kw) return { hit:true, level:"keyword", pts: ONLINE.wordScore.keyword, word: kw };
  const al = (img.aliases||[]).find(a => t.includes(a));
  if(al) return { hit:true, level:"keyword", pts: ONLINE.wordScore.keyword, word: al };
  if(img.category_word && t.includes(img.category_word)) return { hit:true, level:"category", pts: ONLINE.wordScore.category, word: img.category_word };
  return { hit:false };
}

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
      createMs: opts.createMs ?? ONLINE.createSeconds*1000,
      cooldownMs: opts.cooldownMs ?? ONLINE.cooldownMs
    };
    this.status = "lobby";            // lobby | playing | round_end | game_over
    this.round = 0;
    this.maxRounds = 0;               // 开局后 = 人数（每人出题一轮）
    this.players = [];                // {pid,nickname,score,connected,guessed}
    this.drawerIdx = -1;
    this.wall = [];               // 每轮从 IMAGES 随机抽 16 张（对象）
    this.target = -1;             // 服务端权威秘密目标（wall 内索引）
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
    this.players.push({ pid, nickname, score: 0, connected: true, guessed: null, wordHit: false, wordPts: 0, wordLevel: "", wordScored: [], tried: [], lastWrongAt: 0 });
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
  /** 已"最终锁定"的猜题人：选图答对，或 2 次机会用完 */
  answeredCount(){ return this.guessers().filter(p => p.guessed && p.guessed.done).length; }
  allAnswered(){ return this.guessers().length > 0 && this.answeredCount() === this.guessers().length; }

  canStart(){ return this.status === "lobby" && this.players.length >= ONLINE.minPlayers; }

  startRound(){
    if(this.round >= this.maxRounds) return { err: "game_over" };
    this.round++;
    this.drawerIdx = (this.round - 1) % this.players.length;
    this.wall = shuffle(IMAGES).slice(0,16);   // 每轮从 64 图池随机抽 16 张
    this.target = Math.floor(Math.random()*16);
    this.canvas = { els: [], ver: 0 };
    this.players.forEach(p => { p.guessed = null; p.wordHit = false; p.wordPts = 0; p.wordLevel = ""; p.wordScored = []; p.tried = []; p.lastWrongAt = 0; });
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

  /**
   * 文字竞猜：整轮开放、不限次数。
   * 词条级去重：每个词条（类别/联想/别名/准确）每轮每玩家只计一次分，不同词条可累加、可逐级升级；
   * 封顶：每轮每人文字分不超过 ONLINE.wordCap（8 = 类别1 + 联想级最多4 + 准确5）。
   */
  submitWord(pid, text){
    if(this.status !== "playing") return { err: "not_playing" };
    const d = this.drawer();
    if(!d || d.pid === pid) return { err: "not_guesser", msg: "你是出题人，不用猜" };
    const p = this.findPlayer(pid);
    if(!p) return { err: "no_player" };
    const m = matchLevel(text, this.wall[this.target]);
    if(!m.hit) return { ok: true, correct: false };
    if((p.wordScored||[]).includes(m.word)){
      return { ok: true, correct: true, repeat: true, level: m.level, pts: 0, word: m.word, msg: "该词已猜过" };
    }
    if((p.wordPts||0) >= ONLINE.wordCap){
      return { ok: true, correct: true, repeat: true, level: m.level, pts: 0, word: m.word, msg: "本轮文字分已满" };
    }
    p.wordScored = (p.wordScored||[]).concat(m.word);
    p.wordPts = (p.wordPts||0) + m.pts;
    p.wordHit = true;
    p.wordLevel = m.level;
    this.touch();
    return { ok: true, correct: true, level: m.level, pts: m.pts, word: m.word, total: p.wordPts };
  }

  /**
   * 选图作答：不限次数。
   *  正确 → 锁定（首答 +3 / 后答 +1）；错误 → 该格记入 tried 不可再点，进入 cooldownMs 冷却（不锁定、不扣分）。
   *  首答 = 全房第一个选图正确者（按正确时间顺序）。
   */
  submitGuess(pid, cell){
    if(this.status !== "playing") return { err: "not_playing" };
    const d = this.drawer();
    if(!d || d.pid === pid) return { err: "not_guesser", msg: "你是出题人，不能作答" };
    const p = this.findPlayer(pid);
    if(!p) return { err: "no_player" };
    if(p.guessed && p.guessed.done) return { err: "already_guessed", msg: "本轮已锁定答案" };
    if(Date.now() < this.roundStart + this.opts.lockMs) return { err: "locked", msg: `作答尚未解锁（前 ${ONLINE.lockSeconds} 秒只能看）` };
    if(!Number.isInteger(cell) || cell < 0 || cell > 15) return { err: "invalid" };
    if((p.tried||[]).includes(cell)) return { err: "tried", msg: "这张照片你已经试过了" };
    const cd = this.opts.cooldownMs ?? ONLINE.cooldownMs;
    if(p.lastWrongAt && Date.now() - p.lastWrongAt < cd){
      return { err: "cooldown", msg: "选图冷却中，稍后再试", remain: cd - (Date.now() - p.lastWrongAt) };
    }
    const correct = cell === this.target;
    if(correct){
      p.guessed = { cell, correct, first: false, at: Date.now(), done: true };
      p.guessed.first = !this.guessers().some(g => g.guessed && g.guessed.correct && g.guessed.at < p.guessed.at && g.pid !== pid);
    }else{
      p.tried = (p.tried||[]).concat(cell);
      p.lastWrongAt = Date.now();
    }
    this.touch();
    return {
      ok: true, correct, first: !!(p.guessed && p.guessed.first),
      answered: this.answeredCount(), total: this.guessers().length,
      done: !!(p.guessed && p.guessed.done), tried: p.tried || []
    };
  }

  /** 结算本轮：选图对 +1（首答对再 +2）；文字命中按层级 +5/+2/+1；出题人按"猜中人数"（文字命中 ∪ 选图对，去重）+1 */
  reveal(){
    if(this.status !== "playing") return null;
    clearTimeout(this._revealTimer);
    const d = this.drawer();
    const results = this.players.map(p => {
      if(p.pid === d.pid){
        const hitCount = this.guessers().filter(g => (g.wordPts > 0) || (g.guessed && g.guessed.correct)).length;
        const pts = hitCount * ONLINE.baseCorrect;
        p.score += pts;
        return { pid: p.pid, nickname: p.nickname, role: "drawer", guessed: null, correct: null, wordHit: false, points: pts, hitCount };
      }
      let pts = 0;
      if(p.wordPts > 0) pts += p.wordPts;
      if(p.guessed && p.guessed.correct){ pts += ONLINE.baseCorrect + (p.guessed.first ? ONLINE.firstBonus : 0); }
      p.score += pts;
      return {
        pid: p.pid, nickname: p.nickname, role: "guesser",
        guessed: p.guessed ? p.guessed.cell : null,
        correct: p.guessed ? p.guessed.correct : null,
        first: p.guessed ? p.guessed.first : false,
        attempts: (p.tried||[]).length + (p.guessed ? 1 : 0),
        wordHit: !!p.wordHit,
        wordPts: p.wordPts || 0,
        points: pts
      };
    });
    const scores = Object.fromEntries(this.players.map(p => [p.pid, p.score]));
    const isLast = this.round >= this.maxRounds;
    this.status = isLast ? "game_over" : "round_end";
    this.touch();
    const rev = {
      state: this.status,
      round: this.round,
      answer: this.target,
      answerLabel: coordLabel(this.target) + " " + this.wall[this.target].zh,
      answerImg: this.wall[this.target].img,
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
      players: this.players.map(p => ({ pid: p.pid, nickname: p.nickname, score: p.score, connected: p.connected, guessed: p.guessed, wordHit: p.wordHit, tried: p.tried||[] })),
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

/* ================= 单人谜题（异步猜图：画好→分享链接→朋友猜） ================= */
const PuzzleStore = {
  map: new Map(),
  ttl: 24*3600*1000,   // 24 小时过期
  cap: 100,            // 上限 100 条，超出清最旧
  CODE: "ABCDEFGHJKLMNPQRSTUVWXYZ23456789",
  genId(){
    let s="";
    for(let i=0;i<6;i++) s += this.CODE[Math.floor(Math.random()*this.CODE.length)];
    return s;
  },
  create({canvas, answerMode, imageId, customWords}){
    if(!Array.isArray(canvas) || canvas.length===0 || canvas.length>ONLINE.elementCap) return { err:"invalid_canvas" };
    if(answerMode === "image"){
      const img = IMAGES.find(g=>g.id===imageId) || IMAGES.find(g=>g.exact===String(imageId||"").trim());
      if(!img) return { err:"invalid_image" };
      let id; do{ id=this.genId(); }while(this.map.has(id));
      this.map.set(id, { id, canvas, answerMode:"image", imageId:img.id, createdAt:Date.now() });
      this.cleanup();
      return { ok:true, id };
    }
    if(answerMode === "custom"){
      const words = (customWords||[]).map(String).map(s=>normalizeWord(s)).filter(Boolean);
      if(words.length===0) return { err:"invalid_words" };
      let id; do{ id=this.genId(); }while(this.map.has(id));
      this.map.set(id, { id, canvas, answerMode:"custom", words, createdAt:Date.now() });
      this.cleanup();
      return { ok:true, id };
    }
    return { err:"invalid_mode" };
  },
  get(id){
    const key = String(id||"").toUpperCase();
    const p = this.map.get(key);
    if(!p) return null;
    if(Date.now()-p.createdAt > this.ttl){ this.map.delete(key); return null; }
    return p;
  },
  cleanup(now = Date.now()){
    for(const [id,p] of this.map){ if(now-p.createdAt > this.ttl) this.map.delete(id); }
    if(this.map.size > this.cap){
      const oldest = [...this.map.entries()].sort((a,b)=>a[1].createdAt-b[1].createdAt);
      for(const [k] of oldest.slice(0, this.map.size - this.cap)) this.map.delete(k);
    }
  },
  guess(id, text){
    const p = this.get(id);
    if(!p) return { err:"not_found" };
    const t = normalizeWord(String(text||"").trim());
    if(!t) return { ok:true, correct:false };
    if(p.answerMode === "image"){
      const img = IMAGES.find(g=>g.id===p.imageId);
      if(!img) return { ok:true, correct:false };
      const m = matchLevel(t, img);
      if(!m.hit) return { ok:true, correct:false };
      return { ok:true, correct:true, level:m.level, word:m.word, pts:m.pts, answer:{ mode:"image", zh:img.zh, category:img.category, exact:img.exact } };
    }
    const hit = p.words.find(w => t.includes(w));
    if(!hit) return { ok:true, correct:false };
    return { ok:true, correct:true, level:"exact", word:hit, pts:5, answer:{ mode:"custom", words:p.words } };
  }
};

/* ================= 网络层 ================= */
function startServer(port = process.env.PORT || 4000, roomOpts = {}){
  const app = express();
  app.use(express.json({ limit: "1mb" }));
  app.get("/health", (req, res) => res.type("text/plain").send("ok"));
  app.get("/", (req, res) => res.redirect(302, "/巧手猜图.html"));
  // 单人谜题 API：创建（发布）/ 读取（不含答案）/ 猜词判定
  app.post("/api/puzzle", (req, res) => {
    const r = PuzzleStore.create(req.body || {});
    if(r.err) return res.status(400).json({ err:r.err });
    res.json({ ok:true, id:r.id, url:"/巧手猜图.html#/puzzle/"+r.id });
  });
  app.get("/api/puzzle/:id", (req, res) => {
    const p = PuzzleStore.get(req.params.id);
    if(!p) return res.status(404).json({ err:"not_found" });
    res.json({ ok:true, canvas:p.canvas, answerMode:p.answerMode });
  });
  app.post("/api/puzzle/:id/guess", (req, res) => {
    const r = PuzzleStore.guess(req.params.id, (req.body||{}).text);
    if(r.err) return res.status(404).json({ err:r.err });
    res.json(r);
  });
  // 照片墙缩略图与大图长缓存；其余静态文件不缓存（保证 HTML 实时更新）
  app.use("/images-thumb", express.static(path.join(__dirname, "images-thumb"), { maxAge: "1d" }));
  app.use("/images", express.static(path.join(__dirname, "images"), { maxAge: "1d" }));
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
    const sendTo = (room, pid, obj) => {
      for(const c of wss.clients){
        if(c.ctx && c.ctx.room === room && c.ctx.pid === pid) c.send(JSON.stringify(obj));
      }
    };

    ws.on("message", (raw) => {
      let m; try{ m = JSON.parse(raw); }catch(e){ return; }
      const t = m.t;

      if(t === "list"){
        const rooms = [...manager.rooms.values()]
          .filter(rm => rm.status === "lobby" && rm.players.length < ONLINE.maxPlayers)
          .map(rm => ({ room_id: rm.id, host: (rm.players[0]||{}).nickname || "", players: rm.players.length, max: ONLINE.maxPlayers }));
        return send({ t:"list", rooms });
      }
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
            c.send(JSON.stringify({ t:"round_start", state:"playing", round: room.round, drawer: { pid: room.drawer().pid, nickname: room.drawer().nickname }, deadline: room.deadline, lockSeconds: ONLINE.lockSeconds, createSeconds: ONLINE.createSeconds, wall: room.wall, target: snap.target }));
          }
        }
        return;
      }
      if(t === "canvas"){
        const r = room.setCanvas(pid, m.els);
        if(r.ok) broadcast(room, { t:"canvas", els: m.els, ver: r.ver }, pid);
        return;
      }
      if(t === "word"){
        const r = room.submitWord(pid, m.text);
        if(r.err){ return send({ t:"error", err:r.err, msg:r.msg }); }
        const drawerPid = room.drawer() && room.drawer().pid;
        // 出题人实时看到每个猜词与命中结果（含未命中；命中只给出题人，不给其他猜题人）
        if(drawerPid){
          sendTo(room, drawerPid, { t:"word_view", pid, nickname: room.findPlayer(pid).nickname, word: String(m.text||"").trim(), correct: !!r.correct, level: r.level || "", pts: r.pts || 0, repeat: !!r.repeat });
        }
        if(r.correct){
          if(r.repeat){ return send({ t:"word_res", correct: true, repeat: true, level: r.level, pts: r.pts, word: r.word, msg: r.msg }); }
          broadcast(room, { t:"word_hit", pid, nickname: room.findPlayer(pid).nickname, level: r.level }, pid);   // 猜题人之间只广播层级，不含词
          return send({ t:"word_res", correct: true, level: r.level, pts: r.pts, word: r.word, total: r.total });
        }
        return send({ t:"word_res", correct: false });
      }
      if(t === "guess"){
        const r = room.submitGuess(pid, m.cell);
        if(r.err){ return send({ t:"error", err:r.err, msg:r.msg, remain: r.remain }); }
        send({ t:"guess_ok", correct: r.correct, first: r.first, answered: r.answered, total: r.total, done: r.done, tried: r.tried||[] });
        broadcast(room, { t:"guess_status", answered: r.answered, total: r.total }, pid);   // 猜题人之间仅匿名人数，不含对错
        const drawerPid2 = room.drawer() && room.drawer().pid;
        if(drawerPid2){
          sendTo(room, drawerPid2, { t:"guess_view", pid, nickname: room.findPlayer(pid).nickname, cell: m.cell, correct: !!r.correct, first: !!r.first });
        }
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
            c.send(JSON.stringify({ t:"round_start", state:"playing", round: room.round, drawer: { pid: room.drawer().pid, nickname: room.drawer().nickname }, deadline: room.deadline, lockSeconds: ONLINE.lockSeconds, createSeconds: ONLINE.createSeconds, wall: room.wall, target: snap.target }));
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
      console.log(`[pictures-web] 前端入口: http://localhost:${port}/巧手猜图.html`);
    }
  });
  return { app, server, wss, manager, ready };
}

module.exports = { ONLINE, IMAGES, PACK, normalizeWord, matchLevel, STAGE, Room, RoomManager, PuzzleStore, startServer };

if(require.main === module){ startServer(); }
