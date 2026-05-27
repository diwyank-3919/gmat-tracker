// ── CHART INSTANCES ──
var mainChartInst      = null;
var topicChartInst     = null;
var dowChartInst       = null;
var topicBarChartInst  = null;
var monthlyChartInst   = null;

// ── VIEW STATE ──
var viewMode   = "week";
var viewOffset = 0;
var sessFilter = "today";

function getViewDates() {
  var s,ref,days,all,s2,e,d,c;
  if (viewMode==="week") {
    s = startOfWeek(addDays(today, viewOffset*7));
    return Array.from({length:7}, function(_,i){ return addDays(s,i); });
  }
  if (viewMode==="month") {
    ref  = new Date(today.getFullYear(), today.getMonth()+viewOffset, 1);
    days = new Date(ref.getFullYear(), ref.getMonth()+1, 0).getDate();
    return Array.from({length:days}, function(_,i){ return new Date(ref.getFullYear(), ref.getMonth(), i+1); });
  }
  all = sessions.map(function(s){return s.date;}).filter(function(v,i,a){return a.indexOf(v)===i;}).sort();
  if (!all.length) return [today];
  s2 = parseLocal(all[0]); e = parseLocal(all[all.length-1]);
  d = []; c = new Date(s2);
  while(c<=e){ d.push(new Date(c)); c=addDays(c,1); }
  return d;
}

function getRangeLabel() {
  var s,e,ref,f;
  if (viewMode==="week") {
    s = startOfWeek(addDays(today, viewOffset*7)); e = addDays(s,6);
    f = function(d){ return d.toLocaleDateString("en-IN",{day:"numeric",month:"short"}); };
    return viewOffset===0 ? "This week" : f(s)+" – "+f(e);
  }
  if (viewMode==="month") {
    ref = new Date(today.getFullYear(), today.getMonth()+viewOffset, 1);
    return viewOffset===0 ? "This month" : ref.toLocaleDateString("en-IN",{month:"long",year:"numeric"});
  }
  return "All time";
}

// ── MAIN RENDER ──
function render() {
  var ts,tm,tt,tpct,tmet,ws,wm,wt,wpct,ms,me,mm,msc,dd,tot,sd;
  var streak,cur,ds2,topicTotals,qi,wd;

  ["week","month","all"].forEach(function(v){
    document.getElementById("f-"+v).className = "fpill"+(viewMode===v?" active":"");
  });
  document.getElementById("f-range-label").textContent = getRangeLabel();

  // Today
  ts = dateStr(today); tm = minsOn(ts); tt = targetFor(today);
  tpct = Math.min(100, Math.round(tm/tt*100)); tmet = tm>=tt&&tm>0;
  document.getElementById("m-today").textContent     = tm>0 ? fmtH(tm) : "0m";
  document.getElementById("m-today").className       = "kpi-value"+(tmet?" met":"");
  document.getElementById("m-today-sub").textContent = "Target: "+(isWE(today)?"6h":"3h")+" – "+tpct+"% done";
  document.getElementById("today-bar").style.width   = tpct+"%";
  document.getElementById("sb-today-val").textContent  = tm>0 ? fmtH(tm) : "0m";
  document.getElementById("sb-today-sub").textContent  = "of "+(isWE(today)?"6h":"3h")+" target";
  document.getElementById("sb-today-fill").style.width = tpct+"%";
  document.getElementById("sb-today-fill").style.background = tmet ? "#16a34a" : "linear-gradient(90deg,#6366f1,#8b5cf6)";

  // This week
  ws = startOfWeek(today); wm = 0; wt = 0;
  for(var i=0;i<7;i++){ wd=addDays(ws,i); wm+=minsOn(dateStr(wd)); wt+=targetFor(wd); }
  wpct = Math.min(100, Math.round(wm/wt*100)||0);
  document.getElementById("m-week").textContent      = wm>0 ? fmtH(wm) : "0m";
  document.getElementById("m-week").className        = "kpi-value"+(wm>=wt&&wm>0?" met":"");
  document.getElementById("m-week-sub").textContent  = (wm/60).toFixed(1)+"h / "+(wt/60).toFixed(0)+"h target";
  document.getElementById("week-bar").style.width    = wpct+"%";
  document.getElementById("week-chip").textContent   = wpct;
  document.getElementById("sb-week-pct").textContent = wpct+"%";
  document.getElementById("sb-week-fill").style.width= wpct+"%";

  // This month
  ms = startOfMonth(today); me = new Date(today.getFullYear(),today.getMonth()+1,0);
  mm = 0; msc = 0;
  for(dd=new Date(ms); dd<=me; dd=addDays(dd,1)) mm+=minsOn(dateStr(dd));
  msc = sessions.filter(function(s){return s.date>=dateStr(ms)&&s.date<=dateStr(me);}).length;
  document.getElementById("m-month").textContent     = mm>0 ? fmtH(mm) : "0m";
  document.getElementById("m-month-sub").textContent = msc+" session"+(msc===1?"":"s")+" logged";

  // All time
  tot = sessions.reduce(function(a,s){return a+s.mins;},0);
  sd  = new Set(sessions.map(function(s){return s.date;})).size;
  document.getElementById("m-total").textContent     = tot>0 ? fmtH(tot) : "0m";
  document.getElementById("m-total-sub").textContent = sd+" days studied";
  document.getElementById("total-chip").textContent  = tot>0 ? fmtH(tot) : "0h";

  // Missed targets & consistency
  var PREP_START = new Date(2026, 3, 25); PREP_START.setHours(0,0,0,0);
  var missedDays=0, deficitMins=0, consistentDays=0, totalDaysSinceStart=0;
  var cursor = new Date(PREP_START);
  while (cursor <= today) {
    totalDaysSinceStart++;
    var dsMins = minsOn(dateStr(cursor));
    var dsTgt  = targetFor(cursor);
    if (dsMins > 0) {
      if (dsMins < dsTgt)         missedDays++;
      if (dsMins >= dsTgt * 0.8)  consistentDays++;
      else                         deficitMins += dsTgt - dsMins;
    }
    cursor = addDays(cursor, 1);
  }
  var studiedDaysPct = totalDaysSinceStart>0 ? Math.min(100,Math.round(consistentDays/totalDaysSinceStart*100)) : 0;
  var missedPct      = sd>0 ? Math.min(100,Math.round(missedDays/sd*100)) : 0;
  document.getElementById("m-missed").textContent         = missedDays;
  document.getElementById("m-missed").className           = "kpi-value"+(missedDays===0&&sd>0?" met":"");
  document.getElementById("m-missed-sub").textContent     = deficitMins>0 ? fmtH(deficitMins)+" deficit total" : "No missed targets yet!";
  document.getElementById("missed-bar").style.width       = missedPct+"%";
  document.getElementById("m-consistency").textContent    = studiedDaysPct+"%";
  document.getElementById("m-consistency").className      = "kpi-value"+(studiedDaysPct>=80?" met":"");
  document.getElementById("m-consistency-sub").textContent= consistentDays+" of "+totalDaysSinceStart+" days on target";
  document.getElementById("consistency-bar").style.width  = studiedDaysPct+"%";
  document.getElementById("consistency-bar").style.background =
    studiedDaysPct>=80 ? "linear-gradient(90deg,#16a34a,#22c55e)"
    : studiedDaysPct>=50 ? "linear-gradient(90deg,#d97706,#f59e0b)"
    : "linear-gradient(90deg,#e11d48,#f43f5e)";

  // Streak
  streak=0; cur = minsOn(ts)>0 ? new Date(today) : addDays(today,-1);
  while(true){ ds2=dateStr(cur); if(minsOn(ds2)>0){streak++;cur=addDays(cur,-1);}else break; }
  document.getElementById("streak-chip").textContent  = streak;
  document.getElementById("streak-count").textContent = streak;

  // Sidebar topic hours
  topicTotals = {};
  sessions.forEach(function(s){ topicTotals[s.topic]=(topicTotals[s.topic]||0)+s.mins; });
  TOPICS.forEach(function(t){
    var el=document.getElementById(SB_IDS[t]);
    if(el) el.textContent = topicTotals[t] ? fmtH(topicTotals[t]) : "0h";
  });

  // Banner
  qi = streak % QUOTES.length;
  if (sessions.length===0) {
    document.getElementById("banner-title").textContent = "Start your GMAT journey";
    document.getElementById("banner-sub").textContent   = "Log your first session — weekday target 3h, weekend 6h";
  } else if (tmet) {
    document.getElementById("banner-title").textContent = "Target hit today!";
    document.getElementById("banner-sub").textContent   = QUOTES[qi][1];
  } else if (tm > 0) {
    document.getElementById("banner-title").textContent = fmtH(tt-tm)+" to go today";
    document.getElementById("banner-sub").textContent   = QUOTES[qi][1];
  } else {
    document.getElementById("banner-title").textContent = QUOTES[qi][0];
    document.getElementById("banner-sub").textContent   = QUOTES[qi][1];
  }

  // Week vs last week badge
  var thisWeek = getWeekHours(0), lastWeek = getWeekHours(-1);
  var diff = thisWeek - lastWeek;
  var diffH = Math.abs(Math.floor(diff/60)), diffM = Math.abs(Math.round(diff%60));
  var diffStr = diffH>0 ? diffH+"h "+diffM+"m" : diffM+"m";
  var wowEl = document.getElementById("wow-badge");
  if (wowEl) {
    if (lastWeek===0) { wowEl.style.display="none"; }
    else {
      wowEl.style.display       = "inline-flex";
      wowEl.textContent         = (diff>=0?"+":"-")+diffStr+" vs last week";
      wowEl.style.background    = diff>=0?"#f0fdf4":"#fff1f2";
      wowEl.style.color         = diff>=0?"#16a34a":"#e11d48";
      wowEl.style.borderColor   = diff>=0?"#bbf7d0":"#fecdd3";
    }
  }

  updateExamCountdown();
  updateCommandCenter();
  renderChart();
  renderTopicDonut();
  renderTopicBars();
  renderCalendar();
  renderStreak();
  renderSessions();
}

function getWeekHours(offset) {
  var ws = startOfWeek(addDays(today, offset*7));
  var total = 0;
  for (var i=0;i<7;i++) total += minsOn(dateStr(addDays(ws,i)));
  return total;
}

// ── CHART: DAILY BARS ──
function renderChart() {
  var dates  = getViewDates();
  var labels = dates.map(function(d){ return viewMode==="month" ? d.getDate() : d.toLocaleDateString("en-IN",{weekday:"short"}).slice(0,3); });
  var actual = dates.map(function(d){ return parseFloat((minsOn(dateStr(d))/60).toFixed(2)); });
  var target = dates.map(function(d){ return parseFloat((targetFor(d)/60).toFixed(1)); });
  var colors = dates.map(function(d,i){ return actual[i]===0?"#f2f4f7":actual[i]>=target[i]?"#16a34a":"#e11d48"; });
  if (mainChartInst) mainChartInst.destroy();
  mainChartInst = new Chart(document.getElementById("mainChart"),{
    type:"bar",
    data:{labels:labels,datasets:[
      {label:"Actual",data:actual,backgroundColor:colors,borderRadius:7,borderSkipped:false,order:2},
      {label:"Target",data:target,type:"line",borderColor:"#d1d5db",borderWidth:1.5,borderDash:[5,4],pointRadius:0,fill:false,order:1,tension:0}
    ]},
    options:{responsive:true,maintainAspectRatio:false,
      plugins:{legend:{display:false},tooltip:{backgroundColor:"#fff",borderColor:"#eaecf0",borderWidth:1,titleColor:"#1a1d23",bodyColor:"#6b7280",padding:10,
        callbacks:{label:function(ctx){var v=ctx.parsed.y,h=Math.floor(v),m=Math.round((v-h)*60);return ctx.dataset.label+": "+h+"h"+(m>0?" "+m+"m":"");}}}},
      scales:{
        x:{grid:{display:false},ticks:{font:{size:11,family:"Plus Jakarta Sans"},color:"#9ea3ae"},border:{display:false}},
        y:{grid:{color:"#f2f4f7"},ticks:{font:{size:11,family:"Plus Jakarta Sans"},color:"#9ea3ae",callback:function(v){return v+"h";}},border:{display:false},min:0}
      }
    }
  });
}

// ── CHART: TOPIC DONUT ──
function renderTopicDonut() {
  var totals={},topics,totalMins,legendEl,centerEl;
  sessions.forEach(function(s){totals[s.topic]=(totals[s.topic]||0)+s.mins;});
  topics  = Object.keys(totals);
  legendEl= document.getElementById("donut-legend");
  centerEl= document.getElementById("donut-center-val");
  if (!topics.length){ if(topicChartInst)topicChartInst.destroy(); legendEl.innerHTML=""; centerEl.textContent="--"; return; }
  totalMins = Object.values(totals).reduce(function(a,b){return a+b;},0);
  centerEl.textContent = fmtH(totalMins);
  if (topicChartInst) topicChartInst.destroy();
  topicChartInst = new Chart(document.getElementById("topicChart"),{
    type:"doughnut",
    data:{labels:topics,datasets:[{data:topics.map(function(t){return parseFloat((totals[t]/60).toFixed(2));}),backgroundColor:topics.map(function(t){return TC[t]||"#888";}),borderWidth:3,borderColor:"#fff",hoverBorderColor:"#fff"}]},
    options:{responsive:true,maintainAspectRatio:false,cutout:"68%",
      plugins:{legend:{display:false},tooltip:{backgroundColor:"#fff",borderColor:"#eaecf0",borderWidth:1,titleColor:"#1a1d23",bodyColor:"#6b7280",padding:10,
        callbacks:{label:function(ctx){var v=ctx.parsed,h=Math.floor(v),m=Math.round((v-h)*60);return ctx.label+": "+h+"h"+(m>0?" "+m+"m":"");}}}}}
  });
  legendEl.innerHTML = topics.map(function(t){
    var pct = Math.round(totals[t]/totalMins*100);
    return '<div class="donut-pill"><span class="donut-pip" style="background:'+TC[t]+'"></span>'+t+' <span style="color:#9ea3ae;margin-left:2px">'+pct+'%</span></div>';
  }).join("");
}

// ── TOPIC BARS ──
function renderTopicBars() {
  var totals={},topics,el,max;
  sessions.forEach(function(s){totals[s.topic]=(totals[s.topic]||0)+s.mins;});
  topics = Object.keys(totals).sort(function(a,b){return totals[b]-totals[a];});
  el = document.getElementById("topic-bars");
  if (!topics.length){ el.innerHTML='<div class="empty-state">Log sessions to see breakdown</div>'; return; }
  max = Math.max.apply(null, Object.values(totals));
  el.innerHTML = topics.map(function(t){
    var pct = Math.round(totals[t]/max*100);
    return '<div class="t-row"><div class="t-head"><span class="t-name" style="color:'+TC[t]+'">'+t+'</span><span class="t-val">'+fmtH(totals[t])+'</span></div><div class="t-track"><div class="t-fill" style="width:'+pct+'%;background:'+TC[t]+'"></div></div></div>';
  }).join("");
}

// ── MINI CALENDAR ──
function renderCalendar() {
  var grid=document.getElementById("cal-grid"); grid.innerHTML="";
  var dates=getViewDates().slice(0,42);
  var pad=(dates[0].getDay()+6)%7;
  for(var i=0;i<pad;i++){ var ep=document.createElement("div"); ep.className="cal-cell pad"; grid.appendChild(ep); }
  dates.forEach(function(d){
    var ds=dateStr(d), mins=minsOn(ds), tgt=targetFor(d);
    var pct=Math.min(100,Math.round(mins/tgt*100));
    var met=mins>=tgt&&mins>0, hasData=mins>0, isTdy=ds===dateStr(today);
    var cell=document.createElement("div");
    cell.className="cal-cell"+(hasData?(met?" has-data met":" has-data missed"):"")+(isTdy?" is-today":"");
    cell.title=ds+(mins?" – "+fmtH(mins)+" ("+pct+"%)":"");
    cell.innerHTML='<div class="cal-num">'+d.getDate()+'</div>'+(hasData?'<div class="cal-pip" style="background:'+(met?"#16a34a":"#e11d48")+'"></div><div class="cal-time">'+fmtH(mins)+'</div>':'');
    cell.onclick=(function(ds2){return function(){pickerSelectDate(ds2);};})(ds);
    grid.appendChild(cell);
  });
}

// ── STREAK ──
function renderStreak() {
  var grid=document.getElementById("streak-grid"); grid.innerHTML="";
  for(var i=29;i>=0;i--){
    var d=addDays(today,-i), ds=dateStr(d);
    var mins=minsOn(ds), tgt=targetFor(d);
    var met=mins>=tgt&&mins>0, empty=mins===0;
    var dot=document.createElement("div");
    dot.className="s-dot "+(met?"met":empty?"empty":"missed");
    dot.title=ds+(mins?" – "+fmtH(mins):"");
    dot.innerHTML=met?'<i class="ti ti-check" style="font-size:9px"></i>':empty?'<span style="font-size:8px;opacity:.3">.</span>':'<i class="ti ti-x" style="font-size:9px"></i>';
    grid.appendChild(dot);
  }
}

// ── SESSIONS LIST ──
function renderSessions() {
  var el=document.getElementById("sessions-list");
  var ts=dateStr(today), ws=startOfWeek(today), we=addDays(ws,6);
  var filtered=sessions.slice();
  if (sessFilter==="today")     filtered=sessions.filter(function(s){return s.date===ts;});
  else if (sessFilter==="week") filtered=sessions.filter(function(s){return s.date>=dateStr(ws)&&s.date<=dateStr(we);});
  filtered.sort(function(a,b){return b.date.localeCompare(a.date)||((b.created_at||0)-(a.created_at||0));});
  var total=filtered.reduce(function(a,s){return a+s.mins;},0);
  document.getElementById("sess-total-label").textContent = filtered.length ? fmtH(total)+" total" : "";
  if (!filtered.length){ el.innerHTML='<div class="empty-state">No sessions for this period</div>'; return; }
  el.innerHTML = filtered.map(function(s){
    var isToday=s.date===ts;
    var dateLabel=isToday?"Today":parseLocal(s.date).toLocaleDateString("en-IN",{day:"numeric",month:"short"});
    return '<div class="sess-item">'
      +'<span class="sess-color" style="background:'+(TC[s.topic]||"#888")+'"></span>'
      +'<div class="sess-info"><span class="sess-topic">'+s.topic+'</span>'
      +(sessFilter!=="today"?'<span class="sess-date-tag">'+dateLabel+'</span>':'')
      +'</div><span class="sess-dur">'+fmtH(s.mins)+'</span>'
      +'<button class="sess-del" data-id="'+s.id+'" title="Delete"><i class="ti ti-trash" style="font-size:13px"></i></button>'
      +'</div>';
  }).join("");
  el.querySelectorAll(".sess-del").forEach(function(btn){
    btn.addEventListener("click",function(){delSession(this.getAttribute("data-id"));});
  });
}

// ── TRASH RENDER ──
function renderTrash(trashed) {
  var el = document.getElementById("trash-list");
  if (!el) return;
  if (!trashed.length){ el.innerHTML='<div class="empty-state" style="padding:20px 0">Trash is empty</div>'; return; }
  el.innerHTML = trashed.map(function(s){
    var dateLabel = parseLocal(s.date).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"});
    return '<div class="sess-item" style="opacity:0.75">'
      +'<span class="sess-color" style="background:'+(TC[s.topic]||"#888")+'"></span>'
      +'<div class="sess-info"><span class="sess-topic">'+s.topic+'</span>'
      +'<span class="sess-date-tag">'+dateLabel+'</span></div>'
      +'<span class="sess-dur">'+fmtH(s.mins)+'</span>'
      +'<button data-id="'+s.id+'" class="trash-restore" style="background:#eef2ff;border:none;border-radius:6px;padding:4px 8px;cursor:pointer;color:#6366f1;font-size:11px;font-weight:600;margin-right:4px">Restore</button>'
      +'<button data-id="'+s.id+'" class="trash-perm" style="background:#fff1f2;border:none;border-radius:6px;padding:4px 8px;cursor:pointer;color:#e11d48;font-size:11px;font-weight:600">Forever</button>'
      +'</div>';
  }).join("");
  el.querySelectorAll(".trash-restore").forEach(function(btn){
    btn.addEventListener("click",function(){restoreSession(this.getAttribute("data-id"));});
  });
  el.querySelectorAll(".trash-perm").forEach(function(btn){
    btn.addEventListener("click",function(){permanentDelete(this.getAttribute("data-id"));});
  });
}

// ── TRASH MODAL ──
function openTrash() { document.getElementById("trash-modal").style.display="flex"; loadTrashed(); }
function closeTrash() { document.getElementById("trash-modal").style.display="none"; }

// ── FILTER CONTROLS ──
function setView(v)  { viewMode=v; viewOffset=0; render(); }
function goDate(n)   { viewOffset+=n; render(); }

function setSessFilter(f) {
  sessFilter=f;
  ["today","week","all"].forEach(function(v){
    var el=document.getElementById("sf-"+v);
    if(el) el.className="sess-tab"+(v===f?" active":"");
  });
  renderSessions();
}
