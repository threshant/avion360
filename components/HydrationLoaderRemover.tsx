"use client";

import { useEffect } from "react";

export default function HydrationLoaderRemover() {
  useEffect(() => {
    const el = document.getElementById("initial-loader");
    if (!el) return;

    // Wait for progress bar animation (1800ms) + a buffer for React hydration to fully settle
    const progressAnimationDuration = 1800;
    const hydrationBuffer = 400;
    const totalWaitMs = progressAnimationDuration + hydrationBuffer;

    const fadeMs = 500;

    setTimeout(() => {
      // Fade out and hide the loader
      el.style.transition = `opacity ${fadeMs}ms ease`;
      el.style.opacity = "0";
      el.style.pointerEvents = "none";
    }, totalWaitMs);
  }, []);

  return null;
}
