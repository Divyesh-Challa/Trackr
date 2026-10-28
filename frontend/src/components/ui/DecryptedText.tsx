"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";

interface DecryptedTextProps {
  text: string;
  speed?: number;
  characters?: string;
  className?: string;
  parentClassName?: string;
  animateOn?: "view" | "hover";
}

/**
 * Text that "decrypts" from random characters. Screen readers always get the real text,
 * and nothing animates when the user prefers reduced motion.
 */
export default function DecryptedText({
  text,
  speed = 45,
  characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
  className = "",
  parentClassName = "",
  animateOn = "view",
}: DecryptedTextProps) {
  const [display, setDisplay] = useState(text);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const running = useRef(false);

  const scramble = useCallback(
    (step: number) => {
      if (running.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      running.current = true;
      let revealed = 0;
      if (timer.current) clearInterval(timer.current);
      timer.current = setInterval(() => {
        setDisplay(
          text
            .split("")
            .map((ch, i) => (ch === " " || i < revealed ? ch : characters[Math.floor(Math.random() * characters.length)]))
            .join("")
        );
        revealed += step;
        if (revealed >= text.length + 1) {
          clearInterval(timer.current!);
          setDisplay(text);
          running.current = false;
        }
      }, speed);
    },
    [text, speed, characters]
  );

  useEffect(() => {
    setDisplay(text);
    if (animateOn === "view") scramble(1 / 3);
    return () => {
      if (timer.current) clearInterval(timer.current);
      running.current = false;
    };
  }, [text, animateOn, scramble]);

  return (
    <span
      className={`inline-block ${parentClassName}`}
      onMouseEnter={animateOn === "hover" ? () => scramble(1 / 2) : undefined}
    >
      <span className="sr-only">{text}</span>
      <span aria-hidden className={className}>
        {display}
      </span>
    </span>
  );
}
