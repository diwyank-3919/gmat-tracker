// ── CONSTANTS ──
var TC     = { "Quant":"#6366f1","RC":"#16a34a","CR":"#d97706","DI":"#0ea5e9","Mock test":"#ec4899","Review":"#f97316" };
var TOPICS = ["Quant","RC","CR","DI","Mock test","Review"];
var SB_IDS = {"Quant":"sb-quant","RC":"sb-rc","CR":"sb-cr","DI":"sb-di","Mock test":"sb-mock","Review":"sb-review"};
var QUOTES = [
  ["Every hour compounds.","700+ is built one session at a time."],
  ["Consistency beats intensity.","Show up daily and the score follows."],
  ["The GMAT rewards structure.","Keep building the habit."],
  ["You are ahead of who you were yesterday.","Keep the streak alive."],
  ["Progress is invisible until it is not.","Log today session."]
];

// ── DATE HELPERS ──
var today = new Date(); today.setHours(0,0,0,0);

function fmtH(m) {
  var h = Math.floor(m/60), mn = Math.round(m%60);
  return h > 0 ? (mn > 0 ? h+"h "+mn+"m" : h+"h") : mn+"m";
}
function dateStr(d) {
  return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
}
function parseLocal(s) { var p=s.split("-").map(Number); return new Date(p[0],p[1]-1,p[2]); }
function isWE(d)       { var w=new Date(d).getDay(); return w===0||w===6; }
function targetFor(d)  { return isWE(d)?360:180; }
function addDays(d,n)  { var r=new Date(d); r.setDate(r.getDate()+n); return r; }
function startOfWeek(d){ var r=new Date(d); r.setDate(r.getDate()-((r.getDay()+6)%7)); r.setHours(0,0,0,0); return r; }
function startOfMonth(d){ return new Date(d.getFullYear(),d.getMonth(),1); }
function minsOn(ds)    { return sessions.filter(function(s){return s.date===ds;}).reduce(function(a,s){return a+s.mins;},0); }
