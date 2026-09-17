"use strict";
/**
 * 巧手猜图联机服务端测试（node --test test.js）
 * 覆盖：房间生命周期 / 作答锁定 / 文字竞猜 / 最多 2 次选图 / 计分结算 / 提前揭晓 /
 *       出题轮换 / 终局 / 目标保密 / 重连恢复 / 房间列表 / 网络 e2e 全流程
 */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { WebSocket } = require("ws");
const { Room, RoomManager, startServer, PHOTO_POOL, WORD_BANK, matchWord, normalizeWord } = require("./server.js");

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
    assert.equal(ok.done, true, "答对即最终锁定");
  });
});

test("文字竞猜：词表命中 / 未命中 / 错图不命中 / 重复命中不重复加分 / 窗口外拒绝", async () => {
  const room = new Room("TW1", { lockMs: 3000, createMs: 100000 });
  room.addPlayer("A"); room.addPlayer("B"); room.addPlayer("C");
  room.maxRounds = 2; room.startRound();
  const b = room.players[1].pid, c = room.players[2].pid;
  const miss = room.submitWord(b, "随便猜猜是什么");
  assert.equal(miss.correct, false, "未命中");
  // 命中：wall[target] 置为 🎈，猜"气球"命中；再发一次 → repeat
  room.wall[room.target] = "🎈";
  const hit = room.submitWord(b, "我猜是红色气球！");
  assert.equal(hit.correct, true, "包含答案词即命中");
  assert.equal(room.players[1].wordHit, true);
  const rep = room.submitWord(b, "气球");
  assert.equal(rep.correct, true);
  assert.equal(rep.repeat, true, "重复命中标记 repeat，不再加分");
  // 换目标为 🚲：B 发"气球" → 词对但图错 → 不命中；C 发"自行车" → 命中
  room.wall[room.target] = "🚲";
  const wrongEmoji = room.submitWord(b, "气球");
  assert.equal(wrongEmoji.correct, false, "词对但图错 → 不命中");
  room.submitWord(c, "自行车");
  assert.equal(room.players[2].wordHit, true, "正确图命中");
  return sleep(3200).then(() => {
    const late = room.submitWord(b, "房子");
    assert.equal(late.err, "word_closed", "锁定窗口结束拒绝文字竞猜");
  });
});

test("最多 2 次选图：第 1 次错可再试 / 第 2 次锁定 / 答对即锁定", () => {
  const room = new Room("T2", { lockMs: 0, createMs: 100000 });
  room.addPlayer("A"); room.addPlayer("B");
  room.maxRounds = 2; room.startRound();
  const b = room.players[1].pid;
  const wrong = (room.target+1)%16;
  const g1 = room.submitGuess(b, wrong);
  assert.equal(g1.correct, false);
  assert.equal(g1.done, false, "第 1 次错未锁定，还有 1 次");
  assert.equal(g1.attempts, 1);
  const g2 = room.submitGuess(b, room.target);
  assert.equal(g2.correct, true);
  assert.equal(g2.done, true, "第 2 次锁定");
  assert.equal(g2.attempts, 2);
  const g3 = room.submitGuess(b, wrong);
  assert.equal(g3.err, "already_guessed", "锁定后拒绝");

  // 第 1 次答对直接锁定
  const room2 = new Room("T2b", { lockMs: 0, createMs: 100000 });
  room2.addPlayer("A"); room2.addPlayer("B");
  room2.maxRounds = 2; room2.startRound();
  const b2 = room2.players[1].pid;
  const ok = room2.submitGuess(b2, room2.target);
  assert.equal(ok.done, true, "答对即 final");
  assert.equal(ok.attempts, 1);
});

test("计分结算 v2：首答对 +3 / 后答对 +1 / 第 2 次对 +1 / 文字命中 +2 叠加 / 出题人按猜中人数去重 +1", async () => {
  const room = new Room("T3", { lockMs: 100000, createMs: 100000 });
  room.addPlayer("A"); room.addPlayer("B"); room.addPlayer("C");
  room.maxRounds = 3; room.startRound();           // R1 drawer = A
  const b = room.players[1].pid, c = room.players[2].pid;
  room.wall[room.target] = "🎈";                    // 目标图 = 🎈
  room.submitWord(b, "气球");                       // B 文字命中
  room.opts.lockMs = 0;                             // 文字窗口结束，开放选图
  room.submitGuess(b, room.target);                 // B 首答选图对
  await sleep(2);                                   // 时间戳防同毫秒竞争
  room.submitGuess(c, (room.target+1)%16);          // C 第 1 次错
  await sleep(2);
  room.submitGuess(c, room.target);                 // C 第 2 次对
  const rev = room.reveal();
  const by = Object.fromEntries(rev.results.map(r => [r.nickname, r]));
  assert.equal(by.B.points, 5, "文字 +2 与首答选图 +3 叠加");
  assert.equal(by.B.wordHit, true);
  assert.equal(by.B.first, true);
  assert.equal(by.C.points, 1, "第 2 次选图对 +1");
  assert.equal(by.C.attempts, 2);
  assert.equal(by.C.wordHit, false);
  assert.equal(by.A.points, 2, "出题人：B、C 各算 1 人猜中（B 文字+选图双中只算 1 人）");
  assert.equal(by.A.hitCount, 2);
  assert.equal(rev.scores[room.players[0].pid], 2);
});

test("文字命中但选图答错：仍计 +2，出题人仍算被猜中", () => {
  const room = new Room("T3b", { lockMs: 100000, createMs: 100000 });
  room.addPlayer("A"); room.addPlayer("B");
  room.maxRounds = 2; room.startRound();
  const b = room.players[1].pid;
  room.wall[room.target] = "🎈";
  room.submitWord(b, "气球");
  room.opts.lockMs = 0;
  room.submitGuess(b, 5);                            // 选图答错
  const rev = room.reveal();
  const by = Object.fromEntries(rev.results.map(r => [r.nickname, r]));
  assert.equal(by.B.points, 2, "文字命中 +2，选图错不再加");
  assert.equal(by.B.correct, false);
  assert.equal(by.A.points, 1, "文字命中也算被猜中");
});

test("首答判定：先答错者不占抢先奖励；第 2 次尝试最早答对仍可获首答", () => {
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
  assert.equal(by.B.attempts, 1);
  assert.equal(by.C.first, true, "先答错的不能占抢先奖励");
  assert.equal(by.C.points, 3);
  assert.equal(by.A.points, 1, "仅 1 人猜中");

  // 所有人都第 1 次答错后，B 第 2 次最早答对 → B 首答
  const room2 = new Room("T4b", { lockMs: 0, createMs: 100000 });
  room2.addPlayer("A"); room2.addPlayer("B"); room2.addPlayer("C");
  room2.maxRounds = 3; room2.startRound();
  const b2 = room2.players[1].pid, c2 = room2.players[2].pid;
  const w2 = (room2.target+1)%16;
  room2.submitGuess(b2, w2);                        // B 错（第 1 次）
  room2.submitGuess(c2, w2);                        // C 错（第 1 次）
  const g = room2.submitGuess(b2, room2.target);    // B 第 2 次对
  assert.equal(g.first, true, "最早选图正确者获首答");
  assert.equal(g.done, true);
});

test("全部最终锁定可提前揭晓；答错 1 次未锁定不算答完", () => {
  const room = new Room("T5", { lockMs: 0, createMs: 100000 });
  room.addPlayer("A"); room.addPlayer("B"); room.addPlayer("C");
  room.maxRounds = 3; room.startRound();
  const b = room.players[1].pid, c = room.players[2].pid;
  room.submitGuess(b, room.target);                  // B 答对 → final
  assert.equal(room.allAnswered(), false, "C 未 final");
  room.submitGuess(c, (room.target+1)%16);           // C 第 1 次错 → 未 final
  assert.equal(room.allAnswered(), false, "答错未锁定不算答完");
  room.submitGuess(c, room.target);                  // C 第 2 次对 → final
  assert.equal(room.allAnswered(), true, "全部 final");
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

test("重连恢复：rejoin 找回玩家、状态与文字命中标记", () => {
  const mgr = new RoomManager({ lockMs: 100000, createMs: 100000 });
  const { room, pid: a } = mgr.create("A");
  const b = mgr.join(room.id, "B").pid;
  room.maxRounds = 2; room.startRound();
  room.setCanvas(a, [{kind:"rect",x:1,y:2,w:3,h:4,rot:0,color:"#000"}]);
  room.wall[room.target] = "🎈";
  room.submitWord(b, "气球");
  room.removePlayer(b);
  const r = mgr.rejoin(room.id, b);
  assert.ok(!r.err, "重连成功");
  assert.equal(r.room.players.find(p=>p.pid===b).connected, true);
  const snap = r.room.snapshotFor(b);
  assert.equal(snap.canvas.els.length, 1, "画布保留");
  assert.equal(snap.round, 1);
  assert.equal(snap.target, undefined);
  assert.equal(snap.players.find(p=>p.pid===b).wordHit, true, "文字命中状态保留");
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

test("词表完整性：32 图全覆盖 / 无单字词 / 无跨图重复 / 归一化判定", () => {
  assert.equal(WORD_BANK.length, PHOTO_POOL.length, "词表与图片池一一对应（32）");
  const all = [];
  for(const list of WORD_BANK){
    assert.ok(list.length >= 2, `每图至少 2 个同义词（当前 ${list.length}）`);
    for(const w of list){
      assert.ok(w.length >= 2, `不收单字词：${w}`);
      assert.ok(!/[\s，。！？]/.test(w), `词条不含空白与标点：${w}`);
      all.push(normalizeWord(w));
    }
  }
  assert.equal(new Set(all).size, all.length, "词条不跨图重复");
  // 判定：包含即命中；单字闲聊不误判
  assert.equal(matchWord("红色气球").hit, true);
  assert.equal(matchWord("我猜是房子吧").hit, true);
  assert.equal(matchWord("大家加油").hit, false, "单字「家」不在词表，不误判");
  assert.equal(matchWord("随便说说").hit, false);
  assert.equal(matchWord("").hit, false);
  assert.equal(normalizeWord("  气球 ！"), "气球");
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

test("e2e：2 人完整对局（文字竞猜→2 次选图→揭晓→轮换→终局）", async () => {
  const { server, manager, ready, wss } = startServer(0, { lockMs: 150, createMs: 3000 });
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

  // 锁定窗口内：文字竞猜（猜题人 B）；选图被拒
  b.send({ t:"guess", cell: rsA.target });
  const lockedErr = await b.waitFor(m => m.t === "error");
  assert.equal(lockedErr.err, "locked");
  // 全词表文本必含目标图答案词 → 命中（词表判定本身由纯逻辑测试覆盖）
  const allWords = WORD_BANK.flat().join("  ");
  b.send({ t:"word", text:`这是${allWords}里的一个` });
  const wres = await b.waitFor(m => m.t === "word_res");
  assert.equal(wres.correct, true, "词表覆盖 32 图，全词表文本必命中");
  // 出题人 A 收到"有人文字命中"广播（不含词）
  const wh = await a.waitFor(m => m.t === "word_hit");
  assert.equal(wh.pid, joinedB.pid);
  assert.equal("text" in wh, false, "word_hit 不含答案词");
  assert.equal("word" in wh, false);

  // 解锁后：B 第 1 次选错 → 未锁定；第 2 次选对 → 首答锁定 → 自动揭晓
  await sleep(220);
  b.send({ t:"guess", cell: (rsA.target + 1) % 16 });
  const g1 = await b.waitFor(m => m.t === "guess_ok" && m.attempts === 1);
  assert.equal(g1.correct, false);
  assert.equal(g1.done, false, "第 1 次错未锁定");
  assert.equal(g1.maxAttempts, 2);
  const gstat0 = await a.waitFor(m => m.t === "guess_status" && m.answered === 0);
  assert.equal(gstat0.total, 1);

  b.send({ t:"guess", cell: rsA.target });
  const g2 = await b.waitFor(m => m.t === "guess_ok" && m.attempts === 2);
  assert.equal(g2.correct, true);
  assert.equal(g2.first, true, "B 是第一个选图正确者");
  assert.equal(g2.done, true);
  const gstat1 = await a.waitFor(m => m.t === "guess_status" && m.answered === 1);
  assert.equal(gstat1.total, 1);

  const revA = await a.waitFor(m => m.t === "reveal");
  const revB = await b.waitFor(m => m.t === "reveal");
  assert.equal(revA.state, "round_end");
  assert.equal(revA.answer, rsA.target, "揭晓答案");
  const aRes = revA.results.find(r => r.role === "drawer");
  assert.equal(aRes.points, 1, "出题人被猜中 +1（文字+选图双中只算 1 人）");
  const bRes = revA.results.find(r => r.role === "guesser");
  assert.equal(bRes.points, bRes.wordHit ? 5 : 3, "B 得分 = 文字 +2 与首答选图 +3 叠加");

  // 下一轮 → 角色交换
  b.send({ t:"next" });   // 非房主也可推进
  const rs2A = await a.waitFor(m => m.t === "round_start" && m.round === 2);
  const rs2B = await b.waitFor(m => m.t === "round_start" && m.round === 2);
  assert.equal(rs2B.drawer.nickname, "小红", "R2 小红出题");
  assert.equal("target" in rs2A, false, "R2 猜题人 A 无 target");
  assert.ok(Number.isInteger(rs2B.target), "R2 出题人 B 有 target");

  // R2：A 文字猜不中 → 第 1 次选对 → 揭晓 → game_over
  b.send({ t:"canvas", els:[] });
  await a.waitFor(m => m.t === "canvas");
  a.send({ t:"word", text:"随便猜猜" });
  const wres2 = await a.waitFor(m => m.t === "word_res");
  assert.equal(wres2.correct, false);
  await sleep(200);   // 等 R2 解锁窗口（lockMs 150）
  a.send({ t:"guess", cell: rs2B.target });
  const gokA = await a.waitFor(m => m.t === "guess_ok");
  assert.equal(gokA.correct, true);
  assert.equal(gokA.first, true);
  const rev2 = await b.waitFor(m => m.t === "reveal" && m.round === 2);
  assert.equal(rev2.state, "game_over");
  b.send({ t:"next" });
  const over = await a.waitFor(m => m.t === "game_over");
  assert.equal(over.winner.pid, joinedB.pid, "赢家是 R1 双中 5 分的小红");
  assert.equal(over.scores[over.winner.pid], 6, "B 总分 = R1(2+3) + R2 出题(1)");

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

test("e2e：房间列表只列等待中房间", async () => {
  const { server, manager, ready, wss } = startServer(0, { lockMs: 0, createMs: 10000 });
  await ready;
  const port = server.address().port;
  const base = `ws://127.0.0.1:${port}/ws`;
  const a = wsClient(base); await a.ready;
  const b = wsClient(base); await b.ready;
  const c = wsClient(base); await c.ready;

  a.send({ t:"create", nickname:"房主甲" });
  const r1 = await a.waitFor(m => m.t === "created");
  b.send({ t:"create", nickname:"房主乙" });
  const r2 = await b.waitFor(m => m.t === "created");

  // 未加入任何房间的 c 也能查列表
  c.send({ t:"list" });
  const lst = await c.waitFor(m => m.t === "list");
  assert.equal(lst.rooms.length, 2, "两个等待中的房间都在列表");
  const mine = lst.rooms.find(x => x.room_id === r1.room_id);
  assert.equal(mine.host, "房主甲");
  assert.equal(mine.players, 1);
  assert.equal(mine.max, 6);

  // 开局的房间不再出现在列表
  a.send({ t:"start" });   // 只有 1 人，应被拒
  await a.waitFor(m => m.t === "error");
  a.send({ t:"join", room_id: r2.room_id, nickname:"路人" });
  await a.waitFor(m => m.t === "joined");
  b.send({ t:"start" });
  await a.waitFor(m => m.t === "round_start");
  c.send({ t:"list" });
  const lst2 = await c.waitFor(m => m.t === "list");
  assert.equal(lst2.rooms.length, 1, "进行中的房间不再列出");
  assert.equal(lst2.rooms[0].room_id, r1.room_id);

  manager.disposeAll(); a.ws.close(); b.ws.close(); c.ws.close(); wss.close();
  await new Promise(res => server.close(res));
});
