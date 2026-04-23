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

const app = initializeApp(firebaseConfig);
const db  = getDatabase(app);
const auth = getAuth(app);

const toAlteraRef = ref(db, "toAltera");
const gameBtn     = document.getElementById("gameToggleBtn");

let isBusy     = false;
let gameActive = false;

const sleep = ms => new Promise(res => setTimeout(res, ms));

// ─── עזר: עדכון מראה הכפתור הראשי ────────────────────────────
function setButtonState(state, text) {
  if (!gameBtn) return;
  gameBtn.textContent = text;
  gameBtn.disabled    = (state === "loading");
  gameBtn.className   =
    state === "active"  ? "btn btn-outline-danger game-btn"  :
    state === "idle"    ? "btn btn-danger game-btn"           :
                          "btn btn-secondary game-btn";
}

// ─── עזר: כתוב ערך ל-Firebase ─────────────────────────────────
async function send(value) {
  console.log("→ Firebase:", value, `(0b${value.toString(2).padStart(8,"0")})`);
  await set(toAlteraRef, value);
}

// ─── התחלת משחק ───────────────────────────────────────────────
async function startGame() {
  isBusy = true;
  setButtonState("loading", "מתחיל...");
  try {
    // שלב 1: הפעל FPGA (reset_in[0]=1 → ammo=7)
    // ערך 1 = 0b00000001 → bit-0 HIGH → rising-edge → ammo reset to 7
    await send(1);
    await sleep(3000);   // המתן לRESET_HOLD ב-FPGA (10 ms) + רוחב-פס Firebase

    // שלב 2: עבור למצב משחק פעיל (bit-6=1 → FPGA יודע שמשחק פעיל)
    // ערך 64 = 0b01000000 → bit-0=0 (אין reset), bit-6=1 (game active)
    await send(64);

    gameActive = true;
    setButtonState("active", "סיים משחק");
  } catch (err) {
    console.error("startGame failed:", err);
    setButtonState("idle", "להתחיל משחק");
  } finally {
    isBusy = false;
  }
}

// ─── סיום משחק + איפוס מלא ────────────────────────────────────
//
// סדר הפעולות:
//   1. שלח 0        → FPGA ב-idle, ללא reset
//   2. שלח 1        → bit-0=1: rising-edge → ammo=7 ב-FPGA
//   3. המתן 3 שניות → ה-FPGA מסיים את reset_hold ורענן את המטריצה
//   4. שלח 0        → החזר ל-idle (bit-0 חוזר ל-0, reset_prev ← 0)
//   5. עדכן UI      → val-b=7, val-c=0
//
// שים לב: 66 = 0b01000010 → bit-0=0! לכן בגרסה הישנה ה-FPGA לא ראה reset.
// כאן אנחנו שולחים 1 (0b00000001) בלבד כדי לטרגר את bit-0.
// ──────────────────────────────────────────────────────────────
async function stopAndReset(triggerBtn) {
  isBusy = true;
  const originalText = triggerBtn?.textContent ?? "";
  if (triggerBtn) { triggerBtn.disabled = true; triggerBtn.textContent = "מאפס..."; }

  try {
    // שלב 1: כבה הכל – ודא שFPGA ב-idle ו-reset_prev=0
    await send(0);
    await sleep(600);

    // שלב 2: rising-edge על bit-0 → FPGA מאפס ammo ל-7
    await send(1);   // 1 = 0b00000001 → bit-0=1 ✓
    await sleep(3000); // המתן: reset_hold (500k cycles @ 50MHz ≈ 10ms) + Firebase latency

    // שלב 3: כבה reset – bit-0 חוזר ל-0; reset_prev יעודכן ל-0 בקלוק הבא
    await send(0);
    await sleep(500);

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

// ─── כפתור ראשי: התחל / סיים ──────────────────────────────────
function addClickAndTouch(el, handler) {
  if (!el) return;
  el.addEventListener("click",      handler);
  el.addEventListener("touchstart", handler, { passive: false });
}

addClickAndTouch(gameBtn, async (e) => {
  if (e?.cancelable) e.preventDefault();
  if (isBusy) return;
  if (!gameActive) await startGame();
  else             await stopAndReset(gameBtn);
});

// ─── כפתור "טען מחדש" (reload ammo) ──────────────────────────
addClickAndTouch(document.getElementById("resetShotsBtn"), async (e) => {
  if (e?.cancelable) e.preventDefault();
  if (isBusy) return;
  await stopAndReset(document.getElementById("resetShotsBtn"));
});

// ─── כפתור "איפוס פגיעות" (reset hits counter only) ──────────
addClickAndTouch(document.getElementById("resetHitsBtn"), async (e) => {
  if (e?.cancelable) e.preventDefault();
  if (isBusy) return;
  // פגיעות מנוהלות בצד השרת/לוגיקה אחרת – שולחים 66 כפי שהיה
  await send(66);
  const valC = document.getElementById("val-c");
  if (valC) valC.textContent = "0";
});

// ─── האזנה לנתונים מה-FPGA ────────────────────────────────────
onValue(ref(db, "fromAltera"), (snapshot) => {
  if (isBusy) return;   // אל תדרוס UI בזמן reset
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