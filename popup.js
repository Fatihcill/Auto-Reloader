async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0];
}

function setStatus(text) {
  document.getElementById("status").textContent = text;
}

async function refreshUI() {
  const tab = await getActiveTab();
  if (!tab) return setStatus("No active tab.");
  chrome.runtime.sendMessage({ type: "getState", tabId: tab.id }, (res) => {
    const input = document.getElementById("seconds");
    if (res && res.state) {
      input.value = res.state.seconds;
      setStatus(`Enabled for this tab (${res.state.seconds}s).`);
    } else {
      setStatus("Disabled for this tab.");
    }
  });
}

document.getElementById("enableBtn").addEventListener("click", async () => {
  const tab = await getActiveTab();
  const secs = parseInt(document.getElementById("seconds").value, 10);
  if (!Number.isFinite(secs) || secs <= 0) {
    alert("Please enter a positive number of seconds.");
    return;
  }
  chrome.runtime.sendMessage({ type: "enable", tabId: tab.id, seconds: secs }, () => {
    chrome.action.setBadgeText({ tabId: tab.id, text: "ON" });
    refreshUI();
  });
});

document.getElementById("disableBtn").addEventListener("click", async () => {
  const tab = await getActiveTab();
  chrome.runtime.sendMessage({ type: "disable", tabId: tab.id }, () => {
    chrome.action.setBadgeText({ tabId: tab.id, text: "" });
    refreshUI();
  });
});

refreshUI();

