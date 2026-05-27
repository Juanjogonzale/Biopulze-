const REPORTES_API_URL = "https://biopulze.onrender.com/equipos";
let ultimosReportes = [];

function parseISODate(str) {
  if (!str) return null;
  const d = new Date(str);
  return Number.isNaN(d.getTime()) ? null : d;
}

function fechaEnRango(fechaStr, desdeStr, hastaStr) {
  const f = parseISODate(fechaStr);
  if (!f) return false;

  let desde = desdeStr ? new Date(desdeStr) : null;
  let hasta = hastaStr ? new Date(hastaStr) : null;

  if (desde) desde.setHours(0, 0, 0, 0);
  if (hasta) hasta.setHours(23, 59, 59, 999);

  if (desde && f < desde) return false;
  if (hasta && f > hasta) return false;
  return true;
}

async function cargarReportes() {
  const token = localStorage.getItem("token");
  const tbody = document.getElementById("reportesBody");
  const mensaje = document.getElementById("mensajeReportes");

  const tipo = document.getElementById("filtroTipo").value;
  const desde = document.getElementById("filtroDesde").value;
  const hasta = document.getElementById("filtroHasta").value;

  tbody.innerHTML = "";
  mensaje.innerText = "";

  try {
    const res = await fetch(REPORTES_API_URL, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (sesionExpirada(res)) return;
    if (!res.ok) {
      mensaje.innerText = "No se pudieron obtener los datos";
      return;
    }

    const equipos = await res.json();

    let filtrados = equipos || [];

    // Filtrar por tipo de último mantenimiento
    if (tipo) {
      filtrados = filtrados.filter(
        (e) => e.ultimo_mantenimiento_tipo === tipo
      );
    }

    // Filtrar por rango de fechas usando la fecha de último mantenimiento
    if (desde || hasta) {
      filtrados = filtrados.filter((e) =>
        fechaEnRango(e.ultimo_mantenimiento_fecha, desde, hasta)
      );
    }

    if (filtrados.length === 0) {
      mensaje.innerText = "No hay registros para ese filtro.";
      ultimosReportes = [];
      return;
    }

    ultimosReportes = filtrados;
    mensaje.innerText = "";

    filtrados.forEach((eq) => {
      const card = document.createElement("div");
      card.className = "reporte-card";

      const fmt = (d) => (d ? String(d).slice(0, 10) : "-");

      card.innerHTML = `
        <div class="reporte-card-row"><span class="reporte-label">Equipo</span><span class="reporte-value">${(eq.nombre || "").replace(/</g, "&lt;")}</span></div>
        <div class="reporte-card-row"><span class="reporte-label">Tipo mant.</span><span class="reporte-value">${(eq.ultimo_mantenimiento_tipo || "-").replace(/</g, "&lt;")}</span></div>
        <div class="reporte-card-row"><span class="reporte-label">Fecha último mant.</span><span class="reporte-value">${fmt(eq.ultimo_mantenimiento_fecha)}</span></div>
        <div class="reporte-card-row"><span class="reporte-label">Próximo mant.</span><span class="reporte-value">${fmt(eq.proximo_mantenimiento)}</span></div>
        <div class="reporte-card-row"><span class="reporte-label">Técnico</span><span class="reporte-value">${(eq.ultimo_mantenimiento_tecnico || "-").replace(/</g, "&lt;")}</span></div>
        <div class="reporte-card-row"><span class="reporte-label">Creado por</span><span class="reporte-value">${(eq.creado_por || "-").replace(/</g, "&lt;")}</span></div>
        <div class="reporte-card-row"><span class="reporte-label">Actualizado por</span><span class="reporte-value">${(eq.actualizado_por || "-").replace(/</g, "&lt;")}</span></div>
      `;

      tbody.appendChild(card);
    });
  } catch (error) {
    mensaje.innerText = "Error cargando reportes";
  }
}

function setRangoHoy() {
  const hoy = new Date();
  const y = hoy.getFullYear();
  const m = String(hoy.getMonth() + 1).padStart(2, "0");
  const d = String(hoy.getDate()).padStart(2, "0");
  const hoyLocal = `${y}-${m}-${d}`;
  document.getElementById("filtroDesde").value = hoyLocal;
  document.getElementById("filtroHasta").value = hoyLocal;
}

function setRangoMes() {
  const hoy = new Date();
  const desde = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const hasta = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
  document.getElementById("filtroDesde").value =
    desde.toISOString().slice(0, 10);
  document.getElementById("filtroHasta").value =
    hasta.toISOString().slice(0, 10);
}

function setRangoAnio() {
  const hoy = new Date();
  const desde = new Date(hoy.getFullYear(), 0, 1);
  const hasta = new Date(hoy.getFullYear(), 11, 31);
  document.getElementById("filtroDesde").value =
    desde.toISOString().slice(0, 10);
  document.getElementById("filtroHasta").value =
    hasta.toISOString().slice(0, 10);
}

function descargarCSV() {
  const rows = [];
  const header = [
    "Equipo",
    "Tipo mantenimiento",
    "Fecha último mantenimiento",
    "Próximo mantenimiento",
    "Técnico",
    "Creado por",
    "Actualizado por"
  ];
  rows.push(header.join(","));

  const fmt = (d) => (d ? String(d).slice(0, 10) : "");
  ultimosReportes.forEach((eq) => {
    const cols = [
      eq.nombre || "",
      eq.ultimo_mantenimiento_tipo || "",
      fmt(eq.ultimo_mantenimiento_fecha),
      fmt(eq.proximo_mantenimiento),
      eq.ultimo_mantenimiento_tecnico || "",
      eq.creado_por || "",
      eq.actualizado_por || ""
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`);
    rows.push(cols.join(","));
  });

  const csvContent = rows.join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "reporte_mantenimientos.csv";
  a.click();

  URL.revokeObjectURL(url);
}

document.addEventListener("DOMContentLoaded", () => {
  document
    .getElementById("btnAplicarFiltros")
    .addEventListener("click", cargarReportes);
  document.getElementById("btnHoy").addEventListener("click", () => {
    setRangoHoy();
    cargarReportes();
  });
  document.getElementById("btnMes").addEventListener("click", () => {
    setRangoMes();
    cargarReportes();
  });
  document.getElementById("btnAnio").addEventListener("click", () => {
    setRangoAnio();
    cargarReportes();
  });
  document
    .getElementById("btnDescargarCsv")
    .addEventListener("click", descargarCSV);

  // Cargar datos por defecto (sin filtros)
  cargarReportes();
});

