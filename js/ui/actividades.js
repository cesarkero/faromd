// Bitacora de formacion continuada: articulos, cursos y sesiones clinicas.
// No entran en el temario ni en el repaso espaciado; solo se registran y se
// reflejan en la semana (contador + minutos que suman al total semanal).
import { todayISO, actividadesSemana, cursosActivos } from "../schedule.js";

const TIPOS = [
  ["articulo", "Artículo"],
  ["curso", "Curso"],
  ["sesion", "Sesión clínica"],
];
const TIPO_LABEL = Object.fromEntries(TIPOS);

// estado del formulario, persistente entre re-renders
const ui = { open: false, editingId: null };

function fmtMin(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h && m) return `${h} h ${m}′`;
  if (h) return `${h} h`;
  return `${m}′`;
}
function nuevoId() {
  return "act-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6);
}
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])
  );
}

export function renderActividades(container, plan, { onMutate, readonly }) {
  container.innerHTML = "";
  plan.actividades = plan.actividades || [];

  const semana = actividadesSemana(plan);
  const cursos = cursosActivos(plan);
  const minSemana = semana.reduce((n, a) => n + (a.minutos || 0), 0);

  const head = document.createElement("div");
  head.className = "panel-title act-head";
  const nArt = semana.filter((a) => a.tipo === "articulo").length;
  const nCur = semana.filter((a) => a.tipo === "curso").length;
  const nSes = semana.filter((a) => a.tipo === "sesion").length;
  const resumen =
    semana.length === 0
      ? "nada esta semana"
      : [
          nArt && `${nArt} art.`,
          nCur && `${nCur} curso${nCur > 1 ? "s" : ""}`,
          nSes && `${nSes} sesión${nSes > 1 ? "es" : ""}`,
          minSemana && fmtMin(minSemana),
        ]
          .filter(Boolean)
          .join(" · ");
  head.innerHTML = `Artículos y cursos <span class="act-sum">${esc(resumen)}</span>`;
  container.appendChild(head);

  if (!readonly) {
    const add = document.createElement("button");
    add.className = "mini act-add";
    add.textContent = ui.open && !ui.editingId ? "Cancelar" : "＋ añadir";
    add.onclick = () => {
      ui.open = !(ui.open && !ui.editingId);
      ui.editingId = null;
      rerender();
    };
    head.appendChild(add);

    if (ui.open) {
      container.appendChild(
        formulario(plan, onMutate, rerender, ui.editingId ? byId(plan, ui.editingId) : null)
      );
    }
  }

  const list = document.createElement("ul");
  list.className = "act-list";

  // cursos en marcha (aunque no sean de esta semana)
  for (const a of cursos) {
    if (semana.includes(a)) continue;
    list.appendChild(item(plan, a, onMutate, rerender, readonly, true));
  }
  for (const a of semana) {
    list.appendChild(item(plan, a, onMutate, rerender, readonly, false));
  }

  if (!list.children.length) {
    const p = document.createElement("p");
    p.className = "empty";
    p.textContent = readonly
      ? "Sin artículos ni cursos registrados esta semana."
      : "Sin artículos ni cursos esta semana. Añade una lectura o un curso con «＋ añadir».";
    container.appendChild(p);
  } else {
    container.appendChild(list);
  }

  function rerender() {
    renderActividades(container, plan, { onMutate, readonly });
  }
}

function byId(plan, id) {
  return (plan.actividades || []).find((a) => a.id === id) || null;
}

function item(plan, a, onMutate, rerender, readonly, esCursoActivo) {
  const li = document.createElement("li");
  li.className = "act-item" + (esCursoActivo ? " act-item-curso" : "");
  const tema =
    a.ambito === "tema" && a.temaId
      ? (plan.temas || []).find((t) => t.id === a.temaId)
      : null;
  const donde = tema ? tema.nombre : "transversal";
  const meta = [
    esc(a.fecha || ""),
    a.minutos ? fmtMin(a.minutos) : "",
    esc(donde),
    esCursoActivo && !a.fechaFin ? "en marcha" : "",
  ]
    .filter(Boolean)
    .join(" · ");

  const titulo = a.url
    ? `<a href="${esc(a.url)}" target="_blank" rel="noopener">${esc(a.titulo || "(sin título)")} ↗</a>`
    : esc(a.titulo || "(sin título)");

  li.innerHTML = `
    <span class="act-chip act-chip-${a.tipo}">${esc(TIPO_LABEL[a.tipo] || a.tipo)}</span>
    <span class="act-body">
      <span class="act-titulo">${titulo}</span>
      <span class="act-meta">${meta}</span>
      ${a.notas ? `<span class="act-notas">${esc(a.notas)}</span>` : ""}
    </span>`;

  if (!readonly) {
    const acc = document.createElement("span");
    acc.className = "act-acc";
    if (a.tipo === "curso" && !a.fechaFin) {
      const fin = document.createElement("button");
      fin.className = "mini";
      fin.textContent = "terminado";
      fin.title = "Marcar el curso como completado hoy";
      fin.onclick = () => {
        a.fechaFin = todayISO();
        onMutate();
        rerender();
      };
      acc.appendChild(fin);
    }
    const ed = document.createElement("button");
    ed.className = "mini";
    ed.textContent = "editar";
    ed.onclick = () => {
      ui.open = true;
      ui.editingId = a.id;
      rerender();
    };
    const del = document.createElement("button");
    del.className = "mini";
    del.textContent = "borrar";
    del.onclick = () => {
      if (!confirm(`¿Borrar «${a.titulo || "(sin título)"}»?`)) return;
      plan.actividades = plan.actividades.filter((x) => x.id !== a.id);
      if (ui.editingId === a.id) {
        ui.open = false;
        ui.editingId = null;
      }
      onMutate();
      rerender();
    };
    acc.append(ed, del);
    li.appendChild(acc);
  }
  return li;
}

function formulario(plan, onMutate, rerender, editando) {
  const a = editando || {};
  const form = document.createElement("form");
  form.className = "act-form";
  const temaOpts = (plan.temas || [])
    .map((t) => `<option value="${esc(t.id)}" ${a.temaId === t.id ? "selected" : ""}>${esc(t.nombre)}</option>`)
    .join("");
  form.innerHTML = `
    <label>Tipo
      <select name="tipo">
        ${TIPOS.map(([v, l]) => `<option value="${v}" ${a.tipo === v ? "selected" : ""}>${l}</option>`).join("")}
      </select>
    </label>
    <label class="act-f-grow">Título
      <input type="text" name="titulo" value="${esc(a.titulo || "")}" placeholder="Nuevo objetivo de PA en ≥80 años — NEJM" required>
    </label>
    <label>Fecha
      <input type="date" name="fecha" value="${esc(a.fecha || todayISO())}">
    </label>
    <label>Minutos
      <input type="number" name="minutos" min="0" step="5" value="${a.minutos ?? 30}">
    </label>
    <label>Ámbito
      <select name="ambito">
        <option value="transversal" ${a.ambito !== "tema" ? "selected" : ""}>Transversal</option>
        <option value="tema" ${a.ambito === "tema" ? "selected" : ""}>Vinculado a un tema</option>
      </select>
    </label>
    <label class="act-f-tema" ${a.ambito === "tema" ? "" : "hidden"}>Tema
      <select name="temaId">${temaOpts}</select>
    </label>
    <label class="act-f-grow">Enlace (opcional)
      <input type="url" name="url" value="${esc(a.url || "")}" placeholder="https://…">
    </label>
    <label class="act-f-grow">Nota (opcional)
      <input type="text" name="notas" value="${esc(a.notas || "")}" placeholder="Idea clave que te llevas">
    </label>
    <div class="act-form-acc">
      <button type="submit" class="mini mini-primary">${editando ? "Guardar cambios" : "Añadir"}</button>
      <button type="button" class="mini act-cancel">Cancelar</button>
    </div>`;

  const ambito = form.querySelector('[name="ambito"]');
  const temaWrap = form.querySelector(".act-f-tema");
  ambito.onchange = () => {
    temaWrap.hidden = ambito.value !== "tema";
  };
  form.querySelector(".act-cancel").onclick = () => {
    ui.open = false;
    ui.editingId = null;
    rerender();
  };
  form.onsubmit = (e) => {
    e.preventDefault();
    const f = new FormData(form);
    const rec = {
      id: editando ? editando.id : nuevoId(),
      tipo: f.get("tipo"),
      titulo: (f.get("titulo") || "").trim(),
      fecha: f.get("fecha") || todayISO(),
      fechaFin: editando ? editando.fechaFin || null : null,
      minutos: Math.max(0, parseInt(f.get("minutos"), 10) || 0),
      ambito: f.get("ambito"),
      temaId: f.get("ambito") === "tema" ? f.get("temaId") : null,
      url: (f.get("url") || "").trim(),
      notas: (f.get("notas") || "").trim(),
    };
    if (!rec.titulo) return;
    if (editando) {
      const i = plan.actividades.findIndex((x) => x.id === editando.id);
      if (i >= 0) plan.actividades[i] = rec;
    } else {
      plan.actividades.push(rec);
    }
    ui.open = false;
    ui.editingId = null;
    onMutate();
    rerender();
  };
  return form;
}
