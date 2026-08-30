// Exportacion del temario a CSV (se abre directamente en Excel).
import { flattenMicros } from "./schedule.js";

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
  "FechaEstudio",
  "FechaUltimoRepaso",
  "FechaProximoRepaso",
  "MinutosDedicados",
];

function cell(v) {
  const s = v == null ? "" : String(v);
  return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

export function planToCSV(plan) {
  const areas = plan.meta?.areas || {};
  const rows = [COLS.join(";")];
  for (const { tema, sub, micro } of flattenMicros(plan)) {
    rows.push(
      [
        areas[tema.area] || tema.area,
        tema.nombre,
        sub.nombre,
        sub.frecuente ? "si" : "no",
        micro.nombre,
        (micro.fuentes || []).join(" | "),
        micro.estado,
        micro.anki ? "si" : "no",
        micro.repasos || 0,
        micro.fechaEstudio || "",
        micro.fechaUltimoRepaso || "",
        micro.fechaProximoRepaso || "",
        micro.minutosDedicados || 0,
      ]
        .map(cell)
        .join(";")
    );
  }
  return "﻿" + rows.join("\r\n") + "\r\n"; // BOM para Excel
}

export function downloadCSV(plan) {
  const blob = new Blob([planToCSV(plan)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "temario.csv";
  a.click();
  URL.revokeObjectURL(url);
}
