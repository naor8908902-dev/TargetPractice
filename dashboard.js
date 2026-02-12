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

function toBit(v, fallback = 0) {
  const n = Number(v);
  return (n === 0 || n === 1) ? n : fallback;
}

const gameStateRef = ref(db, "toAltera");
let gameRunning = false;
const gameBtn = document.getElementById("gameToggleBtn");
const gameStatusText = document.getElementById("gameStatusText");

function updateGameUI() {
  if (!gameBtn) return;
  gameBtn.textContent = gameRunning ? "סיים משחק" : "להתחיל משחק";
  gameBtn.className = gameRunning ? "btn btn-outline-danger game-btn" : "btn btn-danger game-btn";
  if (gameStatusText) gameStatusText.textContent = gameRunning ? "מצב: משחק פעיל" : "מצב: ממתין להתחלה";
}

if (gameBtn) {
  gameBtn.onclick = async () => {
    const nextState = gameRunning ? 0 : 1;
    try {
      await set(gameStateRef, nextState);
    } catch (e) { console.error("Update failed", e); }
  };
}

onValue(gameStateRef, (snap) => {
  gameRunning = (Number(snap.val()) === 1);
  updateGameUI();
});

let shotCount = 7; 
let hitCount = 0;
let lastB = 0;
let lastC = 1;
let lastData = null;

function render(data) {
  const container = document.getElementById("data-container");
  if (!container || !data) return;

  const A = Number(data.A);
  const isTooClose = A < 50;

  container.innerHTML = `
    <div class="col-12 col-md-4">
      <div class="p-4 bg-black border ${isTooClose ? "alert-blink" : "border-secondary"}">
        <div class="stat-label text-danger fw-bold mb-2">PROXIMITY ALERT (A)</div>
        <h2 class="display-5 text-white fw-black m-0">${A} cm</h2>
        <div class="mt-2 small ${isTooClose ? "text-danger fw-bold" : "text-white-50"}">${isTooClose ? "TOO CLOSE!" : "SAFE DISTANCE"}</div>
      </div>
    </div>
    <div class="col-12 col-md-4">
      <div class="p-4 bg-black border border-secondary">
        <div class="stat-label text-danger fw-bold mb-2">AMMO REMAINING (B)</div>
        <h2 class="display-5 text-white fw-black m-0">${shotCount}</h2>
        <button id="resetShotsBtn" class="btn btn-outline-danger btn-sm mt-3 w-100">RELOAD (7)</button>
      </div>
    </div>
    <div class="col-12 col-md-4">
      <div class="p-4 bg-black border border-secondary">
        <div class="stat-label text-danger fw-bold mb-2">TOTAL TARGET HITS (C)</div>
        <h2 class="display-5 text-white fw-black m-0">${hitCount}</h2>
        <button id="resetHitsBtn" class="btn btn-outline-danger btn-sm mt-3 w-100">RESET HITS</button>
      </div>
    </div>
  `;

  document.getElementById("resetShotsBtn").onclick = () => { shotCount = 7; render(lastData); };
  document.getElementById("resetHitsBtn").onclick = () => { hitCount = 0; render(lastData); };
}

onValue(ref(db, "fromAltera"), (snapshot) => {
  const data = snapshot.val();
  if (!data) return;
  lastData = data;
  const b = toBit(data.B, lastB);
  const c = toBit(data.C, lastC);

  if (b === 1 && lastB === 0 && shotCount > 0) shotCount--;
  if (c === 0 && lastC === 1) hitCount++;
  
  lastB = b;
  lastC = c;
  render(data);
});

document.getElementById("logoutBtn")?.addEventListener("click", () => {
  signOut(auth).then(() => { window.location.href = "login.html"; });
});