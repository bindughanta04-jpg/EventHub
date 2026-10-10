import { db } from "./firebase.js";
import { collection, query, where, orderBy, onSnapshot, doc, addDoc, updateDoc, deleteDoc, getDocs, writeBatch, increment, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { $, esc, toast, guard, logout, countUp, nav, fmtDate } from "./common.js";
const me = await guard("admin");
let events = [], students = [], regs = [], editId = null;
$("#av").textContent = me.name[0].toUpperCase(); $("#meName").textContent = me.name; $("#out").onclick = logout; nav();
const modal = new bootstrap.Modal("#evModal");
onSnapshot(query(collection(db, "events"), orderBy("date")), s => { events = s.docs.map(d => ({ id: d.id, ...d.data() })); render(); });
onSnapshot(query(collection(db, "users"), where("role", "==", "student")), s => { students = s.docs.map(d => ({ id: d.id, ...d.data() })); render(); });
onSnapshot(collection(db, "registrations"), s => { regs = s.docs.map(d => ({ id: d.id, ...d.data() })); render(); });
const secs = x => x?.seconds ?? Date.now() / 1000;
const empty = (c, t) => `<tr><td colspan="${c}" class="empty" style="background:none">${t}</td></tr>`;
// charts
Chart.defaults.color = "#a39fc9"; Chart.defaults.font.family = "Figtree"; Chart.defaults.borderColor = "rgba(255,255,255,.07)";
const mk = (id, cfg) => new Chart($("#" + id), cfg);
const c1 = mk("c1", { type: "bar", data: { labels: [], datasets: [{ label: "Registrations", data: [], backgroundColor: "#7c5cff", borderRadius: 8 }] }, options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } } });
const c2 = mk("c2", { type: "doughnut", data: { labels: [], datasets: [{ data: [], backgroundColor: ["#7c5cff", "#ff5d8f", "#2de2c8", "#ffb547", "#0ea5e9", "#64748b"], borderWidth: 0 }] }, options: { cutout: "68%", plugins: { legend: { position: "bottom" } } } });
const c3 = mk("c3", { type: "line", data: { labels: [], datasets: [{ data: [], borderColor: "#2de2c8", backgroundColor: "rgba(45,226,200,.15)", fill: true, tension: .4, pointRadius: 4 }] }, options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } } });
function render() {
  const seats = events.reduce((a, e) => a + e.capacity, 0), fill = seats ? Math.round(regs.length / seats * 100) : 0;
  const k = [["Students", students.length, "bi-people-fill", "#7c5cff"], ["Events", events.length, "bi-calendar-event-fill", "#ff5d8f"], ["Registrations", regs.length, "bi-ticket-detailed-fill", "#2de2c8"], ["Seats filled %", fill, "bi-pie-chart-fill", "#ffb547"]];
  if (!$("#kpis").children.length) $("#kpis").innerHTML = k.map(([l, , i, c], n) => `<div class="col-6 col-xl-3"><div class="glass kpi rise" style="--i:${n};--c:${c}"><div class="ic"><i class="bi ${i}"></i></div><div class="n" data-k="${n}">0</div><div class="mut">${l}</div></div></div>`).join("");
  k.forEach(([, v], n) => countUp($(`[data-k="${n}"]`), v));
  const top = [...events].sort((a, b) => (b.registeredCount || 0) - (a.registeredCount || 0)).slice(0, 7);
  c1.data.labels = top.map(e => e.title.length > 14 ? e.title.slice(0, 13) + "…" : e.title); c1.data.datasets[0].data = top.map(e => e.registeredCount || 0); c1.update();
  const cat = {}; events.forEach(e => cat[e.category] = (cat[e.category] || 0) + 1);
  c2.data.labels = Object.keys(cat); c2.data.datasets[0].data = Object.values(cat); c2.update();
  const days = [...Array(7)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() - 6 + i); return d; });
  c3.data.labels = days.map(d => d.toLocaleDateString([], { day: "2-digit", month: "short" }));
  c3.data.datasets[0].data = days.map(d => students.filter(s => s.createdAt && new Date(s.createdAt.seconds * 1000).toDateString() === d.toDateString()).length); c3.update();
  const rec = [...regs].sort((a, b) => secs(b.createdAt) - secs(a.createdAt)).slice(0, 6);
  $("#recent").innerHTML = rec.length ? rec.map(r => `<div class="d-flex gap-2 align-items-center py-2 border-bottom border-secondary-subtle"><div class="avatar" style="width:34px;height:34px;font-size:.8rem">${esc(r.studentName[0])}</div><div style="min-width:0"><div class="small fw-bold text-truncate">${esc(r.studentName)}</div><div class="small mut text-truncate">${esc(r.eventTitle)}</div></div></div>`).join("") : `<div class="empty">No registrations yet</div>`;
  // events table
  $("#evBody").innerHTML = events.length ? events.map(e => { const p = Math.round((e.registeredCount || 0) / e.capacity * 100); return `<tr><td><b>${esc(e.title)}</b><div><span class="cat">${esc(e.category)}</span></div></td><td>${fmtDate(e.date)}</td><td>${esc(e.venue)}</td><td style="min-width:130px"><div class="cap ${p >= 100 ? "full" : ""}"><div style="width:${p}%"></div></div><small class="mut">${e.registeredCount || 0}/${e.capacity}</small></td><td class="text-end text-nowrap"><button class="btn btn-ghost btn-sm" data-ed="${e.id}"><i class="bi bi-pencil"></i></button> <button class="btn btn-ghost btn-sm text-danger" data-del="${e.id}"><i class="bi bi-trash"></i></button></td></tr>`; }).join("") : empty(5, "No events yet. Create your first one.");
  // students
  const q = $("#sq").value.toLowerCase();
  const sl = students.filter(s => (s.name + s.rollNo + s.email).toLowerCase().includes(q));
  $("#stBody").innerHTML = sl.length ? sl.map(s => `<tr><td><b>${esc(s.name)}</b><div class="small mut">${esc(s.email)}</div></td><td>${esc(s.rollNo)}</td><td>${esc(s.dept)}</td><td>${esc(s.phone)}</td><td><span class="pill ${s.status === "blocked" ? "bad" : "ok"}">${s.status === "blocked" ? "Blocked" : "Active"}</span></td><td class="text-end text-nowrap"><button class="btn btn-ghost btn-sm" data-blk="${s.id}">${s.status === "blocked" ? "Unblock" : "Block"}</button> <button class="btn btn-ghost btn-sm text-danger" data-rm="${s.id}"><i class="bi bi-trash"></i></button></td></tr>`).join("") : empty(6, "No students found");
  // regs
  const rf = $("#rf"), cur = rf.value; rf.innerHTML = `<option value="">All events</option>` + events.map(e => `<option value="${e.id}" ${e.id === cur ? "selected" : ""}>${esc(e.title)}</option>`).join("");
  $("#rgBody").innerHTML = regsFiltered().length ? regsFiltered().map(r => `<tr><td>${esc(r.studentName)}<div class="small mut">${esc(r.email)}</div></td><td>${esc(r.rollNo)}</td><td>${esc(r.eventTitle)}</td><td>${r.createdAt ? fmtDate(r.createdAt.seconds * 1000) : "-"}</td><td class="text-end"><button class="btn btn-ghost btn-sm text-danger" data-rr="${r.id}"><i class="bi bi-x-lg"></i></button></td></tr>`).join("") : empty(5, "No registrations to show");
}
const regsFiltered = () => regs.filter(r => !$("#rf").value || r.eventId === $("#rf").value);
$("#sq").oninput = render; $("#rf").onchange = render;
$("#csv").onclick = () => {
  const rows = [["Name", "Roll No", "Email", "Dept", "Event"], ...regsFiltered().map(r => [r.studentName, r.rollNo, r.email, r.dept || "", r.eventTitle])];
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n")], { type: "text/csv" })); a.download = "registrations.csv"; a.click();
};
// event form
const F = ["title", "cap", "date", "venue", "desc"].map(x => $("#e-" + x));
$("#newEv").onclick = () => { editId = null; $("#mt").textContent = "New event"; $("#evForm").reset(); F.forEach(f => f.classList.remove("is-invalid")); modal.show(); };
$("#evForm").onsubmit = async e => {
  e.preventDefault();
  const v = { title: $("#e-title").value.trim(), category: $("#e-cat").value, capacity: parseInt($("#e-cap").value), date: $("#e-date").value, venue: $("#e-venue").value.trim(), description: $("#e-desc").value.trim() };
  const bad = { "e-title": v.title.length < 3, "e-cap": !(v.capacity >= 1 && v.capacity <= 10000), "e-date": !v.date, "e-venue": !v.venue, "e-desc": v.description.length < 10 };
  Object.entries(bad).forEach(([id, b]) => $("#" + id).classList.toggle("is-invalid", b));
  if (Object.values(bad).some(Boolean)) return;
  if (events.some(x => x.id !== editId && x.title.toLowerCase() === v.title.toLowerCase() && x.date === v.date)) return toast("An event with this title and time already exists", "err");
  if (editId) { const old = events.find(x => x.id === editId); if (v.capacity < (old.registeredCount || 0)) return toast("Seats cannot be fewer than current registrations", "err"); }
  try {
    if (editId) { await updateDoc(doc(db, "events", editId), v); await syncRegs(editId, v); toast("Event updated"); }
    else { await addDoc(collection(db, "events"), { ...v, registeredCount: 0, createdAt: serverTimestamp() }); toast("Event created"); }
    modal.hide();
  } catch (er) { toast(er.message, "err"); }
};
async function syncRegs(id, v) { const s = await getDocs(query(collection(db, "registrations"), where("eventId", "==", id))); const b = writeBatch(db); s.forEach(d => b.update(d.ref, { eventTitle: v.title, category: v.category, eventDate: v.date })); await b.commit(); }
// actions
document.addEventListener("click", async e => {
  const b = e.target.closest("[data-ed],[data-del],[data-blk],[data-rm],[data-rr]"); if (!b) return;
  try {
    if (b.dataset.ed) { const x = events.find(i => i.id === b.dataset.ed); editId = x.id; $("#mt").textContent = "Edit event"; $("#e-title").value = x.title; $("#e-cat").value = x.category; $("#e-cap").value = x.capacity; $("#e-date").value = x.date; $("#e-venue").value = x.venue; $("#e-desc").value = x.description; F.forEach(f => f.classList.remove("is-invalid")); modal.show(); }
    else if (b.dataset.del) {
      if (!confirm("Delete this event and all its registrations?")) return;
      const s = await getDocs(query(collection(db, "registrations"), where("eventId", "==", b.dataset.del))); const w = writeBatch(db);
      s.forEach(d => w.delete(d.ref)); w.delete(doc(db, "events", b.dataset.del)); await w.commit(); toast("Event deleted");
    } else if (b.dataset.blk) { const s = students.find(i => i.id === b.dataset.blk), st = s.status === "blocked" ? "active" : "blocked"; await updateDoc(doc(db, "users", s.id), { status: st }); toast(st === "blocked" ? "Student blocked" : "Student unblocked"); }
    else if (b.dataset.rm) {
      const s = students.find(i => i.id === b.dataset.rm); if (!confirm(`Remove ${s.name}? Their registrations and roll number will be freed.`)) return;
      const rs = regs.filter(r => r.uid === s.id), w = writeBatch(db);
      rs.forEach(r => { w.delete(doc(db, "registrations", r.id)); w.update(doc(db, "events", r.eventId), { registeredCount: increment(-1) }); });
      w.delete(doc(db, "rollNumbers", s.rollNo)); w.delete(doc(db, "users", s.id)); await w.commit(); toast("Student removed");
    } else if (b.dataset.rr) {
      const r = regs.find(i => i.id === b.dataset.rr); if (!confirm("Remove this registration?")) return;
      const w = writeBatch(db); w.delete(doc(db, "registrations", r.id)); w.update(doc(db, "events", r.eventId), { registeredCount: increment(-1) }); await w.commit(); toast("Registration removed");
    }
  } catch (er) { toast(er.message, "err"); }
});
