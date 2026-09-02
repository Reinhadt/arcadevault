# 01 — MVP visual de Arcade Vault

**Estado:** Implemented
**Depende de:** —
**Fecha:** 2026-08-31

**Objetivo:** Portar a Next.js App Router, como componentes reales con datos mock, las cinco pantallas visuales del prototipo en `references/templates/` (biblioteca, detalle de juego, reproductor placeholder, autenticación mock y salón de la fama), sin implementar lógica de ningún juego real.

## Alcance

**Incluye:**

- Layout raíz con navbar (`Nav`) y footer, replicando `nav.jsx`: logo, links Biblioteca/Salón de la Fama, contador de créditos decorativo, botón de sesión (Iniciar Sesión / nombre de usuario), menú hamburguesa + panel móvil deslizante.
- Pantalla **Biblioteca** (`/`): hero con título parpadeante, buscador por nombre, chips de categoría (`TODOS/ARCADE/PUZZLE/SHOOTER/VERSUS`), grid de tarjetas de juego con tilt 3D al hover, estado "sin resultados".
- Pantalla **Detalle de juego** (`/juego/[id]`): portada, tags, descripción larga, tira de estadísticas (partidas, mejor global, dificultad), botones "Jugar ahora" / "Volver al vault", tabla de mejores puntuaciones (leaderboard) con datos mock generados.
- Pantalla **Reproductor** (`/juego/[id]/jugar`): placeholder estático — HUD con valores fijos (Jugador, Puntuación 0, Vidas ♥♥♥, Nivel 01), marco CRT con escáner/vignette y decoraciones animadas por CSS (grid-floor, nave, enemigos) igual que el template, aviso tipo "JUEGO EN CONSTRUCCIÓN" dentro de la pantalla CRT, botones Pausa/Fin/Salir presentes visualmente pero sin lógica de partida ni modal de fin de juego.
- Pantalla **Auth** (`/auth`): tarjeta con tabs "Iniciar sesión"/"Crear cuenta", campos usuario/email/contraseña, botón "Jugar como invitado", botones sociales decorativos (sin integración real).
- Pantalla **Salón de la fama** (`/salon-de-la-fama`): tabs por juego, podio (oro/plata/bronce), tabla completa de puntuaciones con datos mock, fila destacada "tu mejor marca" cuando hay sesión iniciada.
- Catálogo de juegos y generador de puntuaciones mock, portados de `data.jsx` (8 juegos, categorías, `seededScores`).
- Sesión de usuario mock: login/registro aceptan cualquier valor, sin backend ni validación real; persistencia en `localStorage`.
- Coberturas de juego (`cover-bricks`, `cover-tetro`, etc.) puramente CSS, portadas de `styles.css` (ya presente en `app/globals.css`).

**No incluye (fuera de alcance de este spec):**

- Cualquier lógica de juego real (motor, colisiones, input de teclado/táctil).
- Loop de partida simulado, modal de "fin de juego" y guardado de puntuaciones (`av_scores`) — la pantalla de reproductor es un placeholder estático.
- Autenticación real (backend, hashing, OAuth con Google/GitHub — los botones sociales son solo decorativos).
- Persistencia de puntuaciones o cuentas más allá de `localStorage` del navegador.
- SEO avanzado, accesibilidad exhaustiva (ARIA completo), internacionalización (todo el contenido queda en español, igual que el template).
- Tests automatizados (no hay test runner configurado en el repo).

## Modelo de datos

Se porta `references/templates/data.jsx` a TypeScript en `lib/data.ts`:

```ts
export type GameCategory = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";

export interface Game {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: GameCategory;
  cover: string; // clase CSS de portada, ej. "cover-bricks"
  color: "cyan" | "magenta" | "yellow" | "green";
  best: number;
  plays: string;
}

export interface ScoreRow {
  rank: number;
  name: string;
  score: number;
  date: string; // "DD/MM/AAAA"
}

export const GAMES: Game[];
export const CATS: readonly ["TODOS", "ARCADE", "PUZZLE", "SHOOTER", "VERSUS"];
export function seededScores(seed: number, count?: number): ScoreRow[];
```

Sesión de usuario (mock), en `lib/auth.ts` o `components/AuthProvider.tsx` (client component con Context):

```ts
export interface SessionUser {
  name: string;
}
// persistida en localStorage bajo la clave "av_user"
```

No se introduce ninguna base de datos ni esquema de persistencia versionado — todo es mock en memoria/`localStorage`, igual que el prototipo.

## Plan de implementación

1. **Datos y sesión compartida.** Crear `lib/data.ts` (GAMES, CATS, seededScores tipados) y un `AuthProvider` cliente (`components/auth-provider.tsx`) que exponga `user`, `signIn(user)`, `signOut()` respaldado por `localStorage` (`av_user`), envolviendo el árbol en `app/layout.tsx`.
2. **Layout y navegación.** Reemplazar el `RootLayout` actual para usar `AuthProvider` y renderizar `components/nav.tsx` (client component, puerto de `nav.jsx`) + footer. Los links de navegación usan `next/link` o `useRouter` con las rutas reales (`/`, `/salon-de-la-fama`, `/auth`). Mantener `av-bg`/`av-noise` ya presentes.
3. **Biblioteca (`app/page.tsx`).** Puerto de `biblioteca.jsx`: `GameCard` con tilt 3D (client component), buscador y chips de categoría con estado local, grid responsive, estado vacío. Enlaza cada tarjeta a `/juego/[id]`.
4. **Detalle de juego (`app/juego/[id]/page.tsx`).** Puerto de `detalle.jsx`: busca el juego en `GAMES` por `id` (404 con `notFound()` si no existe), genera leaderboard mock con `seededScores`, botón "Jugar ahora" enlaza a `/juego/[id]/jugar`.
5. **Reproductor placeholder (`app/juego/[id]/jugar/page.tsx`).** Puerto simplificado de `reproductor.jsx`: HUD con valores estáticos, marco CRT con decoraciones CSS animadas (`grid-floor`, nave, enemigos) y mensaje "JUEGO EN CONSTRUCCIÓN" superpuesto, botones Pausa/Fin (deshabilitados o sin handler funcional) y "Salir" que navega de vuelta a `/juego/[id]`.
6. **Auth (`app/auth/page.tsx`).** Puerto de `auth.jsx`: tabs iniciar sesión/crear cuenta, formulario mock que llama a `signIn({ name })` del `AuthProvider` y redirige a `/`; botón "jugar como invitado" hace `signIn(null)` y redirige; botones sociales decorativos sin `onClick` funcional.
7. **Salón de la fama (`app/salon-de-la-fama/page.tsx`).** Puerto de `salon.jsx`: tabs por juego (estado local o `searchParams`), podio top 3, tabla completa con `seededScores`, fila "tu mejor marca" condicionada a `user` del `AuthProvider`.
8. **Limpieza y verificación.** Eliminar el contenido residual de `create-next-app` en `page.tsx`/metadata si queda alguno, correr `npm run lint` y `npm run build`, navegar manualmente las 5 pantallas en `npm run dev` para verificar paridad visual con el prototipo.

## Criterios de aceptación

- [ ] `npm run build` compila sin errores.
- [ ] `npm run lint` pasa sin errores.
- [ ] La navbar aparece en las 5 pantallas, resalta el link activo, y el menú hamburguesa funciona en viewport móvil (`<840px`).
- [ ] `/` muestra el grid de 8 juegos; buscar por nombre y filtrar por categoría reduce el grid correctamente; buscar un término sin resultados muestra el estado "NO HAY RESULTADOS".
- [ ] Click en una tarjeta o su botón "JUGAR" navega a `/juego/[id]` con el juego correcto.
- [ ] `/juego/[id]` muestra portada, tags, descripción, estadísticas y una tabla de mejores puntuaciones con 10 filas mock; un `id` inexistente resulta en 404.
- [ ] Botón "JUGAR AHORA" en detalle navega a `/juego/[id]/jugar`; botón "SALIR" en el reproductor vuelve a `/juego/[id]`.
- [ ] `/juego/[id]/jugar` muestra el HUD estático, el marco CRT con animaciones decorativas, y no ejecuta ningún loop de puntaje ni abre modal de fin de juego.
- [ ] `/auth` permite "iniciar sesión" o "crear cuenta" con cualquier valor y redirige a `/` con el nombre de usuario reflejado en la navbar; "jugar como invitado" también redirige y deja la sesión sin usuario.
- [ ] La sesión de usuario persiste tras recargar la página (localStorage) y cerrar sesión desde la navbar limpia el estado.
- [ ] `/salon-de-la-fama` permite cambiar de juego por tabs, muestra podio top 3 y tabla completa; con sesión iniciada aparece la fila "tu mejor marca".
- [ ] La estética visual (colores, tipografías Press Start 2P/JetBrains Mono, glow neón, scanlines CRT) coincide con `references/templates/` en las 5 pantallas.

## Decisiones tomadas y descartadas

- **Portar el diseño del prototipo tal cual**, en vez de rediseñar con `/frontend-design`: el usuario señaló explícitamente los templates como la fuente de las pantallas a implementar. Se descubrió además que `app/globals.css` y `app/layout.tsx` ya contienen una adaptación fiel de `styles.css` a Tailwind v4 (`@theme inline`) y las fuentes vía `next/font/google`, hecha en un commit previo — este spec construye los componentes/páginas sobre esa base existente en vez de portar el CSS de nuevo.
- **Rutas reales de Next.js App Router** en vez de replicar el router por hash (`location.hash`) del prototipo: es el patrón idiomático de Next 16 y evita reimplementar un router a mano.
- **Reproductor como placeholder estático**, sin el loop de partida simulado (`setInterval` de puntaje, modal de fin de juego, guardado en `localStorage`): se decidió no implementar ningún flujo de "juego" ni siquiera simulado, ya que el pedido es explícitamente "no es necesario desarrollar ningún juego". El HUD y el marco CRT con decoraciones CSS se mantienen porque son puramente visuales.
- **Guardado de puntuaciones (`av_scores`) fuera de alcance**: al no existir una partida real que las genere, implementar ese mecanismo sería trabajo sin función real en este MVP. El salón de la fama y el detalle de juego siguen mostrando leaderboards mock vía `seededScores`, igual que el prototipo.
- **Auth mock client-only**: sin backend, cualquier usuario/contraseña "entra"; solo se persiste el nombre de usuario en `localStorage` (`av_user`), igual que `auth.jsx`.
- **Nombres de ruta en español**, consistentes con el idioma del resto de la app: `/`, `/juego/[id]`, `/juego/[id]/jugar`, `/auth`, `/salon-de-la-fama`.

## Riesgos identificados

- El componente `Nav` y el `AuthProvider` deben ser client components (`"use client"`) por usar `useState`/`localStorage`; si se declaran mal como server components, la app no compilará o fallará en runtime.
- El acceso a `localStorage` debe protegerse con try/catch y ejecutarse solo en efectos de cliente para evitar errores de hidratación (mismatch entre SSR y cliente) al leer la sesión guardada.
- Los estilos son globales y dependen de nombres de clase exactos (`av-hero`, `crt-screen`, etc.); un desajuste de clase entre el JSX portado y `globals.css` rompe visualmente la pantalla sin dar error de compilación.
