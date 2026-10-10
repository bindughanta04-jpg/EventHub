import { db } from "./firebase.js";
import { collection, query, where, orderBy, onSnapshot, doc, runTransaction, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { $, esc, toast, guard, logout, countUp, nav, fmtDate, day, mon } from "./common.js";
const me = await guard("student");
let events = [], regs = [];
const COL = { Tech: "#7c5cff", Cultural: "#ff5d8f", Sports: "#16a34a", Workshop: "#0ea5e9", Seminar: "#d97706", Other: "#64748b" };
$("#av").textContent = me.name[0].toUpperCase(); $("#meName").textContent = me.name; $("#meRoll").textContent = me.rollNo;
$("#hi").textContent = me.name.split(" ")[0]; $("#out").onclick = logout; nav();
const now = () => new Date().toISOString().slice(0, 16);
onSnapshot(query(collection(db, "events"), orderBy("date")), s => { events = s.docs.map(d => ({ id: d.id, ...d.data() })); render(); });
onSnapshot(query(collection(db, "registrations"), where("uid", "==", me.uid)), s => { regs = s.docs.map(d => ({ id: d.id, ...d.data() })); render(); });
const ticket = (e, actions = "") => {
  const full = (e.registeredCount || 0) >= e.capacity, pct = Math.min(100, Math.round((e.registeredCount || 0) / e.capacity * 100));
  return `<div class="ticket h-100" style="--c:${COL[e.category] || COL.Other}"><div class="stub"><b>${day(e.date)}</b><span>${mon(e.date).toUpperCase()}</span></div>
  <div class="body d-flex flex-column"><div><span class="cat">${esc(e.category)}</span></div><h5 class="my-1">${esc(e.title)}</h5>
  <p class="small mut mb-2">${esc((e.description || "").slice(0, 90))}</p>
  <div class="meta mb-2"><span><i class="bi bi-clock"></i>${fmtDate(e.date)}</span><span><i class="bi bi-geo-alt-fill"></i>${esc(e.venue)}</span></div>
  <div class="cap ${full ? "full" : ""} mb-1"><div style="width:${pct}%"></div></div><div class="small mut mb-3">${e.registeredCount || 0} / ${e.capacity} seats</div>
  <div class="mt-auto">${actions}</div></div></div>`;
};
function render() {
  const mineIds = new Set(regs.map(r => r.eventId)), up = events.filter(e => e.date >= now());
  const myEvents = events.filter(e => mineIds.has(e.id)), myUp = myEvents.filter(e => e.date >= now());
  const k = [["Registered", regs.length, "bi-ticket-detailed-fill", "#7c5cff"], ["Upcoming for me", myUp.length, "bi-hourglass-split", "#ffb547"], ["Open events", up.length, "bi-calendar-heart-fill", "#2de2c8"]];
  $("#kpis").innerHTML = k.map(([l, v, i, c], n) => `<div class="col-md-4"><div class="glass kpi rise" style="--i:${n};--c:${c}"><div class="ic"><i class="bi ${i}"></i></div><div class="n" data-n="${v}">0</div><div class="mut">${l}</div></div></div>`).join("");
  document.querySelectorAll("[data-n]").forEach(el => countUp(el, +el.dataset.n));
  const nx = myUp[0]; $("#next").innerHTML = nx ? `<div style="max-width:560px">${ticket(nx)}</div>` : `<div class="glass empty"><i class="bi bi-stars"></i>No upcoming passes yet. Pick an event to get started.</div>`;
  const q = $("#q").value.toLowerCase(), cf = $("#cf").value;
  const cats = [...new Set(events.map(e => e.category))];
  if ($("#cf").options.length - 1 !== cats.length) $("#cf").innerHTML = `<option value="">All categories</option>` + cats.map(c => `<option ${c === cf ? "selected" : ""}>${esc(c)}</option>`).join("");
  const list = events.filter(e => e.date >= now() && (!cf || e.category === cf) && (e.title + e.venue + e.description).toLowerCase().includes(q));
  $("#evList").innerHTML = list.length ? list.map((e, i) => {
    const r = mineIds.has(e.id), full = (e.registeredCount || 0) >= e.capacity;
    const btn = r ? `<button class="btn btn-ghost btn-sm w-100" data-cancel="${e.id}"><i class="bi bi-check2-circle text-info me-1"></i>Registered. Cancel</button>` : `<button class="btn btn-glow btn-sm w-100" data-reg="${e.id}" ${full ? "disabled" : ""}>${full ? "Sold out" : "Register now"}</button>`;
    return `<div class="col-xl-6 rise" style="--i:${i % 8}">${ticket(e, btn)}</div>`;
  }).join("") : `<div class="glass empty"><i class="bi bi-search"></i>No events match. Try another search.</div>`;
  $("#mineList").innerHTML = myEvents.length ? myEvents.map((e, i) => `<div class="col-xl-6 rise" style="--i:${i}">${ticket(e, e.date >= now() ? `<button class="btn btn-ghost btn-sm w-100" data-cancel="${e.id}">Cancel registration</button>` : `<span class="pill ok">Attended</span>`)}</div>`).join("") : `<div class="glass empty"><i class="bi bi-ticket-perforated"></i>You have not registered for any event yet.</div>`;
}
["q", "cf"].forEach(i => $("#" + i).addEventListener("input", render));
document.addEventListener("click", async e => {
  const b = e.target.closest("[data-reg],[data-cancel]"); if (!b) return;
  const id = b.dataset.reg || b.dataset.cancel, isReg = !!b.dataset.reg; b.disabled = true;
  try {
    await runTransaction(db, async t => {
      const er = doc(db, "events", id), rr = doc(db, "registrations", id + "_" + me.uid);
      const [ev, rg] = await Promise.all([t.get(er), t.get(rr)]);
      if (isReg) {
        if (!ev.exists()) throw Error("This event no longer exists");
        if (rg.exists()) throw Error("You are already registered");
        const d = ev.data(); if ((d.registeredCount || 0) >= d.capacity) throw Error("Sorry, this event is full");
        t.set(rr, { eventId: id, uid: me.uid, studentName: me.name, rollNo: me.rollNo, email: me.email, dept: me.dept, eventTitle: d.title, category: d.category, eventDate: d.date, createdAt: serverTimestamp() });
        t.update(er, { registeredCount: (d.registeredCount || 0) + 1 });
      } else if (rg.exists()) { t.delete(rr); if (ev.exists()) t.update(er, { registeredCount: Math.max(0, (ev.data().registeredCount || 1) - 1) }); }
    });
    toast(isReg ? "You are registered!" : "Registration cancelled");
  } catch (er) { toast(er.message, "err"); b.disabled = false; }
});
$("#p-name").value = me.name; $("#p-phone").value = me.phone; $("#p-email").value = me.email; $("#p-roll").value = me.rollNo; $("#p-dept").value = me.dept;
$("#pf").onsubmit = async e => {
  e.preventDefault(); const name = $("#p-name").value.trim(), phone = $("#p-phone").value.trim();
  if (!/^[A-Za-z][A-Za-z .'-]{2,39}$/.test(name)) return toast("Enter a valid name", "err");
  if (!/^[6-9]\d{9}$/.test(phone)) return toast("Enter a valid 10-digit mobile number", "err");
  try { await updateDoc(doc(db, "users", me.uid), { name, phone, dept: $("#p-dept").value }); toast("Profile updated"); $("#meName").textContent = name; } catch { toast("Could not save profile", "err"); }
};
