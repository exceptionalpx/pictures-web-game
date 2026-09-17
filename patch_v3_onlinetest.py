# -*- coding: utf-8 -*-
"""onlinetest 更新为 v3 流程（锁定期无照片墙 / 猜测记录 / 无限次选图+冷却 / 游客连接开关）"""
import io, re

f = r"E:\巧手猜图游戏\pictures-web-game\巧手猜图-Demo.html"
t = io.open(f, encoding="utf-8").read()

new_test = r'''async function runOnlineTest(){
  const results=[];
  const rec=(name,ok,detail)=>{results.push({name,ok,detail});};
  const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
  const WALL16=["🎈","🏠","🐟","🌵","☂️","🚲","⛵","🍕","🎸","🌋","🎪","🚀","🐘","🌮","🗼","🌻"];
  window.__pwNoAutoConnect=true;      // 自检内不触发游客真实 WS 连接
  window.__pwCooldownMs=60;           // 自检内冷却缩短
  try{
    /* 1. 创建房间 → 大厅 */
    __PW.handle({t:"created",room_id:"AB12",pid:"pA",nickname:"阿明",
      players:[{pid:"pA",nickname:"阿明",score:0,connected:true,guessed:null,wordHit:false,tried:[]}],
      wall:WALL16, rules:{createSeconds:90,lockSeconds:30}});
    rec("创建→大厅渲染", !!document.querySelector("#pw-players")&&document.querySelector("#pw-players").children.length===1,"lobby");
    rec("房主可开始", !!document.querySelector("#pw-start"),"start 按钮");
    rec("房间码展示", (document.querySelector("h1").textContent||"").includes("AB12"),"");

    /* 2. 玩家加入 */
    __PW.handle({t:"player_joined",players:[
      {pid:"pA",nickname:"阿明",score:0,connected:true,guessed:null,wordHit:false,tried:[]},
      {pid:"pB",nickname:"小红",score:0,connected:true,guessed:null,wordHit:false,tried:[]}]});
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

    /* 4. 猜题人视角：锁定阶段无照片墙 */
    __PW.pid="pB";
    __PW.handle({t:"round_start",round:1,drawer:{pid:"pA",nickname:"阿明"},
      deadline:Date.now()+90000,lockSeconds:30,createSeconds:90});
    await sleep(80);
    rec("猜题人文字竞猜框", !!document.querySelector("#pw-word"),"");
    rec("锁定期无照片墙", !document.querySelector("#pw-photo-holder .wall-grid"),"");
    rec("锁定期提示", (document.querySelector("#pw-gbar").textContent||"").includes("文字竞猜中"),"");

    /* 5. 文字竞猜 + 猜测记录 */
    const winput=document.querySelector("#pw-word");
    winput.value="气球";
    document.querySelector("#pw-wordsend").click();
    await sleep(40);
    rec("猜测记录待定行", !!document.querySelector("#pw-records .guess-record.pending"),"");
    __PW.handle({t:"word_res",correct:true});
    await sleep(40);
    rec("猜测记录命中行", !!document.querySelector("#pw-records .guess-record.hit"),"");
    rec("记录显示+2", (document.querySelector("#pw-records").textContent||"").includes("+2"),"");
    rec("文字命中提示", (document.querySelector("#pw-gbar").textContent||"").includes("文字命中 +2"),"");
    // 未命中记录
    winput.value="汽车";
    document.querySelector("#pw-wordsend").click();
    await sleep(40);
    __PW.handle({t:"word_res",correct:false});
    await sleep(40);
    rec("未命中记录✗", !!document.querySelector("#pw-records .guess-record.miss"),"");

    /* 6. 画布实时同步 */
    __PW.handle({t:"canvas",els:[{kind:"rect",x:1,y:2,w:3,h:4,rot:0,color:"#000"},{kind:"triangle",x:5,y:6,w:7,h:8,rot:0,color:"#000"}]});
    await sleep(60);
    rec("猜题人画布同步", document.querySelector("#pw-gstage").childNodes.length>=2,"");

    /* 7. 解锁：照片墙出现在文字框下方 */
    __PW.deadline=Date.now()+500;
    await sleep(900);
    rec("解锁后照片墙出现", !!document.querySelector("#pw-photo-holder .wall-grid")&&document.querySelector("#pw-photo-holder .wall-grid").children.length===16,"");
    rec("解锁提示", (document.querySelector("#pw-gbar").textContent||"").includes("照片墙开放"),"");
    rec("文字框仍可用", !!document.querySelector("#pw-word"),"");

    /* 8. 无限次选图 + 冷却 */
    document.querySelector("#pw-photo-holder .wall-grid").children[3].click();
    await sleep(40);
    rec("选中格高亮", !!document.querySelector("#pw-photo-holder .wall-grid .cell.picked"),"");
    const ok1=document.querySelector("#pw-gok");
    rec("确认按钮出现", !!ok1,"");
    if(ok1) ok1.click();
    __PW.handle({t:"guess_ok",correct:false,done:false,tried:[3]});
    await sleep(40);
    rec("猜错该格标记✗", !!document.querySelector("#pw-photo-holder .wall-grid .cell.tried"),"");
    rec("冷却倒计时显示", !!document.querySelector("#pw-cd"),"");
    const nonTried=()=>document.querySelector("#pw-photo-holder .wall-grid .cell:not(.tried)");
    rec("冷却中墙锁定", !!nonTried()&&nonTried().disabled,"");
    await sleep(160);
    rec("冷却结束墙解锁", !!nonTried()&&!nonTried().disabled,"");
    rec("已试格仍禁用", document.querySelector("#pw-photo-holder .wall-grid .cell.tried").disabled,"");
    // 第 2 次选对 → 锁定
    nonTried().click();
    await sleep(40);
    const ok2=document.querySelector("#pw-gok");
    if(ok2) ok2.click();
    __PW.handle({t:"guess_ok",correct:true,first:true,done:true,tried:[3]});
    await sleep(60);
    rec("猜对后锁定等待", (document.querySelector("#pw-gbar").textContent||"").includes("等待揭晓"),"");

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

    /* 11. 在线房间列表（自检内不真实连接，模拟 list 消息） */
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
  window.__pwNoAutoConnect=false;
  window.__pwCooldownMs=10000;
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
sub = None
n = len(re.findall(r'async function runOnlineTest\(\)\{.*?\n\}\n(?=function runRoute\(\))', t, re.S))
t, cnt = re.subn(r'async function runOnlineTest\(\)\{.*?\n\}\n(?=function runRoute\(\))', new_test, t, count=1, flags=re.S)
print(f"onlinetest 替换: 匹配{n} 替换{cnt}")
assert cnt == 1, "FAIL"

io.open(f, "w", encoding="utf-8", newline="").write(t)
print("写入完成")
