import { auth, db } from "./firebase.js";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, deleteUser, signOut, onAuthStateChanged, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, runTransaction, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { $, $$, toast } from "./common.js";
let busy = false;
const go = r => location.replace(r === "admin" ? "admin.html" : "student.html");
onAuthStateChanged(auth, async u => {
  if (!u || busy) return;
  const s = await getDoc(doc(db, "users", u.uid));
  if (s.exists() && s.data().status !== "blocked") go(s.data().role);
});
// tabs
$$("[data-tab]").forEach(b => b.onclick = () => {
  $$("[data-tab]").forEach(x => x.classList.toggle("active", x === b));
  $("#loginForm").classList.toggle("d-none", b.dataset.tab !== "login");
  $("#signupForm").classList.toggle("d-none", b.dataset.tab !== "signup");
});
// validation
const rules = {
  name: v => /^[A-Za-z][A-Za-z .'-]{2,39}$/.test(v) ? "" : "Enter your full name (3-40 letters)",
  email: v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? "" : "Enter a valid email address",
  roll: v => /^[A-Z0-9][A-Z0-9-]{3,19}$/.test(v) ? "" : "4-20 characters: letters, numbers or hyphen",
  dept: v => v ? "" : "Select your department",
  phone: v => /^[6-9]\d{9}$/.test(v) ? "" : "Enter a valid 10-digit mobile number",
  pass: v => /^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(v) ? "" : "Min 8 characters with a letter and a number",
  pass2: v => v === $("#s-pass").value ? "" : "Passwords do not match",
  any: v => v ? "" : "This field is required"
};
const check = el => {
  if (el.dataset.v === "roll") el.value = el.value.toUpperCase();
  const m = rules[el.dataset.v](el.value.trim());
  el.classList.toggle("is-invalid", !!m); el.classList.toggle("is-valid", !m);
  el.parentElement.querySelector(".invalid-feedback").textContent = m; return !m;
};
$$("[data-v]").forEach(el => { el.addEventListener("input", () => check(el)); el.addEventListener("blur", () => check(el)); });
const mark = (id, msg) => { const el = $("#" + id); el.classList.add("is-invalid"); el.parentElement.querySelector(".invalid-feedback").textContent = msg; };
const load = (b, on) => { b.disabled = on; b.querySelector(".sp").classList.toggle("d-none", !on); };

$("#loginForm").onsubmit = async e => {
  e.preventDefault(); const f = e.target, b = f.querySelector("button[type=submit]");
  if (!$$("[data-v]", f).map(check).every(Boolean)) return;
  load(b, true); busy = true;
  try {
    const c = await signInWithEmailAndPassword(auth, $("#l-email").value.trim().toLowerCase(), $("#l-pass").value);
    const s = await getDoc(doc(db, "users", c.user.uid));
    if (!s.exists()) { await signOut(auth); throw { code: "x", message: "No profile found for this account. Contact your admin." }; }
    if (s.data().status === "blocked") { await signOut(auth); throw { code: "x", message: "Your account is blocked. Contact your admin." }; }
    toast("Welcome back, " + s.data().name.split(" ")[0] + "!"); setTimeout(() => go(s.data().role), 500);
  } catch (err) {
    busy = false;
    toast(/invalid-credential|wrong-password|user-not-found/.test(err.code) ? "Incorrect email or password" : err.message, "err");
  } load(b, false);
};
$("#forgot").onclick = async e => {
  e.preventDefault(); const em = $("#l-email").value.trim();
  if (rules.email(em)) return toast("Type your email above first", "err");
  try { await sendPasswordResetEmail(auth, em); toast("Reset link sent. Check your inbox."); } catch { toast("Could not send reset link", "err"); }
};
$("#signupForm").onsubmit = async e => {
  e.preventDefault(); const f = e.target, b = f.querySelector("button[type=submit]");
  if (!$$("[data-v]", f).map(check).every(Boolean)) return toast("Fix the highlighted fields", "err");
  const d = { name: $("#s-name").value.trim(), email: $("#s-email").value.trim().toLowerCase(), rollNo: $("#s-roll").value.trim().toUpperCase(), dept: $("#s-dept").value, phone: $("#s-phone").value.trim() };
  load(b, true); busy = true; let cred;
  try {
    cred = await createUserWithEmailAndPassword(auth, d.email, $("#s-pass").value);
    const uid = cred.user.uid;
    try {
      await runTransaction(db, async t => {
        const rr = doc(db, "rollNumbers", d.rollNo);
        if ((await t.get(rr)).exists()) throw new Error("ROLL");
        t.set(rr, { uid });
        t.set(doc(db, "users", uid), { ...d, role: "student", status: "active", createdAt: serverTimestamp() });
      });
    } catch (er) { await deleteUser(cred.user); throw er.message === "ROLL" ? { code: "roll" } : er; }
    toast("Account created. Welcome!"); setTimeout(() => go("student"), 600);
  } catch (err) {
    busy = false;
    if (err.code === "auth/email-already-in-use") mark("s-email", "This email is already registered. Log in instead.");
    else if (err.code === "roll") mark("s-roll", "This roll number is already registered");
    else toast(err.message || "Signup failed", "err");
  } load(b, false);
};
