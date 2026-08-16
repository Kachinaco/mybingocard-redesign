"use client";

import { useEffect } from "react";

export default function BingoPreviewBehavior() {
  useEffect(() => {
    const buttons = Array.from(
      document.querySelectorAll<HTMLButtonElement>(
        '[data-bingo-preview] button[data-action="mark-cell"]'
      )
    );

    const cleanups = buttons.map((button) => {
      const handleClick = () => {
        if (button.classList.contains("is-free")) return;

        const pressed = button.getAttribute("aria-pressed") === "true";
        button.setAttribute("aria-pressed", String(!pressed));
      };

      button.addEventListener("click", handleClick);
      return () => button.removeEventListener("click", handleClick);
    });

    return () => cleanups.forEach((cleanup) => cleanup());
  }, []);

  return null;
}
