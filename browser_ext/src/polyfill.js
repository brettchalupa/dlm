// Browser API Polyfill for cross-browser compatibility
// This allows the same code to work in both Chrome and Firefox

(function () {
  "use strict";

  if (typeof browser === "undefined" && typeof chrome !== "undefined") {
    // Chrome doesn't have browser API, so we create it from chrome API
    globalThis.browser = {
      runtime: {
        onInstalled: chrome.runtime.onInstalled,
        openOptionsPage: chrome.runtime.openOptionsPage,
        onMessage: chrome.runtime.onMessage,
        sendMessage: function (tabId, message) {
          return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage(message, (response) => {
              if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
              } else {
                resolve(response);
              }
            });
          });
        },
      },
      browserAction: {
        onClicked: chrome.browserAction.onClicked,
        setBadgeText: chrome.browserAction.setBadgeText,
      },
      contextMenus: {
        create: chrome.contextMenus.create,
        onClicked: chrome.contextMenus.onClicked,
      },
      tabs: {
        sendMessage: function (tabId, message) {
          return new Promise((resolve, reject) => {
            chrome.tabs.sendMessage(tabId, message, (response) => {
              if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
              } else {
                resolve(response);
              }
            });
          });
        },
        executeScript: function (tabId, details) {
          return new Promise((resolve, reject) => {
            chrome.tabs.executeScript(tabId, details, (result) => {
              if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
              } else {
                resolve(result);
              }
            });
          });
        },
      },
      storage: {
        sync: {
          get: function (keys) {
            return new Promise((resolve, reject) => {
              chrome.storage.sync.get(keys, (result) => {
                if (chrome.runtime.lastError) {
                  reject(chrome.runtime.lastError);
                } else {
                  resolve(result);
                }
              });
            });
          },
          set: function (items) {
            return new Promise((resolve, reject) => {
              chrome.storage.sync.set(items, () => {
                if (chrome.runtime.lastError) {
                  reject(chrome.runtime.lastError);
                } else {
                  resolve();
                }
              });
            });
          },
        },
      },
    };
  }
  // Firefox has native browser API, so we don't need to create chrome API
  // Let Firefox use its native browser.* APIs directly
})();
