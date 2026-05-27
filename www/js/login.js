const loginForm = document.getElementById("loginForm");
const loginVerifyForm = document.getElementById("loginVerifyForm");
const forgotForm = document.getElementById("forgotForm");
const resetForm = document.getElementById("resetForm");
const loginMessage = document.getElementById("message");
const linkOlvide = document.getElementById("linkOlvide");
const linkVolver = document.getElementById("linkVolver");

let loginCorreoPendiente = null;
let resetCorreoPendiente = null;

function showForm(form) {
  loginForm.style.display = form === "login" ? "block" : "none";
  loginVerifyForm.style.display = form === "verify" ? "block" : "none";
  forgotForm.style.display = form === "forgot" ? "block" : "none";
  resetForm.style.display = form === "reset" ? "block" : "none";
  linkVolver.style.display = form === "login" || form === "verify" ? "inline-block" : "inline-block";
  linkVolver.textContent = form === "forgot" || form === "reset" ? "Volver al inicio de sesión" : "Volver";
  if (form !== "reset") loginMessage.innerText = "";
}

linkOlvide.addEventListener("click", (e) => {
  e.preventDefault();
  showForm("forgot");
});

linkVolver.addEventListener("click", (e) => {
  if (linkVolver.textContent.includes("inicio de sesión")) {
    e.preventDefault();
    showForm("login");
  }
});

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    const res = await fetch("https://biopulze.onrender.com/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        correo: email,
        password: password
      })
    });

    const data = await res.json();
    loginMessage.innerText = data.mensaje || "";
    if (typeof showToast === "function") {
      if (res.ok && data.requiere2FA) showToast(data.mensaje || "Revisa tu correo.", "success");
      else if (!res.ok) showToast(data.mensaje || "Error.", "error");
    }
    if (res.ok && data.requiere2FA) {
      loginCorreoPendiente = email;
      loginForm.style.display = "none";
      loginVerifyForm.style.display = "block";
      iniciarCuentaAtrasResendLogin();
    }
  } catch (error) {
    loginMessage.innerText = "Error de conexión";
  }
});

loginVerifyForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const codigo = document.getElementById("loginCodigo").value;

  if (!loginCorreoPendiente) {
    loginMessage.innerText = "No hay inicio de sesión pendiente de verificación.";
    return;
  }

  try {
    const res = await fetch("https://biopulze.onrender.com/login/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        correo: loginCorreoPendiente,
        codigo
      })
    });

    const data = await res.json();
    loginMessage.innerText = data.mensaje || "";
    if (typeof showToast === "function") {
      if (res.ok && data.token) showToast("Inicio de sesión exitoso.", "success");
      else if (!res.ok) showToast(data.mensaje || "Error.", "error");
    }
    if (res.ok && data.token) {
      localStorage.setItem("token", data.token);
      window.location.href = "dashboard.html";
    }
  } catch (error) {
    loginMessage.innerText = "Error de conexión";
    if (typeof showToast === "function") showToast("Error de conexión", "error");
  }
});

forgotForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("forgotEmail").value.trim();
  if (!email) {
    loginMessage.innerText = "Ingresa tu correo.";
    return;
  }
  try {
    const res = await fetch("https://biopulze.onrender.com/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ correo: email })
    });
    const data = await res.json();
    loginMessage.innerText = data.mensaje || "";
    if (res.ok) {
      resetCorreoPendiente = email;
      showForm("reset");
      loginMessage.innerText = data.mensaje || "Revisa tu correo e ingresa el código y tu nueva contraseña.";
    }
  } catch (err) {
    loginMessage.innerText = "Error de conexión";
  }
});

resetForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const codigo = document.getElementById("resetCodigo").value.trim();
  const nuevaPassword = document.getElementById("resetPassword").value;
  if (!resetCorreoPendiente) {
    loginMessage.innerText = "Solicita primero un código a tu correo.";
    return;
  }
  if (nuevaPassword.length < 8) {
    loginMessage.innerText = "La contraseña debe tener al menos 8 caracteres.";
    return;
  }
  try {
    const res = await fetch("https://biopulze.onrender.com/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        correo: resetCorreoPendiente,
        codigo,
        nuevaPassword
      })
    });
    const data = await res.json();
    loginMessage.innerText = data.mensaje || "";
    if (res.ok) {
      resetCorreoPendiente = null;
      showForm("login");
      loginMessage.innerText = data.mensaje || "Contraseña actualizada. Ya puedes iniciar sesión.";
    }
  } catch (err) {
    loginMessage.innerText = "Error de conexión";
  }
});

function iniciarCuentaAtrasResendLogin() {
  const btn = document.getElementById("btnLoginResendCode");
  const span = document.getElementById("loginCountdown");
  if (!btn || !span) return;
  btn.disabled = true;
  let seg = 10;
  const id = setInterval(() => {
    seg--;
    span.textContent = seg;
    if (seg <= 0) {
      clearInterval(id);
      btn.disabled = false;
      span.textContent = "";
      btn.textContent = "Volver a enviar código";
    }
  }, 1000);
}

document.getElementById("btnLoginResendCode")?.addEventListener("click", async () => {
  if (!loginCorreoPendiente) return;
  const btn = document.getElementById("btnLoginResendCode");
  btn.disabled = true;
  btn.textContent = "Enviando...";
  try {
    const res = await fetch("https://biopulze.onrender.com/login/resend-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ correo: loginCorreoPendiente })
    });
    const data = await res.json();
    loginMessage.innerText = data.mensaje || "";
    if (typeof showToast === "function") {
      if (res.ok) showToast(data.mensaje || "Código reenviado.", "success");
      else showToast(data.mensaje || "Error.", "error");
    }
    btn.innerHTML = 'Volver a enviar código (<span id="loginCountdown">10</span>s)';
    btn.disabled = true;
    iniciarCuentaAtrasResendLogin();
  } catch (e) {
    loginMessage.innerText = "Error de conexión";
    btn.disabled = false;
    btn.textContent = "Volver a enviar código";
  }
});
