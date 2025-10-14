// notas.js
const APP_KEY = "control_academico_v1";
const grade = sessionStorage.getItem("currentGrade");
if(!sessionStorage.getItem("logged") || !grade) window.location.href = "index.html";

function loadStore(){ return JSON.parse(localStorage.getItem(APP_KEY)); }
function saveStore(s){ localStorage.setItem(APP_KEY, JSON.stringify(s)); }

let store = loadStore();
document.getElementById("title").textContent = `Notas - ${grade}`;

function renderTable(){
  const head = document.getElementById("notes-head");
  const body = document.getElementById("notes-body");
  body.innerHTML = "";
  const notes = store.notes[grade] || { assignments: [], grades: {} };
  const asg = notes.assignments || [];

  head.innerHTML = "<th>#</th><th>Nombre</th>";
  asg.forEach(a=> head.innerHTML += `<th>${a}</th>`);
  head.innerHTML += "<th>Prom.</th>";

  const students = store.students[grade] || [];
  students.forEach((s,i)=>{
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${i+1}</td><td>${s.name}</td>`;
    let sum=0, count=0;
    asg.forEach(a=>{
      const val = (notes.grades?.[s.id]?.[a]) ?? "";
      tr.innerHTML += `<td><input type='number' min='0' max='100' value='${val}' style='width:60px'></td>`;
      if(val!==""){sum+=Number(val);count++;}
    });
    const prom = count?(sum/count).toFixed(2):"";
    tr.innerHTML += `<td>${prom}</td>`;
    body.appendChild(tr);
  });
}
renderTable();

/* Añadir columna */
document.getElementById("btn-add").addEventListener("click", ()=>{
  const col = document.getElementById("new-col").value.trim();
  if(!col) return alert("Escriba un nombre para la actividad.");
  if(!store.notes[grade]) store.notes[grade] = { assignments: [], grades: {} };
  if(store.notes[grade].assignments.includes(col)) return alert("Ya existe esa actividad.");
  store.notes[grade].assignments.push(col);
  saveStore(store);
  document.getElementById("new-col").value="";
  renderTable();
});

/* Guardar */
document.getElementById("btn-save").addEventListener("click", ()=>{
  if(!store.notes[grade]) store.notes[grade] = { assignments: [], grades: {} };
  const notes = store.notes[grade];
  const asg = notes.assignments || [];
  const students = store.students[grade] || [];
  const rows = Array.from(document.querySelectorAll("#notes-body tr"));
  rows.forEach((tr,i)=>{
    const inputs = tr.querySelectorAll("input");
    const s = students[i];
    if(!notes.grades[s.id]) notes.grades[s.id]={};
    inputs.forEach((inp,j)=>{
      const val = inp.value;
      if(val==="") delete notes.grades[s.id][asg[j]];
      else notes.grades[s.id][asg[j]] = Number(val);
    });
  });
  saveStore(store);
  alert("Notas guardadas.");
  renderTable();
});

/* Exportar */
document.getElementById("btn-export").addEventListener("click", ()=>{
  const notes = store.notes[grade] || { assignments: [], grades: {} };
  const asg = notes.assignments || [];
  const students = store.students[grade] || [];
  const rows = [["Grado","Nombre",...asg,"Promedio"]];
  students.forEach(s=>{
    const data = notes.grades[s.id]||{};
    const vals = asg.map(a=>data[a]??"");
    let sum=0,count=0;
    vals.forEach(v=>{if(v!==""){sum+=Number(v);count++;}});
    const prom=count?(sum/count).toFixed(2):"";
    rows.push([grade,s.name,...vals,prom]);
  });
  const csv = rows.map(r=>r.join(",")).join("\n");
  const blob = new Blob([csv],{type:"text/csv"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `notas_${grade}.csv`;
  a.click();
});
