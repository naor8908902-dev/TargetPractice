import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

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
const auth = getAuth(app);

const loginForm = document.getElementById('loginForm');

if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const pass = document.getElementById('password').value;
        const btn = document.getElementById('loginBtn');

        // מניעת לחיצות כפולות בנייד
        btn.disabled = true;
        btn.innerText = "LOADING...";

        signInWithEmailAndPassword(auth, email, pass)
            .then(() => {
                // שימוש בנתיב יחסי - וודא ש-dashboard.html באותה תיקייה של דף ה-login
                window.location.href = "./dashboard.html";
            })
            .catch(err => {
                btn.disabled = false;
                btn.innerText = "ACCESS SYSTEM";
                alert("Login Failed: " + err.message);
            });
    });
}