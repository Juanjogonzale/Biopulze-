const form = document.getElementById("equipoForm");
const API_URL = "https://biopulze.onrender.com/equipos";
const AUDIT_URL = "https://biopulze.onrender.com/audit/equipos";

const tabBtnEquipos = document.getElementById("tabBtnEquipos");
const tabBtnHistorial = document.getElementById("tabBtnHistorial");
const tabEquiposPanel = document.getElementById("tabEquiposPanel");
const tabHistorialPanel = document.getElementById("tabHistorialPanel");
const auditList = document.getElementById("auditList");
const auditMensaje = document.getElementById("auditMensaje");
const btnAuditRefresh = document.getElementById("btnAuditRefresh");

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function fmtFecha(fecha) {
  if (!fecha) return "";
  try {
    return new Date(fecha).toLocaleString("es-ES", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  } catch {
    return String(fecha);
  }
}

function resumenAudit(item) {
  const action = String(item.action || "").toUpperCase();
  const details = item.details || {};

  if (action === "CREATE") {
    const nombre = details?.equipo?.nombre ? `: ${details.equipo.nombre}` : "";
    return `Creó equipo${nombre}`;
  }
  if (action === "UPDATE") {
    const keys = details?.payload ? Object.keys(details.payload).filter((k) => details.payload[k] !== undefined) : [];
    const cambioEstado = details?.cambio_estado ? ` (estado: ${details.cambio_estado.de} → ${details.cambio_estado.a})` : "";
    return `Actualizó (${keys.slice(0, 6).join(", ")}${keys.length > 6 ? ", …" : ""})${cambioEstado}`;
  }
  if (action === "DELETE") {
    const nombre = details?.equipo?.nombre ? `: ${details.equipo.nombre}` : "";
    return `Eliminó equipo${nombre}`;
  }
  return action || "Evento";
}

function setTab(which) {
  const isEquipos = which === "equipos";
  if (tabBtnEquipos) {
    tabBtnEquipos.classList.toggle("active", isEquipos);
    tabBtnEquipos.setAttribute("aria-selected", String(isEquipos));
  }
  if (tabBtnHistorial) {
    tabBtnHistorial.classList.toggle("active", !isEquipos);
    tabBtnHistorial.setAttribute("aria-selected", String(!isEquipos));
  }
  if (tabEquiposPanel) tabEquiposPanel.classList.toggle("hidden", !isEquipos);
  if (tabHistorialPanel) tabHistorialPanel.classList.toggle("hidden", isEquipos);

  if (!isEquipos) cargarHistorial();
}

async function cargarHistorial() {
  if (!auditList || !auditMensaje) return;
  const token = localStorage.getItem("token");

  auditMensaje.textContent = "";
  auditList.innerHTML = "";

  try {
    const res = await fetch(`${AUDIT_URL}?limit=80`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (sesionExpirada(res)) return;
    if (!res.ok) {
      auditMensaje.textContent = "No se pudo cargar el historial.";
      return;
    }

    const rows = await res.json();
    if (!rows || rows.length === 0) {
      auditMensaje.textContent = "Aún no hay movimientos registrados.";
      return;
    }

    rows.forEach((item) => {
      const actor = item.actor_nombre || item.actor_correo || "Usuario";
      const fecha = fmtFecha(item.created_at);
      const equipoId = item.entity_id ? `#${item.entity_id}` : "";
      const texto = resumenAudit(item);

      const row = document.createElement("div");
      row.className = "audit-item";
      row.innerHTML = `
        <div class="audit-item-main">
          <strong>${esc(actor)}</strong>
          <span class="audit-item-action">${esc(texto)} ${equipoId ? `<span class="audit-item-id">${esc(equipoId)}</span>` : ""}</span>
        </div>
        <div class="audit-item-meta">${esc(fecha)}</div>
      `;
      auditList.appendChild(row);
    });
  } catch (e) {
    auditMensaje.textContent = "Error de conexión cargando el historial.";
  }
}

// Enviar nuevo equipo
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const nombre = document.getElementById("nombre").value.trim();
  if (!nombre) {
    document.getElementById("mensaje").innerText = "El nombre del equipo es obligatorio.";
    return;
  }

  const token = localStorage.getItem("token");

  const equipo = {
    nombre,
    marca: document.getElementById("marca").value,
    modelo: document.getElementById("modelo").value,
    ubicacion: document.getElementById("ubicacion").value,
    estado: document.getElementById("estado").value,
    proximo_mantenimiento: document.getElementById("proximo_mantenimiento").value || null,
    ultimo_mantenimiento_fecha: document.getElementById("ultimo_mantenimiento_fecha").value || null,
    ultimo_mantenimiento_tecnico: document.getElementById("ultimo_mantenimiento_tecnico").value || null,
    ultimo_mantenimiento_tipo: document.getElementById("ultimo_mantenimiento_tipo").value || null
  };

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(equipo)
    });

    const data = await response.json();
    if (sesionExpirada(response)) return;
    document.getElementById("mensaje").innerText =
      data.mensaje || "Equipo guardado";
    form.reset();
    setTimeout(() => { document.getElementById("mensaje").innerText = ""; }, 3000);
    cargarEquipos();
    if (tabHistorialPanel && !tabHistorialPanel.classList.contains("hidden")) cargarHistorial();
  } catch (error) {
    document.getElementById("mensaje").innerText = "Error guardando equipo";
  }
});

// Calcular días restantes hasta la fecha indicada
function calcularDiasRestantes(fechaStr) {
  if (!fechaStr) return "-";

  const hoy = new Date();
  const objetivo = new Date(fechaStr);

  // Normalizar a medianoche para evitar desfases por hora
  hoy.setHours(0, 0, 0, 0);
  objetivo.setHours(0, 0, 0, 0);

  const diffMs = objetivo.getTime() - hoy.getTime();
  const dias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (Number.isNaN(dias)) return "-";

  return dias >= 0 ? `${dias} días` : `${Math.abs(dias)} días vencido`;
}

// Cargar y pintar equipos en la tabla
async function cargarEquipos() {
  const tbody = document.getElementById("equiposBody");
  const mensajeTabla = document.getElementById("mensajeTabla");
  const token = localStorage.getItem("token");

  tbody.innerHTML = "";
  mensajeTabla.innerText = "";

  try {
    const res = await fetch(API_URL, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (sesionExpirada(res)) return;
    if (!res.ok) {
      mensajeTabla.innerText = "No se pudieron cargar los equipos";
      return;
    }
    const equipos = await res.json();

    if (!equipos || equipos.length === 0) {
      mensajeTabla.innerText = "No hay equipos registrados todavía.";
      return;
    }

    equipos.forEach((equipo) => {
      const card = document.createElement("div");
      card.className = "equipo-card";

      const fechaProx = equipo.proximo_mantenimiento
        ? String(equipo.proximo_mantenimiento).slice(0, 10)
        : "";
      const fechaUlt = equipo.ultimo_mantenimiento_fecha
        ? String(equipo.ultimo_mantenimiento_fecha).slice(0, 10)
        : "";
      const cambioFecha = equipo.ultimo_cambio_fecha
        ? new Date(equipo.ultimo_cambio_fecha).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" })
        : "";
      const textoCambio = cambioFecha && equipo.ultimo_cambio_estado
        ? `Cambio a ${esc(equipo.ultimo_cambio_estado)} el ${cambioFecha}`
        : "";

      card.innerHTML = `
        ${textoCambio ? `<div class="equipo-cambio-estado"><span class="equipo-cambio-texto">${textoCambio}</span></div>` : ""}
        <div class="equipo-card-row"><label>Nombre</label><input type="text" data-field="nombre" value="${esc(equipo.nombre || "")}"></div>
        <div class="equipo-card-row"><label>Marca</label><input type="text" data-field="marca" value="${esc(equipo.marca || "")}"></div>
        <div class="equipo-card-row"><label>Modelo</label><input type="text" data-field="modelo" value="${esc(equipo.modelo || "")}"></div>
        <div class="equipo-card-row"><label>Ubicación</label><input type="text" data-field="ubicacion" value="${esc(equipo.ubicacion || "")}"></div>
        <div class="equipo-card-row"><label>Estado</label>
          <select data-field="estado">
            <option value="Operativo" ${equipo.estado === "Operativo" ? "selected" : ""}>Operativo</option>
            <option value="Mantenimiento" ${equipo.estado === "Mantenimiento" ? "selected" : ""}>Mantenimiento</option>
            <option value="Fuera de Servicio" ${equipo.estado === "Fuera de Servicio" ? "selected" : ""}>Fuera de Servicio</option>
          </select>
        </div>
        <div class="equipo-card-row"><label>Próximo mant.</label><input type="date" data-field="proximo_mantenimiento" value="${esc(fechaProx)}"></div>
        <div class="equipo-card-row"><label>Días restantes</label><span data-dias></span></div>
        <div class="equipo-card-row"><label>Último mant. (fecha)</label><input type="date" data-field="ultimo_mantenimiento_fecha" value="${esc(fechaUlt)}"></div>
        <div class="equipo-card-row"><label>Técnico</label><input type="text" data-field="ultimo_mantenimiento_tecnico" value="${esc(equipo.ultimo_mantenimiento_tecnico || "")}"></div>
        <div class="equipo-card-row"><label>Tipo mant.</label>
          <select data-field="ultimo_mantenimiento_tipo">
            <option value="">Seleccionar</option>
            <option value="Preventivo" ${equipo.ultimo_mantenimiento_tipo === "Preventivo" ? "selected" : ""}>Preventivo</option>
            <option value="Correctivo" ${equipo.ultimo_mantenimiento_tipo === "Correctivo" ? "selected" : ""}>Correctivo</option>
            <option value="Calibración" ${equipo.ultimo_mantenimiento_tipo === "Calibración" ? "selected" : ""}>Calibración</option>
            <option value="Otro" ${equipo.ultimo_mantenimiento_tipo === "Otro" ? "selected" : ""}>Otro</option>
          </select>
        </div>
        <div class="equipo-card-actions">
          <button type="button" class="btn-guardar-equipo">Guardar</button>
          <button type="button" class="btn-borrar-equipo">Borrar</button>
        </div>
      `;

      const getVal = (field) => {
        const el = card.querySelector(`[data-field="${field}"]`);
        return el ? el.value : null;
      };
      const inputProximo = card.querySelector('[data-field="proximo_mantenimiento"]');
      const spanDias = card.querySelector("[data-dias]");
      const actualizarDias = () => {
        spanDias.textContent = calcularDiasRestantes(inputProximo ? inputProximo.value : "");
      };
      actualizarDias();
      if (inputProximo) inputProximo.addEventListener("change", actualizarDias);

      card.querySelector(".btn-guardar-equipo").addEventListener("click", async () => {
        await actualizarEquipo(equipo.id, {
          nombre: getVal("nombre"),
          marca: getVal("marca"),
          modelo: getVal("modelo"),
          ubicacion: getVal("ubicacion"),
          estado: getVal("estado"),
          proximo_mantenimiento: getVal("proximo_mantenimiento") || null,
          ultimo_mantenimiento_fecha: getVal("ultimo_mantenimiento_fecha") || null,
          ultimo_mantenimiento_tecnico: getVal("ultimo_mantenimiento_tecnico") || null,
          ultimo_mantenimiento_tipo: getVal("ultimo_mantenimiento_tipo") || null
        });
      });

      card.querySelector(".btn-borrar-equipo").addEventListener("click", async () => {
        if (confirm("¿Seguro que deseas eliminar este equipo?")) {
          await eliminarEquipo(equipo.id);
        }
      });

      tbody.appendChild(card);
    });
  } catch (error) {
    mensajeTabla.innerText = "Error al cargar los equipos";
  }
}

// Llamada a la API para actualizar equipo
async function actualizarEquipo(id, datos) {
  const token = localStorage.getItem("token");
  const mensajeTabla = document.getElementById("mensajeTabla");

  try {
    const res = await fetch(`${API_URL}/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(datos)
    });

    const data = await res.json();
    if (sesionExpirada(res)) return;
    if (!res.ok) {
      mensajeTabla.innerText = data.mensaje || "Error actualizando equipo";
      return;
    }
    mensajeTabla.innerText = data.mensaje || "Equipo actualizado";
    cargarEquipos();
    if (tabHistorialPanel && !tabHistorialPanel.classList.contains("hidden")) cargarHistorial();
  } catch (error) {
    mensajeTabla.innerText = "Error al actualizar equipo";
  }
}

// Eliminar equipo
async function eliminarEquipo(id) {
  const token = localStorage.getItem("token");
  const mensajeTabla = document.getElementById("mensajeTabla");

  try {
    const res = await fetch(`${API_URL}/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await res.json();
    if (sesionExpirada(res)) return;
    if (!res.ok) {
      mensajeTabla.innerText = data.mensaje || "Error eliminando equipo";
      return;
    }
    mensajeTabla.innerText = data.mensaje || "Equipo eliminado";
    cargarEquipos();
    if (tabHistorialPanel && !tabHistorialPanel.classList.contains("hidden")) cargarHistorial();
  } catch (error) {
    mensajeTabla.innerText = "Error al eliminar equipo";
  }
}

// Cargar equipos al abrir la página
document.addEventListener("DOMContentLoaded", () => {
  cargarEquipos();
  if (tabBtnEquipos) tabBtnEquipos.addEventListener("click", () => setTab("equipos"));
  if (tabBtnHistorial) tabBtnHistorial.addEventListener("click", () => setTab("historial"));
  if (btnAuditRefresh) btnAuditRefresh.addEventListener("click", cargarHistorial);
});