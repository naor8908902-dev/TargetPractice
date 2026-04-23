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

let isBusy = false;
let gameActive = false;

const sleep = ms => new Promise(res => setTimeout(res, ms));

// התחלת משחק
async function startGame() {
    isBusy = true;
    try {
        await set(toAlteraRef, 1);
        await sleep(500);
        await set(toAlteraRef, 64);

        gameActive = true;
        setButtonState("active", "סיים משחק");
    } catch {
        setButtonState("idle", "להתחיל משחק");
    } finally {
        isBusy = false;
    }
}

// ✅ RESET מתוקן
async function stopAndReset(btn) {
    isBusy = true;

    try {
        await set(toAlteraRef, 0);
        await sleep(200);

        // 🔥 פולס אמיתי
        await set(toAlteraRef, 1);
        await sleep(100);
        await set(toAlteraRef, 0);

        await sleep(200);

        // reset hits
        await set(toAlteraRef, 66);

        document.getElementById("val-c").textContent = "0";
        document.getElementById("val-b").textContent = "7";

        gameActive = false;
        setButtonState("idle", "להתחיל משחק");

    } catch (err) {
        console.error(err);
    } finally {
        isBusy = false;
    }
}

// UI
function setButtonState(state, text) {
    if (!gameBtn) return;
    gameBtn.textContent = text;
    gameBtn.disabled = (state === "loading");

    if (state === "active") {
        gameBtn.className = "btn btn-outline-danger game-btn";
    } else {
        gameBtn.className = "btn btn-danger game-btn";
    }
}

// כפתור ראשי
const handleGameAction = async (e) => {
    if (e.cancelable) e.preventDefault();
    if (isBusy) return;

    if (!gameActive) await startGame();
    else await stopAndReset(gameBtn);
};

gameBtn?.addEventListener('click', handleGameAction);

// האזנה
onValue(ref(db, "fromAltera"), (snapshot) => {
    if (isBusy) return;
    const data = snapshot.val();
    if (!data) return;

    document.getElementById("val-a").textContent = (data.A ?? 0) + " CM";
    document.getElementById("val-b").textContent = data.B ?? 0;
    document.getElementById("val-c").textContent = data.C ?? 0;
});

// logout
document.getElementById("logoutBtn").onclick = () =>
    signOut(auth).then(() => window.location.href = "login.html");