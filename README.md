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
- `js/config.js` – **owner / repo / branch** del repositorio (ajústalo tras crear el repo).
- `js/store.js` – carga y guardado vía API de GitHub, borrador local, export/import.
- `js/schedule.js` – repaso espaciado, composición de la sesión de hoy, reparto semanal.
- `js/csv.js` – exportación del temario a CSV.
- `js/ui/*` – círculo de sesión, barras apiladas, tabla, ajustes.
- `data/plan.json` – temario + configuración + registro de sesiones (**fuente única**).
- `data/plan.example.json` – copia semilla por si quieres reiniciar.
- `data/temario.csv` / `data/temario.xlsx` – el temario (clasificación temas ▸ subtemas ▸
  microtemas) para llevarlo a otro sistema. Se regeneran desde `plan.json`; el botón
  **Exportar CSV** descarga el estado actual.

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
2. En el círculo de hoy marca cada **bloque** (pomodoro) según lo estudias — aparece la línea
   oscura en el borde del trozo. Botones:
   - **Marcar toda la sesión**: marca los 4 bloques de golpe.
   - **Desmarcar todo** (sale cuando están los 4): quita todas las marcas y **revierte** sus
     efectos (minutos y reprogramación de repasos); vuelve a dejar el día "de cero".
   - **Cerrar día**: fija la sesión tal como está, mueve a mañana los repasos que queden sin
     hacer y guarda el registro del día. **Reabrir día** lo deshace.
3. Pulsa **Guardar en GitHub**: crea un commit en `data/plan.json`.

## Sesión élite

El hito semanal es 10 h (5 sesiones de 2 h). La idea de **sesión élite** es que **una** de esas
sesiones sea más exigente/profunda (no más larga). El check *"hoy cuenta como élite"* de la tira
*Semana en curso* solo marca la sesión del día como élite para llevar la cuenta; de momento no
cambia la composición del círculo.

## Sesión aleatoria ponderada

Los microtemas de la sesión de cada día se **sortean** (con semilla del día, así son estables
hasta mañana), dando más peso a los subtemas marcados `frecuente` (×3) y a los de mayor
`prioridad` (`data/plan.json` → `subtemas[].prioridad`, sube a 2 o 3). Si tienes un microtema
`programado` (a medias), ese es el "tema principal" sin sorteo.

Sin token la página es **solo lectura** (ideal para el móvil). Cada cambio se guarda además como
**borrador local**; al recargar se ofrece recuperarlo. **Exportar / Importar JSON** es la
alternativa manual (subes tú el fichero al repo).

## Lógica de repaso

`fechaProximoRepaso = hoy + intervalo[nº de repaso]`. Intervalos por defecto `1-3-7-21-60` días,
y `1-2-5-12-30` para los subtemas marcados como `frecuente` (HTA, DM, dislipemia…). Todo editable
en `data/plan.json` (`config.intervalosRepaso`) o a mano en la tabla.

El **círculo de hoy** tiene 4 roles fijos (como `img/reparto_estudio_circular.svg`):
**P1 Repaso · P2 Tema/Repaso · P3 Tema principal · P4 Cierre activo**. El contenido se adapta:
P1 y P2 toman los microtemas vencidos si los hay; P3/P4 el microtema en curso. Marca cada bloque
según lo estudias (el tick verde dentro del anillo y el botón *marcar* de la lista); al marcar
los 4 la sesión cuenta como completada, se suman los minutos por microtema y se reprograman los
repasos.

**La planificación se reajusta sola:**
- Los bloques que **no marcas** no se pierden: el microtema sigue pendiente y el repaso sigue
  vencido, así que reaparecen en la sesión del día siguiente. Al abrir la web se avisa de cuántos
  bloques quedaron sin marcar.
- Si **editas a mano** una fecha de próximo repaso (o un estado) en la tabla, la sesión de hoy
  se recompone al momento: los bloques **aún sin marcar** se rehacen según el nuevo estado del
  temario; los que ya marcaste quedan fijos. Un repaso que adelantas/atrasas a mano entra en
  «Repasos vencidos» y en el P1 del día que toque.
- Al hacer un repaso, la siguiente fecha se calcula desde el día **real** en que lo hiciste,
  no desde la fecha teórica.

En **local** (`localhost`) la interacción está siempre activa aunque no haya token: los cambios
van al borrador y a *Exportar*, nunca a GitHub. En la web publicada, sin token es solo lectura.

En **móvil** la tabla del temario se oculta; se ve el círculo, la semana, el tiempo por tema y
los repasos vencidos.

## Fuentes en los libros

Cada microtema tiene un campo **`fuentes`**: dónde encontrarlo en los libros (puede estar en
varios). Se edita en la columna *Fuentes* de la tabla, separando varias con `|`
(p. ej. `semFYC cap. 12 · p. 145 | Vázquez Lima cap. 33`), y sale en `temario.csv` / `.xlsx`.
Los índices fotografiados de los libros están en `img/indices/`.

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
- [x] Poder ver la web en local antes de hacer el push a github (`py -3 -m http.server`).
- [ ] Afinar el temario con los índices reales de los libros:
  `img\WhatsApp Unknown 2026-08-29 at 21.43.10.zip` (imágenes de los índices).