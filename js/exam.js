// ── EXAM SETTINGS ──
var TARGET_SCORE    = 735;
var PREP_START_DATE = new Date(2026, 3, 25);

function saveExamSettings() {
  var examDate    = document.getElementById("exam-date-inp").value;
  var targetScore = parseInt(document.getElementById("target-score-inp").value) || 735;
  TARGET_SCORE    = targetScore;
  localStorage.setItem("gmat_exam_date", examDate);
  localStorage.setItem("gmat_target_score", targetScore);
  updateExamCountdown();
  renderMockView();
}

function loadExamSettings() {
  var examDate    = localStorage.getItem("gmat_exam_date") || "";
  var targetScore = parseInt(localStorage.getItem("gmat_target_score")) || 735;
  TARGET_SCORE    = targetScore;
  document.getElementById("exam-date-inp").value    = examDate;
  document.getElementById("target-score-inp").value = targetScore;
  updateExamCountdown();
}

function updateExamCountdown() {
  var examDateVal = document.getElementById("exam-date-inp").value;
  var show = !!examDateVal;
  ["countdown-block","hrs-needed-block","total-hrs-block"].forEach(function(id){
    document.getElementById(id).style.display = show ? "block" : "none";
  });
  document.getElementById("exam-progress-wrap").style.display = show ? "block" : "none";
  if (!show) return;

  var parts    = examDateVal.split("-").map(Number);
  var examDate = new Date(parts[0], parts[1]-1, parts[2]);
  var daysLeft = Math.max(0, Math.ceil((examDate - today) / (1000*60*60*24)));
  document.getElementById("days-left").textContent = daysLeft;

  var totalStudied = sessions.reduce(function(a,s){return a+s.mins;},0) / 60;
  var GOAL_HRS     = 200;
  var remaining    = Math.max(0, GOAL_HRS - totalStudied);
  var hrsPerDay    = daysLeft > 0 ? (remaining / daysLeft).toFixed(1) : "0";
  document.getElementById("hrs-needed").textContent = hrsPerDay + "h";

  var sd           = new Set(sessions.map(function(s){return s.date;})).size || 1;
  var avgHrsPerDay = totalStudied / sd;
  var projected    = totalStudied + (avgHrsPerDay * daysLeft);
  document.getElementById("proj-total").textContent = Math.round(projected) + "h";

  var totalPrepDays = Math.ceil((examDate - PREP_START_DATE) / (1000*60*60*24));
  var doneDays      = Math.ceil((today - PREP_START_DATE) / (1000*60*60*24));
  var prepPct       = Math.min(100, Math.round(doneDays / totalPrepDays * 100));
  document.getElementById("exam-progress-bar").style.width   = prepPct + "%";
  document.getElementById("exam-progress-pct").textContent   = prepPct + "% of prep done";
  document.getElementById("exam-date-label").textContent     = examDate.toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"});
}

function updateCommandCenter() {
  if (mockScores.length > 0) {
    var latest = mockScores[mockScores.length-1].score;
    var gap    = TARGET_SCORE - latest;
    document.getElementById("score-progress-block").style.display = "block";
    document.getElementById("gap-block").style.display            = "block";
    document.getElementById("latest-mock-display").textContent    = latest;
    document.getElementById("score-gap").textContent              = gap > 0 ? "+" + gap : (gap === 0 ? "On target!" : "Exceeded!");
    document.getElementById("score-gap").style.color              = gap <= 0 ? "#16a34a" : "#e11d48";
  } else {
    document.getElementById("score-progress-block").style.display = "none";
    document.getElementById("gap-block").style.display            = "none";
  }
}

// ── MOCK SCORES ──
var mockScores    = JSON.parse(localStorage.getItem("gmat_mock_scores") || "[]");
var mockChartInst = null;

function saveMockScores() { localStorage.setItem("gmat_mock_scores", JSON.stringify(mockScores)); }

function openAddMock() {
  document.getElementById("mock-date-inp").value   = dateStr(today);
  document.getElementById("mock-score-inp").value  = "";
  document.getElementById("mock-quant-inp").value  = "";
  document.getElementById("mock-verbal-inp").value = "";
  document.getElementById("mock-notes-inp").value  = "";
  document.getElementById("add-mock-modal").style.display = "flex";
}
function closeAddMock() { document.getElementById("add-mock-modal").style.display = "none"; }

function saveMock() {
  var date   = document.getElementById("mock-date-inp").value;
  var score  = parseInt(document.getElementById("mock-score-inp").value);
  var quant  = parseInt(document.getElementById("mock-quant-inp").value) || null;
  var verbal = parseInt(document.getElementById("mock-verbal-inp").value) || null;
  var notes  = document.getElementById("mock-notes-inp").value.trim();
  if (!date || !score || score < 200 || score > 805) { alert("Please enter a valid date and score (200–805)"); return; }
  mockScores.push({id:Date.now(), date:date, score:score, quant:quant, verbal:verbal, notes:notes});
  mockScores.sort(function(a,b){return a.date.localeCompare(b.date);});
  saveMockScores();
  closeAddMock();
  renderMockView();
  updateCommandCenter();
}

function deleteMock(id) {
  if (!confirm("Delete this mock score?")) return;
  mockScores = mockScores.filter(function(m){return m.id !== id;});
  saveMockScores();
  renderMockView();
  updateCommandCenter();
}
