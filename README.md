# Faromd

Dashboard personal de plan de estudio para **medicina de familia y urgencias**: repasar de
forma constante y espaciada el temario de atención primaria y emergencias, con más peso en
los temas frecuentes en consulta (HTA, diabetes, dislipemia…), para mantenerse al día en la
profesión y preparar un futuro MIR. Los días sin estudiar no penalizan: la planificación se
recalcula siempre desde el estado real del temario.

Es una web estática (HTML + JS, sin build ni servidor) publicada en GitHub Pages; todos los
datos viven en un único JSON versionado en este mismo repositorio.

## Qué hace

- **Sesión diaria** de 4 bloques de 25 min — repaso · tema/repaso · tema principal · cierre
  activo —, sorteados con más peso hacia los temas frecuentes y prioritarios, con un círculo
  visual inspirado en `img/reparto_estudio_circular.svg`.
- **Repaso espaciado** por microtema (intervalos 1-3-7-21-60 días, más cortos para los temas
  frecuentes): reprograma solo y desliza a mañana lo que no dé tiempo a hacer.
- **Repasos rápidos**: arrastra varios temas vencidos a un bloque de repaso para anotarlos
  todos de una vez, repartiendo el tiempo del bloque entre ellos.
- **Tiempo por tema** (barras apiladas) y progreso semanal frente a un objetivo de horas y
  número de sesiones.
- **Bitácora de formación continuada** (artículos, cursos, sesiones clínicas), aparte del
  temario pero sumando al total semanal.
- **Tabla del temario** (temas ▸ subtemas ▸ microtemas) como base de datos: estado, Anki,
  número de repasos, fechas y fuentes bibliográficas (libro, capítulo, página, enlace) de
  cada microtema; exportable a CSV, Excel o JSON.

# Cómo funciona el dashboard

Vive en la raíz del repo, sin build; todos los datos están en `data/plan.json`, que es la
**única fuente de verdad**.

## Estructura

- `index.html` – una sola hoja.
- `assets/styles.css` – estilos y paleta (tomada de `/img`, suavizada a pastel).
- `js/config.js` – **owner / repo / branch** del repositorio y claves de localStorage.
- `js/store.js` – carga y guardado vía API de GitHub, borrador local, importar plan.
- `js/schedule.js` – repaso espaciado, composición de la sesión del día, cierre de día,
  agregados de la semana y de la bitácora de formación.
- `js/csv.js` – exportación del temario a CSV / Excel (.xlsx) / JSON.
- `js/ui/*` – círculo de sesión, barras apiladas, tabla, artículos y cursos, ajustes.
- `data/plan.json` – temario + configuración + sesiones + bitácora de formación (**fuente única**).
- `data/plan.example.json` – plan "de fábrica" (temario en blanco) para *Restaurar*.
- `data/temario.csv` / `data/temario.xlsx` – el temario (clasificación temas ▸ subtemas ▸
  microtemas) para llevarlo a otro sistema. Se regeneran desde `plan.json`; el menú
  **Datos** descarga el estado actual (CSV, Excel o JSON).

## Ver en local antes de publicar

```powershell
cd "C:\Users\cesar\ModlEarth\Drive\Proyectos\GitHub\faromd"
py -3 -m http.server 8000
```

Abre <http://localhost:8000>. No abras `index.html` con doble clic (los módulos y el `fetch`
no funcionan con `file://`).

## Publicar en GitHub Pages (paso a paso)

El repo Git ya está inicializado **en la raíz del proyecto** (antes estaba dentro de `data/`,
por eso GitHub solo tenía los datos y no la web; el `.git` mal puesto se movió a
`data/_git_misplaced_backup`, que está ignorado y puedes borrar).

1. El remoto ya apunta a `https://github.com/cesarkero/faromd.git` (repo y carpeta local
   renombrados de `labiblia` a `faromd`).
   ```powershell
   cd "C:\Users\cesar\ModlEarth\Drive\Proyectos\GitHub\faromd"
   git push
   ```
2. En GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch →
   Branch `main` / `/ (root)` → Save**.
3. Espera ~1 min. La web queda en `https://cesarkero.github.io/faromd/`.
4. Para cambios posteriores: `git add -A && git commit -m "..." && git push`.

`js/config.js` ya tiene `owner: cesarkero`, `repo: faromd`, `branch: main`.

## Crear el token para editar (paso a paso)

1. Ve a <https://github.com/settings/personal-access-tokens/new> (Settings → Developer settings
   → Personal access tokens → **Fine-grained tokens** → *Generate new token*).
2. **Token name**: `faromd`. **Expiration**: 90 días (o lo que prefieras; habrá que renovarlo).
3. **Resource owner**: tu usuario.
4. **Repository access** → *Only select repositories* → elige `faromd`.
5. **Permissions** → *Repository permissions* → **Contents**: cámbialo a **Read and write**.
   (El resto, sin acceso.)
6. *Generate token* y **copia** el valor (`github_pat_…`); solo se ve una vez.
7. En la web, botón **Ajustes** → pega el token → *Guardar token*. Se guarda solo en tu
   navegador (localStorage) y solo se envía a `api.github.com`.

Cuando caduque, la web sigue funcionando en solo lectura y avisa; genera otro y actualízalo
en Ajustes.

## Registrar y corregir datos

1. Con el token puesto, edita la tabla (estado, Anki, nº de repasos, fechas; las fuentes desde la
   ficha que se despliega al pasar el ratón por el nombre) o usa los botones rápidos de cada fila:
   - **Estudiado**: marca el microtema como estudiado hoy, pone `estado = finalizado`,
     `fecha de estudio = hoy`, y **programa el 1.er repaso** (hoy + 1 día, o el intervalo
     configurado).
   - **Repaso**: registra un repaso hecho hoy — sube el contador de repasos, pone
     `último repaso = hoy` y **reprograma el siguiente** con el intervalo que toque según el
     número de repasos. Pone `aplazado = 0`.
2. En el círculo del día marca cada **bloque** (pomodoro) según lo estudias — aparece una
   **línea oscura en el borde exterior** del trozo. Botones (en azul):
   - **Marcar toda la sesión**: marca los 4 bloques de golpe.
   - **Desmarcar todo** (aparece cuando están los 4): quita las marcas y **revierte** sus
     efectos (minutos y reprogramación de repasos); deja el día "de cero".
   - **Cerrar día**: fija la sesión tal cual, **desliza a mañana** los repasos que queden sin
     hacer y guarda el registro del día. **Reabrir día** lo deshace.
3. Pulsa **Guardar en GitHub**: crea un commit en `data/plan.json`. (En local no aplica: los
   cambios quedan en el borrador del navegador y en *Datos → Exportar*.)

## Traer los cambios a tu copia local

Cuando editas desde la web publicada, **Guardar en GitHub** hace un commit en el repo. En tu PC
esos cambios no aparecen solos; para bajarlos:

```powershell
cd "C:\Users\cesar\ModlEarth\Drive\Proyectos\GitHub\faromd"
git pull
```

- Solo se toca `data/plan.json` (y los `data/temario.*` si se regeneran), así que un `git pull`
  normal basta y no habrá conflictos con el código.
- Si además has tocado archivos en local sin commitear, guarda primero (`git stash` o un commit)
  y luego `git pull`.
- Al revés (editas el JSON en local): `git add -A && git commit -m "..." && git push`, y la web
  lo recoge al recargar. Si editaste en la web *y* en local a la vez sobre `plan.json`, el `pull`
  pedirá resolver el conflicto a mano (o `git checkout --theirs data/plan.json` para quedarte con
  la versión de GitHub).
- La web avisa de conflicto (compara el `sha`) si intentas *Guardar en GitHub* sobre una versión
  que cambió por detrás; recarga y vuelve a aplicar.

## El círculo del día

Estructura fija de 4 roles, como `img/reparto_estudio_circular.svg`:
**P1 Repaso · P2 Tema/Repaso · P3 Tema principal · P4 Cierre activo**.

- Los 4 bloques son **siempre de subtemas distintos** (no se repiten en el mismo día).
- El contenido se **sortea con peso** y semilla del día (estable hasta mañana): más peso a los
  subtemas `frecuente` (×3) y a los de mayor `prioridad` (`data/plan.json` → `subtemas[].prioridad`,
  sube a 2 o 3).
- **P1/P2** toman los repasos vencidos si los hay (el más aplazado/atrasado primero); si no,
  hacen un repaso ligero de algo ya estudiado o un primer vistazo a un tema nuevo.
- **P3** es el microtema `programado` (a medias) si existe; si no, un tema nuevo por sorteo.
  Es el único bloque que arranca un microtema (`sin_empezar → programado`).
- **P4** cierra con otro tema distinto o un recuerdo activo de algo ya visto.

## Repasos rápidos (varios temas en un mismo bloque)

Junto al círculo, el panel **Repasos rápidos** muestra los mismos repasos vencidos que antes
(ordenados por prioridad: más aplazados/atrasados y los `frecuente` primero) como tarjetas
pequeñas.

- **Arrastra** una tarjeta sobre el bloque **P1 Repaso** o **P2 Tema/Repaso** de la lista del
  círculo para anotar que también repasaste ese tema en ese bloque (aparece como una
  etiqueta bajo el bloque; la **×** la quita si te equivocas).
- Al **marcar el bloque como hecho**, todos los temas anotados en él (el principal + los
  arrastrados) se registran como repasados (`Repasos` +1, reprograma `Próx. repaso`) y el
  tiempo del bloque (25 min por defecto) **se reparte por igual** entre todos ellos.
- También puedes pulsar **repaso hecho** directamente en la tarjeta para registrarlo sin
  pasar por ningún bloque (como antes); en ese caso no suma minutos a *Tiempo por tema*.
- Solo se puede soltar en P1/P2 (no en P3 Tema principal ni P4 Cierre) y solo mientras el
  bloque no esté ya marcado ni el día cerrado; un mismo tema no puede estar dos veces en la
  sesión del día.

## Cómo se reajusta la planificación

- **Bloques sin marcar**: no se pierden. El microtema sigue pendiente y el repaso sigue vencido,
  así que reaparecen. Al **cerrar el día** (a mano o automático al abrir la web otro día) los
  repasos no hechos **se deslizan a mañana** y suben su contador `aplazado`; a partir de
  `config.avisoAplazado` (3) se marcan **"⚠ muy retrasado"**.
- **Ediciones a mano** en la tabla (una fecha de próximo repaso, un estado): la sesión del día
  se **recompone al momento** para los bloques que aún no has marcado; los marcados quedan fijos.
- Al hacer un repaso, la siguiente fecha se calcula desde el día **real** en que lo hiciste.

## Repaso espaciado

`fechaProximoRepaso = hoy + intervalo[nº de repaso]`. Intervalos por defecto `1-3-7-21-60` días,
y `1-2-5-12-30` para los subtemas `frecuente` (HTA, DM, dislipemia…). Editable en
`data/plan.json` (`config.intervalosRepaso`) o a mano en la tabla.

## Tabla del temario

Arranca **plegada** (solo los títulos de tema). Se despliega tema a tema, o entera al buscar/
filtrar. En **móvil** se oculta (usa *Datos → Exportar CSV*). Columnas: microtema, estado, Anki,
repasos, fechas.

**Fuentes** (dónde está el microtema en los libros): no ocupan columna. El nombre del microtema
sale con subrayado punteado cuando tiene fuentes anotadas, y junto a él, **en gris pequeño**, el
nombre del libro (`semFYC`, `Vázquez Lima`…) para verlo de un vistazo sin desplegar nada.
**Al pasar el ratón por encima del nombre** se despliega la ficha con la lista completa
(`semFYC cap. 12 · p. 145`, `Vázquez Lima cap. 33`…). Si una fuente incluye una URL al material
digitalizado, aparece como enlace **abrir material ↗**. Para añadir/editar: enlace *＋ fuente*
junto al nombre (o *Editar fuentes* en la ficha), varias separadas por `|`. Se exportan a
CSV/Excel en su columna `Fuentes`.

## Artículos y cursos (bitácora de formación)

Panel **Artículos y cursos**, entre *Tiempo por tema* y *Repasos vencidos*. Es un registro
aparte del temario (no entra en el repaso espaciado). Con *＋ añadir* se anota:

- **tipo**: artículo · curso · sesión clínica,
- **título**, **fecha**, **minutos**, **enlace** (opcional),
- **ámbito**: transversal, o **vinculado a un tema** del temario,
- una **nota** con la idea que te llevas.

Cómo se refleja:

- **Tira semanal**: celda *Formación* con el nº de la semana y las horas.
- Los **minutos suman al total semanal** (la meta de 10 h incluye formación) y a *Tiempo por
  tema*: si está vinculada a un tema, engorda su barra; si es transversal, aparece la barra
  *Formación transversal*.
- El panel muestra lo de **esta semana** y los **cursos en marcha** (sin fecha de fin);
  *terminado* cierra el curso, *editar* / *borrar* lo gestionan.
- Se guarda en `data/plan.json` (`plan.actividades[]`) y se exporta en la hoja **Actividades**
  del Excel y en el JSON de copia.

## Modo edición y solo lectura

- **En local** (`localhost`): edición siempre activa; los cambios van al borrador y a *Datos →
  Exportar*, nunca a GitHub.
- **Web publicada**: por defecto **solo lectura**. Para editar, pega un token en **Ajustes**
  (ver abajo). El mismo token se puede usar en varios equipos/navegadores; también podéis tener
  cada uno el vuestro. Si dos personas guardan a la vez, la app avisa del conflicto (compara el
  `sha` del fichero) y ofrece recargar.
- El borrador local guarda cada cambio; al recargar se ofrece recuperarlo.

## Restaurar plan de fábrica

En **Ajustes → Zona peligrosa → Restaurar plan de fábrica** (pide escribir `RESTAURAR`). Carga
`data/plan.example.json` (temario en blanco, sin fechas ni progreso). No se sube hasta que pulses
*Guardar en GitHub*. Cuando termines de probar, este es el modo de dejar los datos "de fábrica".

## Futuras implementaciones

- Que **el bloque del círculo** (no solo la fila de la tabla) enlace también a la ruta del
  material vía `fuentes`. La ficha de fuentes del nombre ya muestra el enlace **abrir material ↗**
  cuando la fuente incluye una URL.
- Rellenar `fuentes` a partir de los índices fotografiados en `img/indices/`.
- Campo de **minutos a mano** por fila, para registrar tiempo de estudio hecho fuera del círculo.

# Cómo se usa

**Marqué un bloque en el círculo, ¿cuándo se rellenan `F. estudio` y `Próx. repaso`?**
No con el círculo. Marcar un bloque de un tema nuevo solo lo pasa a `Programado` y le suma 25 min.
Las fechas aparecen cuando el microtema pasa a `Finalizado`: botón **Estudiado** (1.ª vez) o
**Repaso** (siguientes) en su fila de la tabla.

**Mientras no pulse "Estudiado", ¿el tema sigue apareciendo?**
Sí. Un microtema `Programado` es el P3 · Tema principal de cada día hasta que lo marcas como
estudiado. Es lo buscado: seguir con el tema a medias hasta acabarlo.

**¿Para qué sirve el botón "Repaso"?**
Registra un repaso hecho hoy de algo **ya estudiado**: `Repasos` +1, `Últ. repaso = hoy` y
reprograma `Próx. repaso` con el siguiente intervalo (`1-3-7-21-60`; `1-2-5-12-30` si es
frecuente). No lo uses en algo `Sin empezar` (para eso está **Estudiado**).

**Diferencia entre "Estudiado" y "Repaso":**
*Estudiado* = primera vez, arranca el ciclo (`F. estudio = hoy`, repaso 1 mañana).
*Repaso* = refresco de algo ya visto, avanza la cadena y aleja la siguiente fecha.

**Hoy estudié algo distinto a lo propuesto en el círculo, ¿qué hago?**
En la tabla, botón **Estudiado** (o **Repaso**) en ese microtema. El círculo se recompone solo
con los bloques que no hayas marcado; lo que te proponía y no tocaste sigue pendiente y vuelve a
salir. La planificación se recalcula cada día desde el estado real del temario, no te penaliza.

**¿Y el tiempo de lo que estudié fuera del círculo?**
Los botones **Estudiado / Repaso** no suman minutos a *Tiempo por tema* (solo lo hacen los
bloques del círculo, atados a un microtema concreto). Ese día el reparto de horas queda
incompleto. Pendiente: campo de minutos a mano (ver *Futuras implementaciones*).

**Si no marco todos los bloques, ¿pierdo el progreso?**
No. Al **Cerrar día** (a mano o automático al abrir la web otro día) los repasos vencidos sin
hacer se deslizan a mañana (sube su contador `aplazado`); los bloques de estudio simplemente
reaparecen.

**Edité desde la web publicada, ¿cómo lo veo en mi PC?**
`git pull` en la carpeta del repo. Solo cambia `data/plan.json`. Ver *Traer los cambios a tu
copia local*.

**¿Dónde apunto un artículo leído o un curso?**
Panel *Artículos y cursos* → *＋ añadir*. No entra en el repaso espaciado; se registra y se
refleja en la semana (celda *Formación* de la tira, y los minutos suman al total y a *Tiempo por
tema*). Puedes vincularlo a un tema o dejarlo transversal.

**¿El mismo token vale para dos PC / dos personas?**
Sí. Se pega en **Ajustes** en cada navegador. Si dos guardan a la vez, la web detecta el
conflicto por el `sha` y ofrece recargar.

**¿Por qué no reacciona / no deja editar en la web publicada?**
Por defecto es **solo lectura**. Hay que pegar un token en **Ajustes**. En `localhost` la edición
está siempre activa (los cambios van al borrador y a *Datos → Exportar*, nunca a GitHub).

# Material para el plan de estudio

Libros
- Guía de actuación en Atención Primaria – semFYC	5.ª, 2023	Fuente física principal para AP
- Guía de Actuación en Urgencias – Vázquez Lima/Casal	6.ª, 2023	Fuente principal para Urgencias
- Emergencias Extrahospitalarias – Moratal	5.ª	Fuente práctica para Emergencias/PAC
- Medicina de Urgencias y Emergencias – Jiménez Murillo/Montero Pérez	6.ª	Consulta más amplia/profundización en urgencias
- Dermatoscopia Diagnóstica. Guía ilustrada – Bowling	2.ª	Fuente específica de Dermatología/dermatoscopia

# Autoría y licencia

**Faromd** — primera versión. Herramienta de **Sara Arquero Cabral** y **César Arquero Cabral**.

Código publicado bajo licencia **[MIT](LICENSE)**: libre de usar, copiar y modificar citando a
los autores, sin garantía de ningún tipo.

El temario y las notas de estudio son un **material de apoyo personal**, no una fuente clínica
verificada: para la práctica asistencial consulta siempre las guías originales (ver
*Material para el plan de estudio* arriba) y las fuentes anotadas en cada microtema.

---

# Cosas por hacer
- [ ] Afinar el temario y rellenar `fuentes` con los índices reales de los libros
  (fotos en `img/indices/`). **Aún NO analizados**: el temario actual es una propuesta
  a partir de los índices *conocidos* de la semFYC y de Urgencias (Vázquez Lima), no de estas fotos.
- [ ] Enlazar los bloques de estudio con la ruta del material (ver *Futuras implementaciones*).
- Podría ser interesante platear siempre al entrar a la herramienta una pregunta del MIR a responder, es una forma random interactiva de empezar a pensar en "medicina".
