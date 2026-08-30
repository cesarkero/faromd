// Barras apiladas: tiempo dedicado por tema, segmentado por subtema.
import { timeByTema } from "../schedule.js";

const AREA_VAR = {
  AP: "--ap",
  URG: "--urg",
  EXTRA: "--extra",
  DERMATOSCOPIA: "--derm",
  MIR: "--mir",
};

function fmt(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h && m) return `${h} h ${m}′`;
  if (h) return `${h} h`;
  return `${m}′`;
}

export function renderBars(container, plan) {
  container.innerHTML = "";
  const rows = timeByTema(plan);
  if (!rows.length) {
    container.innerHTML =
      '<p class="empty">Aun no hay tiempo registrado. Completa sesiones para ver el reparto por tema.</p>';
    return;
  }
  const max = Math.max(...rows.map((r) => r.total));
  const list = document.createElement("div");
  list.className = "bars";

  for (const row of rows) {
    const base = getComputedStyle(document.documentElement)
      .getPropertyValue(AREA_VAR[row.tema.area] || "--ap")
      .trim();
    const item = document.createElement("div");
    item.className = "bar-row";
    item.innerHTML = `
      <div class="bar-head">
        <span class="bar-name">${row.tema.nombre}</span>
        <span class="bar-total">${fmt(row.total)}</span>
      </div>`;
    const track = document.createElement("div");
    track.className = "bar-track";
    const wPct = (row.total / max) * 100;
    const inner = document.createElement("div");
    inner.className = "bar-fill";
    inner.style.width = wPct + "%";

    row.segments.forEach((seg, i) => {
      const s = document.createElement("span");
      s.className = "bar-seg";
      s.style.flexGrow = String(seg.minutos);
      s.style.background = base;
      s.style.opacity = String(0.45 + 0.55 * (1 - i / Math.max(row.segments.length, 1)));
      s.title = `${seg.nombre}: ${fmt(seg.minutos)}`;
      inner.appendChild(s);
    });
    track.appendChild(inner);
    item.appendChild(track);
    list.appendChild(item);
  }
  container.appendChild(list);
}
