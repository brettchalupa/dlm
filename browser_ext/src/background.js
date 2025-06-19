// Firefox-compatible background script using Manifest v2 APIs

// Shared function to send URLs to DLM
async function sendUrlToDLM(url, tabId) {
  // Get the API URL from storage, fallback to default if not set
  const result = await browser.storage.sync.get(["apiUrl"]);
  const apiUrl = `${result.apiUrl || "http://localhost:8001"}/api/add-urls`;

  await browser.browserAction.setBadgeText({
    tabId: tabId,
    text: "...",
  });

  try {
    await fetch(apiUrl, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ urls: [url] }),
    });
    console.log("URL sent to DLM successfully:", url);
  } catch (error) {
    console.error("Failed to send URL to DLM:", error);
  }

  await browser.browserAction.setBadgeText({
    tabId: tabId,
    text: "",
  });
}

browser.runtime.onInstalled.addListener(() => {
  browser.browserAction.setBadgeText({
    text: "",
  });

  // Create context menu item for options
  browser.contextMenus.create({
    id: "dlm-options",
    title: "DLM Settings",
    contexts: ["browser_action"],
  });

  // Create context menu item for sending URLs to DLM
  browser.contextMenus.create({
    id: "dlm-send-url",
    title: "Send to DLM",
    contexts: ["link"],
  });
});

browser.browserAction.onClicked.addListener(async (tab) => {
  await sendUrlToDLM(tab.url, tab.id);
});

// Handle context menu clicks
browser.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "dlm-options") {
    browser.runtime.openOptionsPage();
  } else if (info.menuItemId === "dlm-send-url") {
    await sendUrlToDLM(info.linkUrl, tab.id);
  }
});
