import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const fmtDate = s => s ? new Date(s).toLocaleString([], { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "-";
export const day = s => new Date(s).getDate();
export const mon = s => new Date(s).toLocaleString([], { month: "short" });
export function toast(msg, type = "ok") {
  let box = $("#toasts"); if (!box) { box = document.createElement("div"); box.id = "toasts"; document.body.append(box); }
  const t = document.createElement("div"); t.className = "toast-x " + type;
  t.innerHTML = `<i class="bi ${type === "ok" ? "bi-check-circle-fill" : "bi-exclamation-triangle-fill"}"></i><span>${esc(msg)}</span>`;
  box.append(t); setTimeout(() => { t.classList.add("out"); setTimeout(() => t.remove(), 400); }, 3200);
}
export function guard(role) {
  return new Promise(res => onAuthStateChanged(auth, async u => {
    if (!u) return location.replace("index.html");
    const s = await getDoc(doc(db, "users", u.uid));
    if (!s.exists() || s.data().status === "blocked") { await signOut(auth); return location.replace("index.html"); }
    const p = { uid: u.uid, ...s.data() };
    if (p.role !== role) return location.replace(p.role === "admin" ? "admin.html" : "student.html");
    res(p);
  }));
}
export const logout = () => signOut(auth).then(() => location.replace("index.html"));
export function countUp(el, to) {
  const t0 = performance.now(), from = +el.dataset.v || 0; el.dataset.v = to;
  const f = n => { const k = Math.min((n - t0) / 700, 1); el.textContent = Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(f); };
  requestAnimationFrame(f);
}
export function nav(onShow) {
  $$("[data-go]").forEach(b => b.onclick = () => {
    $$("[data-go]").forEach(x => x.classList.toggle("active", x === b));
    $$(".sec").forEach(s => s.classList.toggle("show", s.id === "sec-" + b.dataset.go));
    onShow?.(b.dataset.go);
  });
}
