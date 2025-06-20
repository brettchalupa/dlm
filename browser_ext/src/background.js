// Firefox-compatible background script using Manifest v2 APIs

// Helper function to send toast messages with retry logic and content script injection
async function sendToastMessage(
  tabId,
  message,
  toastType,
  duration,
  retries = 3,
) {
  for (let i = 0; i < retries; i++) {
    try {
      await browser.tabs.sendMessage(tabId, {
        type: "dlm-toast",
        message: message,
        toastType: toastType,
        duration: duration,
      });
      return; // Success, exit early
    } catch (error) {
      console.log(`Toast message attempt ${i + 1} failed:`, error);

      // If first attempt fails, try injecting content script (Chrome fallback)
      if (i === 0) {
        try {
          await browser.tabs.executeScript(tabId, {
            file: "content.js",
          });
          console.log("Content script injected manually");
          // Give it a moment to initialize
          await new Promise((resolve) => setTimeout(resolve, 200));
          continue; // Try sending message again
        } catch (injectError) {
          console.log("Content script injection failed:", injectError);
        }
      }

      if (i < retries - 1) {
        // Wait a bit before retrying (exponential backoff)
        await new Promise((resolve) =>
          setTimeout(resolve, 100 * Math.pow(2, i))
        );
      }
    }
  }
  console.log("All toast message attempts failed");
}

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
    const response = await fetch(apiUrl, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ urls: [url] }),
    });

    console.log("URL sent to DLM successfully:", url);

    // Show success toast with retry logic
    await sendToastMessage(
      tabId,
      "URL added to DLM successfully!",
      "success",
      3000,
    );
  } catch (error) {
    console.error("Failed to send URL to DLM:", error);

    // Show error toast with retry logic
    await sendToastMessage(
      tabId,
      "Failed to add URL to DLM. Check your connection and API settings.",
      "error",
      5000,
    );
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
