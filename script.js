// ================== Fecha y encabezado ==================
const diasSemana = ["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"];

// Obtener fecha local en formato YYYY-MM-DD
function getHoyStr() {
  const hoy = new Date();
  const año = hoy.getFullYear();
  const mes = String(hoy.getMonth() + 1).padStart(2, "0");
  const dia = String(hoy.getDate()).padStart(2, "0");
  return `${año}-${mes}-${dia}`;
}

const hoyStr = getHoyStr();
let currentViewDate = hoyStr;

// ================== Función para obtener día de la semana ==================
function obtenerDiaSemana(fechaISO) {
  const fecha = new Date(fechaISO + "T00:00:00"); // aseguramos hora local
  let day = fecha.getDay(); // 0 = Domingo, 1 = Lunes, ...
  // Ajustar para que Lunes sea 0
  if (day === 0) day = 6; 
  else day = day - 1;
  return diasSemana[day];
}

// ================== Actualizar encabezado ==================
function actualizarEncabezado(fechaISO) {
  const nombre = obtenerDiaSemana(fechaISO);
  document.getElementById("diaSemana").textContent = `${nombre} - ${fechaISO}`;
}

actualizarEncabezado(hoyStr);


// ================== Storage y datos ==================
const KEY_REGISTRO   = "registroTareas";
const KEY_EDICIONES  = "ediciones";
const KEY_TAREAS_DIA = "tareasSemanales";
const KEY_COLUMNAS   = "columnasDefUser";
const KEY_REG_HORAS  = "registroHoras";
const KEY_NOTAS      = "notasFijas";

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
function limpiarContenedor(){ document.getElementById("contenedorTareas").innerHTML=""; }
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

  if(!modoEdicion){
    document.querySelectorAll('.caja input[type="date"]').forEach(input => input.classList.remove('visible'));
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

// ================== Crear columna y tareas ==================
function crearColumnaDOM(colDef, viewDate = currentViewDate){
  const {id,titulo,clase} = colDef;
  const div = document.createElement("div");
  div.className = "caja";
  div.dataset.colId = id;

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
    boton.onclick = ()=>{ 
      if(!modoEdicion){ 
        boton.classList.toggle("completed"); 
        tareaObj.completada = boton.classList.contains("completed"); 
        guardarTodo(); 
        actualizarHistorial(); 
        actualizarGraficos(); 
      }
    };

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

    const btnMover = document.createElement("button");
    btnMover.textContent = "➡️"; 
    btnMover.title = "Mover tarea a otra fecha";
    btnMover.className = "btn-mover-tarea";
    btnMover.style.marginLeft = "5px";
    btnMover.style.display = modoEdicion ? "inline-block" : "none";

    const inputFecha = document.createElement("input");
    inputFecha.type = "date"; 
    inputFecha.className = "fecha-input";
    btnMover.onclick = () => { 
      inputFecha.classList.add("visible"); 
      inputFecha.focus(); 
    };
    inputFecha.addEventListener("change", () => {
      const fechaDestino = inputFecha.value;
      if(fechaDestino){
        if(!datosGuardados[fechaDestino]) datosGuardados[fechaDestino] = [];
        datosGuardados[fechaDestino].push({...tareaObj});
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
  actualizarEncabezado(currentViewDate);

  limpiarContenedor();
  reflowGridColumns();
  columnasDef.forEach(col=>{
    const cont = document.getElementById("contenedorTareas");
    if(cont) cont.appendChild(crearColumnaDOM(col, currentViewDate));
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
    const dia = obtenerDiaSemana(fecha);
    if(tareasPorDiaUser[dia] && tareasPorDiaUser[dia][tareaObj.caja]){
      tareasPorDiaUser[dia][tareaObj.caja] = tareasPorDiaUser[dia][tareaObj.caja].filter(t=>t!==tareaObj.tarea);
    }
  } else if(modo === "todos"){
    Object.keys(tareasPorDiaUser).forEach(d => {
      if(tareasPorDiaUser[d] && tareasPorDiaUser[d][tareaObj.caja]){
        tareasPorDiaUser[d][tareaObj.caja] = tareasPorDiaUser[d][tareaObj.caja].filter(t=>t!==tareaObj.tarea);
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

  const registros = JSON.parse(localStorage.getItem(KEY_REGISTRO) || "{}");
  let fechas = Object.keys(registros).sort((a,b)=>new Date(a)-new Date(b));
  let fechaInicio = fechas.length > 0 ? fechas[0] : hoyStr;
  let fechaActual = new Date(hoyStr);

  let f = new Date(fechaActual);
  const inicio = new Date(fechaInicio);

  while(f >= inicio){
    const diaSemana = obtenerDiaSemana(f.toISOString().split("T")[0]);
    if(diaSemana !== "Sábado" && diaSemana !== "Domingo"){
      const fechaISO = f.toISOString().split("T")[0];
      const lista = registros[fechaISO] || [];

      let icono;
      if(lista.length === 0){
        icono = "🏖️";
      } else {
        const completas = lista.filter(t => t.completada).length;
        if(completas === 0){
          icono = "❌";
        } else if(completas === lista.length){
          icono = "✅";
        } else {
          icono = "❌";
        }
      }

      const dia = String(f.getDate()).padStart(2,"0");
      const mes = String(f.getMonth()+1).padStart(2,"0");
      const anio = f.getFullYear();
      const fechaFormateada = `${diaSemana} ${dia}-${mes}-${anio}`;

      const divDia = document.createElement("div");
      divDia.className = "historial-dia";
      divDia.innerHTML = `<strong>${fechaFormateada}</strong> <span>${icono}</span>`;
      historialEl.appendChild(divDia);
    }
    f.setDate(f.getDate()-1);
  }
}

// ================== Tareas automáticas ==================
function cargarTareasDiaActual(){
  const dia = obtenerDiaSemana(hoyStr);
  if(tareasPorDiaUser[dia]){
    Object.keys(tareasPorDiaUser[dia]).forEach(caja=>{
      tareasPorDiaUser[dia][caja].forEach(tarea=>{
        if(tarea.toLowerCase()!=="inactividad"){
          const key = `auto-${Date.now()}-${Math.random().toString(36).substr(2,5)}`;
          if(!datosGuardados[hoyStr]) datosGuardados[hoyStr] = [];
          const existe = datosGuardados[hoyStr].some(t=>t.tarea===tarea && t.caja===caja);
          if(!existe) datosGuardados[hoyStr].push({tarea, completada:false, caja, key});
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

let graficoCumplimiento, graficoHoras;

// Función para actualizar los gráficos
function actualizarGraficos() {
  const ctxC = document.getElementById("graficoCumplimiento")?.getContext("2d");
  const ctxH = document.getElementById("graficoHoras")?.getContext("2d");
  if (!ctxC || !ctxH) return;

  const rangoC = document.getElementById("rangoGraficoCumplimiento")?.value || "7d";
  const rangoH = document.getElementById("rangoGraficoHoras")?.value || "7d";

  const tipoC = document.getElementById("tipoGraficoCumplimiento")?.value || "line";
  const tipoH = document.getElementById("tipoGraficoHoras")?.value || "bar";

  const fechas = Object.keys(datosGuardados).sort();
  
  const cumplimientoData = fechas.map(f => {
    const total = datosGuardados[f]?.length || 0;
    const ok = datosGuardados[f]?.filter(t => t.completada).length || 0;
    return total > 0 ? Math.round((ok / total) * 100) : 0;
  });

  const horasData = fechas.map(f =>
    registroHoras.filter(r => r.fecha === f).reduce((sum, r) => sum + r.horas, 0)
  );

  if (graficoCumplimiento) graficoCumplimiento.destroy();
  if (graficoHoras) graficoHoras.destroy();

  graficoCumplimiento = new Chart(ctxC, {
    type: tipoC,
    data: { labels: fechas, datasets: [{ label: "% Cumplimiento", data: cumplimientoData, fill: false, borderColor: "#1976d2", backgroundColor: "#1976d2", tension: 0.3 }] },
    options: { responsive: true, plugins: { legend: { display: true } }, scales: { y: { beginAtZero: true, max: 100, ticks: { callback: val => val + "%" } } } }
  });

  graficoHoras = new Chart(ctxH, {
    type: tipoH,
    data: { labels: fechas, datasets: [{ label: "Horas cierre tareas", data: horasData, backgroundColor: "#1976d2", borderColor: "#1976d2", fill: tipoH === "line" ? false : true }] },
    options: { responsive: true, plugins: { legend: { display: true } }, scales: { y: { min: 8, max: 17, ticks: { stepSize: 1, callback: val => `${val}:00` } } } }
  });
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
  document.getElementById("contenedorTareas").before(btn);
}
function quitarBotonVolverHoy(){
  const b = document.getElementById("btnVolverHoy");
  if(b) b.remove();
}

// ================== Inicialización ==================
document.addEventListener("DOMContentLoaded", () => {
  cargarNotas();
  cargarTareasDiaActual();
  llenarSelectCaja();
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

  if(btnAddFija) btnAddFija.style.display = "none";
  if(btnAddTodosDias) btnAddTodosDias.style.display = "none";

  if(fechaInput){
    fechaInput.addEventListener("change", (e)=>{
      const fecha = e.target.value;
      if(!fecha) return;
      currentViewDate = fecha;
      renderAllColumns(fecha);
      actualizarHistorial();
      actualizarGraficos();
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
      const key = `cal-${Date.now()}`;
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
        fechaInput.click();
      }
    });
  }

  const btnSeleccionarFecha = document.getElementById('btnSeleccionarFecha');
  if(btnSeleccionarFecha){
    btnSeleccionarFecha.addEventListener('click', ()=>{
      if(fechaInput){
        fechaInput.classList.add('visible');
        fechaInput.focus();
      }
    });
  }
});
