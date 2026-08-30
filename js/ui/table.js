// Tabla-base de datos: temas > subtemas > microtemas con edicion inline.
import { LS } from "../config.js";
import {
  markStudied,
  markReview,
  todayISO,
  daysBetween,
} from "../schedule.js";

const ESTADOS = [
  ["sin_empezar", "Sin empezar"],
  ["programado", "Programado"],
  ["finalizado", "Finalizado"],
];

// Guardamos los temas DESPLEGADOS; por defecto (nada guardado) la tabla se
// muestra toda plegada.
function loadExpanded() {
  try {
    return new Set(JSON.parse(localStorage.getItem(LS.expanded) || "[]"));
  } catch {
    return new Set();
  }
}
function saveExpanded(set) {
  try {
    localStorage.setItem(LS.expanded, JSON.stringify([...set]));
  } catch {}
}

const state = {
  q: "",
  area: "",
  soloPendientes: false,
  soloVencidos: false,
};

export function renderTable(container, plan, { onMutate, readonly, session }) {
  container.innerHTML = "";
  const expanded = loadExpanded();
  const today = todayISO();
  // microtemas que forman la sesion de hoy: para resaltar sus filas en verde
  const hoy = new Map();
  for (const b of (session && session.bloques) || []) {
    if (b.microtemaId) hoy.set(b.microtemaId, b);
  }
  // al filtrar/buscar se despliega todo temporalmente para ver los resultados
  const hayFiltro = !!(state.q.trim() || state.area || state.soloPendientes || state.soloVencidos);

  // barra de filtros
  const bar = document.createElement("div");
  bar.className = "filters";
  bar.innerHTML = `
    <input type="search" placeholder="Buscar microtema o subtema…" class="f-q" value="${state.q}">
    <select class="f-area">
      <option value="">Todas las areas</option>
      ${Object.entries(plan.meta.areas || {})
        .map(
          ([k, v]) =>
            `<option value="${k}" ${state.area === k ? "selected" : ""}>${v}</option>`
        )
        .join("")}
    </select>
    <label class="f-check"><input type="checkbox" class="f-pend" ${
      state.soloPendientes ? "checked" : ""
    }> Solo no finalizados</label>
    <label class="f-check"><input type="checkbox" class="f-venc" ${
      state.soloVencidos ? "checked" : ""
    }> Solo repasos vencidos</label>`;
  container.appendChild(bar);
  const rerender = () => renderTable(container, plan, { onMutate, readonly });
  bar.querySelector(".f-q").oninput = (e) => {
    state.q = e.target.value;
    state._focusQ = true;
    debounce(rerender);
  };
  bar.querySelector(".f-area").onchange = (e) => {
    state.area = e.target.value;
    rerender();
  };
  bar.querySelector(".f-pend").onchange = (e) => {
    state.soloPendientes = e.target.checked;
    rerender();
  };
  bar.querySelector(".f-venc").onchange = (e) => {
    state.soloVencidos = e.target.checked;
    rerender();
  };

  const q = state.q.trim().toLowerCase();
  const wrap = document.createElement("div");
  wrap.className = "table-wrap";

  let visibles = 0;
  for (const tema of plan.temas || []) {
    if (state.area && tema.area !== state.area) continue;
    const temaRows = [];

    for (const sub of tema.subtemas || []) {
      const micros = (sub.microtemas || []).filter((m) => {
        if (state.soloPendientes && m.estado === "finalizado") return false;
        if (
          state.soloVencidos &&
          !(m.estado === "finalizado" && m.fechaProximoRepaso && m.fechaProximoRepaso <= today)
        )
          return false;
        if (q && !(`${m.nombre} ${sub.nombre}`.toLowerCase().includes(q))) return false;
        return true;
      });
      if (!micros.length) continue;
      temaRows.push({ sub, micros });
    }
    if (!temaRows.length) continue;
    visibles += temaRows.reduce((n, r) => n + r.micros.length, 0);

    const tid = tema.id;
    const tieneHoy = temaRows.some((r) => r.micros.some((m) => hoy.has(m.id)));
    const section = document.createElement("section");
    section.className = "tema" + (tieneHoy ? " has-today" : "");
    // los temas con bloque de hoy se muestran desplegados automaticamente
    const abierto = hayFiltro || expanded.has(tid) || tieneHoy;
    const head = document.createElement("button");
    head.className = "tema-head";
    head.innerHTML = `
      <span class="chev ${abierto ? "open" : ""}">▸</span>
      <span class="dot area-${tema.area}"></span>
      <span class="tema-name">${tema.nombre}</span>
      ${tieneHoy ? '<span class="tema-today">hoy</span>' : ""}
      <span class="tema-meta">${temaRows.reduce((n, r) => n + r.micros.length, 0)} microtemas</span>`;
    head.onclick = () => {
      expanded.has(tid) ? expanded.delete(tid) : expanded.add(tid);
      saveExpanded(expanded);
      rerender();
    };
    section.appendChild(head);

    if (abierto) {
      for (const { sub, micros } of temaRows) {
        const sc = document.createElement("div");
        sc.className = "sub";
        sc.innerHTML = `<div class="sub-head">${sub.nombre}${
          sub.frecuente ? '<span class="badge-freq">frecuente</span>' : ""
        }</div>`;
        const table = document.createElement("table");
        table.className = "grid";
        table.innerHTML = `
          <thead><tr>
            <th>Microtema</th><th>Fuentes (libro · cap./pág.)</th><th>Estado</th><th>Anki</th><th>Rep.</th>
            <th>Ult. repaso</th><th>F. estudio</th><th>Prox. repaso</th><th></th>
          </tr></thead>`;
        const tb = document.createElement("tbody");
        for (const m of micros)
          tb.appendChild(row(plan, tema, sub, m, today, onMutate, readonly, hoy.get(m.id)));
        table.appendChild(tb);
        sc.appendChild(table);
        section.appendChild(sc);
      }
    }
    wrap.appendChild(section);
  }

  if (!visibles) {
    wrap.innerHTML = '<p class="empty">Ningun microtema coincide con el filtro.</p>';
  }
  container.appendChild(wrap);

  if (state._focusQ) {
    state._focusQ = false;
    const inp = bar.querySelector(".f-q");
    inp.focus();
    inp.setSelectionRange(inp.value.length, inp.value.length);
  }
}

function row(plan, tema, sub, m, today, onMutate, readonly, bloqueHoy) {
  const tr = document.createElement("tr");
  const vencido =
    m.estado === "finalizado" && m.fechaProximoRepaso && m.fechaProximoRepaso <= today;
  if (vencido) tr.classList.add("is-overdue");
  if (bloqueHoy) tr.classList.add("is-today", bloqueHoy.hecho ? "is-today-done" : "is-today-pending");

  // nombre
  const tdName = document.createElement("td");
  tdName.className = "cell-name";
  const nameSpan = document.createElement("span");
  nameSpan.className = "name-txt";
  nameSpan.textContent = m.nombre;
  tdName.appendChild(nameSpan);
  if (bloqueHoy) {
    const tag = document.createElement("span");
    tag.className = "today-tag";
    tag.textContent = "P" + bloqueHoy.pomodoro + (bloqueHoy.hecho ? " ✓" : "");
    tag.title = bloqueHoy.rotulo + " · sesion de hoy";
    tdName.appendChild(tag);
  }
  tr.appendChild(tdName);

  // fuentes (localizacion en los libros; varias separadas por " | ")
  const tdFuentes = document.createElement("td");
  tdFuentes.className = "cell-fuentes";
  const fi = document.createElement("input");
  fi.type = "text";
  fi.className = "inp";
  fi.placeholder = "semFYC cap. 12 · p. 145 | Vázquez Lima cap. 33";
  fi.value = (m.fuentes || []).join(" | ");
  fi.disabled = readonly;
  fi.onchange = () => {
    m.fuentes = fi.value.split("|").map((s) => s.trim()).filter(Boolean);
    onMutate();
  };
  tdFuentes.appendChild(fi);
  tr.appendChild(tdFuentes);

  // estado
  tr.appendChild(
    cell(
      selectField(m.estado, ESTADOS, readonly, (v) => {
        m.estado = v;
        if (v !== "finalizado") {
          m.fechaProximoRepaso = null;
        }
        onMutate();
      })
    )
  );

  // anki
  tr.appendChild(
    cell(
      checkbox(m.anki, readonly, (v) => {
        m.anki = v;
        onMutate();
      })
    )
  );

  // repasos
  tr.appendChild(
    cell(
      stepper(m.repasos || 0, readonly, (v) => {
        m.repasos = v;
        onMutate();
      })
    )
  );

  // fechas
  tr.appendChild(cell(dateField(m.fechaUltimoRepaso, readonly, (v) => {
    m.fechaUltimoRepaso = v || null;
    onMutate();
  })));
  tr.appendChild(cell(dateField(m.fechaEstudio, readonly, (v) => {
    m.fechaEstudio = v || null;
    onMutate();
  })));
  const tdNext = cell(dateField(m.fechaProximoRepaso, readonly, (v) => {
    m.fechaProximoRepaso = v || null;
    onMutate();
  }));
  if (vencido) tdNext.classList.add("overdue-cell");
  tr.appendChild(tdNext);

  // acciones
  const tdAct = document.createElement("td");
  tdAct.className = "cell-actions";
  if (!readonly) {
    const bStudy = mini("Estudiado", "Marcar como estudiado hoy (programa 1er repaso)", () => {
      markStudied(m, sub, plan.config);
      onMutate();
    });
    const bRev = mini("Repaso", "Registrar repaso hecho hoy y reprogramar", () => {
      markReview(m, sub, plan.config);
      onMutate();
    });
    tdAct.append(bStudy, bRev);
  }
  tr.appendChild(tdAct);
  return tr;
}

// --- helpers de celda ---------------------------------------------
function cell(node) {
  const td = document.createElement("td");
  td.appendChild(node);
  return td;
}
function selectField(value, options, readonly, onChange) {
  const s = document.createElement("select");
  s.disabled = readonly;
  s.className = "inp est-" + value;
  for (const [v, label] of options) {
    const o = document.createElement("option");
    o.value = v;
    o.textContent = label;
    if (v === value) o.selected = true;
    s.appendChild(o);
  }
  s.onchange = () => onChange(s.value);
  return s;
}
function checkbox(value, readonly, onChange) {
  const c = document.createElement("input");
  c.type = "checkbox";
  c.checked = !!value;
  c.disabled = readonly;
  c.onchange = () => onChange(c.checked);
  return c;
}
function stepper(value, readonly, onChange) {
  const wrap = document.createElement("div");
  wrap.className = "stepper";
  const dec = document.createElement("button");
  dec.textContent = "−";
  dec.disabled = readonly || value <= 0;
  const num = document.createElement("span");
  num.textContent = value;
  const inc = document.createElement("button");
  inc.textContent = "+";
  inc.disabled = readonly;
  dec.onclick = () => onChange(Math.max(0, value - 1));
  inc.onclick = () => onChange(value + 1);
  wrap.append(dec, num, inc);
  return wrap;
}
function dateField(value, readonly, onChange) {
  const d = document.createElement("input");
  d.type = "date";
  d.className = "inp";
  d.value = value || "";
  d.disabled = readonly;
  d.onchange = () => onChange(d.value);
  return d;
}
function mini(label, title, onClick) {
  const b = document.createElement("button");
  b.className = "mini";
  b.textContent = label;
  b.title = title;
  b.onclick = onClick;
  return b;
}

let t;
function debounce(fn) {
  clearTimeout(t);
  t = setTimeout(fn, 200);
}
