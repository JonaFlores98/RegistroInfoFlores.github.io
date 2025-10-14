// login.js - Maneja el inicio de sesión
const DEFAULT_USER = { user: "Docente", pass: "ugb2025" };

document.getElementById("login-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const user = document.getElementById("login-user").value.trim();
  const pass = document.getElementById("login-pass").value.trim();

  if (user === DEFAULT_USER.user && pass === DEFAULT_USER.pass) {
    sessionStorage.setItem("logged", "true");
    window.location.href = "dashboard.html";
  } else {
    alert("Credenciales incorrectas. Intente nuevamente.");
  }
});
