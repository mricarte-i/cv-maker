import { useSyncExternalStore } from "react";

/** The injected registerSW.js registers on `load` and never checks again, so an
    installed PWA resumed from the background keeps serving its cached build.
    Ask on the way back in — then park the new worker until someone says go. */

let waiting: ServiceWorker | null = null;
const subs = new Set<() => void>();

/** true once a new worker is installed and parked */
export function useUpdateReady() {
  return useSyncExternalStore(
    (fn) => {
      subs.add(fn);
      return () => subs.delete(fn);
    },
    () => waiting !== null,
  );
}

/** `prompt` mode leaves the worker waiting; this is the only thing that lets it
    through. clientsClaim then swaps the controller, and the listener below
    turns that into the reload. */
export function applyUpdate() {
  waiting?.postMessage({ type: "SKIP_WAITING" });
}

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.ready.then((reg) => {
    const park = (sw: ServiceWorker | null) => {
      // no controller means this is a first install, which replaces nothing
      if (!sw || !navigator.serviceWorker.controller) {
        return;
      }
      const settle = () => {
        if (sw.state === "installed") {
          waiting = sw;
          subs.forEach((fn) => fn());
        }
      };
      sw.addEventListener("statechange", settle);
      settle(); // it may already be there
    };

    reg.addEventListener("updatefound", () => park(reg.installing));
    park(reg.waiting); // one may have parked on an earlier visit

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        reg.update();
      }
    });
  });

  if (navigator.serviceWorker.controller) {
    let reloading = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!reloading) {
        reloading = true;
        location.reload();
      }
    });
  }
}
