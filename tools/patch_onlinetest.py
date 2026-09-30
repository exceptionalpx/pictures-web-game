# -*- coding: utf-8 -*-
"""插入 #/onlinetest 联机 UI 自检"""
import io

f = r"E:\巧手猜图游戏\pictures-web-game\巧手猜图-Demo.html"
t = io.open(f, encoding="utf-8").read()

# 路由
old_route = '  else if(path==="/online") renderOnline();'
new_route = old_route + '\n  else if(path==="/onlinetest") runOnlineTest();'
assert old_route in t
t = t.replace(old_route, new_route, 1)

test_js = r'''
/* ================= 联机 UI 自检（#/onlinetest，模拟 WS 消息走真实渲染） ================= */
async function runOnlineTest(){
  const results=[];
  const rec=(name,ok,detail)=>{results.push({name,ok,detail});};
  const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
  const WALL16=["🎈","🏠","🐟","🌵","☂️","🚲","⛵","🍕","🎸","🌋","🎪","🚀","🐘","🌮","🗼","🌻"];
  try{
    /* 1. 创建房间 → 大厅 */
    __PW.handle({t:"created",room_id:"AB12",pid:"pA",nickname:"阿明",
      players:[{pid:"pA",nickname:"阿明",score:0,connected:true,guessed:null}],
      wall:WALL16, rules:{createSeconds:90,lockSeconds:30}});
    rec("创建→大厅渲染", !!document.querySelector("#pw-players")&&document.querySelector("#pw-players").children.length===1,"lobby");
    rec("房主可开始", !!document.querySelector("#pw-start"),"start 按钮");
    rec("房间码展示", (document.querySelector("h1").textContent||"").includes("AB12"),"");

    /* 2. 玩家加入 */
    __PW.handle({t:"player_joined",players:[
      {pid:"pA",nickname:"阿明",score:0,connected:true,guessed:null},
      {pid:"pB",nickname:"小红",score:0,connected:true,guessed:null}]});
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
    rec("猜题人锁定提示", (document.querySelector("#pw-gbar").textContent||"").includes("作答尚未开放"),"");

    /* 5. 画布实时同步 */
    __PW.handle({t:"canvas",els:[{kind:"rect",x:1,y:2,w:3,h:4,rot:0,color:"#000"},{kind:"triangle",x:5,y:6,w:7,h:8,rot:0,color:"#000"}]});
    await sleep(60);
    rec("猜题人画布同步", document.querySelector("#pw-gstage").childNodes.length>=2,"");

    /* 6. 解锁（deadline 提前） */
    __PW.deadline=Date.now()+500;
    await sleep(900);
    rec("解锁后提示开放", (document.querySelector("#pw-gbar").textContent||"").includes("作答开放"),"");

    /* 7. 猜题人提交（选中→确认，无 ws 时 send 安全忽略） */
    document.querySelector("#pw-gwall").children[3].click();
    await sleep(60);
    rec("选中格高亮", !!document.querySelector("#pw-gwall .cell.picked"),"");
    const ok=document.querySelector("#pw-gok");
    rec("确认按钮出现", !!ok,"");
    if(ok) ok.click();
    await sleep(60);
    rec("提交后锁定等待", (document.querySelector("#pw-gbar").textContent||"").includes("已提交"),"");

    /* 8. 揭晓 */
    __PW.handle({t:"reveal",state:"round_end",round:1,answer:3,answerLabel:"B1 🏠",
      drawer:{pid:"pA",nickname:"阿明"},
      results:[
        {pid:"pA",nickname:"阿明",role:"drawer",guessed:null,correct:null,points:1,hitCount:1},
        {pid:"pB",nickname:"小红",role:"guesser",guessed:3,correct:true,first:true,points:3}],
      scores:{pA:1,pB:3},isLast:false});
    rec("揭晓结果行 2 条", !!document.querySelector("#pw-results")&&document.querySelector("#pw-results").children.length===2,"");
    rec("揭晓答案显示", (document.querySelector("h1").textContent||"").includes("第 1 轮揭晓"),"");
    rec("揭晓含下一轮按钮", !!document.querySelector("#pw-next"),"");

    /* 9. 终局 */
    __PW.handle({t:"game_over",scores:{pA:1,pB:3},winner:{pid:"pB",nickname:"小红",score:3}});
    rec("终局标题", (document.querySelector("h1").textContent||"").includes("对局结束"),"");
    rec("赢家显示", (document.querySelector(".score-big").textContent||"").includes("小红"),"");
    rec("终局含再来一局", !!document.querySelector("#pw-again"),"");
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

anchor = "function runRoute(){"
assert anchor in t
t = t.replace(anchor, test_js + "\n" + anchor, 1)

io.open(f, "w", encoding="utf-8", newline="").write(t)
print("onlinetest 插入完成")
