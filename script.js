const diasSemana = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const hoy = new Date();
const hoyStr = hoy.toISOString().split("T")[0];
const diaNombre = diasSemana[hoy.getDay()];

document.getElementById("diaSemana").textContent = `${diaNombre} - ${hoyStr}`;

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
    prioridad3: ["Revisión >90 días", "Revisión reingreso SUSESO", "Gestiones agencia"],
    comunes1: ["DATA", "Databricks", "PA activos"],
    comunes2: ["Ingreso funcionarios", "Reingreso SUSESO", "Excel gestión SM", "Malla PSQ"]
  },
  "Viernes": {
    prioridad1: ["Comité", "Reunión PSQ", "Envío sugerencias CK"],
    prioridad2: ["Gestión ingreso médico y ps", "Revisión malla día siguiente", "Revisión activos"],
    prioridad3: ["Coordinar con PI y EPT", "Gestiones agencia"],
    comunes1: ["DATA", "Databricks", "PA activos"],
    comunes2: ["Ingreso funcionarios", "Reingreso SUSESO", "Excel gestión SM", "Malla PSQ"]
  }
};

const datosGuardados = JSON.parse(localStorage.getItem("registroTareas")) || {};
if (!datosGuardados[hoyStr]) datosGuardados[hoyStr] = [];

const contenedor = document.getElementById("contenedorTareas");

function crearColumna(titulo, tareas, claseExtra = "") {
  const div = document.createElement("div");
  div.className = "caja";
  const h2 = document.createElement("h2");
  h2.textContent = titulo;
  div.appendChild(h2);

  tareas.forEach(tarea => {
    const boton = document.createElement("button");
    boton.textContent = tarea;
    boton.className = `task-button ${claseExtra}`;
    if (datosGuardados[hoyStr].some(item => item.tarea === tarea)) {
      boton.classList.add("completed");
    }
    boton.onclick = () => marcarTarea(boton, tarea);
    div.appendChild(boton);
  });
  contenedor.appendChild(div);
}

function marcarTarea(boton, tarea) {
  if (!boton.classList.contains("completed")) {
    boton.classList.add("completed");
    const hora = new Date().toLocaleTimeString();
    datosGuardados[hoyStr].push({ tarea, hora });
    guardar();
    actualizarHistorial();
  }
}

function guardar() {
  localStorage.setItem("registroTareas", JSON.stringify(datosGuardados));
  localStorage.setItem("notasDia-" + hoyStr, document.getElementById("notasDia").value);
}

// Esta función devuelve las tareas totales esperadas para una fecha dada, según el día de la semana
function obtenerTareasDia(fechaStr) {
// Forzar a interpretar la fecha como local (no UTC)
const [anio, mes, dia] = fechaStr.split("-").map(Number);
const fecha = new Date(anio, mes - 1, dia);

const diasSemana = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const nombreDia = diasSemana[fecha.getDay()];

  const diaObj = tareasPorDia[nombreDia];
  if (!diaObj) {
    return [];
  }
  return [].concat(
    diaObj.comunes1,
    diaObj.comunes2,
    diaObj.prioridad1,
    diaObj.prioridad2,
    [...diaObj.prioridad3, "Emails, reuniones y otros"]
  );
}

// Ahora recibe la fecha para calcular el estado del día correcto
function obtenerEstadoDia(fechaStr, tareasCompletadas) {
  const totalTareas = obtenerTareasDia(fechaStr);

  const completadas = totalTareas.every(t =>
    tareasCompletadas.some(tc => tc.tarea === t)
  );

  if (completadas) {
    return "✅ OK";
  } else {
    const faltantes = totalTareas.filter(
      t => !tareasCompletadas.some(tc => tc.tarea === t)
    );
    return `❌ Incompleto: faltó ${faltantes.join(", ")}`;
  }
}

// Modificar historial para mostrar estado y colapsar detalle
function actualizarHistorial() {
  const historial = document.getElementById("historial");
  historial.innerHTML = "";
  const dias = Object.keys(datosGuardados).sort().reverse();

  dias.forEach(fecha => {
    const tareasDelDia = datosGuardados[fecha];
    const estado = obtenerEstadoDia(fecha, tareasDelDia);

    const div = document.createElement("div");
    div.className = "historial-dia";

    const encabezado = document.createElement("h3");
    encabezado.textContent = `${fecha} - ${estado}`;
    encabezado.style.cursor = "pointer";

    const lista = document.createElement("ul");
    lista.style.display = estado.startsWith("✅") ? "block" : "none"; // auto mostrar si está OK
    lista.innerHTML = tareasDelDia.map(i => `<li>${i.tarea} - ${i.hora}</li>`).join("");

    encabezado.onclick = () => {
      lista.style.display = lista.style.display === "none" ? "block" : "none";
    };

    div.appendChild(encabezado);
    div.appendChild(lista);
    historial.appendChild(div);
  });

  actualizarGrafico();
}

const dia = tareasPorDia[diaNombre] || { prioridad1: [], prioridad2: [], prioridad3: [], comunes1: [], comunes2: [] };

crearColumna("Búsqueda base", dia.comunes1);
crearColumna("Ingresos y revisión", dia.comunes2);
crearColumna("Gestiones primera prioridad", dia.prioridad1, "rojo-pastel");
crearColumna("Gestiones segunda prioridad", dia.prioridad2, "naranjo-pastel");
crearColumna("Gestiones tercera prioridad", [...dia.prioridad3, "Emails, reuniones y otros"], "amarillo-pastel");

// Notas fijas, se guardan independientemente del día
const notas = document.getElementById("notasDia");

// Cargar nota persistente al iniciar
notas.value = localStorage.getItem("notasFijas") || "";

// Guardar automáticamente al escribir
notas.addEventListener("input", () => {
  localStorage.setItem("notasFijas", notas.value);
});

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
