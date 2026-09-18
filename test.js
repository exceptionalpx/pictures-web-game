"use strict";
/**
 * 巧手猜图联机服务端测试（node --test test.js）
 * 覆盖：房间生命周期 / 作答锁定 / 文字竞猜三级命中（准确+5/联想+2/类别+1）/ 选图不限次（错格✗+冷却）/
 *       计分结算 / 提前揭晓 / 出题轮换 / 终局 / 目标保密 / 重连恢复 / 房间列表 / 词表完整性 / 网络 e2e 全流程
 */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { WebSocket } = require("ws");
const { Room, RoomManager, startServer, IMAGES, PACK, matchLevel, normalizeWord } = require("./server.js");

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

test("作答锁定窗口：前 30 秒拒绝选图，解锁后放行", () => {
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

test("文字竞猜 v5：词条级去重 / 逐级升级累加 / 8 分封顶 / 未命中 / 错图不命中 / 解锁后仍可猜", async () => {
  const room = new Room("TW1", { lockMs: 50, createMs: 100000 });
  room.addPlayer("A"); room.addPlayer("B"); room.addPlayer("C");
  room.maxRounds = 2; room.startRound();
  const b = room.players[1].pid, c = room.players[2].pid;
  const miss = room.submitWord(b, "随便猜猜是什么");
  assert.equal(miss.correct, false, "未命中");
  // 目标图置为 IMAGES[0]（大象：exact=大象，keywords=[非洲,长鼻]，category_word=动物）
  room.wall[room.target] = IMAGES[0];
  // 先类别词 +1，再准确词 +5：逐级升级，不被低层级锁死
  const cat1 = room.submitWord(b, "动物");
  assert.equal(cat1.correct, true);
  assert.equal(cat1.level, "category", "类别词命中");
  assert.equal(cat1.pts, 1, "类别词 +1");
  assert.equal(cat1.total, 1, "累计 1 分");
  const ex = room.submitWord(b, "我猜是非洲大象！");
  assert.equal(ex.correct, true, "包含准确词即命中");
  assert.equal(ex.level, "exact", "准确词优先，不被先前类别词锁定");
  assert.equal(ex.pts, 5, "准确词 +5");
  assert.equal(ex.total, 6, "累计 6 分（1+5）");
  // 词条级去重：同一词条再答 → repeat 不加分
  const rep = room.submitWord(b, "大象");
  assert.equal(rep.correct, true);
  assert.equal(rep.repeat, true, "同一词条重复 → repeat");
  assert.equal(rep.pts, 0, "重复不加分");
  // 联想词再 +2 → 累计 8 分封顶
  const kw = room.submitWord(b, "非洲");
  assert.equal(kw.correct, true, "联想词命中");
  assert.equal(kw.level, "keyword");
  assert.equal(kw.pts, 2, "联想词 +2");
  assert.equal(kw.total, 8, "累计 8 分");
  const cap = room.submitWord(b, "长鼻");
  assert.equal(cap.correct, true);
  assert.equal(cap.repeat, true, "已到 8 分封顶 → repeat");
  assert.equal(cap.pts, 0, "封顶不加分");
  assert.equal(cap.msg, "本轮文字分已满", "封顶提示");
  // 换目标为自行车图：B 发"大象" → 词对但图错 → 不命中；C 发联想词 → keyword 命中
  const bike = IMAGES.find(g => g.exact === "自行车");
  assert.ok(bike, "64 图含自行车");
  room.wall[room.target] = bike;
  const wrongEmoji = room.submitWord(b, "大象");
  assert.equal(wrongEmoji.correct, false, "词对但图错 → 不命中");
  const kw2 = room.submitWord(c, "我去骑行锻炼");
  assert.equal(kw2.correct, true, "联想词命中");
  assert.equal(kw2.level, "keyword");
  assert.equal(kw2.pts, 2, "联想词 +2");
  // C 再答类别词（新词条）→ 累加 +1（不同词条可累加）
  const cat2 = room.submitWord(c, "交通工具");
  assert.equal(cat2.correct, true);
  assert.equal(cat2.level, "category", "不同词条可累加");
  assert.equal(cat2.pts, 1, "类别词 +1");
  assert.equal(cat2.total, 3, "累计 3 分（2+1）");
  // 锁定窗口结束后（解锁后）文字竞猜仍开放
  return sleep(80).then(() => {
    const late = room.submitWord(b, "自行车");
    assert.equal(late.err, undefined, "解锁后文字竞猜仍开放");
    assert.equal(late.correct, true, "解锁后命中仍有效");
    assert.equal(late.level, "exact");
  });
});

test("文字竞猜优先级：输入含准确词按 +5 而非联想/类别；输入含联想词按 +2 而非类别", () => {
  const e = IMAGES[0];   // 大象
  assert.equal(matchLevel("非洲", e).level, "keyword");
  assert.equal(matchLevel("动物", e).level, "category");
  assert.equal(matchLevel("非洲大象", e).level, "exact", "准确词优先于联想词");
  assert.equal(matchLevel("动物大象", e).level, "exact", "准确词优先于类别词");
  assert.equal(matchLevel("动物世界", e).level, "category");
  assert.equal(matchLevel("长颈鹿", e).hit, false, "他图准确词不命中");
  assert.equal(matchLevel("", e).hit, false);
});

test("选图不限次数：多次试错不锁定 / 已试格拒绝 / 答对即锁定", () => {
  const room = new Room("T2", { lockMs: 0, createMs: 100000, cooldownMs: 0 });
  room.addPlayer("A"); room.addPlayer("B");
  room.maxRounds = 2; room.startRound();
  const b = room.players[1].pid;
  const wrongs = [(room.target+1)%16, (room.target+2)%16, (room.target+3)%16];
  for(const w of wrongs){
    const g = room.submitGuess(b, w);
    assert.equal(g.correct, false);
    assert.equal(g.done, false, "错误不锁定，可继续尝试");
    assert.ok(g.tried.includes(w), "已试格被记录");
  }
  const rep = room.submitGuess(b, wrongs[0]);
  assert.equal(rep.err, "tried", "已试格拒绝重复点选");
  const ok = room.submitGuess(b, room.target);
  assert.equal(ok.correct, true);
  assert.equal(ok.done, true, "答对即锁定");
  assert.equal(ok.tried.length, 3, "锁定前已试 3 格");
  const after = room.submitGuess(b, wrongs[1]);
  assert.equal(after.err, "already_guessed", "锁定后拒绝");
});

test("选图冷却：猜错后进入冷却，冷却内拒绝，冷却后放行", async () => {
  const room = new Room("T2c", { lockMs: 0, createMs: 100000, cooldownMs: 300 });
  room.addPlayer("A"); room.addPlayer("B");
  room.maxRounds = 2; room.startRound();
  const b = room.players[1].pid;
  const w1 = (room.target+1)%16, w2 = (room.target+2)%16;
  room.submitGuess(b, w1);                       // 猜错 → 进入 300ms 冷却
  const cd = room.submitGuess(b, w2);
  assert.equal(cd.err, "cooldown", "冷却中拒绝再选");
  assert.ok(cd.remain > 0 && cd.remain <= 300, "返回剩余冷却");
  return sleep(360).then(() => {
    const again = room.submitGuess(b, w2);
    assert.ok(!again.err, "冷却结束可再选");
    assert.equal(again.correct, false, "仍可选错继续尝试");
    return sleep(360).then(() => {   // 第二次错误又进入冷却，等冷却过再选目标
      const ok = room.submitGuess(b, room.target);
      assert.equal(ok.correct, true);
    });
  });
});

test("计分结算：首答对 +3 / 后答对 +1 / 多次试错后对仍 +1 / 文字准确词 +5 叠加 / 出题人按猜中人数去重 +1", async () => {
  const room = new Room("T3", { lockMs: 0, createMs: 100000, cooldownMs: 0 });
  room.addPlayer("A"); room.addPlayer("B"); room.addPlayer("C");
  room.maxRounds = 3; room.startRound();           // R1 drawer = A
  const b = room.players[1].pid, c = room.players[2].pid;
  room.wall[room.target] = IMAGES[0];               // 目标图 = 大象（准确词 +5）
  room.submitWord(b, "大象");                       // B 文字命中（exact +5）
  room.submitGuess(b, room.target);                 // B 首答选图对
  await sleep(2);                                   // 时间戳防同毫秒竞争
  room.submitGuess(c, (room.target+1)%16);          // C 第 1 次错
  await sleep(2);
  room.submitGuess(c, (room.target+2)%16);          // C 第 2 次错
  await sleep(2);
  room.submitGuess(c, room.target);                 // C 第 3 次对
  const rev = room.reveal();
  const by = Object.fromEntries(rev.results.map(r => [r.nickname, r]));
  assert.equal(by.B.points, 8, "文字准确词 +5 与首答选图 +3 叠加");
  assert.equal(by.B.wordPts, 5, "文字分按层级 5 记录");
  assert.equal(by.B.wordHit, true);
  assert.equal(by.B.first, true);
  assert.equal(by.C.points, 1, "多次试错后选图对仍 +1");
  assert.equal(by.C.attempts, 3, "尝试次数 = 2 次错误 + 1 次正确");
  assert.equal(by.C.wordHit, false);
  assert.equal(by.A.points, 2, "出题人：B、C 各算 1 人猜中（B 文字+选图双中只算 1 人）");
  assert.equal(by.A.hitCount, 2);
  assert.equal(rev.scores[room.players[0].pid], 2);
});

test("文字命中按层级计分：联想 +2 / 类别 +1 分别叠加选图分", async () => {
  const room = new Room("T3k", { lockMs: 0, createMs: 100000, cooldownMs: 0 });
  room.addPlayer("A"); room.addPlayer("B"); room.addPlayer("C");
  room.maxRounds = 3; room.startRound();
  const b = room.players[1].pid, c = room.players[2].pid;
  room.wall[room.target] = IMAGES[0];               // 大象：keywords=[非洲,长鼻] / category=动物
  room.submitWord(b, "非洲草原");                   // B 联想词 +2
  room.submitWord(c, "动物世界");                   // C 类别词 +1
  room.submitGuess(b, room.target);                 // B 首答选图对
  const rev = room.reveal();
  const by = Object.fromEntries(rev.results.map(r => [r.nickname, r]));
  assert.equal(by.B.points, 5, "联想 +2 与首答选图 +3 叠加");
  assert.equal(by.B.wordPts, 2);
  assert.equal(by.C.points, 1, "类别 +1，选图未对不加不减");
  assert.equal(by.C.wordPts, 1);
});

test("文字命中但选图全错：仍计层级分，出题人仍算被猜中，不锁定不扣分", () => {
  const room = new Room("T3b", { lockMs: 0, createMs: 100000, cooldownMs: 0 });
  room.addPlayer("A"); room.addPlayer("B");
  room.maxRounds = 2; room.startRound();
  const b = room.players[1].pid;
  room.wall[room.target] = IMAGES[0];
  room.submitWord(b, "大象");
  room.submitGuess(b, 5);                            // 选图答错
  const rev = room.reveal();
  const by = Object.fromEntries(rev.results.map(r => [r.nickname, r]));
  assert.equal(by.B.points, 5, "文字准确词 +5，选图错不加不减");
  assert.equal(by.B.guessed, null, "答错未锁定，无最终答案");
  assert.equal(by.B.attempts, 1);
  assert.equal(by.A.points, 1, "文字命中也算被猜中");
});

test("首答判定：先答错者不占抢先奖励；多次尝试后最早答对仍可获首答", () => {
  const room = new Room("T4", { lockMs: 0, createMs: 100000, cooldownMs: 0 });
  room.addPlayer("A"); room.addPlayer("B"); room.addPlayer("C");
  room.maxRounds = 3; room.startRound();
  const b = room.players[1].pid, c = room.players[2].pid;
  const wrong = (room.target+1)%16;
  room.submitGuess(b, wrong);                       // B 先答但答错
  room.submitGuess(c, room.target);                 // C 首答对
  const rev = room.reveal();
  const by = Object.fromEntries(rev.results.map(r => [r.nickname, r]));
  assert.equal(by.B.points, 0, "答错 0 分");
  assert.equal(by.B.guessed, null, "答错未锁定");
  assert.equal(by.B.attempts, 1);
  assert.equal(by.C.first, true, "先答错的不能占抢先奖励");
  assert.equal(by.C.points, 3);
  assert.equal(by.A.points, 1, "仅 1 人猜中");

  // 所有人都第 1 次答错后，B 第 2 次最早答对 → B 首答
  const room2 = new Room("T4b", { lockMs: 0, createMs: 100000, cooldownMs: 0 });
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

test("全部最终锁定可提前揭晓；答错未锁定不算答完", () => {
  const room = new Room("T5", { lockMs: 0, createMs: 100000, cooldownMs: 0 });
  room.addPlayer("A"); room.addPlayer("B"); room.addPlayer("C");
  room.maxRounds = 3; room.startRound();
  const b = room.players[1].pid, c = room.players[2].pid;
  room.submitGuess(b, room.target);                  // B 答对 → 锁定
  assert.equal(room.allAnswered(), false, "C 未锁定");
  room.submitGuess(c, (room.target+1)%16);           // C 第 1 次错 → 未锁定
  assert.equal(room.allAnswered(), false, "答错未锁定不算答完");
  room.submitGuess(c, room.target);                  // C 第 2 次对 → 锁定
  assert.equal(room.allAnswered(), true, "全部锁定");
  const rev = room.reveal();
  assert.equal(rev.state, "round_end");
});

test("出题人轮换 + 终局结算", () => {
  const room = new Room("T6", { lockMs: 0, createMs: 100000, cooldownMs: 0 });
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
  assert.ok(room.wall.every(g => g && g.id && g.img && g.exact), "wall 为 64 图对象");
  assert.equal(room.wall.length, 16, "每轮抽 16 张");
  const ids = room.wall.map(g => g.id);
  assert.equal(new Set(ids).size, 16, "16 张不重复");
});

test("重连恢复：rejoin 找回玩家、状态、文字命中标记与已试格", () => {
  const mgr = new RoomManager({ lockMs: 0, createMs: 100000, cooldownMs: 0 });
  const { room, pid: a } = mgr.create("A");
  const b = mgr.join(room.id, "B").pid;
  room.maxRounds = 2; room.startRound();
  room.setCanvas(a, [{kind:"rect",x:1,y:2,w:3,h:4,rot:0,color:"#000"}]);
  room.wall[room.target] = IMAGES[0];
  room.submitWord(b, "大象");
  const wrong = (room.target+1)%16;
  room.submitGuess(b, wrong);                        // B 选图错 → tried 记录
  room.removePlayer(b);
  const r = mgr.rejoin(room.id, b);
  assert.ok(!r.err, "重连成功");
  assert.equal(r.room.players.find(p=>p.pid===b).connected, true);
  const snap = r.room.snapshotFor(b);
  assert.equal(snap.canvas.els.length, 1, "画布保留");
  assert.equal(snap.round, 1);
  assert.equal(snap.target, undefined);
  const pb = snap.players.find(p=>p.pid===b);
  assert.equal(pb.wordHit, true, "文字命中状态保留");
  assert.equal(pb.tried.length, 1, "已试格保留");
  assert.equal(pb.tried[0], wrong);
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

test("画布元素扩展：12 种 kind + opacity/rot 透传 / 非法与超限拒绝", () => {
  const room = new Room("T8b", { lockMs: 0, createMs: 100000 });
  room.addPlayer("A"); room.addPlayer("B");
  room.maxRounds = 2; room.startRound();
  const d = room.players[0].pid;
  const els = [
    {kind:"circle",x:10,y:20,w:90,h:90,rot:0,color:"#E03131",opacity:0.7},
    {kind:"crescent",x:30,y:40,w:90,h:90,rot:45,color:"#2980B9",opacity:0.5},
    {kind:"arrow",x:50,y:60,w:100,h:90,rot:0,color:"#2F9E44",opacity:1}
  ];
  const r = room.setCanvas(d, els);
  assert.equal(r.ok, true);
  assert.equal(room.canvas.els.length, 3, "12 形状元素透传");
  assert.equal(room.canvas.els[1].opacity, 0.5, "opacity 透传");
  assert.equal(room.canvas.els[1].rot, 45, "rot 透传");
  const bad = room.setCanvas(d, "notarray");
  assert.equal(bad.err, "invalid", "非数组拒绝");
  const over = room.setCanvas(d, els.concat(Array.from({length:60},()=>els[0])));
  assert.equal(over.err, "invalid", "超上限拒绝");
});

test("词表完整性：64 图 8 类全覆盖 / 三级词非空 / 无单字词 / 全库唯一 / 无跨层重叠", () => {
  assert.equal(IMAGES.length, 64, "64 张图");
  assert.equal(PACK.scoring.category_word, 1, "类别词 1 分");
  assert.equal(PACK.scoring.keyword, 2, "联想词 2 分");
  assert.equal(PACK.scoring.exact, 5, "准确词 5 分");
  const cats = new Set(IMAGES.map(g => g.category));
  assert.equal(cats.size, 8, "8 个类别");
  for(const g of IMAGES){
    assert.ok(g.exact && g.exact.length >= 2, `准确词≥2字：${g.id}`);
    assert.equal(g.keywords.length, 2, `每图 2 个联想词：${g.id}`);
    for(const k of g.keywords){
      assert.ok(k.length >= 2, `联想词≥2字：${k}`);
      assert.ok(!/[\s\u3000，。！？]/.test(k), `联想词无空白标点：${k}`);
    }
    assert.ok(g.category_word.length >= 2, `类别词≥2字：${g.id}`);
    assert.ok(g.img && g.img.startsWith("/images/"), `图片路径：${g.id}`);
    assert.ok(!g.keywords.includes(g.exact), `exact 不在自身联想词：${g.exact}`);
    assert.ok(g.category_word !== g.exact, `exact 不等于自身类别词：${g.exact}`);
  }
  // 全库唯一：exact、联想词各自不跨图重复
  const allExact = IMAGES.map(g => normalizeWord(g.exact));
  assert.equal(new Set(allExact).size, 64, "准确词全库唯一");
  const allKw = IMAGES.flatMap(g => g.keywords.map(normalizeWord));
  assert.equal(new Set(allKw).size, allKw.length, "联想词全库唯一");
  // exact 不得与他图联想词/类别词重叠（保证命中优先级无歧义）
  for(const g of IMAGES){
    for(const other of IMAGES){
      if(other.id === g.id) continue;
      assert.ok(!other.keywords.includes(g.exact), `exact「${g.exact}」不得出现在他图联想词`);
      assert.ok(other.category_word !== g.exact, `exact「${g.exact}」不得等于他图类别词`);
    }
  }
  // 判定：包含即命中；单字闲聊不误判
  const e = IMAGES.find(g => g.exact === "大象");
  assert.equal(matchLevel("红色气球", e).hit, false, "图不对不命中");
  assert.equal(matchLevel("大家加油", e).hit, false, "单字「家」不在词表，不误判");
  assert.equal(matchLevel("随便说说", e).hit, false);
  assert.equal(matchLevel("", e).hit, false);
  assert.equal(normalizeWord("  大象 ！"), "大象");
});

test("词表 v4：aliases 非空 / exact 不包含于联想词与别名 / 冲浪子串重叠已修复 / thumb 字段齐全", () => {
  assert.equal(PACK.version, 4, "词表版本 v4");
  const surf = IMAGES.find(g => g.id === "spt-surfing");
  assert.ok(surf, "冲浪图存在");
  assert.ok(!surf.keywords.includes("冲浪板"), "冲浪keyword 不再含「冲浪板」（exact「冲浪」是其子串会抢占层级）");
  assert.ok(surf.keywords.includes("海浪"), "冲浪keyword 已替换为「海浪」");
  for(const g of IMAGES){
    assert.ok(Array.isArray(g.aliases) && g.aliases.length >= 1, `每图至少 1 个别名：${g.id}`);
    assert.ok(g.thumb && g.thumb === "/images-thumb/" + g.id + ".jpg", `thumb 路径：${g.id}`);
    // exact 不得包含于本图任一联想词/别名（否则该词会被 exact 抢占层级）
    for(const w of [...g.keywords, ...g.aliases]){
      assert.ok(!w.includes(g.exact), `exact「${g.exact}」不是「${w}」的子串（${g.id}）`);
    }
    // 别名不与同图联想词/类别词重复
    for(const a of g.aliases){
      assert.ok(!g.keywords.includes(a), `别名「${a}」不与联想词重复（${g.id}）`);
      assert.ok(a !== g.category_word, `别名「${a}」不等于类别词（${g.id}）`);
    }
  }
  // 全库 aliases 去空白标点
  for(const g of IMAGES){
    for(const a of g.aliases){
      assert.ok(!/[\s　，。！？]/.test(a), `别名无空白标点：${a}`);
    }
  }
});

test("文字竞猜 v4：近似名 aliases 命中按联想词 +2 / 优先级不降级", () => {
  const elephant = IMAGES.find(g => g.exact === "大象");
  const shark = IMAGES.find(g => g.exact === "鲨鱼");
  const lighthouse = IMAGES.find(g => g.exact === "灯塔");
  const sailboat = IMAGES.find(g => g.exact === "帆船");
  const surfing = IMAGES.find(g => g.id === "spt-surfing");
  assert.equal(matchLevel("象", elephant).level, "keyword", "「象」别名 → 联想层级");
  assert.equal(matchLevel("象", elephant).pts, 2, "别名按联想词 +2");
  assert.equal(matchLevel("大白鲨", shark).level, "keyword", "「大白鲨」别名 → 联想层级");
  assert.equal(matchLevel("塔", lighthouse).level, "keyword", "「塔」别名 → 联想层级");
  assert.equal(matchLevel("船", sailboat).level, "keyword", "「船」别名 → 联想层级");
  assert.equal(matchLevel("大象", elephant).level, "exact", "准确词仍最高优先级 +5");
  assert.equal(matchLevel("动物", elephant).level, "category", "类别词仍 +1");
  // 冲浪：答「冲浪板」命中 exact「冲浪」（子串）→ exact+5 属宽容；答「踏浪」→ 别名 +2
  assert.equal(matchLevel("踏浪", surfing).level, "keyword", "「踏浪」别名 → +2");
  assert.equal(matchLevel("海浪", surfing).level, "keyword", "「海浪」联想词 → +2");
  // 别名不跨图误中：他图精确词不命中
  assert.equal(matchLevel("大白鲨", elephant).hit, false, "他图别名不误中");
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
    queue,
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

test("e2e：2 人完整对局（文字三级竞猜→无限次选图+冷却→揭晓→轮换→终局）", async () => {
  const { server, manager, ready, wss } = startServer(0, { lockMs: 150, createMs: 3000, cooldownMs: 60 });
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
  assert.equal(created.wall.length, 0, "开局前 wall 为空（开局时从 64 图抽 16 张）");

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
  assert.ok(Number.isInteger(rsA.target), "出题人收到秘密目标索引");
  assert.equal("target" in rsB, false, "猜题人 round_start 无 target");
  assert.equal(rsB.drawer.nickname, "阿明");
  assert.equal(rsA.wall.length, 16, "开局抽 16 张");
  assert.ok(rsA.wall[0].img && rsA.wall[0].zh, "round_start 带照片墙对象");
  assert.equal(new Set(rsA.wall.map(g => g.id)).size, 16, "16 张不重复");

  // 出题人画布 → 猜题人实时收到
  a.send({ t:"canvas", els:[{kind:"rect",x:10,y:20,w:30,h:40,rot:0,color:"#000"}] });
  const cv = await b.waitFor(m => m.t === "canvas");
  assert.equal(cv.els.length, 1);

  // 锁定窗口内：选图被拒；文字竞猜命中（全词表文本必中 exact 层级）
  b.send({ t:"guess", cell: rsA.target });
  const lockedErr = await b.waitFor(m => m.t === "error");
  assert.equal(lockedErr.err, "locked");
  const allWords = IMAGES.flatMap(g => [g.exact, ...g.keywords, g.category_word]).join("  ");
  b.send({ t:"word", text:`这是${allWords}里的一个` });
  const wres = await b.waitFor(m => m.t === "word_res");
  assert.equal(wres.correct, true, "64 图全词表文本必命中");
  assert.equal(wres.level, "exact", "文本含准确词 → 最高层级");
  assert.equal(wres.pts, 5);
  assert.ok(wres.word, "返回命中的词给提交者本人");
  const wh = await a.waitFor(m => m.t === "word_hit");
  assert.equal(wh.pid, joinedB.pid);
  assert.equal(wh.level, "exact", "广播含层级，不含词");
  assert.equal("text" in wh, false, "word_hit 不含答案词");
  assert.equal("word" in wh, false);

  // 出题人专属 word_view：命中含猜词内容、层级与分值（不给其他猜题人）
  const wvHit = await a.waitFor(m => m.t === "word_view" && m.correct === true);
  assert.equal(wvHit.nickname, "小红");
  assert.ok(wvHit.word, "出题人看到猜词内容");
  assert.equal(wvHit.level, "exact");
  assert.equal(wvHit.pts, 5);

  // 未命中词也实时给出题人
  b.send({ t:"word", text:"完全猜不到的东西" });
  const missRes = await b.waitFor(m => m.t === "word_res" && m.correct === false);
  assert.equal(missRes.correct, false);
  const wvMiss = await a.waitFor(m => m.t === "word_view" && m.correct === false);
  assert.equal(wvMiss.nickname, "小红");
  assert.ok(wvMiss.word.includes("完全猜不到"), "未命中词也实时给出题人");
  assert.equal(b.queue.some(m => m.t === "word_view"), false, "word_view 只发给出题人");

  // 解锁后：B 选错 → 未锁定 + tried 记录；重复点已试格被拒；冷却中再选被拒
  await sleep(220);
  const wrong = (rsA.target + 1) % 16;
  b.send({ t:"guess", cell: wrong });
  const g1 = await b.waitFor(m => m.t === "guess_ok");
  assert.equal(g1.correct, false);
  assert.equal(g1.done, false, "选错未锁定，可继续");
  assert.ok(g1.tried.includes(wrong), "已试格返回给前端");
  const gstat0 = await a.waitFor(m => m.t === "guess_status" && m.answered === 0);
  assert.equal(gstat0.total, 1, "答错不算已锁定");
  // 出题人专属 guess_view：选图对错实时可见
  const gvWrong = await a.waitFor(m => m.t === "guess_view" && m.correct === false);
  assert.equal(gvWrong.pid, joinedB.pid);
  assert.equal(gvWrong.cell, wrong);
  assert.equal(gvWrong.first, false);

  b.send({ t:"guess", cell: wrong });
  const triedErr = await b.waitFor(m => m.t === "error");
  assert.equal(triedErr.err, "tried", "已试格拒绝");
  b.send({ t:"guess", cell: (rsA.target + 2) % 16 });
  const cdErr = await b.waitFor(m => m.t === "error");
  assert.equal(cdErr.err, "cooldown", "冷却中拒绝再选");
  assert.ok(cdErr.remain > 0, "返回剩余冷却");

  // 冷却结束后选对 → 首答锁定 → 自动揭晓
  await sleep(120);   // cooldownMs 60 已过
  b.send({ t:"guess", cell: rsA.target });
  const g2 = await b.waitFor(m => m.t === "guess_ok" && m.correct === true);
  assert.equal(g2.first, true, "B 是第一个选图正确者");
  assert.equal(g2.done, true);
  assert.equal(g2.tried.length, 1, "tried 保留已试格");
  const gstat1 = await a.waitFor(m => m.t === "guess_status" && m.answered === 1);
  assert.equal(gstat1.total, 1);
  // 选图正确的 guess_view 只发给出题人
  const gvRight = await a.waitFor(m => m.t === "guess_view" && m.correct === true);
  assert.equal(gvRight.cell, rsA.target);
  assert.equal(gvRight.first, true);
  assert.equal(b.queue.some(m => m.t === "guess_view"), false, "guess_view 只发给出题人");

  const revA = await a.waitFor(m => m.t === "reveal");
  const revB = await b.waitFor(m => m.t === "reveal");
  assert.equal(revA.state, "round_end");
  assert.equal(revA.answer, rsA.target, "揭晓答案索引");
  assert.ok(revA.answerLabel.includes(" "), "揭晓含坐标与中文主题");
  assert.ok(revA.answerImg && revA.answerImg.startsWith("/images/"), "揭晓含答案图片");
  const aRes = revA.results.find(r => r.role === "drawer");
  assert.equal(aRes.points, 1, "出题人被猜中 +1（文字+选图双中只算 1 人）");
  const bRes = revA.results.find(r => r.role === "guesser");
  assert.equal(bRes.wordPts, 5, "B 文字命中层级分 5");
  assert.equal(bRes.points, bRes.wordPts + 3, "B 得分 = 文字层级分 + 首答选图 +3");
  assert.equal(bRes.attempts, 2, "尝试次数 = 1 次错误 + 1 次正确");

  // 下一轮 → 角色交换
  b.send({ t:"next" });   // 非房主也可推进
  const rs2A = await a.waitFor(m => m.t === "round_start" && m.round === 2);
  const rs2B = await b.waitFor(m => m.t === "round_start" && m.round === 2);
  assert.equal(rs2B.drawer.nickname, "小红", "R2 小红出题");
  assert.equal("target" in rs2A, false, "R2 猜题人 A 无 target");
  assert.ok(Number.isInteger(rs2B.target), "R2 出题人 B 有 target");

  // R2：A 文字猜不中 → 解锁后选对 → 揭晓 → game_over
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
  assert.equal(over.winner.pid, joinedB.pid, "赢家是 R1 双中的小红");
  assert.equal(over.scores[over.winner.pid], 9, "B 总分 = R1(准确词5+首答3) + R2 出题(1)");

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

test("e2e：断线重连恢复画布、身份与已试格", async () => {
  const { server, manager, ready, wss } = startServer(0, { lockMs: 0, createMs: 10000, cooldownMs: 0 });
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
  b.send({ t:"guess", cell: (rsA.target+1)%16 });    // B 选错 → tried
  await b.waitFor(m => m.t === "guess_ok");

  // B 断线后重连
  b.ws.close();
  await sleep(120);
  const b2 = wsClient(base); await b2.ready;
  b2.send({ t:"rejoin", room_id: created.room_id, pid: joinedB.pid });
  const rejoined = await b2.waitFor(m => m.t === "joined");
  assert.equal(rejoined.round, 1, "回合保留");
  assert.equal(rejoined.canvas.els[0].glyph, "⭐", "画布保留");
  assert.equal("target" in rejoined, false, "重连仍无 target");
  assert.equal(rejoined.players.find(p=>p.pid===joinedB.pid).tried.length, 1, "已试格保留");
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
