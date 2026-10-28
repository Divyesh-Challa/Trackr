"use client";

import React, { useEffect, useRef } from "react";

interface VantaBackgroundProps {
  className?: string;
  /** Line colour as an "r, g, b" triple. */
  rgb?: string;
  lines?: number;
  waveSpeed?: number;
  waveHeight?: number;
}

/**
 * Soft animated wave lines drawn on a canvas. Only animates while visible on screen and
 * the tab is focused; draws a single still frame when the user prefers reduced motion.
 */
export default function VantaBackground({
  className = "",
  rgb = "59, 130, 246",
  lines = 4,
  waveSpeed = 0.015,
  waveHeight = 24,
}: VantaBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    let step = 0;
    let visible = false;
    let mouse = { x: -1000, y: -1000 };
    let width = 0;
    let height = 0;

    const resize = () => {
      const parent = canvas.parentElement;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = parent?.clientWidth ?? window.innerWidth;
      height = parent?.clientHeight ?? window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      for (let i = 0; i < lines; i++) {
        const base = height * 0.45 + i * 28;
        ctx.beginPath();
        ctx.moveTo(0, base);
        for (let x = 0; x <= width; x += 15) {
          const d = Math.hypot(x - mouse.x, base - mouse.y);
          const pull = d < 200 ? (1 - d / 200) * 18 : 0;
          const y =
            base +
            Math.sin(x * 0.005 + step + i * 0.8) * (waveHeight + i * 4) +
            Math.cos(x * 0.003 - step * 0.6) * 12 -
            pull;
          ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `rgba(${rgb}, ${0.05 + i * 0.03})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    };

    const loop = () => {
      step += waveSpeed;
      draw();
      frame = requestAnimationFrame(loop);
    };
    const start = () => {
      if (!reduced && visible && !document.hidden && !frame) frame = requestAnimationFrame(loop);
    };
    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
    };

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start();
      else stop();
    });
    observer.observe(canvas);

    const onVisibility = () => (document.hidden ? stop() : start());
    const onMove = (e: PointerEvent) => {
      if (!visible) return;
      const rect = canvas.getBoundingClientRect();
      mouse = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    resize();
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibility);
    if (!reduced) window.addEventListener("pointermove", onMove, { passive: true });

    return () => {
      stop();
      observer.disconnect();
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pointermove", onMove);
    };
  }, [rgb, lines, waveSpeed, waveHeight]);

  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      <canvas ref={canvasRef} className="h-full w-full opacity-60" />
    </div>
  );
}
