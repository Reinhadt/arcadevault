# 05 — Juego Asteroids jugable en Next.js

**Estado:** Implemented
**Depende de:** SPEC 01, SPEC 02
**Fecha:** 2026-11-02

**Objetivo:** Portar el juego Asteroids de `references/started-games/02-asteroids/` a un motor TypeScript montado en `/juego/asteroids/jugar`, registrado como un juego nuevo (`id: "asteroids"`) del catálogo y conectado al HUD, la pausa y los controles táctiles de la pantalla de juego existente.

## Alcance

**Incluye:**

- Nueva entrada en `GAMES` de `lib/data.ts`, **al final del arreglo**: `id: "asteroids"`, `title: "ASTEROIDS"`, `cat: "SHOOTER"`, `color: "cyan"`, `cover: "cover-asteroids"`, `short`/`long` en español describiendo lo que el juego realmente tiene (asteroides que se parten en fragmentos, 3 vidas con invencibilidad al reaparecer, power-up de disparo triple), y `best`/`plays` con valores mock coherentes con el resto del catálogo. El juego `rocas` **no se modifica** y sigue siendo el placeholder visual.
- Nueva clase `.cover-asteroids` en `app/globals.css` siguiendo el patrón de `.cover-rocas` (fondo oscuro, asteroides poligonales en trazo blanco y nave triangular, solo con gradientes/pseudo-elementos). El diseño se hace con la skill `/frontend-design` según `CLAUDE.md`.
- **Motor del juego** en TypeScript puro, sin React ni acceso al DOM salvo el `CanvasRenderingContext2D` recibido, en `lib/games/asteroids/`:
  - Port 1:1 de `game.js`: clases `Bullet`, `Asteroid`, `PowerUp`, `Ship`, `Particle`; constantes (`W = 800`, `H = 600`, `RADII`, `SPEEDS`, `POINTS`, `POWERUP_*`, `TRIPLE_SPREAD`); utilidades (`wrap`, `dist`, `rand`, `randInt`); lógica de `spawnAsteroids`, `nextLevel`, `explode`, `killShip`, colisiones y loop con `dt` limitado a 0.05 s.
  - Gráficos **fieles al original**: líneas blancas sobre negro, power-up cian con "3x", propulsor naranja, overlay `GAME OVER`. El marco CRT existente aporta la estética neón alrededor.
  - El canvas **ya no dibuja** `SCORE`, `NIVEL` ni los iconos de vida: esos datos los muestra el HUD de React. En canvas quedan el contador del power-up `3x  N.Ns`, el overlay `GAME OVER` y el nuevo overlay `PAUSA`.
  - Entrada por teclas virtuales: el motor expone un método para presionar/soltar un código de tecla (`ArrowLeft`, `ArrowRight`, `ArrowUp`, `Space`), usado tanto por el teclado físico como por los botones táctiles.
  - API del motor (ver Modelo de datos): crear, iniciar, pausar/reanudar, terminar, reiniciar y destruir (cancela `requestAnimationFrame` y quita listeners).
- **Componente cliente** `components/asteroids-game.tsx` (`"use client"`): monta el `<canvas width=800 height=600>`, crea el motor en `useEffect`, lo destruye en el cleanup (compatible con React strict mode: no duplica loops ni listeners) y reporta `score`, `lives`, `level` y `status` al padre mediante callbacks.
- **Integración en `app/juego/[id]/jugar/page.tsx`**: cuando `id === "asteroids"` se monta el juego real dentro de `.crt-screen` en lugar del placeholder; los demás ids conservan el placeholder actual. Como el componente de la página necesita estado de la partida, la pantalla de juego pasa a delegar en un client component (`components/game-player.tsx`) que recibe el `game` serializable desde la página (que sigue siendo Server Component y llama a `notFound()` si el id no existe).
- **HUD de React** (`player-hud` existente) alimentado por el motor: Puntuación, Vidas (`♥` por vida restante) y Nivel (con cero a la izquierda, `01`). Jugador sigue mostrando `INVITADO`.
- **Botones del HUD funcionales** (solo para `asteroids`):
  - `PAUSA` alterna pausa y su texto cambia a `REANUDAR`.
  - Las teclas `P` y `Escape` alternan pausa igual que el botón.
  - El juego se pausa automáticamente al ocultarse la pestaña (`visibilitychange`).
  - `FIN` termina la partida y muestra el overlay `GAME OVER` con el puntaje actual.
  - Tras `GAME OVER` se puede reiniciar con `Espacio` (como el original) o con un botón `JUGAR DE NUEVO` en el HUD.
- **Escalado responsivo**: canvas lógico fijo de 800×600 escalado por CSS (`width: 100%`, `aspect-ratio: 4 / 3`, `height: auto`) dentro de `.crt-screen`, manteniendo la proporción. Las coordenadas del juego no cambian con el tamaño en pantalla.
- **Controles táctiles**: fila de 4 botones (`◀`, `▶`, `▲`, `DISPARAR`) bajo el CRT, visibles solo con `@media (pointer: coarse)` o en pantallas estrechas; usan pointer events (`pointerdown`/`pointerup`/`pointercancel`/`pointerleave`) para presionar y soltar las teclas virtuales (mantener presionado = tecla sostenida). Estilos nuevos en `app/globals.css`.
- Prevención del scroll de la página con las teclas de flecha y `Espacio` mientras el juego está activo (`preventDefault` en los `keydown` de esas teclas).

**No incluye (fuera de alcance de este spec):**

- Guardar puntajes (Supabase, tablas, RLS) ni Salón de la Fama real: el puntaje final solo se muestra en el overlay `GAME OVER`. Entra en una spec propia junto con auth.
- Autenticación o nombre real del jugador (sigue `INVITADO`).
- Cambios al juego `rocas` o a su descripción (menciona OVNIs, pero es otro juego del catálogo).
- OVNIs, sonido, música, high score local o cualquier mecánica no presente en `game.js`.
- Adaptar la estética del canvas a la paleta neón del Vault (colores/glow); se mantiene la del original.
- Gestos táctiles sobre el canvas, soporte de gamepad o remapeo de teclas.
- Portar los demás juegos de `references/started-games/` (`03-tetris`, `04-arkanoid`).
- Tests automatizados (el proyecto no tiene test runner configurado).

## Modelo de datos

Nueva entrada del catálogo (misma interfaz `Game` de `lib/data.ts`, sin cambios al tipo):

```ts
{
  id: "asteroids",
  title: "ASTEROIDS",
  short: "...",          // una frase, español
  long: "...",           // describe asteroides que se parten, 3 vidas, disparo triple
  cat: "SHOOTER",
  cover: "cover-asteroids",
  color: "cyan",
  best: /* mock */,
  plays: /* mock, formato "12.4K" */,
}
```

Contrato del motor (firmas, sin implementación):

```ts
// lib/games/asteroids/engine.ts
export type AsteroidsStatus = "playing" | "paused" | "gameover";

export interface AsteroidsSnapshot {
  score: number;
  lives: number; // 0..3
  level: number; // >= 1
  status: AsteroidsStatus;
}

export interface AsteroidsEngine {
  start(): void; // inicia el loop con una partida nueva
  togglePause(): void; // playing <-> paused; no hace nada en gameover
  endGame(): void; // fuerza gameover desde playing o paused
  restart(): void; // nueva partida (valido en cualquier estado)
  setKey(code: string, down: boolean): void; // teclas virtuales (teclado y táctil)
  destroy(): void; // cancela rAF y quita listeners
}

export function createAsteroidsEngine(
  canvas: HTMLCanvasElement,
  onChange: (snapshot: AsteroidsSnapshot) => void,
): AsteroidsEngine;
```

Convenciones:

- Coordenadas: origen arriba a la izquierda, espacio toroidal de 800×600 (`wrap`).
- Velocidades en px/s, tiempos en segundos (igual que `game.js`).
- `onChange` se invoca solo cuando cambia `score`, `lives`, `level` o `status`, no en cada frame.
- Estado `dead` del original (2 s entre vidas) sigue siendo interno al motor y se reporta como `playing`.

## Plan de implementación

1. **Leer la guía vigente de Next.js 16.** Antes de escribir código, leer en `node_modules/next/dist/docs/` lo relativo a Server/Client Components y a `PageProps` (según `AGENTS.md`). Sin cambios de código.
2. **Catálogo.** Agregar la entrada `asteroids` al final de `GAMES` en `lib/data.ts`. La Biblioteca y el Salón de la Fama muestran la tarjeta; `/juego/asteroids` muestra el detalle con la portada aún sin estilo (placeholder vacío). `npm run build` pasa.
3. **Portada.** Invocar `/frontend-design` y crear `.cover-asteroids` en `app/globals.css`. La tarjeta y el detalle muestran la portada nueva.
4. **Motor: núcleo.** Crear `lib/games/asteroids/` con constantes, utilidades y las clases `Bullet`, `Asteroid`, `PowerUp`, `Ship`, `Particle` portadas de `game.js` a TypeScript (`strict: true`), parametrizadas con el `ctx` en `draw(ctx)` y con el estado de teclas inyectado a `Ship.update`. `npm run lint` y `npm run build` pasan.
5. **Motor: loop y API.** Crear `lib/games/asteroids/engine.ts` con `createAsteroidsEngine` (estado, `update`, `draw`, colisiones, niveles, vidas, `GAME OVER`, `PAUSA`, `onChange`, `destroy`). Se quita el HUD de canvas, salvo el contador `3x`.
6. **Componente cliente del juego.** Crear `components/asteroids-game.tsx`: canvas 800×600 escalado por CSS, ciclo de vida en `useEffect`, listeners de teclado (flechas, `Espacio`, `P`, `Escape`) con `preventDefault`, `visibilitychange` para auto-pausa, y exposición de `togglePause`, `endGame` y `restart` hacia el padre (por `ref` imperativo o props de control).
7. **Pantalla de juego.** Crear `components/game-player.tsx` (client component) con el HUD actual y, para `asteroids`, el juego real + botones `PAUSA`/`REANUDAR`, `FIN` y `JUGAR DE NUEVO` funcionales. `app/juego/[id]/jugar/page.tsx` queda como Server Component que valida el id y renderiza `GamePlayer`. Los demás ids siguen mostrando el placeholder con los botones deshabilitados.
8. **Controles táctiles.** Agregar la fila de 4 botones con pointer events y sus estilos en `app/globals.css` (visibles solo con `pointer: coarse` o ancho estrecho).
9. **Verificación visual y limpieza.** Correr `npm run lint` y `npm run build`; en `npm run dev`, jugar `/juego/asteroids/jugar` (teclado y emulación táctil del navegador, capturas en `.playwright-screenshots/` si se usa Playwright) y revisar la consola sin errores.

## Criterios de aceptación

- [ ] `npm run build` compila sin errores.
- [ ] `npm run lint` pasa sin errores.
- [ ] `GAMES` contiene una entrada con `id: "asteroids"` como **último** elemento, y `GAMES.slice(0, 6)` y `GAMES[0]` no cambian respecto a SPEC 04.
- [ ] La entrada `rocas` en `lib/data.ts` no tiene cambios.
- [ ] La Biblioteca y el Salón de la Fama muestran ASTEROIDS; `/juego/asteroids` muestra el detalle con la portada `.cover-asteroids`.
- [ ] `/juego/asteroids/jugar` carga un canvas de 800×600 lógicos que arranca la partida sin errores en la consola.
- [ ] Con teclado: `←`/`→` rotan la nave, `↑` propulsa y `Espacio` dispara, con el mismo comportamiento que `references/started-games/02-asteroids/`.
- [ ] Destruir un asteroide grande, mediano y pequeño suma exactamente 20, 50 y 100 puntos y los grandes y medianos se parten en 2 del tamaño inferior.
- [ ] El HUD de React muestra Puntuación, Vidas (`♥` × vidas restantes) y Nivel actualizados en tiempo real; el canvas no dibuja `SCORE`, `NIVEL` ni iconos de vida.
- [ ] Al chocar con un asteroide fuera de invencibilidad se pierde una vida; con 0 vidas el canvas muestra `GAME OVER` con el puntaje final.
- [ ] Al destruir todos los asteroides se pasa al nivel siguiente y el HUD incrementa Nivel.
- [ ] El power-up `3x` aparece según las reglas de `game.js` y, al recogerlo, dispara 3 balas durante 5 s con contador visible en el canvas.
- [ ] `PAUSA`, `P` y `Escape` pausan y reanudan el juego; en pausa el canvas muestra `PAUSA`, el botón dice `REANUDAR` y nada se mueve.
- [ ] Al ocultar la pestaña la partida queda pausada.
- [ ] `FIN` lleva a `GAME OVER` desde `playing` y desde `paused`.
- [ ] Tras `GAME OVER`, `Espacio` y `JUGAR DE NUEVO` inician una partida nueva con puntaje 0, 3 vidas y nivel 1.
- [ ] Las flechas y `Espacio` no desplazan la página mientras se juega.
- [ ] El canvas mantiene proporción 4:3 al cambiar el ancho de la ventana y el juego sigue funcionando igual.
- [ ] Con emulación táctil (`pointer: coarse`) se ven los botones `◀`, `▶`, `▲`, `DISPARAR`; mantener presionado rota, propulsa o dispara, y soltar detiene la acción.
- [ ] Salir de la página y volver a entrar no deja loops ni listeners duplicados (el motor se destruye en el cleanup; la velocidad del juego es la misma tras navegar varias veces).
- [ ] `/juego/<otro-id>/jugar` (p. ej. `rocas`) sigue mostrando el placeholder de SPEC 01.
- [ ] `references/started-games/02-asteroids/` no tiene cambios.

## Decisiones tomadas y descartadas

- **Juego nuevo `asteroids`, no reemplazo de `rocas`:** decisión explícita del usuario. `rocas` es un placeholder del catálogo original (su descripción menciona OVNIs que el juego de referencia no tiene) y se deja intacto.
- **Motor TypeScript puro + wrapper React:** decisión explícita del usuario. Aísla la lógica del ciclo de vida de React, permite destruir el loop limpiamente en strict mode y evita mezclar 500 líneas de juego con JSX. Descartados: port en un solo componente (mezcla responsabilidades) e `iframe` con `public/index.html` (no integra HUD, pausa ni puntajes).
- **HUD de React, sin HUD de canvas:** decisión explícita del usuario. Reutiliza el `player-hud` ya construido en SPEC 01; evita duplicar información. Se conservan en canvas solo los elementos que no tienen equivalente en el HUD (`3x` y overlays).
- **`PAUSA` y `FIN` funcionales + atajos `P`/`Escape` + botón:** decisión explícita del usuario (conservar ambos). Se suma auto-pausa por `visibilitychange` para no perder vidas en segundo plano.
- **Reinicio con `Espacio` y con botón `JUGAR DE NUEVO`:** `Espacio` mantiene el comportamiento del original; el botón cubre pantallas táctiles, donde no hay teclado.
- **Sin guardar puntaje todavía:** decisión explícita del usuario. Persistir puntajes abre auth, tablas y RLS (dominio propio) y se difiere a una spec posterior.
- **Estética fiel al original:** decisión explícita del usuario. Cambiar colores/glow a la paleta del Vault queda para otra spec; se evita alterar la legibilidad del gameplay.
- **Controles táctiles con botones en pantalla (no gestos):** decisión explícita del usuario. Los botones reutilizan las mismas teclas virtuales del motor y son fáciles de verificar; los gestos sobre el canvas son ambiguos.
- **Escalado por CSS con canvas lógico fijo 800×600:** conserva la física, las colisiones y los radios del original sin recalcular nada por tamaño de pantalla. Descartado: redimensionar el canvas dinámicamente (cambiaría la jugabilidad entre dispositivos).
- **Entrada al final de `GAMES`:** decisión explícita del usuario. No altera el orden de la vista previa del Home ni la pestaña inicial del Salón de la Fama.
- **`best`/`plays` con datos mock:** mantiene la consistencia visual con los otros juegos del catálogo hasta que existan puntajes reales.
- **Teclas virtuales (`setKey`) en vez de leer `window` desde el motor:** el motor no depende del DOM global y el mismo camino sirve para teclado físico y botones táctiles.

## Riesgos identificados

- **React strict mode ejecuta los efectos dos veces en desarrollo**, lo que duplicaría loops y listeners. Mitigación: `destroy()` cancela `requestAnimationFrame` y quita todos los listeners; el criterio de aceptación de navegación repetida lo verifica.
- **`performance.now()` en `PowerUp.draw` y `Math.random()` en el render** no son problema en un loop de canvas, pero no deben invocarse durante el render de React. Mitigación: todo el dibujo ocurre en el motor, fuera del ciclo de render.
- **Re-renders por frame**: si `onChange` se invocara en cada frame, el HUD de React re-renderizaría a 60 Hz. Mitigación: el contrato dice que solo se notifica cuando cambia algún valor del snapshot.
- **Foco del teclado**: si un botón del HUD tiene foco, `Espacio` lo activaría además de disparar. Mitigación: los listeners de teclado del juego llaman a `preventDefault` en `Space` y los botones del HUD ceden el foco (`blur`) tras ser pulsados.
- **Dispositivos táctiles que sueltan el puntero fuera del botón** dejarían una tecla "pegada". Mitigación: se manejan `pointerup`, `pointercancel` y `pointerleave`, y el motor suelta todas las teclas virtuales al pausar y al destruirse.

## Qué **no** incluye este spec

- Persistencia de puntajes, Salón de la Fama real, auth o nombre de jugador.
- Cambios a `rocas`, a otros juegos del catálogo o al resto de pantallas más allá de lo indicado.
- OVNIs, sonido, high score local ni mecánicas ausentes en `game.js`.
- Nueva paleta/efectos visuales para el canvas, gestos táctiles o gamepad.
- Los juegos `03-tetris` y `04-arkanoid` de `references/started-games/`.

Cada uno de estos puntos, si se aborda, va en su propia spec.
