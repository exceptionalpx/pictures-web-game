# -*- coding: utf-8 -*-
"""前端 v2 补丁：文字竞猜 + 最多2次选图 + 在线房间列表 + reveal 标记 + onlinetest 更新"""
import io, re

f = r"E:\巧手猜图游戏\pictures-web-game\巧手猜图-Demo.html"
t = io.open(f, encoding="utf-8").read()

def sub(pattern, repl, tag, flags=re.S):
    global t
    n = len(re.findall(pattern, t, flags))
    t, cnt = re.subn(pattern, repl, t, count=1, flags=flags)
    print(f"{tag}: {cnt}")

# ---------- 1. handle：guess_ok 走回调 + word_res/word_hit/list 分支 ----------
sub(
    r'      case "guess_ok":\n        if\(m\.correct\) toast\(m\.first\?"🎉 首答正确！\+3 分（等待揭晓）":"✅ 猜中！\+1 分（等待揭晓）"\);\n        else toast\("没猜中，等待揭晓…"\);\n        break;',
    r'''      case "guess_ok":
        if(window.__pwGuessOk) window.__pwGuessOk(m);
        else if(m.correct) toast(m.first?"🎉 首答正确！+3 分（等待揭晓）":"✅ 猜中！+1 分（等待揭晓）");
        else if(m.done) toast("没猜中，机会用完，等待揭晓…");
        else toast(`没猜中，还有 ${m.maxAttempts-m.attempts} 次机会`);
        break;
      case "word_res":
        if(window.__pwWordRes) window.__pwWordRes(m);
        else if(m.correct) toast(m.repeat?"已文字命中 +2":"🎯 文字命中！+2 分");
        break;
      case "word_hit":
        if(window.__pwWordHit) window.__pwWordHit(m);
        else toast(`${m.nickname} 猜中了！`);
        break;
      case "list":
        if(window.__pwRooms) window.__pwRooms(m);
        break;''',
    "handle 分支"
)

# ---------- 2. renderOnlineGuess 整体替换 ----------
new_guess = r'''function renderOnlineGuess(){
  $app.innerHTML="";
  const w=html("div",{class:"wrap"});
  const card=html("div",{class:"card"});
  card.innerHTML=`
    <h1>${__PW.drawer.nickname||"对方"} 正在拼图…</h1>
    <div class="qbar">第 ${__PW.round} 轮 · 出题人：${__PW.drawer.nickname||"？"} · <span id="pw-gtimer">--:--</span></div>
    <div class="guess-stage"><svg class="stage" id="pw-gstage"></svg></div>
    <div class="wall-big"><div class="wall-grid" id="pw-gwall"></div></div>
    <div class="confirm-bar" id="pw-gbar"><span class="sub">文字竞猜中…猜中 +2 分，30 秒后开放选图</span></div>
    <div class="word-row" id="pw-wordrow" style="display:flex;gap:8px;margin-top:10px">
      <input id="pw-word" placeholder="猜它是什么，如：气球" maxlength="30" autocomplete="off" style="flex:1;border:1.5px solid var(--line);border-radius:10px;padding:10px 12px;font-size:15px;background:#FCFBF8;color:var(--ink)">
      <button class="primary" id="pw-wordsend">猜！</button>
    </div>`;
  w.appendChild(card);$app.appendChild(w);
  const svg=card.querySelector("#pw-gstage"), wallEl=card.querySelector("#pw-gwall"), bar=card.querySelector("#pw-gbar");
  const wordRow=card.querySelector("#pw-wordrow"), wordEl=card.querySelector("#pw-word"), sendBtn=card.querySelector("#pw-wordsend");
  renderArtwork(svg,__PW.canvas);
  let picked=null, locked=true, done=false;
  window.__pwGuessUpdate=()=>{ if($app.contains(svg)) renderArtwork(svg,__PW.canvas); };
  window.__pwWordRes=(m)=>{
    if(m.correct){
      if(m.repeat) bar.innerHTML='<span class="sub" style="color:var(--ok);font-weight:600">你已文字命中 +2，等选图开放</span>';
      else bar.innerHTML='<span class="sub" style="color:var(--ok);font-weight:600">🎯 文字命中 +2！等选图开放</span>';
    }else{
      if(locked && !done) bar.innerHTML='<span class="sub">不对哦，再猜猜（猜中 +2）</span>';
    }
  };
  window.__pwWordHit=(m)=>{ toast(`${m.nickname} 猜中了！`); };
  window.__pwGuessOk=(m)=>{
    if(m.correct){
      toast(m.first?"🎉 首答正确！+3（等揭晓）":"✅ 猜中！+1（等揭晓）");
      done=true; bar.innerHTML='<span class="sub">已锁定答案，等待揭晓…</span>';
    }else if(m.done){
      toast("没猜中，机会用完，等待揭晓…");
      done=true; bar.innerHTML='<span class="sub">已锁定答案，等待揭晓…</span>';
    }else{
      toast(`没猜中，还有 ${m.maxAttempts-m.attempts} 次机会`);
      picked=null;
      bar.innerHTML='<span class="sub" style="color:var(--bad)">没猜中，还有 1 次机会，再选一次</span>';
      [...wallEl.children].forEach(x=>{ x.disabled=false; x.className="cell"; });
    }
  };
  function sendWord(){
    const val=wordEl.value.trim(); if(!val) return;
    __PW.send({t:"word",text:val});
    wordEl.value="";
  }
  sendBtn.onclick=sendWord;
  wordEl.addEventListener("keydown",e=>{ if(e.key==="Enter"){ e.preventDefault(); sendWord(); } });
  __PW.wall.forEach((g,i)=>{
    const c=html("button",{class:"cell"},`<span class="coord">${coordLabel(i)}</span>${g}`);
    c.onclick=()=>{
      if(locked||done) return;
      picked=i;
      [...wallEl.children].forEach((x,j)=>x.className="cell"+(j===i?" picked":""));
      bar.innerHTML=`<span>已选 <b>${coordLabel(i)} ${g}</b></span><button class="primary" id="pw-gok">确认提交</button>`;
      bar.querySelector("#pw-gok").onclick=()=>{
        if(done) return;
        __PW.send({t:"guess",cell:picked});
        bar.innerHTML='<span class="sub">已提交，等待判定…</span>';
      };
    };
    wallEl.appendChild(c);
  });
  const unlockAt=()=>__PW.deadline-(__PW.createSeconds-__PW.lockSeconds)*1000;
  function tick(){
    const left=Math.max(0,Math.ceil((__PW.deadline-Date.now())/1000));
    const mm=Math.floor(left/60),ss=left%60;
    const el=card.querySelector("#pw-gtimer");
    if(el) el.textContent=`${mm}:${String(ss).padStart(2,"0")}`;
    if(locked && Date.now()>=unlockAt()){
      locked=false; wordRow.style.display="none";
      if(!done) bar.innerHTML='<span class="sub" style="color:var(--ok);font-weight:600">作答开放！点选一张照片作答</span>';
    }
    if(left<=0) clearInterval(pwGtick);
  }
  const pwGtick=setInterval(tick,500); tick();
}
'''
sub(
    r'function renderOnlineGuess\(\)\{.*?\n\}\n\n(?=/\* ---- 揭晓 / 终局 ---- \*/)',
    new_guess,
    "renderOnlineGuess 替换"
)

# ---------- 3. renderOnline：在线房间区块 ----------
sub(
    r'    <h3>加入已有房间</h3>\n    <div style="display:flex;gap:8px">',
    r'''    <h3>加入已有房间</h3>
    <div style="display:flex;gap:8px">''',
    "占位"
)
sub(
    r'      <button class="primary" id="pw-join">加入</button>\n    </div>\n    \$\{__PW\.roomId',
    r'''      <button class="primary" id="pw-join">加入</button>
    </div>
    <h3>在线房间 · 点击加入</h3>
    <div id="pw-rooms"><div class="note">连接后自动加载…</div></div>
    ${__PW.roomId''',
    "在线房间区块"
)
sub(
    r'''    pwConnect\(\(\)=>__PW\.send\(\{t:"join",room_id:code,nickname:__PW\.nickname\}\)\);
  \};
\}''',
    r'''    pwConnect(()=>__PW.send({t:"join",room_id:code,nickname:__PW.nickname}));
  };
  if(window.listTimer){ clearInterval(window.listTimer); window.listTimer=null; }
  const loadRooms=()=>{ if(__PW.ws&&__PW.ws.readyState===1) __PW.send({t:"list"}); };
  window.__pwRooms=(m)=>{
    const box=card.querySelector("#pw-rooms"); if(!box) return;
    if(!m.rooms.length){ box.innerHTML='<div class="note">暂无等待中的房间，创建一个吧</div>'; return; }
    box.innerHTML="";
    m.rooms.forEach(rm=>{
      const row=html("div",{class:"review-item"});
      row.innerHTML=`<div><b>${rm.host||"匿名"}</b><div class="sub">房间码 ${rm.room_id} · ${rm.players}/${rm.max} 人</div></div><button class="primary" id="pw-join-${rm.room_id}">加入</button>`;
      box.appendChild(row);
      row.querySelector(`#pw-join-${rm.room_id}`).onclick=()=>{
        __PW.nickname=nick()||("玩家"+Math.floor(Math.random()*900+100));
        pwConnect(()=>__PW.send({t:"join",room_id:rm.room_id,nickname:__PW.nickname}));
      };
    });
  };
  if(__PW.ws&&__PW.ws.readyState===1) loadRooms();
  window.listTimer=setInterval(loadRooms,3000);
}''',
    "在线房间轮询"
)

# ---------- 4. pwLeave / pwReset / lobby 清 listTimer ----------
sub(
    r'function pwLeave\(\){\n  try\{ __PW\.ws&&__PW\.ws\.close\(\); \}catch\(_\)\{\}',
    r'''function pwLeave(){
  if(window.listTimer){ clearInterval(window.listTimer); window.listTimer=null; }
  try{ __PW.ws&&__PW.ws.close(); }catch(_){}''',
    "pwLeave"
)
sub(
    r'function pwReset\(\){\n  try\{ __PW\.ws&&__PW\.ws\.close\(\); \}catch\(_\)\{\}',
    r'''function pwReset(){
  if(window.listTimer){ clearInterval(window.listTimer); window.listTimer=null; }
  try{ __PW.ws&&__PW.ws.close(); }catch(_){}''',
    "pwReset"
)
sub(
    r'function renderOnlineLobby\(\){\n  \$app\.innerHTML="";',
    r'''function renderOnlineLobby(){
  if(window.listTimer){ clearInterval(window.listTimer); window.listTimer=null; }
  $app.innerHTML="";''',
    "lobby 清轮询"
)

# ---------- 5. reveal 结果行：wordHit 标记 ----------
sub(
    r'''    const label=r\.role==="drawer"?`出题人 · 被猜中 \$\{r\.hitCount\|\|0\} 次`:\`\(r\.guessed==null?"未作答":`猜 \$\{coordLabel\(r\.guessed\)\}\$\{r\.correct\?" ✓":" ✗"\}\$\{r\.first\?" · 首答":""\}\`\);''',
    r'''    const wTag=r.wordHit?'文字命中 +2 · ':'';
    const label=r.role==="drawer"?`出题人 · 被猜中 ${r.hitCount||0} 次`:(r.guessed==null?`${wTag}未作答`:r.correct?`${wTag}猜 ${coordLabel(r.guessed)} ✓${r.first?" · 首答":""}${r.attempts>1?" · 第"+r.attempts+"次":""}`:`${wTag}猜 ${coordLabel(r.guessed)} ✗${r.attempts>1?" · 第"+r.attempts+"次":""}`);''',
    "reveal wordHit 标记"
)

# ---------- 6. onlinetest 整体替换 ----------
new_test = r'''async function runOnlineTest(){
  const results=[];
  const rec=(name,ok,detail)=>{results.push({name,ok,detail});};
  const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
  const WALL16=["🎈","🏠","🐟","🌵","☂️","🚲","⛵","🍕","🎸","🌋","🎪","🚀","🐘","🌮","🗼","🌻"];
  try{
    /* 1. 创建房间 → 大厅 */
    __PW.handle({t:"created",room_id:"AB12",pid:"pA",nickname:"阿明",
      players:[{pid:"pA",nickname:"阿明",score:0,connected:true,guessed:null,wordHit:false}],
      wall:WALL16, rules:{createSeconds:90,lockSeconds:30}});
    rec("创建→大厅渲染", !!document.querySelector("#pw-players")&&document.querySelector("#pw-players").children.length===1,"lobby");
    rec("房主可开始", !!document.querySelector("#pw-start"),"start 按钮");
    rec("房间码展示", (document.querySelector("h1").textContent||"").includes("AB12"),"");

    /* 2. 玩家加入 */
    __PW.handle({t:"player_joined",players:[
      {pid:"pA",nickname:"阿明",score:0,connected:true,guessed:null,wordHit:false},
      {pid:"pB",nickname:"小红",score:0,connected:true,guessed:null,wordHit:false}]});
    rec("加入后列表 2 人", document.querySelector("#pw-players").children.length===2,"");

    /* 3. 开局 → 出题人视角 */
    __PW.pid="pA";
    __PW.handle({t:"round_start",round:1,drawer:{pid:"pA",nickname:"阿明"},
      deadline:Date.now()+90000,lockSeconds:30,createSeconds:90,target:3});
    await sleep(80);
    const ed=window.__pwEditor;
    rec("出题人编辑器挂载", !!(ed&&ed.svg),"renderEditor online");
    rec("目标金色描边", !!document.querySelector("#wall .cell.target"),"");
    rec("出题人计时显示", (document.querySelector("#timer").textContent||"").includes("1:"),"");
    document.querySelector(".tabs").children[4].click();
    [...document.querySelectorAll("#toolbody button")].find(b=>b.textContent.includes("矩形积木")).click();
    rec("出题人添加元素", ed.state.els.length===1,"");
    rec("出题人按钮为等待揭晓", (document.querySelector("#submit").textContent||"").includes("等待揭晓"),"");

    /* 4. 猜题人视角 */
    __PW.pid="pB";
    __PW.handle({t:"round_start",round:1,drawer:{pid:"pA",nickname:"阿明"},
      deadline:Date.now()+90000,lockSeconds:30,createSeconds:90});
    await sleep(80);
    rec("猜题人墙 16 格", !!document.querySelector("#pw-gwall")&&document.querySelector("#pw-gwall").children.length===16,"");
    rec("猜题人文字竞猜框", !!document.querySelector("#pw-word"),"");
    rec("猜题人锁定提示", (document.querySelector("#pw-gbar").textContent||"").includes("文字竞猜中"),"");

    /* 5. 文字命中流程（模拟服务端判定） */
    __PW.handle({t:"word_res",correct:true});
    await sleep(40);
    rec("文字命中提示+2", (document.querySelector("#pw-gbar").textContent||"").includes("文字命中 +2"),"");
    __PW.handle({t:"word_res",correct:true,repeat:true});
    await sleep(40);
    rec("重复命中提示", (document.querySelector("#pw-gbar").textContent||"").includes("已文字命中"),"");
    __PW.handle({t:"word_hit",pid:"pB",nickname:"小红"});

    /* 6. 画布实时同步 */
    __PW.handle({t:"canvas",els:[{kind:"rect",x:1,y:2,w:3,h:4,rot:0,color:"#000"},{kind:"triangle",x:5,y:6,w:7,h:8,rot:0,color:"#000"}]});
    await sleep(60);
    rec("猜题人画布同步", document.querySelector("#pw-gstage").childNodes.length>=2,"");

    /* 7. 解锁 */
    __PW.deadline=Date.now()+500;
    await sleep(900);
    rec("解锁后开放选图", (document.querySelector("#pw-gbar").textContent||"").includes("作答开放"),"");
    rec("文字框解锁后隐藏", (document.querySelector("#pw-wordrow").style.display||"")==="none","");

    /* 8. 第 1 次选错 → 还有 1 次；第 2 次选对 → 锁定 */
    document.querySelector("#pw-gwall").children[3].click();
    await sleep(60);
    rec("选中格高亮", !!document.querySelector("#pw-gwall .cell.picked"),"");
    const ok1=document.querySelector("#pw-gok");
    rec("确认按钮出现", !!ok1,"");
    if(ok1) ok1.click();
    __PW.handle({t:"guess_ok",correct:false,done:false,attempts:1,maxAttempts:2});
    await sleep(60);
    rec("第1次错提示还有机会", (document.querySelector("#pw-gbar").textContent||"").includes("还有 1 次机会"),"");
    rec("墙重新可用", !document.querySelector("#pw-gwall").children[0].disabled,"");
    document.querySelector("#pw-gwall").children[3].click();
    await sleep(40);
    const ok2=document.querySelector("#pw-gok");
    if(ok2) ok2.click();
    __PW.handle({t:"guess_ok",correct:true,first:true,done:true,attempts:2,maxAttempts:2});
    await sleep(60);
    rec("第2次对后锁定等待", (document.querySelector("#pw-gbar").textContent||"").includes("等待揭晓"),"");

    /* 9. 揭晓 */
    __PW.handle({t:"reveal",state:"round_end",round:1,answer:3,answerLabel:"B1 🏠",
      drawer:{pid:"pA",nickname:"阿明"},
      results:[
        {pid:"pA",nickname:"阿明",role:"drawer",guessed:null,correct:null,wordHit:false,points:1,hitCount:1},
        {pid:"pB",nickname:"小红",role:"guesser",guessed:3,correct:true,first:true,attempts:2,wordHit:true,points:5}],
      scores:{pA:1,pB:5},isLast:false});
    rec("揭晓结果行 2 条", !!document.querySelector("#pw-results")&&document.querySelector("#pw-results").children.length===2,"");
    rec("揭晓答案显示", (document.querySelector("h1").textContent||"").includes("第 1 轮揭晓"),"");
    rec("揭晓含文字命中标记", (document.querySelector("#pw-results").textContent||"").includes("文字命中"),"");
    rec("揭晓含下一轮按钮", !!document.querySelector("#pw-next"),"");

    /* 10. 终局 */
    __PW.handle({t:"game_over",scores:{pA:1,pB:5},winner:{pid:"pB",nickname:"小红",score:5}});
    rec("终局标题", (document.querySelector("h1").textContent||"").includes("对局结束"),"");
    rec("赢家显示", (document.querySelector(".score-big").textContent||"").includes("小红"),"");
    rec("终局含再来一局", !!document.querySelector("#pw-again"),"");

    /* 11. 在线房间列表 */
    renderOnline();
    await sleep(60);
    __PW.handle({t:"list",rooms:[{room_id:"AB12",host:"阿明",players:1,max:6},{room_id:"CD34",host:"小红",players:3,max:6}]});
    await sleep(60);
    rec("在线房间列表渲染", !!document.querySelector("#pw-rooms")&&document.querySelector("#pw-rooms").children.length===2,"");
    rec("房间可点击加入", !!document.querySelector("#pw-join-AB12"),"");
    __PW.handle({t:"list",rooms:[]});
    await sleep(60);
    rec("空列表提示", (document.querySelector("#pw-rooms").textContent||"").includes("暂无"),"");
  }catch(err){
    rec("联机自检异常", false, (err&&err.message)||String(err));
  }
  /* 报告 */
  const passed=results.filter(r=>r.ok).length;
  pwReset();
  $app.innerHTML="";
  const w=html("div",{class:"wrap"});
  const card=html("div",{class:"card"});
  card.innerHTML=`<h1>联机 UI 自检报告</h1>
    <div class="sub">规则集 pictures-web-online-v1 · 模拟 WS 消息走真实渲染路径 · ${passed}/${results.length} 通过</div>
    <table><thead><tr><th>检查项</th><th>结果</th><th>详情</th></tr></thead><tbody>
    ${results.map(r=>`<tr><td>${r.name}</td><td style="color:${r.ok?"var(--ok)":"var(--bad)"};font-weight:700">${r.ok?"PASS":"FAIL"}</td><td>${r.detail||""}</td></tr>`).join("")}
    </tbody></table>
    <div class="foot-actions"><button class="primary" onclick="location.hash='#/online'">去联机对战</button><button class="ghost" onclick="location.hash='#/'">回首页</button></div>`;
  w.appendChild(card);$app.appendChild(w);
}
'''
sub(
    r'async function runOnlineTest\(\)\{.*?\n\}\n(?=function runRoute\(\))',
    new_test,
    "onlinetest 替换"
)

io.open(f, "w", encoding="utf-8", newline="").write(t)
print("写入完成")
