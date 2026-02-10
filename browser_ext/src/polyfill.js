// Browser API Polyfill for cross-browser compatibility
// This allows the same code to work in both Chrome and Firefox

(function () {
  "use strict";

  console.log("DLM Polyfill loading...", {
    hasBrowser: typeof browser !== "undefined",
    hasChrome: typeof chrome !== "undefined",
    chromeKeys: typeof chrome !== "undefined" ? Object.keys(chrome) : [],
  });

  if (typeof browser === "undefined" && typeof chrome !== "undefined") {
    console.log("Creating browser API from chrome API");

    // Chrome doesn't have browser API, so we create it from chrome API
    globalThis.browser = {
      runtime: {
        onInstalled: chrome.runtime && chrome.runtime.onInstalled,
        openOptionsPage: chrome.runtime && chrome.runtime.openOptionsPage,
        onMessage: chrome.runtime && chrome.runtime.onMessage,
        sendMessage: function (message) {
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
        getURL: chrome.runtime && chrome.runtime.getURL,
      },
      browserAction: {
        onClicked: chrome.browserAction && chrome.browserAction.onClicked,
        setBadgeText: chrome.browserAction && chrome.browserAction.setBadgeText,
        setPopup: chrome.browserAction && chrome.browserAction.setPopup,
      },
      contextMenus: {
        create: chrome.contextMenus && chrome.contextMenus.create,
        onClicked: chrome.contextMenus && chrome.contextMenus.onClicked,
      },
      commands: {
        onCommand: chrome.commands && chrome.commands.onCommand,
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
        query: function (queryInfo) {
          return new Promise((resolve, reject) => {
            chrome.tabs.query(queryInfo, (tabs) => {
              if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
              } else {
                resolve(tabs);
              }
            });
          });
        },
        create: function (createProperties) {
          return new Promise((resolve, reject) => {
            chrome.tabs.create(createProperties, (tab) => {
              if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
              } else {
                resolve(tab);
              }
            });
          });
        },
        getCurrent: function () {
          return new Promise((resolve, reject) => {
            chrome.tabs.getCurrent((tab) => {
              if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
              } else {
                resolve(tab);
              }
            });
          });
        },
        remove: function (tabIds) {
          return new Promise((resolve, reject) => {
            chrome.tabs.remove(tabIds, () => {
              if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
              } else {
                resolve();
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
      windows: {
        create: function (createProperties) {
          return new Promise((resolve, reject) => {
            chrome.windows.create(createProperties, (window) => {
              if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
              } else {
                resolve(window);
              }
            });
          });
        },
        getCurrent: function (getInfo) {
          return new Promise((resolve, reject) => {
            if (typeof getInfo === "function") {
              chrome.windows.getCurrent(getInfo);
            } else {
              chrome.windows.getCurrent(getInfo || {}, (window) => {
                if (chrome.runtime.lastError) {
                  reject(chrome.runtime.lastError);
                } else {
                  resolve(window);
                }
              });
            }
          });
        },
        getAll: function (getInfo) {
          return new Promise((resolve, reject) => {
            chrome.windows.getAll(getInfo || {}, (windows) => {
              if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
              } else {
                resolve(windows);
              }
            });
          });
        },
        update: function (windowId, updateInfo) {
          return new Promise((resolve, reject) => {
            chrome.windows.update(windowId, updateInfo, (window) => {
              if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
              } else {
                resolve(window);
              }
            });
          });
        },
        remove: function (windowId) {
          return new Promise((resolve, reject) => {
            chrome.windows.remove(windowId, () => {
              if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
              } else {
                resolve();
              }
            });
          });
        },
      },
    };
  }
  // Firefox has native browser API, so we don't need to create chrome API
  // Let Firefox use its native browser.* APIs directly
})();
