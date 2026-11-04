"use client";

import { useEffect, useImperativeHandle, useRef, type Ref } from "react";
import {
  createAsteroidsEngine,
  type AsteroidsEngine,
  type AsteroidsSnapshot,
} from "@/lib/games/asteroids/engine";

export interface AsteroidsGameHandle {
  togglePause: () => void;
  endGame: () => void;
  restart: () => void;
  setKey: (code: string, down: boolean) => void;
}

interface AsteroidsGameProps {
  onChange: (snapshot: AsteroidsSnapshot) => void;
  ref?: Ref<AsteroidsGameHandle>;
}

// Keys the game owns: they must never scroll the page or activate a focused button.
const GAME_KEYS = ["ArrowLeft", "ArrowRight", "ArrowUp", "Space"];

export default function AsteroidsGame({ onChange, ref }: AsteroidsGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<AsteroidsEngine | null>(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useImperativeHandle(ref, () => ({
    togglePause: () => engineRef.current?.togglePause(),
    endGame: () => engineRef.current?.endGame(),
    restart: () => engineRef.current?.restart(),
    setKey: (code, down) => engineRef.current?.setKey(code, down),
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let status: AsteroidsSnapshot["status"] = "playing";
    const engine = createAsteroidsEngine(canvas, (snapshot) => {
      status = snapshot.status;
      onChangeRef.current(snapshot);
    });
    engineRef.current = engine;

    const onKeyDown = (e: KeyboardEvent) => {
      if (GAME_KEYS.includes(e.code)) {
        e.preventDefault();
        engine.setKey(e.code, true);
      } else if (e.code === "KeyP" || e.code === "Escape") {
        e.preventDefault();
        if (!e.repeat) engine.togglePause();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (!GAME_KEYS.includes(e.code)) return;
      e.preventDefault();
      engine.setKey(e.code, false);
    };
    const releaseKeys = () => {
      for (const code of GAME_KEYS) engine.setKey(code, false);
    };
    const onVisibilityChange = () => {
      if (document.hidden && status === "playing") engine.togglePause();
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", releaseKeys);
    document.addEventListener("visibilitychange", onVisibilityChange);

    engine.start();

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", releaseKeys);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={600}
      aria-label="Asteroids"
      style={{
        display: "block",
        width: "100%",
        height: "auto",
        aspectRatio: "4 / 3",
      }}
    />
  );
}
