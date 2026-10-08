"use client";

import React, { useEffect, useRef } from "react";

interface VantaBackgroundProps {
  className?: string;
  color?: string;
  waveSpeed?: number;
  waveHeight?: number;
}

export default function VantaBackground({
  className = "",
  color = "#3b82f6",
  waveSpeed = 0.015,
  waveHeight = 24,
}: VantaBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let step = 0;
    let mouse = { x: -1000, y: -1000 };

    const handleResize = () => {
      if (!canvas) return;
      canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("mousemove", handleMouseMove);
    handleResize();

    const render = () => {
      step += waveSpeed;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const lines = 4;
      const width = canvas.width;
      const height = canvas.height;

      for (let i = 0; i < lines; i++) {
        ctx.beginPath();
        const baseHeight = height * 0.45 + i * 28;
        ctx.moveTo(0, baseHeight);

        for (let x = 0; x <= width; x += 15) {
          const mouseDist = Math.hypot(x - mouse.x, baseHeight - mouse.y);
          const mouseFactor = mouseDist < 200 ? (1 - mouseDist / 200) * 18 : 0;

          const y =
            baseHeight +
            Math.sin(x * 0.005 + step + i * 0.8) * (waveHeight + i * 4) +
            Math.cos(x * 0.003 - step * 0.6) * 12 -
            mouseFactor;

          ctx.lineTo(x, y);
        }

        ctx.strokeStyle = `rgba(59, 130, 246, ${0.05 + i * 0.03})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, [color, waveSpeed, waveHeight]);

  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      <canvas ref={canvasRef} className="w-full h-full opacity-60" />
    </div>
  );
}
