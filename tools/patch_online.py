# -*- coding: utf-8 -*-
"""插入联机模式：路由分支 + 首页入口 + 联机核心代码块"""
import io

f = r"E:\巧手猜图游戏\pictures-web-game\巧手猜图-Demo.html"
t = io.open(f, encoding="utf-8").read()

# ---------- 1. route() 加 /online ----------
old_route = '  else if(path==="/selftest") runSelfTest();'
new_route = '  else if(path==="/selftest") runSelfTest();\n  else if(path==="/online") renderOnline();'
assert old_route in t, "route 锚点缺失"
t = t.replace(old_route, new_route, 1)

# ---------- 2. 首页加入口卡片 ----------
old_card = """    <button class="card mode-card" id="m-play">
      <span class="big">🎲</span>
      <span class="tag">无需朋友在场</span>
      <h2>本地试玩一局</h2>
      <span>先自己创作，再猜 3 幅示范作品，体验完整的“创作—猜测—揭晓—计分”循环。</span>
      <span class="go">创作 → 猜 3 幅作品 → 揭晓计分 → 再来一局</span>
    </button>"""
new_card = old_card + """
    <button class="card mode-card" id="m-online">
      <span class="big">🕹️</span>
      <span class="tag">朋友实时对局</span>
      <h2>联机对战</h2>
      <span>创建房间邀请朋友：一人拼剪影，其他人实时观看抢答；首个猜对 +3、其余 +1、出题人被猜中 +1，轮流出题，总分最高者胜。</span>
      <span class="go">建房 → 邀请 → 实时抢答 → 轮换 → 总冠军</span>
    </button>"""
assert old_card in t, "首页卡片锚点缺失"
t = t.replace(old_card, new_card, 1)

old_click = '  w.querySelector("#m-play").addEventListener("click",()=>location.hash="#/create?mode=play");'
new_click = old_click + '\n  w.querySelector("#m-online").addEventListener("click",()=>location.hash="#/online");'
assert old_click in t, "首页点击锚点缺失"
t = t.replace(old_click, new_click, 1)

# ---------- 3. 联机核心代码块（插在 runRoute 定义前） ----------
online_js = r'''
/* ================= 联机对战模式（#/online，规则集 pictures-web-online-v1） ================= */
const PW_WS_URL = (location.protocol==="file:" ? "ws://localhost:4000/ws" : (location.protocol==="https:"?"wss://":"ws://")+location.host+"/ws");
const __PW = window.__pwOnline = {
  ws:null, roomId:"", pid:"", nickname:"", status:"lobby", role:"",
  wall:[], target:-1, deadline:0, canvas:[], scores:{},
  round:0, maxRounds:0, drawer:{pid:"",nickname:""},
  createSeconds:90, lockSeconds:30, answered:0, total:0,
  players:[], reveal:null, over:null, _connFailed:false,
  send(o){ if(this.ws&&this.ws.readyState===1) this.ws.send(JSON.stringify(o)); },
  connect(onOpen){
    const self=this; this._connFailed=false;
    try{ this.ws=new WebSocket(PW_WS_URL); }
    catch(e){ if(!this._connFailed){this._connFailed=true; toast("无法连接服务器："+PW_WS_URL);} return; }
    this.ws.onopen=()=>{
      if(self.reconnectAt && self.roomId){ self.send({t:"rejoin",room_id:self.roomId,pid:self.pid}); }
      else if(onOpen) onOpen();
    };
    this.ws.onmessage=(ev)=>{ let m; try{ m=JSON.parse(ev.data); }catch(_){ return; } self.handle(m); };
    this.ws.onerror=()=>{ if(!self._connFailed){ self._connFailed=true; toast("无法连接服务器："+PW_WS_URL); } };
    this.ws.onclose=()=>{
      if(self.roomId && self.status!=="game_over"){
        toast("连接断开，5 秒后自动重连…");
        setTimeout(()=>{ if(self.roomId && self.status!=="game_over") self.connect(); },5000);
      }else if(!self._connFailed){ self._connFailed=true; toast("无法连接服务器，请先启动服务端（node server.js）或部署线上"); }
    };
  },
  handle(m){
    switch(m.t){
      case "created":
        this.roomId=m.room_id; this.pid=m.pid; this.nickname=m.nickname;
        this.players=m.players; this.wall=m.wall; this.status="lobby";
        this.createSeconds=m.rules.createSeconds; this.lockSeconds=m.rules.lockSeconds;
        this.reconnectAt=Date.now(); this.reveal=null; this.over=null;
        renderOnlineLobby(); break;
      case "joined":
        this.roomId=m.room_id; this.pid=m.pid;
        this.players=m.players; this.wall=m.wall; this.canvas=(m.canvas&&m.canvas.els)||[];
        this.round=m.round; this.maxRounds=m.maxRounds; this.deadline=m.deadline;
        this.createSeconds=m.createSeconds; this.lockSeconds=m.lockSeconds;
        this.target=m.target; this.status=m.status; this.reconnectAt=Date.now();
        this.drawer=(m.drawerIdx>=0&&m.players[m.drawerIdx])?{pid:m.players[m.drawerIdx].pid,nickname:m.players[m.drawerIdx].nickname}:{pid:"",nickname:""};
        if(this.status==="lobby") renderOnlineLobby();
        else if(this.status==="playing") renderOnlineRoom();
        else renderOnlineReveal();
        break;
      case "player_joined":
        this.players=m.players;
        if(this.status==="lobby") renderOnlineLobby();
        break;
      case "round_start":
        this.round=m.round; this.deadline=m.deadline; this.createSeconds=m.createSeconds;
        this.lockSeconds=m.lockSeconds; this.drawer=m.drawer; this.status="playing";
        this.target=m.target; this.reveal=null; this.over=null; this.answered=0; this.canvas=[];
        renderOnlineRoom(); break;
      case "canvas":
        this.canvas=m.els||[];
        if(window.__pwGuessUpdate) window.__pwGuessUpdate();
        break;
      case "guess_status":
        this.answered=m.answered; this.total=m.total;
        if(window.__pwDrawerStatus) window.__pwDrawerStatus(m);
        break;
      case "guess_ok":
        if(m.correct) toast(m.first?"🎉 首答正确！+3 分（等待揭晓）":"✅ 猜中！+1 分（等待揭晓）");
        else toast("没猜中，等待揭晓…");
        break;
      case "reveal":
        this.reveal=m; this.status=m.state; renderOnlineReveal(); break;
      case "game_over":
        this.over=m; this.status="game_over"; renderOnlineReveal(); break;
      case "error":
        toast(m.msg||"操作失败"); break;
    }
  }
};
window.__pwDrawerStatus = (m)=>{ toast(`有人已作答（${m.answered}/${m.total}）`); };

function pwLeave(){
  try{ __PW.ws&&__PW.ws.close(); }catch(_){}
  Object.assign(__PW,{roomId:"",pid:"",status:"lobby",players:[],reveal:null,over:null,canvas:[],reconnectAt:0});
  location.hash="#/";
}
function pwReset(){
  try{ __PW.ws&&__PW.ws.close(); }catch(_){}
  Object.assign(__PW,{roomId:"",pid:"",status:"lobby",players:[],reveal:null,over:null,canvas:[],reconnectAt:0});
}

/* ---- 入口页 ---- */
function renderOnline(){
  $app.innerHTML="";
  const w=html("div",{class:"wrap"});
  const card=html("div",{class:"card",style:"max-width:520px;margin:0 auto"});
  card.innerHTML=`
    <h1>联机对战</h1>
    <div class="sub">2–6 人同房：一人拼剪影，其他人实时观看抢答；首个猜对 +3、其余 +1、出题人被猜中 +1，轮流出题。</div>
    <h3>你的昵称</h3>
    <input id="pw-nick" placeholder="随便填，如：阿明" style="width:100%;border:1.5px solid var(--line);border-radius:10px;padding:10px 12px;font-size:15px;background:#FCFBF8;color:var(--ink)">
    <h3>创建新房间</h3>
    <button class="primary" id="pw-create" style="width:100%">创建房间</button>
    <h3>加入已有房间</h3>
    <div style="display:flex;gap:8px">
      <input id="pw-code" placeholder="房间码，如 AB12" style="flex:1;border:1.5px solid var(--line);border-radius:10px;padding:10px 12px;font-size:15px;font-family:ui-monospace,monospace;text-transform:uppercase;background:#FCFBF8;color:var(--ink)">
      <button class="primary" id="pw-join">加入</button>
    </div>
    ${__PW.roomId?`<div style="margin-top:10px"><button class="accent" id="pw-back" style="width:100%">回到当前房间（${__PW.roomId}）</button></div>`:""}
    <div class="note">需要先启动服务端（<code>node server.js</code>）或部署到线上；当前连接：${PW_WS_URL}</div>
    <div class="foot-actions"><button class="ghost" onclick="location.hash='#/'">回首页</button></div>`;
  w.appendChild(card); $app.appendChild(w);
  if(card.querySelector("#pw-back")) card.querySelector("#pw-back").onclick=()=>renderOnlineRoom();
  const nick=()=>card.querySelector("#pw-nick").value.trim();
  card.querySelector("#pw-create").onclick=()=>{
    __PW.nickname=nick()||("玩家"+Math.floor(Math.random()*900+100));
    pwConnect(()=>__PW.send({t:"create",nickname:__PW.nickname}));
  };
  card.querySelector("#pw-join").onclick=()=>{
    const code=card.querySelector("#pw-code").value.trim().toUpperCase();
    if(!code){ toast("请输入房间码"); return; }
    __PW.nickname=nick()||("玩家"+Math.floor(Math.random()*900+100));
    pwConnect(()=>__PW.send({t:"join",room_id:code,nickname:__PW.nickname}));
  };
}
function pwConnect(action){
  if(__PW.ws&&__PW.ws.readyState===1){ action(); return; }
  __PW.connect(action);
}

/* ---- 大厅 ---- */
function renderOnlineLobby(){
  $app.innerHTML="";
  const w=html("div",{class:"wrap"});
  const card=html("div",{class:"card",style:"max-width:560px;margin:0 auto"});
  const isHost=__PW.players.length>0&&__PW.players[0].pid===__PW.pid;
  card.innerHTML=`
    <h1>房间 ${__PW.roomId}</h1>
    <div class="sub">把房间码发给朋友，或复制链接邀请（${__PW.players.length}/6 人，至少 2 人开局）</div>
    <div style="text-align:center;font-family:ui-monospace,monospace;font-size:40px;font-weight:800;letter-spacing:6px;margin:12px 0">${__PW.roomId}</div>
    <div class="link-row"><input id="pw-link" readonly><button class="primary" id="pw-copy">复制链接</button></div>
    <h3>玩家列表</h3>
    <div id="pw-players"></div>
    ${isHost?'<button class="accent" id="pw-start" style="width:100%;margin-top:14px">开始游戏</button>':'<div class="note" style="text-align:center;margin-top:14px">等待房主开始…</div>'}
    <div class="note">规则：每轮一人出题 90 秒；前 30 秒作答锁定（只能看）；每人每轮 1 次作答，提交即锁定；首答对 +3、其余 +1、出题人被猜中 +1；轮流出题，总分最高者胜。</div>
    <div class="foot-actions"><button class="ghost" onclick="pwLeave()">离开房间</button></div>`;
  w.appendChild(card);$app.appendChild(w);
  const pl=card.querySelector("#pw-players");
  __PW.players.forEach(p=>{
    const row=html("div",{class:"review-item"});
    row.innerHTML=`<div><b>${p.nickname}</b>${p.pid===__PW.pid?'<span class="tag" style="margin-left:6px">你</span>':''}${p.pid===__PW.players[0].pid?'<span class="tag" style="margin-left:6px">房主</span>':''}</div><span class="res sub">${p.connected?"在线":"离线"}</span>`;
    pl.appendChild(row);
  });
  const link=location.origin+location.pathname+"#/online?room="+__PW.roomId;
  card.querySelector("#pw-link").value=link;
  card.querySelector("#pw-copy").onclick=async()=>{ try{ await navigator.clipboard.writeText(link); toast("链接已复制"); }catch(e){ card.querySelector("#pw-link").select(); document.execCommand("copy"); toast("链接已复制"); } };
  const st=card.querySelector("#pw-start");
  if(st) st.onclick=()=>{ if(__PW.players.length<2){ toast("至少 2 人才能开始"); return; } __PW.send({t:"start"}); };
}

/* ---- 对局路由（按角色） ---- */
function renderOnlineRoom(){
  if(__PW.drawer.pid===__PW.pid) renderEditor("online");
  else renderOnlineGuess();
}

/* ---- 猜题人视图 ---- */
function renderOnlineGuess(){
  $app.innerHTML="";
  const w=html("div",{class:"wrap"});
  const card=html("div",{class:"card"});
  card.innerHTML=`
    <h1>${__PW.drawer.nickname||"对方"} 正在拼图…</h1>
    <div class="qbar">第 ${__PW.round} 轮 · 出题人：${__PW.drawer.nickname||"？"} · <span id="pw-gtimer">--:--</span></div>
    <div class="guess-stage"><svg class="stage" id="pw-gstage"></svg></div>
    <div class="wall-big"><div class="wall-grid" id="pw-gwall"></div></div>
    <div class="confirm-bar" id="pw-gbar"><span class="sub">作答尚未开放，先观察剪影…</span></div>`;
  w.appendChild(card);$app.appendChild(w);
  const svg=card.querySelector("#pw-gstage"), wallEl=card.querySelector("#pw-gwall"), bar=card.querySelector("#pw-gbar");
  renderArtwork(svg,__PW.canvas);
  let picked=null, locked=true, done=false;
  window.__pwGuessUpdate=()=>{ if($app.contains(svg)) renderArtwork(svg,__PW.canvas); };
  __PW.wall.forEach((g,i)=>{
    const c=html("button",{class:"cell"},`<span class="coord">${coordLabel(i)}</span>${g}`);
    c.onclick=()=>{
      if(locked||done) return;
      picked=i;
      [...wallEl.children].forEach((x,j)=>x.className="cell"+(j===i?" picked":""));
      bar.innerHTML=`<span>已选 <b>${coordLabel(i)} ${g}</b></span><button class="primary" id="pw-gok">确认提交</button>`;
      bar.querySelector("#pw-gok").onclick=()=>{
        if(done) return;
        done=true; __PW.send({t:"guess",cell:picked});
        [...wallEl.children].forEach(x=>{x.disabled=true;});
        bar.innerHTML='<span class="sub">已提交，等待揭晓…</span>';
      };
    };
    wallEl.appendChild(c);
  });
  const unlockAt=__PW.deadline-(__PW.createSeconds-__PW.lockSeconds)*1000;
  function tick(){
    const left=Math.max(0,Math.ceil((__PW.deadline-Date.now())/1000));
    const mm=Math.floor(left/60),ss=left%60;
    const el=card.querySelector("#pw-gtimer");
    if(el) el.textContent=`${mm}:${String(ss).padStart(2,"0")}`;
    if(locked && Date.now()>=unlockAt){
      locked=false;
      if(!done) bar.innerHTML='<span class="sub" style="color:var(--ok);font-weight:600">作答开放！点选一张照片作答</span>';
    }
    if(left<=0) clearInterval(pwGtick);
  }
  const pwGtick=setInterval(tick,500); tick();
}

/* ---- 揭晓 / 终局 ---- */
function renderOnlineReveal(){
  const rev=__PW.reveal, over=__PW.over;
  const data=over||rev;
  if(!data){ if(__PW.roomId) renderOnlineLobby(); else renderOnline(); return; }
  $app.innerHTML="";
  const w=html("div",{class:"wrap"});
  const card=html("div",{class:"card",style:"max-width:620px;margin:0 auto"});
  let inner=`<h1>${over?"🏆 对局结束":`第 ${rev.round} 轮揭晓`}</h1>`;
  if(over){
    inner+=`<div class="score-big">${over.winner.nickname} 获胜 · ${over.winner.score} 分</div>`;
  }else{
    inner+=`<div class="sub" style="text-align:center">答案：<b>${rev.answerLabel}</b>（出题人 ${rev.drawer.nickname}）</div>`;
  }
  inner+=`<h3>本轮结算</h3><div id="pw-results"></div><h3>总分榜</h3><div id="pw-scores"></div>`;
  if(!over) inner+=`<div class="foot-actions"><button class="accent" id="pw-next">开始下一轮</button></div>`;
  else inner+=`<div class="foot-actions"><button class="primary" id="pw-again">再来一局</button><button class="ghost" id="pw-home">回首页</button></div>`;
  card.innerHTML=inner;
  w.appendChild(card);$app.appendChild(w);
  const resEl=card.querySelector("#pw-results");
  (data.results||[]).forEach(r=>{
    const row=html("div",{class:"review-item"});
    const label=r.role==="drawer"?`出题人 · 被猜中 ${r.hitCount||0} 次`:(r.guessed==null?"未作答":`猜 ${coordLabel(r.guessed)}${r.correct?" ✓":" ✗"}${r.first?" · 首答":""}`);
    row.innerHTML=`<div><b>${r.nickname}</b><div class="sub">${label}</div></div><span class="res" style="${r.points>0?"color:var(--ok)":"color:var(--bad)"};font-weight:700">${r.points>0?"+"+r.points:r.points} 分</span>`;
    resEl.appendChild(row);
  });
  const scEl=card.querySelector("#pw-scores");
  Object.entries(data.scores||{}).sort((a,b)=>b[1]-a[1]).forEach(([pid,sc])=>{
    const p=__PW.players.find(x=>x.pid===pid);
    const row=html("div",{class:"review-item"});
    row.innerHTML=`<div><b>${p?p.nickname:pid}</b>${pid===__PW.pid?'<span class="tag" style="margin-left:6px">你</span>':''}</div><span class="res" style="font-weight:700">${sc} 分</span>`;
    scEl.appendChild(row);
  });
  const nt=card.querySelector("#pw-next");
  if(nt) nt.onclick=()=>__PW.send({t:"next"});
  const ag=card.querySelector("#pw-again");
  if(ag) ag.onclick=()=>{ pwReset(); location.hash="#/online"; };
  const hm=card.querySelector("#pw-home");
  if(hm) hm.onclick=()=>{ pwReset(); location.hash="#/"; };
}
'''

anchor = "function runRoute(){"
assert anchor in t, "runRoute 锚点缺失"
t = t.replace(anchor, online_js + "\n" + anchor, 1)

io.open(f, "w", encoding="utf-8", newline="").write(t)
print("插入完成。文件字符数:", len(t))
