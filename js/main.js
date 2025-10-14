/* main.js - SPA simple para control de asistencia y notas usando localStorage
   Autor: ChatGPT / versión inicial para Jonathan
*/

/* ---------- Config inicial ---------- */
const APP_KEY = "control_academico_v1";
const DEFAULT_USER = { user: "Docente", pass: "ugb2025" };
const GRADOS = [
  "Parvularia","1°","2°","3°","4°","5°","6°","7°","8°","9°","Bachillerato"
];
const sampleStudents = {
  "1°": [
    { id: "1-1", name: "Ana Gómez" },
    { id: "1-2", name: "Carlos Ruiz" },
    { id: "1-3", name: "Luis Martínez" }
  ],
  "2°": [
    { id: "2-1", name: "María López" },
    { id: "2-2", name: "José Hernández" }
  ]
};

/* ---------- Helpers storage ---------- */
function loadStore(){
  const raw = localStorage.getItem(APP_KEY);
  if(!raw){
    const base = { students: sampleStudents, attendance: {}, notes: {} };
    localStorage.setItem(APP_KEY, JSON.stringify(base));
    return base;
  }
  return JSON.parse(raw);
}
function saveStore(store){
  localStorage.setItem(APP_KEY, JSON.stringify(store));
}
let store = loadStore();

/* ---------- Navegación SPA ---------- */
function showPage(id){
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  const page = document.getElementById("page-"+id);
  if(page) page.classList.add("active");
}
document.addEventListener("click", (e) => {
  const nav = e.target.dataset?.nav;
  if(nav) {
    if(nav === "dashboard") showDashboard();
  }
});

/* ---------- Login ---------- */
const loginForm = document.getElementById("login-form");
loginForm.addEventListener("submit", (ev) => {
  ev.preventDefault();
  const u = document.getElementById("login-user").value.trim();
  const p = document.getElementById("login-pass").value;
  if(u === DEFAULT_USER.user && p === DEFAULT_USER.pass){
    sessionStorage.setItem("logged", "true");
    initApp();
    showDashboard();
  } else {
    alert("Credenciales incorrectas.");
  }
});

/* ---------- Logout ---------- */
document.getElementById("btn-logout").addEventListener("click", () => {
  sessionStorage.removeItem("logged");
  showPage("login");
});

/* ---------- Dashboard ---------- */
function fillGradeSelectors(){
  const sel = document.getElementById("select-grade-add");
  sel.innerHTML = "";
  GRADOS.forEach(g => {
    const opt = document.createElement("option"); opt.value = g; opt.textContent = g;
    sel.appendChild(opt);
  });
}
function showDashboard(){
  if(!sessionStorage.getItem("logged")) return showPage("login");
  showPage("dashboard");
  const container = document.getElementById("grades-list");
  container.innerHTML = "";
  GRADOS.forEach(grado => {
    const card = document.createElement("div");
    card.className = "grade-card";
    const h = document.createElement("h4"); h.textContent = grado;
    const p = document.createElement("p"); p.className = "muted small";
    const count = (store.students[grado] || []).length;
    p.textContent = `${count} estudiante(s)`;
    const row = document.createElement("div"); row.className = "row";
    const btnA = document.createElement("button"); btnA.className = "btn small"; btnA.textContent = "Asistencia";
    btnA.addEventListener("click", () => openAttendance(grado));
    const btnN = document.createElement("button"); btnN.className = "btn small outline"; btnN.textContent = "Notas";
    btnN.addEventListener("click", () => openNotes(grado));
    row.appendChild(btnA); row.appendChild(btnN);
    card.appendChild(h); card.appendChild(p); card.appendChild(row);
    container.appendChild(card);
  });

  fillGradeSelectors();
}

/* Add student quick */
document.getElementById("btn-add-student").addEventListener("click", () => {
  const grade = document.getElementById("select-grade-add").value;
  const name = document.getElementById("new-student-name").value.trim();
  if(!name){ alert("Ingresa un nombre para el estudiante."); return; }
  if(!store.students[grade]) store.students[grade] = [];
  const id = `${grade}-${Date.now()}`;
  store.students[grade].push({ id, name });
  saveStore(store);
  document.getElementById("new-student-name").value = "";
  showDashboard();
});

/* ---------- Attendance view ---------- */
let currentGrade = null;
function openAttendance(grade){
  currentGrade = grade;
  document.getElementById("attendance-grade-name").textContent = grade;
  document.getElementById("attendance-title").textContent = `Asistencia - ${grade}`;
  const today = new Date().toISOString().slice(0,10);
  document.getElementById("attendance-date").value = today;
  renderAttendanceTable();
  showPage("attendance");
}

function renderAttendanceTable(){
  const tbody = document.querySelector("#attendance-table tbody");
  tbody.innerHTML = "";
  const students = store.students[currentGrade] || [];
  const date = document.getElementById("attendance-date").value;
  students.forEach((s, idx) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${idx+1}</td><td>${s.name}</td><td></td>`;
    const td = tr.querySelector("td:nth-child(3)");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    const saved = (store.attendance?.[currentGrade]?.[date] || {})[s.id];
    checkbox.checked = !!saved;
    td.appendChild(checkbox);
    tbody.appendChild(tr);
  });
}

/* when date changes */
document.getElementById("attendance-date").addEventListener("change", renderAttendanceTable);

/* mark all present / absent */
document.getElementById("btn-mark-all-present").addEventListener("click", ()=>{
  const tbody = document.querySelectorAll("#attendance-table tbody input[type=checkbox]");
  tbody.forEach(cb => cb.checked = true);
});
document.getElementById("btn-mark-all-absent").addEventListener("click", ()=>{
  const tbody = document.querySelectorAll("#attendance-table tbody input[type=checkbox]");
  tbody.forEach(cb => cb.checked = false);
});

/* save attendance */
document.getElementById("btn-save-attendance").addEventListener("click", () => {
  const date = document.getElementById("attendance-date").value;
  if(!store.attendance) store.attendance = {};
  if(!store.attendance[currentGrade]) store.attendance[currentGrade] = {};
  const map = {};
  const students = store.students[currentGrade] || [];
  const checks = Array.from(document.querySelectorAll("#attendance-table tbody tr"));
  checks.forEach((tr, i) => {
    const cb = tr.querySelector("input[type=checkbox]");
    if(cb) map[students[i].id] = !!cb.checked;
  });
  store.attendance[currentGrade][date] = map;
  saveStore(store);
  alert("Asistencia guardada.");
});

/* export attendance CSV for selected date */
document.getElementById("btn-export-attendance").addEventListener("click", ()=>{
  const date = document.getElementById("attendance-date").value;
  const students = store.students[currentGrade] || [];
  const rows = [["Grado","Fecha","ID","Nombre","Presente"]];
  students.forEach(s => {
    const pres = (store.attendance?.[currentGrade]?.[date] || {})[s.id] ? "1" : "0";
    rows.push([currentGrade, date, s.id, s.name, pres]);
  });
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
  downloadFile(csv, `asistencia_${currentGrade}_${date}.csv`, 'text/csv');
});

/* ---------- Notes view ---------- */
function openNotes(grade){
  currentGrade = grade;
  document.getElementById("notes-grade-name").textContent = grade;
  document.getElementById("notes-title").textContent = `Notas - ${grade}`;
  renderNotesTable();
  showPage("notes");
}

function renderNotesTable(){
  const head = document.getElementById("notes-head");
  const tbody = document.querySelector("#notes-table tbody");
  tbody.innerHTML = "";

  // get assignments for grade
  const gradeNotes = store.notes[currentGrade] || { assignments: [], grades: {} };
  const assignments = gradeNotes.assignments || [];

  // build header
  head.innerHTML = `<th>#</th><th>Nombre</th>`;
  assignments.forEach(a => {
    head.innerHTML += `<th>${a}</th>`;
  });
  head.innerHTML += `<th>Prom.</th>`;

  const students = store.students[currentGrade] || [];
  students.forEach((s, idx) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${idx+1}</td><td>${s.name}</td>`;
    // grade inputs
    const studentGrades = (gradeNotes.grades[s.id] || {});
    assignments.forEach(a => {
      const td = document.createElement("td");
      const input = document.createElement("input");
      input.type = "number";
      input.min = 0; input.max = 100;
      input.value = (studentGrades[a] !== undefined) ? studentGrades[a] : "";
      input.style.width = "70px";
      input.addEventListener("input", () => { /* no-op live */ });
      td.appendChild(input);
      tr.appendChild(td);
    });

    // promedio
    const promTd = document.createElement("td");
    promTd.textContent = computeRowAverage(assignments, studentGrades);
    tr.appendChild(promTd);

    tbody.appendChild(tr);
  });
}

/* Add assignment column */
document.getElementById("btn-add-assignment").addEventListener("click", ()=>{
  const name = document.getElementById("new-assignment-name").value.trim();
  if(!name){ alert("Ingresa el nombre de la actividad."); return; }
  if(!store.notes) store.notes = {};
  if(!store.notes[currentGrade]) store.notes[currentGrade] = { assignments: [], grades: {} };
  const gradeNotes = store.notes[currentGrade];
  if(gradeNotes.assignments.includes(name)){ alert("Ya existe una columna con ese nombre."); return; }
  gradeNotes.assignments.push(name);
  saveStore(store);
  document.getElementById("new-assignment-name").value = "";
  renderNotesTable();
});

/* Save notes reading inputs */
document.getElementById("btn-save-notes").addEventListener("click", ()=>{
  if(!store.notes) store.notes = {};
  if(!store.notes[currentGrade]) store.notes[currentGrade] = { assignments: [], grades: {} };
  const gradeNotes = store.notes[currentGrade];
  const assignments = gradeNotes.assignments || [];
  const students = store.students[currentGrade] || [];
  const rows = Array.from(document.querySelectorAll("#notes-table tbody tr"));
  rows.forEach((tr, idx) => {
    const inputs = Array.from(tr.querySelectorAll("input[type=number]"));
    const s = students[idx];
    if(!gradeNotes.grades[s.id]) gradeNotes.grades[s.id] = {};
    inputs.forEach((inp, j) => {
      const val = inp.value;
      if(val === "") delete gradeNotes.grades[s.id][assignments[j]];
      else gradeNotes.grades[s.id][assignments[j]] = Number(val);
    });
  });
  saveStore(store);
  alert("Notas guardadas.");
  renderNotesTable();
});

/* export notes CSV */
document.getElementById("btn-export-notes").addEventListener("click", ()=>{
  const gradeNotes = store.notes[currentGrade] || { assignments: [], grades: {} };
  const assignments = gradeNotes.assignments || [];
  const students = store.students[currentGrade] || [];
  const rows = [["Grado","ID","Nombre", ...assignments, "Promedio"]];
  students.forEach(s => {
    const g = gradeNotes.grades[s.id] || {};
    const row = [currentGrade, s.id, s.name];
    let sum = 0, count = 0;
    assignments.forEach(a => {
      const v = g[a] !== undefined ? g[a] : "";
      row.push(v);
      if(v !== ""){ sum += Number(v); count++; }
    });
    const prom = count ? (sum/count).toFixed(2) : "";
    row.push(prom);
    rows.push(row);
  });
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
  downloadFile(csv, `notas_${currentGrade}.csv`, 'text/csv');
});

/* utils: compute average displayed */
function computeRowAverage(assignments, studentGrades){
  if(!assignments.length) return "";
  let sum = 0, cnt = 0;
  assignments.forEach(a => {
    const v = studentGrades[a];
    if(v !== undefined && v !== "") { sum += Number(v); cnt++; }
  });
  return cnt ? (sum / cnt).toFixed(2) : "";
}

/* download helper */
function downloadFile(content, filename, type){
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  a.remove(); URL.revokeObjectURL(url);
}

/* ---------- Init ---------- */
function initApp(){
  // If no data, create basic structure
  store = loadStore();
  // ensure notes/attendance structure
  if(!store.notes) store.notes = {};
  if(!store.attendance) store.attendance = {};
  fillGradeSelectors();
  showDashboard();
}

/* On load, check login */
window.addEventListener("DOMContentLoaded", () => {
  if(sessionStorage.getItem("logged")){
    initApp();
    showDashboard();
  } else {
    showPage("login");
  }
});
