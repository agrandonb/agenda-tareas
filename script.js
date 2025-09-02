// ============= Fecha y encabezado ==================
const diasSemana = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const hoy = new Date();
const hoyStr = hoy.toISOString().split("T")[0];
const diaNombre = diasSemana[hoy.getDay()];

const elDiaSemana = document.getElementById("diaSemana");
if (elDiaSemana) elDiaSemana.textContent = `${diaNombre} - ${hoyStr}`;

// ================== Configuración de tareas base ==================
const tareasPorDia = {
  "Lunes": {
    prioridad1: ["Comité", "Reunión PSQ", "Envío sugerencias CK"],
    prioridad2: ["Gestión ingreso médico y ps", "Revisión malla día siguiente", "Revisión activos"],
    prioridad3: ["Coordinar con PI y EPT", "Gestiones agencia"],
    comunes1: ["DATA", "Databricks", "PA activos"],
    comunes2: ["Ingreso funcionarios", "Reingreso SUSESO", "Excel gestión SM", "Malla PSQ"]
  },
  "Martes": {
    prioridad1: ["Comité", "Reunión PSQ", "DP", "Envío sugerencias CK"],
    prioridad2: ["Gestión ingreso médico y ps", "Coordinar con PI y EPT", "Revisión malla día siguiente"],
    prioridad3: ["Revisión >90 días", "Revisión reingreso SUSESO", "Gestiones agencia"],
    comunes1: ["DATA", "Databricks", "PA activos"],
    comunes2: ["Ingreso funcionarios", "Reingreso SUSESO", "Excel gestión SM", "Malla PSQ"]
  },
  "Miércoles": {
    prioridad1: ["Comité", "Reunión PSQ", "Envío sugerencias CK"],
    prioridad2: ["Gestión ingreso médico y ps", "Revisión malla día siguiente", "Revisión activos"],
    prioridad3: ["Coordinar con PI y EPT", "Gestiones agencia"],
    comunes1: ["DATA", "Databricks", "PA activos"],
    comunes2: ["Ingreso funcionarios", "Reingreso SUSESO", "Excel gestión SM", "Malla PSQ"]
  },
  "Jueves": {
    prioridad1: ["Comité", "Reunión PSQ", "DP", "Envío sugerencias CK"],
    prioridad2: ["Gestión ingreso médico y ps", "Coordinar con PI y EPT", "Revisión malla día siguiente"],
    prioridad3: ["Revisión >90 días", "Revisión reingreso SUSESO", "Revisión activos", "Gestiones agencia"],
    comunes1: ["DATA", "Databricks", "PA activos"],
    comunes2: ["Ingreso funcionarios", "Reingreso SUSESO", "Excel gestión SM", "Malla PSQ"]
  },
  "Viernes": {
    prioridad1: ["Comité", "Reunión PSQ", "Envío sugerencias CK"],
    prioridad2: ["Gestión ingreso médico y ps", "Revisión malla día siguiente"],
    prioridad3: ["Coordinar con PI y EPT", "Gestiones agencia"],
    comunes1: ["DATA", "Databricks", "PA activos"],
    comunes2: ["Ingreso funcionarios", "Reingreso SUSESO", "Excel gestión SM", "Malla PSQ"]
  }
};

// ================== Storage ==================
const datosGuardados = JSON.parse(localStorage.getItem("registroTareas")) || {};
const edicionesGuardadas = JSON.parse(localStorage.getItem("ediciones")) || {};
if (!edicionesGuardadas[hoyStr]) edicionesGuardadas[hoyStr] = { titulos: {}, tareas: {} };
if (!datosGuardados[hoyStr]) datosGuardados[hoyStr] = [];

// ================== UI base ==================
const contenedor = document.getElementById("contenedorTareas");
let modoEdicion = false;

const botonEditar = document.createElement("button");
botonEditar.textContent = "✏️ Editar";
botonEditar.style.margin = "10px";
botonEditar.onclick = () => {
  modoEdicion = !modoEdicion;
  botonEditar.textContent = modoEdicion ? "✅ Terminar edición" : "✏️ Editar";
  contenedor.innerHTML = "";
  renderColumnas();
};
if (contenedor) document.body.insertBefore(botonEditar, contenedor);

// ================== Helpers ==================
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
      const name = edits.tareas[key] || original;
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

  // Título editable
  const h2 = document.createElement("h2");
  h2.textContent = edicionesGuardadas[hoyStr].titulos[id] || titulo;
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

  // Render tareas
  tareasBase.forEach((tareaOriginal, index) => {
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

  // Botón para agregar tareas nuevas
  const btnAgregar = document.createElement("button");
  btnAgregar.textContent = "+ Agregar tarea";
  btnAgregar.style.marginTop = "5px";
  btnAgregar.onclick = () => {
    if (!modoEdicion) return alert("Activa el modo edición para agregar tareas.");
    const nuevaTarea = prompt("Nombre de la nueva tarea:");
    if (nuevaTarea) {
      const key = `${id}-${Date.now()}`;
      edicionesGuardadas[hoyStr].tareas[key] = nuevaTarea;
      const boton = document.createElement("button");
      boton.textContent = nuevaTarea;
      boton.className = `task-button ${clase}`;
      boton.onclick = () => marcarTarea(boton, nuevaTarea, key);
      div.insertBefore(boton, btnAgregar);
      guardar();
    }
  };
  div.appendChild(btnAgregar);

  contenedor.appendChild(div);
}

// ================== Acciones ==================
function marcarTarea(boton, nombreTarea, key) {
  if (!boton.classList.contains("completed")) {
    boton.classList.add("completed");
    const hora = new Date().toLocaleTimeString();
    datosGuardados[hoyStr].push({ tarea: nombreTarea, hora, key });
    guardar();
    actualizarHistorial();
  }
}

function guardar() {
  localStorage.setItem("registroTareas", JSON.stringify(datosGuardados));
  localStorage.setItem("ediciones", JSON.stringify(edicionesGuardadas));
  const notas = document.getElementById("notasDia");
  if (notas) localStorage.setItem("notasFijas", notas.value || "");
}

// ================== Render columnas completo ==================
function renderColumnas() {
  contenedor.innerHTML = "";
  const baseHoy = tareasPorDia[diaNombre] || { prioridad1: [], prioridad2: [], prioridad3: [], comunes1: [], comunes2: [] };
  columnasDef.forEach(col => {
    const lista = [...(baseHoy[col.campo] || [])];
    if (col.extra) lista.push(...col.extra);
    crearColumna(col, lista);
  });
}

// ================== Historial ==================
function actualizarHistorial() {
  const historial = document.getElementById("historial");
  if (!historial) return;
  historial.innerHTML = "";

  const fechas = [];
  const primerDia = new Date(Object.keys(datosGuardados).sort()[0] || hoyStr);
  let current = new Date(primerDia.getFullYear(), primerDia.getMonth(), primerDia.getDate());
  while (current <= hoy) {
    const dayName = diasSemana[current.getDay()];
    if (dayName !== "Sábado" && dayName !== "Domingo") {
      const fechaStr = current.toISOString().split("T")[0];
      fechas.push(fechaStr);
      if (!datosGuardados[fechaStr]) datosGuardados[fechaStr] = [];
    }
    current.setDate(current.getDate() + 1);
  }

  fechas.reverse();

  fechas.forEach(fecha => {
    const esperadas = buildTareasEsperadas(fecha);
    const tareasDelDia = datosGuardados[fecha];
    let completadasCount = esperadas.filter(e =>
      tareasDelDia.some(tc => (tc.key && tc.key === e.key) || tc.tarea === e.name)
    ).length;

    const div = document.createElement("div");
    div.className = "historial-dia";
    const encabezado = document.createElement("h3");

    let simbolo = "⚠️";
    if (completadasCount === esperadas.length && completadasCount > 0) simbolo = "✅";
    else if (completadasCount === 0 && esperadas.length > 0) simbolo = "❌";
    else if (esperadas.length === 0) simbolo = "🏝️"; // fuera de oficina

    encabezado.textContent = `${simbolo} ${completadasCount}/${esperadas.length} - ${fecha}`;
    encabezado.style.cursor = "pointer";
    div.appendChild(encabezado);
    historial.appendChild(div);
  });

  actualizarGrafico();
}

// ================== Gráfico semanal ==================
function actualizarGrafico() {
  const canvas = document.getElementById("graficoSemanal");
  if (!canvas || !window.Chart) return;

  const fechas = Object.keys(datosGuardados).sort().slice(-7);
  const data = fechas.map(fecha => {
    const tareas = datosGuardados[fecha] || [];
    const esperadas = buildTareasEsperadas(fecha);
    const completadas = esperadas.filter(e =>
      tareas.some(tc => (tc.key && tc.key === e.key) || tc.tarea === e.name)
    ).length;
    return esperadas.length ? (completadas / esperadas.length) * 100 : 0;
  });

  const ctx = canvas.getContext("2d");
  if (window.miGrafico) window.miGrafico.destroy();
  window.miGrafico = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: fechas,
      datasets: [{ label: '% de cumplimiento', data: data, borderWidth: 1 }]
    },
    options: {
      scales: { y: { min: 0, max: 100, ticks: { callback: v => v + "%" } } }
    }
  });
}

// ================== Render inicial ==================
renderColumnas();

// Notas persistentes
const notas = document.getElementById("notasDia");
if (notas) {
  notas.value = localStorage.getItem("notasFijas") || "";
  notas.addEventListener("input", () => guardar());
}

actualizarHistorial();
