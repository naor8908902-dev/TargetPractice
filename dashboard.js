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
  if (n === 0 || n === 1) return n;
  return fallback;
}

const gameStateRef = ref(db, "toAltera");
let gameRunning = false;
const gameBtn = document.getElementById("gameToggleBtn");
const gameStatusText = document.getElementById("gameStatusText");

function updateGameUI() {
  if (!gameBtn) return;
  if (gameRunning) {
    gameBtn.textContent = "סיים משחק";
    gameBtn.classList.remove("btn-danger");
    gameBtn.classList.add("btn-outline-danger");
    if (gameStatusText) gameStatusText.textContent = "מצב: משחק פעיל";
  } else {
    gameBtn.textContent = "להתחיל משחק";
    gameBtn.classList.remove("btn-outline-danger");
    gameBtn.classList.add("btn-danger");
    if (gameStatusText) gameStatusText.textContent = "מצב: ממתין להתחלה";
  }
}

if (gameBtn) {
  gameBtn.onclick = async () => {
    gameRunning = !gameRunning;
    const valueToSend = gameRunning ? 1 : 0;
    try {
      await set(gameStateRef, valueToSend);
      updateGameUI();
    } catch (e) {
      gameRunning = !gameRunning;
      updateGameUI();
    }
  };
}

onValue(gameStateRef, (snap) => {
  const v = Number(snap.val());
  if (v === 0 || v === 1) {
    gameRunning = (v === 1);
    updateGameUI();
  }
});

// לוגיקה חדשה: יריות מתחילות ב-7, פגיעות ב-0
let shotCount = 7; 
let hitCount = 0;
let lastB = 0;
let lastC = 1; // Start at 1 so if it stays 1 it doesn't count, only when it drops to 0
let lastData = null;

function render(data) {
  const container = document.getElementById("data-container");
  if (!container || !data) return;

  const A = Number(data.A);
  const isTooClose = A < 50;

  container.innerHTML = `
    <div class="col-md-4">
      <div class="p-4 bg-black border ${isTooClose ? "alert-blink" : "border-secondary"}">
        <div class="stat-label text-danger fw-bold mb-2">PROXIMITY ALERT (A)</div>
        <h2 class="display-5 text-white fw-black m-0">${A} cm</h2>
        <div class="mt-2 small ${isTooClose ? "text-danger fw-bold" : "text-white-50"}">
          ${isTooClose ? "TOO CLOSE!" : "SAFE DISTANCE"}
        </div>
      </div>
    </div>

    <div class="col-md-4">
      <div class="p-4 bg-black border border-secondary">
        <div class="stat-label text-danger fw-bold mb-2">AMMO REMAINING (B)</div>
        <h2 class="display-5 text-white fw-black m-0">${shotCount}</h2>
        <div class="mt-2 small text-white-50 mb-3">COUNTDOWN TO 0</div>
        <button id="resetShotsBtn" class="btn btn-outline-danger btn-sm rounded-0 px-4">RELOAD (7)</button>
      </div>
    </div>

    <div class="col-md-4">
      <div class="p-4 bg-black border border-secondary">
        <div class="stat-label text-danger fw-bold mb-2">TOTAL TARGET HITS (C)</div>
        <h2 class="display-5 text-white fw-black m-0">${hitCount}</h2>
        <div class="mt-2 small text-white-50 mb-3">FALLING EDGE 1→0</div>
        <button id="resetHitsBtn" class="btn btn-outline-danger btn-sm rounded-0 px-4">RESET HITS</button>
      </div>
    </div>
  `;

  document.getElementById("resetShotsBtn").onclick = () => {
    shotCount = 7;
    lastB = toBit(lastData?.B, lastB);
    render(lastData);
  };

  document.getElementById("resetHitsBtn").onclick = () => {
    hitCount = 0;
    lastC = toBit(lastData?.C, lastC);
    render(lastData);
  };
}

const alteraRef = ref(db, "fromAltera");
onValue(alteraRef, (snapshot) => {
  const data = snapshot.val();
  if (!data) return;
  lastData = data;

  const b = toBit(data.B, lastB);
  const c = toBit(data.C, lastC);

  // ירידה בכמות היריות עד 0 (Rising Edge Logic for Button)
  if (b === 1 && lastB === 0 && shotCount > 0) {
    shotCount--;
  }
  lastB = b;

  // === NEW LOGIC: Target Hit on Falling Edge (1 -> 0) ===
  if (c === 0 && lastC === 1) {
    hitCount++;
  }
  lastC = c;

  render(data);
});

document.getElementById("logoutBtn")?.addEventListener("click", () => {
  signOut(auth).then(() => {
    window.location.href = "login.html";
  });
});