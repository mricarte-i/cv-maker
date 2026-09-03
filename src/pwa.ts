/** The injected registerSW.js registers on `load` and never checks again, so an
    installed PWA resumed from the background keeps serving its cached build.
    Ask on the way back in — which is also the safe moment to reload, because
    useAutosave already flushed to IndexedDB on the way out. */
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.ready.then((reg) => {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        reg.update();
      }
    });
  });

  // autoUpdate puts skipWaiting + clientsClaim in the worker, so a new one takes
  // control the moment update() finds it — but the page runs the old chunks
  // until it reloads. Only listen when a controller already exists: the first
  // install fires this too, and reloading a page that just loaded is pointless.
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
