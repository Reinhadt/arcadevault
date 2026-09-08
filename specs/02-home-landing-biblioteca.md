# 02 — Home landing y reubicación de Biblioteca

**Estado:** Approved
**Depende de:** SPEC 01
**Fecha:** 2026-09-01

**Objetivo:** Portar a `/` la landing de marketing `home.jsx` de `references/templates/home-about/` (con su `nav.jsx` y las secciones de `styles.css` que usa), incorporando esos estilos a `app/globals.css`, y mover la pantalla Biblioteca actual (grid de juegos) de `/` a `/biblioteca`, dejando fuera de este spec la pantalla About (`about.jsx`).

## Alcance

**Incluye:**

- Nueva pantalla **Home** en `app/page.tsx` (client component), puerto de `home.jsx`: hero con eyebrow parpadeante, título en 3 líneas con gradientes, siluetas SVG flotantes decorativas (`FloatingSilhouettes`), CTAs "EXPLORAR JUEGOS" (→ `/biblioteca`) y "CREAR CUENTA" (→ `/auth`); sección "¿Por qué Arcade Vault?" con 4 `feature-card` e iconos pixel (`FeatureIcon`); sección "Juegos disponibles ahora" con un `mini-rail` de 6 `MiniCard` tomados de `GAMES` (`lib/data.ts`, primeros 6) que navegan a `/juego/[id]`, más botón "VER TODOS LOS JUEGOS →" (→ `/biblioteca`); sección de stats (`home-stats`); sección "Actividad en Vivo" con ticker de últimas puntuaciones y top 5 jugadores usando los mismos arrays de datos mock hardcodeados que trae `home.jsx` (no derivados de `seededScores`), con botón "VER SALÓN →" (→ `/salon-de-la-fama`); sección de precios (plan único gratis + FAQ) con CTA "EMPEZAR GRATIS →" (→ `/auth`); CTA final "INSERTAR MONEDA →" (→ `/biblioteca`). Animaciones `reveal` al hacer scroll (IntersectionObserver), igual que el prototipo.
- Reubicación de la pantalla **Biblioteca** actual (buscador, chips de categoría, grid de `GameCard`, estado "sin resultados") de `app/page.tsx` a `app/biblioteca/page.tsx`, sin cambios funcionales — solo cambia la ruta.
- Actualización de `components/nav.tsx`: nuevo link **"Inicio"** apuntando a `/` (activo cuando `pathname === "/"`), y el link **"Biblioteca"** ahora apunta a `/biblioteca` (activo cuando `pathname === "/biblioteca"` o `pathname.startsWith("/juego/")`), en el menú de escritorio y en el panel móvil. El logo sigue apuntando a `/`.
- Incorporación a `app/globals.css` de las secciones `HOME PAGE`, `ACTIVITY (leaderboard + ticker)` y `PRICING` de `references/templates/home-about/styles.css` (clases `.home*`, `.hero-*`, `.feature-*`, `.mini-*`, `.stat-*`, `.activity-*`, `.ac-*`, `.ticker`, `.tick-*`, `.top-*`, `.tp-*`, `.pricing-*`, `.price-*`, `.pc-*`, `.faq-*`, `.reveal`), tal como están en el template.

**No incluye (fuera de alcance de este spec):**

- La pantalla **About** (`about.jsx`): misión, highlights y formulario de contacto. Se deja para un spec futuro.
- La sección `ABOUT PAGE` de `styles.css` (`.about*`, `.highlight*`, `.contact-*`, `.terminal-success`, `.term-*`, etc.) no se incorpora a `globals.css`.
- Las secciones `GAMEPAD` y `Theme variants` de `styles.css` (~470 líneas de un widget de control/gamepad y sus variantes de tema): no las usa ni `home.jsx` ni `nav.jsx`, no hay ningún componente en esta carpeta que las consuma, así que no se portan.
- El link "Acerca de" en el `Nav`: no se agrega en este spec, ya que apuntaría a una pantalla que no existe. Se agregará junto con el spec que implemente About.
- Cualquier cambio a las pantallas ya implementadas en el spec 01 (detalle de juego, reproductor, auth, salón de la fama) más allá de las rutas de navegación que apuntan a ellas.
- Hacer dinámicos los datos de la sección "Actividad en Vivo" del home (se mantienen hardcodeados, igual que el prototipo).

## Modelo de datos

No se introduce ningún modelo de datos nuevo. La sección "Juegos disponibles ahora" reutiliza `GAMES` de `lib/data.ts` (ya existente, spec 01). La sección "Actividad en Vivo" usa los arrays de mock literales que ya trae `home.jsx` (nombres de jugador, juego, puntuación y "hace X min"), copiados tal cual dentro de `app/page.tsx` — no se agregan a `lib/data.ts` por ser contenido puramente decorativo de esa sección.

## Plan de implementación

1. **Estilos globales.** Anexar a `app/globals.css` las secciones `HOME PAGE`, `ACTIVITY (leaderboard + ticker)` y `PRICING` de `references/templates/home-about/styles.css`, sin modificar las reglas existentes ni incluir las secciones `ABOUT PAGE`, `GAMEPAD` ni `Theme variants`.
2. **Reubicar Biblioteca.** Mover el contenido actual de `app/page.tsx` a `app/biblioteca/page.tsx` sin cambios (mismo componente, mismos imports de `GameCard` y `lib/data`).
3. **Nav actualizado.** En `components/nav.tsx`, agregar el link "Inicio" (→ `/`) antes de "Biblioteca", cambiar el href de "Biblioteca" a `/biblioteca`, y ajustar `isActive` para los tres estados (`inicio` | `biblioteca` | `salon` | `auth`). Replicar los mismos links en el panel móvil.
4. **Nueva Home (`app/page.tsx`).** Puerto de `home.jsx` como client component: hero + `FloatingSilhouettes`, sección "por qué" con `FeatureIcon`, mini-rail con `MiniCard` (usa `GAMES.slice(0, 6)` de `lib/data.ts`, navega con `router.push('/juego/' + id)` igual que `GameCard`), sección de stats, sección de actividad (ticker + top jugadores con los arrays hardcodeados del template), sección de precios y FAQ, CTA final. Todos los botones usan `router.push` (client component con `useRouter`) hacia `/biblioteca`, `/auth` o `/salon-de-la-fama` según corresponda. El hook de reveal por scroll (`IntersectionObserver` sobre `.reveal`) se porta igual que en `home.jsx`.
5. **Verificación.** Correr `npm run lint` y `npm run build`; navegar manualmente en `npm run dev` por `/` (Home), `/biblioteca`, y confirmar que el Nav resalta el link correcto en cada una y que todas las CTAs de la Home navegan a la ruta esperada.

## Criterios de aceptación

- [ ] `npm run build` compila sin errores.
- [ ] `npm run lint` pasa sin errores.
- [ ] `/` muestra la nueva landing (hero, por qué, juegos disponibles, stats, actividad en vivo, precios, CTA final) con las animaciones `reveal` al hacer scroll.
- [ ] `/biblioteca` muestra exactamente la pantalla que antes vivía en `/` (buscador, chips, grid, estado sin resultados), sin regresiones.
- [ ] El Nav muestra "Inicio" y "Biblioteca" como links separados; "Inicio" resalta en `/`, "Biblioteca" resalta en `/biblioteca` y en `/juego/[id]`. No aparece ningún link "Acerca de".
- [ ] En la Home: "EXPLORAR JUEGOS" y "VER TODOS LOS JUEGOS →" navegan a `/biblioteca`; "CREAR CUENTA" y "EMPEZAR GRATIS →" navegan a `/auth`; "VER SALÓN →" navega a `/salon-de-la-fama`; cada `MiniCard` del mini-rail navega a `/juego/[id]` del juego correspondiente; "INSERTAR MONEDA →" (CTA final) navega a `/biblioteca`.
- [ ] La estética visual de la Home (colores, tipografías, glow neón, gradientes de título, siluetas flotantes) coincide con `references/templates/home-about/home.jsx` + `styles.css`.
- [ ] `app/globals.css` no contiene las clases de la sección `ABOUT PAGE`, `GAMEPAD` ni `Theme variants` del template.

## Decisiones tomadas y descartadas

- **`/biblioteca` como nueva ruta del grid de juegos** (en vez de `/juegos`): coincide con el nombre "Biblioteca" ya usado en `nav.jsx`, en el spec 01 y en el propio link del Nav actual.
- **Omitir el link "Acerca de" del Nav** en vez de incluirlo apuntando a una ruta inexistente: evita un link roto en producción; se agrega junto con el spec que implemente `about.jsx`.
- **No portar las secciones `GAMEPAD` y `Theme variants` de `styles.css`**: son ~470 líneas de un widget de control (D-pad, botones A/B, temas "vapor"/"cabinet") que ningún archivo de `references/templates/home-about/` (`home.jsx`, `nav.jsx`, `about.jsx`) referencia — parecen pertenecer a otra plantilla no incluida en esta carpeta. Incorporarlas sería CSS muerto sin ningún componente que lo consuma.
- **Datos de "Actividad en Vivo" hardcodeados, igual que el template**, en vez de generarlos con `seededScores`: es contenido puramente decorativo/preview en la Home; usar el generador real añadiría complejidad sin necesidad, ya que el detalle real de puntuaciones ya vive en `/juego/[id]` y `/salon-de-la-fama`.
- **`Home` como componente único en `app/page.tsx`** (incluyendo `FloatingSilhouettes`, `MiniCard`, `FeatureIcon` en el mismo archivo), siguiendo el patrón ya usado en `app/salon-de-la-fama/page.tsx` y `app/juego/[id]/page.tsx` (páginas autocontenidas sin subcomponentes extraídos), en vez de crear una carpeta `components/home/`. Se reutiliza `GameCard` solo en `/biblioteca`; el mini-rail de la Home usa su propio `MiniCard` (portada cuadrada, sin puntuación) tal como en `home.jsx`, por lo que no hay lógica compartida que justifique extraerlo.

## Riesgos identificados

- Mover `app/page.tsx` a `app/biblioteca/page.tsx` cambia la URL raíz de la app; cualquier enlace externo o marcador a `/` como "biblioteca" ahora mostrará la landing en su lugar. Es el cambio explícitamente pedido, pero vale la pena confirmarlo tras el despliegue.
- `home.jsx` es el archivo más largo de la carpeta (~340 líneas) con varias secciones e íconos SVG inline; un desajuste de clase CSS entre el JSX portado y las secciones `HOME PAGE`/`ACTIVITY`/`PRICING` de `globals.css` rompe visualmente la sección sin error de compilación.
- El hook de `reveal` (IntersectionObserver) debe ejecutarse solo en cliente y limpiar el observer al desmontar; si se omite `"use client"` en `app/page.tsx`, la Home no compilará o el scroll-reveal no funcionará.
