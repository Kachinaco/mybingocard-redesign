"use client";

import { useEffect, useState } from "react";

interface ConfettiPiece {
  id: number;
  x: number;
  color: string;
  delay: number;
  duration: number;
  size: number;
}

export default function Confetti({ active }: { active: boolean }) {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    if (!active) {
      setPieces([]);
      return;
    }

    const colors = ["#f59e0b", "#ec4899", "#8b5cf6", "#06b6d4", "#22c55e", "#ef4444", "#3b82f6"];
    const newPieces: ConfettiPiece[] = [];

    for (let i = 0; i < 60; i++) {
      newPieces.push({
        id: i,
        x: Math.random() * 100,
        color: colors[Math.floor(Math.random() * colors.length)]!,
        delay: Math.random() * 0.5,
        duration: 1.5 + Math.random() * 2,
        size: 6 + Math.random() * 8,
      });
    }
    setPieces(newPieces);
  }, [active]);

  if (!active || pieces.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {pieces.map((p) => (
        <div
          key={p.id}
          className="absolute animate-confetti-fall"
          style={{
            left: `${p.x}%`,
            top: "-10px",
            width: `${p.size}px`,
            height: `${p.size * 0.6}px`,
            backgroundColor: p.color,
            borderRadius: "2px",
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            transform: `rotate(${Math.random() * 360}deg)`,
          }}
        />
      ))}

    </div>
  );
}
