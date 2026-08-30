// Persistencia del plan: lectura de data/plan.json, escritura via API de GitHub,
// borrador local en localStorage y export/import manual.
import { CONFIG, LS, API } from "./config.js";

// --- utilidades base64 <-> UTF-8 -------------------------------------------
function utf8ToB64(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
}
function b64ToUtf8(b64) {
  const bin = atob(b64.replace(/\s/g, ""));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

// --- token ---------------------------------------------------------------
export function getToken() {
  try {
    return localStorage.getItem(LS.token) || "";
  } catch {
    return "";
  }
}
export function setToken(value) {
  try {
    if (value) localStorage.setItem(LS.token, value.trim());
    else localStorage.removeItem(LS.token);
  } catch {}
}
export function hasToken() {
  return !!getToken();
}

// --- borrador local -----------------------------------------------------
export function saveDraft(plan) {
  try {
    localStorage.setItem(LS.draft, JSON.stringify(plan));
  } catch {}
}
export function loadDraft() {
  try {
    const raw = localStorage.getItem(LS.draft);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
export function clearDraft() {
  try {
    localStorage.removeItem(LS.draft);
  } catch {}
}
export function hasDraft() {
  try {
    return !!localStorage.getItem(LS.draft);
  } catch {
    return false;
  }
}

// --- estado del sha remoto (para deteccion de conflictos) --------------
let remoteSha = null;
export function getRemoteSha() {
  return remoteSha;
}

// --- carga -------------------------------------------------------------
// Devuelve { plan, sha, source }. Si hay token usa la API (trae el sha);
// si no, hace un fetch simple del fichero publicado.
export async function loadPlan() {
  const token = getToken();
  if (token) {
    let res;
    try {
      res = await fetch(
        `${API}/repos/${CONFIG.owner}/${CONFIG.repo}/contents/${CONFIG.path}?ref=${CONFIG.branch}`,
        { headers: ghHeaders(token), cache: "no-store" }
      );
    } catch {
      res = null;
    }
    if (res && res.ok) {
      const json = await res.json();
      remoteSha = json.sha;
      const plan = JSON.parse(b64ToUtf8(json.content));
      return { plan, sha: json.sha, source: "github" };
    }
    // Fallo de API con token: seguimos con el fichero estatico y avisamos.
    remoteSha = null;
    const warning =
      res && res.status === 401
        ? "Token invalido o caducado: revisalo en Ajustes."
        : res && res.status === 404
        ? "No encuentro el repo/fichero en GitHub: revisa js/config.js."
        : "Sin conexion con la API de GitHub; mostrando la ultima version publicada.";
    const plan = await fetchStatic();
    return { plan, sha: null, source: "static", warning };
  }
  remoteSha = null;
  return { plan: await fetchStatic(), sha: null, source: "static" };
}

async function fetchStatic() {
  const res = await fetch(`${CONFIG.path}?_=${Date.now()}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`No se pudo cargar ${CONFIG.path} (${res.status}).`);
  return res.json();
}

// --- guardado --------------------------------------------------------
// Escribe plan.json en el repo. Lanza un error tipado si el sha cambio.
export async function savePlan(plan) {
  const token = getToken();
  if (!token) throw new Error("Necesitas un token de GitHub para guardar.");

  // Releer el sha actual justo antes de escribir.
  const head = await fetch(
    `${API}/repos/${CONFIG.owner}/${CONFIG.repo}/contents/${CONFIG.path}?ref=${CONFIG.branch}`,
    { headers: ghHeaders(token), cache: "no-store" }
  );
  if (!head.ok) throw new Error(`No pude leer el estado actual del fichero (${head.status}).`);
  const current = await head.json();

  if (remoteSha && current.sha !== remoteSha) {
    const err = new Error(
      "El fichero cambio en GitHub desde la ultima carga. Recarga para no perder esos cambios."
    );
    err.code = "CONFLICT";
    throw err;
  }

  plan.meta = plan.meta || {};
  plan.meta.actualizado = new Date().toISOString().replace(/\.\d+Z$/, "Z");
  // no serializar campos internos (los que empiezan por "_")
  const clean = (k, v) => (k.startsWith("_") ? undefined : v);
  const body = {
    message: CONFIG.commitMessage.replace("{fecha}", new Date().toLocaleString("es-ES")),
    content: utf8ToB64(JSON.stringify(plan, clean, 2) + "\n"),
    sha: current.sha,
    branch: CONFIG.branch,
  };
  const res = await fetch(
    `${API}/repos/${CONFIG.owner}/${CONFIG.repo}/contents/${CONFIG.path}`,
    { method: "PUT", headers: ghHeaders(token), body: JSON.stringify(body) }
  );
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`GitHub rechazo el guardado (${res.status}). ${detail}`);
  }
  const json = await res.json();
  remoteSha = json.content.sha;
  clearDraft();
  return { sha: remoteSha, commit: json.commit && json.commit.html_url };
}

function ghHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
  };
}

// --- export / import -------------------------------------------------
export function downloadPlan(plan) {
  const blob = new Blob([JSON.stringify(plan, null, 2) + "\n"], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "plan.json";
  a.click();
  URL.revokeObjectURL(url);
}
export function importPlanFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        resolve(JSON.parse(reader.result));
      } catch (e) {
        reject(new Error("El fichero no es un JSON valido."));
      }
    };
    reader.onerror = () => reject(new Error("No se pudo leer el fichero."));
    reader.readAsText(file);
  });
}
