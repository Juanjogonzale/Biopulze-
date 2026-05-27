(function () {
  const token = localStorage.getItem("token");
  if (!token) return;

  const btnMenu = document.getElementById("btnUserMenu");
  const panel = document.getElementById("userMenuPanel");
  if (!btnMenu || !panel) return;

  let userData = null;

  function authHeaders() {
    return { "Content-Type": "application/json", "Authorization": "Bearer " + token };
  }

  function showMessage(msg, isError) {
    const el = document.getElementById("userMenuMessage");
    if (el) {
      el.textContent = msg;
      el.style.color = isError ? "#e11" : "#0d9488";
    }
  }

  function showProfileCompleteBanner() {
    if (document.getElementById("profileCompleteBanner")) return;
    const main = document.querySelector("main") || document.body;
    const banner = document.createElement("div");
    banner.id = "profileCompleteBanner";
    banner.className = "profile-complete-banner";
    banner.innerHTML = '<span>Completa tu perfil: indica tu cargo en tu perfil (menú con el icono arriba a la derecha → Editar perfil).</span>';
    main.insertBefore(banner, main.firstChild);
  }

  function hideProfileCompleteBanner() {
    const banner = document.getElementById("profileCompleteBanner");
    if (banner) banner.remove();
  }

  function loadProfile() {
    fetch("https://biopulze.onrender.com/me", { headers: authHeaders() })
      .then((r) => r.json())
      .then((data) => {
        if (data.mensaje && !data.nombre) {
          showMessage(data.mensaje, true);
          return;
        }
        userData = data;
        document.getElementById("userMenuNombre").textContent = data.nombre || "";
        document.getElementById("userMenuCorreo").textContent = data.correo || "";
        document.getElementById("userMenuTelefono").textContent = data.telefono ? "Tel: " + data.telefono : "";
        document.getElementById("userMenuCargo").textContent = data.cargo ? "Cargo: " + data.cargo : "";

        const img = document.getElementById("userMenuAvatar");
        const ph = document.getElementById("userMenuAvatarPlaceholder");
        if (data.imagen_perfil) {
          img.src = data.imagen_perfil;
          img.style.display = "";
          if (ph) ph.style.display = "none";
        } else {
          img.style.display = "none";
          if (ph) {
            ph.style.display = "";
            ph.textContent = (data.nombre || "U").charAt(0).toUpperCase();
          }
        }

        if (data.cargo && data.cargo.trim()) hideProfileCompleteBanner();
      })
      .catch(() => showMessage("Error al cargar perfil", true));
  }

  btnMenu.addEventListener("click", (e) => {
    e.stopPropagation();
    panel.classList.toggle("hidden");
    if (!panel.classList.contains("hidden")) loadProfile();
  });

  document.addEventListener("click", () => panel.classList.add("hidden"));
  panel.addEventListener("click", (e) => e.stopPropagation());

  const btnEdit = document.getElementById("btnUserEdit");
  const form = document.getElementById("userEditForm");
  const btnSave = document.getElementById("btnUserSave");
  const btnCancel = document.getElementById("btnUserCancelEdit");
  const editTelefono = document.getElementById("editTelefono");
  const editCargo = document.getElementById("editCargo");
  const editPassword = document.getElementById("editPassword");
  const editImagen = document.getElementById("editImagen");
  const editImagenPreview = document.getElementById("editImagenPreview");

  if (btnEdit && form) {
    btnEdit.addEventListener("click", () => {
      form.classList.toggle("hidden");
      if (!form.classList.contains("hidden") && userData) {
        if (editTelefono) editTelefono.value = userData.telefono || "";
        if (editCargo) editCargo.value = userData.cargo || "";
        if (editPassword) editPassword.value = "";
        if (editImagen) editImagen.value = "";
        if (editImagenPreview) editImagenPreview.innerHTML = "";
      }
    });
  }

  if (btnCancel && form) {
    btnCancel.addEventListener("click", () => form.classList.add("hidden"));
  }

  let imagenBase64 = null;
  if (editImagen && editImagenPreview) {
    editImagen.addEventListener("change", function () {
      const file = this.files[0];
      editImagenPreview.innerHTML = "";
      imagenBase64 = null;
      if (!file || !file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = function () {
        imagenBase64 = reader.result;
        const img = document.createElement("img");
        img.src = imagenBase64;
        img.style.maxWidth = "80px";
        img.style.maxHeight = "80px";
        img.style.borderRadius = "8px";
        editImagenPreview.appendChild(img);
      };
      reader.readAsDataURL(file);
    });
  }

  if (btnSave) {
    btnSave.addEventListener("click", () => {
      const payload = {};
      if (editTelefono) payload.telefono = editTelefono.value.trim();
      if (editCargo) payload.cargo = editCargo.value.trim();
      if (editPassword && editPassword.value) payload.nuevaPassword = editPassword.value;
      if (imagenBase64) payload.imagen_perfil = imagenBase64;

      if (Object.keys(payload).length === 0) {
        showMessage("Completa al menos un campo", true);
        return;
      }

      fetch("https://biopulze.onrender.com/user/profile", {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify(payload)
      })
        .then((r) => r.json())
        .then((data) => {
          showMessage(data.mensaje || "Guardado", !!data.mensaje && data.mensaje.toLowerCase().includes("error"));
          if (!data.mensaje || data.mensaje.includes("actualizado")) {
            userData = { ...userData, ...payload };
            if (payload.imagen_perfil) userData.imagen_perfil = payload.imagen_perfil;
            form.classList.add("hidden");
            loadProfile();
            if (payload.cargo) hideProfileCompleteBanner();
          }
        })
        .catch(() => showMessage("Error al guardar", true));
    });
  }

  const btnLogout = document.getElementById("btnUserLogout");
  if (btnLogout) {
    btnLogout.addEventListener("click", () => {
      localStorage.removeItem("token");
      window.location.href = "index.html";
    });
  }

  window.userMenuLogout = function () {
    localStorage.removeItem("token");
    window.location.href = "index.html";
  };

  // Al ingresar, si el usuario no tiene cargo, mostrar aviso para completar perfil
  fetch("/me", { headers: authHeaders() })
    .then((r) => r.json())
    .then((data) => {
      if (data.mensaje && !data.nombre) return;
      const cargo = (data.cargo && data.cargo.trim()) || "";
      if (!cargo) showProfileCompleteBanner();
    })
    .catch(() => {});
})();
