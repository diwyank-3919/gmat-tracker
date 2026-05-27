// ── VIEW ROUTING ──
var currentView = "dashboard";
var calOffset   = 0;

function switchView(view) {
  var views = ["dashboard","analytics","calendar","sessions","mock"];
  views.forEach(function(v){
    var el  = document.getElementById("view-"+v);
    var nav = document.getElementById("nav-"+v);
    if (el)  el.style.display  = v===view ? "block" : "none";
    if (nav) nav.className     = "sb-item"+(v===view?" active":"");
  });
  currentView = view;
  var titles = {dashboard:"Dashboard",analytics:"Analytics",calendar:"Calendar",sessions:"Session log",mock:"Mock Scores"};
  document.querySelector(".topbar-title").textContent = titles[view] || view;
  if (view==="analytics") renderAnalytics();
  if (view==="calendar")  renderBigCalendar();
  if (view==="sessions")  renderFullLog();
  if (view==="mock")      renderMockView();
}

// ── ANALYTICS VIEW ──
function renderAnalytics() {
  if (!sessions.length) return;
  var byDate = {};
  sessions.forEach(function(s){ byDate[s.date]=(byDate[s.date]||0)+s.mins; });
  var bestDate = Object.keys(byDate).sort(function(a,b){return byDate[b]-byDate[a];})[0];
  document.getElementById("an-best-day").textContent = bestDate ? parseLocal(bestDate).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"}) : "--";
  document.getElementById("an-best-hrs").textContent = bestDate ? fmtH(byDate[bestDate])+" studied" : "";
  var studiedDays = Object.keys(byDate).length;
  var totalMins   = sessions.reduce(function(a,s){return a+s.mins;},0);
  var avg         = studiedDays ? Math.round(totalMins/studiedDays) : 0;
  document.getElementById("an-avg").textContent     = fmtH(avg);
  document.getElementById("an-avg-sub").textContent = "across "+studiedDays+" studied days";
  var allDates = Object.keys(byDate).sort();
  var best=0, cur=0, prev=null;
  allDates.forEach(function(ds){
    if (prev) {
      var diff = (parseLocal(ds)-parseLocal(prev))/(1000*60*60*24);
      cur = diff===1 ? cur+1 : 1;
    } else { cur=1; }
    if (cur>best) best=cur;
    prev=ds;
  });
  document.getElementById("an-best-streak").textContent = best;
  renderHeatmap();
  renderDowChart();
  renderTopicBarChart();
  renderMonthlyChart();
}

function renderHeatmap() {
  var wrap = document.getElementById("heatmap");
  if (!wrap) return;
  wrap.innerHTML = "";
  var byDate = {};
  sessions.forEach(function(s){ byDate[s.date]=(byDate[s.date]||0)+s.mins; });
  var maxMins = Math.max.apply(null, Object.values(byDate).concat([1]));
  var end = new Date(today);
  var start = startOfWeek(addDays(end,-83));
  function heatColor(mins) {
    if (!mins) return "#f2f4f7";
    var pct = mins/maxMins;
    if (pct<0.25) return "#bbf7d0";
    if (pct<0.5)  return "#4ade80";
    if (pct<0.75) return "#16a34a";
    return "#14532d";
  }
  var cur = new Date(start);
  while (cur <= end) {
    var col = document.createElement("div");
    col.style.cssText = "display:flex;flex-direction:column;gap:3px";
    for (var d=0; d<7; d++) {
      var ds   = dateStr(cur);
      var mins = byDate[ds]||0;
      var cell = document.createElement("div");
      cell.style.cssText = "width:14px;height:14px;border-radius:3px;background:"+heatColor(mins)+";cursor:default";
      cell.title = ds+(mins?" – "+fmtH(mins):"");
      col.appendChild(cell);
      cur = addDays(cur,1);
    }
    wrap.appendChild(col);
  }
}

function renderDowChart() {
  var dowMins=[0,0,0,0,0,0,0];
  sessions.forEach(function(s){ var d=parseLocal(s.date); var dow=(d.getDay()+6)%7; dowMins[dow]+=s.mins; });
  var labels=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  var targets=[180,180,180,180,180,360,360];
  var colors=dowMins.map(function(m,i){return m>=targets[i]?"#16a34a":"#6366f1";});
  if (dowChartInst) dowChartInst.destroy();
  dowChartInst = new Chart(document.getElementById("dowChart"),{
    type:"bar",
    data:{labels:labels,datasets:[{data:dowMins.map(function(m){return parseFloat((m/60).toFixed(2));}),backgroundColor:colors,borderRadius:6,borderSkipped:false}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:function(ctx){var v=ctx.parsed.y,h=Math.floor(v),m=Math.round((v-h)*60);return h+"h"+(m?" "+m+"m":"");}}}},
      scales:{x:{grid:{display:false},ticks:{font:{size:11},color:"#9ea3ae"},border:{display:false}},y:{grid:{color:"#f2f4f7"},ticks:{font:{size:11},color:"#9ea3ae",callback:function(v){return v+"h";}},border:{display:false},min:0}}
    }
  });
}

function renderTopicBarChart() {
  var totals={};
  sessions.forEach(function(s){totals[s.topic]=(totals[s.topic]||0)+s.mins;});
  var topics=Object.keys(totals).sort(function(a,b){return totals[b]-totals[a];});
  if (!topics.length) return;
  if (topicBarChartInst) topicBarChartInst.destroy();
  topicBarChartInst = new Chart(document.getElementById("topicBarChart"),{
    type:"bar",
    data:{labels:topics,datasets:[{data:topics.map(function(t){return parseFloat((totals[t]/60).toFixed(2));}),backgroundColor:topics.map(function(t){return TC[t]||"#888";}),borderRadius:6,borderSkipped:false}]},
    options:{responsive:true,maintainAspectRatio:false,indexAxis:"y",plugins:{legend:{display:false},tooltip:{callbacks:{label:function(ctx){var v=ctx.parsed.x,h=Math.floor(v),m=Math.round((v-h)*60);return h+"h"+(m?" "+m+"m":"");}}}},
      scales:{x:{grid:{color:"#f2f4f7"},ticks:{font:{size:11},color:"#9ea3ae",callback:function(v){return v+"h";}},border:{display:false}},y:{grid:{display:false},ticks:{font:{size:11},color:"#9ea3ae"},border:{display:false}}}
    }
  });
}

function renderMonthlyChart() {
  var months=[];
  for (var i=5;i>=0;i--) months.push(new Date(today.getFullYear(),today.getMonth()-i,1));
  var labels=months.map(function(m){return m.toLocaleDateString("en-IN",{month:"short",year:"2-digit"});});
  var data=months.map(function(ref){
    var ms=new Date(ref.getFullYear(),ref.getMonth(),1);
    var me=new Date(ref.getFullYear(),ref.getMonth()+1,0);
    var total=0;
    for(var d=new Date(ms);d<=me;d=addDays(d,1)) total+=minsOn(dateStr(d));
    return parseFloat((total/60).toFixed(2));
  });
  if (monthlyChartInst) monthlyChartInst.destroy();
  monthlyChartInst = new Chart(document.getElementById("monthlyChart"),{
    type:"line",
    data:{labels:labels,datasets:[{data:data,borderColor:"#6366f1",backgroundColor:"rgba(99,102,241,0.08)",borderWidth:2,pointBackgroundColor:"#6366f1",pointRadius:5,fill:true,tension:0.3}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{backgroundColor:"#fff",borderColor:"#eaecf0",borderWidth:1,titleColor:"#1a1d23",bodyColor:"#6b7280",padding:10,callbacks:{label:function(ctx){var v=ctx.parsed.y,h=Math.floor(v),m=Math.round((v-h)*60);return h+"h"+(m?" "+m+"m":"");}}}},
      scales:{x:{grid:{display:false},ticks:{font:{size:11},color:"#9ea3ae"},border:{display:false}},y:{grid:{color:"#f2f4f7"},ticks:{font:{size:11},color:"#9ea3ae",callback:function(v){return v+"h";}},border:{display:false},min:0}}
    }
  });
}

// ── BIG CALENDAR VIEW ──
function renderBigCalendar() {
  var ref   = new Date(today.getFullYear(), today.getMonth()+calOffset, 1);
  var label = ref.toLocaleDateString("en-IN",{month:"long",year:"numeric"});
  document.getElementById("cal-month-label").textContent = label;
  var grid  = document.getElementById("big-cal-grid"); grid.innerHTML="";
  var days  = new Date(ref.getFullYear(),ref.getMonth()+1,0).getDate();
  var first = new Date(ref.getFullYear(),ref.getMonth(),1);
  var pad   = (first.getDay()+6)%7;
  for (var i=0;i<pad;i++){
    var ep=document.createElement("div");
    ep.style.cssText="aspect-ratio:1;border-radius:10px;background:#fafafa;border:1.5px solid #f2f4f7;opacity:0.3";
    grid.appendChild(ep);
  }
  for (var day=1;day<=days;day++){
    var d    = new Date(ref.getFullYear(),ref.getMonth(),day);
    var ds   = dateStr(d);
    var mins = minsOn(ds), tgt=targetFor(d);
    var met  = mins>=tgt&&mins>0, hasData=mins>0;
    var isTdy= ds===dateStr(today);
    var cell = document.createElement("div");
    cell.style.cssText="aspect-ratio:1;border-radius:10px;border:1.5px solid;padding:8px 6px;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;transition:all 0.12s;";
    cell.style.borderColor= isTdy?"#6366f1":met?"#bbf7d0":hasData?"#fecdd3":"#f2f4f7";
    cell.style.background = met?"#f0fdf4":hasData?"#fff1f2":isTdy?"#eef2ff":"#fafafa";
    var numEl=document.createElement("div");
    numEl.style.cssText="font-size:13px;font-weight:700;color:"+(isTdy?"#6366f1":met?"#15803d":hasData?"#be123c":"#6b7280");
    numEl.textContent=day;
    cell.appendChild(numEl);
    if (hasData){
      var pip=document.createElement("div");
      pip.style.cssText="font-size:10px;font-weight:600;color:"+(met?"#15803d":"#be123c");
      pip.textContent=fmtH(mins);
      cell.appendChild(pip);
      var topicSet=[];
      sessions.filter(function(s){return s.date===ds;}).forEach(function(s){if(topicSet.indexOf(s.topic)<0)topicSet.push(s.topic);});
      var tpEl=document.createElement("div");
      tpEl.style.cssText="font-size:8px;color:#9ea3ae;text-align:center";
      tpEl.textContent=topicSet.join(", ");
      cell.appendChild(tpEl);
    }
    cell.onclick=(function(ds2){return function(){showDayDetail(ds2);};})(ds);
    grid.appendChild(cell);
  }
}
function calPrev(){ calOffset--; renderBigCalendar(); }
function calNext(){ calOffset++; renderBigCalendar(); }

function showDayDetail(ds) {
  var card  = document.getElementById("day-detail-card");
  var list  = document.getElementById("day-detail-list");
  var sesses= sessions.filter(function(s){return s.date===ds;});
  var d     = parseLocal(ds);
  document.getElementById("day-detail-title").textContent = d.toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long"});
  var total = sesses.reduce(function(a,s){return a+s.mins;},0);
  document.getElementById("day-detail-total").textContent = total ? fmtH(total)+" total" : "";
  if (!sesses.length) {
    list.innerHTML='<div class="empty-state">No sessions on this day</div>';
  } else {
    list.innerHTML=sesses.map(function(s){
      return '<div class="sess-item"><span class="sess-color" style="background:'+(TC[s.topic]||"#888")+'"></span>'
        +'<span class="sess-topic" style="flex:1">'+s.topic+'</span>'
        +'<span class="sess-dur">'+fmtH(s.mins)+'</span></div>';
    }).join("");
  }
  card.style.display="block";
  card.scrollIntoView({behavior:"smooth",block:"nearest"});
}

// ── FULL SESSION LOG ──
function renderFullLog() {
  var el=document.getElementById("full-log-list");
  if (!el) return;
  var topic  = document.getElementById("log-filter-topic").value;
  var period = document.getElementById("log-filter-period").value;
  var ws=startOfWeek(today), we=addDays(ws,6);
  var ms=startOfMonth(today), me=new Date(today.getFullYear(),today.getMonth()+1,0);
  var filtered=sessions.slice();
  if (topic)            filtered=filtered.filter(function(s){return s.topic===topic;});
  if (period==="week")  filtered=filtered.filter(function(s){return s.date>=dateStr(ws)&&s.date<=dateStr(we);});
  if (period==="month") filtered=filtered.filter(function(s){return s.date>=dateStr(ms)&&s.date<=dateStr(me);});
  filtered.sort(function(a,b){return b.date.localeCompare(a.date)||((b.created_at||0)-(a.created_at||0));});
  var total=filtered.reduce(function(a,s){return a+s.mins;},0);
  document.getElementById("log-summary").textContent=filtered.length+" sessions · "+fmtH(total)+" total";
  if (!filtered.length){ el.innerHTML='<div class="empty-state" style="padding:24px 0">No sessions match the filters</div>'; return; }
  var ts=dateStr(today), byDate={}, dateOrder=[];
  filtered.forEach(function(s){ if(!byDate[s.date]){byDate[s.date]=[];dateOrder.push(s.date);} byDate[s.date].push(s); });
  dateOrder=dateOrder.filter(function(v,i,a){return a.indexOf(v)===i;});
  el.innerHTML=dateOrder.map(function(ds){
    var d       = parseLocal(ds);
    var label   = ds===ts?"Today":d.toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short",year:"numeric"});
    var dayTotal= byDate[ds].reduce(function(a,s){return a+s.mins;},0);
    var tgt     = targetFor(d), met=dayTotal>=tgt;
    var rows    = byDate[ds].map(function(s){
      return '<div class="sess-item" style="background:#fff;border:1.5px solid #f2f4f7">'
        +'<span class="sess-color" style="background:'+(TC[s.topic]||"#888")+'"></span>'
        +'<span class="sess-topic" style="flex:1">'+s.topic+'</span>'
        +'<span class="sess-dur">'+fmtH(s.mins)+'</span>'
        +'<button data-id="'+s.id+'" class="log-del-btn" style="background:none;border:none;cursor:pointer;color:#d1d5db;font-size:13px;padding:3px;border-radius:5px"><i class="ti ti-trash"></i></button>'
        +'</div>';
    }).join("");
    return '<div style="margin-bottom:12px">'
      +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">'
      +'<span style="font-size:12px;font-weight:700;color:#374151">'+label+'</span>'
      +'<span style="font-size:11px;font-weight:600;padding:2px 8px;border-radius:100px;background:'+(met?'#f0fdf4':'#fff1f2')+';color:'+(met?'#15803d':'#be123c')+'">'+fmtH(dayTotal)+(met?' ✓':'')+'</span>'
      +'</div>'+rows+'</div>';
  }).join('');
  el.querySelectorAll(".log-del-btn").forEach(function(btn){
    btn.addEventListener("click",function(){
      var id=this.getAttribute("data-id");
      delSession(id);
      setTimeout(renderFullLog,600);
    });
  });
}

// ── MOCK VIEW ──
function renderMockView() {
  if (currentView !== "mock") return;
  document.getElementById("mk-target-label").textContent = TARGET_SCORE;
  if (!mockScores.length) {
    ["mk-latest","mk-best","mk-gap","mk-improvement"].forEach(function(id){ document.getElementById(id).textContent="--"; });
    document.getElementById("mock-history-list").innerHTML='<div class="empty-state" style="padding:24px 0">No mock scores logged yet.</div>';
    if (mockChartInst) mockChartInst.destroy();
    return;
  }
  var sorted      = mockScores.slice().sort(function(a,b){return a.date.localeCompare(b.date);});
  var latest      = sorted[sorted.length-1].score;
  var best        = Math.max.apply(null, sorted.map(function(m){return m.score;}));
  var first       = sorted[0].score;
  var gap         = TARGET_SCORE - latest;
  var improvement = latest - first;
  document.getElementById("mk-latest").textContent      = latest;
  document.getElementById("mk-latest").className        = "kpi-value"+(latest>=TARGET_SCORE?" met":"");
  document.getElementById("mk-latest-sub").textContent  = parseLocal(sorted[sorted.length-1].date).toLocaleDateString("en-IN",{day:"numeric",month:"short"});
  document.getElementById("mk-best").textContent        = best;
  document.getElementById("mk-best").className          = "kpi-value"+(best>=TARGET_SCORE?" met":"");
  document.getElementById("mk-gap").textContent         = gap>0?"+"+gap:(gap===0?"Hit!":Math.abs(gap)+" over");
  document.getElementById("mk-gap").className           = "kpi-value"+(gap<=0?" met":"");
  document.getElementById("mk-improvement").textContent = (improvement>=0?"+":"")+improvement;
  document.getElementById("mk-improvement").className   = "kpi-value"+(improvement>0?" met":"");
  document.getElementById("mk-imp-sub").textContent     = sorted.length>1?first+" → "+latest:"Need 2+ mocks";

  if (mockChartInst) mockChartInst.destroy();
  var labels      = sorted.map(function(m){return parseLocal(m.date).toLocaleDateString("en-IN",{day:"numeric",month:"short"});});
  var scores      = sorted.map(function(m){return m.score;});
  var targetLine  = sorted.map(function(){return TARGET_SCORE;});
  mockChartInst = new Chart(document.getElementById("mockChart"),{
    type:"line",
    data:{labels:labels,datasets:[
      {label:"Score",data:scores,borderColor:"#6366f1",backgroundColor:"rgba(99,102,241,0.08)",borderWidth:3,pointBackgroundColor:"#6366f1",pointRadius:6,fill:true,tension:0.3},
      {label:"Target",data:targetLine,borderColor:"#e11d48",borderWidth:1.5,borderDash:[6,4],pointRadius:0,fill:false}
    ]},
    options:{responsive:true,maintainAspectRatio:false,
      plugins:{legend:{display:false},tooltip:{backgroundColor:"#fff",borderColor:"#eaecf0",borderWidth:1,titleColor:"#1a1d23",bodyColor:"#6b7280",padding:12,callbacks:{label:function(ctx){return ctx.dataset.label+": "+ctx.parsed.y;}}}},
      scales:{
        x:{grid:{display:false},ticks:{font:{size:11,family:"Plus Jakarta Sans"},color:"#9ea3ae"},border:{display:false}},
        y:{grid:{color:"#f2f4f7"},ticks:{font:{size:11,family:"Plus Jakarta Sans"},color:"#9ea3ae"},border:{display:false},min:Math.max(200,Math.min.apply(null,scores)-30),suggestedMax:Math.max(TARGET_SCORE+20,Math.max.apply(null,scores)+20)}
      }
    }
  });

  var list = document.getElementById("mock-history-list");
  list.innerHTML="";
  sorted.slice().reverse().forEach(function(m, i){
    var gap2     = TARGET_SCORE - m.score;
    var rank     = sorted.length - i;
    var gapText  = gap2>0?"+"+gap2+" to go":"Target hit!";
    var gapColor = gap2<=0?"#16a34a":"#e11d48";
    var gapBg    = gap2<=0?"#f0fdf4":"#fff1f2";
    var subLine  = parseLocal(m.date).toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short",year:"numeric"})+(m.quant?" · Q: "+m.quant:"")+(m.verbal?" · V: "+m.verbal:"")+(m.notes?" · "+m.notes:"");
    var div=document.createElement("div");
    div.style.cssText="display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:10px;background:#fafafa;border:1.5px solid #f2f4f7;margin-bottom:4px";
    div.innerHTML='<div style="width:28px;height:28px;border-radius:8px;background:#eef2ff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#6366f1;flex-shrink:0">M'+rank+'</div>'
      +'<div style="flex:1"><div style="display:flex;align-items:center;gap:8px"><span style="font-size:20px;font-weight:800;color:'+(m.score>=TARGET_SCORE?"#16a34a":"#6366f1")+'">'+m.score+'</span><span style="font-size:11px;font-weight:500;color:'+gapColor+';background:'+gapBg+';padding:2px 8px;border-radius:100px">'+gapText+'</span></div>'
      +'<div style="font-size:11px;color:#9ea3ae;margin-top:2px">'+subLine+'</div></div>'
      +'<button class="mock-del-btn" style="background:none;border:none;cursor:pointer;color:#d1d5db;font-size:14px;padding:4px;border-radius:6px"><i class="ti ti-trash"></i></button>';
    div.querySelector(".mock-del-btn").addEventListener("click",(function(mid){return function(){deleteMock(mid);};})(m.id));
    list.appendChild(div);
  });
}
