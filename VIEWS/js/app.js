document.addEventListener("DOMContentLoaded", () => {

    const API_URL = "https://biopulze.onrender.com";

    const homeCard = document.getElementById("homeCard");
    const loginCard = document.getElementById("loginCard");
    const registerCard = document.getElementById("registerCard");

    // BOTONES NAVBAR
    document.getElementById("btnLogin").addEventListener("click", () => {
        homeCard.classList.add("hidden");
        registerCard.classList.add("hidden");
        loginCard.classList.remove("hidden");
    });

    document.getElementById("btnRegister").addEventListener("click", () => {
        homeCard.classList.add("hidden");
        loginCard.classList.add("hidden");
        registerCard.classList.remove("hidden");
    });

    // BOTONES VOLVER
    document.getElementById("backFromLogin").addEventListener("click", () => {
        loginCard.classList.add("hidden");
        homeCard.classList.remove("hidden");
    });

    document.getElementById("backFromRegister").addEventListener("click", () => {
        registerCard.classList.add("hidden");
        homeCard.classList.remove("hidden");
    });

    // REGISTER
    document.getElementById("registerForm").addEventListener("submit", async (e) => {
        e.preventDefault();

        const name = document.getElementById("registerName").value;
        const email = document.getElementById("registerEmail").value;
        const password = document.getElementById("registerPassword").value;

        const response = await fetch(`${API_URL}/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, password })
        });

        const data = await response.json();

        if (response.ok) {
            document.getElementById("registerMessage").innerText = "Cuenta creada ✅";
        } else {
            document.getElementById("registerMessage").innerText = data.message;
        }
    });

    // LOGIN
    document.getElementById("loginForm").addEventListener("submit", async (e) => {
        e.preventDefault();

        const email = document.getElementById("loginEmail").value;
        const password = document.getElementById("loginPassword").value;

        const response = await fetch(`${API_URL}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem("token", data.token);
            document.getElementById("loginMessage").innerText = "Login exitoso ✅";
        } else {
            document.getElementById("loginMessage").innerText = data.message;
        }
    });
    const token = localStorage.getItem("token");

if(token){
    document.querySelector(".auth-buttons").style.display = "none";
}
function logout(){
    localStorage.removeItem("token");
    window.location.href = "index.html";
}


});
