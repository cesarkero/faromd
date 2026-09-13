// Grafico circular de la sesion de hoy, con la estetica de img/reparto_estudio_circular.svg:
// donut de 4 pomodoros 25/5, huecos con "5'" y resumen en el centro.
// Un bloque estudiado se marca con una linea oscura en el borde exterior del trozo.
import { bloqueLabel, canReceiveExtra, findMicro } from "../schedule.js";

const NS = "http://www.w3.org/2000/svg";
const COLOR = { repaso: "var(--repaso)", tema: "var(--ap)", cierre: "var(--ap-2)" };
const TIPO_CORTO = { repaso: "REPASO", tema: "TEMA", cierre: "CIERRE" };
const TIPO = { repaso: "Repaso", tema: "Tema", cierre: "Cierre activo" };
// rotulo breve para el anillo del circulo (el texto largo se sale del trozo)
const RING = { repaso: "Repaso", tema_repaso: "Tema/Rep.", tema: "Tema", cierre: "Cierre" };

function pt(cx, cy, r, deg) {
  const a = (deg * Math.PI) / 180;
  return [cx + r * Math.sin(a), cy - r * Math.cos(a)];
}
function arc(cx, cy, r, a0, a1) {
  const [x0, y0] = pt(cx, cy, r, a0);
  const [x1, y1] = pt(cx, cy, r, a1);
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`;
}
function el(tag, attrs, text) {
  const n = document.createElementNS(NS, tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  if (text != null) n.textContent = text;
  return n;
}
function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

export function renderCircle(container, plan, sesion, opts) {
  const { onToggle, onMarkAll, onReset, onCloseDay, onReopenDay, onDropExtra, onRemoveExtra, readonly } = opts;
  container.innerHTML = "";
  const n = sesion.bloques.length || 4;
  const hechos = sesion.bloques.filter((b) => b.hecho).length;
  const done = hechos === n && n > 0;
  const cerrada = !!sesion.cerrada;
  const interactivo = !readonly && !cerrada;

  const S = 460;
  const c = S / 2;
  const r = 158;
  const w = 84;
  const gap = 15;
  const seg = 360 / n;

  const svg = el("svg", { viewBox: `0 0 ${S} ${S}`, class: "circle-svg", role: "img", "aria-label": "Sesion de estudio de hoy" });
  svg.appendChild(el("circle", { cx: c, cy: c, r, fill: "none", stroke: "var(--track)", "stroke-width": w }));

  sesion.bloques.forEach((b, i) => {
    const a0 = i * seg + gap / 2;
    const a1 = (i + 1) * seg - gap / 2;
    const mid = (a0 + a1) / 2;

    const g = el("g", { class: "pomo" + (b.hecho ? " is-done" : cerrada ? " is-skipped" : "") });
    if (interactivo) {
      g.style.cursor = "pointer";
      g.addEventListener("click", () => onToggle(i));
    }
    g.appendChild(
      el("path", {
        d: arc(c, c, r, a0, a1),
        fill: "none",
        stroke: COLOR[b.tipo] || "var(--ap)",
        "stroke-width": w,
        "stroke-linecap": "butt",
        class: "pomo-arc",
      })
    );

    const rotulo = RING[b.rol] || b.rotulo || TIPO_CORTO[b.tipo] || b.tipo.toUpperCase();
    const [lx, ly] = pt(c, c, r, mid);
    g.appendChild(el("text", { x: lx, y: ly - 8, "text-anchor": "middle", class: "ring-kicker" }, `P${i + 1} · 25′`));
    g.appendChild(el("text", { x: lx, y: ly + 13, "text-anchor": "middle", class: "ring-label" }, rotulo));

    // bloque hecho -> linea oscura en el borde exterior del trozo
    if (b.hecho) {
      g.appendChild(
        el("path", {
          d: arc(c, c, r + w / 2 - 2, a0, a1),
          fill: "none",
          stroke: "var(--ink)",
          "stroke-width": 4,
          "stroke-linecap": "round",
          class: "pomo-done-edge",
        })
      );
    }
    svg.appendChild(g);
  });

  // "5'" en los huecos
  for (let i = 0; i < n; i++) {
    const [bx, by] = pt(c, c, r, i * seg);
    svg.appendChild(el("circle", { cx: bx, cy: by, r: 19, class: "pause-dot" }));
    svg.appendChild(el("text", { x: bx, y: by + 5, "text-anchor": "middle", class: "pause-txt" }, "5′"));
  }

  // centro
  const inner = r - w / 2 - 6;
  svg.appendChild(el("circle", { cx: c, cy: c, r: inner, fill: "var(--bg)" }));
  const cg = el("g", {});
  if (cerrada) {
    cg.appendChild(el("text", { x: c, y: c - 34, "text-anchor": "middle", class: "center-eyebrow" }, "DIA CERRADO"));
    cg.appendChild(el("text", { x: c, y: c + 6, "text-anchor": "middle", class: "center-big" }, `${hechos}/${n}`));
    cg.appendChild(el("text", { x: c, y: c + 30, "text-anchor": "middle", class: "center-strong" }, "bloques hechos"));
    cg.appendChild(el("text", { x: c, y: c + 52, "text-anchor": "middle", class: "center-soft" },
      `${(sesion.minutos ?? hechos * (plan.config.minutosPomodoro || 25))} min`));
  } else if (done) {
    cg.appendChild(el("circle", { cx: c, cy: c - 20, r: 30, class: "center-badge" }));
    cg.appendChild(el("path", { d: `M ${c - 14} ${c - 20} l 8 9 l 17 -20`, class: "center-badge-check", fill: "none" }));
    cg.appendChild(el("text", { x: c, y: c + 30, "text-anchor": "middle", class: "center-strong" }, "Sesion hecha"));
    cg.appendChild(el("text", { x: c, y: c + 52, "text-anchor": "middle", class: "center-soft" },
      `+${(plan.config.minutosPomodoro || 25) * n} min`));
  } else {
    cg.appendChild(el("text", { x: c, y: c - 36, "text-anchor": "middle", class: "center-eyebrow" }, "SESION DE HOY"));
    cg.appendChild(el("text", { x: c, y: c + 8, "text-anchor": "middle", class: "center-big" }, `${hechos}/${n}`));
    cg.appendChild(el("text", { x: c, y: c + 32, "text-anchor": "middle", class: "center-strong" }, "bloques hechos"));
    cg.appendChild(el("text", { x: c, y: c + 54, "text-anchor": "middle", class: "center-soft" }, `2 h · ${n} × 25/5`));
  }
  svg.appendChild(cg);

  // lista con nombres completos
  const list = document.createElement("ul");
  list.className = "pomo-list";
  sesion.bloques.forEach((b, i) => {
    const info = bloqueLabel(plan, b);
    const li = document.createElement("li");
    const puedeExtra = interactivo && canReceiveExtra(b) && !b.hecho;
    const tieneExtra = canReceiveExtra(b) && (b.extra || []).length > 0;
    li.className = "pomo-item" + (b.hecho ? " is-done" : cerrada ? " is-skipped" : "");
    li.innerHTML = `
      <span class="pi-bar" style="background:${COLOR[b.tipo] || "var(--ap)"}"></span>
      <span class="pi-text">
        <span class="pi-kicker">P${i + 1} · ${b.rotulo || TIPO[b.tipo] || b.tipo}</span>
        <span class="pi-title">${esc(info.sub || info.titulo)}</span>
        <span class="pi-sub">${esc(info.sub ? info.titulo : "")}</span>
        ${tieneExtra ? '<span class="pi-extra"></span>' : ""}
      </span>`;

    if (tieneExtra) {
      const extraHost = li.querySelector(".pi-extra");
      (b.extra || []).forEach((microId) => {
        const r = findMicro(plan, microId);
        const chip = document.createElement("span");
        chip.className = "pi-extra-chip";
        chip.innerHTML = `<span>${esc(r ? r.micro.nombre : "?")}</span>`;
        if (puedeExtra) {
          const rm = document.createElement("button");
          rm.type = "button";
          rm.textContent = "×";
          rm.title = "Quitar";
          rm.onclick = () => onRemoveExtra(i, microId);
          chip.appendChild(rm);
        }
        extraHost.appendChild(chip);
      });
    }

    if (puedeExtra) {
      li.classList.add("pi-droppable");
      li.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
        li.classList.add("drop-hover");
      });
      li.addEventListener("dragleave", () => li.classList.remove("drop-hover"));
      li.addEventListener("drop", (e) => {
        e.preventDefault();
        li.classList.remove("drop-hover");
        const microId = e.dataTransfer.getData("text/plain");
        if (microId) onDropExtra(i, microId);
      });
    }

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pi-check" + (b.hecho ? " on" : "");
    btn.disabled = !interactivo;
    btn.innerHTML = b.hecho
      ? '<span class="pi-check-ico">✓</span> hecho'
      : cerrada
      ? '<span class="pi-check-ico">–</span> sin hacer'
      : '<span class="pi-check-ico">○</span> marcar';
    if (interactivo) btn.onclick = () => onToggle(i);
    li.appendChild(btn);
    list.appendChild(li);
  });

  const wrap = document.createElement("div");
  wrap.className = "circle-wrap";
  wrap.append(svg, list);
  container.appendChild(wrap);

  if (!readonly) {
    const bar = document.createElement("div");
    bar.className = "circle-actions";
    if (cerrada) {
      bar.appendChild(mini("Reabrir dia", () => onReopenDay()));
    } else {
      bar.appendChild(
        mini(done ? "Desmarcar todo" : "Marcar toda la sesion", () => (done ? onReset() : onMarkAll()), done ? "" : "primary")
      );
      bar.appendChild(mini("Cerrar dia", () => onCloseDay(), "primary"));
    }
    container.appendChild(bar);
  }
}

function mini(label, onClick, variant) {
  const b = document.createElement("button");
  b.className = "mini" + (variant === "primary" ? " mini-primary" : "");
  b.textContent = label;
  b.onclick = onClick;
  return b;
}
