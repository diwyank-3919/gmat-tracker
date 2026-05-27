// ── CUSTOM DATE PICKER ──
var pickerOffset = 0;

function getPickerRef() {
  return new Date(today.getFullYear(), today.getMonth()+pickerOffset, 1);
}

function togglePicker() {
  var p = document.getElementById("custom-picker");
  if (p.style.display === "none") {
    var inp = document.getElementById("inp-date");
    if (inp.value) {
      var parts = inp.value.split("-").map(Number);
      var sel = new Date(parts[0], parts[1]-1, 1);
      pickerOffset = (sel.getFullYear()-today.getFullYear())*12 + (sel.getMonth()-today.getMonth());
    } else { pickerOffset = 0; }
    renderPicker();
    p.style.display = "block";
    setTimeout(function(){
      document.addEventListener("click", pickerOutside, true);
    }, 0);
  } else {
    closePicker();
  }
}

function pickerOutside(e) {
  var p = document.getElementById("custom-picker");
  var d = document.getElementById("date-display");
  if (p && !p.contains(e.target) && d && !d.contains(e.target)) closePicker();
}

function closePicker() {
  document.getElementById("custom-picker").style.display = "none";
  document.removeEventListener("click", pickerOutside, true);
}

function pickerNav(n) {
  pickerOffset += n;
  renderPicker();
}

function renderPicker() {
  var ref   = getPickerRef();
  var label = ref.toLocaleDateString("en-IN",{month:"long",year:"numeric"});
  document.getElementById("picker-month-year").textContent = label;

  var grid  = document.getElementById("picker-grid");
  grid.innerHTML = "";
  var days  = new Date(ref.getFullYear(), ref.getMonth()+1, 0).getDate();
  var first = new Date(ref.getFullYear(), ref.getMonth(), 1);
  var pad   = (first.getDay()+6)%7;
  var sel   = document.getElementById("inp-date").value;
  var todayStr = dateStr(today);

  for (var i=0; i<pad; i++) { grid.appendChild(document.createElement("div")); }

  for (var day=1; day<=days; day++) {
    var d   = new Date(ref.getFullYear(), ref.getMonth(), day);
    var ds  = dateStr(d);
    var isToday = ds === todayStr;
    var isSel   = ds === sel;
    var isWEnd  = d.getDay()===0||d.getDay()===6;
    var hasSess = minsOn(ds) > 0;
    var cell = document.createElement("div");
    cell.style.cssText = "aspect-ratio:1;border-radius:6px;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;transition:background 0.1s;position:relative";
    if (isSel)        cell.style.background = "linear-gradient(135deg,#6366f1,#8b5cf6)";
    else if (isToday) { cell.style.background = "#eef2ff"; cell.style.outline = "1.5px solid #c7d2fe"; }
    else              cell.style.background = "transparent";

    var numEl = document.createElement("div");
    numEl.style.cssText = "font-size:10px;font-weight:"+(isSel||isToday?"700":"500")+";color:"+(isSel?"#fff":isToday?"#6366f1":isWEnd?"#8b8ff8":"#374151");
    numEl.textContent = day;
    cell.appendChild(numEl);

    if (hasSess && !isSel) {
      var pip = document.createElement("div");
      pip.style.cssText = "position:absolute;bottom:2px;width:3px;height:3px;border-radius:50%;background:"+(isToday?"#6366f1":"#16a34a");
      cell.appendChild(pip);
    }

    cell.onmouseover = (function(el, s2) { return function() { if (!s2) el.style.background = "#f7f8fa"; }; })(cell, isSel);
    cell.onmouseout  = (function(el, s2, t2) { return function() { if (!s2 && !t2) el.style.background = "transparent"; }; })(cell, isSel, isToday);
    cell.onclick     = (function(ds2){ return function(e) { e.stopPropagation(); pickerSelectDate(ds2); }; })(ds);
    grid.appendChild(cell);
  }
}

function pickerSelectDate(ds) {
  document.getElementById("inp-date").value = ds;
  var parts = ds.split("-").map(Number);
  var d = new Date(parts[0], parts[1]-1, parts[2]);
  var label = (ds === dateStr(today)) ? "Today"
            : (ds === dateStr(addDays(today,-1))) ? "Yesterday"
            : d.toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short",year:"numeric"});
  document.getElementById("date-display-text").textContent = label;
  closePicker();
}

function shiftDate(n) {
  var inp = document.getElementById("inp-date");
  var cur = inp.value || dateStr(today);
  var parts = cur.split("-").map(Number);
  var d = new Date(parts[0], parts[1]-1, parts[2]);
  d.setDate(d.getDate()+n);
  pickerSelectDate(dateStr(d));
}
