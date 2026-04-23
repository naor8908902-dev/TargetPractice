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
const db = getDatabase(app);
const auth = getAuth(app);

const toAlteraRef = ref(db, "toAltera");
const gameBtn = document.getElementById("gameToggleBtn");
let isBusy = false;     // נועל את הכפתורים בזמן פעולה
let gameActive = false; // מצב המשחק האמיתי

const sleep = ms => new Promise(res => setTimeout(res, ms));

// ─── התחלת משחק ───────────────────────────────────────────────
async function startGame() {
    isBusy = true;
    setButtonState("loading", "מתחיל...");

    try {
        console.log("START: Sending 1 → activate FPGA");
        await set(toAlteraRef, 1);
        await sleep(2000);

        console.log("START: Sending 64 → game active flag");
        await set(toAlteraRef, 64);

        gameActive = true;
        setButtonState("active", "סיים משחק");
    } catch (err) {
        console.error("Start failed:", err);
        setButtonState("idle", "להתחיל משחק");
    } finally {
        isBusy = false;
    }
}

// ─── סיום משחק + איפוס מלא ────────────────────────────────────
async function stopAndReset(btn) {
    isBusy = true;
    const originalText = btn ? btn.textContent : "";
    if (btn) {
        btn.disabled = true;
        btn.textContent = "מאפס...";
    }

    try {
        // שלב 1: כבה את המשחק
        console.log("RESET Step 1: Sending 0 → idle");
        await set(toAlteraRef, 0);
        await sleep(500);

        // שלב 2: שלח סיגנל איפוס תחמושת ל-FPGA
        // ה-FPGA מחכה ל-reset_in = "000001" (ערך עשרוני 1) למשך 2M מחזורים
        console.log("RESET Step 2: Sending 1 → FPGA reset_in=000001 (ammo → 7)");
        await set(toAlteraRef, 1);
        await sleep(2500); // 2.5 שניות להבטחת safe_reset

        // שלב 3: איפוס פגיעות
        console.log("RESET Step 3: Sending 66 → reset hits");
        await set(toAlteraRef, 66);
        const valC = document.getElementById("val-c");
        if (valC) valC.textContent = "0";
        await sleep(2000);

        // שלב 4: חזרה למנוחה
        console.log("RESET Step 4: Sending 0 → final idle");
        await set(toAlteraRef, 0);

        const valB = document.getElementById("val-b");
        if (valB) valB.textContent = "7";

        gameActive = false;
        setButtonState("idle", "להתחיל משחק");
    } catch (err) {
        console.error("Reset failed:", err);
        setButtonState("active", "סיים משחק");
    } finally {
        isBusy = false;
        if (btn && btn !== gameBtn) {
            btn.disabled = false;
            btn.textContent = originalText;
        }
    }
}

// ─── עדכון מראה הכפתור הראשי ──────────────────────────────────
function setButtonState(state, text) {
    if (!gameBtn) return;
    gameBtn.textContent = text;
    gameBtn.disabled = (state === "loading");
    if (state === "active") {
        gameBtn.className = "btn btn-outline-danger game-btn";
    } else if (state === "idle") {
        gameBtn.className = "btn btn-danger game-btn";
    } else {
        gameBtn.className = "btn btn-secondary game-btn";
    }
}

// ─── כפתור ראשי: התחל / סיים ──────────────────────────────────
const handleGameAction = async (e) => {
    if (e && e.cancelable) e.preventDefault();
    if (isBusy) return;

    if (!gameActive) {
        await startGame();
    } else {
        await stopAndReset(gameBtn);
    }
};

if (gameBtn) {
    gameBtn.addEventListener('click', handleGameAction);
    gameBtn.addEventListener('touchstart', handleGameAction, { passive: false });
}

// ─── כפתור "טען מחדש" ─────────────────────────────────────────
const resetShotsBtn = document.getElementById("resetShotsBtn");
if (resetShotsBtn) {
    const handleResetShots = async (e) => {
        if (e && e.cancelable) e.preventDefault();
        if (isBusy) return;
        await stopAndReset(resetShotsBtn);
    };
    resetShotsBtn.addEventListener('click', handleResetShots);
    resetShotsBtn.addEventListener('touchstart', handleResetShots, { passive: false });
}

// ─── כפתור "איפוס פגיעות" ─────────────────────────────────────
const resetHitsBtn = document.getElementById("resetHitsBtn");
if (resetHitsBtn) {
    const handleHits = async (e) => {
        if (e && e.cancelable) e.preventDefault();
        if (isBusy) return;
        await set(toAlteraRef, 66);
        const valC = document.getElementById("val-c");
        if (valC) valC.textContent = "0";
    };
    resetHitsBtn.addEventListener('click', handleHits);
    resetHitsBtn.addEventListener('touchstart', handleHits, { passive: false });
}

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
    signOut(auth).then(() => window.location.href = "login.html");