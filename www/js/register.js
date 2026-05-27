const registerForm = document.getElementById("registerForm");
const verifyForm = document.getElementById("verifyForm");
const messageEl = document.getElementById("message");

let correoPendiente = null;

registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const cargo = document.getElementById("cargo").value.trim();
  const password = document.getElementById("password").value;

  if (!cargo) {
    messageEl.innerText = "El cargo es obligatorio.";
    return;
  }

  if (password.length < 8) {
    messageEl.innerText = "La contraseña debe tener al menos 8 caracteres.";
    return;
  }

  try {
    const res = await fetch("https://biopulze.onrender.com/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        nombre: name,
        correo: email,
        telefono: phone,
        cargo: cargo,
        password: password
      })
    });

    const data = await res.json();
    messageEl.innerText = data.mensaje || "";
    if (typeof showToast === "function") {
      if (res.ok && data.requiere2FA) showToast(data.mensaje || "Revisa tu correo.", "success");
      else if (!res.ok) showToast(data.mensaje || "Error.", "error");
    }
    if (res.ok && data.requiere2FA) {
      correoPendiente = email;
      registerForm.style.display = "none";
      verifyForm.style.display = "block";
      const verifyMsg = document.getElementById("verifyMessage");
      if (verifyMsg) verifyMsg.textContent = data.mensaje || "Ingresa el código para activar tu cuenta.";
      iniciarCuentaAtrasResend();
    }
  } catch (error) {
    messageEl.innerText = "Error de conexión";
  }
});

function iniciarCuentaAtrasResend() {
  const btn = document.getElementById("btnResendCode");
  const span = document.getElementById("countdown");
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

document.getElementById("btnResendCode")?.addEventListener("click", async () => {
  if (!correoPendiente) return;
  const btn = document.getElementById("btnResendCode");
  const span = document.getElementById("countdown");
  btn.disabled = true;
  btn.textContent = "Enviando...";
  try {
    const res = await fetch("https://biopulze.onrender.com/register/resend-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ correo: correoPendiente })
    });
    const data = await res.json();
    messageEl.innerText = data.mensaje || "";
    if (typeof showToast === "function") {
      if (res.ok) showToast(data.mensaje || "Código reenviado.", "success");
      else showToast(data.mensaje || "Error.", "error");
    }
    btn.innerHTML = 'Volver a enviar código (<span id="countdown">10</span>s)';
    btn.disabled = true;
    iniciarCuentaAtrasResend();
  } catch (e) {
    messageEl.innerText = "Error de conexión";
    btn.disabled = false;
    btn.textContent = "Volver a enviar código";
  }
});

verifyForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const codigo = document.getElementById("codigo").value;

  if (!correoPendiente) {
    messageEl.innerText = "No hay registro pendiente de verificación.";
    return;
  }

  try {
    const res = await fetch("https://biopulze.onrender.com/register/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        correo: correoPendiente,
        codigo
      })
    });

    const data = await res.json();
    messageEl.innerText = data.mensaje || "";
    if (typeof showToast === "function") {
      if (res.ok && data.token) showToast("Cuenta activada correctamente.", "success");
      else if (!res.ok) showToast(data.mensaje || "Error.", "error");
    }
    if (res.ok && data.token) {
      localStorage.setItem("token", data.token);
      window.location.href = "dashboard.html";
    }
  } catch (error) {
    messageEl.innerText = "Error de conexión";
    if (typeof showToast === "function") showToast("Error de conexión", "error");
  }
});
