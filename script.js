// ================== Fecha y encabezado ==================
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
if (!datosGuardados[hoyStr]) datosGuardados[hoyStr] = [];

// Ediciones por día (títulos y nombres de tareas)
const edicionesGuardadas = JSON.parse(localStorage.getItem("ediciones")) || {};
if (!edicionesGuardadas[hoyStr]) edicionesGuardadas[hoyStr] = { titulos: {}, tareas: {} };

// ================== UI base ==================
const contenedor = document.getElementById("contenedorTareas");

// Modo edición
let modoEdicion = false;
const botonEditar = document.createElement("button");
botonEditar.textContent = "✏️ Editar";
botonEditar.style.margin = "10px";
botonEditar.onclick = () => {
  modoEdicion = !modoEdicion;
  botonEditar.textContent = modoEdicion ? "✅ Terminar edición" : "✏️ Editar";
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

// Construye la lista esperada de tareas para una fecha, aplicando ediciones de ese día.
// Devuelve array de objetos: [{key, name}]
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

// Para compatibilidad con código previo (si necesitas nombres solo):
function obtenerTareasDia(fechaStr) {
  return buildTareasEsperadas(fechaStr).map(i => i.name);
}

// Estado de un día (usando key o nombre para compatibilidad con registros antiguos)
function obtenerEstadoDia(fechaStr, tareasCompletadas) {
  const esperadas = buildTareasEsperadas(fechaStr);
  const faltantes = esperadas.filter(e =>
    !tareasCompletadas.some(tc => (tc.key && tc.key === e.key) || tc.tarea === e.name)
  );
  return faltantes.length === 0 ? "✅ OK" : `❌ Incompleto: faltó ${faltantes.map(f => f.name).join(", ")}`;
}

// ================== Render de columnas ==================
function crearColumna(colDef, tareasBase) {
  const { id, titulo, clase } = colDef;
  const div = document.createElement("div");
  div.className = "caja";

  // Título (aplica edición del día)
  const h2 = document.createElement("h2");
  const tituloEditado = edicionesGuardadas[hoyStr].titulos[id] || titulo;
  h2.textContent = tituloEditado;

  // Doble clic para editar título (persistente por día)
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

  // Tareas (aplicando ediciones del día para los nombres)
  const lista = tareasBase.slice();
  if (colDef.extra && Array.isArray(colDef.extra)) lista.push(...colDef.extra);

  lista.forEach((tareaOriginal, index) => {
    const key = `${id}-${index}`;
    const nombreTarea = edicionesGuardadas[hoyStr].tareas[key] || tareaOriginal;

    const boton = document.createElement("button");
    boton.textContent = nombreTarea;
    boton.className = `task-button ${clase}`;

    // Pintar como completada si ya está registrada (por key o por nombre)
    if (datosGuardados[hoyStr].some(it => (it.key && it.key === key) || it.tarea === nombreTarea)) {
      boton.classList.add("completed");
    }

    // Clic: marcar o editar nombre (persistente por día)
    boton.onclick = () => {
      if (!modoEdicion) {
        marcarTarea(boton, nombreTarea, key);
      } else {
        const nuevo = prompt("Editar nombre de la tarea:", boton.textContent);
        if (nuevo !== null) {
          boton.textContent = nuevo;
          edicionesGuardadas[hoyStr].tareas[key] = nuevo;
          guardar();
          // Si estaba marcada con el nombre antiguo pero sin key, mantener consistencia:
          // (no tocamos histórico; el matching por key ya nos cubre a futuro)
        }
      }
    };

    div.appendChild(boton);
  });

  contenedor.appendChild(div);
}

// ================== Acciones ==================
function marcarTarea(boton, nombreTarea, key) {
  if (!boton.classList.contains("completed")) {
    boton.classList.add("completed");
    const hora = new Date().toLocaleTimeString();
    datosGuardados[hoyStr].push({ tarea: nombreTarea, hora, key }); // guardamos key para robustez
    guardar();
    actualizarHistorial();
  }
}

function guardar() {
  localStorage.setItem("registroTareas", JSON.stringify(datosGuardados));
  localStorage.setItem("ediciones", JSON.stringify(edicionesGuardadas));
  const notas = document.getElementById("notasDia");
  if (notas) localStorage.setItem("notasDia-" + hoyStr, notas.value || "");
}

// ================== Historial (compacto y con faltantes al click) ==================
function actualizarHistorial(filtro = "7d") {
  const historial = document.getElementById("historial");
  if (!historial) return;

  historial.innerHTML = "";
  const dias = Object.keys(datosGuardados).sort().reverse();

  let fechasFiltradas = dias;
  if (filtro === "7d") fechasFiltradas = dias.slice(0, 7);
  else if (filtro === "mes") {
    const mesActual = hoy.getMonth();
    fechasFiltradas = dias.filter(d => {
      const [y, m] = d.split("-").map(Number);
      return (m - 1) === mesActual && new Date(y, m - 1, 1);
    });
  }

  fechasFiltradas.forEach(fecha => {
    const dayIndex = new Date(fecha).getDay();
    if (dayIndex === 0 || dayIndex === 6) return; // ocultar fines de semana

    const tareasDelDia = datosGuardados[fecha] || [];
    const esperadas = buildTareasEsperadas(fecha);

    const completadasCount = esperadas.filter(e =>
      tareasDelDia.some(tc => (tc.key && tc.key === e.key) || tc.tarea === e.name)
    ).length;

    const faltantes = esperadas
      .filter(e => !tareasDelDia.some(tc => (tc.key && tc.key === e.key) || tc.tarea === e.name))
      .map(e => e.name);

    const div = document.createElement("div");
    div.className = "historial-dia";

    const encabezado = document.createElement("h3");
    let simbolo = "⚠️";
    if (completadasCount === esperadas.length) simbolo = "✅";
    else if (completadasCount === 0) simbolo = "❌";
    encabezado.textContent = `${simbolo} ${completadasCount}/${esperadas.length} - ${fecha}`;
    encabezado.style.cursor = "pointer";

    const lista = document.createElement("ul");
    lista.style.display = "none";
    lista.innerHTML = faltantes.map(t => `<li>${t}</li>`).join("");

    encabezado.onclick = () => {
      lista.style.display = lista.style.display === "none" ? "block" : "none";
    };

    div.appendChild(encabezado);
    div.appendChild(lista);
    historial.appendChild(div);
  });

  actualizarGrafico();
}

// ================== Gráfico semanal (Chart.js) ==================
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
      datasets: [{
        label: '% de cumplimiento',
        data: data,
        borderWidth: 1
      }]
    },
    options: {
      scales: {
        y: {
          min: 0,
          max: 100,
          ticks: { callback: v => v + "%" }
        }
      }
    }
  });
}

// ================== Render inicial ==================
const baseHoy = tareasPorDia[diaNombre] || { prioridad1: [], prioridad2: [], prioridad3: [], comunes1: [], comunes2: [] };
columnasDef.forEach(col => {
  crearColumna(col, baseHoy[col.campo] || []);
});

// Notas del día (por fecha)
const notas = document.getElementById("notasDia");
if (notas) {
  notas.value = localStorage.getItem("notasDia-" + hoyStr) || "";
  notas.addEventListener("input", () => guardar());
}

// Cargar historial y gráfico
actualizarHistorial();


function actualizarGrafico() {
  const fechas = Object.keys(datosGuardados).sort().slice(-7);
  const data = fechas.map(fecha => {
    const tareas = datosGuardados[fecha];
    const totalTareas = obtenerTareasDia(fecha);
    const completadas = totalTareas.filter(t =>
      tareas.some(tc => tc.tarea === t)
    ).length;
    return (completadas / totalTareas.length) * 100;
  });

  const ctx = document.getElementById("graficoSemanal").getContext("2d");
  if (window.miGrafico) window.miGrafico.destroy();
  window.miGrafico = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: fechas,
      datasets: [{
        label: '% de cumplimiento',
        data: data,
        borderWidth: 1
      }]
    },
    options: {
      scales: {
        y: {
          min: 0,
          max: 100,
          ticks: { callback: v => v + "%" }
        }
      }
    }
  });
}

