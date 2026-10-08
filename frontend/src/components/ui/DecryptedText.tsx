"use client";

import React, { useState, useEffect, useRef } from "react";

interface DecryptedTextProps {
  text: string;
  speed?: number;
  maxIterations?: number;
  sequential?: boolean;
  revealDirection?: "start" | "end" | "center";
  useOriginalCharsOnly?: boolean;
  characters?: string;
  className?: string;
  animateOn?: "view" | "hover";
  parentClassName?: string;
}

export default function DecryptedText({
  text,
  speed = 45,
  maxIterations = 10,
  sequential = true,
  revealDirection = "start",
  useOriginalCharsOnly = false,
  characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!@#$%^&*()_+~`|}{[]:;?><,./-=",
  className = "",
  parentClassName = "",
  animateOn = "view",
}: DecryptedTextProps) {
  const [displayText, setDisplayText] = useState<string>(text);
  const [isHovering, setIsHovering] = useState<boolean>(false);
  const [isScrambling, setIsScrambling] = useState<boolean>(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let iteration = 0;
    const splitText = text.split("");

    const scramble = () => {
      setIsScrambling(true);
      if (intervalRef.current) clearInterval(intervalRef.current);

      intervalRef.current = setInterval(() => {
        setDisplayText(() =>
          splitText
            .map((char, index) => {
              if (char === " ") return " ";
              if (index < iteration) return text[index];
              return characters[Math.floor(Math.random() * characters.length)];
            })
            .join("")
        );

        if (iteration >= text.length) {
          setIsScrambling(false);
          if (intervalRef.current) clearInterval(intervalRef.current);
        }

        iteration += 1 / 3;
      }, speed);
    };

    if (animateOn === "view") {
      scramble();
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [text, speed, characters, animateOn]);

  const handleMouseEnter = () => {
    if (animateOn === "hover" && !isScrambling) {
      setIsHovering(true);
      let iteration = 0;
      const splitText = text.split("");

      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        setDisplayText(() =>
          splitText
            .map((char, index) => {
              if (char === " ") return " ";
              if (index < iteration) return text[index];
              return characters[Math.floor(Math.random() * characters.length)];
            })
            .join("")
        );

        if (iteration >= text.length) {
          if (intervalRef.current) clearInterval(intervalRef.current);
        }

        iteration += 1 / 2;
      }, speed);
    }
  };

  return (
    <span
      className={`inline-block ${parentClassName}`}
      onMouseEnter={handleMouseEnter}
    >
      <span className={className}>{displayText}</span>
    </span>
  );
}
