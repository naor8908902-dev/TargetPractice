import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, onValue, set } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAozTFT0NroGxKEgvtzsZt9gIPfFYqleWg",
  authDomain: "iot1-1d895.firebaseapp.com",
  databaseURL: "https://iot1-1d895-default-rtdb.firebaseio.com",
  projectId: "iot1-1d895",
  storageBucket: "iot1-1d895.firebasestorage.app",
  messagingSenderId: "440705339090",
  appId: "1:440705339090:web:1bb3bdb73bb70c9453270b"
};

const app  = initializeApp(firebaseConfig);
const db   = getDatabase(app);
const auth = getAuth(app);

const toAlteraRef = ref(db, "toAltera");
const gameBtn     = document.getElementById("gameToggleBtn");

let isBusy     = false;
let gameActive = false;

const sleep = ms => new Promise(res => setTimeout(res, ms));

// ─── עזר: שליחה ל-Firebase עם לוג ────────────────────────────
async function send(value) {
  console.log(`→ Firebase: ${value} (0b${value.toString(2).padStart(8, "0")})`);
  await set(toAlteraRef, value);
}

// ─── עזר: עדכון מראה הכפתור הראשי ────────────────────────────
function setButtonState(state, text) {
  if (!gameBtn) return;
  gameBtn.textContent = text;
  gameBtn.disabled    = (state === "loading");
  gameBtn.className   =
    state === "active" ? "btn btn-outline-danger game-btn" :
    state === "idle"   ? "btn btn-danger game-btn"         :
                         "btn btn-secondary game-btn";
}

// ─── התחלת משחק ───────────────────────────────────────────────
async function startGame() {
  isBusy = true;
  setButtonState("loading", "מתחיל...");
  try {
    // שלח 0 → ודא שה-FPGA ב-idle ו-reset_prev=0
    await send(0);
    await sleep(500);

    // שלח 65 (0b01000001) → bit-0=1 → rising-edge → ammo=7
    await send(65);
    await sleep(2000);

    // שלח 66 (0b01000010) → bit-0=0 → falling-edge, סיים רסט
    await send(66);
    await sleep(500);

    // כעת המשחק פעיל, val-b אמור להיות 7
    const valB = document.getElementById("val-b");
    if (valB) valB.textContent = "7";

    gameActive = true;
    setButtonState("active", "סיים משחק");
  } catch (err) {
    console.error("startGame failed:", err);
    setButtonState("idle", "להתחיל משחק");
  } finally {
    isBusy = false;
  }
}

// ─── איפוס משחק ───────────────────────────────────────────────
//
// רצף:
//   1. שלח 0               → FPGA ב-idle, reset_prev←0
//   2. המתן 2s
//   3. שלח 65 (bit-0=1)    → rising-edge → ammo=7, reset_hold=150M קלוקים
//   4. המתן 2s             → FPGA מסיים איפוס ומרענן מטריצה
//   5. שלח 66 (bit-0=0)    → falling-edge, סיים סיגנל reset
//   6. עדכן UI → val-b=7, val-c=0
//   7. מחכה להפעלה מחדש (gameActive=false)
//
async function stopAndReset(triggerBtn) {
  isBusy = true;
  const originalText = triggerBtn?.textContent ?? "";
  if (triggerBtn) { triggerBtn.disabled = true; triggerBtn.textContent = "מאפס..."; }

  try {
    // שלב 1: idle
    console.log("RESET 1: send 0 → idle");
    await send(0);
    await sleep(2000);

    // שלב 2: rising-edge → ammo=7
    console.log("RESET 2: send 65 → bit-0=1 → ammo reset to 7");
    await send(65);   // 65 = 0b01000001 → bit-0=1 ✓
    await sleep(2000);

    // שלב 3: falling-edge → סיים סיגנל reset
    console.log("RESET 3: send 66 → bit-0=0 → end reset signal");
    await send(66);   // 66 = 0b01000010 → bit-0=0

    // שלב 4: עדכן UI
    const valB = document.getElementById("val-b");
    const valC = document.getElementById("val-c");
    if (valB) valB.textContent = "7";
    if (valC) valC.textContent = "0";

    gameActive = false;
    setButtonState("idle", "להתחיל משחק");
  } catch (err) {
    console.error("stopAndReset failed:", err);
    setButtonState("active", "סיים משחק");
  } finally {
    isBusy = false;
    if (triggerBtn && triggerBtn !== gameBtn) {
      triggerBtn.disabled    = false;
      triggerBtn.textContent = originalText;
    }
  }
}

// ─── עזר: הוסף click + touchstart לאלמנט ─────────────────────
function addBtn(id, handler) {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener("click",      handler);
  el.addEventListener("touchstart", handler, { passive: false });
}

// ─── כפתור ראשי: התחל / סיים ──────────────────────────────────
if (gameBtn) {
  const handler = async (e) => {
    if (e?.cancelable) e.preventDefault();
    if (isBusy) return;
    if (!gameActive) await startGame();
    else             await stopAndReset(gameBtn);
  };
  gameBtn.addEventListener("click",      handler);
  gameBtn.addEventListener("touchstart", handler, { passive: false });
}

// ─── כפתור "טען מחדש" (reload ammo) ──────────────────────────
addBtn("resetShotsBtn", async (e) => {
  if (e?.cancelable) e.preventDefault();
  if (isBusy) return;
  await stopAndReset(document.getElementById("resetShotsBtn"));
});

// ─── כפתור "איפוס פגיעות" בלבד (ללא איפוס תחמושת) ────────────
addBtn("resetHitsBtn", async (e) => {
  if (e?.cancelable) e.preventDefault();
  if (isBusy) return;
  await send(66);  // שולח 66 בלבד — לא נוגע בbit-0, רק מאפס פגיעות
  const valC = document.getElementById("val-c");
  if (valC) valC.textContent = "0";
});

// ─── האזנה לנתונים מה-FPGA ────────────────────────────────────
onValue(ref(db, "fromAltera"), (snapshot) => {
  if (isBusy) return;  // לא מדרסים UI בזמן איפוס
  const data = snapshot.val();
  if (!data) return;
  const valA = document.getElementById("val-a");
  const valB = document.getElementById("val-b");
  const valC = document.getElementById("val-c");
  if (valA) valA.textContent = (data.A ?? 0) + " CM";
  if (valB) valB.textContent = data.B ?? 0;
  if (valC) valC.textContent = data.C ?? 0;
});

// ─── התנתקות ──────────────────────────────────────────────────
document.getElementById("logoutBtn").onclick = () =>
  signOut(auth).then(() => (window.location.href = "login.html"));