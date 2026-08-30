# Objetivo general
Hay que hacer un dashboard para un plan de estudios. 
Publicarlo en una sola hoja en github pages.

# Objetivos
Repasar contenidos constantemente (estar actualizada en medicina de emergencias y atención primaria)
Mantener los repasos activos para mejorar en la profesión de medicina de familia con un enfoque para que sirva para un futuro MIR.

# Funciones
- Hacer una propuesta de temas y subtemas a partir del material para el plan de estudio.
- Propuesta semanal de bloques de 2h dividida en pomodoros (ver imágenes en \img\reparto_estudio_circular.svg).
- El hito sería estudiar 10 h (5 sesiones) pero 1 sesión sería élite.
- Repasar más habitualmente temas frecuentes en la consulta (hipertensión, diabetes, dislipemia...)
- Puede haber días donde no se estudie. 

# Contenidos 
Basa tus estilos y colores propuesta en las imágenes de la carpeta /img
Mézclalos con tonos más pastel y mínimal.

# Estilo y datos
- Dashboard con gráfico arriba a la izquierda similar al img\reparto_estudio_circular.svg donde en cada trozo del círculo se indica el SUBTEMA que toca en la sesión. 
Cuando se completa la sesión de 2 h se hace tick un indicador dentro del círculo para reflejar que se ha completado la sesisón.

- Arriba a la derecha se mostrará el tiempo de estudio hasta la fecha dedicado a cada tema. Puede ser un gráfico de barras apiladas por subtemas. 

Lo principal del dashboard en una tabla de datos a modo de base de datso. Los subtemas tienen microtemas. 
La base de datos (tabla) tendrá:
- çFecha del último repaso
- Fecha de estudio
- Fecha del próximo repaso. 
- Estado (sin empezar, programado, finalizado)
- Anki (si, no)
- Repaso (número de repasos)

Un aspecto que hay que pensar es en la forma de registrar los datos. Creo que github pages es estática: ¿se pueden introducir y corregir datos? ¿Cuál sería la forma más sencilla de tener este visor de plan de estudios en un solo lugar con la tabla o base de datos en la que se planifica y se dirige?

# Cómo funciona el dashboard

La web es estática (HTML + JS vanilla, sin build) y vive en la raíz del repo. Todos los datos
están en `data/plan.json`, que es la **única fuente de verdad**.

## Estructura

- `index.html` – una sola hoja.
- `assets/styles.css` – estilos y paleta (tomada de `/img`, suavizada a pastel).
- `js/config.js` – **owner / repo / branch** del repositorio y claves de localStorage.
- `js/store.js` – carga y guardado vía API de GitHub, borrador local, importar plan.
- `js/schedule.js` – repaso espaciado, composición de la sesión del día, cierre de día.
- `js/csv.js` – exportación del temario a CSV / Excel (.xlsx) / JSON.
- `js/ui/*` – círculo de sesión, barras apiladas, tabla, ajustes.
- `data/plan.json` – temario + configuración + registro de sesiones (**fuente única**).
- `data/plan.example.json` – plan "de fábrica" (temario en blanco) para *Restaurar*.
- `data/temario.csv` / `data/temario.xlsx` – el temario (clasificación temas ▸ subtemas ▸
  microtemas) para llevarlo a otro sistema. Se regeneran desde `plan.json`; el menú
  **Datos** descarga el estado actual (CSV, Excel o JSON).

## Ver en local antes de publicar

```powershell
cd "C:\Users\cesar\ModlEarth\Drive\Proyectos\GitHub\labiblia"
py -3 -m http.server 8000
```

Abre <http://localhost:8000>. No abras `index.html` con doble clic (los módulos y el `fetch`
no funcionan con `file://`).

## Publicar en GitHub Pages (paso a paso)

El repo Git ya está inicializado **en la raíz del proyecto** (antes estaba dentro de `data/`,
por eso GitHub solo tenía los datos y no la web; el `.git` mal puesto se movió a
`data/_git_misplaced_backup`, que está ignorado y puedes borrar).

1. El remoto ya apunta a `https://github.com/cesarkero/labiblia.git`. En GitHub, ese repo
   contiene ahora mismo un commit antiguo con solo los datos; lo vamos a reemplazar por la app
   completa:
   ```powershell
   cd "C:\Users\cesar\ModlEarth\Drive\Proyectos\GitHub\labiblia"
   git push -u origin main --force
   ```
   (El `--force` es necesario solo esta vez, para sustituir aquel commit basura.)
2. En GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch →
   Branch `main` / `/ (root)` → Save**.
3. Espera ~1 min. La web queda en `https://cesarkero.github.io/labiblia/`.
4. Para cambios posteriores: `git add -A && git commit -m "..." && git push` (ya sin `--force`).

`js/config.js` ya tiene `owner: cesarkero`, `repo: labiblia`, `branch: main`.

## Crear el token para editar (paso a paso)

1. Ve a <https://github.com/settings/personal-access-tokens/new> (Settings → Developer settings
   → Personal access tokens → **Fine-grained tokens** → *Generate new token*).
2. **Token name**: `labiblia`. **Expiration**: 90 días (o lo que prefieras; habrá que renovarlo).
3. **Resource owner**: tu usuario.
4. **Repository access** → *Only select repositories* → elige `labiblia`.
5. **Permissions** → *Repository permissions* → **Contents**: cámbialo a **Read and write**.
   (El resto, sin acceso.)
6. *Generate token* y **copia** el valor (`github_pat_…`); solo se ve una vez.
7. En la web, botón **Ajustes** → pega el token → *Guardar token*. Se guarda solo en tu
   navegador (localStorage) y solo se envía a `api.github.com`.

Cuando caduque, la web sigue funcionando en solo lectura y avisa; genera otro y actualízalo
en Ajustes.

## Registrar y corregir datos

1. Con el token puesto, edita la tabla (estado, Anki, nº de repasos, fechas, fuentes) o usa los
   botones rápidos de cada fila:
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
cd "C:\Users\cesar\ModlEarth\Drive\Proyectos\GitHub\labiblia"
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
filtrar. En **móvil** se oculta (usa *Datos → Exportar CSV*). Columnas: microtema, **Fuentes**
(dónde está en los libros; varias separadas por `|`, p. ej. `semFYC cap. 12 · p. 145 | Vázquez Lima cap. 33`),
estado, Anki, repasos, fechas.

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

- Que cada bloque de estudio del círculo **enlace a la ruta del material** a estudiar (capítulo/
  página, o el PDF si está digitalizado) usando el campo `fuentes` de cada microtema.
- Rellenar `fuentes` a partir de los índices fotografiados en `img/indices/`.

# Material para el plan de estudio

Libros
- Guía de actuación en Atención Primaria – semFYC	5.ª, 2023	Fuente física principal para AP
- Guía de Actuación en Urgencias – Vázquez Lima/Casal	6.ª, 2023	Fuente principal para Urgencias
- Emergencias Extrahospitalarias – Moratal	5.ª	Fuente práctica para Emergencias/PAC
- Medicina de Urgencias y Emergencias – Jiménez Murillo/Montero Pérez	6.ª	Consulta más amplia/profundización en urgencias
- Dermatoscopia Diagnóstica. Guía ilustrada – Bowling	2.ª	Fuente específica de Dermatología/dermatoscopia

---

# Cosas por hacer
- [x] Que se vea bien en modo móvil. La tabla de datos se oculta en el móvil.
- [x] Poder ver la web en local antes del push (`py -3 -m http.server`).
- [x] Tabla plegada por defecto.
- [x] Cierre de día y recalibrado de fechas.
- [ ] Afinar el temario y rellenar `fuentes` con los índices reales de los libros
  (fotos en `img/indices/`). **Aún NO analizados**: el temario actual es una propuesta
  a partir de los índices *conocidos* de la semFYC y de Urgencias (Vázquez Lima), no de estas fotos.
- [ ] Enlazar los bloques de estudio con la ruta del material (ver *Futuras implementaciones*).