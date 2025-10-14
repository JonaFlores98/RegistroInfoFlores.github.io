// asistencia.js
const APP_KEY = "control_academico_v1";
const grade = sessionStorage.getItem("currentGrade");
if(!sessionStorage.getItem("logged") || !grade) window.location.href = "index.html";

function loadStore(){ return JSON.parse(localStorage.getItem(APP_KEY)); }
function saveStore(s){ localStorage.setItem(APP_KEY, JSON.stringify(s)); }

let store = loadStore();
document.getElementById("title").textContent = `Asistencia - ${grade}`;
document.getElementById("attendance-date").value = new Date().toISOString().slice(0,10);

const tbody = document.getElementById("attendance-body");
function render(){
  tbody.innerHTML = "";
  const students = store.students[grade] || [];
  const date = document.getElementById("attendance-date").value;
  const data = (store.attendance?.[grade]?.[date]) || {};
  students.forEach((s,i)=>{
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${i+1}</td>
      <td>${s.name}</td>
      <td><input type="checkbox" ${data[s.id]?"checked":""}></td>
    `;
    tbody.appendChild(tr);
  });
}
render();

document.getElementById("attendance-date").addEventListener("change", render);

document.getElementById("btn-save").addEventListener("click", ()=>{
  const date = document.getElementById("attendance-date").value;
  if(!store.attendance[grade]) store.attendance[grade] = {};
  const map = {};
  const students = store.students[grade] || [];
  Array.from(tbody.querySelectorAll("tr")).forEach((tr,i)=>{
    const cb = tr.querySelector("input");
    map[students[i].id] = cb.checked;
  });
  store.attendance[grade][date] = map;
  saveStore(store);
  alert("Asistencia guardada.");
});

document.getElementById("btn-export").addEventListener("click", ()=>{
  const date = document.getElementById("attendance-date").value;
  const students = store.students[grade] || [];
  const data = (store.attendance?.[grade]?.[date]) || {};
  const rows = [["Grado","Fecha","Nombre","Presente"]];
  students.forEach(s=>{
    rows.push([grade,date,s.name,data[s.id]?"Sí":"No"]);
  });
  const csv = rows.map(r=>r.join(",")).join("\n");
  const blob = new Blob([csv],{type:"text/csv"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `asistencia_${grade}_${date}.csv`;
  a.click();
});
