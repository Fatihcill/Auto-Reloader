(() => {
  // Prevent double-initialization if injected again
  if (window.__autoReloaderInjected) return;
  window.__autoReloaderInjected = true;

  let timer = null;
  let currentSeconds = null;

  function clearTimer() {
    if (timer) { clearTimeout(timer); timer = null; }
  }

  function schedule(seconds) {
    clearTimer();
    currentSeconds = seconds;
    timer = setTimeout(() => {
      try {
        location.reload();
      } catch (e) {
        location.replace(location.href);
      }
    }, Math.max(0, seconds * 1000));
  }

  // Get initial state for this tab (if already enabled)
  chrome.runtime.sendMessage({ type: "getCurrentTabState" }, (res) => {
    if (!res || !res.state) return;
    schedule(res.state.seconds);
  });

  // React to live changes from the popup
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type !== "config") return;
    if (msg.enabled) {
      if (typeof msg.seconds === "number" && msg.seconds > 0) {
        schedule(msg.seconds);
      }
    } else {
      clearTimer();
      currentSeconds = null;
    }
  });
})();
