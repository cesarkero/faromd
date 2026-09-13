// Modal de ayuda: resumen de uso, sin depender de enlaces externos (el
// repositorio de GitHub es privado y un enlace directo da 404 si no has
// iniciado sesion, p.ej. desde el movil).
export function openHelp() {
  const back = document.createElement("div");
  back.className = "modal-back";
  back.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-label="Ayuda">
      <div class="modal-head">
        <h2>Cómo se usa</h2>
        <button class="modal-x" aria-label="Cerrar">×</button>
      </div>
      <div class="modal-body">
        <h3>Sesión de hoy</h3>
        <p class="hint">
          4 bloques fijos: <b>P1 Repaso · P2 Tema/Repaso · P3 Tema principal · P4 Cierre</b>.
          Márcalos según los estudias. <b>Cerrar día</b> desliza a mañana los repasos que
          queden sin hacer; <b>Reabrir día</b> lo deshace.
        </p>
        <h3>Repasos rápidos</h3>
        <p class="hint">
          Junto al círculo, arrastra una tarjeta a un bloque <b>P1 Repaso</b> o
          <b>P2 Tema/Repaso</b> para anotar que también repasaste ese tema ahí (o pulsa
          «repaso hecho» para registrarlo al instante, sin bloque). Al marcar el bloque,
          el tiempo se reparte por igual entre todos los temas anotados en él.
        </p>
        <h3>Estudiado vs. Repaso</h3>
        <p class="hint">
          <b>Estudiado</b> = primera vez (arranca el ciclo de repaso espaciado).
          <b>Repaso</b> = ya lo habías estudiado (avanza la cadena y aleja la siguiente fecha).
        </p>
        <h3>Fuentes</h3>
        <p class="hint">
          El nombre del microtema lleva subrayado punteado y el libro en gris cuando tiene
          fuentes anotadas; pasa el ratón por encima para ver la ficha completa (capítulo,
          página, enlace al material). <b>＋ fuente</b> para añadirlas.
        </p>
        <h3>Edición</h3>
        <p class="hint">
          En <code>localhost</code> puedes probar todo libremente (los cambios solo van al
          borrador). En la web publicada hace falta un token en <b>Ajustes</b> para guardar
          en GitHub; sin token queda en solo lectura.
        </p>
      </div>
    </div>`;
  const close = () => back.remove();
  back.querySelector(".modal-x").onclick = close;
  back.onclick = (e) => {
    if (e.target === back) close();
  };
  document.body.appendChild(back);
}
