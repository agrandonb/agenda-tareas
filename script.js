// ================== Fecha y encabezado ==================
const diasSemana = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const hoy = new Date();
const hoyStr = hoy.toISOString().split("T")[0];
const diaNombre = diasSemana[hoy.getDay()];

const elDiaSemana = document.getElementById("diaSemana");
if (elDiaSemana) elDiaSemana.textContent = `${diaNombre} - ${hoyStr}`;

// ================== Configuración de tareas base ==================
const tareasPorDia = {
  "Lunes": { prioridad1: ["Comité", "Reunión PSQ", "Envío sugerencias CK"], prioridad2: ["Gestión ingreso médico y ps", "Revisión malla día siguiente", "Revisión activos"], prioridad3: ["Coordinar con PI y EPT", "Gestiones agencia"], comunes1: ["DATA", "Databricks", "PA activos"], comunes2: ["Ingreso funcionarios", "Reingreso SUSESO", "Excel gestión SM", "Malla PSQ"] },
  "Martes": { prioridad1: ["Comité", "Reunión PSQ", "DP", "Envío sugerencias CK"], prioridad2: ["Gestión ingreso médico y ps", "Coordinar con PI y EPT", "Revisión malla día siguiente"], prioridad3: ["Revisión >90 días", "Revisión reingreso SUSESO", "Gestiones agencia"], comunes1: ["DATA", "Databricks", "PA activos"], comunes2: ["Ingreso funcionarios", "Reingreso SUSESO", "Excel gestión SM", "Malla PSQ"] },
  "Miércoles": { prioridad1: ["Comité", "Reunión PSQ", "Envío sugerencias CK"], prioridad2: ["Gestión ingreso médico y ps", "Revisión malla día siguiente", "Revisión activos"], prioridad3: ["Coordinar con PI y EPT", "Gestiones agencia"], comunes1: ["DATA", "Databricks", "PA activos"], comunes2: ["Ingreso funcionarios", "Reingreso SUSESO", "Excel gestión SM", "Malla PSQ"] },
  "Jueves": { prioridad1: ["Comité", "Reunión PSQ", "DP", "Envío sugerencias CK"], prioridad2: ["Gestión ingreso médico y ps", "Coordinar con PI y EPT", "Revisión malla día siguiente"], prioridad3: ["Revisión >90 días", "Revisión reingreso SUSESO", "Revisión activos", "Gestiones agencia"], comunes1: ["DATA", "Databricks", "PA activos"], comunes2: ["Ingreso funcionarios", "Reingreso SUSESO", "Excel gestión SM", "Malla PSQ"] },
  "Viernes": { prioridad1: ["Comité", "Reunión PSQ", "Envío sugerencias CK"], prioridad2: ["Gestión ingreso médico y ps", "Revisión malla día siguiente"], prioridad3: ["Coordinar con PI y EPT", "Gestiones agencia"], comunes1: ["DATA", "Databricks", "PA activos"], comunes2: ["Ingreso funcionarios", "Reingreso SUSESO", "Excel gestión SM", "Malla PSQ"] }
};

// ================== Storage ==================
const datosGuardados = JSON.parse(localStorage.getItem("registroTareas")) || {};
if (!datosGuardados[hoyStr]) datosGuardados[hoyStr] = [];

const edicionesGuardadas = JSON.parse(localStorage.getItem("ediciones")) || {};
if (!edicionesGuardadas[hoyStr]) edicionesGuardadas[hoyStr] = { titulos: {}, tareas: {} };

let registroHoras = JSON.parse(localStorage.getItem("registroHoras")) || [];

// ================== UI base ==================
const contenedor = document.getElementById("contenedorTareas");

let modoEdicion = false;
const botonEditar = document.createElement("button");
botonEditar.textContent = "✏️ Editar";
botonEditar.style.margin = "10px";
botonEditar.onclick = () => {
  modoEdicion = !modoEdicion;
  botonEditar.textContent = modoEdicion ? "✅ Terminar edición" : "✏️ Editar";
  document.querySelectorAll(".add-task-btn").forEach(b => b.style.display = modoEdicion ? "inline-block" : "none");
};
if (contenedor) document.body.insertBefore(botonEditar, contenedor);

// ================== Helpers de estructura ==================
const columnasDef = [
  { id: "c1", titulo: "Búsqueda bases", campo: "comunes1", clase: "" },
  { id: "c2", titulo: "Actualizar registros", campo: "comunes2", clase: "" },
  { id: "p1", titulo: "Gestiones primera prioridad", campo: "prioridad1", clase: "rojo-pastel" },
  { id: "p2", titulo: "Gestiones segunda prioridad", campo: "prioridad2", clase: "naranjo-pastel" },
  { id: "p3", titulo: "Gestiones tercera prioridad", campo: "prioridad3", clase: "amarillo-pastel", extra: ["Emails, reuniones y otros"] },
];

function buildTareasEsperadas(fechaStr) {
  const [anio, mes, diaN] = fechaStr.split("-").map(Number);
  const fecha = new Date(anio, mes - 1, diaN);
  const nombreDia = diasSemana[fecha.getDay()];
  const base = tareasPorDia[nombreDia];
  if (!base) return [];

  const edits = edicionesGuardadas[fechaStr] || { titulos: {}, tareas: {} };
  const out = [];

  columnasDef.forEach(col => {
    const listaBase = (base[col.campo] || []).slice();
    if (col.extra && Array.isArray(col.extra)) listaBase.push(...col.extra);

    listaBase.forEach((original, index) => {
      const key = `${col.id}-${index}`;
      const name = edits.tareas && edits.tareas[key] ? edits.tareas[key] : original;
      out.push({ key, name });
    });
  });
  return out;
}

// ================== Render columnas ==================
function crearColumna(colDef, tareasBase) {
  const { id, titulo, clase } = colDef;
  const div = document.createElement("div");
  div.className = "caja";

  const h2 = document.createElement("h2");
  const tituloEditado = edicionesGuardadas[hoyStr].titulos[id] || titulo;
  h2.textContent = tituloEditado;
  h2.ondblclick = () => {
    if (!modoEdicion) return;
    const nuevo = prompt("Editar título:", h2.textContent);
    if (nuevo !== null) {
      h2.textContent = nuevo;
      edicionesGuardadas[hoyStr].titulos[id] = nuevo;
      guardar();
    }
  };
  div.appendChild(h2);

  const lista = tareasBase.slice();
  if (colDef.extra && Array.isArray(colDef.extra)) lista.push(...colDef.extra);

  lista.forEach((tareaOriginal, index) => {
    const key = `${id}-${index}`;
    const nombreTarea = edicionesGuardadas[hoyStr].tareas[key] || tareaOriginal;

    const boton = document.createElement("button");
    boton.textContent = nombreTarea;
    boton.className = `task-button ${clase}`;

    if (datosGuardados[hoyStr].some(it => (it.key && it.key === key) || it.tarea === nombreTarea)) {
      boton.classList.add("completed");
    }

    boton.onclick = () => {
      if (!modoEdicion) {
        marcarTarea(boton, nombreTarea, key);
      } else {
        const nuevo = prompt("Editar nombre de la tarea:", boton.textContent);
        if (nuevo !== null) {
          boton.textContent = nuevo;
          edicionesGuardadas[hoyStr].tareas[key] = nuevo;
          guardar();
        }
      }
    };
    div.appendChild(boton);
  });

  // Botón agregar tarea
  const addBtn = document.createElement("button");
  addBtn.textContent = "➕ Agregar tarea";
  addBtn.className = "add-task-btn";
  addBtn.style.display = modoEdicion ? "inline-block" : "none";
  addBtn.onclick = () => {
    const nueva = prompt("Nombre de la nueva tarea:");
    if (nueva) {
      const key = `${id}-${lista.length}`;
      edicionesGuardadas[hoyStr].tareas[key] = nueva;
      guardar();
      location.reload();
    }
  };
  div.appendChild(addBtn);

  contenedor.appendChild(div);
}

// ================== Acciones ==================
function marcarTarea(boton, nombreTarea, key) {
  if (!boton.classList.contains("completed")) {
    boton.classList.add("completed");
    const ahora = new Date();
    const horaStr = ahora.getHours().toString().padStart(2,'0') + ":" + ahora.getMinutes().toString().padStart(2,'0');

    if (!datosGuardados[hoyStr]) datosGuardados[hoyStr] = [];
    datosGuardados[hoyStr].push({ tarea: nombreTarea, hora: horaStr, key });

    registroHoras.push({ tarea: nombreTarea, hora: ahora });
    localStorage.setItem("registroHoras", JSON.stringify(registroHoras));

    guardar();
    actualizarHistorial();
    actualizarGraficoHoras();
  }
}

function guardar() {
  localStorage.setItem("registroTareas", JSON.stringify(datosGuardados));
  localStorage.setItem("ediciones", JSON.stringify(edicionesGuardadas));
  const notas = document.getElementById("notasDia");
  if (notas) localStorage.setItem("notasFijas", notas.value || "");
}

// ================== Historial ==================
function actualizarHistorial() {
  const historial = document.getElementById("historial");
  if (!historial) return;
  historial.innerHTML = "";

  const fechas = [];
  let startDate = new Date("2025-08-01"); 
  while (startDate <= hoy) {
    const dayName = diasSemana[startDate.getDay()];
    if (["Lunes","Martes","Miércoles","Jueves","Viernes"].includes(dayName)) {
      const str = startDate.toISOString().split("T")[0];
      fechas.push(str);
      if (!datosGuardados[str]) datosGuardados[str] = [];
    }
    startDate.setDate(startDate.getDate() + 1);
  }

  fechas.reverse().forEach(fecha => {
    const esperadas = buildTareasEsperadas(fecha);
    const tareasDelDia = datosGuardados[fecha] || [];
    const completadasCount = esperadas.filter(e =>
      tareasDelDia.some(tc => (tc.key && tc.key === e.key) || tc.tarea === e.name)
    ).length;

    const div = document.createElement("div");
    div.className = "historial-dia";

    const encabezado = document.createElement("h3");
    encabezado.style.cursor = "pointer";

    let simbolo;
    if (tareasDelDia.length === 0 && fecha !== hoyStr) simbolo = "⚪"; 
    else if (completadasCount === esperadas.length) simbolo = "✅";
    else if (completadasCount === 0) simbolo = "❌";
    else simbolo = "⚠️";

    encabezado.textContent = `${simbolo} ${completadasCount}/${esperadas.length} - ${fecha}`;
    div.appendChild(encabezado);

    const contenido = document.createElement("div");
    contenido.style.display = "none";
    tareasDelDia.forEach(td => {
      const p = document.createElement("p");
      p.textContent = `${td.hora} - ${td.tarea}`;
      contenido.appendChild(p);
    });
    div.appendChild(contenido);

    encabezado.onclick = () => {
      contenido.style.display = contenido.style.display === "none" ? "block" : "none";
    };

    historial.appendChild(div);
  });

  actualizarGraficos();
}

// ================== Gráficos ==================
function actualizarGraficos() {
  actualizarGraficoCumplimiento();
  actualizarGraficoHoras();
}

function actualizarGraficoCumplimiento() {
  const grafCumpl = document.getElementById("graficoSemanal");
  if (!grafCumpl || !window.Chart) return;

  const semanas = {};
  Object.keys(datosGuardados).sort().forEach(fecha => {
    const d = new Date(fecha);
    const anioSemana = `${d.getFullYear()}-S${Math.ceil((d.getDate() + 6 - d.getDay()) / 7)}`;
    if (!semanas[anioSemana]) semanas[anioSemana] = [];
    semanas[anioSemana].push(fecha);
  });

  const labelsCumpl = Object.keys(semanas);
  const dataCumpl = labelsCumpl.map(s => {
    const fechasSemana = semanas[s];
    let total = 0, completadas = 0;
    fechasSemana.forEach(f => {
      const esperadas = buildTareasEsperadas(f);
      total += esperadas.length;
      completadas += esperadas.filter(e =>
        datosGuardados[f].some(tc => (tc.key && tc.key === e.key) || tc.tarea === e.name)
      ).length;
    });
    return total ? (completadas / total) * 100 : 0;
  });

  if (window.chartCumpl) window.chartCumpl.destroy();
  window.chartCumpl = new Chart(grafCumpl.getContext("2d"), {
    type: "bar",
    data: { labels: labelsCumpl, datasets: [{ label: "% de cumplimiento", data: dataCumpl, borderWidth: 1 }] },
    options: { scales: { y: { min: 0, max: 100, ticks: { callback: v => v + "%" } } } }
  });
}

function actualizarGraficoHoras() {
  const grafHoras = document.getElementById("graficoHoras");
  if (!grafHoras || !window.Chart) return;

  const horasRango = Array.from({length: 10}, (_, i) => 8 + i).reverse(); // 17 → 8
  const tareasUnicas = [...new Set((datosGuardados[hoyStr] || []).map(r => r.tarea))];

  const datasets = tareasUnicas.map((tarea, idx) => {
    return {
      label: tarea,
      data: horasRango.map(h => {
        return (datosGuardados[hoyStr] || []).filter(r => {
          const hActual = parseInt(r.hora.split(":")[0]);
          return r.tarea === tarea && hActual === h;
        }).length;
      }),
      backgroundColor: `hsl(${idx * 60}, 70%, 60%)`
    };
  });

  if (window.chartHoras) window.chartHoras.destroy();
  window.chartHoras = new Chart(grafHoras.getContext("2d"), {
    type: 'bar',
    data: { labels: horasRango.map(h => h + ":00"), datasets: datasets },
    options: {
      indexAxis: 'y',
      responsive: true,
      plugins: { title: { display: true, text: 'Hora tarea completada' }, legend: { position: 'bottom' } },
      scales: { 
        x: { title: { display: true, text: 'Cantidad de veces presionada' } }, 
        y: { title: { display: true, text: 'Hora' } } 
      }
    }
  });
}

// ================== Calendario ==================
function toggleCalendario() {
  const cont = document.getElementById("contenedorCalendario");
  const titulo = document.getElementById("tituloCalendario");
  const visible = cont.style.display === "block";
  cont.style.display = visible ? "none" : "block";
  titulo.classList.toggle("abierto", !visible);
}

function agregarTareaCalendario(fijaSemana) {
  const fecha = document.getElementById("fechaSeleccion").value;
  const tarea = document.getElementById("nuevaTareaCalendario").value.trim();
  const caja = document.getElementById("selectCaja").value;

  if (!fecha || !tarea || !caja) {
    alert("Debes seleccionar fecha, tarea y caja.");
    return;
  }

  const [anio, mes, dia] = fecha.split("-").map(Number);
  const fechaObj = new Date(anio, mes - 1, dia);
  const nombreDia = diasSemana[fechaObj.getDay()];

  if (fijaSemana) {
    if (!tareasPorDia[nombreDia]) tareasPorDia[nombreDia] = { prioridad1: [], prioridad2: [], prioridad3: [], comunes1: [], comunes2: [] };
    tareasPorDia[nombreDia][caja].push(tarea);
    alert(`✅ "${tarea}" se agregó fijo a ${nombreDia} en ${caja}`);
  } else {
    if (!datosGuardados[fecha]) datosGuardados[fecha] = [];
    const key = `cal-${Date.now()}`;
    datosGuardados[fecha].push({ tarea, hora: "--:--", key, caja });

    if (fecha === hoyStr) {
      const colDef = columnasDef.find(c => c.id === caja || c.campo === caja);
      if (colDef) crearColumna(colDef, [tarea]);
    }

    alert(`✅ "${tarea}" se agregó solo para ${fecha} en ${caja}`);
  }

  guardar();
  actualizarHistorial();
  document.getElementById("nuevaTareaCalendario").value = "";
}

// ================== Render inicial ==================
const baseHoy = tareasPorDia[diaNombre] || { prioridad1: [], prioridad2: [], prioridad3: [], comunes1: [], comunes2: [] };
columnasDef.forEach(col => crearColumna(col, baseHoy[col.campo] || []));

// Notas persistentes
const notas = document.getElementById("notasDia");
if (notas) {
  notas.value = localStorage.getItem("notasFijas") || "";
  notas.addEventListener("input", () => guardar());
}

actualizarHistorial();
