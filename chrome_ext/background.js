chrome.runtime.onInstalled.addListener(() => {
  chrome.action.setBadgeText({
    text: "",
  });
});

chrome.action.onClicked.addListener(async (tab) => {
  const currentUrl = tab.url;
  const url = "http://bretts-macbook-pro:8001/api/add-urls"; // TODO: make this configurable

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
