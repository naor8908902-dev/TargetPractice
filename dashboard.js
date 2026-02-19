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

// פונקציית שינה יציבה שמתאימה גם למובייל
const sleep = ms => new Promise(res => setTimeout(res, ms));

/**
 * פונקציית רצף האיפוס המלאה (0 -> 65 -> 66 -> 0)
 * משתמשת ב-await כדי להבטיח סנכרון מלא מול Firebase
 */
async function runFullResetSequence(btn) {
    isResetting = true;
    if (btn) {
        btn.disabled = true;
        btn.textContent = "מבצע איפוס...";
    }

    try {
        console.log("Step 1: Sending 0");
        await set(toAlteraRef, 0);
        await sleep(2000);

        console.log("Step 2: Sending 65 (Reset Shots)");
        await set(toAlteraRef, 65);
        if (document.getElementById("val-b")) document.getElementById("val-b").textContent = "7";
        await sleep(2000);

        console.log("Step 3: Sending 66 (Reset Hits)");
        await set(toAlteraRef, 66);
        if (document.getElementById("val-c")) document.getElementById("val-c").textContent = "0";
        await sleep(2000);

        console.log("Step 4: Sending Final 0");
        await set(toAlteraRef, 0);
        
    } catch (error) {
        console.error("Sequence failed:", error);
    } finally {
        isResetting = false;
        if (btn) btn.disabled = false;
    }
}

const handleGameAction = async (e) => {
    if (e && e.cancelable) e.preventDefault();
    if (isResetting) return;

    if (gameStatus === 0) {
        // התחלת משחק
        await set(toAlteraRef, 1);
        await sleep(2000);
        await set(toAlteraRef, 64);
    } else {
        // סיום משחק - הפעלת הרצף המשולב
        await runFullResetSequence(gameBtn);
    }
};

// חיבור אירועים לכפתור הראשי (תמיכה במגע לטלפון)
if (gameBtn) {
    gameBtn.addEventListener('click', handleGameAction);
    gameBtn.addEventListener('touchstart', handleGameAction, { passive: false });
}

// עדכון כפתור resetShotsBtn שיבצע גם הוא את הרצף המלא
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

const resetHitsBtn = document.getElementById("resetHitsBtn");
if (resetHitsBtn) {
    const handleHits = (e) => { 
        if (e && e.cancelable) e.preventDefault(); 
        set(toAlteraRef, 66); 
    };
    resetHitsBtn.addEventListener('click', handleHits);
    resetHitsBtn.addEventListener('touchstart', handleHits, { passive: false });
}

onValue(toAlteraRef, (snap) => {
    if (!gameBtn || isResetting) return;
    gameStatus = Number(snap.val());
    const active = (gameStatus === 1 || gameStatus === 64);
    gameBtn.textContent = active ? "סיים משחק" : "להתחיל משחק";
    gameBtn.className = active ? "btn btn-outline-danger game-btn" : "btn btn-danger game-btn";
});

onValue(ref(db, "fromAltera"), (snapshot) => {
    if (isResetting) return;
    const data = snapshot.val();
    if (!data) return;
    if (document.getElementById("val-a")) document.getElementById("val-a").textContent = (data.A ?? 0) + " CM";
    if (document.getElementById("val-b")) document.getElementById("val-b").textContent = data.B ?? 0;
    if (document.getElementById("val-c")) document.getElementById("val-c").textContent = data.C ?? 0;
});

document.getElementById("logoutBtn").onclick = () => signOut(auth).then(() => window.location.href = "login.html");