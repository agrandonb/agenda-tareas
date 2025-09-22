// ================== Fecha y encabezado ==================
const diasSemana = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
const hoy = new Date();
const hoyStr = hoy.toISOString().split("T")[0];
const diaNombre = diasSemana[hoy.getDay()];
document.getElementById("diaSemana").textContent = `${diaNombre} - ${hoyStr}`;

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
  const notasEl = document.getElementById("notasDia");
  if(notasEl) localStorage.setItem(KEY_NOTAS, notasEl.value);
}

// ================== Util ==================
function limpiarContenedor(){ document.getElementById("contenedorTareas").innerHTML=""; }
function reflowGridColumns(){ 
  const cont = document.getElementById("contenedorTareas"); 
  if(cont) cont.style.gridTemplateColumns=`repeat(${columnasDef.length},1fr)`; 
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
};
document.getElementById("botonEditarContainer")?.appendChild(botonEditar);

// ================== Crear columna y tareas ==================
function crearColumnaDOM(colDef){
  const {id,titulo,clase} = colDef;
  const div=document.createElement("div");
  div.className="caja";
  div.dataset.colId=id;

  // Título editable
  const h2 = document.createElement("h2");
  h2.textContent = (edicionesGuardadas[hoyStr]?.titulos?.[id])||titulo;
  h2.ondblclick = ()=>{ if(!modoEdicion) return;
    const nuevo=prompt("Editar título:", h2.textContent);
    if(nuevo!==null){
      h2.textContent=nuevo;
      if(!edicionesGuardadas[hoyStr]) edicionesGuardadas[hoyStr]={titulos:{},tareas:{}};
      edicionesGuardadas[hoyStr].titulos[id]=nuevo;
      guardarTodo();
    }
  };
  div.appendChild(h2);

  // Botón eliminar columna
  const delColBtn = document.createElement("button");
  delColBtn.textContent="Eliminar caja";
  delColBtn.className="del-col-btn";
  delColBtn.style.display = modoEdicion?"inline-block":"none";
  delColBtn.onclick = ()=>{ if(!confirm(`Eliminar la caja "${h2.textContent}"?`)) return; columnasDef = columnasDef.filter(c=>c.id!==id); guardarTodo(); renderAllColumns(); actualizarGraficos(); };
  div.appendChild(delColBtn);

  // Lista tareas de hoy
  const lista = (datosGuardados[hoyStr]||[]).filter(t=>t.caja===id);
  lista.forEach((tareaObj)=>{
    const contenedorTarea = document.createElement("div");
    contenedorTarea.style.display="flex";
    contenedorTarea.style.alignItems="center";
    contenedorTarea.style.margin="3px 0";

    const boton = document.createElement("button");
    boton.textContent = tareaObj.tarea;
    boton.title = tareaObj.tarea;
    boton.className=`task-button ${clase} ${tareaObj.completada?"completed":""} ${tareaObj.fueraOficina?"fuera-oficina":""}`;
    boton.style.flex="1";
    boton.onclick=()=>{ if(!modoEdicion){ 
      boton.classList.toggle("completed"); 
      tareaObj.completada = boton.classList.contains("completed"); 
      guardarTodo(); 
      actualizarHistorial(); 
      actualizarGraficos(); 
    }};

    const btnEliminar = document.createElement("button");
    btnEliminar.textContent = "❌"; btnEliminar.title = "Eliminar tarea";
    btnEliminar.className = "btn-eliminar-tarea";
    btnEliminar.style.marginLeft = "5px";
    btnEliminar.style.display = modoEdicion ? "inline-block" : "none";
    btnEliminar.onclick = () => {
      const opcion = prompt("¿Eliminar la tarea?\n1 = solo este día\n2 = todas las semanas en este día");
      if (opcion === "1") eliminarTarea(tareaObj, "hoy");
      else if (opcion === "2") eliminarTarea(tareaObj, "todas");
    };

    const btnMover = document.createElement("button");
    btnMover.textContent = "➡️"; btnMover.title = "Mover tarea a otra fecha";
    btnMover.className = "btn-mover-tarea";
    btnMover.style.marginLeft = "5px";
    btnMover.style.display = modoEdicion ? "inline-block" : "none";

    const inputFecha = document.createElement("input");
    inputFecha.type = "date"; inputFecha.style.display="none"; inputFecha.style.marginLeft="5px";
    btnMover.onclick = ()=>{ inputFecha.style.display="inline-block"; inputFecha.focus(); };
    inputFecha.addEventListener("change", ()=>{
      const fechaDestino = inputFecha.value;
      if(fechaDestino){
        if(!datosGuardados[fechaDestino]) datosGuardados[fechaDestino]=[];
        datosGuardados[fechaDestino].push({...tareaObj});
        eliminarTarea(tareaObj,"hoy");
        guardarTodo();
        renderAllColumns();
        actualizarHistorial();
        actualizarGraficos();
        inputFecha.style.display="none"; inputFecha.value="";
      }
    });

    boton.draggable=true;
    boton.dataset.key=tareaObj.key;
    boton.addEventListener("dragstart",(e)=>{ e.dataTransfer.setData("text/plain",tareaObj.key); });

    contenedorTarea.appendChild(boton);
    contenedorTarea.appendChild(btnEliminar);
    contenedorTarea.appendChild(btnMover);
    contenedorTarea.appendChild(inputFecha);
    div.appendChild(contenedorTarea);
  });

  div.addEventListener("dragover", e=>e.preventDefault());
  div.addEventListener("drop", e=>{
    e.preventDefault();
    const key = e.dataTransfer.getData("text/plain");
    const tarea = datosGuardados[hoyStr]?.find(t=>t.key===key);
    if(!tarea) return;
    tarea.caja=id;
    guardarTodo();
    renderAllColumns();
    actualizarGraficos();
  });

  // Botón agregar tarea
  const addBtn = document.createElement("button");
  addBtn.textContent="➕ Agregar tarea";
  addBtn.className="add-task-btn";
  addBtn.style.display = modoEdicion?"inline-block":"none";
  addBtn.onclick = ()=>{
    const nueva = prompt("Nombre de la nueva tarea:");
    if(!nueva || nueva.toLowerCase()==="inactividad") return alert("No se puede agregar tarea 'Inactividad'.");
    const opcion = prompt("¿Cómo quieres agregar la tarea?\n1 = Solo hoy\n2 = Repetir semanalmente\n3 = Todos los días");
    const key = `cal-${Date.now()}`;
    if(!datosGuardados[hoyStr]) datosGuardados[hoyStr]=[];
    datosGuardados[hoyStr].push({tarea:nueva,hora:"--:--",key,caja:id});

    if(opcion==="2"){ 
      const dia = diasSemana[new Date(hoyStr).getDay()];
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
    renderAllColumns();
    actualizarHistorial();
    actualizarGraficos();
  };
  div.appendChild(addBtn);

  return div;
}

// ================== Render columnas ==================
function renderAllColumns(){
  limpiarContenedor();
  reflowGridColumns();
  columnasDef.forEach(col=>{
    const cont = document.getElementById("contenedorTareas");
    if(cont) cont.appendChild(crearColumnaDOM(col));
  });
  document.querySelectorAll(".add-task-btn,.del-col-btn").forEach(b => b.style.display = modoEdicion ? "inline-block" : "none");
  document.querySelectorAll(".btn-eliminar-tarea,.btn-mover-tarea").forEach(b => b.style.display = modoEdicion ? "inline-block" : "none");
}

// ================== Eliminar tarea ==================
function eliminarTarea(tareaObj,modo){
  datosGuardados[hoyStr] = (datosGuardados[hoyStr]||[]).filter(t=>t.key!==tareaObj.key);
  if(modo==="todas"){
    const dia = diasSemana[new Date(hoyStr).getDay()];
    if(tareasPorDiaUser[dia] && tareasPorDiaUser[dia][tareaObj.caja]){
      tareasPorDiaUser[dia][tareaObj.caja] = tareasPorDiaUser[dia][tareaObj.caja].filter(t=>t!==tareaObj.tarea);
    }
  }
  guardarTodo();
  renderAllColumns();
  actualizarHistorial();
  actualizarGraficos();
}

function actualizarHistorial() {
  const historialEl = document.getElementById("historial");
  if (!historialEl) return;
  historialEl.innerHTML = "";

  const registros = JSON.parse(localStorage.getItem(KEY_REGISTRO) || "{}");
  const fechas = Object.keys(registros).sort((a, b) => new Date(b) - new Date(a));

  const diasSemana = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

  fechas.forEach(fechaStr => {
    const fechaObj = new Date(fechaStr);
    const diaSemana = diasSemana[fechaObj.getDay()];

    // Solo lunes a viernes
    if (diaSemana === "Sábado" || diaSemana === "Domingo") return;

    const lista = registros[fechaStr] || [];

    let icono;
    if (lista.length === 0) {
      icono = "🏖️"; // ninguna tarea registrada
    } else {
      const completas = lista.filter(t => t.completada).length;
      if (completas === 0) {
        icono = "🏖️"; // ninguna tarea marcada
      } else if (completas === lista.length) {
        icono = "✅"; // todas completas
      } else {
        icono = "❌"; // incompleto
      }
    }

    // Formatear fecha en formato dd-mm-yyyy
    const dia = String(fechaObj.getDate()).padStart(2, "0");
    const mes = String(fechaObj.getMonth() + 1).padStart(2, "0");
    const anio = fechaObj.getFullYear();
    const fechaFormateada = `${diaSemana} ${dia}-${mes}-${anio}`;

    // Construir fila del historial
    const divDia = document.createElement("div");
    divDia.className = "historial-dia";
    divDia.innerHTML = `<strong>${fechaFormateada}</strong> <span>${icono}</span>`;

    historialEl.appendChild(divDia);
  });
}

// ================== Tareas automáticas ==================
function cargarTareasDiaActual(){
  const dia = diasSemana[hoy.getDay()];
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

  // Guardar cuando el usuario escribe
  notasEl.addEventListener("input", () => {
    localStorage.setItem(KEY_NOTAS, notasEl.value);
  });
}

// ================== Gráficos ==================
let graficoCumplimiento, graficoHoras;
function actualizarGraficos(){
  const ctxC = document.getElementById("graficoCumplimiento")?.getContext("2d");
  const ctxH = document.getElementById("graficoHoras")?.getContext("2d");
  if(!ctxC || !ctxH) return;

  const fechas = Object.keys(datosGuardados).sort();
  const cumplimientoData = fechas.map(f=>{
    const total = datosGuardados[f]?.length || 0;
    const ok = datosGuardados[f]?.filter(t=>t.completada).length || 0;
    return total>0 ? Math.round((ok/total)*100) : 0;
  });
  const horasData = fechas.map(f=>registroHoras.filter(r=>r.fecha===f).reduce((sum,r)=>sum+r.horas,0));

  if(graficoCumplimiento) graficoCumplimiento.destroy();
  if(graficoHoras) graficoHoras.destroy();

  graficoCumplimiento = new Chart(ctxC,{
    type:"line",
    data:{labels:fechas,datasets:[{label:"% Cumplimiento",data:cumplimientoData,fill:false,borderColor:"#1976d2",tension:0.3}]},
    options:{responsive:true,plugins:{legend:{display:true}}}
  });
  graficoHoras = new Chart(ctxH,{
    type:"bar",
    data:{labels:fechas,datasets:[{label:"Horas trabajadas",data:horasData,backgroundColor:"#1976d2"}]},
    options:{responsive:true,plugins:{legend:{display:true}}}
  });
}

// ================== Inicialización ==================
document.addEventListener("DOMContentLoaded", () => {
  // Cargar notas primero
  cargarNotas();

  // Cargar tareas automáticas
  cargarTareasDiaActual();

  // Renderizar columnas, historial y gráficos
  renderAllColumns();
  actualizarHistorial();
  actualizarGraficos();
});
