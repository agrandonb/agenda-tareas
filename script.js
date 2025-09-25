// ================== Fecha y encabezado ==================
const diasSemana = ["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"];

// Helper: obtener hoy en formato YYYY-MM-DD (fecha local)
function getHoyStr() {
  const hoy = new Date();
  const año = hoy.getFullYear();
  const mes = String(hoy.getMonth() + 1).padStart(2, "0");
  const dia = String(hoy.getDate()).padStart(2, "0");
  return `${año}-${mes}-${dia}`;
}
const hoyStr = getHoyStr();
let currentViewDate = hoyStr;

// Helpers para evitar problemas de zona horaria
function dateFromISO(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function dateToISO(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, "0");
  const d = String(dateObj.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// ================== Función para obtener día de la semana ==================
function obtenerDiaSemana(fechaISO) {
  const fecha = dateFromISO(fechaISO);
  let day = fecha.getDay(); // 0 = Domingo, 1 = Lunes...
  if (day === 0) day = 6; // Domingo -> 6
  else day = day - 1;     // Lunes->0, Martes->1...
  return diasSemana[day];
}

// ================== Actualizar encabezado ==================
function actualizarEncabezado(fechaISO) {
  const nombre = obtenerDiaSemana(fechaISO);
  const el = document.getElementById("diaSemana");
  if (el) el.textContent = `${nombre} - ${fechaISO}`;
}
actualizarEncabezado(hoyStr);

// ================== Storage y datos (keys) ==================
const KEY_REGISTRO   = "registroTareas";
const KEY_EDICIONES  = "ediciones";
const KEY_TAREAS_DIA = "tareasSemanales";
const KEY_COLUMNAS   = "columnasDefUser";
const KEY_REG_HORAS  = "registroHoras";
const KEY_NOTAS      = "notasFijas";

// Cargar datos desde localStorage (backwards-safe)
let datosGuardados     = JSON.parse(localStorage.getItem(KEY_REGISTRO))   || {};
let edicionesGuardadas = JSON.parse(localStorage.getItem(KEY_EDICIONES)) || {};
let tareasPorDiaUser   = JSON.parse(localStorage.getItem(KEY_TAREAS_DIA)) || {};
let columnasDef        = JSON.parse(localStorage.getItem(KEY_COLUMNAS))   || [
  { id:"c1", titulo:"Búsqueda bases", campo:"comunes1", clase:"" },
  { id:"c2", titulo:"Actualizar registros", campo:"comunes2", clase:"" },
  { id:"p1", titulo:"Gestiones primera prioridad", campo:"prioridad1", clase:"rojo-pastel" },
  { id:"p2", titulo:"Gestiones segunda prioridad", campo:"prioridad2", clase:"naranjo-pastel" },
  { id:"p3", titulo:"Gestiones tercera prioridad", campo:"prioridad3", clase:"amarillo-pastel" }
];
let registroHoras = JSON.parse(localStorage.getItem(KEY_REG_HORAS)) || [];

// ================== Guardar datos ==================
function guardarTodo(){
  localStorage.setItem(KEY_REGISTRO,   JSON.stringify(datosGuardados));
  localStorage.setItem(KEY_TAREAS_DIA, JSON.stringify(tareasPorDiaUser));
  localStorage.setItem(KEY_EDICIONES,  JSON.stringify(edicionesGuardadas));
  localStorage.setItem(KEY_COLUMNAS,   JSON.stringify(columnasDef));
  localStorage.setItem(KEY_REG_HORAS,  JSON.stringify(registroHoras));
}

// ================== Util ==================
function limpiarContenedor(){ const el = document.getElementById("contenedorTareas"); if(el) el.innerHTML=""; }
function reflowGridColumns(){ 
  const cont = document.getElementById("contenedorTareas"); 
  if(cont) cont.style.gridTemplateColumns=`repeat(${columnasDef.length},1fr)`; 
}

// Rellena el select de cajas del calendario
function llenarSelectCaja(){
  const sel = document.getElementById("selectCaja");
  if(!sel) return;
  sel.innerHTML = "";
  columnasDef.forEach(c=>{
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.titulo;
    sel.appendChild(opt);
  });
}

// ================== Modo edición ==================
let modoEdicion=false;
const botonEditar = document.createElement("button");
botonEditar.textContent="✏️ Editar";
botonEditar.style.margin="10px";
botonEditar.id = "botonEditar";
botonEditar.onclick = () => {
  modoEdicion = !modoEdicion;
  botonEditar.textContent = modoEdicion ? "✅ Terminar edición" : "✏️ Editar";
  document.querySelectorAll(".add-task-btn,.del-col-btn").forEach(b => b.style.display = modoEdicion ? "inline-block" : "none");
  document.querySelectorAll(".btn-eliminar-tarea,.btn-mover-tarea").forEach(b => b.style.display = modoEdicion ? "inline-block" : "none");

  // Al terminar edición, ocultar inputs de fecha y resetear estados temporales
  if(!modoEdicion){
    document.querySelectorAll('.caja input[type="date"]').forEach(input => {
      input.classList.remove('visible');
      input.value = "";
    });
    irFechaClickState = false;
    selectedFechaTemp = null;

    if(currentViewDate !== hoyStr){
      const volver = confirm("¿Volver al día actual?");
      if(volver){
        currentViewDate = hoyStr;
        renderAllColumns(hoyStr);
        quitarBotonVolverHoy();
      }
    }
  }
};
document.getElementById("botonEditarContainer")?.appendChild(botonEditar);

// ================== Asegurar tareas recurrentes en una fecha ==================
function ensureRecurrentTasksForDate(fechaISO) {
  if(!fechaISO) return;
  const dia = obtenerDiaSemana(fechaISO);
  const plantilla = tareasPorDiaUser[dia] || {};
  if(!datosGuardados[fechaISO]) datosGuardados[fechaISO] = [];

  Object.keys(plantilla).forEach(cajaId => {
    const tareas = plantilla[cajaId] || [];
    tareas.forEach(nombreTarea => {
      const existe = datosGuardados[fechaISO].some(t => t.tarea === nombreTarea && t.caja === cajaId);
      if(!existe){
        const key = `auto-${Date.now()}-${Math.random().toString(36).substr(2,5)}`;
        datosGuardados[fechaISO].push({ tarea: nombreTarea, completada: false, caja: cajaId, key });
      }
    });
  });
  guardarTodo();
}

// ================== Crear columna y tareas ==================
function crearColumnaDOM(colDef, viewDate = currentViewDate){
  const {id,titulo,clase} = colDef;
  const div = document.createElement("div");
  div.className = "caja";
  div.dataset.colId = id;
  // guardar índice de la caja en dataset para referencia fácil
  const idx = columnasDef.findIndex(c => c.id === id);
  div.dataset.index = idx;
  div.id = `caja-${id}`;

  const h2 = document.createElement("h2");
  h2.textContent = (edicionesGuardadas[viewDate]?.titulos?.[id])||titulo;
  h2.ondblclick = () => { 
    if(!modoEdicion) return;
    const nuevo = prompt("Editar título:", h2.textContent);
    if(nuevo!==null){
      h2.textContent = nuevo;
      if(!edicionesGuardadas[viewDate]) edicionesGuardadas[viewDate] = {titulos:{},tareas:{}};
      edicionesGuardadas[viewDate].titulos[id] = nuevo;
      guardarTodo();
    }
  };
  div.appendChild(h2);

  const delColBtn = document.createElement("button");
  delColBtn.textContent = "Eliminar caja";
  delColBtn.className = "del-col-btn";
  delColBtn.style.display = modoEdicion ? "inline-block" : "none";
  delColBtn.onclick = ()=>{ 
    if(!confirm(`Eliminar la caja "${h2.textContent}"?`)) return; 
    columnasDef = columnasDef.filter(c => c.id!==id); 
    guardarTodo(); 
    renderAllColumns(currentViewDate); 
    actualizarGraficos(); 
    llenarSelectCaja();
  };
  div.appendChild(delColBtn);

  const lista = (datosGuardados[viewDate]||[]).filter(t => t.caja===id);
  lista.forEach((tareaObj) => {
    const contenedorTarea = document.createElement("div");
    contenedorTarea.style.display = "flex";
    contenedorTarea.style.alignItems = "center";
    contenedorTarea.style.margin = "3px 0";

    const boton = document.createElement("button");
    boton.textContent = tareaObj.tarea;
    boton.title = tareaObj.tarea;
    boton.className = `task-button ${clase} ${tareaObj.completada ? "completed" : ""} ${tareaObj.fueraOficina ? "fuera-oficina" : ""}`;
    boton.style.flex = "1";

    // Obtener índice de caja desde el div actual (seguro)
    const cajaIndex = Number(div.dataset.index);

    // Aplicar estilo inicial según estado
    if(tareaObj.completada){
      boton.style.backgroundColor = "var(--color-verde)";
      boton.style.color = "var(--color-verde-texto)";
    } else {
      switch(cajaIndex){
        case 0:
        case 1:
          boton.style.backgroundColor = "var(--gris-claro)";
          boton.style.color = "#333";
          break;
        case 2:
          boton.style.backgroundColor = "var(--rojo-pastel)";
          boton.style.color = "#a33";
          break;
        case 3:
          boton.style.backgroundColor = "var(--naranjo-pastel)";
          boton.style.color = "#b55a2a";
          break;
        case 4:
          boton.style.backgroundColor = "var(--amarillo-pastel)";
          boton.style.color = "#aa8800";
          break;
        default:
          boton.style.backgroundColor = "var(--color-secundario)";
          boton.style.color = "#fff";
      }
    }

    boton.onclick = () => { 
      if(!modoEdicion){ 
        boton.classList.toggle("completed"); 
        tareaObj.completada = boton.classList.contains("completed"); 

        if(tareaObj.completada){
          boton.style.backgroundColor = "var(--color-verde)";
          boton.style.color = "var(--color-verde-texto)";
        } else {
          switch(cajaIndex){
            case 0:
            case 1:
              boton.style.backgroundColor = "var(--gris-claro)";
              boton.style.color = "#333";
              break;
            case 2:
              boton.style.backgroundColor = "var(--rojo-pastel)";
              boton.style.color = "#a33";
              break;
            case 3:
              boton.style.backgroundColor = "var(--naranjo-pastel)";
              boton.style.color = "#b55a2a";
              break;
            case 4:
              boton.style.backgroundColor = "var(--amarillo-pastel)";
              boton.style.color = "#aa8800";
              break;
            default:
              boton.style.backgroundColor = "var(--color-secundario)";
              boton.style.color = "#fff";
          }
        }

        guardarTodo(); 
        actualizarHistorial(); 
        actualizarGraficos(); 
      }
    };

    // Botón eliminar tarea (3 opciones)
    const btnEliminar = document.createElement("button");
    btnEliminar.textContent = "❌"; 
    btnEliminar.title = "Eliminar tarea";
    btnEliminar.className = "btn-eliminar-tarea";
    btnEliminar.style.marginLeft = "5px";
    btnEliminar.style.display = modoEdicion ? "inline-block" : "none";
    btnEliminar.onclick = () => {
      const opcion = prompt("¿Eliminar la tarea?\n1 = solo este día\n2 = todas las semanas en este día\n3 = todos los días");
      if (opcion === "1") eliminarTarea(tareaObj, "hoy", viewDate);
      else if (opcion === "2") eliminarTarea(tareaObj, "todas", viewDate);
      else if (opcion === "3") eliminarTarea(tareaObj, "todos", viewDate);
    };

    // Botón mover tarea (muestra input fecha inline)
    const btnMover = document.createElement("button");
    btnMover.textContent = "➡️"; 
    btnMover.title = "Mover tarea a otra fecha";
    btnMover.className = "btn-mover-tarea";
    btnMover.style.marginLeft = "5px";
    btnMover.style.display = modoEdicion ? "inline-block" : "none";

    const inputFecha = document.createElement("input");
    inputFecha.type = "date"; 
    inputFecha.className = "fecha-input";
    inputFecha.style.marginLeft = "5px";
    btnMover.onclick = () => { 
      inputFecha.classList.add("visible"); 
      inputFecha.focus(); 
    };
    inputFecha.addEventListener("change", () => {
      const fechaDestino = inputFecha.value;
      if(fechaDestino){
        if(!datosGuardados[fechaDestino]) datosGuardados[fechaDestino] = [];
        const nueva = {...tareaObj};
        nueva.key = `cal-${Date.now()}-${Math.random().toString(36).substr(2,5)}`;
        datosGuardados[fechaDestino].push(nueva);
        eliminarTarea(tareaObj, "hoy", viewDate);
        guardarTodo();
        renderAllColumns(currentViewDate);
        actualizarHistorial();
        actualizarGraficos();
        inputFecha.classList.remove("visible");
        inputFecha.value = "";
      }
    });

    boton.draggable = true;
    boton.dataset.key = tareaObj.key;
    boton.addEventListener("dragstart", (e) => { e.dataTransfer.setData("text/plain", tareaObj.key); });

    contenedorTarea.appendChild(boton);
    contenedorTarea.appendChild(btnEliminar);
    contenedorTarea.appendChild(btnMover);
    contenedorTarea.appendChild(inputFecha);
    div.appendChild(contenedorTarea);
  });

  // Soporte drag/drop
  div.addEventListener("dragover", e => e.preventDefault());
  div.addEventListener("drop", e => {
    e.preventDefault();
    const key = e.dataTransfer.getData("text/plain");
    const tarea = (datosGuardados[viewDate]||[]).find(t => t.key===key);
    if(!tarea) return;
    tarea.caja = id;
    guardarTodo();
    renderAllColumns(currentViewDate);
    actualizarGraficos();
  });

  // Botón agregar tarea (actúa en viewDate)
  const addBtn = document.createElement("button");
  addBtn.textContent = "➕ Agregar tarea";
  addBtn.className = "add-task-btn";
  addBtn.style.display = modoEdicion ? "inline-block" : "none";
  addBtn.onclick = ()=>{
    const nueva = prompt("Nombre de la nueva tarea:");
    if(!nueva || nueva.toLowerCase()==="inactividad") return alert("No se puede agregar tarea 'Inactividad'.");
    const opcion = prompt("¿Cómo quieres agregar la tarea?\n1 = Solo hoy\n2 = Repetir semanalmente\n3 = Todos los días");
    const key = `cal-${Date.now()}`;
    if(!datosGuardados[viewDate]) datosGuardados[viewDate] = [];
    datosGuardados[viewDate].push({tarea:nueva,hora:"--:--",key,caja:id, completada:false});

    if(opcion==="2"){ 
      const dia = obtenerDiaSemana(viewDate);
      if(!tareasPorDiaUser[dia]) tareasPorDiaUser[dia]={};
      if(!tareasPorDiaUser[dia][id]) tareasPorDiaUser[dia][id]=[];
      if(!tareasPorDiaUser[dia][id].includes(nueva)) tareasPorDiaUser[dia][id].push(nueva);
    } else if(opcion==="3"){ 
      diasSemana.forEach(dia=>{
        if(!tareasPorDiaUser[dia]) tareasPorDiaUser[dia]={};
        if(!tareasPorDiaUser[dia][id]) tareasPorDiaUser[dia][id]=[];
        if(!tareasPorDiaUser[dia][id].includes(nueva)) tareasPorDiaUser[dia][id].push(nueva);
      });
    }

    guardarTodo();
    renderAllColumns(currentViewDate);
    actualizarHistorial();
    actualizarGraficos();
  };
  div.appendChild(addBtn);

  return div;
}

// ================== Render columnas ==================
function renderAllColumns(viewDate = currentViewDate){
  currentViewDate = viewDate || currentViewDate;

  ensureRecurrentTasksForDate(currentViewDate);
  actualizarEncabezado(currentViewDate);

  limpiarContenedor();
  reflowGridColumns();

  const cont = document.getElementById("contenedorTareas");
  columnasDef.forEach((col, idx)=>{
    const columnaDOM = crearColumnaDOM(col, currentViewDate);
    // asegurar dataset.index correcto (por si columnasDef fue modificada)
    columnaDOM.dataset.index = idx;
    if(cont) cont.appendChild(columnaDOM);
  });

  document.querySelectorAll(".add-task-btn,.del-col-btn").forEach(b => b.style.display = modoEdicion ? "inline-block" : "none");
  document.querySelectorAll(".btn-eliminar-tarea,.btn-mover-tarea").forEach(b => b.style.display = modoEdicion ? "inline-block" : "none");

  if(currentViewDate !== hoyStr){
    agregarBotonVolverHoy();
  } else {
    quitarBotonVolverHoy();
  }
  llenarSelectCaja();
}

// ================== Eliminar tarea ==================
function eliminarTarea(tareaObj,modo, fecha = currentViewDate){
  if((modo === "hoy" || modo === "todos") && datosGuardados[fecha]){
    datosGuardados[fecha] = (datosGuardados[fecha]||[]).filter(t=>t.key!==tareaObj.key);
    if(datosGuardados[fecha].length === 0) delete datosGuardados[fecha];
  }

  if(modo === "todas"){
    const diaNombre = obtenerDiaSemana(fecha);
    if(tareasPorDiaUser[diaNombre] && tareasPorDiaUser[diaNombre][tareaObj.caja]){
      tareasPorDiaUser[diaNombre][tareaObj.caja] = tareasPorDiaUser[diaNombre][tareaObj.caja].filter(t => t !== tareaObj.tarea);
      if(tareasPorDiaUser[diaNombre][tareaObj.caja].length === 0) delete tareasPorDiaUser[diaNombre][tareaObj.caja];
    }
    Object.keys(datosGuardados).forEach(f => {
      if(obtenerDiaSemana(f) === diaNombre){
        datosGuardados[f] = datosGuardados[f].filter(t => !(t.tarea === tareaObj.tarea && t.caja === tareaObj.caja));
        if(datosGuardados[f].length === 0) delete datosGuardados[f];
      }
    });
  } else if(modo === "todos"){
    Object.keys(tareasPorDiaUser).forEach(d => {
      if(tareasPorDiaUser[d] && tareasPorDiaUser[d][tareaObj.caja]){
        tareasPorDiaUser[d][tareaObj.caja] = tareasPorDiaUser[d][tareaObj.caja].filter(t=>t!==tareaObj.tarea);
        if(tareasPorDiaUser[d][tareaObj.caja].length === 0) delete tareasPorDiaUser[d][tareaObj.caja];
      }
    });
    Object.keys(datosGuardados).forEach(f => {
      datosGuardados[f] = datosGuardados[f].filter(t => !(t.tarea === tareaObj.tarea && t.caja === tareaObj.caja));
      if(datosGuardados[f].length === 0) delete datosGuardados[f];
    });
  }

  guardarTodo();
  renderAllColumns(currentViewDate);
  actualizarHistorial();
  actualizarGraficos();
}

// ================== Historial ==================
function actualizarHistorial() {
  const historialEl = document.getElementById("historial");
  if (!historialEl) return;
  historialEl.innerHTML = "";

  const registros = datosGuardados;
  let fechas = Object.keys(registros).sort((a,b)=>new Date(a)-new Date(b));
  let fechaInicio = fechas.length > 0 ? fechas[0] : hoyStr;
  let fechaActual = dateFromISO(hoyStr);

  let f = new Date(fechaActual);
  const inicio = dateFromISO(fechaInicio);

  while(f >= inicio){
    const fechaISO = dateToISO(f);
    const diaSemana = obtenerDiaSemana(fechaISO);

    if(diaSemana !== "Sábado" && diaSemana !== "Domingo"){
      const lista = registros[fechaISO] || [];

      let claseIcono;
      if(lista.length === 0){
        claseIcono = "fuera";
      } else {
        const completas = lista.filter(t => t.completada).length;
        if(completas === 0){
          claseIcono = "incompleto";
        } else if(completas === lista.length){
          claseIcono = "ok";
        } else {
          claseIcono = "incompleto";
        }
      }

      const dia = String(f.getDate()).padStart(2,"0");
      const mes = String(f.getMonth()+1).padStart(2,"0");
      const anio = f.getFullYear();
      const fechaFormateada = `${diaSemana} ${dia}-${mes}-${anio}`;

      const divDia = document.createElement("div");
      divDia.className = "historial-dia";
      divDia.innerHTML = `<strong>${fechaFormateada}</strong> <span class="historial-tarea ${claseIcono}"></span>`;
      historialEl.appendChild(divDia);
    }
    f.setDate(f.getDate()-1);
  }
}

// ================== Tareas automáticas para hoy (inicio) ==================
function cargarTareasDiaActual(){
  const dia = obtenerDiaSemana(hoyStr);
  if(tareasPorDiaUser[dia]){
    Object.keys(tareasPorDiaUser[dia]).forEach(caja=>{
      const tareas = tareasPorDiaUser[dia][caja];
      if(!datosGuardados[hoyStr]) datosGuardados[hoyStr]=[];
      tareas.forEach(t=>{
        if(!datosGuardados[hoyStr].some(e=>e.tarea===t && e.caja===caja)){
          const key = `auto-${Date.now()}-${Math.random().toString(36).substr(2,5)}`;
          datosGuardados[hoyStr].push({tarea:t,completada:false,caja:caja,key});
        }
      });
    });
  }
  guardarTodo();
}

// ================== Notas ==================
function cargarNotas() {
  const notasEl = document.getElementById("notasDia");
  if (!notasEl) return;

  const notasGuardadas = localStorage.getItem(KEY_NOTAS);
  if (notasGuardadas !== null) {
    notasEl.value = notasGuardadas;
  }

  notasEl.addEventListener("input", () => {
    localStorage.setItem(KEY_NOTAS, notasEl.value);
  });
}

// ================== Bloque Gráficos Mejorado ==================
let graficoCumplimiento, graficoHoras;

function crearGraficos() {
  const ctxCumplimientoEl = document.getElementById('graficoCumplimiento');
  const ctxHorasEl = document.getElementById('graficoHoras');
  if (!ctxCumplimientoEl || !ctxHorasEl) return;

  const ctxCumplimiento = ctxCumplimientoEl.getContext('2d');
  const ctxHoras = ctxHorasEl.getContext('2d');

  if (graficoCumplimiento) try { graficoCumplimiento.destroy(); } catch(e){}
  if (graficoHoras) try { graficoHoras.destroy(); } catch(e){}

  graficoCumplimiento = new Chart(ctxCumplimiento, {
    type: document.getElementById('tipoGraficoCumplimiento')?.value || 'bar',
    data: { labels: [], datasets: [{ label: 'Cumplimiento %', data: [], backgroundColor: '#1976d2' }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: true } },
      scales: { y: { beginAtZero: true, max: 100, title: { display: true, text: "%" } } }
    }
  });

  graficoHoras = new Chart(ctxHoras, {
    type: document.getElementById('tipoGraficoHoras')?.value || 'line',
    data: { labels: [], datasets: [{ label: 'Horas registradas', data: [], borderColor: '#1976d2', fill: false }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: true } },
      scales: {
        y: {
          min: 8,
          max: 17,
          title: { display: true, text: "Horas" }
        }
      }
    }
  });

  actualizarGraficos();
}

function obtenerSemanas(fechaInicio, fechaFin) {
  const semanas = [];
  let inicio = new Date(fechaInicio);
  inicio.setHours(0,0,0,0);

  while (inicio <= fechaFin) {
    let lunes = new Date(inicio);
    while (lunes.getDay() !== 1) lunes.setDate(lunes.getDate() + 1);
    let domingo = new Date(lunes);
    domingo.setDate(domingo.getDate() + 6);
    if (domingo > fechaFin) domingo = new Date(fechaFin);

    semanas.push({ inicio: new Date(lunes), fin: new Date(domingo) });
    inicio = new Date(domingo);
    inicio.setDate(inicio.getDate() + 1);
  }
  return semanas;
}

function generarDatosCumplimiento(rango) {
  const hoy = dateFromISO(getHoyStr());
  let labels = [];
  let datos = [];

  if (rango === 'dia') { // última semana diaria
    for (let i = 6; i >= 0; i--) {
      const dia = new Date(hoy);
      dia.setDate(hoy.getDate() - i);
      const fechaISO = dateToISO(dia);
      labels.push(fechaISO);
      const tareas = datosGuardados[fechaISO] || [];
      const total = tareas.length;
      const completadas = tareas.filter(t => t.completada).length;
      datos.push(total === 0 ? 0 : Math.round((completadas / total) * 100));
    }
  } else if (rango === 'semana') { // último mes agrupado por semana
    const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
    const semanas = obtenerSemanas(primerDia, ultimoDia);
    semanas.forEach(s => {
      labels.push(`${dateToISO(s.inicio)} - ${dateToISO(s.fin)}`);
      let tareasSemana = 0, completadasSemana = 0;
      Object.keys(datosGuardados).forEach(f => {
        const fecha = dateFromISO(f);
        if(fecha >= s.inicio && fecha <= s.fin) {
          const tareas = datosGuardados[f];
          tareasSemana += tareas.length;
          completadasSemana += tareas.filter(t => t.completada).length;
        }
      });
      datos.push(tareasSemana === 0 ? 0 : Math.round((completadasSemana / tareasSemana) * 100));
    });
  } else if (rango === 'mes') { // último año agrupado por mes
    for(let m=0; m<12; m++){
      labels.push(`${m+1}/${hoy.getFullYear()}`);
      let tareasMes = 0, completadasMes = 0;
      Object.keys(datosGuardados).forEach(f => {
        const fecha = dateFromISO(f);
        if(fecha.getMonth() === m && fecha.getFullYear() === hoy.getFullYear()){
          const tareas = datosGuardados[f];
          tareasMes += tareas.length;
          completadasMes += tareas.filter(t => t.completada).length;
        }
      });
      datos.push(tareasMes === 0 ? 0 : Math.round((completadasMes / tareasMes) * 100));
    }
  }

  if(labels.length === 0){ labels=['Sin datos']; datos=[0]; }
  return { labels, datos };
}

function generarDatosHoras(rango) {
  const hoy = dateFromISO(getHoyStr());
  let labels = [];
  let datos = [];

  if(rango === 'dia'){ // última semana diaria
    for(let i=6;i>=0;i--){
      const dia = new Date(hoy);
      dia.setDate(hoy.getDate() - i);
      const fechaISO = dateToISO(dia);
      labels.push(fechaISO);
      const horasDia = registroHoras.filter(r=>r.fecha===fechaISO).reduce((acc,r)=>acc+r.horas,0);
      datos.push(horasDia);
    }
  } else if(rango==='semana'){ // último mes agrupado por semana
    const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(),1);
    const ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth()+1,0);
    const semanas = obtenerSemanas(primerDia,ultimoDia);
    semanas.forEach(s=>{
      labels.push(`${dateToISO(s.inicio)} - ${dateToISO(s.fin)}`);
      const horasSemana = registroHoras
        .filter(r=>{const f=dateFromISO(r.fecha); return f>=s.inicio && f<=s.fin;})
        .reduce((acc,r)=>acc+r.horas,0);
      datos.push(horasSemana);
    });
  } else if(rango==='mes'){ // último año agrupado por mes
    for(let m=0;m<12;m++){
      labels.push(`${m+1}/${hoy.getFullYear()}`);
      const horasMes = registroHoras
        .filter(r=>{const f=dateFromISO(r.fecha); return f.getMonth()===m && f.getFullYear()===hoy.getFullYear();})
        .reduce((acc,r)=>acc+r.horas,0);
      datos.push(horasMes);
    }
  }

  if(labels.length===0){ labels=['Sin datos']; datos=[0]; }
  return { labels, datos };
}

// ================== Actualizar gráficos ==================
function actualizarGraficos() {
  if (!graficoCumplimiento || !graficoHoras) return;

  const rangoC = document.getElementById('rangoGraficoCumplimiento')?.value || 'semana';
  const tipoC = document.getElementById('tipoGraficoCumplimiento')?.value || 'bar';
  const rangoH = document.getElementById('rangoGraficoHoras')?.value || 'semana';
  const tipoH = document.getElementById('tipoGraficoHoras')?.value || 'line';

  const dataC = generarDatosCumplimiento(rangoC);
  graficoCumplimiento.data.labels = dataC.labels;
  graficoCumplimiento.data.datasets[0].data = dataC.datos;
  graficoCumplimiento.type = tipoC;
  graficoCumplimiento.update();

  const dataH = generarDatosHoras(rangoH);
  graficoHoras.data.labels = dataH.labels;
  graficoHoras.data.datasets[0].data = dataH.datos;
  graficoHoras.type = tipoH;
  graficoHoras.update();
}

// ================== Inicializar gráficos solo si el contenedor es visible ==================
function mostrarGraficosSiEsVisible() {
  const cont = document.getElementById('contenedorGraficos');
  if (!cont) return;
  if (cont.classList.contains('show')) {
    if (!graficoCumplimiento || !graficoHoras) {
      crearGraficos();
    } else {
      graficoCumplimiento.resize();
      graficoHoras.resize();
    }
  }
}

// ================== Modificar toggleElemento para graficos ==================
function toggleElemento(tituloId, contenedorId) {
  const titulo = document.getElementById(tituloId);
  const cont = document.getElementById(contenedorId);
  const visible = cont.classList.contains("show");

  cont.classList.toggle("show", !visible);
  titulo.classList.toggle("abierto", !visible);
  cont.setAttribute("aria-hidden", visible);

  if (contenedorId === 'contenedorGraficos' && !visible) {
    setTimeout(() => mostrarGraficosSiEsVisible(), 350);
  }
}

// ================== Calendario ==================
function agregarBotonVolverHoy(){
  if(document.getElementById("btnVolverHoy")) return;
  const btn = document.createElement("button");
  btn.id = "btnVolverHoy";
  btn.textContent = "⏪ Volver al día actual";
  btn.style.margin = "10px";
  btn.onclick = ()=>{
    currentViewDate = hoyStr;
    renderAllColumns(hoyStr);
    quitarBotonVolverHoy();
  };
  const cont = document.getElementById("contenedorTareas");
  if(cont && cont.parentNode) cont.parentNode.insertBefore(btn, cont);
}
function quitarBotonVolverHoy(){
  const b = document.getElementById("btnVolverHoy");
  if(b) b.remove();
}

let irFechaClickState = false;
let selectedFechaTemp = null;

function irAFechaSeleccionada() {
  const fechaInput = document.getElementById("fechaSeleccion");
  if(!fechaInput) return;
  if(!irFechaClickState){
    fechaInput.classList.add("visible");
    fechaInput.focus();
    selectedFechaTemp = fechaInput.value || null;
    irFechaClickState = true;
  } else {
    const fecha = fechaInput.value || selectedFechaTemp;
    if(!fecha) return alert("Selecciona una fecha.");
    currentViewDate = fecha;
    renderAllColumns(fecha);
    actualizarHistorial();
    actualizarGraficos();
    const cont = document.getElementById("contenedorTareas");
    if(cont) cont.scrollIntoView({behavior:"smooth", block:"start"});
    fechaInput.classList.remove("visible");
    fechaInput.value = "";
    selectedFechaTemp = null;
    irFechaClickState = false;
  }
}

// ================== Inicialización y eventos DOM ==================
document.addEventListener("DOMContentLoaded", () => {
  cargarNotas();
  cargarTareasDiaActual();
  llenarSelectCaja();
  crearGraficos(); // inicializar gráficos inicialmente (si existen canvases)
  renderAllColumns(hoyStr);
  actualizarHistorial();
  actualizarGraficos();

  const fechaInput = document.getElementById("fechaSeleccion");
  const btnAddFecha = document.getElementById("btnAddFecha");
  const btnAddFija = document.getElementById("btnAddFija");
  const btnAddTodosDias = document.getElementById("btnAddTodosDias");
  const inputNuevaTarea = document.getElementById("nuevaTareaCalendario");
  const selectCaja = document.getElementById("selectCaja");
  const contCalendario = document.getElementById("contenedorCalendario");
  const btnSeleccionarFecha = document.getElementById("btnSeleccionarFecha");
  const btnIrFecha = document.getElementById("btnIrFecha");

  if(btnAddFija) btnAddFija.style.display = "none";
  if(btnAddTodosDias) btnAddTodosDias.style.display = "none";

  if(fechaInput){
    fechaInput.addEventListener("change", (e)=>{
      const fecha = e.target.value;
      selectedFechaTemp = fecha || null;
    });
  }

  if(btnAddFecha){
    btnAddFecha.addEventListener("click", ()=>{
      const fecha = fechaInput?.value;
      const tarea = (inputNuevaTarea?.value || "").trim();
      const caja = selectCaja?.value;
      if(!fecha) return alert("Selecciona una fecha.");
      if(!tarea || !caja) return alert("Debes indicar caja y nombre de tarea.");
      if(!datosGuardados[fecha]) datosGuardados[fecha] = [];
      const key = `cal-${Date.now()}-${Math.random().toString(36).substr(2,5)}`;
      datosGuardados[fecha].push({tarea, completada:false, caja, key});
      guardarTodo();
      if(currentViewDate === fecha) renderAllColumns(fecha);
      actualizarHistorial();
      actualizarGraficos();
      alert(`✅ "${tarea}" agregada a ${fecha} en caja ${caja}`);
      if(inputNuevaTarea) inputNuevaTarea.value = "";
      if(fecha !== hoyStr) agregarBotonVolverHoy();
    });
  }

  if(contCalendario && fechaInput){
    contCalendario.addEventListener("click", (e) => {
      if(e.target.tagName !== "INPUT" && e.target.tagName !== "BUTTON"){
        fechaInput.focus();
        try { fechaInput.click(); } catch(e){ /* no crítico */ }
      }
    });
  }

  if(btnSeleccionarFecha) btnSeleccionarFecha.addEventListener("click", irAFechaSeleccionada);
  if(btnIrFecha && !btnSeleccionarFecha) btnIrFecha.addEventListener("click", irAFechaSeleccionada);
});
