# -*- coding: utf-8 -*-
"""server.js v3 规则补丁（完整版）：文字全程开放 + 选图不限次（错格✗+冷却）"""
import io, re

f = r"E:\巧手猜图游戏\pictures-web-game\server.js"
t = io.open(f, encoding="utf-8").read()

def sub(pattern, repl, tag, flags=re.S):
    global t
    n = len(re.findall(pattern, t, flags))
    t, cnt = re.subn(pattern, repl, t, count=1, flags=flags)
    print(f"{tag}: 匹配{n} 替换{cnt}")
    assert cnt == 1, f"FAIL {tag}"

# 1. ONLINE 配置：maxAttempts -> cooldownMs
sub(
    r'  maxAttempts: 2              // 选图机会上限（第 1 次对则结束，错可再试 1 次）',
    r'  cooldownMs: 10000           // 选图猜错后的冷却时长（冷却内不能再选图，可继续文字竞猜）',
    "ONLINE cooldownMs"
)

# 2. addPlayer 初始化：tried / lastWrongAt
sub(
    r'this\.players\.push\(\{ pid, nickname, score: 0, connected: true, guessed: null, wordHit: false \}\);',
    r'this.players.push({ pid, nickname, score: 0, connected: true, guessed: null, wordHit: false, tried: [], lastWrongAt: 0 });',
    "addPlayer init"
)

# 3. startRound 重置
sub(
    r'this\.players\.forEach\(p => \{ p\.guessed = null; p\.wordHit = false; \}\);',
    r'this.players.forEach(p => { p.guessed = null; p.wordHit = false; p.tried = []; p.lastWrongAt = 0; });',
    "startRound reset"
)

# 4. submitWord：去掉 lockMs 窗口检查（全程开放）
sub(
    r'  /\*\* 锁定窗口内的文字竞猜：不限次数，命中 \+wordBonus（可与选图叠加）；只在 lockMs 内开放 \*/',
    r'  /** 文字竞猜：整轮开放、不限次数，命中 +wordBonus（可与选图叠加） */',
    "submitWord header"
)
sub(
    r'    if\(Date\.now\(\) >= this\.roundStart \+ this\.opts\.lockMs\) return \{ err: "word_closed", msg: "文字竞猜已结束，请直接选图" \};\n',
    '',
    "submitWord 去 lockMs"
)

# 5. submitGuess 整体替换（含注释）
new_submit_guess = r'''  /**
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

  /** 结算本轮'''
sub(
    r'  /\*\*\n   \* 选图作答.*?\n  \}\n\n  /\*\* 结算本轮',
    new_submit_guess,
    "submitGuess 整体替换"
)

# 6. reveal attempts = 尝试总次数
sub(
    r'        attempts: p\.guessed \? p\.guessed\.attempts : 0,',
    r'        attempts: (p.tried||[]).length + (p.guessed ? 1 : 0),',
    "reveal attempts"
)

# 7. snapshotFor players：tried
sub(
    r'players: this\.players\.map\(p => \(\{ pid: p\.pid, nickname: p\.nickname, score: p\.score, connected: p\.connected, guessed: p\.guessed, wordHit: p\.wordHit \}\)\),',
    r'players: this.players.map(p => ({ pid: p.pid, nickname: p.nickname, score: p.score, connected: p.connected, guessed: p.guessed, wordHit: p.wordHit, tried: p.tried||[] })),',
    "snapshot tried"
)

# 8. 网络层 guess_ok 字段
sub(
    r'send\(\{ t:"guess_ok", correct: r\.correct, first: r\.first, answered: r\.answered, total: r\.total, attempts: r\.attempts, maxAttempts: r\.maxAttempts, done: r\.done \}\);',
    r'send({ t:"guess_ok", correct: r.correct, first: r.first, answered: r.answered, total: r.total, done: r.done, tried: r.tried||[] });',
    "guess_ok 消息"
)

io.open(f, "w", encoding="utf-8", newline="").write(t)
print("写入完成")
