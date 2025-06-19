// Firefox-compatible background script using Manifest v2 APIs

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
});

browser.browserAction.onClicked.addListener(async (tab) => {
  const currentUrl = tab.url;

  // Get the API URL from storage, fallback to default if not set
  const result = await browser.storage.sync.get(["apiUrl"]);
  console.log(result);
  const url = `${result.apiUrl || "http://localhost:8001"}/api/add-urls`;

  await browser.browserAction.setBadgeText({
    tabId: tab.id,
    text: "...",
  });

  try {
    await fetch(url, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ urls: [currentUrl] }),
    });
    console.log("Request successful");
  } catch (error) {
    console.error("Request failed", error);
  }

  await browser.browserAction.setBadgeText({
    tabId: tab.id,
    text: "",
  });
});

// Handle context menu clicks
browser.contextMenus.onClicked.addListener((info, _tab) => {
  if (info.menuItemId === "dlm-options") {
    browser.runtime.openOptionsPage();
  }
});
