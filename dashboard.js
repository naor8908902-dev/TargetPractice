import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, onValue, set, get } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
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

// ─── שליחה אמינה ──────────────────────────────────────────────
// הבעיה: Firebase יכול לדרוס ערך לפני שה-FPGA קרא אותו,
// או לא לשלוח event אם הערך זהה לקודם.
// הפתרון:
//   1. אם הערך הנוכחי זהה למה שרוצים לשלוח → שלח קודם 0 (כדי לאלץ שינוי)
//   2. שלח את הערך האמיתי
//   3. המתן שה-FPGA יעבד
//   4. שלח שוב (double-confirm) למקרה שהראשון לא נקרא
async function sendReliable(value, waitMs = 1500) {
  console.log(`→ sendReliable(${value})`);

  // אם הערך הנוכחי ב-Firebase זהה → אלץ שינוי דרך 0
  const snap = await get(toAlteraRef);
  if (snap.val() === value) {
    console.log(`  Same value detected (${value}), sending 0 first to force edge`);
    await set(toAlteraRef, 0);
    await sleep(300);
  }

  // שליחה ראשונה
  await set(toAlteraRef, value);
  await sleep(waitMs);

  // שליחה שנייה (double-confirm) — אם הFPGA החמיץ את הראשונה
  // מאלצים edge: 0 → value שוב
  await set(toAlteraRef, 0);
  await sleep(300);
  await set(toAlteraRef, value);
  await sleep(waitMs);

  console.log(`  sendReliable(${value}) done`);
}

function setButtonState(state, text) {
  if (!gameBtn) return;
  gameBtn.textContent = text;
  gameBtn.disabled    = (state === "loading");
  gameBtn.className   =
    state === "active" ? "btn btn-outline-danger game-btn" :
    state === "idle"   ? "btn btn-danger game-btn"         :
                         "btn btn-secondary game-btn";
}

// ─── התחלת משחק: 1 → 64 ───────────────────────────────────────
async function startGame() {
  isBusy = true;
  setButtonState("loading", "מתחיל...");
  try {
    console.log("START: send 1 → activate FPGA");
    await sendReliable(1, 1500);

    console.log("START: send 64 → game active");
    await set(toAlteraRef, 64);

    gameActive = true;
    setButtonState("active", "סיים משחק");
  } catch (err) {
    console.error("startGame failed:", err);
    setButtonState("idle", "להתחיל משחק");
  } finally {
    isBusy = false;
  }
}

// ─── סיום / איפוס: 0 → 65 → 66 ───────────────────────────────
// כל פקודה נשלחת דרך sendReliable שמבטיחה שה-FPGA רואה את ה-edge
async function stopAndReset(triggerBtn) {
  isBusy = true;
  const originalText = triggerBtn?.textContent ?? "";
  if (triggerBtn) { triggerBtn.disabled = true; triggerBtn.textContent = "מאפס..."; }

  try {
    // שלב 1: idle — עצור הכל
    console.log("RESET 1: send 0 → idle");
    await set(toAlteraRef, 0);
    await sleep(1000);

    // שלב 2: איפוס תחמושת (bit-0=1 → rising edge → ammo=7)
    // sendReliable מבטיח שה-FPGA רואה את ה-edge גם אם הרשת עיכבה
    console.log("RESET 2: send 65 (bit-0=1) → ammo reset to 7");
    await sendReliable(65, 2000);

    // שלב 3: סיום סיגנל reset (bit-0=0 → falling edge)
    console.log("RESET 3: send 66 (bit-0=0) → end reset");
    await set(toAlteraRef, 66);
    await sleep(500);

    // שלב 4: חזרה ל-idle מוחלט
    console.log("RESET 4: send 0 → final idle");
    await set(toAlteraRef, 0);

    // עדכון UI
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

function addBtn(id, handler) {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener("click",      handler);
  el.addEventListener("touchstart", handler, { passive: false });
}

// ─── כפתורים ──────────────────────────────────────────────────
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

addBtn("resetShotsBtn", async (e) => {
  if (e?.cancelable) e.preventDefault();
  if (isBusy) return;
  await stopAndReset(document.getElementById("resetShotsBtn"));
});

addBtn("resetHitsBtn", async (e) => {
  if (e?.cancelable) e.preventDefault();
  if (isBusy) return;
  // איפוס פגיעות בלבד — שלח 66 אמין
  await sendReliable(66, 500);
  const valC = document.getElementById("val-c");
  if (valC) valC.textContent = "0";
});

// ─── האזנה לנתונים מה-FPGA ────────────────────────────────────
onValue(ref(db, "fromAltera"), (snapshot) => {
  if (isBusy) return;
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