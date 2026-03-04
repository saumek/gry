"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type UseRevealAutoAdvanceArgs = {
  enabled: boolean;
  phase: string;
  roundKey: string;
  durationMs?: number;
  onAdvance: () => void;
};

export function useRevealAutoAdvance({
  enabled,
  phase,
  roundKey,
  durationMs = 1200,
  onAdvance
}: UseRevealAutoAdvanceArgs): {
  isPaused: boolean;
  secondsLeft: number;
  pause: () => void;
} {
  const [isPaused, setIsPaused] = useState(false);
  const [remainingMs, setRemainingMs] = useState(durationMs);
  const hasAutoAdvancedRef = useRef(false);

  useEffect(() => {
    setIsPaused(false);
    setRemainingMs(durationMs);
    hasAutoAdvancedRef.current = false;
  }, [durationMs, roundKey, phase]);

  useEffect(() => {
    if (!enabled || phase !== "reveal" || isPaused) {
      return;
    }

    const stepMs = 100;
    const timer = window.setInterval(() => {
      if (document.hidden) {
        return;
      }

      setRemainingMs((current) => {
        const next = current - stepMs;
        if (next > 0) {
          return next;
        }

        window.clearInterval(timer);
        return 0;
      });
    }, stepMs);

    return () => {
      window.clearInterval(timer);
    };
  }, [enabled, isPaused, phase]);

  useEffect(() => {
    if (!enabled || phase !== "reveal" || isPaused || remainingMs > 0) {
      return;
    }

    if (hasAutoAdvancedRef.current) {
      return;
    }

    hasAutoAdvancedRef.current = true;
    onAdvance();
  }, [enabled, isPaused, onAdvance, phase, remainingMs]);

  const secondsLeft = useMemo(() => Math.max(0, remainingMs / 1000), [remainingMs]);

  return {
    isPaused,
    secondsLeft,
    pause: () => setIsPaused(true)
  };
}
