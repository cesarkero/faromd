// Configuracion del repositorio donde vive data/plan.json.
// Ajusta estos valores tras crear el repo en GitHub.
export const CONFIG = {
  owner: "cesarkero",
  repo: "labiblia",
  branch: "main",
  path: "data/plan.json",
  // Mensaje de commit; {fecha} se sustituye por la fecha-hora actual.
  commitMessage: "chore(plan): actualizar {fecha}",
};

// Claves de localStorage.
export const LS = {
  token: "labiblia.token",
  draft: "labiblia.draft",
  collapsed: "labiblia.collapsed",
};

export const API = "https://api.github.com";
