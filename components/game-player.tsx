"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import AsteroidsGame, {
  type AsteroidsGameHandle,
} from "@/components/asteroids-game";
import type { AsteroidsSnapshot } from "@/lib/games/asteroids/engine";
import type { Game } from "@/lib/data";

const INITIAL_SNAPSHOT: AsteroidsSnapshot = {
  score: 0,
  lives: 3,
  level: 1,
  status: "playing",
};

type ButtonClick = React.MouseEvent<HTMLButtonElement>;

const TOUCH_BUTTONS = [
  { code: "ArrowLeft", label: "◀", aria: "Girar a la izquierda", cls: "" },
  { code: "ArrowRight", label: "▶", aria: "Girar a la derecha", cls: "" },
  { code: "ArrowUp", label: "▲", aria: "Propulsar", cls: "" },
  { code: "Space", label: "DISPARAR", aria: "Disparar", cls: " fire" },
];

// Holding a button holds the virtual key; every way a pointer can end releases it.
function TouchControls({
  onKey,
}: {
  onKey: (code: string, down: boolean) => void;
}) {
  return (
    <div className="touch-controls">
      {TOUCH_BUTTONS.map(({ code, label, aria, cls }) => {
        const release = () => onKey(code, false);
        return (
          <button
            key={code}
            type="button"
            className={`btn touch-btn${cls}`}
            aria-label={aria}
            onPointerDown={(e) => {
              e.preventDefault();
              onKey(code, true);
            }}
            onPointerUp={release}
            onPointerCancel={release}
            onPointerLeave={release}
            onContextMenu={(e) => e.preventDefault()}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

export default function GamePlayer({ game }: { game: Game }) {
  const isAsteroids = game.id === "asteroids";
  const gameRef = useRef<AsteroidsGameHandle>(null);
  const [snapshot, setSnapshot] = useState(INITIAL_SNAPSHOT);

  const { score, lives, level, status } = snapshot;
  const paused = status === "paused";
  const gameOver = status === "gameover";

  // Each handler releases focus so a later Space press shoots instead of
  // re-activating the button.
  const handlePause = (e: ButtonClick) => {
    e.currentTarget.blur();
    gameRef.current?.togglePause();
  };
  const handleEnd = (e: ButtonClick) => {
    e.currentTarget.blur();
    gameRef.current?.endGame();
  };
  const handleRestart = (e: ButtonClick) => {
    e.currentTarget.blur();
    gameRef.current?.restart();
  };
  const handleKey = (code: string, down: boolean) =>
    gameRef.current?.setKey(code, down);

  return (
    <div className="av-player fade-in">
      <div className="player-hud">
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div className="hud-stat">
            <div className="l">Jugador</div>
            <div className="v" style={{ color: "var(--ink)" }}>
              INVITADO
            </div>
          </div>
          <div className="hud-stat">
            <div className="l">Puntuación</div>
            <div className="v">{isAsteroids ? score : 0}</div>
          </div>
          <div className="hud-stat lives">
            <div className="l">Vidas</div>
            <div className="v">
              {isAsteroids
                ? lives > 0
                  ? Array(lives).fill("♥").join(" ")
                  : "—"
                : "♥ ♥ ♥"}
            </div>
          </div>
          <div className="hud-stat level">
            <div className="l">Nivel</div>
            <div className="v">
              {isAsteroids ? String(level).padStart(2, "0") : "01"}
            </div>
          </div>
        </div>
        <div className="hud-actions">
          <button
            className="btn yellow"
            disabled={!isAsteroids || gameOver}
            onClick={handlePause}
          >
            {paused ? "REANUDAR" : "PAUSA"}
          </button>
          <button
            className="btn magenta"
            disabled={!isAsteroids || gameOver}
            onClick={handleEnd}
          >
            FIN
          </button>
          {isAsteroids && gameOver && (
            <button className="btn" onClick={handleRestart}>
              JUGAR DE NUEVO
            </button>
          )}
          <Link href={`/juego/${game.id}`} className="btn ghost">
            SALIR
          </Link>
        </div>
      </div>

      <div className="crt">
        <div className="crt-screen">
          {isAsteroids ? (
            <AsteroidsGame ref={gameRef} onChange={setSnapshot} />
          ) : (
            <>
              <div className="game-arena">
                <div className="grid-floor"></div>
                <div className="enemy e1"></div>
                <div className="enemy e2"></div>
                <div className="enemy e3"></div>
                <div className="player-ship"></div>
              </div>
              <div
                className="crt-content"
                style={{ background: "rgba(0,0,0,0.6)", zIndex: 5 }}
              >
                <div>
                  <div className="pixel neon-yellow" style={{ fontSize: 22 }}>
                    JUEGO EN CONSTRUCCIÓN
                  </div>
                  <div
                    className="mono"
                    style={{
                      fontSize: 11,
                      color: "var(--ink-dim)",
                      marginTop: 10,
                      letterSpacing: "0.16em",
                    }}
                  >
                    ESTA PANTALLA ES SOLO UN PLACEHOLDER VISUAL
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
        <div className="crt-bottom">
          <span className="led">SEÑAL OK</span>
          <span>{game.title} · CRT-83 · 60 HZ</span>
          <span>CARGA · 1MB</span>
        </div>
        {isAsteroids && <TouchControls onKey={handleKey} />}
      </div>
    </div>
  );
}
