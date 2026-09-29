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
  createSeconds: 120,          // 每轮作画倒计时
  lockSeconds: 45,            // 作画开始后前 N 秒作答锁定
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
/** 画布背景色预设（出题人可选，作为画布属性随 canvas 消息同步） */
const CANVAS_BGS = ["#FFFFFF","#BFE3F7","#C6EFCE","#FFF3BF","#FFD6E0","#E6D5F5","#DDEBF7","#FCE8D5"];

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
    this.hostPid = null;              // 房主（建房者；离线自动转移给第一个在线玩家，回归不自动收回）
    this.drawerIdx = -1;
    this.wall = [];               // 每轮从图池（64 图 + 房主自定义图）随机抽 16 张（对象）
    this.customImages = [];       // 房间自定义图库（全房间可上传；{id,img,imgUrl,zh,category,exact,keywords,aliases,category_word,contributor}）
    this.poolMode = "mixed";      // 图库模式：default(64图) | custom(自定义图库) | mixed(混合)，房主开局前选择
    this.customCap = 32;          // 房间自定义图库上限（开局后从中随机抽 16 张）
    this._imgSeq = 0;             // 共享图 id 递增序列
    this.target = -1;             // 服务端权威秘密目标（wall 内索引）
    this.canvas = { els: [], bg: "#FFFFFF", ver: 0 };
    this.roundStart = 0;
    this.deadline = 0;
    this.lastActive = Date.now();
    this._revealTimer = null;
    this.onReveal = null;   // 网络层注入：揭晓（手动或倒计时触发）后广播
  }
  touch(){ this.lastActive = Date.now(); }

  dispose(){ clearTimeout(this._revealTimer); this._revealTimer = null; }

  addPlayer(nickname, device){
    if(this.status !== "lobby") return { err: "game_started", msg: "游戏已开始，无法再加入" };
    if(this.players.length >= ONLINE.maxPlayers) return { err: "room_full", msg: "房间已满" };
    nickname = (nickname||"").toString().trim().slice(0,12) || ("玩家" + (this.players.length+1));
    const pid = genId();
    this.players.push({ pid, nickname, device: String(device||"").slice(0,40), score: 0, connected: true, guessed: null, wordHit: false, wordPts: 0, wordLevel: "", wordScored: [], tried: [], lastWrongAt: 0 });
    if(!this.hostPid) this.hostPid = pid;   // 房间第一个玩家（建房者）为房主
    this.touch();
    return { pid };
  }

  removePlayer(pid){
    const i = this.players.findIndex(p => p.pid === pid);
    if(i < 0) return;
    this.players[i].connected = false;
    if(this.hostPid === pid) this.hostPlayer();   // 房主离线 → 立即让位给第一个在线玩家
    this.touch();
  }

  /** 当前房主：hostPid 在线则为其；否则自动转移给第一个在线玩家（惰性转移，幂等） */
  hostPlayer(){
    const cur = this.players.find(p => p.pid === this.hostPid);
    if(cur && cur.connected) return cur;
    const next = this.players.find(p => p.connected);
    if(next){ this.hostPid = next.pid; }
    else if(this.players.length){ this.hostPid = this.players[0].pid; }
    return this.players.find(p => p.pid === this.hostPid) || null;
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
    // 图池按房主选择的图库模式构建；自定义不足 16 张时全部进墙、默认图补足剩余格，保证照片墙 16 格完整
    let pool;
    if(this.poolMode === "default"){
      pool = IMAGES.slice();
    } else if(this.poolMode === "custom"){
      const cus = this.customImages.map(c => ({ ...c, img: c.imgUrl }));
      if(cus.length >= 16){
        pool = shuffle(cus);                                // 自定义足够：随机抽 16
      } else {
        const need = 16 - cus.length;
        const fill = shuffle(IMAGES).slice(0, need);        // 不足：自定义全进 + 默认图补足（不重复）
        pool = cus.concat(fill);
      }
    } else {
      pool = IMAGES.concat(this.customImages.map(c => ({ ...c, img: c.imgUrl })));
    }
    this.wall = shuffle(pool).slice(0,16);   // 每轮从所选图池随机抽 16 张
    this.target = Math.floor(Math.random()*this.wall.length);
    this.canvas = { els: [], bg: "#FFFFFF", ver: 0 };
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

  /** 房主开局前选择图库模式（default/custom/mixed），开局后锁定 */
  setPoolMode(pid, mode){
    if(this.status !== "lobby") return { err: "not_lobby", msg: "游戏开始后不能修改图库" };
    if((this.hostPlayer()||{}).pid !== pid) return { err: "not_host", msg: "只有房主可以设置图库" };
    if(!["default","custom","mixed"].includes(mode)) return { err: "invalid_mode" };
    this.poolMode = mode;
    this.touch();
    return { ok: true };
  }

  /** 所有玩家在开局前可上传图片进房间自定义图库（上限 customCap，按 dataURL 去重） */
  addImg(pid, c){
    if(this.status !== "lobby") return { err: "not_lobby", msg: "游戏开始后不能上传图片" };
    const exact = normalizeWord(c.exact);
    const img = String(c.img||"").trim();
    if(!exact || !img || img.length > 1.5e6) return { err: "invalid", msg: "图片或准确词不合法" };
    if(this.customImages.length >= this.customCap) return { err: "room_full", msg: "自定义图库已满（"+this.customCap+" 张）" };
    if(this.customImages.some(x => x.img === img)) return { err: "dup", msg: "这张图已经上传过了" };
    const p = this.findPlayer(pid);
    this._imgSeq++;
    const item = {
      id: "cu-"+this._imgSeq,
      img,
      imgUrl: "/room-img/"+this.id+"/cu-"+this._imgSeq,
      zh: String(c.zh||c.exact||"我的图片").trim().slice(0,12)||"我的图片",
      category: String(c.category_word||"自定义").trim().slice(0,8)||"自定义",
      exact,
      keywords: (c.keywords||[]).map(String).map(s=>normalizeWord(s)).filter(Boolean).slice(0,2),
      aliases: (c.aliases||[]).map(String).map(s=>normalizeWord(s)).filter(Boolean).slice(0,2),
      category_word: normalizeWord(c.category_word),
      contributor: p ? p.nickname : ""
    };
    this.customImages.push(item);
    this.touch();
    return { ok: true, item };
  }

  /** 房主移除自定义图库中的一张图（开局前） */
  removeImg(pid, imgId){
    if(this.status !== "lobby") return { err: "not_lobby", msg: "游戏开始后不能移除图片" };
    if((this.hostPlayer()||{}).pid !== pid) return { err: "not_host", msg: "只有房主可以移除图片" };
    const i = this.customImages.findIndex(c => c.id === String(imgId||""));
    if(i < 0) return { err: "not_found", msg: "图片不存在" };
    this.customImages.splice(i,1);
    this.touch();
    return { ok: true };
  }

  /** 自定义图库元信息（不含 dataURL 与词条答案），用于大厅展示与广播 */
  customMeta(){
    return this.customImages.map(c => ({ id:c.id, zh:c.zh, category:c.category||"自定义", contributor:c.contributor||"", imgUrl:c.imgUrl }));
  }

  /** 出题人更新画布（元素 + 背景色）；仅出题人、元素数合法、背景色在白名单时生效 */
  setCanvas(pid, els, bg){
    const d = this.drawer();
    if(this.status !== "playing" || !d || d.pid !== pid) return { err: "not_drawer" };
    if(!Array.isArray(els) || els.length > ONLINE.elementCap) return { err: "invalid" };
    const b = CANVAS_BGS.includes(bg) ? bg : this.canvas.bg;
    this.canvas = { els, bg: b, ver: this.canvas.ver + 1 };
    this.touch();
    return { ok: true, ver: this.canvas.ver, bg: b };
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

  /** 再来一局：保留成员与房间号，清空分数/轮次/画布，回到大厅 */
  resetForAgain(){
    clearTimeout(this._revealTimer);
    this._revealTimer = null;
    this.status = "lobby";
    this.round = 0;
    this.maxRounds = 0;
    this.drawerIdx = -1;
    this.wall = [];
    this.target = -1;
    this.canvas = { els: [], bg: "#FFFFFF", ver: 0 };
    this.roundStart = 0;
    this.deadline = 0;
    this.players.forEach(p => {
      p.score = 0; p.guessed = null; p.wordHit = false; p.wordPts = 0; p.wordLevel = ""; p.wordScored = []; p.tried = []; p.lastWrongAt = 0; p.connected = true;
    });
    this.touch();
    return { ok: true };
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
      hostPid: (this.hostPlayer()||{}).pid || "",
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
  create(nickname, customImages, device){
    const room = new Room(genRoom(), this.roomOpts);
    const r = room.addPlayer(nickname, device);
    if(r.err) return r;
    if(Array.isArray(customImages)){
      const ok=[];
      for(const c of customImages.slice(0,room.customCap)){
        const exact=normalizeWord(c.exact);
        if(!exact || !String(c.img||"").trim() || String(c.img).length>1.5e6) continue;
        if(ok.some(x => x.img === String(c.img))) continue;
        room._imgSeq++;
        ok.push({
          id:"cu-"+room._imgSeq,
          img:String(c.img),
          imgUrl:"/room-img/"+room.id+"/cu-"+room._imgSeq,
          zh:String(c.zh||c.exact||"我的图片").trim().slice(0,12)||"我的图片",
          category:String(c.category_word||"自定义").trim().slice(0,8)||"自定义",
          exact,
          keywords:(c.keywords||[]).map(String).map(s=>normalizeWord(s)).filter(Boolean).slice(0,2),
          aliases:(c.aliases||[]).map(String).map(s=>normalizeWord(s)).filter(Boolean).slice(0,2),
          category_word:normalizeWord(c.category_word),
          contributor:String(nickname||"").slice(0,12)
        });
      }
      room.customImages=ok;
    }
    this.rooms.set(room.id, room);
    return { room, pid: r.pid };
  }
  join(roomId, nickname, device){
    const room = this.rooms.get(String(roomId||"").toUpperCase());
    if(!room) return { err: "not_found", msg: "房间不存在" };
    const nm = (nickname||"").toString().trim().slice(0,12);
    const dev = String(device||"").slice(0,40);
    // 同一设备（同一浏览器/人）优先复用原席位：昵称变化也不丢身份；若旧连接仍在线则标记踢出
    if(dev){
      const same = room.players.find(p => p.device === dev);
      if(same){
        const kicked = same.connected;
        same.connected = true;
        if(nm) same.nickname = nm;
        room.touch();
        return { room, pid: same.pid, resumed: true, kicked };
      }
    }
    // 断线玩家用同昵称重新进入 → 复用原席位，不新增人数
    if(nm){
      const off = room.players.find(p => p.nickname === nm && !p.connected);
      if(off){ off.connected = true; room.touch(); return { room, pid: off.pid, resumed: true }; }
    }
    const r = room.addPlayer(nickname, device);
    if(r.err) return r;
    return { room, pid: r.pid };
  }
  rejoin(roomId, pid){
    const room = this.rooms.get(String(roomId||"").toUpperCase());
    if(!room) return { err: "not_found", msg: "房间不存在" };
    const p = room.findPlayer(pid);
    if(!p) return { err: "not_found", msg: "身份已失效" };
    const kicked = p.connected;
    p.connected = true;
    return { room, pid, kicked };
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
  create({canvas, answerMode, imageId, customWords, words, img, bg}){
    if(!Array.isArray(canvas) || canvas.length===0 || canvas.length>ONLINE.elementCap) return { err:"invalid_canvas" };
    const bgOk = CANVAS_BGS.includes(bg) ? bg : "#FFFFFF";
    if(answerMode === "image"){
      const img = IMAGES.find(g=>g.id===imageId) || IMAGES.find(g=>g.exact===String(imageId||"").trim());
      if(!img) return { err:"invalid_image" };
      let id; do{ id=this.genId(); }while(this.map.has(id));
      this.map.set(id, { id, canvas, bg:bgOk, answerMode:"image", imageId:img.id, createdAt:Date.now() });
      this.cleanup();
      return { ok:true, id };
    }
    if(answerMode === "custom"){
      const words = (customWords||[]).map(String).map(s=>normalizeWord(s)).filter(Boolean);
      if(words.length===0) return { err:"invalid_words" };
      let id; do{ id=this.genId(); }while(this.map.has(id));
      this.map.set(id, { id, canvas, bg:bgOk, answerMode:"custom", words, createdAt:Date.now() });
      this.cleanup();
      return { ok:true, id };
    }
    if(answerMode === "custom_image"){
      const w = words || {};
      const exact = normalizeWord(w.exact);
      if(!exact) return { err:"invalid_words" };
      const imgData = String(img || "").trim();
      if(!imgData || imgData.length > 1.5e6) return { err:"invalid_image" };
      const entry = {
        exact,
        keywords:(w.keywords||[]).map(String).map(s=>normalizeWord(s)).filter(Boolean).slice(0,2),
        aliases:(w.aliases||[]).map(String).map(s=>normalizeWord(s)).filter(Boolean).slice(0,2),
        category_word:normalizeWord(w.category_word)
      };
      let id; do{ id=this.genId(); }while(this.map.has(id));
      this.map.set(id, { id, canvas, bg:bgOk, answerMode:"custom_image", words:entry, img:imgData, createdAt:Date.now() });
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
  /**
   * 猜词判定（支持三关引导）：
   *  stage: category(1) → keyword(2) → exact(3)；命中层级 ≥ 当前关即过关（前进一关或通关），
   *  命中更高层级直接放行（如第 1 关输联想词直接跳进准确关、输准确词直接通关）；
   *  命中更低层级返回 hint 提示不放行。缺省 stage 时保持原自由猜行为。
   */
  guess(id, text, stage){
    const p = this.get(id);
    if(!p) return { err:"not_found" };
    const t = normalizeWord(String(text||"").trim());
    if(!t) return { ok:true, correct:false };
    if(p.answerMode === "custom"){
      const hit = p.words.find(w => t.includes(w));
      if(!hit) return { ok:true, correct:false };
      return { ok:true, correct:true, level:"exact", word:hit, pts:5, answer:{ mode:"custom", words:p.words } };
    }
    const stLv = stage==="exact" ? 3 : (stage==="keyword" ? 2 : 1);
    let img, m;
    if(p.answerMode === "image"){
      img = IMAGES.find(g=>g.id===p.imageId);
      if(!img) return { ok:true, correct:false };
      m = matchLevel(t, img);
    } else {
      img = { exact:p.words.exact, keywords:p.words.keywords||[], aliases:p.words.aliases||[], category_word:p.words.category_word||"" };
      m = matchLevel(t, img);
    }
    if(!m.hit) return { ok:true, correct:false };
    const mLv = m.level==="exact" ? 3 : (m.level==="keyword" ? 2 : 1);
    if(mLv < stLv) return { ok:true, correct:false, hint:m.level };
    if(mLv === 3){
      const answer = p.answerMode === "image"
        ? { mode:"image", zh:img.zh, category:img.category, exact:img.exact, img:img.img }
        : { mode:"custom_image", exact:p.words.exact, img:p.img };
      return { ok:true, correct:true, done:true, level:"exact", word:m.word, pts:5, answer };
    }
    const next = mLv === 2 ? "exact" : "keyword";
    return { ok:true, correct:true, passed:true, next, level:m.level, word:m.word, pts:m.pts };
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
    res.json({ ok:true, canvas:p.canvas, bg:p.bg||"#FFFFFF", answerMode:p.answerMode, img:p.img||null });
  });
  app.post("/api/puzzle/:id/guess", (req, res) => {
    const r = PuzzleStore.guess(req.params.id, (req.body||{}).text, (req.body||{}).stage);
    if(r.err) return res.status(404).json({ err:r.err });
    res.json(r);
  });
  // 房间素材图（自定义图）HTTP 加载：不广播 dataURL，加入者按 URL 拉取
  app.get("/room-img/:roomId/:imgId", (req, res) => {
    const room = manager.rooms.get(String(req.params.roomId||"").toUpperCase());
    const item = room && room.customImages.find(c => c.id === String(req.params.imgId||""));
    if(!room || !item || !item.img){
      return res.status(404).end();
    }
    const mime = /^data:([\w/+-]+);base64,/.exec(item.img);
    const buf = Buffer.from(item.img.split(",")[1]||"", "base64");
    res.set("Content-Type", mime ? mime[1] : "image/jpeg")
       .set("Cache-Control", "public, max-age=3600")
       .send(buf);
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
    const kickConnections = (room, pid) => {
      for(const c of wss.clients){
        if(c.ctx && c.ctx.room === room && c.ctx.pid === pid){
          try{ c.send(JSON.stringify({ t:"kicked", msg:"你的账号已在另一处进入该房间" })); }catch(_){}
          c.ctx = null;
          try{ c.close(); }catch(_){}
        }
      }
    };

    ws.on("message", (raw) => {
      let m; try{ m = JSON.parse(raw); }catch(e){ return; }
      const t = m.t;

      if(t === "list"){
        const rooms = [...manager.rooms.values()]
          .filter(rm => rm.status === "lobby" && rm.players.length < ONLINE.maxPlayers)
          .map(rm => ({ room_id: rm.id, host: (rm.hostPlayer()||{}).nickname || "", players: rm.players.length, max: ONLINE.maxPlayers }));
        return send({ t:"list", rooms });
      }
      if(t === "create"){
        const r = manager.create(m.nickname, m.customImages, m.device);
        if(r.err){ return send({ t:"error", err: r.err, msg: r.msg }); }
        ctx = { room: r.room, pid: r.pid };
        ws.ctx = ctx;
        ctx.room.onReveal = (rev) => broadcast(ctx.room, { t:"reveal", ...rev });
        return send({ t:"created", room_id: r.room.id, pid: r.pid, nickname: r.room.players[0].nickname, players: r.room.players, wall: r.room.wall, rules: ONLINE, poolMode: r.room.poolMode, customImgs: r.room.customMeta(), hostPid: (r.room.hostPlayer()||{}).pid || "" });
      }
      if(t === "join"){
        const r = manager.join(m.room_id, m.nickname, m.device);
        if(r.err){ return send({ t:"error", err: r.err, msg: r.msg }); }
        if(r.kicked) kickConnections(r.room, r.pid);
        ctx = { room: r.room, pid: r.pid };
        ws.ctx = ctx;
        ctx.room.onReveal = (rev) => broadcast(ctx.room, { t:"reveal", ...rev });
        send({ t:"joined", room_id: r.room.id, pid: r.pid, resumed: !!r.resumed, ...r.room.snapshotFor(r.pid), rules: ONLINE, poolMode: r.room.poolMode, customImgs: r.room.customMeta() });
        return broadcast(r.room, { t:"player_joined", pid: r.pid, players: r.room.players.map(p => ({pid:p.pid,nickname:p.nickname,connected:p.connected})), hostPid: (r.room.hostPlayer()||{}).pid || "" }, r.pid);
      }
      if(t === "rejoin"){
        const r = manager.rejoin(m.room_id, m.pid);
        if(r.err){ return send({ t:"error", err: r.err, msg: r.msg }); }
        if(r.kicked) kickConnections(r.room, r.pid);
        ctx = { room: r.room, pid: r.pid };
        ws.ctx = ctx;
        ctx.room.onReveal = (rev) => broadcast(ctx.room, { t:"reveal", ...rev });
        send({ t:"joined", room_id: r.room.id, pid: r.pid, resumed: true, ...r.room.snapshotFor(r.pid), rules: ONLINE, poolMode: r.room.poolMode, customImgs: r.room.customMeta() });
        return broadcast(r.room, { t:"player_joined", pid: r.pid, players: r.room.players.map(p => ({pid:p.pid,nickname:p.nickname,connected:p.connected})), hostPid: (r.room.hostPlayer()||{}).pid || "" }, r.pid);
      }
      if(!ctx) return;

      const { room, pid } = ctx;

      if(t === "set_mode"){
        const r = room.setPoolMode(pid, m.mode);
        if(r.err) return send({ t:"error", err:r.err, msg:r.msg });
        return broadcast(room, { t:"mode_set", mode: room.poolMode });
      }
      if(t === "add_img"){
        const r = room.addImg(pid, m);
        if(r.err) return send({ t:"error", err:r.err, msg:r.msg });
        const meta = room.customMeta();
        return broadcast(room, { t:"img_added", img: meta[meta.length-1], list: meta });
      }
      if(t === "del_img"){
        const r = room.removeImg(pid, m.id);
        if(r.err) return send({ t:"error", err:r.err, msg:r.msg });
        return broadcast(room, { t:"img_removed", list: room.customMeta() });
      }
      if(t === "start"){
        if(!room.canStart()) return send({ t:"error", err:"not_ready", msg:"至少 2 人才能开始" });
        if((room.hostPlayer()||{}).pid !== pid) return send({ t:"error", err:"not_host", msg:"只有房主可以开始" });
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
        const r = room.setCanvas(pid, m.els, m.bg);
        if(r.ok) broadcast(room, { t:"canvas", els: m.els, bg: r.bg, ver: r.ver }, pid);
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
      if(t === "again"){
        if((room.hostPlayer()||{}).pid !== pid) return send({ t:"error", err:"not_host", msg:"只有房主可以再来一局" });
        room.resetForAgain();
        return broadcast(room, { t:"room_reset", room_id: room.id, players: room.players.map(p => ({pid:p.pid,nickname:p.nickname,connected:p.connected})), hostPid: (room.hostPlayer()||{}).pid || "" });
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
      // 用 ws.ctx：被踢（kickConnections 已置 null）或未入房时不做离线标记，避免顶号误伤新连接
      if(!ws.ctx) return;
      const room = ws.ctx.room;
      const pid = ws.ctx.pid;
      room.removePlayer(pid);   // 内部会处理房主离线让位
      // 向房间内其他玩家广播最新玩家列表与房主（离线/让位实时可见）
      broadcast(room, {
        t:"player_joined", pid,
        players: room.players.map(p => ({pid:p.pid,nickname:p.nickname,connected:p.connected})),
        hostPid: (room.hostPlayer()||{}).pid || ""
      }, pid);
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
