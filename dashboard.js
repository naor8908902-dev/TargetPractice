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

const gameStateRef = ref(db, "toAltera");
const gameBtn = document.getElementById("gameToggleBtn");
const gameStatusText = document.getElementById("gameStatusText");

if (gameBtn) {
    gameBtn.onclick = () => {
        const nextState = gameBtn.textContent.includes("להתחיל") ? 1 : 0;
        set(gameStateRef, nextState).catch(e => console.error(e));
    };
}

onValue(gameStateRef, (snap) => {
    if (!gameBtn || !gameStatusText) return;
    const active = Number(snap.val()) === 1;
    gameBtn.textContent = active ? "סיים משחק" : "להתחיל משחק";
    gameBtn.className = active ? "btn btn-outline-danger game-btn" : "btn btn-danger game-btn";
    gameStatusText.textContent = active ? "סטטוס: משחק פעיל" : "סטטוס: ממתין להתחלה";
});

onValue(ref(db, "fromAltera"), (snapshot) => {
    const data = snapshot.val();
    if (!data) return;

    const valA = data.A ?? 0;
    const elA = document.getElementById("val-a");
    const elB = document.getElementById("val-b");
    const elC = document.getElementById("val-c");
    const boxA = document.getElementById("box-a");
    const statusA = document.getElementById("status-a");

    if (elA) elA.textContent = valA + " CM";
    if (elB) elB.textContent = data.B ?? 0;
    if (elC) elC.textContent = data.C ?? 0;

    if (boxA && statusA) {
        if (valA < 50) {
            boxA.className = "p-4 bg-black border alert-blink";
            statusA.textContent = "קרוב מדי!";
            statusA.className = "mt-2 small text-danger fw-bold";
        } else {
            boxA.className = "p-4 bg-black border border-secondary";
            statusA.textContent = "מרחק בטוח";
            statusA.className = "mt-2 small text-white-50";
        }
    }
});

document.getElementById("resetShotsBtn").onclick = () => set(ref(db, "fromAltera/B"), 7);
document.getElementById("resetHitsBtn").onclick = () => set(ref(db, "fromAltera/C"), 0);
document.getElementById("logoutBtn").onclick = () => signOut(auth).then(() => window.location.href = "login.html");