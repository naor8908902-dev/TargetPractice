import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

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

document.getElementById('regForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    
    // תיקון ה-ID כדי שיתאים ל-HTML
    const email = document.getElementById('regEmail').value;
    const pass = document.getElementById('regPassword').value;

    createUserWithEmailAndPassword(auth, email, pass)
        .then(() => {
            alert("החשבון נוצר בהצלחה!");
            window.location.href = "login.html";
        })
        .catch((err) => {
            alert("שגיאה ברישום: " + err.message);
        });
});