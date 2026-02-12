import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

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

// Safety listener: if login succeeds, move to dashboard immediately
onAuthStateChanged(auth, (user) => {
    if (user) {
        window.location.replace("dashboard.html");
    }
});

const form = document.getElementById('loginForm');

if (form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const pass = document.getElementById('password').value;
        const btn = document.getElementById('loginBtn');

        btn.disabled = true;
        btn.innerText = "CONNECTING...";

        try {
            await signInWithEmailAndPassword(auth, email, pass);
            // location.replace works better on mobile than .assign or .href
            window.location.replace("dashboard.html");
        } catch (err) {
            btn.disabled = false;
            btn.innerText = "ACCESS SYSTEM";
            alert("Login Failed: " + err.message);
        }
    });
}