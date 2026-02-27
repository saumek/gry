"use client";

import { useEffect } from "react";

export function PwaRegister(): null {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) =>
          Promise.all(registrations.map((registration) => registration.unregister()))
        )
        .catch(() => {
          // Ignore cleanup issues in dev mode.
        });

      if ("caches" in window) {
        caches
          .keys()
          .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
          .catch(() => {
            // Ignore cache cleanup issues in dev mode.
          });
      }
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Silently ignore registration errors in v1.
    });
  }, []);

  return null;
}
