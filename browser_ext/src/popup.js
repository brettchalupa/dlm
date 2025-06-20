// Popup script for DLM extension query selector functionality

(function () {
  "use strict";

  // Ensure browser API compatibility for Chrome
  if (typeof browser === "undefined" && typeof chrome !== "undefined") {
    globalThis.browser = {
      runtime: {
        onMessage: chrome.runtime.onMessage,
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
      },
      tabs: {
        query: function (queryInfo) {
          return new Promise((resolve) => {
            chrome.tabs.query(queryInfo, resolve);
          });
        },
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
      },
      storage: {
        sync: {
          get: function (keys) {
            return new Promise((resolve) => {
              chrome.storage.sync.get(keys, resolve);
            });
          },
        },
      },
      windows: {
        getCurrent: function (getInfo) {
          return new Promise((resolve, reject) => {
            chrome.windows.getCurrent(getInfo || {}, (window) => {
              if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
              } else {
                resolve(window);
              }
            });
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

  // DOM elements
  const querySelectorInput = document.getElementById("querySelector");
  const previewBtn = document.getElementById("previewBtn");
  const addUrlsBtn = document.getElementById("addUrlsBtn");
  const addCurrentBtn = document.getElementById("addCurrentBtn");
  const statusDiv = document.getElementById("status");
  const quickBtns = document.querySelectorAll(".quick-btn");

  let currentTab = null;
  let foundUrls = [];

  // Initialize popup
  async function init() {
    try {
      // Get current active tab - handle popup window, tab, and regular contexts
      let tabs;
      try {
        // First check if we're in a popup window
        const currentWindow = await browser.windows.getCurrent();
        if (currentWindow && currentWindow.type === "popup") {
          // We're in a popup window, get the active tab from the main window
          const allWindows = await browser.windows.getAll({ populate: true });
          const mainWindow = allWindows.find((w) =>
            w.type === "normal" && w.focused
          );
          if (mainWindow && mainWindow.tabs) {
            tabs = mainWindow.tabs.filter((tab) => tab.active);
          } else {
            // Fallback: get any active tab
            tabs = await browser.tabs.query({ active: true });
          }
        } else {
          // Regular tab context
          tabs = await browser.tabs.query({
            active: true,
            currentWindow: true,
          });
        }
      } catch {
        // Final fallback: get any active tab and filter out popup
        tabs = await browser.tabs.query({ active: true });
        tabs = tabs.filter((tab) => !tab.url.includes("popup.html"));
      }

      currentTab = tabs[0];

      if (!currentTab) {
        showStatus("No active tab found", "error");
        return;
      }

      // Set up event listeners
      setupEventListeners();

      // Focus on input
      querySelectorInput.focus();

      // Show current tab info
      showStatus(`Ready to search links on: ${currentTab.title}`, "info");
    } catch (error) {
      showStatus("Failed to initialize popup", "error");
      console.error("Popup initialization error:", error);
    }
  }

  // Set up event listeners
  function setupEventListeners() {
    // Quick selector buttons
    quickBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const selector = btn.dataset.selector;
        querySelectorInput.value = selector;
        querySelectorInput.focus();
      });
    });

    // Preview button
    previewBtn.addEventListener("click", handlePreview);

    // Add URLs button
    addUrlsBtn.addEventListener("click", handleAddUrls);

    // Add current page button
    addCurrentBtn.addEventListener("click", handleAddCurrentPage);

    // Enter key handling
    querySelectorInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        if (e.shiftKey) {
          handleAddUrls();
        } else {
          handlePreview();
        }
      }
    });

    // Input validation
    querySelectorInput.addEventListener("input", () => {
      const hasValue = querySelectorInput.value.trim().length > 0;
      previewBtn.disabled = !hasValue;
      addUrlsBtn.disabled = !hasValue;
    });
  }

  // Handle preview functionality
  async function handlePreview() {
    const selector = querySelectorInput.value.trim();
    if (!selector) {
      showStatus("Please enter a query selector", "error");
      return;
    }

    showStatus("Finding matching links...", "info");
    previewBtn.disabled = true;

    try {
      // Send message to content script to find matching anchors
      const response = await browser.tabs.sendMessage(currentTab.id, {
        type: "dlm-find-anchors",
        selector: selector,
        preview: true,
      });

      if (response && response.success) {
        foundUrls = response.urls || [];
        const count = foundUrls.length;

        if (count === 0) {
          showStatus("No matching links found", "error");
        } else {
          showStatus(
            `Found ${count} matching link${count === 1 ? "" : "s"}`,
            "success",
          );

          // Enable add URLs button since we have results
          addUrlsBtn.disabled = false;
        }
      } else {
        showStatus(
          "Failed to find links. Make sure the page is loaded.",
          "error",
        );
      }
    } catch (error) {
      console.error("Preview error:", error);
      showStatus("Error finding links. Try refreshing the page.", "error");
    } finally {
      previewBtn.disabled = false;
    }
  }

  // Handle add URLs functionality
  async function handleAddUrls() {
    const selector = querySelectorInput.value.trim();
    if (!selector) {
      showStatus("Please enter a query selector", "error");
      return;
    }

    showStatus("Collecting and adding URLs...", "info");
    addUrlsBtn.disabled = true;
    previewBtn.disabled = true;

    try {
      // If we don't have URLs from preview, get them now
      if (foundUrls.length === 0) {
        const response = await browser.tabs.sendMessage(currentTab.id, {
          type: "dlm-find-anchors",
          selector: selector,
          preview: false,
        });

        if (response && response.success) {
          foundUrls = response.urls || [];
        } else {
          throw new Error("Failed to find URLs");
        }
      }

      if (foundUrls.length === 0) {
        showStatus("No URLs found to add", "error");
        return;
      }

      // Get API URL from storage
      const result = await browser.storage.sync.get(["apiUrl"]);
      const apiUrl = `${result.apiUrl || "http://localhost:8001"}/api/add-urls`;

      // Send URLs to DLM API
      const _response = await fetch(apiUrl, {
        method: "POST",
        mode: "no-cors",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ urls: foundUrls }),
      });

      const count = foundUrls.length;
      showStatus(
        `Successfully added ${count} URL${count === 1 ? "" : "s"} to DLM!`,
        "success",
      );

      // Also send a toast notification to the page
      try {
        await browser.tabs.sendMessage(currentTab.id, {
          type: "dlm-toast",
          message: `Added ${count} URL${count === 1 ? "" : "s"} to DLM!`,
          toastType: "success",
          duration: 3000,
        });
      } catch (toastError) {
        console.log("Toast notification failed:", toastError);
      }

      // Clear the found URLs
      foundUrls = [];

      // Close popup after a short delay
      setTimeout(() => {
        closePopup();
      }, 1500);
    } catch (error) {
      console.error("Add URLs error:", error);
      showStatus(
        "Failed to add URLs. Check your connection and API settings.",
        "error",
      );
    } finally {
      addUrlsBtn.disabled = false;
      previewBtn.disabled = false;
    }
  }

  // Handle add current page functionality
  async function handleAddCurrentPage() {
    if (!currentTab) {
      showStatus("No active tab found", "error");
      return;
    }

    showStatus("Adding current page to DLM...", "info");
    addCurrentBtn.disabled = true;

    try {
      // Get API URL from storage
      const result = await browser.storage.sync.get(["apiUrl"]);
      const apiUrl = `${result.apiUrl || "http://localhost:8001"}/api/add-urls`;

      // Send current page URL to DLM API
      const _response = await fetch(apiUrl, {
        method: "POST",
        mode: "no-cors",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ urls: [currentTab.url] }),
      });

      showStatus("Successfully added current page to DLM!", "success");

      // Also send a toast notification to the page
      try {
        await browser.tabs.sendMessage(currentTab.id, {
          type: "dlm-toast",
          message: "Current page added to DLM!",
          toastType: "success",
          duration: 3000,
        });
      } catch (toastError) {
        console.log("Toast notification failed:", toastError);
      }

      // Close popup after a short delay
      setTimeout(() => {
        closePopup();
      }, 1500);
    } catch (error) {
      console.error("Add current page error:", error);
      showStatus(
        "Failed to add current page. Check your connection and API settings.",
        "error",
      );
    } finally {
      addCurrentBtn.disabled = false;
    }
  }

  // Show status message
  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    statusDiv.style.display = "block";

    // Auto-hide info messages after a delay
    if (type === "info") {
      setTimeout(() => {
        if (statusDiv.textContent === message) {
          statusDiv.style.display = "none";
        }
      }, 3000);
    }
  }

  // Function to close popup - handles both popup window and tab contexts
  function closePopup() {
    try {
      // First, try to close as a popup window
      browser.windows.getCurrent().then((currentWindow) => {
        if (currentWindow && currentWindow.type === "popup") {
          // This is a popup window, close it
          browser.windows.remove(currentWindow.id);
        } else {
          // This might be a tab, try to get current tab and close it
          browser.tabs.getCurrent().then((tab) => {
            if (tab) {
              browser.tabs.remove(tab.id);
            } else {
              // Fallback: try globalThis.close()
              globalThis.close();
            }
          }).catch(() => {
            globalThis.close();
          });
        }
      }).catch(() => {
        // Fallback: try to close as regular window/tab
        globalThis.close();
      });
    } catch (error) {
      console.error("Error closing popup:", error);
      // Final fallback
      try {
        globalThis.close();
      } catch {
        // Nothing more we can do
      }
    }
  }

  // Initialize when DOM is loaded
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
