const socket=io();
let token=localStorage.token||"", me=null, state=null, timer=null;
const $=id=>document.getElementById(id);

async function api(url,opt={}){
 opt.headers={...(opt.headers||{}),...(token?{Authorization:"Bearer "+token}:{})};
 const r=await fetch(url,opt); const d=await r.json();
 if(!r.ok) throw new Error(d.error||"请求失败"); return d;
}
function showLogin(){openModal("登录",false)}
function showRegister(){openModal("注册",true)}
function openModal(title,reg){$("modalTitle").textContent=title;$("modal").classList.remove("hidden");$("msg").textContent="";$("modalBtn").onclick=()=>submitAuth(reg)}
function closeModal(){$("modal").classList.add("hidden")}
async function submitAuth(reg){
 try{
  const d=await api(reg?"/api/register":"/api/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username:$("username").value,password:$("password").value})});
  token=d.token;localStorage.token=token;me=d.user;closeModal();refresh();
 }catch(e){$("msg").textContent=e.message}
}
async function refresh(){
 if(!token){$("me").textContent="未登录";return}
 try{me=await api("/api/me");$("me").textContent=me.username+" · "+me.coins+" 金币";renderAccount();loadHistory()}catch{localStorage.removeItem("token");token=""}
}
function renderAccount(){ $("account").innerHTML=`<b>${me.username}</b><br>虚拟金币：${me.coins}<br>胜利次数：${me.wins}` }
function renderRace(){
 const r=$("race");
 if(!state){r.innerHTML="等待下一局…";return}
 r.innerHTML=state.horses.map(h=>`<div class="horse"><div class="name"><span>🐎 ${h}</span><span>${state.currentRace?state.currentRace.speeds[h]:"随机"} km/h</span></div><div class="bar" style="width:${state.currentRace?state.currentRace.speeds[h]:30}%"></div></div>`).join("");
}
function countdown(){
 clearInterval(timer); timer=setInterval(()=>{
  const sec=Math.max(0,Math.ceil((state?.nextRaceAt-Date.now())/1000));
  $("countdown").textContent=sec?`下一局：${sec} 秒`:"比赛准备中";
 },250);
}
async function placeBet(){
 if(!token)return alert("请先登录");
 if(!state?.currentRace)return alert("当前没有开放的比赛");
 try{
  const d=await api("/api/bet",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({raceId:state.currentRace.id,horse:$("horse").value,amount:Number($("amount").value)})});
  me=d.user;refresh();alert("已投入虚拟金币："+$("amount").value);
 }catch(e){alert(e.message)}
}
async function loadHistory(){
 const rows=await api("/api/history");
 $("history").innerHTML=rows.length?rows.map(x=>`<div class="row">第${x.race_id}局 · ${x.horse} · ${x.amount}金币 · ${x.won?"中奖 +"+x.reward:"未中奖"} · 冠军：${x.winner}</div>`).join(""):"暂无记录";
}
socket.on("connect",()=>{$("status").textContent="🟢 已连接多人大厅"});
socket.on("race:state",s=>{state=s;renderRace();countdown()});
socket.on("race:result",r=>{$("result").innerHTML=`<div class="win">🏆 本局冠军：${r.winner}</div>`;renderRace();refresh()});
socket.on("leaderboard",rows=>{$("rank").innerHTML=rows.map((x,i)=>`<div class="row">#${i+1}　${x.username}　<b>${x.coins}</b>金币　${x.wins}胜</div>`).join("")});
refresh();