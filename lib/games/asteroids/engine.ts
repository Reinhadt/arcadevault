import {
  H,
  POINTS,
  POWERUP_DROP_CHANCE,
  POWERUP_DURATION,
  W,
} from "./constants";
import {
  Asteroid,
  Bullet,
  Particle,
  PowerUp,
  Ship,
  type Keys,
} from "./entities";
import { dist, rand } from "./utils";

export type AsteroidsStatus = "playing" | "paused" | "gameover";

export interface AsteroidsSnapshot {
  score: number;
  lives: number; // 0..3
  level: number; // >= 1
  status: AsteroidsStatus;
}

export interface AsteroidsEngine {
  start(): void; // starts the loop with a new game
  togglePause(): void; // playing <-> paused; does nothing on gameover
  endGame(): void; // forces gameover from playing or paused
  restart(): void; // new game (valid in any state)
  setKey(code: string, down: boolean): void; // virtual keys (keyboard and touch)
  destroy(): void; // cancels rAF and removes listeners
}

// Internal game state; "dead" (2 s between lives) is reported as "playing".
type GameState = "playing" | "dead" | "gameover";

export function createAsteroidsEngine(
  canvas: HTMLCanvasElement,
  onChange: (snapshot: AsteroidsSnapshot) => void,
): AsteroidsEngine {
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D context not available");
  const ctx: CanvasRenderingContext2D = context;

  // ── Input ───────────────────────────────────────────────────────────────────
  const keys: Keys = {};
  const justPressed: Keys = {};

  function pressed(code: string) {
    const val = justPressed[code];
    justPressed[code] = false;
    return val;
  }

  function releaseAllKeys() {
    for (const code of Object.keys(keys)) keys[code] = false;
    for (const code of Object.keys(justPressed)) justPressed[code] = false;
  }

  // ── Game state ──────────────────────────────────────────────────────────────
  let ship: Ship;
  let bullets: Bullet[];
  let asteroids: Asteroid[];
  let particles: Particle[];
  let powerUps: PowerUp[];
  let score: number;
  let lives: number;
  let level: number;
  let state: GameState;
  let deadTimer = 0;
  let powerUpSpawned: boolean;
  let killsSinceSpawn: number;

  let paused = false;
  let destroyed = false;
  let rafId: number | null = null;
  let lastTime: number | null = null;
  let lastSnapshot: AsteroidsSnapshot | null = null;

  function spawnAsteroids(count: number) {
    const SAFE_DIST = 130;
    for (let i = 0; i < count; i++) {
      let x: number, y: number;
      do {
        x = rand(0, W);
        y = rand(0, H);
      } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
      asteroids.push(new Asteroid(x, y, 3));
    }
  }

  function initGame() {
    ship = new Ship();
    bullets = [];
    asteroids = [];
    particles = [];
    powerUps = [];
    powerUpSpawned = false;
    killsSinceSpawn = 0;
    score = 0;
    lives = 3;
    level = 1;
    state = "playing";
    paused = false;
    spawnAsteroids(4);
  }

  function nextLevel() {
    level++;
    bullets = [];
    particles = [];
    powerUps = [];
    powerUpSpawned = false;
    killsSinceSpawn = 0;
    ship.reset();
    spawnAsteroids(3 + level);
  }

  function explode(x: number, y: number, count = 8) {
    for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
  }

  function killShip() {
    explode(ship.x, ship.y, 14);
    ship.dead = true;
    lives--;
    if (lives <= 0) {
      state = "gameover";
    } else {
      state = "dead";
      deadTimer = 2;
    }
  }

  // ── Snapshot ────────────────────────────────────────────────────────────────
  function snapshot(): AsteroidsSnapshot {
    const status: AsteroidsStatus = paused
      ? "paused"
      : state === "gameover"
        ? "gameover"
        : "playing";
    return { score, lives, level, status };
  }

  // Notifies only when score, lives, level or status changed.
  function emit() {
    if (destroyed) return;
    const next = snapshot();
    const prev = lastSnapshot;
    if (
      prev &&
      prev.score === next.score &&
      prev.lives === next.lives &&
      prev.level === next.level &&
      prev.status === next.status
    )
      return;
    lastSnapshot = next;
    onChange(next);
  }

  // ── Update ──────────────────────────────────────────────────────────────────
  function update(dt: number) {
    if (state === "gameover") {
      if (pressed("Space")) initGame();
      particles.forEach((p) => p.update(dt));
      particles = particles.filter((p) => !p.dead);
      return;
    }

    if (state === "dead") {
      deadTimer -= dt;
      particles.forEach((p) => p.update(dt));
      particles = particles.filter((p) => !p.dead);
      asteroids.forEach((a) => a.update(dt));
      if (deadTimer <= 0) {
        state = "playing";
        ship.reset();
      }
      return;
    }

    // Shoot
    if (pressed("Space")) {
      bullets.push(...ship.tryShoot());
    }

    ship.update(dt, keys);
    bullets.forEach((b) => b.update(dt));
    asteroids.forEach((a) => a.update(dt));
    particles.forEach((p) => p.update(dt));
    powerUps.forEach((p) => p.update(dt));

    bullets = bullets.filter((b) => !b.dead);
    particles = particles.filter((p) => !p.dead);
    powerUps = powerUps.filter((p) => !p.dead);

    for (const p of powerUps) {
      if (!p.dead && dist(ship, p) < ship.radius + p.radius) {
        p.dead = true;
        ship.tripleShot = POWERUP_DURATION;
      }
    }

    // Bullet vs asteroid
    const newAsteroids: Asteroid[] = [];
    for (const b of bullets) {
      for (const a of asteroids) {
        if (!a.dead && !b.dead && dist(b, a) < a.radius) {
          b.dead = true;
          a.dead = true;
          score += POINTS[a.size];
          explode(a.x, a.y, a.size * 5);
          newAsteroids.push(...a.split());
          if (!powerUpSpawned) {
            killsSinceSpawn++;
            const guaranteed = killsSinceSpawn >= 5;
            if (guaranteed || Math.random() < POWERUP_DROP_CHANCE) {
              powerUps.push(new PowerUp(a.x, a.y));
              powerUpSpawned = true;
            }
          }
        }
      }
    }
    asteroids = asteroids.filter((a) => !a.dead).concat(newAsteroids);
    bullets = bullets.filter((b) => !b.dead);

    // Ship vs asteroid
    if (ship.invincible <= 0) {
      for (const a of asteroids) {
        if (dist(ship, a) < ship.radius + a.radius * 0.82) {
          killShip();
          break;
        }
      }
    }

    // Level cleared
    if (asteroids.length === 0) nextLevel();
  }

  // ── Draw ────────────────────────────────────────────────────────────────────
  // SCORE, NIVEL and life icons live in the React HUD; only the 3x timer and
  // the overlays are drawn on the canvas.
  function drawTripleTimer() {
    if (ship.tripleShot <= 0) return;
    ctx.font = "15px monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#0ff";
    ctx.fillText(`3x  ${ship.tripleShot.toFixed(1)}s`, 14, 26);
  }

  function drawOverlay(title: string, sub: string) {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#fff";
    ctx.font = "bold 46px monospace";
    ctx.fillText(title, W / 2, H / 2 - 18);
    ctx.font = "18px monospace";
    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.fillText(sub, W / 2, H / 2 + 22);
  }

  function draw() {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);

    particles.forEach((p) => p.draw(ctx));
    asteroids.forEach((a) => a.draw(ctx));
    powerUps.forEach((p) => p.draw(ctx));
    bullets.forEach((b) => b.draw(ctx));
    ship.draw(ctx);

    drawTripleTimer();

    if (paused) drawOverlay("PAUSA", "P / ESC PARA REANUDAR");
    else if (state === "gameover")
      drawOverlay(
        "GAME OVER",
        `PUNTAJE: ${score}   —   ESPACIO PARA REINICIAR`,
      );
  }

  // ── Main loop ───────────────────────────────────────────────────────────────
  function loop(ts: number) {
    if (destroyed) return;
    rafId = requestAnimationFrame(loop);

    // While paused nothing moves: the frame drawn on pause stays on screen.
    if (paused) {
      lastTime = null;
      return;
    }

    const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
    lastTime = ts;
    update(dt);
    draw();
    emit();
  }

  // ── Public API ──────────────────────────────────────────────────────────────
  initGame();

  return {
    start() {
      if (destroyed) return;
      initGame();
      releaseAllKeys();
      lastTime = null;
      emit();
      if (rafId === null) rafId = requestAnimationFrame(loop);
    },

    togglePause() {
      if (destroyed || state === "gameover") return;
      paused = !paused;
      releaseAllKeys();
      lastTime = null;
      if (paused) draw();
      emit();
    },

    endGame() {
      if (destroyed || state === "gameover") return;
      paused = false;
      state = "gameover";
      releaseAllKeys();
      lastTime = null;
      draw();
      emit();
    },

    restart() {
      if (destroyed) return;
      initGame();
      releaseAllKeys();
      lastTime = null;
      emit();
    },

    setKey(code: string, down: boolean) {
      if (destroyed) return;
      // Presses while paused are dropped so they don't fire on resume.
      if (paused && down) return;
      if (down && !keys[code]) justPressed[code] = true;
      keys[code] = down;
    },

    destroy() {
      destroyed = true;
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = null;
      releaseAllKeys();
    },
  };
}
