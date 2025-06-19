chrome.runtime.onInstalled.addListener(() => {
  chrome.action.setBadgeText({
    text: "",
  });

  // Create context menu item for options
  chrome.contextMenus.create({
    id: "dlm-options",
    title: "DLM Settings",
    contexts: ["action"],
  });
});

chrome.action.onClicked.addListener(async (tab) => {
  const currentUrl = tab.url;

  // Get the API URL from storage, fallback to default if not set
  const result = await chrome.storage.sync.get(["apiUrl"]);
  console.log(result);
  const url = `${result.apiUrl || "http://localhost:8001"}/api/add-urls`;

  await chrome.action.setBadgeText({
    tabId: tab.id,
    text: "...",
  });
  await fetch(url, {
    method: "POST",
    mode: "no-cors",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ urls: [currentUrl] }),
  })
    .then((response) => {
      console.log("Request successful", response);
    })
    .catch((error) => {
      console.error("Request failed", error);
    });
  await chrome.action.setBadgeText({
    tabId: tab.id,
    text: "",
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, _tab) => {
  if (info.menuItemId === "dlm-options") {
    chrome.runtime.openOptionsPage();
  }
});
