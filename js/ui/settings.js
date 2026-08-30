// Modal de ajustes: token de GitHub y datos del repositorio.
import { CONFIG } from "../config.js";
import { getToken, setToken } from "../store.js";

export function openSettings({ onChange, onFactoryReset }) {
  const back = document.createElement("div");
  back.className = "modal-back";
  const tokenSet = !!getToken();
  back.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-label="Ajustes">
      <div class="modal-head">
        <h2>Ajustes</h2>
        <button class="modal-x" aria-label="Cerrar">×</button>
      </div>
      <div class="modal-body">
        <h3>Token de GitHub</h3>
        <p class="hint">
          Para editar el plan desde esta pagina necesitas un
          <b>fine-grained personal access token</b> con permiso
          <i>Contents: Read and write</i> solo sobre el repositorio
          <code>${CONFIG.owner}/${CONFIG.repo}</code>.
          Se guarda unicamente en este navegador (localStorage) y solo se envia a
          <code>api.github.com</code>.
        </p>
        <p class="hint">
          Crear token:
          <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">
            github.com/settings/personal-access-tokens</a>
        </p>
        <input type="password" class="s-token inp-wide" placeholder="${
          tokenSet ? "•••••••••• (token guardado)" : "github_pat_…"
        }" autocomplete="off">
        <div class="modal-actions">
          <button class="btn btn-primary s-save">Guardar token</button>
          <button class="btn btn-ghost s-clear">Quitar token</button>
        </div>
        <p class="s-msg"></p>

        <h3>Repositorio de datos</h3>
        <p class="hint">Configurado en <code>js/config.js</code>:</p>
        <ul class="kv">
          <li><span>owner</span><code>${CONFIG.owner}</code></li>
          <li><span>repo</span><code>${CONFIG.repo}</code></li>
          <li><span>branch</span><code>${CONFIG.branch}</code></li>
          <li><span>path</span><code>${CONFIG.path}</code></li>
        </ul>

        <details class="danger">
          <summary>Zona peligrosa</summary>
          <p class="hint">
            <b>Restaurar plan de fábrica</b>: borra todo tu progreso (estados, fechas, repasos,
            sesiones, minutos) y vuelve al temario en blanco de <code>data/plan.example.json</code>.
            Los cambios no se suben hasta que pulses «Guardar en GitHub».
          </p>
          <button class="btn s-reset">Restaurar plan de fábrica…</button>
          <p class="s-msg2"></p>
        </details>
      </div>
    </div>`;

  const close = () => back.remove();
  back.querySelector(".modal-x").onclick = close;
  back.onclick = (e) => {
    if (e.target === back) close();
  };
  const msg = back.querySelector(".s-msg");
  back.querySelector(".s-save").onclick = () => {
    const v = back.querySelector(".s-token").value.trim();
    if (!v) {
      msg.textContent = "Escribe un token o usa «Quitar token».";
      return;
    }
    setToken(v);
    msg.textContent = "Token guardado. Recargando datos…";
    onChange();
    close();
  };
  back.querySelector(".s-clear").onclick = () => {
    setToken("");
    msg.textContent = "Token eliminado. La pagina queda en solo lectura.";
    onChange();
    close();
  };

  const resetBtn = back.querySelector(".s-reset");
  if (resetBtn)
    resetBtn.onclick = async () => {
      const msg2 = back.querySelector(".s-msg2");
      const frase = "RESTAURAR";
      const escrito = prompt(
        `Esto BORRA todo tu progreso.\n\nEscribe ${frase} para confirmar:`
      );
      if (escrito !== frase) {
        msg2.textContent = "Cancelado.";
        return;
      }
      msg2.textContent = "Restaurando…";
      try {
        await onFactoryReset();
        msg2.textContent = "Plan de fábrica cargado. Revisa y pulsa «Guardar en GitHub».";
        close();
      } catch (e) {
        msg2.textContent = "Error: " + e.message;
      }
    };

  document.body.appendChild(back);
  back.querySelector(".s-token").focus();
}
