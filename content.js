(() => {
  // Prevent double-initialization if injected again
  if (window.__autoReloaderInjected) return;
  window.__autoReloaderInjected = true;

  let timer = null;
  let currentSeconds = null;
  let remainingMs = null;
  let endAtMs = null;
  let isPaused = false;

  function clearTimer() {
    if (timer) { clearTimeout(timer); timer = null; }
  }

  function schedule(seconds) {
    clearTimer();
    currentSeconds = seconds;
    scheduleMs(seconds * 1000);
  }

  function scheduleMs(ms) {
    clearTimer();
    if (ms == null) return;
    remainingMs = Math.max(0, ms);
    endAtMs = Date.now() + remainingMs;
    if (isPaused) return; // don't start countdown while paused
    timer = setTimeout(() => {
      try {
        location.reload();
      } catch (e) {
        location.replace(location.href);
      }
    }, remainingMs);
  }

  function pauseTimer() {
    if (isPaused) return;
    if (timer) {
      remainingMs = Math.max(0, (endAtMs ?? Date.now()) - Date.now());
    }
    clearTimer();
    isPaused = true;
  }

  function resumeTimer() {
    if (!isPaused) return;
    isPaused = false;
    if (remainingMs != null && currentSeconds != null) {
      scheduleMs(remainingMs);
    }
  }

  // Get initial state for this tab (if already enabled)
  chrome.runtime.sendMessage({ type: "getCurrentTabState" }, (res) => {
    if (!res || !res.state) return;
    // If currently paused (mouse over page), keep remaining without starting timer
    if (isPaused) {
      currentSeconds = res.state.seconds;
      remainingMs = currentSeconds * 1000;
      endAtMs = null;
    } else {
      schedule(res.state.seconds);
    }
  });

  // React to live changes from the popup
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type !== "config") return;
    if (msg.enabled) {
      if (typeof msg.seconds === "number" && msg.seconds > 0) {
        if (isPaused) {
          currentSeconds = msg.seconds;
          remainingMs = currentSeconds * 1000;
          endAtMs = null;
        } else {
          schedule(msg.seconds);
        }
      }
    } else {
      clearTimer();
      currentSeconds = null;
      remainingMs = null;
      endAtMs = null;
      isPaused = false;
    }
  });

  // Pause when mouse is inside the page, resume when it leaves the page/window
  const root = document.documentElement;
  root.addEventListener("mouseenter", pauseTimer, { passive: true });
  root.addEventListener("mouseleave", resumeTimer, { passive: true });
})();
