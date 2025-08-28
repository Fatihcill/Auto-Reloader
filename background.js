const KEY = (tabId) => `tab:${tabId}`;

async function getTabState(tabId) {
  const obj = await chrome.storage.session.get(KEY(tabId));
  return obj[KEY(tabId)] || null; // { seconds } or null
}

async function setTabState(tabId, seconds) {
  await chrome.storage.session.set({ [KEY(tabId)]: { seconds } });
  try { await chrome.action.setBadgeText({ tabId, text: "ON" }); } catch {}
}

async function clearTabState(tabId) {
  await chrome.storage.session.remove(KEY(tabId));
  try { await chrome.action.setBadgeText({ tabId, text: "" }); } catch {}
}

async function ensureInjected(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content.js"]
    });
  } catch (e) {
    // Can't inject on certain pages (chrome://, Web Store, PDF viewer), ignore.
  }
}

// Cleanup when a tab closes
chrome.tabs.onRemoved.addListener((tabId) => {
  clearTabState(tabId);
});

// Message router for popup and content script
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    if (msg.type === "getState") {
      const state = await getTabState(msg.tabId);
      sendResponse({ state });
    } else if (msg.type === "enable") {
      await setTabState(msg.tabId, msg.seconds);
      await ensureInjected(msg.tabId); // make sure content.js is present NOW
      try {
        await chrome.tabs.sendMessage(msg.tabId, {
          type: "config",
          enabled: true,
          seconds: msg.seconds
        });
      } catch { /* content script not available on restricted pages */ }
      sendResponse({ ok: true });
    } else if (msg.type === "disable") {
      await clearTabState(msg.tabId);
      try {
        await chrome.tabs.sendMessage(msg.tabId, { type: "config", enabled: false });
      } catch {}
      sendResponse({ ok: true });
    } else if (msg.type === "getCurrentTabState") {
      const tabId = sender?.tab?.id;
      const state = tabId != null ? await getTabState(tabId) : null;
      sendResponse({ state, tabId });
    } else if (msg.type === "hoverPause") {
      const tabId = sender?.tab?.id;
      if (tabId != null) {
        const state = await getTabState(tabId);
        if (!state) return; // disabled; don't show any badge
        try {
          await chrome.action.setBadgeText({ tabId, text: msg.paused ? "PAU" : "ON" });
        } catch {}
      }
    }
  })();
  return true; // keep channel open for async sendResponse
});

// After navigation/reload, ensure the badge reflects enabled state
chrome.tabs.onUpdated.addListener(async (tabId, info, tab) => {
  if (info.status === "complete") {
    const state = await getTabState(tabId);
    try {
      await chrome.action.setBadgeText({ tabId, text: state ? "ON" : "" });
    } catch {}
  }
});
