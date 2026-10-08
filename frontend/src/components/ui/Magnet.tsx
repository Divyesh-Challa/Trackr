"use client";

import React, { useRef, useEffect } from "react";
import gsap from "gsap";

interface MagnetProps {
  children: React.ReactNode;
  className?: string;
  pullFactor?: number;
  radius?: number;
}

export default function Magnet({
  children,
  className = "",
  pullFactor = 0.35,
  radius = 80,
}: MagnetProps) {
  const magnetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = magnetRef.current;
    if (!el) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const dist = Math.hypot(e.clientX - centerX, e.clientY - centerY);

      if (dist < radius) {
        const deltaX = (e.clientX - centerX) * pullFactor;
        const deltaY = (e.clientY - centerY) * pullFactor;

        gsap.to(el, {
          x: deltaX,
          y: deltaY,
          duration: 0.3,
          ease: "power2.out",
        });
      } else {
        gsap.to(el, {
          x: 0,
          y: 0,
          duration: 0.5,
          ease: "elastic.out(1, 0.3)",
        });
      }
    };

    const handleMouseLeave = () => {
      gsap.to(el, {
        x: 0,
        y: 0,
        duration: 0.5,
        ease: "elastic.out(1, 0.3)",
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    el.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      el.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [pullFactor, radius]);

  return (
    <div ref={magnetRef} className={`inline-block ${className}`}>
      {children}
    </div>
  );
}
