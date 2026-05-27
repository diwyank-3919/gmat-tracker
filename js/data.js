// ── SUPABASE SETUP ──
var SUPA_URL = "https://zglxfaarezgyibewtmbh.supabase.co";
var SUPA_KEY = "sb_publishable_24bSL5sfl-tRgRLtik1qNA_NdexORqM";
var supa = supabase.createClient(SUPA_URL, SUPA_KEY);

// ── STATE ──
var sessions = [];

// ── SYNC STATUS ──
function setStatus(s) {
  var el = document.getElementById("sync-status");
  if (!el) return;
  if (s === "saving")      { el.innerHTML = '<i class="ti ti-cloud-upload" style="font-size:13px"></i> Saving...';   el.style.color = "#ca8a04"; }
  else if (s === "synced") { el.innerHTML = '<i class="ti ti-cloud-check"  style="font-size:13px"></i> Synced';      el.style.color = "#16a34a"; }
  else if (s === "error")  { el.innerHTML = '<i class="ti ti-cloud-off"    style="font-size:13px"></i> Error';       el.style.color = "#e11d48"; }
  else                     { el.innerHTML = '<i class="ti ti-cloud"        style="font-size:13px"></i> Connecting…'; el.style.color = "#9ea3ae"; }
}

// ── LOAD ──
function loadSessions() {
  supa.from("sessions").select("*").eq("deleted",false)
    .order("date",{ascending:false}).order("created_at",{ascending:false})
    .then(function(res){
      if (res.error) {
        console.warn("deleted column not available, falling back:", res.error.message);
        return supa.from("sessions").select("*")
          .order("date",{ascending:false}).order("created_at",{ascending:false})
          .then(function(res2){
            if (res2.error) { setStatus("error"); return; }
            sessions = (res2.data||[]).filter(function(s){ return s.deleted !== true; });
            setStatus("synced");
            render();
          });
      }
      sessions = res.data||[];
      setStatus("synced");
      render();
    });
}

// ── ADD ──
function addSession() {
  var d     = document.getElementById("inp-date").value;
  var topic = document.getElementById("inp-topic").value;
  var h     = parseInt(document.getElementById("inp-hours").value)||0;
  var m     = parseInt(document.getElementById("inp-mins").value)||0;
  if (!d||h+m===0) return;
  var btn=document.querySelector(".log-btn");
  btn.disabled=true; btn.textContent="Saving...";
  setStatus("saving");
  supa.from("sessions").insert({date:d,topic:topic,mins:h*60+m,created_at:Date.now()})
    .then(function(res) {
      if (res.error) throw res.error;
      document.getElementById("inp-hours").value="";
      document.getElementById("inp-mins").value="";
      btn.disabled=false; btn.innerHTML='<i class="ti ti-plus"></i> Add session';
      loadSessions();
    })
    .catch(function(err) {
      setStatus("error");
      alert("Save failed: "+(err.message||JSON.stringify(err)));
      btn.disabled=false; btn.innerHTML='<i class="ti ti-plus"></i> Add session';
    });
}

// ── DELETE (soft) ──
function delSession(id) {
  setStatus("saving");
  supa.from("sessions").update({deleted:true}).eq("id",id)
    .then(function(res){
      if (res.error) {
        supa.from("sessions").delete().eq("id",id)
          .then(function(res2){
            if (res2.error) { setStatus("error"); alert("Delete failed: "+res2.error.message); return; }
            loadSessions();
          });
        return;
      }
      loadSessions();
    });
}

// ── TRASH: RESTORE ──
function restoreSession(id) {
  setStatus("saving");
  supa.from("sessions").update({deleted:false}).eq("id",id)
    .then(function(res){
      if (res.error) { setStatus("error"); alert("Restore failed: "+res.error.message); return; }
      loadTrashed();
      loadSessions();
    });
}

// ── TRASH: PERMANENT DELETE ──
function permanentDelete(id) {
  if (!confirm("Permanently delete this session? This cannot be undone.")) return;
  setStatus("saving");
  supa.from("sessions").delete().eq("id",id)
    .then(function(res){
      if (res.error) { setStatus("error"); alert("Delete failed: "+res.error.message); return; }
      loadTrashed();
    });
}

// ── LOAD TRASHED ──
function loadTrashed() {
  supa.from("sessions").select("*").eq("deleted",true).order("date",{ascending:false})
    .then(function(res){
      renderTrash(res.error ? [] : res.data||[]);
    });
}

// ── LOCAL STORAGE MIGRATION ──
function migrateFromLocalStorage() {
  var OLD_KEYS = ["gmat_v3","gmat_sessions_v2","gmat_sessions"];
  var found = null;
  OLD_KEYS.forEach(function(k){
    var raw = localStorage.getItem(k);
    if (raw && !found) { try { found = JSON.parse(raw); } catch(e){} }
  });
  if (!found || !found.length) { alert("No local data found to migrate."); return; }
  var modal = document.getElementById("migrate-modal");
  document.getElementById("migrate-count").textContent = found.length;
  document.getElementById("migrate-preview").textContent = found.slice(0,3).map(function(s){
    return s.date+" - "+s.topic+" - "+fmtH(s.mins);
  }).join("\n")+(found.length>3?"\n...and "+(found.length-3)+" more":"");
  modal.style.display = "flex";
  document.getElementById("migrate-confirm").onclick = function() {
    modal.style.display = "none";
    setStatus("saving");
    var rows = found.map(function(s){
      return {date:s.date, topic:s.topic, mins:s.mins, created_at:s.createdAt||s.created_at||Date.now()};
    });
    supa.from("sessions").insert(rows)
      .then(function(res){
        if (res.error) { setStatus("error"); alert("Migration failed: "+res.error.message); return; }
        OLD_KEYS.forEach(function(k){ localStorage.removeItem(k); });
        alert("Migrated "+rows.length+" sessions successfully!");
        loadSessions();
      })
      .catch(function(err){ setStatus("error"); alert("Migration failed: "+err.message); });
  };
  document.getElementById("migrate-cancel").onclick = function() { modal.style.display = "none"; };
}

function checkLocalMigration() {
  var OLD_KEYS = ["gmat_v3","gmat_sessions_v2","gmat_sessions"];
  var found = false;
  OLD_KEYS.forEach(function(k){ if(localStorage.getItem(k)) found=true; });
  if (found) {
    var bar = document.getElementById("migrate-bar");
    if (bar) bar.style.display = "flex";
  }
}
