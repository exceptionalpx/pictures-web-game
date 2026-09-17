"use strict";
/**
 * 巧手猜图联机服务端测试（node --test test.js）
 * 覆盖：房间生命周期 / 作答锁定 / 每人一轮 / 计分结算 / 提前揭晓 /
 *       出题轮换 / 终局 / 目标保密 / 重连恢复 / 网络 e2e 全流程
 */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { WebSocket } = require("ws");
const { Room, RoomManager, startServer } = require("./server.js");

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/* ================= 纯逻辑测试 ================= */

test("房间：创建 / 加入 / 超员 / 开局后拒绝加入", () => {
  const mgr = new RoomManager({ lockMs: 0, createMs: 100000 });
  const { room, pid } = mgr.create("阿明");
  assert.ok(room.id.length >= 3, "生成房间码");
  assert.equal(room.players.length, 1);
  assert.equal(room.canStart(), false, "1 人不能开始");

  for(let i=0;i<5;i++){ const r = mgr.join(room.id, "P"+i); assert.ok(!r.err, "前 5 人加入成功"); }
  const full = mgr.join(room.id, "P6");
  assert.equal(full.err, "room_full", "第 7 人超员拒绝");

  room.maxRounds = 3; room.startRound();
  const late = mgr.join(room.id, "迟到");
  assert.equal(late.err, "game_started", "开局后拒绝加入");
  assert.ok(pid);
});

test("作答锁定窗口：前 30 秒拒绝，解锁后放行", () => {
  const room = new Room("T1", { lockMs: 50, createMs: 100000 });
  room.addPlayer("A"); room.addPlayer("B");
  room.maxRounds = 2; room.startRound();
  const early = room.submitGuess(room.players[1].pid, 3);
  assert.equal(early.err, "locked", "锁定窗口内拒绝");
  return sleep(80).then(() => {
    const ok = room.submitGuess(room.players[1].pid, room.target);
    assert.ok(ok.ok, "解锁后放行");
    assert.equal(ok.correct, true);
  });
});

test("每人每轮 1 次：重复作答拒绝", () => {
  const room = new Room("T2", { lockMs: 0, createMs: 100000 });
  room.addPlayer("A"); room.addPlayer("B");
  room.maxRounds = 2; room.startRound();
  const b = room.players[1].pid;
  room.submitGuess(b, room.target);
  const again = room.submitGuess(b, (room.target+1)%16);
  assert.equal(again.err, "already_guessed");
});

test("计分结算：首答对 +3 / 后答对 +1 / 答错 0 / 出题人按猜中人数 +1", () => {
  const room = new Room("T3", { lockMs: 0, createMs: 100000 });
  room.addPlayer("A"); room.addPlayer("B"); room.addPlayer("C");
  room.maxRounds = 3; room.startRound();           // R1 drawer = A
  const b = room.players[1].pid, c = room.players[2].pid;
  room.submitGuess(b, room.target);                 // B 首答对
  room.submitGuess(c, room.target);                 // C 后答对
  const rev = room.reveal();
  const by = Object.fromEntries(rev.results.map(r => [r.nickname, r]));
  assert.equal(by.B.points, 3, "首答对 +3");
  assert.equal(by.C.points, 1, "后答对 +1");
  assert.equal(by.A.points, 2, "出题人 2 人猜中 +2");
  assert.equal(rev.answer, room.target);
  assert.equal(rev.scores[room.players[0].pid], 2);
});

test("答错 0 分且锁定；首答对判定只看第一个答对者", () => {
  const room = new Room("T4", { lockMs: 0, createMs: 100000 });
  room.addPlayer("A"); room.addPlayer("B"); room.addPlayer("C");
  room.maxRounds = 3; room.startRound();
  const b = room.players[1].pid, c = room.players[2].pid;
  const wrong = (room.target+1)%16;
  room.submitGuess(b, wrong);                       // B 先答但答错
  room.submitGuess(c, room.target);                 // C 首答对
  const rev = room.reveal();
  const by = Object.fromEntries(rev.results.map(r => [r.nickname, r]));
  assert.equal(by.B.points, 0, "答错 0 分");
  assert.equal(by.B.guessed, wrong);
  assert.equal(by.C.first, true, "先答错的不能占抢先奖励");
  assert.equal(by.C.points, 3);
  assert.equal(by.A.points, 1, "仅 1 人猜中");
});

test("全部作答完成可提前揭晓（allAnswered）", () => {
  const room = new Room("T5", { lockMs: 0, createMs: 100000 });
  room.addPlayer("A"); room.addPlayer("B"); room.addPlayer("C");
  room.maxRounds = 3; room.startRound();
  room.submitGuess(room.players[1].pid, room.target);
  assert.equal(room.allAnswered(), false, "1/2 未全答");
  room.submitGuess(room.players[2].pid, (room.target+1)%16);
  assert.equal(room.allAnswered(), true, "全部作答");
  const rev = room.reveal();
  assert.equal(rev.state, "round_end");
});

test("出题人轮换 + 终局结算", () => {
  const room = new Room("T6", { lockMs: 0, createMs: 100000 });
  room.addPlayer("A"); room.addPlayer("B");
  room.maxRounds = 2; room.startRound();
  assert.equal(room.drawer().nickname, "A", "R1 A 出题");
  room.reveal();
  let r = room.nextRound();
  assert.equal(r.state, "playing");
  assert.equal(room.drawer().nickname, "B", "R2 B 出题");
  room.submitGuess(room.players[0].pid, room.target);
  let rev = room.reveal();
  assert.equal(rev.state, "game_over", "最后一轮揭晓即终局");
  r = room.nextRound();
  assert.equal(r.state, "game_over");
  assert.ok(r.winner.pid, "产生赢家");
  const total = Object.values(r.scores).reduce((a,b)=>a+b,0);
  assert.equal(total, room.players.reduce((a,p)=>a+p.score,0));
});

test("目标保密：snapshotFor 只给出题人带 target", () => {
  const room = new Room("T7", { lockMs: 0, createMs: 100000 });
  room.addPlayer("A"); room.addPlayer("B");
  room.maxRounds = 2; room.startRound();
  const a = room.players[0].pid, b = room.players[1].pid;
  const sa = room.snapshotFor(a), sb = room.snapshotFor(b);
  assert.equal(sa.target, room.target, "出题人可见目标");
  assert.equal(sb.target, undefined, "猜题人快照不含 target 字段");
});

test("重连恢复：rejoin 找回玩家与状态", () => {
  const mgr = new RoomManager({ lockMs: 0, createMs: 100000 });
  const { room, pid: a } = mgr.create("A");
  const b = mgr.join(room.id, "B").pid;
  room.maxRounds = 2; room.startRound();
  room.setCanvas(a, [{kind:"rect",x:1,y:2,w:3,h:4,rot:0,color:"#000"}]);
  room.removePlayer(b);
  const r = mgr.rejoin(room.id, b);
  assert.ok(!r.err, "重连成功");
  assert.equal(r.room.players.find(p=>p.pid===b).connected, true);
  const snap = r.room.snapshotFor(b);
  assert.equal(snap.canvas.els.length, 1, "画布保留");
  assert.equal(snap.round, 1);
  assert.equal(snap.target, undefined);
});

test("画布权限：非出题人更新被拒", () => {
  const room = new Room("T8", { lockMs: 0, createMs: 100000 });
  room.addPlayer("A"); room.addPlayer("B");
  room.maxRounds = 2; room.startRound();
  const b = room.players[1].pid;
  const r = room.setCanvas(b, [{kind:"rect",x:1,y:2,w:3,h:4,rot:0,color:"#000"}]);
  assert.equal(r.err, "not_drawer");
  const ok = room.setCanvas(room.players[0].pid, []);
  assert.ok(ok.ok);
});

/* ================= e2e 网络测试 ================= */

function wsClient(url){
  const ws = new WebSocket(url);
  const queue = [];
  const waiters = [];
  ws.on("message", raw => {
    const m = JSON.parse(raw.toString());
    const wi = waiters.findIndex(w => w.pred(m));
    if(wi >= 0){ const [w] = waiters.splice(wi,1); w.resolve(m); }
    else queue.push(m);
  });
  const ready = new Promise(res => ws.on("open", res));
  return {
    ws,
    ready,
    send(m){ ws.send(JSON.stringify(m)); },
    waitFor(pred, timeoutMs = 5000){
      const i = queue.findIndex(pred);
      if(i >= 0) return Promise.resolve(queue.splice(i,1)[0]);
      return new Promise((resolve, reject) => {
        const t = setTimeout(() => reject(new Error("waitFor 超时")), timeoutMs);
        waiters.push({ pred, resolve: m => { clearTimeout(t); resolve(m); } });
      });
    }
  };
}

test("e2e：2 人完整对局（锁定→解锁→作答→揭晓→轮换→终局）", async () => {
  const { server, manager, ready, wss } = startServer(0, { lockMs: 60, createMs: 3000 });
  await ready;
  const port = server.address().port;
  const base = `ws://127.0.0.1:${port}/ws`;

  const a = wsClient(base); await a.ready;
  const b = wsClient(base); await b.ready;

  // 创建房间
  a.send({ t:"create", nickname:"阿明" });
  const created = await a.waitFor(m => m.t === "created");
  assert.ok(created.room_id);
  const roomId = created.room_id;

  // 加入
  b.send({ t:"join", room_id: roomId, nickname:"小红" });
  const joinedB = await b.waitFor(m => m.t === "joined");
  assert.equal(joinedB.players.length, 2);
  assert.equal("target" in joinedB, false, "加入时猜题人无 target");
  const aJoined = await a.waitFor(m => m.t === "player_joined");
  assert.equal(aJoined.players.length, 2);

  // 房主开始
  a.send({ t:"start" });
  const rsA = await a.waitFor(m => m.t === "round_start");
  const rsB = await b.waitFor(m => m.t === "round_start");
  assert.ok(Number.isInteger(rsA.target), "出题人收到秘密目标");
  assert.equal("target" in rsB, false, "猜题人 round_start 无 target");
  assert.equal(rsB.drawer.nickname, "阿明");

  // 出题人画布 → 猜题人实时收到
  a.send({ t:"canvas", els:[{kind:"rect",x:10,y:20,w:30,h:40,rot:0,color:"#000"}] });
  const cv = await b.waitFor(m => m.t === "canvas");
  assert.equal(cv.els.length, 1);

  // 锁定窗口内作答被拒
  b.send({ t:"guess", cell: rsA.target });
  const lockedErr = await b.waitFor(m => m.t === "error");
  assert.equal(lockedErr.err, "locked");

  // 解锁后答对 → guess_ok；只剩 1 人作答 → 自动揭晓
  await sleep(90);
  b.send({ t:"guess", cell: rsA.target });
  const gok = await b.waitFor(m => m.t === "guess_ok");
  assert.equal(gok.correct, true);
  assert.equal(gok.first, true);
  // 出题人 A 收到"有人已作答"广播（不含对错；total=猜题人数，2 人局为 1）
  const gstat = await a.waitFor(m => m.t === "guess_status");
  assert.equal(gstat.answered, 1);
  assert.equal(gstat.total, 1);
  assert.equal("correct" in gstat, false, "guess_status 不泄露对错");
  const revA = await a.waitFor(m => m.t === "reveal");
  const revB = await b.waitFor(m => m.t === "reveal");
  assert.equal(revA.state, "round_end");
  assert.equal(revA.answer, rsA.target, "揭晓答案");
  const aRes = revA.results.find(r => r.role === "drawer");
  assert.equal(aRes.points, 1, "出题人被猜中 +1");
  const bRes = revA.results.find(r => r.role === "guesser");
  assert.equal(bRes.points, 3, "首答对 +3");

  // 下一轮 → 角色交换
  b.send({ t:"next" });   // 非房主也可推进
  const rs2A = await a.waitFor(m => m.t === "round_start" && m.round === 2);
  const rs2B = await b.waitFor(m => m.t === "round_start" && m.round === 2);
  assert.equal(rs2B.drawer.nickname, "小红", "R2 小红出题");
  assert.equal("target" in rs2A, false, "R2 猜题人 A 无 target");
  assert.ok(Number.isInteger(rs2B.target), "R2 出题人 B 有 target");

  // R2：A 猜错 → 揭晓 → game_over
  b.send({ t:"canvas", els:[] });
  await a.waitFor(m => m.t === "canvas");
  await sleep(80);   // 等 R2 解锁窗口（lockMs 60）
  const wrongCell = (rs2B.target + 1) % 16;
  a.send({ t:"guess", cell: wrongCell });
  const gokA = await a.waitFor(m => m.t === "guess_ok");
  assert.equal(gokA.correct, false);
  const rev2 = await b.waitFor(m => m.t === "reveal" && m.round === 2);
  assert.equal(rev2.state, "game_over");
  b.send({ t:"next" });
  const over = await a.waitFor(m => m.t === "game_over");
  assert.equal(over.winner.nickname, "小红", "赢家是 R1 首答对拿 3 分的小红");
  assert.equal(over.scores[over.winner.pid], 3);

  manager.disposeAll(); a.ws.close(); b.ws.close(); wss.close();
  await new Promise(res => server.close(res));
});

test("e2e：倒计时结束自动揭晓（无人作答）", async () => {
  const { server, manager, ready, wss } = startServer(0, { lockMs: 0, createMs: 150 });
  await ready;
  const port = server.address().port;
  const base = `ws://127.0.0.1:${port}/ws`;
  const a = wsClient(base); await a.ready;
  const b = wsClient(base); await b.ready;
  a.send({ t:"create", nickname:"甲" });
  const created = await a.waitFor(m => m.t === "created");
  b.send({ t:"join", room_id: created.room_id, nickname:"乙" });
  await b.waitFor(m => m.t === "joined");
  a.send({ t:"start" });
  await a.waitFor(m => m.t === "round_start");
  // 双方都不作答，等倒计时
  const rev = await b.waitFor(m => m.t === "reveal", 3000);
  assert.equal(rev.state, "round_end");
  const noGuess = rev.results.every(r => r.points === 0);
  assert.ok(noGuess, "无人作答全 0 分");
  manager.disposeAll(); a.ws.close(); b.ws.close(); wss.close();
  await new Promise(res => server.close(res));
});

test("e2e：断线重连恢复画布与身份", async () => {
  const { server, manager, ready, wss } = startServer(0, { lockMs: 0, createMs: 10000 });
  await ready;
  const port = server.address().port;
  const base = `ws://127.0.0.1:${port}/ws`;
  const a = wsClient(base); await a.ready;
  const b = wsClient(base); await b.ready;
  a.send({ t:"create", nickname:"甲" });
  const created = await a.waitFor(m => m.t === "created");
  b.send({ t:"join", room_id: created.room_id, nickname:"乙" });
  const joinedB = await b.waitFor(m => m.t === "joined");
  a.send({ t:"start" });
  const rsA = await a.waitFor(m => m.t === "round_start");
  a.send({ t:"canvas", els:[{kind:"icon",glyph:"⭐",x:1,y:2,w:3,h:4,rot:0,color:"#000"}] });
  await b.waitFor(m => m.t === "canvas");

  // B 断线后重连
  b.ws.close();
  await sleep(120);
  const b2 = wsClient(base); await b2.ready;
  b2.send({ t:"rejoin", room_id: created.room_id, pid: joinedB.pid });
  const rejoined = await b2.waitFor(m => m.t === "joined");
  assert.equal(rejoined.round, 1, "回合保留");
  assert.equal(rejoined.canvas.els[0].glyph, "⭐", "画布保留");
  assert.equal("target" in rejoined, false, "重连仍无 target");
  const statusMsg = await a.waitFor(m => m.t === "player_joined" && m.pid === joinedB.pid);
  assert.equal(statusMsg.players.find(p=>p.pid===joinedB.pid).connected, true);
  manager.disposeAll(); a.ws.close(); b2.ws.close(); wss.close();
  await new Promise(res => server.close(res));
});
