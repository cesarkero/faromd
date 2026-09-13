// Configuracion del repositorio donde vive data/plan.json.
// Ajusta estos valores tras crear el repo en GitHub.
export const CONFIG = {
  owner: "cesarkero",
  repo: "faromd",
  branch: "main",
  path: "data/plan.json",
  // Mensaje de commit; {fecha} se sustituye por la fecha-hora actual.
  commitMessage: "chore(plan): actualizar {fecha}",
};

// Claves de localStorage.
export const LS = {
  token: "faromd.token",
  draft: "faromd.draft",
  expanded: "faromd.expanded", // temas desplegados en la tabla (por defecto: ninguno)
};

export const API = "https://api.github.com";
