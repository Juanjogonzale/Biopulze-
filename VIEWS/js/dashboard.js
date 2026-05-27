document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("token");

  if (!token) {
    window.location.href = "login.html";
    return;
  }

  const totalEl = document.getElementById("totalEquipos");
  const operativosEl = document.getElementById("equiposOperativos");
  const mantenimientoEl = document.getElementById("equiposMantenimiento");
  const fueraEl = document.getElementById("equiposFueraServicio");
  const listaProximosEl = document.getElementById("listaProximos");
  const mensajeProximosEl = document.getElementById("mensajeProximos");
  const detalleEquipoEl = document.getElementById("detalleEquipo");
  const chartEstadoEl = document.getElementById("chartEstado");
  const chartMantenimientosEl = document.getElementById("chartMantenimientos");
  const chartEstadoNote = document.getElementById("chartEstadoNote");
  const chartMantenimientosNote = document.getElementById("chartMantenimientosNote");
  const gaugeBar = document.querySelector(".gauge-bar");
  const gaugeOk = document.getElementById("gaugeOk");
  const gaugeLate = document.getElementById("gaugeLate");
  const cumplimientoPct = document.getElementById("cumplimientoPct");
  const cumplimientoOnTime = document.getElementById("cumplimientoOnTime");
  const cumplimientoLate = document.getElementById("cumplimientoLate");
  const cumplimientoNote = document.getElementById("cumplimientoNote");

  // Si el HTML aún no tiene los IDs, evitamos romper la página
  if (!totalEl || !operativosEl || !mantenimientoEl || !fueraEl) return;

  let chartEstado = null;
  let chartMantenimientos = null;

  const HOY = new Date();
  HOY.setHours(0, 0, 0, 0);

  function parseDateOnly(d) {
    if (!d) return null;
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return null;
    dt.setHours(0, 0, 0, 0);
    return dt;
  }

  function addMonths(date, n) {
    const d = new Date(date);
    d.setMonth(d.getMonth() + n);
    return d;
  }

  function monthKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  }

  function monthLabelFromKey(key) {
    const [y, m] = String(key).split("-").map((x) => Number(x));
    const d = new Date(y, (m || 1) - 1, 1);
    return d.toLocaleDateString("es-ES", { month: "short", year: "2-digit" }).replace(".", "");
  }

  function safeSetText(el, val) {
    if (!el) return;
    el.textContent = String(val);
  }

  function setNote(el, text) {
    if (!el) return;
    el.textContent = text || "";
  }

  function destroyChart(ch) {
    try { if (ch) ch.destroy(); } catch { /* noop */ }
  }

  function buildEstado(equipos) {
    const TOLERANCIA_DIAS = 30;
    const limite = new Date(HOY);
    limite.setDate(limite.getDate() + TOLERANCIA_DIAS);

    let activos = 0;
    let proximos = 0;
    let vencidos = 0;
    let fuera = 0;

    (equipos || []).forEach((e) => {
      const estado = (e?.estado || "").trim();
      if (estado === "Fuera de Servicio") {
        fuera += 1;
        return;
      }
      if (estado === "Operativo") activos += 1;

      const prox = parseDateOnly(e?.proximo_mantenimiento);
      if (!prox) return;

      if (prox < HOY) vencidos += 1;
      else if (prox <= limite) proximos += 1;
    });

    return { activos, proximos, vencidos, fuera, toleranciaDias: TOLERANCIA_DIAS };
  }

  function buildCumplimiento(equipos) {
    let onTime = 0;
    let late = 0;

    (equipos || []).forEach((e) => {
      const estado = (e?.estado || "").trim();
      if (estado === "Fuera de Servicio") return;
      const prox = parseDateOnly(e?.proximo_mantenimiento);
      if (!prox) return;
      if (prox < HOY) late += 1;
      else onTime += 1;
    });

    const total = onTime + late;
    const pct = total === 0 ? 0 : Math.round((onTime / total) * 100);
    return { onTime, late, total, pct };
  }

  function buildSerieMantenimientos(equipos) {
    const tipos = ["Preventivo", "Correctivo", "Calibración"];
    const start = new Date(HOY.getFullYear(), HOY.getMonth(), 1);
    const keys = [];
    for (let i = 11; i >= 0; i--) keys.push(monthKey(addMonths(start, -i)));

    const buckets = {};
    keys.forEach((k) => {
      buckets[k] = { Preventivo: 0, Correctivo: 0, "Calibración": 0 };
    });

    (equipos || []).forEach((e) => {
      const fecha = parseDateOnly(e?.ultimo_mantenimiento_fecha);
      if (!fecha) return;
      const k = monthKey(new Date(fecha.getFullYear(), fecha.getMonth(), 1));
      if (!buckets[k]) return;

      const raw = (e?.ultimo_mantenimiento_tipo || "").trim();
      const tipo = tipos.includes(raw) ? raw : null;
      if (!tipo) return;
      buckets[k][tipo] += 1;
    });

    const labels = keys.map(monthLabelFromKey);
    const series = {
      Preventivo: keys.map((k) => buckets[k].Preventivo),
      Correctivo: keys.map((k) => buckets[k].Correctivo),
      "Calibración": keys.map((k) => buckets[k]["Calibración"])
    };

    return { keys, labels, series };
  }

  function renderEstadoDonut(estadoData) {
    if (!chartEstadoEl || typeof Chart === "undefined") return;

    destroyChart(chartEstado);
    chartEstado = new Chart(chartEstadoEl, {
      type: "doughnut",
      data: {
        labels: ["Activos", "Próximos a mantenimiento", "Vencidos", "Fuera de servicio"],
        datasets: [{
          data: [estadoData.activos, estadoData.proximos, estadoData.vencidos, estadoData.fuera],
          backgroundColor: ["#16a34a", "#f59e0b", "#dc2626", "#334155"],
          borderColor: "rgba(255,255,255,0.9)",
          borderWidth: 2,
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
            labels: { boxWidth: 14, boxHeight: 14, padding: 12, font: { weight: "600" } }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.label}: ${ctx.parsed ?? 0}`
            }
          }
        },
        cutout: "62%"
      }
    });

    setNote(chartEstadoNote, `“Próximos” = mantenimiento dentro de ${estadoData.toleranciaDias} días.`);
  }

  function renderMantenimientosSerie(serie) {
    if (!chartMantenimientosEl || typeof Chart === "undefined") return;

    destroyChart(chartMantenimientos);
    chartMantenimientos = new Chart(chartMantenimientosEl, {
      type: "bar",
      data: {
        labels: serie.labels,
        datasets: [
          { label: "Preventivos", data: serie.series.Preventivo, backgroundColor: "rgba(13,148,136,0.85)" },
          { label: "Correctivos", data: serie.series.Correctivo, backgroundColor: "rgba(220,38,38,0.75)" },
          { label: "Calibraciones", data: serie.series["Calibración"], backgroundColor: "rgba(14,116,144,0.8)" }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { stacked: true, grid: { display: false }, ticks: { font: { weight: "600" } } },
          y: { stacked: true, beginAtZero: true, ticks: { precision: 0 } }
        },
        plugins: {
          legend: { position: "bottom", labels: { boxWidth: 14, boxHeight: 14, padding: 12, font: { weight: "600" } } },
          tooltip: { mode: "index", intersect: false }
        }
      }
    });

    setNote(chartMantenimientosNote, "Se basa en “Último mantenimiento (fecha/tipo)” registrado por equipo.");
  }

  function renderCumplimientoGauge(c) {
    safeSetText(cumplimientoPct, `${c.pct}%`);
    safeSetText(cumplimientoOnTime, c.onTime);
    safeSetText(cumplimientoLate, c.late);

    if (gaugeOk) gaugeOk.style.width = `${c.pct}%`;
    if (gaugeLate) gaugeLate.style.width = `${Math.max(0, 100 - c.pct)}%`;
    if (gaugeBar) gaugeBar.setAttribute("aria-valuenow", String(c.pct));

    if (c.total === 0) setNote(cumplimientoNote, "No hay equipos con “Próximo mantenimiento” definido para calcular cumplimiento.");
    else setNote(cumplimientoNote, "Retrasado = fecha próxima vencida (hoy > próximo mantenimiento).");
  }

  try {
    const res = await fetch("/equipos", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (sesionExpirada(res)) return;
    if (!res.ok) return;

    const equipos = await res.json();

    const total = Array.isArray(equipos) ? equipos.length : 0;
    const operativos = (equipos || []).filter((e) => e.estado === "Operativo").length;
    const mantenimiento = (equipos || []).filter((e) => e.estado === "Mantenimiento").length;
    const fuera = (equipos || []).filter((e) => e.estado === "Fuera de Servicio").length;

    totalEl.textContent = String(total);
    operativosEl.textContent = String(operativos);
    mantenimientoEl.textContent = String(mantenimiento);
    fueraEl.textContent = String(fuera);

    // Analítica (gráficas + cumplimiento)
    const estadoData = buildEstado(equipos || []);
    const cumplimientoData = buildCumplimiento(equipos || []);
    const serie = buildSerieMantenimientos(equipos || []);
    renderEstadoDonut(estadoData);
    renderMantenimientosSerie(serie);
    renderCumplimientoGauge(cumplimientoData);

    if (listaProximosEl && mensajeProximosEl && detalleEquipoEl) {
      // ordenar por fecha de próximo mantenimiento
      const proximos = (equipos || [])
        .filter((e) => e.proximo_mantenimiento)
        .sort((a, b) => new Date(a.proximo_mantenimiento) - new Date(b.proximo_mantenimiento))
        .slice(0, 10);

      listaProximosEl.innerHTML = "";

      if (proximos.length === 0) {
        mensajeProximosEl.textContent = "No hay mantenimientos programados.";
      } else {
        mensajeProximosEl.textContent = "";
        proximos.forEach((eq) => {
          const li = document.createElement("li");
          li.textContent = `${eq.nombre} - ${String(eq.proximo_mantenimiento).slice(0, 10)}`;
          li.style.cursor = "pointer";
          li.addEventListener("click", () => {
            detalleEquipoEl.innerHTML = `
              <p><strong>Equipo:</strong> ${eq.nombre}</p>
              <p><strong>Marca:</strong> ${eq.marca || "-"}</p>
              <p><strong>Modelo:</strong> ${eq.modelo || "-"}</p>
              <p><strong>Ubicación:</strong> ${eq.ubicacion || "-"}</p>
              <p><strong>Estado:</strong> ${eq.estado}</p>
              <p><strong>Próximo mantenimiento:</strong> ${eq.proximo_mantenimiento ? String(eq.proximo_mantenimiento).slice(0, 10) : "-"}</p>
              <p><strong>Último mantenimiento:</strong> ${eq.ultimo_mantenimiento_fecha ? String(eq.ultimo_mantenimiento_fecha).slice(0, 10) : "-"}</p>
              <p><strong>Técnico:</strong> ${eq.ultimo_mantenimiento_tecnico || "-"}</p>
              <p><strong>Tipo mantenimiento:</strong> ${eq.ultimo_mantenimiento_tipo || "-"}</p>
            `;
          });
          listaProximosEl.appendChild(li);
        });
      }
    }
  } catch (e) {
    // Silencioso: el dashboard queda con 0 si falla la API
  }
});