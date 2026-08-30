// Logica del plan: fechas de repaso espaciado, composicion de la sesion de hoy,
// reparto semanal y agregados de tiempo por tema.

// --- fechas (todo en 'YYYY-MM-DD', ancladas a UTC para evitar desfases) ----
export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}
function parseUTC(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}
export function addDays(iso, n) {
  return new Date(parseUTC(iso) + n * 86400000).toISOString().slice(0, 10);
}
export function daysBetween(aIso, bIso) {
  return Math.round((parseUTC(bIso) - parseUTC(aIso)) / 86400000);
}
export function mondayOf(iso) {
  const wd = (new Date(parseUTC(iso)).getUTCDay() + 6) % 7; // 0 = lunes
  return addDays(iso, -wd);
}

// --- recorrido del temario -----------------------------------------
export function flattenMicros(plan) {
  const out = [];
  for (const tema of plan.temas || []) {
    for (const sub of tema.subtemas || []) {
      for (const micro of sub.microtemas || []) {
        out.push({ tema, sub, micro });
      }
    }
  }
  return out;
}
export function findMicro(plan, microId) {
  return flattenMicros(plan).find((r) => r.micro.id === microId) || null;
}

// --- repaso espaciado ---------------------------------------------
export function intervalsFor(sub, config) {
  const base = config.intervalosRepaso || [1, 3, 7, 21, 60];
  const freq = config.intervalosFrecuente || base;
  return sub && sub.frecuente ? freq : base;
}
export function nextReviewDate(micro, sub, config, fromIso) {
  const ints = intervalsFor(sub, config);
  const idx = Math.min(Math.max(micro.repasos - 1, 0), ints.length - 1);
  return addDays(fromIso, ints[idx]);
}

// Marca un microtema como estudiado por primera vez (programa el 1er repaso).
export function markStudied(micro, sub, config, iso = todayISO()) {
  micro.estado = "finalizado";
  micro.fechaEstudio = iso;
  micro.repasos = 0;
  micro.fechaUltimoRepaso = null;
  micro.aplazado = 0;
  micro.fechaProximoRepaso = addDays(iso, intervalsFor(sub, config)[0]);
}

// Marca un repaso realizado y reprograma el siguiente.
export function markReview(micro, sub, config, iso = todayISO()) {
  micro.repasos = (micro.repasos || 0) + 1;
  micro.fechaUltimoRepaso = iso;
  micro.estado = "finalizado";
  micro.aplazado = 0;
  micro.fechaProximoRepaso = nextReviewDate(micro, sub, config, iso);
}

// Un microtema esta "muy retrasado" si su repaso se ha aplazado varias veces.
export function muyRetrasado(micro, config) {
  return (micro.aplazado || 0) >= ((config && config.avisoAplazado) || 3);
}

// Peso de un subtema para la aleatoriedad ponderada: mas alto = sale mas.
function subWeight(sub) {
  return (sub.frecuente ? 3 : 1) * (sub.prioridad || 1);
}

// PRNG con semilla (mulberry32 sobre un hash de la cadena) para que la sesion
// de un dia sea aleatoria pero ESTABLE dentro de ese dia.
function seededRng(seed) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  }
  return function () {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function weightedPick(items, weightOf, rng) {
  if (!items.length) return null;
  const w = items.map((it) => Math.max(0.0001, weightOf(it)));
  const total = w.reduce((a, x) => a + x, 0);
  let x = rng() * total;
  for (let i = 0; i < items.length; i++) {
    x -= w[i];
    if (x <= 0) return items[i];
  }
  return items[items.length - 1];
}

// --- vencidos ----------------------------------------------------
export function overdueMicros(plan, iso = todayISO()) {
  return flattenMicros(plan)
    .filter(
      (r) =>
        r.micro.estado === "finalizado" &&
        r.micro.fechaProximoRepaso &&
        r.micro.fechaProximoRepaso <= iso
    )
    .sort((a, b) => {
      const ap = (b.micro.aplazado || 0) - (a.micro.aplazado || 0);
      if (ap) return ap; // los mas aplazados primero
      const da = daysBetween(a.micro.fechaProximoRepaso, iso);
      const db = daysBetween(b.micro.fechaProximoRepaso, iso);
      if (db !== da) return db - da; // mas atrasado primero
      return (b.sub.frecuente ? 1 : 0) - (a.sub.frecuente ? 1 : 0);
    });
}

// Siguiente microtema de estudio: primero "programado", luego "sin_empezar".
export function currentStudyMicro(plan) {
  const flat = flattenMicros(plan);
  return (
    flat.find((r) => r.micro.estado === "programado") ||
    flat.find((r) => r.micro.estado === "sin_empezar") ||
    null
  );
}

// Frente de estudio: el primer microtema pendiente de cada subtema que tenga
// alguno. Asi se avanzan varios subtemas en paralelo (ponderado por prioridad).
function studyFronts(plan, estado) {
  const fronts = [];
  for (const tema of plan.temas || []) {
    for (const sub of tema.subtemas || []) {
      const m = (sub.microtemas || []).find((mi) =>
        estado ? mi.estado === estado : mi.estado !== "finalizado"
      );
      if (m) fronts.push({ tema, sub, micro: m });
    }
  }
  return fronts;
}

// --- composicion de la sesion de hoy --------------------------
// Estructura fija de 4 roles (como img/reparto_estudio_circular.svg):
//   P1 Repaso · P2 Tema/Repaso · P3 Tema principal · P4 Cierre activo
// El contenido es aleatorio PONDERADO (temas frecuentes / de mayor prioridad
// salen mas), estable dentro del dia por la semilla, y los 4 bloques SIEMPRE
// son de subtemas distintos.
export function composeSession(plan, iso = todayISO()) {
  const rng = seededRng(iso + "|" + (plan.meta?.semilla || ""));
  const usadas = new Set(); // subtema.id ya asignados hoy

  const od = overdueMicros(plan, iso);
  const nuevos = studyFronts(plan, "sin_empezar");
  const enCurso = studyFronts(plan, "programado")[0] || null;
  const recall = flattenMicros(plan).filter(
    (r) => r.micro.estado === "finalizado" && (!r.micro.fechaProximoRepaso || r.micro.fechaProximoRepaso > iso)
  );

  const wRep = (r) =>
    subWeight(r.sub) +
    Math.max(0, daysBetween(r.micro.fechaProximoRepaso || iso, iso)) * 0.3 +
    (r.micro.aplazado || 0);
  const wEst = (r) => subWeight(r.sub);

  // elige de la primera lista con candidatos libres (subtema no usado), ponderado
  const elegir = (...listasConPeso) => {
    for (const [lista, peso] of listasConPeso) {
      const libres = (lista || []).filter((r) => r && r.sub && !usadas.has(r.sub.id));
      const pick = weightedPick(libres, peso, rng) || libres[0];
      if (pick) {
        usadas.add(pick.sub.id);
        return pick;
      }
    }
    return null;
  };

  // P3 · tema principal: el microtema a medias, o un tema nuevo por sorteo
  let p3 = enCurso;
  if (p3) usadas.add(p3.sub.id);
  else p3 = elegir([nuevos, wEst], [recall, wRep]);

  // P1 · repaso: vencido; si no hay, recall de algo ya visto; si no, otro tema nuevo
  const p1 = elegir([od, wRep], [recall, wRep], [nuevos, wEst]);
  // P2 · tema / repaso: 2o vencido si lo hay; si no, otro tema nuevo
  const rep2 = elegir([od, wRep]);
  const est2 = rep2 ? null : elegir([nuevos, wEst], [recall, wRep]);
  // P4 · cierre activo: otro tema nuevo distinto, o recall
  const p4 = elegir([nuevos, wEst], [recall, wRep], [od, wRep]);

  const id = (x) => (x ? x.micro.id : null);
  const b = (pomodoro, rol, tipo, cand, rotulo) => ({
    pomodoro,
    rol,
    tipo,
    rotulo,
    microtemaId: id(cand),
    hecho: false,
  });
  const bloques = [
    b(1, "repaso", "repaso", p1, "REPASO"),
    rep2
      ? b(2, "tema_repaso", "repaso", rep2, "TEMA / REPASO")
      : b(2, "tema_repaso", "tema", est2, "TEMA / REPASO"),
    b(3, "tema", "tema", p3, "TEMA PRINCIPAL"),
    b(4, "cierre", "cierre", p4, "CIERRE ACTIVO"),
  ];
  return { fecha: iso, bloques, completada: false };
}

// Marca / desmarca un bloque concreto de la sesion, aplicando o revirtiendo
// sus efectos (minutos y, si es repaso, la reprogramacion del repaso).
export function markBloque(plan, sesion, idx, iso = todayISO()) {
  const b = sesion.bloques[idx];
  if (!b || b.hecho) return;
  b.hecho = true;
  const r = b.microtemaId && findMicro(plan, b.microtemaId);
  if (r) {
    b._backup = {
      estado: r.micro.estado,
      repasos: r.micro.repasos,
      fechaEstudio: r.micro.fechaEstudio,
      fechaUltimoRepaso: r.micro.fechaUltimoRepaso,
      fechaProximoRepaso: r.micro.fechaProximoRepaso,
      minutosDedicados: r.micro.minutosDedicados || 0,
    };
    r.micro.minutosDedicados = (r.micro.minutosDedicados || 0) + (plan.config.minutosPomodoro || 25);
    if (r.micro.estado === "finalizado" && (b.tipo === "repaso" || b.tipo === "cierre")) {
      // repaso real de algo ya estudiado: reprograma el siguiente repaso
      markReview(r.micro, r.sub, plan.config, iso);
    } else if (b.tipo === "tema" && r.micro.estado === "sin_empezar") {
      // solo el bloque de estudio (P2 estudio / P3) arranca un microtema nuevo
      r.micro.estado = "programado";
    }
    // P1 repaso / P4 cierre sobre algo aun sin estudiar = solo calentamiento
    // (suma minutos, no cambia el estado)
  }
  sesion.completada = sesion.bloques.every((x) => x.hecho);
}

export function unmarkBloque(plan, sesion, idx) {
  const b = sesion.bloques[idx];
  if (!b || !b.hecho) return;
  b.hecho = false;
  const r = b.microtemaId && findMicro(plan, b.microtemaId);
  if (r && b._backup) Object.assign(r.micro, b._backup);
  delete b._backup;
  sesion.completada = false;
}

// Rehace los bloques AUN NO marcados de la sesion segun el estado actual del
// temario (fechas de repaso editadas a mano, microtemas nuevos, etc.).
// Los bloques ya hechos se conservan intactos.
export function recomposeUnmarked(plan, sesion, iso = todayISO()) {
  if (!sesion || sesion.completada || sesion.cerrada) return sesion;
  const fresh = composeSession(plan, iso);
  sesion.bloques = fresh.bloques.map((fb, i) => {
    const cur = sesion.bloques[i];
    return cur && cur.hecho ? cur : fb;
  });
  sesion.completada = sesion.bloques.every((x) => x.hecho);
  return sesion;
}

// --- cierre de dia -------------------------------------------------
// Cierra el dia `iso`: fija la sesion tal cual, DESLIZA a manana los repasos
// vencidos que no se han hecho (contando el aplazamiento) y guarda el registro.
export function closeDay(plan, iso = todayISO()) {
  plan.sesiones = plan.sesiones || [];
  let ses = plan.sesiones.find((s) => s.fecha === iso) || composeSession(plan, iso);
  const min = plan.config.minutosPomodoro || 25;
  ses._deslizados = [];
  let deslizados = 0;

  for (const bq of ses.bloques) {
    if (bq.hecho || !bq.microtemaId) continue;
    const r = findMicro(plan, bq.microtemaId);
    if (!r) continue;
    const esRepasoVencido =
      r.micro.estado === "finalizado" &&
      r.micro.fechaProximoRepaso &&
      r.micro.fechaProximoRepaso <= iso;
    if (esRepasoVencido) {
      ses._deslizados.push({
        id: r.micro.id,
        fecha: r.micro.fechaProximoRepaso,
        aplazado: r.micro.aplazado || 0,
      });
      r.micro.fechaProximoRepaso = addDays(iso, 1);
      r.micro.aplazado = (r.micro.aplazado || 0) + 1;
      deslizados++;
    }
    // los bloques de estudio no tienen fecha que mover: el microtema sigue
    // pendiente y volvera a salir.
  }

  ses.cerrada = true;
  ses.completada = ses.bloques.every((b) => b.hecho);
  ses.minutos = ses.bloques.filter((b) => b.hecho).length * min;
  upsertSession(plan, ses);
  const muyRetrasados = flattenMicros(plan).filter((r) => muyRetrasado(r.micro, plan.config)).length;
  return { fecha: iso, deslizados, muyRetrasados, hechos: ses.bloques.filter((b) => b.hecho).length };
}

// Reabre un dia cerrado y deshace el deslizamiento de repasos.
export function reopenDay(plan, iso = todayISO()) {
  const ses = (plan.sesiones || []).find((s) => s.fecha === iso);
  if (!ses || !ses.cerrada) return;
  for (const d of ses._deslizados || []) {
    const r = findMicro(plan, d.id);
    if (r) {
      r.micro.fechaProximoRepaso = d.fecha;
      r.micro.aplazado = d.aplazado;
    }
  }
  delete ses._deslizados;
  delete ses.cerrada;
  delete ses.minutos;
}

// Al abrir la web: cierra los dias pasados que quedaron abiertos y recoloca
// en "hoy" cualquier repaso que se quedo atras por dias sin abrir la app.
export function catchUp(plan, iso = todayISO()) {
  plan.sesiones = plan.sesiones || [];
  const pendientes = plan.sesiones
    .filter((s) => s.fecha < iso && !s.cerrada)
    .map((s) => s.fecha)
    .sort();
  let diasCerrados = 0;
  let deslizados = 0;
  for (const f of pendientes) {
    const r = closeDay(plan, f);
    diasCerrados++;
    deslizados += r.deslizados;
  }
  // dias completamente ausentes: repasos que siguen en el pasado -> hoy
  for (const { micro } of flattenMicros(plan)) {
    if (
      micro.estado === "finalizado" &&
      micro.fechaProximoRepaso &&
      micro.fechaProximoRepaso < iso
    ) {
      micro.fechaProximoRepaso = iso;
      micro.aplazado = (micro.aplazado || 0) + 1;
      deslizados++;
    }
  }
  const muyRetrasados = flattenMicros(plan).filter((r) => muyRetrasado(r.micro, plan.config)).length;
  return { diasCerrados, deslizados, muyRetrasados };
}

// Guarda la sesion del dia en el plan (upsert por fecha).
export function upsertSession(plan, sesion) {
  plan.sesiones = plan.sesiones || [];
  const i = plan.sesiones.findIndex((s) => s.fecha === sesion.fecha);
  if (i >= 0) plan.sesiones[i] = sesion;
  else plan.sesiones.push(sesion);
}

// Etiqueta legible de un bloque (subtema al que pertenece el microtema).
export function bloqueLabel(plan, bloque) {
  if (!bloque.microtemaId) return { titulo: "Libre", sub: "" };
  const r = findMicro(plan, bloque.microtemaId);
  if (!r) return { titulo: "?", sub: "" };
  return {
    titulo: r.sub.nombre,
    sub: r.micro.nombre,
    tema: r.tema,
    frecuente: r.sub.frecuente,
    retrasado: muyRetrasado(r.micro, plan.config),
  };
}

// --- agregados ----------------------------------------------------
export function timeByTema(plan) {
  // minutos de actividades de formacion, por tema vinculado o transversales
  const porTema = {};
  let transversal = 0;
  for (const a of plan.actividades || []) {
    const m = a.minutos || 0;
    if (a.ambito === "tema" && a.temaId) porTema[a.temaId] = (porTema[a.temaId] || 0) + m;
    else transversal += m;
  }

  const rows = [];
  for (const tema of plan.temas || []) {
    const segments = [];
    let total = 0;
    for (const sub of tema.subtemas || []) {
      const m = (sub.microtemas || []).reduce(
        (s, mi) => s + (mi.minutosDedicados || 0),
        0
      );
      if (m > 0) segments.push({ nombre: sub.nombre, minutos: m });
      total += m;
    }
    if (porTema[tema.id]) {
      segments.push({ nombre: "Artículos y cursos", minutos: porTema[tema.id] });
      total += porTema[tema.id];
    }
    rows.push({ tema, total, segments });
  }
  const out = rows.filter((r) => r.total > 0).sort((a, b) => b.total - a.total);
  if (transversal > 0) {
    out.push({
      tema: { id: "_transversal", nombre: "Formación transversal", area: "FORMACION" },
      total: transversal,
      segments: [{ nombre: "Artículos y cursos", minutos: transversal }],
    });
  }
  return out;
}

// Actividades de formacion (articulos, cursos, sesiones clinicas) de una semana.
export function actividadesSemana(plan, iso = todayISO()) {
  const lunes = mondayOf(iso);
  const domingo = addDays(lunes, 6);
  return (plan.actividades || [])
    .filter((a) => a.fecha && a.fecha >= lunes && a.fecha <= domingo)
    .sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
}
// Cursos empezados y sin fecha de fin (siguen en marcha aunque no sean de esta semana).
export function cursosActivos(plan) {
  return (plan.actividades || []).filter((a) => a.tipo === "curso" && !a.fechaFin);
}

export function weeklyStats(plan, iso = todayISO()) {
  const lunes = mondayOf(iso);
  const domingo = addDays(lunes, 6);
  const min = plan.config.minutosPomodoro || 25;
  const semana = (plan.sesiones || []).filter((s) => s.fecha >= lunes && s.fecha <= domingo);
  const pomodoros = semana.reduce((n, s) => n + s.bloques.filter((b) => b.hecho).length, 0);
  const acts = actividadesSemana(plan, iso);
  const actMin = acts.reduce((n, a) => n + (a.minutos || 0), 0);
  return {
    lunes,
    domingo,
    sesiones: semana.filter((s) => s.bloques.some((b) => b.hecho)).length,
    pomodoros,
    minutosSesiones: pomodoros * min,
    minutos: pomodoros * min + actMin, // total de la semana: temario + formacion
    actividades: {
      articulos: acts.filter((a) => a.tipo === "articulo").length,
      cursos: acts.filter((a) => a.tipo === "curso").length,
      sesiones: acts.filter((a) => a.tipo === "sesion").length,
      total: acts.length,
      minutos: actMin,
    },
    metaMin: (plan.config.metaHorasSemana || 10) * 60,
    metaSesiones: plan.config.sesionesSemana || 5,
  };
}

export function progresoGlobal(plan) {
  const flat = flattenMicros(plan);
  const total = flat.length;
  const finalizados = flat.filter((r) => r.micro.estado === "finalizado").length;
  const programados = flat.filter((r) => r.micro.estado === "programado").length;
  return { total, finalizados, programados, sinEmpezar: total - finalizados - programados };
}
