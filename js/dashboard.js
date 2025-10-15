// dashboard.js
const GRADOS = [
  "Parvularia","1°","2°","3°","4°","5°","6°","7°","8°","9°","Bachillerato"
];
const APP_KEY = "control_academico_v1";

if (!sessionStorage.getItem("logged")) {
  window.location.href = "index.html";
}

function loadStore(){
  const raw = localStorage.getItem(APP_KEY);
  if(!raw){
    const base = { students: {}, attendance: {}, notes: {} };
    localStorage.setItem(APP_KEY, JSON.stringify(base));
    return base;
  }
  return JSON.parse(raw);
}
function saveStore(data){ localStorage.setItem(APP_KEY, JSON.stringify(data)); }

let store = loadStore();

/* Mostrar grados */
const gradesList = document.getElementById("grades-list");
function renderGrades(){
  gradesList.innerHTML = "";
  GRADOS.forEach(grado => {
    const div = document.createElement("div");
    div.className = "grade-card";
    div.innerHTML = `
      <h4>${grado}</h4>
      <p class="muted small">${(store.students[grado] || []).length} estudiante(s)</p>
      <div class="row">
        <button class="btn small" onclick="goTo('asistencia.html','${grado}')">Asistencia</button>
        <button class="btn small outline" onclick="goTo('notas.html','${grado}')">Notas</button>
      </div>
    `;
    gradesList.appendChild(div);
  });
}
renderGrades();

/* Llenar selector */
const sel = document.getElementById("select-grade");
GRADOS.forEach(g=>{
  const opt = document.createElement("option");
  opt.value = g; opt.textContent = g;
  sel.appendChild(opt);
});

/* Agregar estudiante */
document.getElementById("btn-add-student").addEventListener("click", ()=>{
  const grade = sel.value;
  const name = document.getElementById("new-student").value.trim();
  if(!name) return alert("Ingrese el nombre del estudiante.");
  if(!store.students[grade]) store.students[grade] = [];
  store.students[grade].push({ id: `${grade}-${Date.now()}`, name });
  saveStore(store);
  document.getElementById("new-student").value = "";
  renderGrades();
});

/* Navegar con el grado */
function goTo(page, grade){
  sessionStorage.setItem("currentGrade", grade);
  window.location.href = page;
}

/* Logout */
document.getElementById("btn-logout").addEventListener("click", ()=>{
  sessionStorage.removeItem("logged");
  window.location.href = "index.html";
});
