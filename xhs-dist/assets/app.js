"use strict";
/* =====================================================================
 * 巧手猜图 · 小红书小工具离线版
 * 纯本地、不联网；64 图题库内联；玩家作画 → 生成分享图 → 发小红书 / 存相册
 * ===================================================================== */
window.__XHS__ = true;

/* ================= 内联 64 图题库（离线无需 fetch） ================= */
let PACK_DATA = {"pack":"pictures-web-64-v3-photo","version":4,"scoring":{"category_word":1,"keyword":2,"exact":5},"note":"巧手猜图网页版 64 图词表 v4：每图 = 1 类别词(+1，同类共用) + 2 联想词(+2，全库唯一) + 1 准确词(+5) + aliases 近似名(+2，命中按联想词计分)。词条全部 1 字以上、exact 不与联想词/别名子串重叠、无空白标点。","style_template":"realistic photograph of {SUBJECT}, single subject, clean soft-focus background, natural lighting, professional photography, centered composition, no text, no watermark","images":[{"id":"ani-elephant","category":"动物","category_word":"动物","zh":"大象","keywords":["非洲","长鼻"],"exact":"大象","en_prompt":"realistic photograph of a standing elephant with big ears and long trunk, single subject, clean soft-focus background, natural lighting, professional photography, centered composition, no text, no watermark","aliases":["象","非洲象"]},{"id":"ani-giraffe","category":"动物","category_word":"动物","zh":"长颈鹿","keywords":["草原","长脖子"],"exact":"长颈鹿","en_prompt":"realistic photograph of a giraffe with very long neck and spotted body, single subject, clean soft-focus background, natural lighting, professional photography, centered composition, no text, no watermark","aliases":["长颈","非洲鹿"]},{"id":"ani-penguin","category":"动物","category_word":"动物","zh":"企鹅","keywords":["南极","黑白"],"exact":"企鹅","en_prompt":"realistic photograph of a penguin standing with black back and white belly, single subject, clean soft-focus background, natural lighting, professional photography, centered composition, no text, no watermark","aliases":["鹅"]},{"id":"ani-shark","category":"动物","category_word":"动物","zh":"鲨鱼","keywords":["海洋","尖牙"],"exact":"鲨鱼","en_prompt":"realistic photograph of a shark with dorsal fin and sharp teeth, single subject, clean soft-focus background, natural lighting, professional photography, centered composition, no text, no watermark","aliases":["大白鲨","鱼"]},{"id":"ani-butterfly","category":"动物","category_word":"动物","zh":"蝴蝶","keywords":["花朵","翅膀"],"exact":"蝴蝶","en_prompt":"realistic photograph of a butterfly with two large patterned wings, single subject, clean soft-focus background, natural lighting, professional photography, centered composition, no text, no watermark","aliases":["蝶","彩蝶"]},{"id":"ani-owl","category":"动物","category_word":"动物","zh":"猫头鹰","keywords":["夜间","圆眼"],"exact":"猫头鹰","en_prompt":"realistic photograph of an owl with big round eyes and pointed ears, single subject, clean soft-focus background, natural lighting, professional photography, centered composition, no text, no watermark","aliases":["夜猫子","枭"]},{"id":"ani-turtle","category":"动物","category_word":"动物","zh":"乌龟","keywords":["慢吞吞","龟壳"],"exact":"乌龟","en_prompt":"realistic photograph of a turtle with domed shell and small head, single subject, clean soft-focus background, natural lighting, professional photography, centered composition, no text, no watermark","aliases":["龟","甲鱼"]},{"id":"ani-bee","category":"动物","category_word":"动物","zh":"蜜蜂","keywords":["蜂蜜","采蜜"],"exact":"蜜蜂","en_prompt":"realistic photograph of a striped bee with wings, single subject, clean soft-focus background, natural lighting, professional photography, centered composition, no text, no watermark","aliases":["蜂","嗡嗡"]},{"id":"food-pizza","category":"食物","category_word":"食物","zh":"披萨","keywords":["奶酪","拉丝"],"exact":"披萨","en_prompt":"realistic photograph of a round pizza slice with cheese topping, single subject, clean soft-focus background, natural lighting, professional photography, centered composition, no text, no watermark","aliases":["饼","意大利饼"]},{"id":"food-burger","category":"食物","category_word":"食物","zh":"汉堡","keywords":["快餐","面包"],"exact":"汉堡","en_prompt":"realistic photograph of a hamburger with bun, meat patty and layers, single subject, clean soft-focus background, natural lighting, professional photography, centered composition, no text, no watermark","aliases":["堡","牛肉堡"]},{"id":"food-sushi","category":"食物","category_word":"食物","zh":"寿司","keywords":["日料","海苔"],"exact":"寿司","en_prompt":"realistic photograph of a sushi roll wrapped in nori seaweed, single subject, clean soft-focus background, natural lighting, professional photography, centered composition, no text, no watermark","aliases":["饭团","紫菜卷"]},{"id":"food-icecream","category":"食物","category_word":"食物","zh":"冰淇淋","keywords":["甜品","蛋筒"],"exact":"冰淇淋","en_prompt":"realistic photograph of an ice cream cone with two scoops, single subject, clean soft-focus background, natural lighting, professional photography, centered composition, no text, no watermark","aliases":["雪糕","冰激凌"]},{"id":"food-coffee","category":"食物","category_word":"食物","zh":"咖啡","keywords":["饮品","提神"],"exact":"咖啡","en_prompt":"realistic photograph of a coffee cup with saucer and steam, single subject, clean soft-focus background, natural lighting, professional photography, centered composition, no text, no watermark","aliases":["拿铁","卡布奇诺"]},{"id":"food-hotpot","category":"食物","category_word":"食物","zh":"火锅","keywords":["川味","涮肉"],"exact":"火锅","en_prompt":"realistic photograph of a steaming hot pot with divided broth, single subject, clean soft-focus background, natural lighting, professional photography, centered composition, no text, no watermark","aliases":["涮锅","暖锅"]},{"id":"food-mooncake","category":"食物","category_word":"食物","zh":"月饼","keywords":["中秋","馅料"],"exact":"月饼","en_prompt":"realistic photograph of a round mooncake with patterned top, single subject, clean soft-focus background, natural lighting, professional photography, centered composition, no text, no watermark","aliases":["中秋点心","圆饼"]},{"id":"food-banana","category":"食物","category_word":"食物","zh":"香蕉","keywords":["水果","黄色"],"exact":"香蕉","en_prompt":"realistic photograph of a curved banana bunch, single subject, clean soft-focus background, natural lighting, professional photography, centered composition, no text, no watermark","aliases":["芭蕉","蕉"]},{"id":"veh-sailboat","category":"交通工具","category_word":"交通工具","zh":"帆船","keywords":["船只","大海"],"exact":"帆船","en_prompt":"realistic photograph of a sailboat with white triangular sails on a mast, single subject, clean soft-focus background, natural lighting, professional photography, centered composition, no text, no watermark","aliases":["船","帆"]},{"id":"veh-balloon","category":"交通工具","category_word":"交通工具","zh":"热气球","keywords":["吊篮","升空"],"exact":"热气球","en_prompt":"realistic photograph of a hot air balloon with striped envelope and basket, single subject, clean soft-focus background, natural lighting, professional photography, centered composition, no text, no watermark","aliases":["气球","气艇"]},{"id":"veh-rocket","category":"交通工具","category_word":"交通工具","zh":"火箭","keywords":["发射","火焰"],"exact":"火箭","en_prompt":"realistic photograph of a rocket with fins and exhaust flame, single subject, clean soft-focus background, natural lighting, professional photography, centered composition, no text, no watermark","aliases":["飞船","太空船"]},{"id":"veh-train","category":"交通工具","category_word":"交通工具","zh":"火车","keywords":["铁轨","车厢"],"exact":"火车","en_prompt":"realistic photograph of a locomotive train with windows and wheels, single subject, clean soft-focus background, natural lighting, professional photography, centered composition, no text, no watermark","aliases":["列车","高铁"]},{"id":"veh-helicopter","category":"交通工具","category_word":"交通工具","zh":"直升机","keywords":["螺旋桨","空中"],"exact":"直升机","en_prompt":"realistic photograph of a helicopter with top rotor and tail, single subject, clean soft-focus background, natural lighting, professional photography, centered composition, no text, no watermark","aliases":["飞机","旋翼机"]},{"id":"veh-bicycle","category":"交通工具","category_word":"交通工具","zh":"自行车","keywords":["骑行","车轮"],"exact":"自行车","en_prompt":"realistic photograph of a bicycle with two wheels and handlebar, single subject, clean soft-focus background, natural lighting, professional photography, centered composition, no text, no watermark","aliases":["单车","脚踏车"]},{"id":"veh-motorcycle","category":"交通工具","category_word":"交通工具","zh":"摩托车","keywords":["飞驰","引擎"],"exact":"摩托车","en_prompt":"realistic photograph of a motorcycle with large wheels and seat, single subject, clean soft-focus background, natural lighting, professional photography, centered composition, no text, no watermark","aliases":["机车","摩托"]},{"id":"veh-ship","category":"交通工具","category_word":"交通工具","zh":"轮船","keywords":["甲板","航行"],"exact":"轮船","en_prompt":"realistic photograph of a cruise ship with decks and funnel, single subject, clean soft-focus background, natural lighting, professional photography, centered composition, no text, no watermark","aliases":["船","邮轮"]},{"id":"land-eiffel","category":"地标建筑","category_word":"建筑","zh":"埃菲尔铁塔","keywords":["巴黎","风景"],"exact":"埃菲尔铁塔","en_prompt":"realistic photograph of the Eiffel Tower with lattice structure, single subject, clean soft-focus background, natural lighting, professional photography, centered composition, no text, no watermark","aliases":["铁塔","巴黎铁塔"]},{"id":"land-pyramid","category":"地标建筑","category_word":"建筑","zh":"金字塔","keywords":["埃及","古迹"],"exact":"金字塔","en_prompt":"realistic photograph of a pyramid with triangular faces, single subject, clean soft-focus background, natural lighting, professional photography, centered composition, no text, no watermark","aliases":["法老陵墓","三角塔"]},{"id":"land-lighthouse","category":"地标建筑","category_word":"建筑","zh":"灯塔","keywords":["海岸","灯光"],"exact":"灯塔","en_prompt":"realistic photograph of a lighthouse with light beam on a rock, single subject, clean soft-focus background, natural lighting, professional photography, centered composition, no text, no watermark","aliases":["塔","灯楼"]},{"id":"land-windmill","category":"地标建筑","category_word":"建筑","zh":"风车","keywords":["田园","叶片"],"exact":"风车","en_prompt":"realistic photograph of a windmill with four turning blades, single subject, clean soft-focus background, natural lighting, professional photography, centered composition, no text, no watermark","aliases":["磨坊"]},{"id":"land-castle","category":"地标建筑","category_word":"建筑","zh":"城堡","keywords":["欧洲","塔楼"],"exact":"城堡","en_prompt":"realistic photograph of a castle with towers and battlements, single subject, clean soft-focus background, natural lighting, professional photography, centered composition, no text, no watermark","aliases":["古堡","堡垒"]},{"id":"land-greatwall","category":"地标建筑","category_word":"建筑","zh":"长城","keywords":["中国","蜿蜒"],"exact":"长城","en_prompt":"realistic photograph of the Great Wall winding on mountains with watchtowers, single subject, clean soft-focus background, natural lighting, professional photography, centered composition, no text, no watermark","aliases":["城墙","烽火台"]},{"id":"land-pearl","category":"地标建筑","category_word":"建筑","zh":"东方明珠","keywords":["上海","电视塔"],"exact":"东方明珠","en_prompt":"realistic photograph of the Oriental Pearl Tower with spheres and spire, single subject, clean soft-focus background, natural lighting, professional photography, centered composition, no text, no watermark","aliases":["明珠塔","陆家嘴塔"]},{"id":"land-colosseum","category":"地标建筑","category_word":"建筑","zh":"斗兽场","keywords":["罗马","竞技"],"exact":"斗兽场","en_prompt":"realistic photograph of the Roman Colosseum with arched tiers, single subject, clean soft-focus background, natural lighting, professional photography, centered composition, no text, no watermark","aliases":["竞技场","罗马竞技场"]},{"id":"job-astronaut","category":"职业","category_word":"职业","zh":"宇航员","keywords":["航天","登月"],"exact":"宇航员","en_prompt":"realistic photograph of an astronaut in spacesuit with helmet, single subject, clean soft-focus background, natural lighting, professional photography, centered composition, no text, no watermark","aliases":["太空人","航天员"]},{"id":"job-firefighter","category":"职业","category_word":"职业","zh":"消防员","keywords":["灭火","消防车"],"exact":"消防员","en_prompt":"realistic photograph of a firefighter with helmet and axe, single subject, clean soft-focus background, natural lighting, professional photography, centered composition, no text, no watermark","aliases":["救火队员","消防队员"]},{"id":"job-chef","category":"职业","category_word":"职业","zh":"厨师","keywords":["烹饪","高帽"],"exact":"厨师","en_prompt":"realistic photograph of a chef with tall white hat and apron, single subject, clean soft-focus background, natural lighting, professional photography, centered composition, no text, no watermark","aliases":["大厨","炊事员"]},{"id":"job-doctor","category":"职业","category_word":"职业","zh":"医生","keywords":["治病","白大褂"],"exact":"医生","en_prompt":"realistic photograph of a doctor with stethoscope and white coat, single subject, clean soft-focus background, natural lighting, professional photography, centered composition, no text, no watermark","aliases":["大夫","医师"]},{"id":"job-fisherman","category":"职业","category_word":"职业","zh":"渔民","keywords":["捕鱼","渔船"],"exact":"渔民","en_prompt":"realistic photograph of a fisherman casting a fishing net, single subject, clean soft-focus background, natural lighting, professional photography, centered composition, no text, no watermark","aliases":["渔夫","渔人"]},{"id":"job-police","category":"职业","category_word":"职业","zh":"警察","keywords":["治安","制服"],"exact":"警察","en_prompt":"realistic photograph of a police officer in uniform with cap and badge, single subject, clean soft-focus background, natural lighting, professional photography, centered composition, no text, no watermark","aliases":["民警","警官"]},{"id":"job-teacher","category":"职业","category_word":"职业","zh":"教师","keywords":["教学","黑板"],"exact":"教师","en_prompt":"realistic photograph of a teacher pointing at a blackboard, single subject, clean soft-focus background, natural lighting, professional photography, centered composition, no text, no watermark","aliases":["老师","教员"]},{"id":"job-painter","category":"职业","category_word":"职业","zh":"画家","keywords":["创作","调色盘"],"exact":"画家","en_prompt":"realistic photograph of a painter holding a palette and brush, single subject, clean soft-focus background, natural lighting, professional photography, centered composition, no text, no watermark","aliases":["画师","美术家"]},{"id":"nat-rainbow","category":"自然现象","category_word":"自然","zh":"彩虹","keywords":["雨后","七色"],"exact":"彩虹","en_prompt":"realistic photograph of a rainbow arch with seven color bands, single subject, clean soft-focus background, natural lighting, professional photography, centered composition, no text, no watermark","aliases":["虹","七彩"]},{"id":"nat-lightning","category":"自然现象","category_word":"自然","zh":"闪电","keywords":["乌云","电光"],"exact":"闪电","en_prompt":"realistic photograph of a lightning bolt zigzag shape, single subject, clean soft-focus background, natural lighting, professional photography, centered composition, no text, no watermark","aliases":["雷","霹雳"]},{"id":"nat-shootingstar","category":"自然现象","category_word":"自然","zh":"流星","keywords":["夜空","许愿"],"exact":"流星","en_prompt":"realistic photograph of a shooting star with long glowing tail, single subject, clean soft-focus background, natural lighting, professional photography, centered composition, no text, no watermark","aliases":["陨星"]},{"id":"nat-snowmountain","category":"自然现象","category_word":"自然","zh":"雪山","keywords":["山峰","积雪"],"exact":"雪山","en_prompt":"realistic photograph of a snowy mountain peak, single subject, clean soft-focus background, natural lighting, professional photography, centered composition, no text, no watermark","aliases":["雪峰"]},{"id":"nat-volcano","category":"自然现象","category_word":"自然","zh":"火山","keywords":["爆发","岩浆"],"exact":"火山","en_prompt":"realistic photograph of a volcano with cone shape and crater, single subject, clean soft-focus background, natural lighting, professional photography, centered composition, no text, no watermark","aliases":["喷火口","熔岩山"]},{"id":"nat-snowflake","category":"自然现象","category_word":"自然","zh":"雪花","keywords":["六角","飘落"],"exact":"雪花","en_prompt":"realistic photograph of a six-pointed snowflake, single subject, clean soft-focus background, natural lighting, professional photography, centered composition, no text, no watermark","aliases":["雪片","冰晶"]},{"id":"nat-sunrise","category":"自然现象","category_word":"自然","zh":"日出","keywords":["朝阳","地平线"],"exact":"日出","en_prompt":"realistic photograph of a sunrise with half sun above horizon line, single subject, clean soft-focus background, natural lighting, professional photography, centered composition, no text, no watermark","aliases":["晨曦","旭日"]},{"id":"nat-starrysky","category":"自然现象","category_word":"自然","zh":"星空","keywords":["繁星","银河"],"exact":"星空","en_prompt":"realistic photograph of a starry night sky with moon and many stars, single subject, clean soft-focus background, natural lighting, professional photography, centered composition, no text, no watermark","aliases":["星夜","星河"]},{"id":"cul-lantern","category":"节日文化","category_word":"节日","zh":"灯笼","keywords":["红红","挂饰"],"exact":"灯笼","en_prompt":"realistic photograph of a red Chinese lantern with tassel, single subject, clean soft-focus background, natural lighting, professional photography, centered composition, no text, no watermark","aliases":["灯","花灯"]},{"id":"cul-dragonboat","category":"节日文化","category_word":"节日","zh":"龙舟","keywords":["端午","划船"],"exact":"龙舟","en_prompt":"realistic photograph of a dragon boat with dragon head and paddles, single subject, clean soft-focus background, natural lighting, professional photography, centered composition, no text, no watermark","aliases":["龙船"]},{"id":"cul-liondance","category":"节日文化","category_word":"节日","zh":"舞狮","keywords":["狮头","喜庆"],"exact":"舞狮","en_prompt":"realistic photograph of a lion dance mask with mane and open mouth, single subject, clean soft-focus background, natural lighting, professional photography, centered composition, no text, no watermark","aliases":["狮子","醒狮"]},{"id":"cul-christmastree","category":"节日文化","category_word":"节日","zh":"圣诞树","keywords":["礼物","彩灯"],"exact":"圣诞树","en_prompt":"realistic photograph of a christmas tree with star on top, single subject, clean soft-focus background, natural lighting, professional photography, centered composition, no text, no watermark","aliases":["松树","云杉"]},{"id":"cul-pumpkin","category":"节日文化","category_word":"节日","zh":"南瓜灯","keywords":["鬼脸","雕刻"],"exact":"南瓜灯","en_prompt":"realistic photograph of a jack-o-lantern carved pumpkin with scary face, single subject, clean soft-focus background, natural lighting, professional photography, centered composition, no text, no watermark","aliases":["南瓜","杰克灯"]},{"id":"cul-kite","category":"节日文化","category_word":"节日","zh":"风筝","keywords":["放飞","长线"],"exact":"风筝","en_prompt":"realistic photograph of a diamond kite with tail and string, single subject, clean soft-focus background, natural lighting, professional photography, centered composition, no text, no watermark","aliases":["纸鸢"]},{"id":"cul-redenvelope","category":"节日文化","category_word":"节日","zh":"红包","keywords":["压岁","拜年"],"exact":"红包","en_prompt":"realistic photograph of a red envelope with gold seal, single subject, clean soft-focus background, natural lighting, professional photography, centered composition, no text, no watermark","aliases":["利是"]},{"id":"cul-foldingfan","category":"节日文化","category_word":"节日","zh":"折扇","keywords":["扇面","凉风"],"exact":"折扇","en_prompt":"realistic photograph of an open folding fan with pleated shape, single subject, clean soft-focus background, natural lighting, professional photography, centered composition, no text, no watermark","aliases":["扇子"]},{"id":"spt-football","category":"运动","category_word":"运动","zh":"足球","keywords":["绿茵场","射门"],"exact":"足球","en_prompt":"realistic photograph of a soccer ball with black and white pentagon patches, single subject, clean soft-focus background, natural lighting, professional photography, centered composition, no text, no watermark","aliases":["皮球","蹴鞠"]},{"id":"spt-tennis","category":"运动","category_word":"运动","zh":"网球","keywords":["球场","对打"],"exact":"网球","en_prompt":"realistic photograph of a tennis racket with a small ball, single subject, clean soft-focus background, natural lighting, professional photography, centered composition, no text, no watermark","aliases":["球拍"]},{"id":"spt-archery","category":"运动","category_word":"运动","zh":"射箭","keywords":["靶心","拉弓"],"exact":"射箭","en_prompt":"realistic photograph of a bow with arrow and target, single subject, clean soft-focus background, natural lighting, professional photography, centered composition, no text, no watermark","aliases":["弓箭","箭"]},{"id":"spt-golf","category":"运动","category_word":"运动","zh":"高尔夫","keywords":["球杆","草地"],"exact":"高尔夫","en_prompt":"realistic photograph of a golf club with a small ball, single subject, clean soft-focus background, natural lighting, professional photography, centered composition, no text, no watermark","aliases":["小白球","挥杆"]},{"id":"spt-skiing","category":"运动","category_word":"运动","zh":"滑雪","keywords":["雪道","疾驰"],"exact":"滑雪","en_prompt":"realistic photograph of a pair of skis with poles, single subject, clean soft-focus background, natural lighting, professional photography, centered composition, no text, no watermark","aliases":["双板","雪杖"]},{"id":"spt-surfing","category":"运动","category_word":"运动","zh":"冲浪","keywords":["海浪","平衡"],"exact":"冲浪","en_prompt":"realistic photograph of a surfboard riding a wave, single subject, clean soft-focus background, natural lighting, professional photography, centered composition, no text, no watermark","aliases":["踏浪","浪尖"]},{"id":"spt-baseball","category":"运动","category_word":"运动","zh":"棒球","keywords":["球棒","赛场"],"exact":"棒球","en_prompt":"realistic photograph of a baseball bat with a ball, single subject, clean soft-focus background, natural lighting, professional photography, centered composition, no text, no watermark","aliases":["垒球"]},{"id":"spt-skateboard","category":"运动","category_word":"运动","zh":"滑板","keywords":["跳跃","滑行"],"exact":"滑板","en_prompt":"realistic photograph of a skateboard with four wheels, single subject, clean soft-focus background, natural lighting, professional photography, centered composition, no text, no watermark","aliases":["陆冲","长板"]}]};
/* 全局 loadPack：无论哪个视图调用都拿到同一份内联题库 */
function loadPack(){
  return Promise.resolve(PACK_DATA);
}

/* ================= 本地持久化存储：优先 xhs.miniTool.setStorage（官方持久化），回退 localStorage ================= */
/* 谜题库数据小（形状坐标 JSON，几百字节/条），整表存单 key，总配额 10MB 足够 */
const PUZZLE_KEY="qiaoshou_puzzles_v1";
let _puzzleCache=null; // 内存缓存，避免每次读写都 JSON.parse
async function getLocalData(key){
  try{
    const r=await xhsCall("getStorage",{key});
    if(r && typeof r.data==="string") return JSON.parse(r.data);
  }catch(e){}
  try{
    const s=localStorage.getItem(key);
    if(s) return JSON.parse(s);
  }catch(e){}
  return null;
}
async function setLocalData(key,obj){
  const s=JSON.stringify(obj);
  if(s.length>900*1024) throw new Error("storage quota"); // 单 key 1MB 上限，留余量
  let ok=false;
  try{ await xhsCall("setStorage",{key,data:s}); ok=true; }catch(e){}
  if(!ok){ try{ localStorage.setItem(key,s); ok=true; }catch(e){} }
  return ok;
}
/* 首次启动：把旧 IndexedDB 里的谜题库迁移到官方 setStorage（一次性） */
async function migratePuzzleFromIDB(){
  try{
    const cur=await getLocalData(PUZZLE_KEY);
    if(cur && cur.length) return;
    const hasIDB=typeof indexedDB!=="undefined";
    if(!hasIDB) return;
    const old=await new Promise((res)=>{
      try{
        const r=indexedDB.open("qiaoshou-puzzles",1);
        r.onupgradeneeded=()=>{ try{r.result.createObjectStore("puzzles",{keyPath:"id"});}catch(_){} };
        r.onsuccess=()=>{
          try{
            const db=r.result;
            if(!db.objectStoreNames.contains("puzzles")){ res([]); return; }
            const tx=db.transaction("puzzles","readonly").objectStore("puzzles").getAll();
            tx.onsuccess=()=>res(tx.result||[]);
            tx.onerror=()=>res([]);
          }catch(_){ res([]); }
        };
        r.onerror=()=>res([]);
      }catch(_){ res([]); }
    });
    if(old && old.length){ await setLocalData(PUZZLE_KEY, old); }
  }catch(e){}
}
async function puzzleList(){
  if(_puzzleCache) return _puzzleCache.slice().sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
  await migratePuzzleFromIDB();
  const arr=(await getLocalData(PUZZLE_KEY))||[];
  _puzzleCache=arr;
  return arr.slice().sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
}
async function puzzlePut(item){
  const arr=(await getLocalData(PUZZLE_KEY))||[];
  const i=arr.findIndex(x=>x.id===item.id);
  if(i>=0) arr[i]=item; else arr.push(item);
  await setLocalData(PUZZLE_KEY,arr);
  _puzzleCache=arr;
}
async function puzzleDel(id){
  const arr=(await getLocalData(PUZZLE_KEY))||[];
  const next=arr.filter(x=>x.id!==id);
  await setLocalData(PUZZLE_KEY,next);
  _puzzleCache=next;
}

/* ================= 小红书容器 API 封装（window.xhs 由容器注入，含降级） ================= */
/* 我的图库 / 对局收藏：仍用 IndexedDB（图片 dataURL 较大，不适合 setStorage 单 key） */
const CUSTOM_DB="pw-custom-images", CUSTOM_STORE="images";
const GAME_DB="pw-game-cache", GAME_STORE="images", GAME_CAP=200;
function xhsMini(){ return window.xhs && window.xhs.miniTool; }
/* 统一 Promise 化调用：传回调时返回 undefined，否则返回 Promise；这里统一包成 Promise */
function xhsCall(name, opts){
  const api=xhsMini();
  return new Promise((res,rej)=>{
    if(!api || typeof api[name]!=="function"){ rej(new Error("api_unavailable")); return; }
    let settled=false;
    const wrapped=Object.assign({},opts||{},{
      success:(r)=>{ settled=true; res(r); },
      fail:(e)=>{ settled=true; rej(e); }
    });
    try{
      const p=api[name](wrapped);
      if(p && typeof p.then==="function"){ p.then(res,rej); }
    }catch(e){ rej(e); }
  });
}
/* 把 dataURI 写为临时文件（大 media 建议先落文件），返回 filePath；失败回退原 dataURI */
async function toTempFile(dataURI){
  try{
    const r=await xhsCall("writeTempFile",{data:dataURI});
    if(r && r.filePath) return r.filePath;
  }catch(e){}
  return dataURI;
}
/* 发小红书笔记：携带 1 张分享图（photo_publish） */
async function postNoteImage(dataURI, title, content){
  const url=await toTempFile(dataURI);
  return xhsCall("postNote",{
    title:title||"巧手猜图",
    content:content||"来猜猜我画的是什么？",
    pageType:"photo_publish",
    mediaInfo:{ image_resources:[{url:url}] }
  });
}
/* 保存图片到相册 */
async function saveImageToAlbum(dataURI){
  const url=await toTempFile(dataURI);
  return xhsCall("saveImageToPhotosAlbum",{filePath:url});
}

/* ================= 猜图模式：8 幅原创画（答案 = 64 题库对应词） ================= */
const GUESS_DECK=[
  "spt-skateboard","cul-redenvelope","nat-rainbow","job-chef",
  "land-pyramid","veh-balloon","ani-butterfly","food-pizza"
];
const GUESS_ARTWORK=[
  /* ① 滑板：椭圆板面 + 2 圆轮子 */
  {bg:"#E8F4FD", els:[
    {kind:"ellipse",x:240,y:250,w:300,h:56,color:"#E03131",opacity:0.9},
    {kind:"circle",x:160,y:335,w:70,h:70,color:"#E03131",opacity:0.9},
    {kind:"circle",x:320,y:335,w:70,h:70,color:"#E03131",opacity:0.9}
  ]},
  /* ② 红包：矩形信封 + 三角封口 + 圆纽扣 */
  {bg:"#FFF3BF", els:[
    {kind:"rect",x:240,y:270,w:230,h:270,color:"#E03131",opacity:0.9},
    {kind:"triangle",x:240,y:200,w:230,h:120,color:"#E03131",opacity:0.9},
    {kind:"circle",x:240,y:305,w:46,h:46,color:"#F59F00",opacity:0.95}
  ]},
  /* ③ 彩虹：3 个半圆（红/橙/绿） */
  {bg:"#F0F9FF", els:[
    {kind:"semicircle",x:240,y:340,w:340,h:170,color:"#E03131",opacity:0.9},
    {kind:"semicircle",x:240,y:340,w:260,h:130,color:"#F59F00",opacity:0.9},
    {kind:"semicircle",x:240,y:340,w:180,h:90,color:"#2F9E44",opacity:0.9}
  ]},
  /* ④ 厨师：方块帽 + 圆头 + 水滴身 + 椭圆勺 + 柄 */
  {bg:"#FCE8D5", els:[
    {kind:"rect",x:240,y:155,w:150,h:75,color:"#FFFFFF",opacity:0.95},
    {kind:"circle",x:240,y:240,w:130,h:130,color:"#F5B891",opacity:0.95},
    {kind:"waterdrop",x:240,y:350,w:180,h:200,color:"#FFFFFF",opacity:0.95},
    {kind:"bar",x:135,y:215,w:14,h:120,color:"#9AA5B1",opacity:0.9},
    {kind:"ellipse",x:130,y:295,w:60,h:42,color:"#7B8794",opacity:0.9}
  ]},
  /* ⑤ 金字塔：菱形 + 竖线分隔 */
  {bg:"#FFF8E7", els:[
    {kind:"diamond",x:240,y:275,w:310,h:270,color:"#F5C518",opacity:0.9},
    {kind:"bar",x:240,y:300,w:10,h:210,color:"#D99B0F",opacity:0.85}
  ]},
  /* ⑥ 热气球：水滴气球旋转 180（圆头在上、尖尾朝下）+ 矩形篮子 */
  {bg:"#F0F9FF", els:[
    {kind:"waterdrop",x:240,y:215,w:210,h:270,rot:180,color:"#E03131",opacity:0.9},
    {kind:"rect",x:240,y:385,w:90,h:65,color:"#8D6E63",opacity:0.95}
  ]},
  /* ⑦ 蝴蝶：4 个翅膀根部聚拢到中心 + 细长身体 */
  {bg:"#F0FDF4", els:[
    {kind:"ellipse",x:172,y:205,w:136,h:100,color:"#E03131",opacity:0.85},
    {kind:"ellipse",x:308,y:205,w:136,h:100,color:"#E03131",opacity:0.85},
    {kind:"ellipse",x:178,y:300,w:124,h:88,color:"#F59F00",opacity:0.85},
    {kind:"ellipse",x:302,y:300,w:124,h:88,color:"#F59F00",opacity:0.85},
    {kind:"bar",x:240,y:252,w:15,h:150,color:"#5B4636",opacity:0.9}
  ]},
  /* ⑧ 披萨：圆饼底 + 3 个三角切片（芝士） */
  {bg:"#FFF0F0", els:[
    {kind:"circle",x:240,y:255,w:310,h:310,color:"#E8833A",opacity:0.9},
    {kind:"triangle",x:182,y:218,w:110,h:100,rot:-22,color:"#F5C518",opacity:0.95},
    {kind:"triangle",x:298,y:225,w:110,h:100,rot:24,color:"#F5C518",opacity:0.95},
    {kind:"triangle",x:240,y:310,w:120,h:100,rot:180,color:"#F5C518",opacity:0.95}
  ]}
];

"use strict";
/* ================= 共享配置源（与服务端同一 ruleset） ================= */
const RULESET_ID = "pictures-web-online-v1";
const RULES = {
  elementCap: 60,        // 画布元素上限
  gridW: 4, gridH: 4     // 照片墙 4×4 = 16 张
};
const STAGE = 480;                 // 画布逻辑尺寸
const ICONS = ["☀️","⭐","❤️","➡️","⬆️","🌙","🔥","💧","⚡","❄️","🌊","⛰️","🌳","🌸","🍃","👁️","👄","🌀","⭐","☁️","🌟","❓","➕","🔺"];
const COLORS = ["#E03131","#F59F00","#F1C40F","#2F9E44","#16A085","#2980B9","#3B5BDB","#8E44AD","#E91E63","#8D6E63","#495057","#F8F5EF"];
const CANVAS_BGS = ["#FFFFFF","#BFE3F7","#C6EFCE","#FFF3BF","#FFD6E0","#E6D5F5","#DDEBF7","#FCE8D5"];
const TOOLS = [
  {id:"shape", name:"形状", hint:"点左侧形状，浮动图形跟手；点画布或拖到画布放置；再点同形状取消"},
  {id:"pen",   name:"画笔", hint:"在画布上按住拖动绘制细线，用形状拼主体，画笔只做点睛"}
];
const SHAPES = [
  {kind:"circle",     name:"圆形",   w:90,  h:90},
  {kind:"semicircle", name:"半圆",   w:100, h:50},
  {kind:"triangle",   name:"三角形", w:100, h:90},
  {kind:"ellipse",    name:"椭圆",   w:100, h:60},
  {kind:"diamond",    name:"菱形",   w:90,  h:90},
  {kind:"star",       name:"五角星", w:96,  h:96},
  {kind:"rect",       name:"长方形", w:100, h:60},
  {kind:"square",     name:"正方形", w:80,  h:80},
  {kind:"waterdrop",  name:"水滴",   w:70,  h:100},
  {kind:"arrow",      name:"箭头",   w:100, h:90},
  {kind:"bar",        name:"棒型",   w:14,  h:100},
  {kind:"cross",      name:"十字",   w:90,  h:90}
];

/* ================= 工具函数 ================= */
const $app = document.getElementById("app");
const $toast = document.getElementById("toast");
let toastTimer;
function toast(msg){ $toast.textContent=msg; $toast.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>$toast.classList.remove("show"),2200); }
function shuffle(a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function coordLabel(i){return "ABCD"[Math.floor(i/RULES.gridW)] + ((i%RULES.gridW)+1);}
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function h(tag, attrs={}, ...kids){
  const el=document.createElementNS("http://www.w3.org/2000/svg",tag);
  for(const k in attrs) el.setAttribute(k,attrs[k]);
  for(const kid of kids){ if(kid==null) continue; el.appendChild(typeof kid==="string"?document.createTextNode(kid):kid); }
  return el;
}
function html(tag, attrs={}, htmlStr){
  const e=document.createElement(tag);
  for(const k in attrs){ if(k==="class")e.className=attrs[k]; else if(k.startsWith("on")) e.addEventListener(k.slice(2),attrs[k]); else e.setAttribute(k,attrs[k]); }
  if(htmlStr!=null) e.innerHTML=htmlStr;
  return e;
}
function preloadThumbs(wall){
  (wall||[]).forEach(g=>{ if(g && g.thumb){ const im=new Image(); im.src=g.thumb; } });
}
function levelLabel(level){
  return { exact:"准确词 +5", keyword:"联想词 +2", category:"类别词 +1" }[level] || "文字命中";
}

/* ================= 轻量音效（Web Audio 合成，无素材文件；音量克制，供氛围提示） ================= */
function sfx(name){
  if(sfx._mute) return;
  try{
    const AC=window.AudioContext||window.webkitAudioContext; if(!AC) return;
    const ctx=sfx._ctx||(sfx._ctx=new AC());
    if(ctx.state==="suspended") ctx.resume();
    const now=ctx.currentTime;
    const tone=(hz,vol,dur,type,delay)=>{
      const o=ctx.createOscillator(), g=ctx.createGain();
      o.type=type||"sine"; o.frequency.value=hz;
      g.gain.setValueAtTime(0.0001,now+delay);
      g.gain.linearRampToValueAtTime(vol,now+delay+0.015);
      g.gain.exponentialRampToValueAtTime(0.0001,now+delay+dur);
      o.connect(g); g.connect(ctx.destination);
      o.start(now+delay); o.stop(now+delay+dur+0.05);
    };
    const P={
      hit:()=>{ tone(659,0.15,0.16,"sine",0); tone(880,0.13,0.22,"sine",0.08); },
      win:()=>{ tone(523,0.14,0.13,"sine",0); tone(659,0.14,0.13,"sine",0.07); tone(784,0.15,0.22,"sine",0.14); },
      miss:()=>{ tone(196,0.11,0.18,"triangle",0); },
      tick:()=>{ tone(1046,0.05,0.05,"square",0); },
      reveal:()=>{ tone(392,0.15,0.26,"sine",0); tone(523,0.15,0.26,"sine",0.11); tone(659,0.15,0.3,"sine",0.22); tone(784,0.14,0.42,"sine",0.33); },
      pick:()=>{ tone(784,0.15,0.13,"sine",0); tone(1047,0.13,0.18,"sine",0.06); }
    };
    if(P[name]) P[name]();
  }catch(_){}
}
/* ================= 作品渲染（创作/实时观看/揭晓共用） ================= */
function shapeFor(e){
  const g = h("g",{transform:`translate(${e.x} ${e.y}) rotate(${e.rot||0})`,"data-kind":e.kind});
  const op=typeof e.opacity==="number"?e.opacity:1;
  const col=e.color||"#E03131";
  const w=e.w||80, hh=e.h||80;
  if(e.kind==="rect"||e.kind==="square") g.appendChild(h("rect",{x:-w/2,y:-hh/2,width:w,height:hh,rx:3,fill:col,opacity:op}));
  else if(e.kind==="bar") g.appendChild(h("rect",{x:-w/2,y:-hh/2,width:w,height:hh,rx:2,fill:col,opacity:op}));
  else if(e.kind==="cross"){
    g.appendChild(h("rect",{x:-w/2,y:-hh/6,width:w,height:hh/3,fill:col,opacity:op}));
    g.appendChild(h("rect",{x:-w/6,y:-hh/2,width:w/3,height:hh,fill:col,opacity:op}));
  }
  else if(e.kind==="circle") g.appendChild(h("circle",{r:w/2,fill:col,opacity:op}));
  else if(e.kind==="ellipse") g.appendChild(h("ellipse",{cx:0,cy:0,rx:w/2,ry:hh/2,fill:col,opacity:op}));
  else if(e.kind==="semicircle") g.appendChild(h("path",{d:`M${-w/2},0 A${w/2} ${w/2} 0 0 1 ${w/2},0 Z`,fill:col,opacity:op}));
  else if(e.kind==="triangle") g.appendChild(h("polygon",{points:`0,${-hh/2} ${-w/2},${hh/2} ${w/2},${hh/2}`,fill:col,opacity:op}));
  else if(e.kind==="diamond") g.appendChild(h("polygon",{points:`0,${-hh/2} ${w/2},0 0,${hh/2} ${-w/2},0`,fill:col,opacity:op}));
  else if(e.kind==="crescent") g.appendChild(h("path",{d:`M0,${-w/2} A${w/2} ${w/2} 0 1 1 0,${w/2} A${w*0.35} ${w*0.35} 0 0 0 0,${-w/2} Z`,fill:col,opacity:op,"fill-rule":"evenodd"}));
  else if(e.kind==="star"){
    const sr=w/2, sir=sr*0.382; let sd="";
    for(let i=0;i<10;i++){ const a=(90+i*36)*Math.PI/180; const rr=(i%2===0)?sr:sir; const sx=rr*Math.cos(a), sy=-rr*Math.sin(a); sd+=(i===0?"M":"L")+sx.toFixed(1)+","+sy.toFixed(1); }
    g.appendChild(h("path",{d:sd+"Z",fill:col,opacity:op}));
  }
  else if(e.kind==="waterdrop") g.appendChild(h("path",{d:`M0,${-hh/2} Q${w/2},${-hh*0.05} ${w/2},${hh*0.22} A${w/2} ${hh*0.55} 0 1 1 ${-w/2},${hh*0.22} Q${-w/2},${-hh*0.05} 0,${-hh/2} Z`,fill:col,opacity:op}));
  else if(e.kind==="arrow"){
    g.appendChild(h("rect",{x:-w/2,y:-hh*0.12,width:w*0.72,height:hh*0.24,fill:col,opacity:op}));
    g.appendChild(h("polygon",{points:`${w*0.22},${-hh*0.42} ${w/2},0 ${w*0.22},${hh*0.42}`,fill:col,opacity:op}));
  }
  else if(e.kind==="icon"){
    const t=h("text",{x:0,y:0,"text-anchor":"middle","dominant-baseline":"central","font-size":hh,opacity:op});
    t.textContent=e.glyph; g.appendChild(t);
  }
  else if(e.kind==="path"){
    g.appendChild(h("path",{d:e.d,fill:"none",stroke:col,"stroke-width":e.width||3,"stroke-linecap":"round","stroke-linejoin":"round",opacity:op}));
  }
  return g;
}
function shapeIcon(kind, color){
  const s0=SHAPES.find(s=>s.kind===kind);
  const iw=36, ih=36;
  const sw=s0?Math.max(1,s0.w):iw, sh=s0?Math.max(1,s0.h):ih;
  const scale=Math.min(iw/sw, ih/sh);
  const w=Math.max(3,sw*scale), h=Math.max(3,sh*scale);
  const svgEl=document.createElementNS("http://www.w3.org/2000/svg","svg");
  svgEl.setAttribute("viewBox","0 0 56 56");
  svgEl.appendChild(shapeFor({kind,x:28,y:28,w,h,rot:0,color:color||"#3B5BDB"}));
  return svgEl.outerHTML;
}
function renderArtwork(svg, els, opts={}){
  svg.innerHTML="";
  svg.setAttribute("viewBox",`0 0 ${STAGE} ${STAGE}`);
  svg.style.height=svg.getBoundingClientRect().width+"px";
  svg.appendChild(h("rect",{x:0,y:0,width:STAGE,height:STAGE,fill:opts.bg||"#FBFAF6"}));
  els.forEach(e=>svg.appendChild(shapeFor(e)));
}

/* ================= 离线版路由（覆盖 main 的 route） ================= */
function route(){
  const hash=location.hash||"#/";
  const [path,query=""]=hash.slice(1).split("?");
  const params=Object.fromEntries(new URLSearchParams(query));
  const parts=path.split("/").filter(Boolean);
  /* 小红书离线版：所有联网/自检入口重定向回首页 */
  if(window.__XHS__ && (parts[0]==="online"||parts[0]==="onlinetest"||parts[0]==="puzzletest")){
    location.hash="#/"; return;
  }
  if(path==="/"||path==="/home"||parts.length===0) renderHome();
  else if(parts[0]==="guess") renderGuess();
  else if(parts[0]==="online") renderOnline();
  else if(parts[0]==="onlinetest") runOnlineTest();
  else if(parts[0]==="puzzletest") runPuzzleTest();
  else if(parts[0]==="puzzle"){
    /* load 参数或 puzzle/<id> 都按谜题库恢复处理（离线无服务端谜题） */
    if(params.load) renderPuzzleEditor(params.load);
    else if(parts[1]) renderPuzzleEditor(parts[1]);
    else renderPuzzleEditor();
  }
  else if(parts[0]==="mylib") renderMyLib();
  else renderHome();
  window.scrollTo(0,0);
}

/* ================= 离线版首页（作画 / 猜图 / 我的图库） ================= */
function renderHome(){
  $app.innerHTML="";
  const w=html("div",{class:"wrap"});
  w.innerHTML=`
  <div class="hero">
    <h1>巧手猜图</h1>
    <div class="sub">用一套「不够像」的形状，把照片里的东西抽象地画出来；也可以看别人的画猜词。全程离线，随时创作。</div>
    <div class="ruleset">纯离线 · 64 张写实照片 · 8 道原创猜题</div>
  </div>
  <div class="hero-actions">
    <button class="primary" id="go-puzzle" style="min-width:220px">🎨 我来作画</button>
    <button class="primary alt" id="go-guess" style="min-width:220px">🔍 我来猜</button>
    <button class="primary" id="go-mylib" style="min-width:220px">🗂️ 我的图库</button>
  </div>
  <div class="rule-grid">
    <div class="rule-card">
      <div class="big">🎨</div>
      <h3>我来作画 · 拼出抽象画</h3>
      <span class="sub">从 64 张照片里选一张目标（或上传自己的照片），用<b>12 种形状 + 画笔</b>把它抽象地拼出来，画布随时可改。</span>
    </div>
    <div class="rule-card">
      <div class="big">📕</div>
      <h3>生成分享图 · 发小红书</h3>
      <span class="sub">画好后一键生成 2:3 分享图（不含谜底），直接发小红书笔记或保存到相册，让朋友在评论区猜答案。</span>
    </div>
    <div class="rule-card">
      <div class="big">🔍</div>
      <h3>我来猜 · 8 道原创题</h3>
      <span class="sub">看 8 幅抽象画猜词，可打字也可从照片墙里选；记录每题用时，全部猜中查看总结。</span>
    </div>
  </div>`;
  w.querySelector("#go-puzzle").addEventListener("click",()=>location.hash="#/puzzle");
  w.querySelector("#go-guess").addEventListener("click",()=>location.hash="#/guess");
  w.querySelector("#go-mylib").addEventListener("click",()=>location.hash="#/mylib");
  $app.appendChild(w);
}

/* 谜题/作品缩略图：把形状数组渲染成内联 SVG 字符串 */
function thumbSVG(rec){
  const bg=rec.bg||"#FFFFFF";
  const parts=(rec.canvas||[]).map(e=>shapeFor(e).outerHTML).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${STAGE} ${STAGE}" style="width:100%;height:100%;display:block"><rect x="0" y="0" width="${STAGE}" height="${STAGE}" fill="${bg}"/>${parts}</svg>`;
}

/* ================= 离线版「我的图库 / 我的谜题库」（无对局收藏） ================= */
function renderMyLib(){
  $app.innerHTML="";
  const w=html("div",{class:"wrap"});
  const card=html("div",{class:"card",style:"max-width:640px;margin:0 auto"});
  card.innerHTML=`
    <div class="row" style="align-items:center"><h1 style="margin:0">我的图库</h1><button class="ghost" id="ml-back" style="flex:none">返回首页</button></div>
    <div class="sub" id="ml-cap"></div>
    <div class="row" style="margin-top:10px">
      <button class="primary" id="ml-upload" style="flex:1">上传新图片</button>
      <button class="primary" id="ml-mine" style="flex:1">我的图库</button>
      <button class="ghost" id="ml-puzzles" style="flex:1">我的谜题库</button>
    </div>
    <div id="ml-grid" class="img-grid"></div>
    <div id="ml-more" style="text-align:center;margin-top:10px"></div>`;
  w.appendChild(card); $app.appendChild(w);
  card.querySelector("#ml-back").onclick=()=>location.hash="#/";
  const PAGE=60;
  let tab="mine", mine=[], puzzles=[], shown=PAGE;
  const capEl=card.querySelector("#ml-cap");
  const showCap=async()=>{
    let t="";
    try{ const e=await navigator.storage.estimate(); if(e.quota&&e.usage!=null) t=`（已用 ${(e.usage/1048576).toFixed(0)}MB / ${(e.quota/1073741824).toFixed(0)}GB）`; }catch(_){}
    capEl.textContent=`本机存储 · 我的图库 ${mine.length} 张 · 谜题库 ${puzzles.length} 道${t}`;
  };
  const escS=v=>String(v==null?"":v);
  const wordForm=({title,init})=>new Promise(res=>{
    const mk=html("div",{class:"mask"});
    mk.innerHTML=`<div class="pop" style="max-width:440px">
      <h3>${title}</h3>
      <div class="field-label">图片名称</div><input id="mf-name" class="pw-in" value="${escS(init.name)}" placeholder="猜题人可见">
      <div class="field-label">类别词</div><input id="mf-cat" class="pw-in" value="${escS(init.category_word)}" placeholder="如：交通工具">
      <div class="field-label">联想词 1</div><input id="mf-kw1" class="pw-in" value="${escS(init.keywords&&init.keywords[0])}" placeholder="如：海">
      <div class="field-label">联想词 2</div><input id="mf-kw2" class="pw-in" value="${escS(init.keywords&&init.keywords[1])}" placeholder="可选">
      <div class="field-label">准确词 <b style="color:#C0392B">* 必填</b></div><input id="mf-exact" class="pw-in" value="${escS(init.exact)}" placeholder="如：帆船">
      <div class="row" style="margin-top:14px"><button class="primary" id="mf-ok" style="flex:1">保存</button><button class="ghost" id="mf-no">取消</button></div>
    </div>`;
    document.body.appendChild(mk);
    mk.querySelector("#mf-no").onclick=()=>{ mk.remove(); res(null); };
    mk.querySelector("#mf-ok").onclick=()=>{
      const exact=mk.querySelector("#mf-exact").value.trim();
      if(!exact){ toast("准确词必填"); return; }
      res({
        name:mk.querySelector("#mf-name").value.trim()||exact,
        category_word:mk.querySelector("#mf-cat").value.trim(),
        keywords:[mk.querySelector("#mf-kw1").value.trim(),mk.querySelector("#mf-kw2").value.trim()].filter(Boolean),
        exact
      });
      mk.remove();
    };
  });

  /* 绘制我的图库 tab */
  const drawMine=()=>{
    const grid=card.querySelector("#ml-grid");
    const slice=mine.slice(0,shown);
    grid.innerHTML="";
    if(!slice.length){ grid.innerHTML=`<div class="note" style="grid-column:1/-1">还没有图片，点「上传新图片」开始收藏</div>`; return; }
    slice.forEach(g=>{
      const cell=html("div",{class:"img-cell"});
      cell.innerHTML=`<img src="${esc(g.img)}" alt="${esc(g.name||g.exact||g.zh)}"><span>${esc(g.name||g.exact||g.zh)}</span><button class="mini-del" title="删除">✕</button>`;
      const im=cell.querySelector("img");
      if(im) im.onerror=()=>{ if(!cell.querySelector(".img-broken")) cell.appendChild(html("div",{class:"img-broken"},"加载失败")); };
      cell.querySelector(".mini-del").onclick=(ev)=>{
        ev.stopPropagation();
        if(!window.confirm(`删除「${g.name||g.exact||g.zh}」？`)) return;
        customDel(g.id).then(()=>{ mine=mine.filter(x=>x.id!==g.id); draw(); showCap(); toast("已删除"); });
      };
      cell.onclick=()=>viewDetail(g);
      grid.appendChild(cell);
    });
    const more=card.querySelector("#ml-more");
    more.innerHTML=mine.length>shown?`<button class="ghost" id="ml-more-btn">加载更多（${mine.length-shown} 张）</button>`:"";
    const mb=more.querySelector("#ml-more-btn");
    if(mb) mb.onclick=()=>{ shown+=PAGE; draw(); };
  };

  /* 绘制我的谜题库 tab：缩略图 + 名称 + 草稿标记；点击继续编辑 */
  const drawPuzzles=()=>{
    const grid=card.querySelector("#ml-grid");
    grid.innerHTML="";
    const drafts=puzzles.filter(p=>p.draft);
    const published=puzzles.filter(p=>!p.draft);
    const list=drafts.concat(published);
    if(!list.length){ grid.innerHTML=`<div class="note" style="grid-column:1/-1">还没有谜题。画好后点「发布谜题」，或退出时自动保存草稿</div>`; card.querySelector("#ml-more").innerHTML=""; return; }
    list.slice(0,shown).forEach(p=>{
      const title=p.zh||p.exact||"未命名谜题";
      const cell=html("div",{class:"img-cell"+(p.draft?" draft-cell":"")});
      cell.innerHTML=`<div style="width:100%;aspect-ratio:1;border-radius:6px;overflow:hidden;background:#fff">${thumbSVG(p)}</div>
        <span>${esc(title)}${p.draft?" · 草稿":""}</span>
        <button class="mini-del" title="删除">✕</button>`;
      cell.querySelector(".mini-del").onclick=(ev)=>{
        ev.stopPropagation();
        if(!window.confirm(`删除${p.draft?"草稿":"谜题"}「${title}」？`)) return;
        puzzleDel(p.id).then(()=>{ puzzles=puzzles.filter(x=>x.id!==p.id); draw(); showCap(); toast("已删除"); });
      };
      cell.onclick=()=>{ location.hash=`#/puzzle?load=${encodeURIComponent(p.id)}`; };
      grid.appendChild(cell);
    });
    card.querySelector("#ml-more").innerHTML="";
  };

  function draw(){
    if(tab==="mine") drawMine();
    else drawPuzzles();
  }

  /* 词条详情：查看图片的全部词语；自己上传可编辑 */
  function viewDetail(g){
    const isOwn=g.source!=="import";
    const mk=html("div",{class:"mask"});
    mk.innerHTML=`<div class="pop" style="max-width:420px">
      <h3>${esc(g.name||g.exact||g.zh)}</h3>
      <div style="text-align:center;margin:10px 0"><img src="${esc(g.img)}" alt="" style="max-width:100%;max-height:240px;width:auto;height:auto;object-fit:contain;border-radius:12px;border:2px solid #C7BCA4"></div>
      <div class="kw-line">类别词 <b>${esc(g.category_word||g.category||"—")}</b></div>
      <div class="kw-line">联想词 <b>${esc((g.keywords||[]).filter(Boolean).join("、")||"—")}</b></div>
      <div class="kw-line">准确词 <b style="color:#C0392B">${esc(g.exact||"—")}</b></div>
      <div class="row" style="margin-top:14px">${isOwn?`<button class="primary" id="vd-edit" style="flex:1">编辑词条</button>`:""}<button class="ghost" id="vd-close" style="flex:1">关闭</button></div>
    </div>`;
    document.body.appendChild(mk);
    mk.querySelector("#vd-close").onclick=()=>mk.remove();
    if(isOwn){
      mk.querySelector("#vd-edit").onclick=async()=>{
        const r=await wordForm({title:"编辑词条",init:g});
        if(!r) return;
        await customPut({...g,...r});
        mk.remove(); mine=await customList(); draw(); showCap(); toast("已保存");
      };
    }
  }

  const switchTab=(t)=>{
    tab=t; shown=PAGE;
    card.querySelector("#ml-mine").classList.toggle("primary",t==="mine");
    card.querySelector("#ml-mine").classList.toggle("ghost",t!=="mine");
    card.querySelector("#ml-puzzles").classList.toggle("primary",t==="puzzles");
    card.querySelector("#ml-puzzles").classList.toggle("ghost",t!=="puzzles");
    draw();
  };
  card.querySelector("#ml-mine").onclick=()=>switchTab("mine");
  card.querySelector("#ml-puzzles").onclick=()=>switchTab("puzzles");
  card.querySelector("#ml-upload").onclick=async()=>{
    const r=await uploadForm();
    if(!r) return;
    let img=null;
    for(const [side,q] of [[512,0.82],[384,0.72],[256,0.65]]){
      try{ const c=await compressImage(r.cropped,side,q); if(c){ img=c; break; } }catch(_){}
    }
    if(!img || img.length>1.5e6){ toast("图片太大或压缩失败"); return; }
    const fp=await imgFp(img);
    const dup=mine.find(x=>x.fp===fp);
    if(dup){ toast("图库里已有这张图片"); return; }
    await customPut({id:"cu-"+Date.now().toString(36)+Math.random().toString(36).slice(2,5),img,name:r.name,exact:r.exact,category_word:r.category_word,keywords:r.keywords,aliases:[],fp,source:"own",createdAt:Date.now()});
    mine=await customList(); draw(); showCap(); toast("已存入我的图库");
  };
  Promise.all([customList(),puzzleList()]).then(([a,b])=>{ mine=a; puzzles=b; showCap(); draw(); });
}


async function imgFp(dataURL){
  try{
    const buf = await (await fetch(String(dataURL||""))).arrayBuffer();
    const d = await crypto.subtle.digest("SHA-256", buf);
    return [...new Uint8Array(d)].map(b=>b.toString(16).padStart(2,"0")).join("").slice(0,16);
  }catch(e){
    let h=5381; const s=String(dataURL||"");
    for(let i=0;i<s.length;i++){ h=((h<<5)+h+s.charCodeAt(i))>>>0; }
    return "fb"+h.toString(16);
  }
}
function idbOpen(){
  return new Promise((res,rej)=>{
    const r=indexedDB.open(CUSTOM_DB,1);
    r.onupgradeneeded=()=>{ if(!r.result.objectStoreNames.contains(CUSTOM_STORE)) r.result.createObjectStore(CUSTOM_STORE,{keyPath:"id"}); };
    r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error);
  });
}
async function customList(){
  const db=await idbOpen();
  return new Promise((res,rej)=>{ const tx=db.transaction(CUSTOM_STORE,"readonly").objectStore(CUSTOM_STORE).getAll(); tx.onsuccess=()=>res(tx.result||[]); tx.onerror=()=>rej(tx.error); });
}
async function customPut(item){
  /* 写入校验：图片必须是合法的 data:image URL，防止坏记录进图库 */
  const img=String(item&&item.img||"");
  if(!/^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(img) || img.length<64 || img.length>1.5e6) throw new Error("invalid image");
  const db=await idbOpen();
  return new Promise((res,rej)=>{ const tx=db.transaction(CUSTOM_STORE,"readwrite").objectStore(CUSTOM_STORE).put(item); tx.onsuccess=()=>res(); tx.onerror=()=>rej(tx.error); });
}
async function customDel(id){
  const db=await idbOpen();
  return new Promise((res,rej)=>{ const tx=db.transaction(CUSTOM_STORE,"readwrite").objectStore(CUSTOM_STORE).delete(id); tx.onsuccess=()=>res(); tx.onerror=()=>rej(tx.error); });
}
/* ---- 对局收藏：独立 IndexedDB，只存对局中见过的房间自定义图（系统 64 图不收藏），上限 GAME_CAP 张 FIFO ---- */
function idbGameOpen(){
  return new Promise((res,rej)=>{
    const r=indexedDB.open(GAME_DB,1);
    r.onupgradeneeded=()=>{ if(!r.result.objectStoreNames.contains(GAME_STORE)) r.result.createObjectStore(GAME_STORE,{keyPath:"id"}); };
    r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error);
  });
}
async function gameList(){
  const db=await idbGameOpen();
  return new Promise((res,rej)=>{ const tx=db.transaction(GAME_STORE,"readonly").objectStore(GAME_STORE).getAll(); tx.onsuccess=()=>res((tx.result||[]).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0))); tx.onerror=()=>rej(tx.error); });
}
async function gamePut(item){
  const img=String(item&&item.img||"");
  if(!/^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(img) || img.length<64 || img.length>1.5e6) throw new Error("invalid image");
  const db=await idbGameOpen();
  await new Promise((res,rej)=>{ const tx=db.transaction(GAME_STORE,"readwrite").objectStore(GAME_STORE).put(item); tx.onsuccess=()=>res(); tx.onerror=()=>rej(tx.error); });
  /* FIFO：超出上限删除最旧 */
  const all=await gameList();
  if(all.length>GAME_CAP){
    const stale=all.slice(GAME_CAP);
    const db2=await idbGameOpen();
    await new Promise((res,rej)=>{ const tx=db2.transaction(GAME_STORE,"readwrite").objectStore(GAME_STORE); stale.forEach(x=>tx.objectStore(GAME_STORE).delete(x.id)); tx.oncomplete=()=>res(); tx.onerror=()=>rej(tx.error); });
  }
  return item;
}
async function gameDel(id){
  const db=await idbGameOpen();
  return new Promise((res,rej)=>{ const tx=db.transaction(GAME_STORE,"readwrite").objectStore(GAME_STORE).delete(id); tx.onsuccess=()=>res(); tx.onerror=()=>rej(tx.error); });
}
async function gameClear(){
  const db=await idbGameOpen();
  return new Promise((res,rej)=>{ const tx=db.transaction(GAME_STORE,"readwrite").objectStore(GAME_STORE).clear(); tx.onsuccess=()=>res(); tx.onerror=()=>rej(tx.error); });
}
/* 自动收藏：把对局照片墙里的房间自定义图写入收藏（按指纹去重，系统图跳过） */
async function gameCollect(wall){
  if(!Array.isArray(wall)) return;
  for(const g of wall){
    if(!g || !String(g.img||"").startsWith("data:image/")) continue;   // 只收房间自定义图（dataURL），系统图不收藏
    try{
      const fp = await imgFp(g.img);
      await gamePut({ id:"gp-"+fp, fp, img:g.img, zh:g.zh||"我的图片", category:g.category||"自定义", exact:g.exact||"", keywords:g.keywords||[], aliases:g.aliases||[], category_word:g.category_word||"", contributor:g.contributor||"", createdAt:Date.now() });
    }catch(_){}
  }
}

/* ===== 图片裁剪对话框：1:1 / 4:3 / 3:4 / 自由；拖框+底图缩放；返回原尺寸 JPEG dataURL，取消返回 null ===== */
function clampNum(v,lo,hi){ return Math.max(lo, Math.min(hi, v)); }
function cropImageDialog(raw){
  return new Promise(res=>{
    const im=new Image();
    im.onload=()=>{
      const iw=im.naturalWidth, ih=im.naturalHeight;
      const STAGE_H=Math.min(360, Math.round((window.innerHeight||800)*0.55));
      const mk=html("div",{class:"mask"});
      mk.innerHTML=`<div class="pop" style="max-width:480px;width:calc(100vw - 40px)">
        <h3>裁剪图片</h3>
        <div class="row" style="gap:6px;flex-wrap:wrap" id="crop-ratios">
          <button class="ghost" data-r="1" style="min-width:52px;background:var(--brand);color:#fff;border-color:var(--brand)">1:1</button>
          <button class="ghost" data-r="4/3" style="min-width:52px">4:3</button>
          <button class="ghost" data-r="3/4" style="min-width:52px">3:4</button>
          <button class="ghost" data-r="" style="min-width:52px">自由</button>
          <div class="sub" style="align-self:center;margin-left:6px">选择构图比例，拖动裁剪框</div>
        </div>
        <div id="crop-stage" style="position:relative;overflow:hidden;border-radius:12px;background:repeating-conic-gradient(#ECE7DA 0 25%, #FFFDF6 0 50%) 0 0/18px 18px;border:1px solid var(--line);margin-top:8px"></div>
        <div class="row" style="margin-top:10px;justify-content:center;gap:10px">
          <button class="ghost" id="crop-zo">－ 缩小</button>
          <button class="ghost" id="crop-zi">放大 ＋</button>
          <div class="sub" style="align-self:center">也可滚动滚轮缩放 · 拖动图片移动</div>
        </div>
        <div class="row" style="margin-top:12px;align-items:center">
          <div id="crop-pv" style="flex:none;width:72px;height:72px;border:2px solid var(--gold);border-radius:10px;overflow:hidden;background:#fff;display:flex;align-items:center;justify-content:center"><img alt="预览" style="max-width:100%;max-height:100%;object-fit:contain"></div>
          <div class="sub" style="flex:1;padding:0 10px">裁剪后的图片按所选比例完整展示，不再被二次裁切</div>
          <button class="ghost" id="crop-no">取消</button>
          <button class="primary" id="crop-ok" style="margin-left:8px">确认裁剪</button>
        </div>
      </div>`;
      document.body.appendChild(mk);
      const stage=mk.querySelector("#crop-stage");
      const sw=Math.min(440, (stage.parentElement.clientWidth||440)-32), sh=STAGE_H;
      stage.style.width=sw+"px"; stage.style.height=sh+"px";
      const img=html("img");
      img.src=raw; img.style.position="absolute"; img.style.userSelect="none"; img.style.touchAction="none";
      img.style.width=iw+"px"; img.style.height=ih+"px"; img.style.transformOrigin="0 0"; img.style.cursor="move";
      stage.appendChild(img);
      const box=html("div");
      box.style.cssText="position:absolute;border:2px solid #fff;outline:1px solid rgba(0,0,0,.35);box-shadow:0 0 0 9999px rgba(0,0,0,.35);cursor:move;touch-action:none;background:transparent";
      stage.appendChild(box);
      const grip=html("div");
      grip.style.cssText="position:absolute;right:-7px;bottom:-7px;width:14px;height:14px;background:var(--brand);border:2px solid #fff;border-radius:4px;cursor:nwse-resize;touch-action:none";
      box.appendChild(grip);
      let ratio="1", bs=0, tx=0, ty=0;
      const bs0=Math.min((sw-16)/iw,(sh-16)/ih);
      function applyImg(){ img.style.transform=`translate(${tx}px,${ty}px) scale(${bs})`; }
      function applyBox(){ box.style.left=box.x+"px"; box.style.top=box.y+"px"; box.style.width=box.w+"px"; box.style.height=box.h+"px"; }
      function resetView(){
        bs=bs0; tx=(sw-iw*bs)/2; ty=(sh-ih*bs)/2;
        const cx=sw/2, cy=sh/2, s=Math.min(sw,sh)*0.68;
        box.w=s; box.h=s; box.x=cx-s/2; box.y=cy-s/2;
        applyImg(); applyBox(); syncRatioBtns(); refreshPv();
      }
      function syncRatioBtns(){
        mk.querySelectorAll("#crop-ratios button").forEach(b=>{
          b.style.background=(b.dataset.r===ratio)?"var(--brand)":"";
          b.style.color=(b.dataset.r===ratio)?"#fff":"";
          b.style.borderColor=(b.dataset.r===ratio)?"var(--brand)":"";
        });
      }
      function setRatio(r){
        ratio=r;
        const cx=box.x+box.w/2, cy=box.y+box.h/2;
        let w,h;
        const maxW=sw-4, maxH=sh-4;
        if(r==="1"){ const s=Math.min(maxW,maxH)*0.78; w=h=s; }
        else if(r==="4/3"){ w=Math.min(maxW,maxH)*0.82; h=w*3/4; }
        else if(r==="3/4"){ h=Math.min(maxW,maxH)*0.82; w=h*3/4; }
        else { w=Math.min(maxW,box.w); h=Math.min(maxH,box.h); }
        box.w=w; box.h=h; box.x=clampNum(cx-w/2,0,sw-w); box.y=clampNum(cy-h/2,0,sh-h);
        applyBox(); syncRatioBtns(); refreshPv();
      }
      function refreshPv(){
        const out=exportCrop(true);
        if(out){ mk.querySelector("#crop-pv img").src=out; }
      }
      function exportCrop(skipToast){
        const sx=(box.x-tx)/bs, sy=(box.y-ty)/bs;
        const cx0=clampNum(sx,0,iw), cy0=clampNum(sy,0,ih);
        const ew=Math.min(iw-cx0, box.w/bs), eh=Math.min(ih-cy0, box.h/bs);
        if(ew<2||eh<2){ if(!skipToast) toast("裁剪区域超出图片，请调整裁剪框"); return null; }
        const c=document.createElement("canvas");
        c.width=Math.max(1,Math.round(ew)); c.height=Math.max(1,Math.round(eh));
        c.getContext("2d").drawImage(im, cx0,cy0,ew,eh, 0,0,c.width,c.height);
        return c.toDataURL("image/jpeg",0.92);
      }
      /* 拖拽（框 / 手柄 / 底图） */
      let drag=null;
      stage.addEventListener("pointerdown",ev=>{
        if(ev.target===grip){
          ev.preventDefault(); ev.stopPropagation();
          try{ stage.setPointerCapture(ev.pointerId); }catch(_){}
          const rw=box.w, rh=box.h;
          drag={type:"grip",sx:ev.clientX,sy:ev.clientY,ow:rw,oh:rh};
        } else if(ev.target===box){
          ev.preventDefault();
          try{ stage.setPointerCapture(ev.pointerId); }catch(_){}
          drag={type:"box",sx:ev.clientX,sy:ev.clientY,ox:box.x,oy:box.y};
        } else if(ev.target===img){
          ev.preventDefault();
          try{ stage.setPointerCapture(ev.pointerId); }catch(_){}
          drag={type:"img",sx:ev.clientX,sy:ev.clientY,otx:tx,oty:ty};
        }
      });
      stage.addEventListener("pointermove",ev=>{
        if(!drag) return;
        const dx=ev.clientX-drag.sx, dy=ev.clientY-drag.sy;
        if(drag.type==="box"){
          box.x=clampNum(drag.ox+dx,0,sw-box.w); box.y=clampNum(drag.oy+dy,0,sh-box.h);
          applyBox();
        } else if(drag.type==="img"){
          tx=clampNum(drag.otx+dx, sw-iw*bs, 0); ty=clampNum(drag.oty+dy, sh-ih*bs, 0);
          applyImg();
        } else if(drag.type==="grip"){
          let nw,nh;
          if(ratio===""){ nw=clampNum(drag.ow+dx,40,sw); nh=clampNum(drag.oh+dy,40,sh); }
          else{
            const rv=ratio==="1"?1:(ratio==="4/3"?4/3:3/4);
            nw=clampNum(drag.ow+dx,40,sw); nh=nw/rv;
            if(nh>sh){ nh=sh; nw=nh*rv; }
          }
          box.w=nw; box.h=nh;
          box.x=clampNum(box.x,0,sw-nw); box.y=clampNum(box.y,0,sh-nh);
          applyBox();
        }
      });
      stage.addEventListener("pointerup",()=>{ if(drag){ drag=null; refreshPv(); } });
      stage.addEventListener("wheel",ev=>{
        ev.preventDefault();
        const f=ev.deltaY<0?1.1:1/1.1;
        bs=clampNum(bs*f, bs0*0.9, 10);
        tx=clampNum(tx, sw-iw*bs, 0); ty=clampNum(ty, sh-ih*bs, 0);
        applyImg();
      },{passive:false});
      mk.querySelector("#crop-zo").onclick=()=>{ bs=clampNum(bs/1.15, bs0*0.9, 10); tx=clampNum(tx, sw-iw*bs, 0); ty=clampNum(ty, sh-ih*bs, 0); applyImg(); };
      mk.querySelector("#crop-zi").onclick=()=>{ bs=clampNum(bs*1.15, bs0*0.9, 10); tx=clampNum(tx, sw-iw*bs, 0); ty=clampNum(ty, sh-ih*bs, 0); applyImg(); };
      mk.querySelectorAll("#crop-ratios button").forEach(b=>b.onclick=()=>setRatio(b.dataset.r));
      mk.querySelector("#crop-no").onclick=()=>{ mk.remove(); res(null); };
      mk.querySelector("#crop-ok").onclick=()=>{
        const out=exportCrop(false);
        if(out){ mk.remove(); res(out); }
      };
      resetView();
    };
    im.onerror=()=>res(null);
    im.src=raw;
  });
}

/* 独立上传表单弹窗：选图 → 裁剪 → 填词语 → 返回 {cropped,name,exact,category_word,keywords}；取消返回 null */
function uploadForm(){
  return new Promise(resolve=>{
    const mk=html("div",{class:"mask"});
    mk.innerHTML=`<div class="pop" style="max-width:480px;width:calc(100vw - 40px)">
      <h3>上传新图片</h3>
      <div class="row"><input type="file" id="uf-file" accept="image/*" style="flex:1;font-size:13px"><button class="ghost" id="uf-pick">选择图片</button></div>
      <div id="uf-preview" style="display:none;margin-top:10px">
        <img id="uf-img" alt="预览" style="max-width:96px;max-height:96px;width:auto;height:auto;object-fit:contain;border-radius:10px;border:1.5px solid var(--line);display:block">
        <input id="uf-name" class="pw-in" placeholder="图片名称（猜题人可见，选填）">
        <input id="uf-cat" class="pw-in" placeholder="类别词（必填，如：动物）">
        <input id="uf-kw1" class="pw-in" placeholder="联想词1（如：草原）">
        <input id="uf-kw2" class="pw-in" placeholder="联想词2（可选）">
        <input id="uf-exact" class="pw-in" placeholder="准确词（必填，如：长颈鹿）">
      </div>
      <div class="row" style="margin-top:14px"><button class="ghost" id="uf-cancel" style="flex:1">取消</button><button class="primary" id="uf-ok" style="flex:1">确认</button></div>
    </div>`;
    document.body.appendChild(mk);
    let cropped=null;
    const fileInput=mk.querySelector("#uf-file");
    mk.querySelector("#uf-pick").onclick=()=>fileInput.click();
    fileInput.onchange=async()=>{
      const f=fileInput.files&&fileInput.files[0]; if(!f) return;
      try{
        const raw=await fileToDataURL(f);
        const c=await cropImageDialog(raw);
        if(!c){ fileInput.value=""; return; }
        cropped=c;
        mk.querySelector("#uf-img").src=c;
        mk.querySelector("#uf-preview").style.display="block";
      }catch(e){ toast("图片读取失败"); fileInput.value=""; }
    };
    mk.querySelector("#uf-cancel").onclick=()=>{ mk.remove(); resolve(null); };
    mk.querySelector("#uf-ok").onclick=()=>{
      if(!cropped){ toast("请先选择并裁剪图片"); return; }
      const cat=String(mk.querySelector("#uf-cat").value||"").trim();
      const exact=String(mk.querySelector("#uf-exact").value||"").trim();
      if(!cat||!exact){ toast("类别词和准确词必填"); return; }
      const name=String(mk.querySelector("#uf-name").value||"").trim()||exact;
      const kws=[String(mk.querySelector("#uf-kw1").value||"").trim(),String(mk.querySelector("#uf-kw2").value||"").trim()].filter(Boolean).slice(0,2);
      mk.remove();
      resolve({cropped, name, exact, category_word:cat, keywords:kws});
    };
  });
}

function fileToDataURL(file){
  return new Promise((res,rej)=>{ const fr=new FileReader(); fr.onload=()=>res(fr.result); fr.onerror=()=>rej(fr.error); fr.readAsDataURL(file); });
}
function compressImage(dataURL, maxSide, quality){
  /* 降级重试：512/0.82 → 384/0.72 → 256/0.65，全部失败返回 null（调用方拒绝，不再回退原图） */
  maxSide=maxSide||512; quality=quality||0.82;
  const tries=[[maxSide,quality],[Math.min(maxSide,384),0.72],[Math.min(maxSide,256),0.65]];
  return new Promise((res)=>{
    const im=new Image();
    im.onload=()=>{
      const step=(i)=>{
        if(i>=tries.length){ res(null); return; }
        try{
          const [side,q]=tries[i];
          const k=Math.min(1, side/Math.max(im.width,im.height));
          const c=document.createElement("canvas");
          c.width=Math.max(1,Math.round(im.width*k)); c.height=Math.max(1,Math.round(im.height*k));
          c.getContext("2d").drawImage(im,0,0,c.width,c.height);
          const out=c.toDataURL("image/jpeg",q);
          res(out.length>1.5e6 ? step(i+1) : out);
        }catch(e){ step(i+1); }
      };
      step(0);
    };
    im.onerror=()=>res(null);
    im.src=dataURL;
  });
}

/* ================= 单人谜题（画好→分享链接→朋友猜） ================= */
function renderPuzzleEditor(loadId){
  const state={els:[],selected:null,tool:"shape",pickShape:"circle",color:COLORS[0],opacity:0.7,strokeW:3,history:[],future:[],ghost:null,bg:"#FFFFFF"};
  $app.innerHTML="";
  const wrap=html("div",{class:"wrap"});
  wrap.innerHTML=`
  <div class="topbar">
    <button class="ghost" id="back">← 首页</button>
    <span class="title">单人出题 · 自由创作</span>
    <span class="spacer"></span>
  </div>
  <div class="target-strip" id="target-strip">
    <div class="tp-photo" id="tp-photo">🖼️</div>
    <div class="tp-meta"><b id="tp-name">尚未选择目标照片</b><div class="sub" id="tp-sub">从 64 图选一张，或上传自己的照片（发布时作为答案）</div></div>
    <button class="ghost" id="tp-pick" style="flex:none">选择</button>
  </div>
  <div class="editor">
    <div class="stage-wrap">
      <div class="stage-row">
        <div class="shape-rail" id="shape-rail"></div>
        <div class="shape-rail-mini" id="shape-rail-mini" title="展开形状">⤢</div>
        <svg class="stage" id="stage"></svg>
      </div>
      <div class="hint" id="hint"></div>
      <div class="canvas-ops">
        <button id="up">置顶</button>
        <button id="down">置底</button>
        <button id="del">删除</button>
        <button id="undo">↩ 撤销</button>
        <button id="redo">↪ 重做</button>
        <button id="clear">清空</button>
      </div>
      <div class="tool-bar panel">
        <div class="tb-group"><div class="tabs" id="tabs"></div></div>
        <div class="tb-group"><h3>颜色</h3><div class="swatches" id="swatches"></div></div>
        <div class="tb-group"><h3>背景</h3><div class="swatches" id="bgswatches"></div></div>
        <div class="tb-group"><h3>不透明度</h3><div class="row"><input type="range" id="opacity" min="20" max="100" value="70"><span id="opacityv">70%</span><span id="opacity-state" class="op-state"></span></div></div>
        <div class="tb-group" id="toolbody"></div>
        <div class="counter">元素 <b id="cnt">0</b> / ${RULES.elementCap}</div>
      </div>
      <div class="publish-bar" style="margin-top:14px">
        <button class="primary" id="publish" style="width:100%;min-height:52px;font-size:17px">发布谜题</button>
      </div>
    </div>
  </div>`;
  $app.appendChild(wrap);
  wrap.querySelector("#back").onclick=async()=>{ await saveDraft(); location.hash="#/"; };
  const svg=wrap.querySelector("#stage");
  window.addEventListener("resize",function rs(){ if(!document.body.contains(svg)){window.removeEventListener("resize",rs);return;} const w=svg.getBoundingClientRect().width; svg.style.height=Math.max(300,Math.min(w,window.innerHeight-270))+"px"; draw(); });
  const tabsEl=wrap.querySelector("#tabs");
  const swEl=wrap.querySelector("#swatches");
  const bodyEl=wrap.querySelector("#toolbody");
  const hintEl=wrap.querySelector("#hint");
  const cntEl=wrap.querySelector("#cnt");
  const railEl=wrap.querySelector("#shape-rail"), railMini=wrap.querySelector("#shape-rail-mini");
  let railCollapsed=false;
  function renderRail(){
    railEl.innerHTML="";
    const grid=html("div",{class:"rail-grid"});
    SHAPES.forEach(s0=>grid.appendChild(makeShapeBtn(s0,true)));
    railEl.appendChild(grid);
    const col=html("button",{class:"rail-col",title:"收起形状栏"},"◀");
    col.onclick=()=>{railCollapsed=true;syncUI();};
    railEl.appendChild(col);
  }
  railMini.onclick=()=>{railCollapsed=false;renderRail();syncUI();};
  renderRail();
  TOOLS.forEach(t=>{
    const b=html("button",{class:state.tool===t.id?"on":""},t.name);
    b.onclick=()=>{state.tool=t.id;state.selected=null;state.ghost=null;state.ghostShape=null;document.removeEventListener("pointermove",followGhost);renderGhost();syncUI();};
    tabsEl.appendChild(b);
  });
  COLORS.forEach(col=>{
    const s=html("button",{class:"swatch"+(state.color===col?" on":""),"data-col":col});
    s.style.background=col;
    s.onclick=()=>{state.color=col;if(state.selected!=null){commit();const e=state.els[state.selected];e.color=col;}syncUI();};
    swEl.appendChild(s);
  });
  const bgSwEl=wrap.querySelector("#bgswatches");
  CANVAS_BGS.forEach(col=>{
    const s=html("button",{class:"swatch"+(state.bg===col?" on":""),"data-bg":col});
    s.style.background=col;
    if(col==="#FFFFFF"){ s.style.border="1.5px dashed #ccc"; s.title="白色"; }
    s.onclick=()=>{state.bg=col;syncUI();};
    bgSwEl.appendChild(s);
  });
  const opEl=wrap.querySelector("#opacity"), opvEl=wrap.querySelector("#opacityv");
  opEl.addEventListener("input",()=>{
    state.opacity=+opEl.value/100; opvEl.textContent=opEl.value+"%";
    const st=wrap.querySelector("#opacity-state");
    if(state.selected!=null){ const e=state.els[state.selected]; e.opacity=state.opacity; draw(); if(st) st.textContent="已应用到选中元素"; }
    else { if(st) st.textContent="将应用到下一个放置的形状"; }
  });
  opEl.addEventListener("change",()=>{ if(state.selected!=null) commit(); });
  function commit(){ state.history.push(JSON.stringify(state.els)); if(state.history.length>60)state.history.shift(); state.future=[]; if(typeof scheduleAutoSave==="function") scheduleAutoSave(); }
  function syncUI(){
    [...tabsEl.children].forEach((b,i)=>b.className=TOOLS[i].id===state.tool?"on":"");
    [...swEl.children].forEach(s=>s.className="swatch"+(s.dataset.col===state.color?" on":""));
    [...(bgSwEl?bgSwEl.children:[])].forEach(s=>s.className="swatch"+(s.dataset.bg===state.bg?" on":""));
    hintEl.textContent=TOOLS.find(t=>t.id===state.tool).hint;
    cntEl.textContent=state.els.length;
    if(state.selected!=null && state.els[state.selected]){
      const e=state.els[state.selected];
      state.opacity=e.opacity;
      opEl.value=Math.round(e.opacity*100); opvEl.textContent=opEl.value+"%";
    }
    if(railEl){
      railEl.classList.toggle("open", !railCollapsed);
      railMini.classList.toggle("show", railCollapsed);
    }
    document.querySelectorAll("[data-shape-btn]").forEach(btn=>{
      btn.classList.toggle("on", state.pickShape===btn.dataset.kind);
    });
    draw();
  }
  function addElement(e){
    if(state.els.length>=RULES.elementCap){toast(`单作品元素上限 ${RULES.elementCap} 个`);return;}
    commit(); state.els.push(e); state.selected=state.els.length-1; syncUI();
  }
  function addShapeAt(x,y){
    const s0=SHAPES.find(s=>s.kind===state.pickShape)||SHAPES[0];
    addElement({kind:s0.kind,x,y,w:s0.w,h:s0.h,rot:0,color:state.color,opacity:state.opacity});
    // 一次一放：放置后清除选中形状与浮动图形，需重新选形状才能再放
    state.selected=null;
    state.pickShape=null;
    state.ghost=null; state.ghostShape=null;
    document.removeEventListener("pointermove",followGhost);
    renderGhost(); syncUI();
  }
  function followGhost(e){
    if(!state.ghost) return;
    const p=pt(e);
    state.ghost.x=Math.max(0,Math.min(STAGE,p.x));
    state.ghost.y=Math.max(0,Math.min(STAGE,p.y));
    renderGhost();
  }
  function enableFloat(kind){
    state.pickShape=kind; state.ghostShape=kind;
    state.ghost={x:STAGE/2,y:STAGE/2};
    document.addEventListener("pointermove",followGhost);
    renderGhost(); syncUI();
  }
  function cancelFloat(){
    state.ghost=null; state.ghostShape=null;
    document.removeEventListener("pointermove",followGhost);
    renderGhost(); syncUI();
  }
  function togglePick(kind){
    if(state.ghost && state.ghost.x!=null && state.ghostShape===kind){ cancelFloat(); }
    else { enableFloat(kind); }
    state.selected=null;
  }
  function makeShapeBtn(s0, inFloat){
    const b=html("button",{class:state.pickShape===s0.kind?"on":"",title:s0.name,"data-shape-btn":"","data-kind":s0.kind});
    b.innerHTML=inFloat?shapeIcon(s0.kind,state.color):shapeIcon(s0.kind,state.color)+`<b>${s0.name}</b>`;
    let pointerUsed=false;
    b.addEventListener("pointerdown",(ev)=>{
      if(window.matchMedia&&window.matchMedia("(pointer: coarse)").matches){ return; }
      pointerUsed=true; ev.preventDefault();
      state.pickShape=s0.kind; syncUI();
      if(!state.ghost){ state.ghost={x:null,y:null}; }
      let dragged=false;
      const mv=(e)=>{
        const p=pt(e);
        if(state.ghost){ state.ghost.x=Math.max(0,Math.min(STAGE,p.x)); state.ghost.y=Math.max(0,Math.min(STAGE,p.y)); dragged=true; renderGhost(); }
      };
      const up=()=>{
        document.removeEventListener("pointermove",mv);
        document.removeEventListener("pointerup",up);
        if(dragged){
          if(state.ghost && state.ghost.x!=null && state.ghost.y!=null){ addShapeAt(state.ghost.x,state.ghost.y); }
          else { cancelFloat(); }
        } else { togglePick(s0.kind); }
      };
      document.addEventListener("pointermove",mv);
      document.addEventListener("pointerup",up);
    });
    b.addEventListener("click",(ev)=>{
      if(!pointerUsed){ togglePick(s0.kind); }
      pointerUsed=false;
    });
    return b;
  }
  function buildToolBody(){
    bodyEl.innerHTML="";
  }
  buildToolBody();
  const origSync=syncUI;
  syncUI=function(){origSync();buildToolBody();};
  const NS="http://www.w3.org/2000/svg";
  let ghostG=null;
  function draw(){
    renderArtwork(svg,state.els,{bg:state.bg});
    if(state.selected!=null && state.els[state.selected]){
      const e=state.els[state.selected];
      const g=h("g",{transform:`translate(${e.x} ${e.y}) rotate(${e.rot||0})`});
      g.appendChild(h("rect",{x:-e.w/2-6,y:-e.h/2-6,width:e.w+12,height:e.h+12,rx:8,fill:"none",stroke:"#3B5BDB","stroke-width":1.5,"stroke-dasharray":"5 4"}));
      const handles=[[-1,-1],[1,-1],[1,1],[-1,1],[1,0],[0,1]];
      handles.forEach(([hx,hy])=>{
        const hg=h("g",{"data-hx":hx,"data-hy":hy});
        hg.appendChild(h("rect",{x:hx*e.w/2-20,y:hy*e.h/2-20,width:40,height:40,rx:8,fill:"transparent"}));
        hg.appendChild(h("rect",{x:hx*e.w/2-7,y:hy*e.h/2-7,width:14,height:14,rx:3,fill:"#fff",stroke:"#3B5BDB","stroke-width":1.5}));
        g.appendChild(hg);
      });
      const rg=h("g",{"data-rot":"1"});
      rg.appendChild(h("circle",{cx:0,cy:-e.h/2-34,r:24,fill:"transparent"}));
      rg.appendChild(h("circle",{cx:0,cy:-e.h/2-28,r:9,fill:"#F59F00",stroke:"#fff","stroke-width":2}));
      g.appendChild(rg);
      g.appendChild(h("line",{x1:0,y1:-e.h/2-6,x2:0,y2:-e.h/2-19,stroke:"#3B5BDB","stroke-width":1.5}));
      /* 浮动 +1 复制按钮：path 不显示；右边缘自动翻到左侧 */
      if(e.kind!=="path"){
        const onRight=(e.x + e.w/2 + 46) <= STAGE;
        const bx=onRight ? (e.w/2+24) : (-e.w/2-24);
        const by=-e.h/2-24;
        const cg=h("g",{"data-copy":"1",style:"cursor:pointer"});
        cg.appendChild(h("circle",{cx:bx,cy:by,r:22,fill:"transparent"}));
        cg.appendChild(h("circle",{cx:bx,cy:by,r:16,fill:"#3B5BDB",stroke:"#fff","stroke-width":2}));
        cg.appendChild(h("text",{x:bx,y:by+4,"text-anchor":"middle","font-size":"13","font-weight":"700",fill:"#fff","pointer-events":"none"},"+1"));
        g.appendChild(cg);
      }
      svg.appendChild(g);
    }
    renderGhost();
  }
  function pt(ev){
    const m=svg.getScreenCTM();
    const p=new DOMPoint(ev.clientX,ev.clientY).matrixTransform(m.inverse());
    return {x:p.x,y:p.y};
  }
  function renderGhost(){
    if(ghostG){ ghostG.remove(); ghostG=null; }
    if(state.tool!=="shape" || !state.ghost || state.ghost.x==null) return;
    const s0=SHAPES.find(s=>s.kind===state.pickShape)||SHAPES[0];
    ghostG=shapeFor({kind:s0.kind,x:state.ghost.x,y:state.ghost.y,w:s0.w,h:s0.h,rot:0,color:state.color,opacity:0.45});
    ghostG.setAttribute("pointer-events","none");
    ghostG.setAttribute("data-ghost","1");
    svg.appendChild(ghostG);
  }
  let drag=null;
  svg.addEventListener("pointerdown",ev=>{
    const p=pt(ev); try{svg.setPointerCapture(ev.pointerId);}catch(_){}
    const rotH=ev.target.closest("[data-rot]");
    const hand=ev.target.closest("[data-hx]");
    const cpBtn=ev.target.closest("[data-copy]");
    if(cpBtn){
      /* 浮动 +1：深拷贝选中元素，偏移 18px，自动选中新副本 */
      if(state.selected!=null && state.els[state.selected]){
        const src=state.els[state.selected];
        const copy=JSON.parse(JSON.stringify(src));
        copy.x=src.x+18; copy.y=src.y+18;
        clamp(copy);
        if(state.els.length>=RULES.elementCap){ toast(`单作品元素上限 ${RULES.elementCap} 个`); return; }
        commit();
        state.els.push(copy);
        state.selected=state.els.length-1;
        if(opEl){ state.opacity=copy.opacity; opEl.value=Math.round(copy.opacity*100); opvEl.textContent=opEl.value+"%"; }
        syncUI(); draw();
      }
      return;
    }
    if(rotH){
      const e=state.els[state.selected];
      drag={type:"rot",e,start:performance.now(),before:JSON.stringify(state.els),startRot:e.rot||0};
    } else if(hand){
      const e=state.els[state.selected];
      drag={type:"scale",e,hx:+hand.dataset.hx,hy:+hand.dataset.hy,ow:e.w,oh:e.h,before:JSON.stringify(state.els),startW:e.w,startH:e.h};
    } else {
      const gg=ev.target.closest("g[data-kind]");
      if(gg){
        const idx=[...svg.querySelectorAll("g[data-kind]:not([data-ghost])")].indexOf(gg);
        state.selected=idx;
        if(state.els[idx] && opEl){ state.opacity=state.els[idx].opacity; opEl.value=Math.round(state.els[idx].opacity*100); opvEl.textContent=opEl.value+"%"; }
        drag={type:"move",e:state.els[idx],dx:p.x-state.els[idx].x,dy:p.y-state.els[idx].y,before:JSON.stringify(state.els),startX:state.els[idx].x,startY:state.els[idx].y};
        draw();
      } else if(state.tool==="pen"){
        commit();
        drag={type:"draw",pts:[[p.x,p.y]]};
      } else if(state.tool==="shape" && state.pickShape){
        addShapeAt(p.x,p.y);
      } else {
        state.selected=null; draw();
      }
    }
  });
  svg.addEventListener("pointermove",ev=>{
    const p=pt(ev);
    if(!drag){
      if(state.tool==="shape" && state.ghost && state.pickShape){ state.ghost.x=p.x; state.ghost.y=p.y; renderGhost(); }
      return;
    }
    if(drag.type==="move"){drag.e.x=p.x-drag.dx;drag.e.y=p.y-drag.dy;clamp(drag.e);draw();}
    else if(drag.type==="rot"){
      const e=drag.e;
      let ang=Math.atan2(p.y-e.y,p.x-e.x)*180/Math.PI+90;
      e.rot=Math.round(ang); draw();
    } else if(drag.type==="scale"){
      const e=drag.e;
      const rad=-(e.rot||0)*Math.PI/180;
      const lx=(p.x-e.x)*Math.cos(rad)-(p.y-e.y)*Math.sin(rad);
      const ly=(p.x-e.x)*Math.sin(rad)+(p.y-e.y)*Math.cos(rad);
      let nw=Math.max(20,Math.abs(lx)*2), nh=Math.max(20,Math.abs(ly)*2);
      if(drag.hx!==0 && drag.hy!==0){ const s=Math.max(nw/drag.ow,nh/drag.oh); nw=drag.ow*s; nh=drag.oh*s; }
      else if(drag.hx!==0){ nw=drag.ow*(nw/drag.ow); nh=drag.oh; }
      else { nh=drag.oh*(nh/drag.oh); nw=drag.ow; }
      e.w=nw; e.h=nh; draw();
    } else if(drag.type==="draw"){
      const last=drag.pts[drag.pts.length-1];
      if(Math.hypot(p.x-last[0],p.y-last[1])>4){drag.pts.push([p.x,p.y]);drawTempPath();}
    }
  });
  svg.addEventListener("pointerup",()=>{
    if(!drag)return;
    if(drag.type==="draw"){
      if(drag.pts.length>=2){
        const xs=drag.pts.map(q=>q[0]),ys=drag.pts.map(q=>q[1]);
        const cx=(Math.min(...xs)+Math.max(...xs))/2, cy=(Math.min(...ys)+Math.max(...ys))/2;
        const w=Math.max(12,Math.max(...xs)-Math.min(...xs)), h=Math.max(12,Math.max(...ys)-Math.min(...ys));
        const d=smoothPath(drag.pts.map(q=>[q[0]-cx,q[1]-cy]));
        state.els.push({kind:"path",x:cx,y:cy,w,h,rot:0,color:state.color,width:state.strokeW,d});
        if(state.els.length>RULES.elementCap){state.els.pop();toast(`单作品元素上限 ${RULES.elementCap} 个`);}
        state.selected=state.els.length-1;
      } else { state.history.pop(); }
      syncUI();
    } else if(drag.type==="move"){
      /* 只有真的位移>2px 才入撤销栈，点选不污染历史 */
      if(Math.abs(drag.e.x-drag.startX)>2 || Math.abs(drag.e.y-drag.startY)>2){
        state.history.push(drag.before); if(state.history.length>60) state.history.shift(); state.future=[];
        scheduleAutoSave();
      }
    } else if(drag.type==="rot"){
      if((drag.e.rot||0)!==drag.startRot){
        state.history.push(drag.before); if(state.history.length>60) state.history.shift(); state.future=[];
        scheduleAutoSave();
      }
    } else if(drag.type==="scale"){
      if(Math.abs(drag.e.w-drag.startW)>1 || Math.abs(drag.e.h-drag.startH)>1){
        state.history.push(drag.before); if(state.history.length>60) state.history.shift(); state.future=[];
        scheduleAutoSave();
      }
    }
    drag=null;
  });
  function clamp(e){ e.x=Math.max(0,Math.min(STAGE,e.x)); e.y=Math.max(0,Math.min(STAGE,e.y)); }
  function drawTempPath(){
    draw();
    const d=smoothPath(drag.pts);
    svg.appendChild(h("path",{d,fill:"none",stroke:state.color,"stroke-width":state.strokeW,"stroke-linecap":"round","stroke-linejoin":"round",opacity:.8}));
  }
  function smoothPath(pts){
    if(pts.length===2) return `M${pts[0][0]},${pts[0][1]} L${pts[1][0]},${pts[1][1]}`;
    let d=`M${pts[0][0]},${pts[0][1]}`;
    for(let i=1;i<pts.length-1;i++){
      const mx=(pts[i][0]+pts[i+1][0])/2, my=(pts[i][1]+pts[i+1][1])/2;
      d+=` Q${pts[i][0]},${pts[i][1]} ${mx},${my}`;
    }
    const last=pts[pts.length-1]; d+=` L${last[0]},${last[1]}`;
    return d;
  }
  wrap.querySelector("#del").onclick=()=>{if(state.selected==null)return;commit();state.els.splice(state.selected,1);state.selected=null;syncUI();};
  wrap.querySelector("#up").onclick=()=>{if(state.selected==null)return;commit();const e=state.els.splice(state.selected,1)[0];state.els.push(e);state.selected=state.els.length-1;syncUI();};
  wrap.querySelector("#down").onclick=()=>{if(state.selected==null)return;commit();const e=state.els.splice(state.selected,1)[0];state.els.unshift(e);state.selected=0;syncUI();};
  wrap.querySelector("#undo").onclick=()=>{if(!state.history.length)return;state.future.push(JSON.stringify(state.els));state.els=JSON.parse(state.history.pop());state.selected=null;syncUI();};
  wrap.querySelector("#redo").onclick=()=>{if(!state.future.length)return;state.history.push(JSON.stringify(state.els));state.els=JSON.parse(state.future.pop());state.selected=null;syncUI();};
  let clearArmed=false, clearTimer=null;
  wrap.querySelector("#clear").onclick=()=>{
    const b=wrap.querySelector("#clear");
    if(!clearArmed){
      clearArmed=true; b.classList.add("arm"); b.textContent="再点确认清空";
      clearTimer=setTimeout(()=>{clearArmed=false;b.classList.remove("arm");b.textContent="清空";},3000);
      return;
    }
    clearTimeout(clearTimer); clearArmed=false; b.classList.remove("arm"); b.textContent="清空";
    commit(); state.els=[]; state.selected=null; state.ghost=null; state.ghostShape=null; document.removeEventListener("pointermove",followGhost); syncUI();
  };
  window.addEventListener("keydown",function kd(ev){
    if(!$app.contains(svg)){window.removeEventListener("keydown",kd);return;}
    if(ev.key==="Delete"&&state.selected!=null){wrap.querySelector("#del").click();}
    if((ev.ctrlKey||ev.metaKey)&&ev.key.toLowerCase()==="z"){ev.preventDefault();ev.shiftKey?wrap.querySelector("#redo").click():wrap.querySelector("#undo").click();}
  });

  /* ---- 目标照片：从系统图库选 / 上传自己的图（发布时作为答案） ---- */
  let target=null;   // {kind:"pack",g} | {kind:"custom",g}
  function drawTarget(){
    const photo=wrap.querySelector("#tp-photo"), name=wrap.querySelector("#tp-name"), sub=wrap.querySelector("#tp-sub");
    if(!photo) return;
    if(!target){
      photo.innerHTML="🖼️"; name.textContent="尚未选择目标照片";
      sub.textContent="从 64 图选一张，或上传自己的照片（发布时作为答案）";
      return;
    }
    photo.innerHTML=`<img src="${target.kind==="pack"?("images-thumb/"+target.g.id+".jpg"):esc(target.g.img)}" alt="">`;
    name.textContent=target.kind==="pack"?target.g.zh:(target.g.name||target.g.exact);
    sub.textContent=target.kind==="pack"?("系统图库 · 类别："+target.g.category):("自定义 · 类别："+(target.g.category_word||"未设")+" · 准确词："+(target.g.exact||"未设"));
  }
  function pickTarget(){
    const packPromise=loadPack();
    const mk=html("div",{class:"mask"});
    mk.innerHTML=`<div class="pop" style="max-width:540px">
      <h3>选择目标照片</h3>
      <div class="tabs" id="pt-tabs"><button class="pt-tab on" data-v="pack">系统图库</button><button class="pt-tab" data-v="custom">我的图片</button></div>
      <div id="pt-pack"><div class="cat-tabs" id="pt-cats"></div><div class="img-grid" id="pt-grid" style="max-height:300px;overflow:auto"></div></div>
      <div id="pt-custom" style="display:none">
        <div class="img-grid" id="pt-mygrid" style="max-height:210px;overflow:auto"></div>
        <div style="margin-top:10px;border-top:1px dashed #E3DDD0;padding-top:10px">
          <div class="sub" style="margin-bottom:6px">上传自己的照片（自动压缩；保存后点缩略图选中）：</div>
          <div class="row"><input type="file" id="pt-file" accept="image/*" style="flex:1;font-size:13px"><button class="ghost" id="pt-upload">选择图片</button></div>
          <div id="pt-preview" style="display:none;margin-top:8px">
            <img id="pt-pvimg" alt="预览" style="max-width:84px;max-height:84px;width:auto;height:auto;object-fit:contain;border-radius:10px;border:1.5px solid var(--line);display:block">
            <input id="pt-name" class="pw-in" placeholder="图片名称（猜题人可见）">
            <input id="pt-cat" class="pw-in" placeholder="类别词（必填，如：动物）">
            <input id="pt-kw1" class="pw-in" placeholder="联想词1（如：草原）">
            <input id="pt-kw2" class="pw-in" placeholder="联想词2（可选）">
            <input id="pt-exact" class="pw-in" placeholder="准确词（必填，如：长颈鹿）">
            <button class="primary" id="pt-save" style="width:100%;margin-top:8px">保存到自定义图库</button>
          </div>
        </div>
      </div>
      <div class="row" style="margin-top:14px"><button class="primary" id="pt-ok" style="flex:1">选为目标</button><button class="ghost" id="pt-cancel">取消</button></div>
    </div>`;
    document.body.appendChild(mk);
    let ptSel=null, pack=null, cats=[], cat="", ptRaw="";
    const catTabs=mk.querySelector("#pt-cats"), grid=mk.querySelector("#pt-grid"), myGrid=mk.querySelector("#pt-mygrid");
    packPromise.then(pk=>{ pack=pk; cats=[...new Set(pk.images.map(g=>g.category))]; cat=cats[0]||""; drawCats(); drawImgs(); }).catch(()=>toast("系统图库加载失败"));
    function drawCats(){
      catTabs.innerHTML="";
      cats.forEach(c=>{
        const b=html("button",{class:"cat-tab"+(c===cat?" on":"")},c);
        b.onclick=()=>{cat=c;drawCats();drawImgs();};
        catTabs.appendChild(b);
      });
    }
    function drawImgs(){
      grid.innerHTML="";
      (pack?pack.images:[]).filter(g=>g.category===cat).forEach(g=>{
        const b=html("button",{class:"img-cell"+(ptSel&&ptSel.kind==="pack"&&ptSel.g.id===g.id?" on":"")});
        b.innerHTML=`<img src="images-thumb/${g.id}.jpg" alt="${esc(g.zh)}"><span>${esc(g.zh)}</span>`;
        b.onclick=()=>{ptSel={kind:"pack",g};drawImgs();drawMy();};
        grid.appendChild(b);
      });
    }
    function drawMy(){
      customList().then(list=>{
        myGrid.innerHTML="";
        list.forEach(g=>{
          const b=html("button",{class:"img-cell"+(ptSel&&ptSel.kind==="custom"&&ptSel.g.id===g.id?" on":"")});
          b.innerHTML=`<img src="${esc(g.img)}" alt="${esc(g.name||g.exact)}"><span>${esc(g.name||g.exact)}</span>`;
          b.onclick=()=>{ptSel={kind:"custom",g};drawMy();drawImgs();};
          myGrid.appendChild(b);
        });
      });
    }
    const ptFile=mk.querySelector("#pt-file");
    mk.querySelector("#pt-upload").onclick=()=>ptFile.click();
    ptFile.onchange=async()=>{
      const f=ptFile.files&&ptFile.files[0]; if(!f) return;
      const rawD=await fileToDataURL(f);
      const cropped=await cropImageDialog(rawD);
      if(!cropped){ ptFile.value=""; return; }
      ptRaw=await compressImage(cropped,512,0.82);
      if(!ptRaw){ toast("图片处理失败或过大，请换一张"); ptFile.value=""; return; }
      mk.querySelector("#pt-pvimg").src=ptRaw;
      mk.querySelector("#pt-preview").style.display="block";
    };
    mk.querySelector("#pt-save").onclick=async()=>{
      const catv=String(mk.querySelector("#pt-cat").value||"").trim();
      const exactv=String(mk.querySelector("#pt-exact").value||"").trim();
      if(!ptRaw){ toast("请先选择图片"); return; }
      if(!catv||!exactv){ toast("类别词和准确词必填"); return; }
      const item={id:"cu-"+Date.now().toString(36)+Math.random().toString(36).slice(2,5),img:ptRaw,name:String(mk.querySelector("#pt-name").value||"").trim()||exactv,category_word:catv,keywords:[String(mk.querySelector("#pt-kw1").value||"").trim(),String(mk.querySelector("#pt-kw2").value||"").trim()].filter(Boolean).slice(0,2),aliases:[],exact:exactv,source:"own",createdAt:Date.now()};
      try{ await customPut(item); }catch(e){ toast("图片无效，请重试"); return; }
      toast("已保存到自定义图库");
      ptRaw=""; mk.querySelector("#pt-preview").style.display="none"; ptFile.value="";
      mk.querySelector("#pt-name").value="";mk.querySelector("#pt-cat").value="";mk.querySelector("#pt-kw1").value="";mk.querySelector("#pt-kw2").value="";mk.querySelector("#pt-exact").value="";
      drawMy();
    };
    mk.querySelectorAll("#pt-tabs .pt-tab").forEach(t=>{
      t.onclick=()=>{
        mk.querySelectorAll("#pt-tabs .pt-tab").forEach(x=>x.classList.remove("on"));
        t.classList.add("on");
        const v=t.dataset.v;
        mk.querySelector("#pt-pack").style.display=v==="pack"?"block":"none";
        mk.querySelector("#pt-custom").style.display=v==="custom"?"block":"none";
        if(v==="pack") drawImgs(); else drawMy();
      };
    });
    mk.querySelector("#pt-cancel").onclick=()=>mk.remove();
    mk.querySelector("#pt-ok").onclick=()=>{
      if(!ptSel){ toast("请选择一张目标照片"); return; }
      target=ptSel; drawTarget(); mk.remove();
    };
    drawMy();
  }
  wrap.querySelector("#tp-pick").onclick=()=>pickTarget();
  drawTarget();

  /* ---- 发布谜题（目标照片已在画布上方选定） ---- */
  wrap.querySelector("#publish").onclick=()=>{
    if(state.els.length===0){ toast("先画点什么再发布吧"); return; }
    if(!target){ toast("先在上方选择目标照片"); return; }
    openPublish();
  };
  async function openPublish(){
    const mask=html("div",{class:"mask"});
    mask.innerHTML=`
    <div class="modal center" style="max-width:420px">
      <h2>发布谜题</h2>
      <div style="text-align:center">
        <div class="tp-photo" style="width:140px;height:140px;margin:0 auto;border:2px solid var(--gold)">${target.kind==="pack"?`<img src="images-thumb/${esc(target.g.id)}.jpg" alt="">`:`<img src="${esc(target.g.img)}" alt="">`}</div>
        <div style="margin-top:8px"><b>${target.kind==="pack"?esc(target.g.zh):esc(target.g.name||target.g.exact)}</b></div>
        <div class="sub">${target.kind==="pack"?("类别："+esc(target.g.category)):("类别："+esc(target.g.category_word||"未设")+" · 联想："+esc((target.g.keywords||[]).join("、")||"未设")+" · 准确："+esc(target.g.exact))}</div>
      </div>
      <div class="note" style="text-align:center;margin-top:10px">这张图将作为谜题答案；朋友按「类别 → 联想 → 准确」三关猜词。</div>
      <div class="row" style="justify-content:center;margin-top:14px">
        <button class="ghost" id="cancel">返回修改</button>
        <button class="primary" id="confirm">确认发布</button>
      </div>
    </div>`;
    $app.appendChild(mask);
    mask.querySelector("#cancel").onclick=()=>mask.remove();
    mask.querySelector("#confirm").onclick=async()=>{
      const btn=mask.querySelector("#confirm"); btn.disabled=true; btn.textContent="保存中…";
      const rec=buildRecord();
      /* 草稿恢复后发布：删除原草稿，转为正式谜题 */
      if(currentId && currentId.indexOf("draft-")===0){
        try{ await puzzleDel(currentId); }catch(_){}
        rec.id="pz"+Date.now();
      }
      rec.draft=false;
      try{
        await puzzlePut(rec);
        currentId=rec.id;
        mask.remove();
        showOfflineShare(rec);
      }catch(e){ toast("保存失败，请重试"); btn.disabled=false; btn.textContent="确认发布"; }
    };
  }
  let currentId = loadId || null;
  /* 从当前画布 + 目标构造谜题记录（目标可能为空，用于草稿） */
  function buildRecord(){
    const rec={
      id: currentId || ("pz"+Date.now()),
      canvas: state.els,
      bg: state.bg||"#FFFFFF",
      answerMode:"image",
      zh:"未命名",
      category_word:"",
      keywords:[],
      exact:"",
      createdAt: Date.now(),
      draft:false
    };
    if(target){
      rec.answerMode = target.kind==="pack"?"image":"custom_image";
      rec.zh = target.kind==="pack"?target.g.zh:(target.g.name||target.g.exact);
      rec.category_word = target.kind==="pack"?target.g.category:target.g.category_word;
      rec.keywords = target.g.keywords||[];
      rec.exact = target.g.exact;
      if(target.kind==="pack") rec.imageId=target.g.id;
      else rec.img=target.g.img;
    }
    return rec;
  }
  /* 退出时自动保存草稿（画布非空才存）；同一草稿沿用 currentId；返回 promise 供调用方 await */
  let _draftTimer=null;
  async function saveDraft(){
    if(state.els.length===0) return;
    const rec=buildRecord();
    if(!currentId) currentId="draft-"+Date.now();
    rec.id=currentId; rec.draft=true;
    if(!target) rec.zh="未命名草稿";
    try{ await puzzlePut(rec); }catch(e){}
  }
  /* 画布变化后 debounce 2 秒自动存草稿（不靠 beforeunload，小工具里它不触发） */
  function scheduleAutoSave(){
    if(_draftTimer) clearTimeout(_draftTimer);
    _draftTimer=setTimeout(()=>{ saveDraft(); },2000);
  }
  /* 从谜题库恢复（loadId）：画布、背景、目标 */
  async function restoreFromDB(){
    if(!loadId){ syncUI(); return; }
    try{
      const list=await puzzleList();
      const rec=list.find(x=>x.id===loadId);
      if(!rec){ syncUI(); return; }
      state.els=rec.canvas||[];
      state.bg=rec.bg||"#FFFFFF";
      if(rec.imageId){
        const g=PACK_DATA.images.find(x=>x.id===rec.imageId);
        if(g) target={kind:"pack",g};
      }else if(rec.img){
        target={kind:"custom",g:rec};
      }
      drawTarget();
      syncUI();
    }catch(e){ syncUI(); }
  }
  /* beforeunload 在小红书 MiniTool WebView 里不触发，仅作为桌面浏览器预览兜底；
     真正可靠的保存路径是：点首页 await saveDraft + commit 后 debounce 2 秒自动存 */
  window.addEventListener("beforeunload",function bu(){
    if($app.contains(svg)) saveDraft();
  });
  restoreFromDB();
}

/* =====================================================================
 * 联网 / 联机 / 自检功能：小红书离线版已移除（路由已重定向，永不进入）
 * 保留空桩仅为兼容潜在引用，避免 ReferenceError
 * ===================================================================== */
async function renderPuzzleGuess(){ location.hash="#/"; }
async function runPuzzleTest(){ location.hash="#/"; }
function renderEditor(){ }
function pwLeave(){ }
function pwDisband(){ }
function saveSession(){ }
function clearSession(){ }
function restoreSession(){ }
function pwReset(){ }
function getDeviceId(){ return ""; }
function renderOnline(){ location.hash="#/"; }
function pwConnect(){ }
function modeLabel(m){ return m||""; }
function renderOnlineLobby(){ location.hash="#/"; }
function renderOnlineRoom(){ location.hash="#/"; }
function renderOnlineGuess(){ location.hash="#/"; }
function renderOnlineReveal(){ location.hash="#/"; }
async function runOnlineTest(){ location.hash="#/"; }
function runRoute(){
  try{ route(); }
  catch(e){
    $app.innerHTML=`<div class="wrap"><div class="card"><h1>页面出错</h1><pre style="white-space:pre-wrap;word-break:break-all;font-size:13px;color:#C92A2A">${(e&&e.stack?e.stack:e+"").replace(/[<>&]/g,c=>({"<":"&lt;",">":"&gt;","&":"&amp;"}[c]))}</pre></div></div>`;
  }
}
window.addEventListener("hashchange",runRoute);
runRoute();

/* ================= 我来猜（离线单人：8 幅画，文字 + 照片墙同时，向上计时） ================= */
function renderGuess(){
  $app.innerHTML="";
  const wrap=html("div",{class:"wrap"});
  wrap.innerHTML=`
  <div class="topbar">
    <button class="ghost" id="back">← 首页</button>
    <span class="title">我来猜 · 看画猜词</span>
    <span class="spacer"></span>
  </div>
  <div class="stage-wrap" style="max-width:560px;margin:0 auto">
    <svg class="stage" id="g-stage"></svg>
    <div class="hint" id="g-hint">看这幅画，猜猜画的是什么；可以打字，也可以从下方照片墙里选</div>
  </div>
  <div class="card" style="max-width:560px;margin:12px auto">
    <div class="row" style="justify-content:space-between;align-items:center">
      <span class="sub" id="g-progress"></span>
      <span class="sub" id="g-timer" style="font-variant-numeric:tabular-nums;font-weight:700;color:var(--brand)"></span>
    </div>
    <div class="row" id="g-row">
      <input id="g-input" placeholder="输入你的猜测…" autocomplete="off">
      <button class="primary" id="g-send">猜</button>
    </div>
    <div id="g-fb" class="guess-fb"></div>
    <div class="sub" style="margin-top:12px">照片墙（点开看大图，确认后提交）：</div>
    <div class="img-grid" id="g-wall" style="margin-top:6px"></div>
    <div class="row" id="g-next-row" style="justify-content:center;margin-top:12px;display:none">
      <button class="primary" id="g-next">下一题 →</button>
    </div>
  </div>`;
  $app.appendChild(wrap);
  wrap.querySelector("#back").onclick=()=>location.hash="#/";

  const stage=wrap.querySelector("#g-stage");
  const fbEl=wrap.querySelector("#g-fb");
  const progressEl=wrap.querySelector("#g-progress");
  const timerEl=wrap.querySelector("#g-timer");
  const input=wrap.querySelector("#g-input");
  const send=wrap.querySelector("#g-send");
  const wallEl=wrap.querySelector("#g-wall");
  const nextRow=wrap.querySelector("#g-next-row");
  const nextBtn=wrap.querySelector("#g-next");

  let idx=0, solved=false, roundStart=0, timerId=null, results=[];
  let wall=[];   // 16 张候选
  const wrongIds={};   // 已选错的图片 id

  function tick(){
    const sec=Math.floor((Date.now()-roundStart)/1000);
    timerEl.textContent="⏱ "+sec+" 秒";
  }

  /* 依据目标词检查文字猜测：返回 {level:"exact"/"category"/"keyword"/null} */
  function checkText(text,g){
    const t=String(text||"").trim();
    if(!t) return null;
    if(t===g.exact) return {level:"exact",word:g.exact};
    if((g.aliases||[]).some(a=>a===t)) return {level:"exact",word:t};
    if(g.category_word && t===g.category_word) return {level:"category",word:g.category_word};
    if((g.keywords||[]).some(k=>k===t)) return {level:"keyword",word:t};
    return null;
  }

  function loadRound(){
    const art=GUESS_ARTWORK[idx];
    const gid=GUESS_DECK[idx];
    const g=PACK_DATA.images.find(x=>x.id===gid);
    solved=false; Object.keys(wrongIds).forEach(k=>{ delete wrongIds[k]; });
    /* 构造 16 张照片墙：目标 + 随机 15 张（不重复） */
    const others=PACK_DATA.images.filter(x=>x.id!==gid);
    wall=[g].concat(shuffle(others).slice(0,15));
    wall=shuffle(wall);
    /* 渲染画 */
    renderArtwork(stage, art.els, {bg:art.bg});
    /* 进度 + 计时 */
    progressEl.textContent=`第 ${idx+1} / ${GUESS_DECK.length} 题`;
    roundStart=Date.now(); tick();
    if(timerId) clearInterval(timerId);
    timerId=setInterval(tick,500);
    /* 重置输入/反馈 */
    input.value=""; input.disabled=false; send.disabled=false;
    fbEl.innerHTML="";
    nextRow.style.display="none";
    drawWall();
  }

  /* 照片墙：隐藏名称，只显示图片 + 编号；选错标 ✗ */
  function drawWall(){
    wallEl.innerHTML="";
    wall.forEach((g,i)=>{
      const label=coordLabel(i);
      const cell=html("button",{class:"img-cell"+(wrongIds[g.id]?" is-wrong":"")});
      cell.innerHTML=`<img src="images-thumb/${g.id}.jpg" alt="${label}"><span>${label}</span>`;
      if(wrongIds[g.id]){
        cell.disabled=true; cell.style.opacity="0.45";
        const mark=html("div",{},"✕"); mark.style.cssText="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:30px;color:#C92A2A;font-weight:800";
        cell.appendChild(mark);
      }
      cell.onclick=()=>openPreview(g);
      wallEl.appendChild(cell);
    });
  }

  /* 大图预览：不显示名称；「选它」提交，否则取消 */
  function openPreview(g){
    if(solved||wrongIds[g.id]) return;
    const i=wall.indexOf(g);
    const label=coordLabel(i);
    const mk=html("div",{class:"mask"});
    mk.innerHTML=`<div class="modal" style="max-width:380px;text-align:center">
      <h2>${label}</h2>
      <img src="images-thumb/${g.id}.jpg" alt="" style="width:100%;max-width:300px;border-radius:12px;border:2px solid var(--line)">
      <div class="sub" style="margin:8px 0">确定选这张吗？</div>
      <div class="row" style="justify-content:center">
        <button class="ghost" id="pv-cancel">取消</button>
        <button class="primary" id="pv-pick">选它</button>
      </div>
    </div>`;
    document.body.appendChild(mk);
    mk.querySelector("#pv-cancel").onclick=()=>mk.remove();
    mk.querySelector("#pv-pick").onclick=()=>{ mk.remove(); pickImage(g); };
  }

  /* 照片墙提交判定 */
  function pickImage(g){
    const gid=GUESS_DECK[idx];
    if(g.id===gid){ winRound(g, "图片"); }
    else{
      wrongIds[g.id]=true;
      sfx("miss");
      fbEl.innerHTML=`<div class="fb miss">不是这张，再看看～</div>`;
      drawWall();
    }
  }

  /* 文字提交 */
  function doText(){
    const gid=GUESS_DECK[idx];
    const g=PACK_DATA.images.find(x=>x.id===gid);
    const r=checkText(input.value,g);
    if(!r){
      sfx("miss");
      fbEl.innerHTML=`<div class="fb miss">不对哦，再想想～</div>`;
      return;
    }
    if(r.level==="exact"){ winRound(g,"文字"); }
    else if(r.level==="category"){
      sfx("hit");
      fbEl.innerHTML=`<div class="fb hit">对，它属于「${esc(r.word)}」！再猜猜具体是什么？</div>`;
    }else{
      sfx("hit");
      fbEl.innerHTML=`<div class="fb hit">「${esc(r.word)}」很接近了！它的准确名字是？</div>`;
    }
  }

  /* 猜中当前题：禁用输入、展示谜底与用时、给出下一题按钮 */
  function winRound(g, via){
    if(solved) return;
    solved=true;
    const used=Math.floor((Date.now()-roundStart)/1000);
    if(timerId){ clearInterval(timerId); timerId=null; }
    sfx("win");
    input.disabled=true; send.disabled=true;
    results.push({id:g.id,zh:g.zh,used,via});
    fbEl.innerHTML=`<div class="fb hit">🎉 猜中了！谜底是「${esc(g.zh)}」（${esc(g.category)}）· 用时 ${used} 秒 · ${via}作答</div>`;
    if(idx>=GUESS_DECK.length-1){
      nextBtn.textContent="看总结 🏆";
    }else{
      nextBtn.textContent="下一题 →";
    }
    nextRow.style.display="flex";
    window.scrollTo(0,document.body.scrollHeight);
  }

  nextBtn.onclick=()=>{
    if(idx>=GUESS_DECK.length-1){ showSummary(); }
    else{ idx++; loadRound(); window.scrollTo(0,0); }
  };
  send.onclick=doText;
  input.addEventListener("keydown",e=>{ if(e.key==="Enter") doText(); });

  /* 全部完成：总结各题用时 + 总用时 */
  function showSummary(){
    if(timerId){ clearInterval(timerId); timerId=null; }
    const total=results.reduce((s,r)=>s+r.used,0);
    $app.innerHTML="";
    const w=html("div",{class:"wrap"});
    w.innerHTML=`
    <div class="card" style="max-width:560px;margin:14px auto">
      <h1 style="text-align:center">🏆 全部猜完！</h1>
      <div class="sub" style="text-align:center;margin:6px 0">总用时 <b style="color:var(--brand)">${total} 秒</b> · 平均 ${(total/results.length).toFixed(1)} 秒/题</div>
      <table style="width:100%;margin-top:10px;font-size:14px">
        <thead><tr><th style="text-align:left">题目</th><th>用时</th><th>方式</th></tr></thead>
        <tbody>
          ${results.map((r,i)=>`<tr><td style="text-align:left">${i+1}. ${esc(r.zh)}</td><td style="text-align:center">${r.used}s</td><td style="text-align:center">${r.via}</td></tr>`).join("")}
        </tbody>
      </table>
      <div class="row" style="justify-content:center;margin-top:14px">
        <button class="primary" id="again">再玩一次</button>
        <button class="ghost" id="home">回首页</button>
      </div>
    </div>`;
    $app.appendChild(w);
    w.querySelector("#again").onclick=()=>{ idx=0; results=[]; renderGuess(); };
    w.querySelector("#home").onclick=()=>location.hash="#/";
  }

  loadRound();
}


/* ================= Canvas 2D 形状绘制（复刻 shapeFor，用于导出分享图） ================= */
function roundRectPath(ctx,x,y,w,h,r){
  r=Math.min(r,w/2,h/2);
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.arcTo(x+w,y,x+w,y+h,r);
  ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r);
  ctx.arcTo(x,y,x+w,y,r);
  ctx.closePath();
}
function drawShape2D(ctx,e){
  ctx.save();
  ctx.translate(e.x,e.y);
  ctx.rotate((e.rot||0)*Math.PI/180);
  ctx.globalAlpha=typeof e.opacity==="number"?e.opacity:1;
  ctx.fillStyle=e.color||"#E03131";
  const w=e.w||80, hh=e.h||80;
  ctx.beginPath();
  if(e.kind==="rect"||e.kind==="square"){ roundRectPath(ctx,-w/2,-hh/2,w,hh,3); ctx.fill(); }
  else if(e.kind==="bar"){ roundRectPath(ctx,-w/2,-hh/2,w,hh,2); ctx.fill(); }
  else if(e.kind==="circle"){ ctx.arc(0,0,w/2,0,Math.PI*2); ctx.fill(); }
  else if(e.kind==="ellipse"){ ctx.ellipse(0,0,w/2,hh/2,0,0,Math.PI*2); ctx.fill(); }
  else if(e.kind==="semicircle"){ ctx.moveTo(-w/2,0); ctx.arc(0,0,w/2,Math.PI,0); ctx.closePath(); ctx.fill(); }
  else if(e.kind==="triangle"){ ctx.moveTo(0,-hh/2); ctx.lineTo(-w/2,hh/2); ctx.lineTo(w/2,hh/2); ctx.closePath(); ctx.fill(); }
  else if(e.kind==="diamond"){ ctx.moveTo(0,-hh/2); ctx.lineTo(w/2,0); ctx.lineTo(0,hh/2); ctx.lineTo(-w/2,0); ctx.closePath(); ctx.fill(); }
  else if(e.kind==="waterdrop"){
    ctx.moveTo(0,-hh/2);
    ctx.quadraticCurveTo(w/2,-hh*0.05,w/2,hh*0.22);
    ctx.ellipse(0,hh*0.22,w/2,hh*0.55,0,0,Math.PI*2);
    ctx.quadraticCurveTo(-w/2,-hh*0.05,0,-hh/2);
    ctx.closePath(); ctx.fill();
  }
  else if(e.kind==="cross"){
    roundRectPath(ctx,-w/2,-hh/6,w,hh/3,1); ctx.fill();
    roundRectPath(ctx,-w/6,-hh/2,w/3,hh,1); ctx.fill();
  }
  else if(e.kind==="arrow"){
    roundRectPath(ctx,-w/2,-hh*0.12,w*0.72,hh*0.24,2); ctx.fill();
    ctx.moveTo(w*0.22,-hh*0.42); ctx.lineTo(w/2,0); ctx.lineTo(w*0.22,hh*0.42); ctx.closePath(); ctx.fill();
  }
  else if(e.kind==="star"){
    const sr=w/2, sir=sr*0.382;
    for(let i=0;i<10;i++){
      const a=(90+i*36)*Math.PI/180;
      const rr=(i%2===0)?sr:sir;
      const sx=rr*Math.cos(a), sy=-rr*Math.sin(a);
      if(i===0) ctx.moveTo(sx,sy); else ctx.lineTo(sx,sy);
    }
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

/* 导出 2:3 分享图（不含谜底，只含作品 + 引导语）；返回 JPEG dataURI */
function exportShareImage(els, bg){
  const W=720, H=1080;
  const cv=document.createElement("canvas");
  cv.width=W; cv.height=H;
  const ctx=cv.getContext("2d");
  /* 整体背景 */
  ctx.fillStyle="#F6F3EC"; ctx.fillRect(0,0,W,H);
  /* 顶部标题 */
  ctx.textAlign="center";
  ctx.fillStyle="#26303A";
  ctx.font="bold 54px sans-serif";
  ctx.fillText("巧手猜图",W/2,112);
  ctx.fillStyle="#6B7280";
  ctx.font="28px sans-serif";
  ctx.fillText("看画猜词 · 你能猜中吗？",W/2,156);
  /* 作品方形卡片 */
  const pad=60, size=W-pad*2, py=210;
  ctx.save();
  roundRectPath(ctx,pad,py,size,size,24);
  ctx.fillStyle=bg||"#FFFFFF"; ctx.fill();
  ctx.clip();
  /* 把 480 坐标作品映射到方形 */
  const scale=size/STAGE;
  ctx.translate(pad,py); ctx.scale(scale,scale);
  els.forEach(e=>drawShape2D(ctx,e));
  ctx.restore();
  /* 底部引导 */
  ctx.fillStyle="#3B5BDB";
  ctx.font="bold 38px sans-serif";
  ctx.fillText("评论区告诉我答案～",W/2,py+size+82);
  ctx.fillStyle="#9AA5B1";
  ctx.font="26px sans-serif";
  ctx.fillText("小红书小工具 · 巧手猜图",W/2,H-68);
  return cv.toDataURL("image/jpeg",0.9);
}

/* 离线发布弹窗：预览分享图 → 发小红书 / 存相册 / 回首页 / 再改改；同时存入谜题库 */
function showOfflineShare(rec){
  const dataURI=exportShareImage(rec.canvas, rec.bg);
  const mask=html("div",{class:"mask"});
  mask.innerHTML=`
  <div class="modal" style="max-width:400px">
    <h2 style="text-align:center">发布谜题</h2>
    <div style="text-align:center">
      <img src="${dataURI}" alt="分享图预览" style="width:220px;border-radius:14px;border:2px solid var(--line)">
    </div>
    <div class="note" style="text-align:center;margin:10px 0">分享图不含谜底；发布后朋友看画猜词，把答案留在评论区。</div>
    <button class="primary" id="os-note" style="width:100%;margin-bottom:8px">📕 发小红书笔记</button>
    <div class="row" style="gap:8px">
      <button class="ghost" id="os-album" style="flex:1">保存到相册</button>
      <button class="ghost" id="os-home" style="flex:1">回首页</button>
      <button class="ghost" id="os-edit" style="flex:1">再改改</button>
    </div>
  </div>`;
  $app.appendChild(mask);
  const noteBtn=mask.querySelector("#os-note");
  noteBtn.onclick=async()=>{
    noteBtn.disabled=true; noteBtn.textContent="打开发布页…";
    try{
      await postNoteImage(dataURI,"巧手猜图","来猜猜我画的是什么？评论区等你的答案～");
      mask.remove();
    }catch(e){
      noteBtn.disabled=false; noteBtn.textContent="📕 发小红书笔记";
      toast("未能打开发布页，可先保存到相册");
    }
  };
  mask.querySelector("#os-album").onclick=async()=>{
    const b=mask.querySelector("#os-album"); b.disabled=true;
    try{ await saveImageToAlbum(dataURI); toast("已保存到相册"); }
    catch(e){ toast("保存失败，请截图保存"); }
    b.disabled=false;
  };
  mask.querySelector("#os-home").onclick=()=>{ mask.remove(); location.hash="#/"; };
  mask.querySelector("#os-edit").onclick=()=>mask.remove();
}

