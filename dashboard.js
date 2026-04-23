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
let isResetting = false;
let gameStatus = 0;

// פונקציית שינה יציבה
const sleep = ms => new Promise(res => setTimeout(res, ms));

/**
 * רצף האיפוס המתוקן:
 * שולח 1 (reset_in = "000001") → ה-FPGA מזהה ומאפס ammo_count ל-7
 * שולח 66 → איפוס פגיעות
 * שולח 0 → חזרה למצב רגיל
 */
async function runFullResetSequence(btn) {
    isResetting = true;
    if (btn) {
        btn.disabled = true;
        btn.textContent = "מבצע איפוס...";
    }

    try {
        // שלב 1: שלח 1 כדי שה-FPGA יזהה reset_in = "000001"
        // ה-FPGA צריך לראות את הערך הזה למשך לפחות 2,000,000 מחזורים (res_timer)
        console.log("Step 1: Sending 1 → FPGA reset_in = 000001");
        await set(toAlteraRef, 1);
        await sleep(2500); // 2.5 שניות — מספיק זמן ל-safe_reset לעלות

        // שלב 2: איפוס פגיעות
        console.log("Step 2: Sending 66 → Reset Hits");
        await set(toAlteraRef, 66);
        if (document.getElementById("val-c"))
            document.getElementById("val-c").textContent = "0";
        await sleep(2000);

        // שלב 3: חזרה למצב רגיל
        console.log("Step 3: Sending 0 → Idle");
        await set(toAlteraRef, 0);

        // עדכון UI ידני לאחר איפוס מוצלח
        if (document.getElementById("val-b"))
            document.getElementById("val-b").textContent = "7";

    } catch (error) {
        console.error("Reset sequence failed:", error);
    } finally {
        isResetting = false;
        if (btn) {
            btn.disabled = false;
            // שחזר טקסט לפי מצב המשחק
            btn.textContent = (gameStatus === 1 || gameStatus === 64)
                ? "סיים משחק"
                : "להתחיל משחק";
        }
    }
}

const handleGameAction = async (e) => {
    if (e && e.cancelable) e.preventDefault();
    if (isResetting) return;

    if (gameStatus === 0) {
        // התחלת משחק — שלח 64 (לא 1 כדי לא להתנגש עם reset)
        await set(toAlteraRef, 64);
    } else {
        // סיום משחק — הפעל רצף איפוס מלא
        await runFullResetSequence(gameBtn);
    }
};

// חיבור אירועים לכפתור הראשי
if (gameBtn) {
    gameBtn.addEventListener('click', handleGameAction);
    gameBtn.addEventListener('touchstart', handleGameAction, { passive: false });
}

// כפתור "טען מחדש" — מבצע את רצף האיפוס המלא
const resetShotsBtn = document.getElementById("resetShotsBtn");
if (resetShotsBtn) {
    const handleResetShots = async (e) => {
        if (e && e.cancelable) e.preventDefault();
        if (isResetting) return;
        await runFullResetSequence(resetShotsBtn);
    };
    resetShotsBtn.addEventListener('click', handleResetShots);
    resetShotsBtn.addEventListener('touchstart', handleResetShots, { passive: false });
}

// כפתור "איפוס פגיעות" — שולח רק 66
const resetHitsBtn = document.getElementById("resetHitsBtn");
if (resetHitsBtn) {
    const handleHits = async (e) => {
        if (e && e.cancelable) e.preventDefault();
        if (isResetting) return;
        await set(toAlteraRef, 66);
        if (document.getElementById("val-c"))
            document.getElementById("val-c").textContent = "0";
    };
    resetHitsBtn.addEventListener('click', handleHits);
    resetHitsBtn.addEventListener('touchstart', handleHits, { passive: false });
}

// האזנה לשינויים ב-toAltera → עדכון כפתור המשחק
onValue(toAlteraRef, (snap) => {
    if (!gameBtn || isResetting) return;
    gameStatus = Number(snap.val());
    const active = (gameStatus === 1 || gameStatus === 64);
    gameBtn.textContent = active ? "סיים משחק" : "להתחיל משחק";
    gameBtn.className = active
        ? "btn btn-outline-danger game-btn"
        : "btn btn-danger game-btn";
});

// האזנה לנתונים מה-FPGA → עדכון UI
onValue(ref(db, "fromAltera"), (snapshot) => {
    if (isResetting) return;
    const data = snapshot.val();
    if (!data) return;
    if (document.getElementById("val-a"))
        document.getElementById("val-a").textContent = (data.A ?? 0) + " CM";
    if (document.getElementById("val-b"))
        document.getElementById("val-b").textContent = data.B ?? 0;
    if (document.getElementById("val-c"))
        document.getElementById("val-c").textContent = data.C ?? 0;
});

// כפתור התנתקות
document.getElementById("logoutBtn").onclick = () =>
    signOut(auth).then(() => window.location.href = "login.html");