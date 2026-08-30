// Orquestacion del dashboard.
import {
  loadPlan,
  savePlan,
  hasToken,
  saveDraft,
  loadDraft,
  clearDraft,
  importPlanFile,
} from "./store.js";
import {
  todayISO,
  composeSession,
  recomposeUnmarked,
  catchUp,
  closeDay,
  reopenDay,
  markBloque,
  unmarkBloque,
  upsertSession,
  overdueMicros,
  weeklyStats,
  progresoGlobal,
  markReview,
  muyRetrasado,
  findMicro,
} from "./schedule.js";
import { renderCircle } from "./ui/circle.js";
import { renderBars } from "./ui/bars.js";
import { renderTable } from "./ui/table.js";
import { openSettings } from "./ui/settings.js";
import { downloadCSV, downloadJSON, downloadXLSX } from "./csv.js";

let plan = null;
let source = "static";
let dirty = false;
let session = null;

const $ = (s) => document.querySelector(s);
// En local (localhost / archivo) se puede probar la interaccion sin token;
// los cambios solo van al borrador y a Exportar, nunca a GitHub.
const localDev = ["localhost", "127.0.0.1", ""].includes(location.hostname);
const readonly = () => !hasToken() && !localDev;

init();

async function init() {
  wireToolbar();
  let loadWarning = "";
  try {
    const res = await loadPlan();
    plan = res.plan;
    source = res.source;
    loadWarning = res.warning || "";
  } catch (e) {
    fatal(e.message);
    return;
  }

  const draft = loadDraft();
  if (draft && JSON.stringify(draft) !== JSON.stringify(plan)) {
    if (
      confirm(
        "Hay cambios locales sin guardar de una sesion anterior.\n\n" +
          "Aceptar = recuperarlos · Cancelar = descartarlos y usar la version del repositorio."
      )
    ) {
      plan = draft;
      dirty = true;
    } else {
      clearDraft();
    }
  }

  const cu = catchUp(plan);
  refreshSession();
  render();
  if (loadWarning) toast(loadWarning);
  else if (cu.diasCerrados || cu.deslizados) {
    const partes = [];
    if (cu.diasCerrados) partes.push(`${cu.diasCerrados} dia(s) cerrado(s)`);
    if (cu.deslizados) partes.push(`${cu.deslizados} repaso(s) movido(s) a hoy`);
    if (cu.muyRetrasados) partes.push(`${cu.muyRetrasados} muy retrasado(s)`);
    toast("Puesta al dia: " + partes.join(" · "));
  }
  window.addEventListener("beforeunload", (e) => {
    if (dirty && hasToken()) {
      e.preventDefault();
      e.returnValue = "";
    }
  });
}

// --- sesion de hoy -------------------------------------------------
function sessionStarted() {
  return (plan.sesiones || []).some((s) => s.fecha === todayISO());
}
function refreshSession() {
  const iso = todayISO();
  const stored = (plan.sesiones || []).find((s) => s.fecha === iso);
  // si ya se ha tocado algun bloque hoy, la sesion queda "congelada";
  // si no, se recompone en cada render segun el estado del temario.
  session = stored || composeSession(plan, iso);
}

function mutate() {
  dirty = true;
  saveDraft(plan);
  // la planificacion de hoy se re-ajusta a los cambios del temario
  // (fechas de repaso a mano, estados…) mientras la sesion no este cerrada/completa.
  if (session && !session.completada && !session.cerrada) {
    if (sessionStarted()) recomposeUnmarked(plan, session, todayISO());
    else refreshSession();
  }
  render();
}

function toggleBloque(idx) {
  if (session.cerrada) return;
  if (!sessionStarted()) {
    upsertSession(plan, session); // congela la composicion del dia
  }
  const b = session.bloques[idx];
  if (b.hecho) unmarkBloque(plan, session, idx);
  else markBloque(plan, session, idx, todayISO());
  // si la sesion queda vacia, la soltamos para que se recomponga
  if (!session.bloques.some((x) => x.hecho)) {
    plan.sesiones = (plan.sesiones || []).filter((s) => s.fecha !== todayISO());
    refreshSession();
  }
  mutate();
}

// --- render -------------------------------------------------------
function render() {
  document.body.dataset.readonly = readonly() ? "1" : "0";

  renderCircle($("#circle"), plan, session, {
    readonly: readonly(),
    onToggle: toggleBloque,
    onCloseDay: () => {
      if (!confirm("Cerrar el dia de hoy? Los repasos que queden sin hacer se mueven a manana.")) return;
      const r = closeDay(plan, todayISO());
      refreshSession();
      mutate();
      toast(
        `Dia cerrado: ${r.hechos}/${session.bloques.length} bloques` +
          (r.deslizados ? ` · ${r.deslizados} repaso(s) a manana` : "")
      );
    },
    onReopenDay: () => {
      reopenDay(plan, todayISO());
      refreshSession();
      mutate();
    },
    onMarkAll: () => {
      if (!sessionStarted()) upsertSession(plan, session);
      session.bloques.forEach((b, i) => {
        if (!b.hecho) markBloque(plan, session, i, todayISO());
      });
      mutate();
    },
    onReset: () => {
      session.bloques.forEach((b, i) => {
        if (b.hecho) unmarkBloque(plan, session, i);
      });
      plan.sesiones = (plan.sesiones || []).filter((s) => s.fecha !== todayISO());
      refreshSession();
      mutate();
    },
  });

  renderBars($("#bars"), plan);
  renderWeekly();
  renderOverdue();
  renderTable($("#table"), plan, { onMutate: mutate, readonly: readonly() });
  renderStatus();
}

function renderWeekly() {
  const w = weeklyStats(plan);
  const g = progresoGlobal(plan);
  const pct = Math.min(100, Math.round((w.minutos / w.metaMin) * 100));
  $("#weekly").innerHTML = `
    <div class="strip">
      <div class="strip-cell">
        <span class="strip-label">Semana</span>
        <span class="strip-value">${(w.minutos / 60).toFixed(1)}<small> / ${(w.metaMin / 60).toFixed(0)} h</small></span>
      </div>
      <div class="strip-bar"><span style="width:${pct}%"></span></div>
      <div class="strip-cell">
        <span class="strip-label">Sesiones</span>
        <span class="strip-value">${w.sesiones}<small> / ${w.metaSesiones}</small></span>
      </div>
      <div class="strip-cell">
        <span class="strip-label">Temario</span>
        <span class="strip-value">${g.finalizados}<small> / ${g.total}</small></span>
      </div>
      <div class="strip-cell strip-grow">
        <span class="strip-label">Estado</span>
        <span class="strip-sub">${g.programados} en curso · ${g.sinEmpezar} sin empezar</span>
      </div>
    </div>`;
}

function renderOverdue() {
  const list = overdueMicros(plan).slice(0, 10);
  const box = $("#overdue");
  if (!list.length) {
    box.classList.add("card-strip");
    box.innerHTML =
      '<span class="panel-title" style="margin:0">Repasos vencidos</span> <span class="empty">nada vencido, al dia 🎉</span>';
    return;
  }
  box.classList.remove("card-strip");
  box.innerHTML =
    `<div class="panel-title">Repasos vencidos <span class="count">${
      overdueMicros(plan).length
    }</span></div>` +
    `<ul class="overdue-list">` +
    list
      .map((r) => {
        const dias = Math.round(
          (new Date(todayISO()) - new Date(r.micro.fechaProximoRepaso)) / 86400000
        );
        const retra = muyRetrasado(r.micro, plan.config);
        return `<li data-id="${r.micro.id}" class="${retra ? "od-retra" : ""}">
          <span class="od-name">${retra ? "⚠ " : ""}${r.micro.nombre}</span>
          <span class="od-meta">${r.sub.nombre} · +${dias}d${
          r.micro.aplazado ? ` · aplazado ×${r.micro.aplazado}` : ""
        }${r.sub.frecuente ? " · frecuente" : ""}</span>
          ${readonly() ? "" : '<button class="mini od-do">repaso hecho</button>'}
        </li>`;
      })
      .join("") +
    `</ul>`;
  box.querySelectorAll(".od-do").forEach((btn) => {
    btn.onclick = () => {
      const id = btn.closest("li").dataset.id;
      const r = findMicro(plan, id);
      if (r) markReview(r.micro, r.sub, plan.config);
      mutate();
    };
  });
}

function renderStatus() {
  const pill = $("#status");
  let text, cls;
  if (dirty && hasToken()) {
    text = "Cambios sin guardar";
    cls = "dirty";
  } else if (dirty) {
    text = "Cambios solo en este equipo";
    cls = "dirty";
  } else if (source === "github") {
    text = "Sincronizado con GitHub";
    cls = "ok";
  } else if (hasToken()) {
    text = "Sin conexion con GitHub";
    cls = "ro";
  } else if (localDev) {
    text = "Modo local · prueba libre";
    cls = "ro";
  } else {
    text = "Solo lectura (sin token)";
    cls = "ro";
  }
  pill.textContent = text;
  pill.className = "pill " + cls;
  $("#btn-save").disabled = !dirty || !hasToken();
}

// --- toolbar ----------------------------------------------------
function wireToolbar() {
  $("#btn-save").onclick = async () => {
    if (!dirty) return;
    const btn = $("#btn-save");
    btn.disabled = true;
    btn.textContent = "Guardando…";
    try {
      await savePlan(plan);
      dirty = false;
      source = "github";
      toast("Guardado en GitHub.");
    } catch (e) {
      if (e.code === "CONFLICT" && confirm(e.message + "\n\n¿Recargar ahora?")) {
        location.reload();
        return;
      }
      alert("No se pudo guardar:\n" + e.message);
    } finally {
      btn.textContent = "Guardar en GitHub";
      render();
    }
  };

  // menu Datos (exportar / importar)
  const menu = $("#datos-menu");
  const menuBtn = $("#btn-datos");
  const closeMenu = () => {
    menu.hidden = true;
    menuBtn.setAttribute("aria-expanded", "false");
  };
  menuBtn.onclick = (e) => {
    e.stopPropagation();
    menu.hidden = !menu.hidden;
    menuBtn.setAttribute("aria-expanded", String(!menu.hidden));
  };
  document.addEventListener("click", (e) => {
    if (!menu.hidden && !menu.contains(e.target)) closeMenu();
  });
  menu.onclick = async (e) => {
    const act = e.target.dataset && e.target.dataset.act;
    if (!act) return;
    closeMenu();
    try {
      if (act === "csv") downloadCSV(plan);
      else if (act === "json") downloadJSON(plan);
      else if (act === "xlsx") await downloadXLSX(plan);
      else if (act === "import") $("#file-import").click();
    } catch (err) {
      alert(err.message);
    }
  };

  $("#file-import").onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const imported = await importPlanFile(file);
      if (!imported.temas) throw new Error("El JSON no tiene «temas».");
      plan = imported;
      refreshSession();
      dirty = true;
      saveDraft(plan);
      render();
      toast("Plan importado. Recuerda «Guardar en GitHub».");
    } catch (err) {
      alert("Importacion fallida:\n" + err.message);
    }
    e.target.value = "";
  };

  $("#btn-settings").onclick = () =>
    openSettings({
      onChange: () => location.reload(),
    });
}

// --- utilidades UI -------------------------------------------
function toast(msg) {
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add("show"), 10);
  setTimeout(() => {
    t.classList.remove("show");
    setTimeout(() => t.remove(), 300);
  }, 3200);
}
function fatal(msg) {
  document.querySelector("main").innerHTML = `
    <div class="fatal">
      <h2>No se pudo cargar el plan</h2>
      <p>${msg}</p>
      <button class="btn btn-primary" onclick="location.reload()">Reintentar</button>
    </div>`;
}
