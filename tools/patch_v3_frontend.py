# -*- coding: utf-8 -*-
"""前端 v3 补丁：锁定期隐藏照片墙 + 猜测记录 + 无限次选图（错格✗+冷却） + 游客自动连接 + onlinetest 更新"""
import io, re

f = r"E:\巧手猜图游戏\pictures-web-game\巧手猜图-Demo.html"
t = io.open(f, encoding="utf-8").read()

def sub(pattern, repl, tag, flags=re.S):
    global t
    n = len(re.findall(pattern, t, flags))
    t, cnt = re.subn(pattern, repl, t, count=1, flags=flags)
    print(f"{tag}: 匹配{n} 替换{cnt}")
    assert cnt == 1, f"FAIL {tag}"

# ---------- 1. 入口页规则文案 v3 ----------
sub(
    r'    <div class="sub">2–6 人同房：一人拼剪影，其他人实时观看；前 30 秒可无限次文字竞猜（猜中 \+2），之后点选照片作答（最多 2 次，首答 \+3 / 猜中 \+1），出题人被猜中 \+1，轮流出题。</div>',
    r'    <div class="sub">2–6 人同房：一人拼剪影，其他人实时观看。前 30 秒隐藏照片墙，凭画布无限次文字竞猜（猜中 +2）；之后照片墙开放，点选照片作答不限次数（猜错该格 ✗ + 10s 冷却，首答 +3 / 猜中 +1），出题人被猜中 +1，轮流出题。</div>',
    "入口文案"
)

# ---------- 2. 大厅规则说明 v3 ----------
sub(
    r'    <div class="note">规则：每轮一人出题 90 秒；前 30 秒作答锁定（只能看）；每人每轮 1 次作答，提交即锁定；首答对 \+3、其余 \+1、出题人被猜中 \+1；轮流出题，总分最高者胜。</div>',
    r'    <div class="note">规则：每轮一人出题 90 秒；前 30 秒照片墙隐藏，凭画布无限次文字竞猜（猜中 +2）；之后照片墙开放，选图不限次数（猜错该格 ✗ + 10s 冷却），首答对 +3、其余 +1、出题人被猜中 +1；轮流出题，总分最高者胜。</div>',
    "大厅文案"
)

# ---------- 3. handle error 分支：cooldown/tried 特化 ----------
sub(
    r'''      case "error":
        toast\(m\.msg\|\|"操作失败"\); break;''',
    r'''      case "error":
        if(m.err==="cooldown" && window.__pwCooldownMsg) window.__pwCooldownMsg(m.remain);
        else if(m.err==="tried") toast(m.msg||"这张照片试过了");
        else toast(m.msg||"操作失败"); break;''',
    "handle error"
)

# ---------- 4. renderOnline：游客自动连接 ----------
sub(
    r'''  if\(__PW\.ws&&__PW\.ws\.readyState===1\) loadRooms\(\);''',
    r'''  if(__PW.ws&&__PW.ws.readyState===1){ loadRooms(); }
  else if(!window.__pwNoAutoConnect){ // 游客自动连接，解锁在线房间列表
    window.__pwRooms=(m)=>{ const box=document.querySelector("#pw-rooms"); if(box && m.rooms){ if(!m.rooms.length){ box.innerHTML='<div class="note">暂无等待中的房间，创建一个吧</div>'; } else { box.innerHTML=""; m.rooms.forEach(rm=>{ const row=html("div",{class:"review-item"}); row.innerHTML=`<div><b>${rm.host||"匿名"}</b><div class="sub">房间码 ${rm.room_id} · ${rm.players}/${rm.max} 人</div></div><button class="primary" id="pw-join-${rm.room_id}">加入</button>`; box.appendChild(row); row.querySelector(`#pw-join-${rm.room_id}`).onclick=()=>{ __PW.nickname=nick()||("玩家"+Math.floor(Math.random()*900+100)); pwConnect(()=>__PW.send({t:"join",room_id:rm.room_id,nickname:__PW.nickname})); }; }); } } };
    pwConnect(()=>{ if(window.__pwRooms) window.__pwRooms({rooms:[]}); loadRooms(); });
  }''',
    "游客自动连接"
)

# ---------- 5. renderOnlineGuess 整体替换 ----------
new_guess = r'''function renderOnlineGuess(){
  $app.innerHTML="";
  const w=html("div",{class:"wrap"});
  const card=html("div",{class:"card"});
  card.innerHTML=`
    <h1>${__PW.drawer.nickname||"对方"} 正在拼图…</h1>
    <div class="qbar">第 ${__PW.round} 轮 · 出题人：${__PW.drawer.nickname||"？"} · <span id="pw-gtimer">--:--</span></div>
    <div class="guess-stage"><svg class="stage" id="pw-gstage"></svg></div>
    <div class="word-row" id="pw-wordrow" style="display:flex;gap:8px;margin-top:10px">
      <input id="pw-word" placeholder="猜它是什么，如：气球" maxlength="30" autocomplete="off" style="flex:1;border:1.5px solid var(--line);border-radius:10px;padding:10px 12px;font-size:15px;background:#FCFBF8;color:var(--ink)">
      <button class="primary" id="pw-wordsend">猜！</button>
    </div>
    <div id="pw-records" style="margin-top:8px"></div>
    <div class="confirm-bar" id="pw-gbar"><span class="sub">文字竞猜中…猜中 +2 分，照片墙 30 秒后开放</span></div>
    <div id="pw-photo-holder"></div>`;
  w.appendChild(card);$app.appendChild(w);
  const svg=card.querySelector("#pw-gstage"), wallHolder=card.querySelector("#pw-photo-holder"),
    bar=card.querySelector("#pw-gbar"), recEl=card.querySelector("#pw-records");
  const wordEl=card.querySelector("#pw-word"), sendBtn=card.querySelector("#pw-wordsend");
  renderArtwork(svg,__PW.canvas);
  let picked=null, locked=true, done=false, cooldownUntil=0, wallEl=null, pendingWord="";
  const triedSet=new Set(__PW.myTried||[]);
  window.__pwCooldownMs = window.__pwCooldownMs || 10000;
  window.__pwGuessUpdate=()=>{ if($app.contains(svg)) renderArtwork(svg,__PW.canvas); };

  function addRecord(text, mode){
    const row=html("div",{class:"guess-record "+mode});
    const sp=html("span"); sp.textContent=text;
    const b=html("b");
    if(mode==="hit") b.textContent="✓ +2";
    else if(mode==="miss") b.textContent="✗";
    else { b.textContent="…"; b.style.color="#B45309"; }
    row.appendChild(sp); row.appendChild(b);
    recEl.insertBefore(row, recEl.firstChild);
    while(recEl.children.length>5) recEl.lastChild.remove();
    return row;
  }
  function pendingRow(){
    let r=recEl.querySelector(".guess-record.pending");
    if(!r){ r=addRecord(pendingWord||"…","pending"); }
    return r;
  }
  window.__pwWordRes=(m)=>{
    const r=pendingRow();
    if(m.correct){
      if(m.repeat){ r.classList.remove("pending"); r.classList.add("hit"); r.querySelector("b").textContent="✓ +2（已命中）"; }
      else { r.classList.remove("pending"); r.classList.add("hit"); r.querySelector("b").textContent="✓ +2"; }
      bar.innerHTML='<span class="sub" style="color:var(--ok);font-weight:600">🎯 文字命中 +2！可继续猜，或等照片墙开放后选图确认</span>';
    }else{
      r.classList.remove("pending"); r.classList.add("miss"); r.querySelector("b").textContent="✗";
      bar.innerHTML='<span class="sub">不对哦，再猜猜（猜中 +2）</span>';
    }
  };
  window.__pwWordHit=(m)=>{ toast(`${m.nickname} 猜中了！`); };
  function lockWall(lock){
    if(!wallEl) return;
    [...wallEl.children].forEach((x,i)=>{ if(triedSet.has(i)) return; x.disabled=lock; });
  }
  function startCooldown(ms){
    cooldownUntil=Date.now()+ms;
    bar.innerHTML=`<span class="sub" style="color:var(--bad)">没猜中！该照片已标记 ✗ · 冷却中 <b id="pw-cd">${Math.ceil(ms/1000)}</b> 秒（可继续文字竞猜）</span>`;
    lockWall(true);
    const iv=setInterval(()=>{
      const left=Math.ceil((cooldownUntil-Date.now())/1000);
      const el=document.querySelector("#pw-cd");
      if(el) el.textContent=Math.max(0,left);
      if(cooldownUntil<=Date.now()){
        clearInterval(iv);
        lockWall(false);
        if(!done) bar.innerHTML='<span class="sub" style="color:var(--ok);font-weight:600">冷却结束，再选一张照片（猜对即锁定）</span>';
      }
    },500);
  }
  window.__pwCooldownMsg=(remain)=>{
    if(remain>0) startCooldown(remain);
    else toast("选图冷却中，稍后再试");
  };
  window.__pwGuessOk=(m)=>{
    if(m.correct){
      toast(m.first?"🎉 首答正确！+3（等揭晓）":"✅ 猜中！+1（等揭晓）");
      done=true; lockWall(true); bar.innerHTML='<span class="sub">已锁定答案，等待揭晓…</span>';
    }else{
      triedSet.add(picked); __PW.myTried=(__PW.myTried||[]).concat(picked);
      const ch=wallEl&&wallEl.children[picked];
      if(ch){ ch.disabled=true; ch.classList.add("tried"); ch.innerHTML=`<span class="coord">${coordLabel(picked)}</span>✗`; }
      picked=null;
      startCooldown(window.__pwCooldownMs);
    }
  };
  function sendWord(){
    const val=wordEl.value.trim(); if(!val) return;
    pendingWord=val;
    addRecord(val,"pending");
    __PW.send({t:"word",text:val});
    wordEl.value="";
  }
  sendBtn.onclick=sendWord;
  wordEl.addEventListener("keydown",e=>{ if(e.key==="Enter"){ e.preventDefault(); sendWord(); } });
  function buildWall(){
    wallEl=html("div",{class:"wall-grid"});
    __PW.wall.forEach((g,i)=>{
      const c=html("button",{class:"cell"},`<span class="coord">${coordLabel(i)}</span>${g}`);
      c.onclick=()=>{
        if(locked||done||cooldownUntil>Date.now()) return;
        picked=i;
        [...wallEl.children].forEach((x,j)=>x.className="cell"+(j===i?" picked":""));
        bar.innerHTML=`<span>已选 <b>${coordLabel(i)} ${g}</b></span><button class="primary" id="pw-gok">确认提交</button>`;
        bar.querySelector("#pw-gok").onclick=()=>{
          if(done||cooldownUntil>Date.now()) return;
          __PW.send({t:"guess",cell:picked});
          bar.innerHTML='<span class="sub">已提交，等待判定…</span>';
        };
      };
      wallEl.appendChild(c);
    });
    triedSet.forEach(i=>{
      const ch=wallEl.children[i];
      if(ch){ ch.disabled=true; ch.classList.add("tried"); ch.innerHTML=`<span class="coord">${coordLabel(i)}</span>✗`; }
    });
    wallHolder.appendChild(wallEl);
  }
  const unlockAt=()=>__PW.deadline-(__PW.createSeconds-__PW.lockSeconds)*1000;
  function tick(){
    const left=Math.max(0,Math.ceil((__PW.deadline-Date.now())/1000));
    const mm=Math.floor(left/60),ss=left%60;
    const el=card.querySelector("#pw-gtimer");
    if(el) el.textContent=`${mm}:${String(ss).padStart(2,"0")}`;
    if(locked && Date.now()>=unlockAt()){
      locked=false;
      wallHolder.innerHTML='<h3 style="margin:10px 0 6px">照片墙 · 点击选图</h3>';
      buildWall();
      if(!done) bar.innerHTML='<span class="sub" style="color:var(--ok);font-weight:600">照片墙开放！点选一张照片作答（猜错该格 ✗ + 10s 冷却）</span>';
    }
    if(left<=0) clearInterval(pwGtick);
  }
  const pwGtick=setInterval(tick,500); tick();
}
'''
sub(
    r'function renderOnlineGuess\(\)\{.*?\n\}\n(?=/\* ---- 揭晓 / 终局 ---- \*/)',
    new_guess,
    "renderOnlineGuess 替换"
)

io.open(f, "w", encoding="utf-8", newline="").write(t)
print("写入完成")
