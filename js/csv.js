// Exportacion del temario a CSV / Excel (se abre directamente en Excel).
import { flattenMicros } from "./schedule.js";

function saveBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function rowsFor(plan) {
  const areas = plan.meta?.areas || {};
  return flattenMicros(plan).map(({ tema, sub, micro }) => ({
    Area: areas[tema.area] || tema.area,
    Tema: tema.nombre,
    Subtema: sub.nombre,
    Frecuente: sub.frecuente ? "si" : "no",
    Microtema: micro.nombre,
    Fuentes: (micro.fuentes || []).join(" | "),
    Estado: micro.estado,
    Anki: micro.anki ? "si" : "no",
    Repasos: micro.repasos || 0,
    Aplazado: micro.aplazado || 0,
    FechaEstudio: micro.fechaEstudio || "",
    FechaUltimoRepaso: micro.fechaUltimoRepaso || "",
    FechaProximoRepaso: micro.fechaProximoRepaso || "",
    MinutosDedicados: micro.minutosDedicados || 0,
  }));
}

const COLS = [
  "Area",
  "Tema",
  "Subtema",
  "Frecuente",
  "Microtema",
  "Fuentes",
  "Estado",
  "Anki",
  "Repasos",
  "Aplazado",
  "FechaEstudio",
  "FechaUltimoRepaso",
  "FechaProximoRepaso",
  "MinutosDedicados",
];

const ACT_COLS = ["Tipo", "Titulo", "Fecha", "FechaFin", "Minutos", "Ambito", "Tema", "Enlace", "Notas"];
function actividadRows(plan) {
  const temas = Object.fromEntries((plan.temas || []).map((t) => [t.id, t.nombre]));
  return (plan.actividades || []).map((a) => ({
    Tipo: a.tipo || "",
    Titulo: a.titulo || "",
    Fecha: a.fecha || "",
    FechaFin: a.fechaFin || "",
    Minutos: a.minutos || 0,
    Ambito: a.ambito === "tema" ? "tema" : "transversal",
    Tema: a.ambito === "tema" ? temas[a.temaId] || a.temaId || "" : "",
    Enlace: a.url || "",
    Notas: a.notas || "",
  }));
}

function cell(v) {
  const s = v == null ? "" : String(v);
  return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

export function planToCSV(plan) {
  const rows = [COLS.join(";")];
  for (const r of rowsFor(plan)) {
    rows.push(COLS.map((k) => cell(r[k])).join(";"));
  }
  return "﻿" + rows.join("\r\n") + "\r\n"; // BOM para Excel
}

export function downloadCSV(plan) {
  saveBlob(new Blob([planToCSV(plan)], { type: "text/csv;charset=utf-8" }), "temario.csv");
}

export function downloadJSON(plan) {
  saveBlob(
    new Blob([JSON.stringify(plan, (k, v) => (k.startsWith("_") ? undefined : v), 2) + "\n"], {
      type: "application/json",
    }),
    "plan.json"
  );
}

// Excel real (.xlsx): carga SheetJS del CDN solo al pedirlo.
let xlsxLib = null;
function loadSheetJS() {
  if (xlsxLib) return Promise.resolve(xlsxLib);
  if (window.XLSX) return Promise.resolve((xlsxLib = window.XLSX));
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    s.onload = () => resolve((xlsxLib = window.XLSX));
    s.onerror = () => reject(new Error("No se pudo cargar la libreria de Excel (sin conexion?)."));
    document.head.appendChild(s);
  });
}

export async function downloadXLSX(plan) {
  const XLSX = await loadSheetJS();
  const ws = XLSX.utils.json_to_sheet(rowsFor(plan), { header: COLS });
  ws["!cols"] = COLS.map((k) =>
    ({ Microtema: 52, Tema: 32, Subtema: 30, Fuentes: 40 }[k] ? { wch: { Microtema: 52, Tema: 32, Subtema: 30, Fuentes: 40 }[k] } : { wch: 13 })
  );
  ws["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rowsFor(plan).length, c: COLS.length - 1 } }) };
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Temario");

  const acts = actividadRows(plan);
  if (acts.length) {
    const wa = XLSX.utils.json_to_sheet(acts, { header: ACT_COLS });
    wa["!cols"] = ACT_COLS.map((k) => ({ wch: k === "Titulo" || k === "Notas" || k === "Enlace" ? 40 : 13 }));
    XLSX.utils.book_append_sheet(wb, wa, "Actividades");
  }

  XLSX.writeFile(wb, "temario.xlsx");
}
