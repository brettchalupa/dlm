// Content script for DLM extension toast notifications

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
    };
  }

  // Toast container and styles
  let toastContainer = null;
  let toastId = 0;

  // Initialize toast system
  function initToastSystem() {
    if (toastContainer) return;

    // Create toast container
    toastContainer = document.createElement("div");
    toastContainer.id = "dlm-toast-container";
    toastContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 2147483647;
      pointer-events: none;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    `;
    document.body.appendChild(toastContainer);
  }

  // Create and show toast notification
  function showToast(message, type = "success", duration = 3000) {
    initToastSystem();

    const currentToastId = ++toastId;
    const toast = document.createElement("div");
    toast.id = `dlm-toast-${currentToastId}`;

    // Toast styling based on type
    const isSuccess = type === "success";
    const backgroundColor = isSuccess ? "#10b981" : "#ef4444";
    const icon = isSuccess ? "✓" : "✕";

    toast.style.cssText = `
      background: ${backgroundColor};
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      font-size: 14px;
      line-height: 1.4;
      max-width: 320px;
      word-wrap: break-word;
      opacity: 0;
      transform: translateX(100%);
      transition: all 0.3s ease-out;
      pointer-events: auto;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
    `;

    const iconSpan = document.createElement("span");
    iconSpan.style.cssText = "font-weight: bold; font-size: 16px;";
    iconSpan.textContent = icon;
    const msgSpan = document.createElement("span");
    msgSpan.textContent = message;
    toast.appendChild(iconSpan);
    toast.appendChild(msgSpan);

    // Add click to dismiss
    toast.addEventListener("click", () => {
      hideToast(toast);
    });

    toastContainer.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
      toast.style.opacity = "1";
      toast.style.transform = "translateX(0)";
    });

    // Auto hide after duration
    if (duration > 0) {
      setTimeout(() => {
        hideToast(toast);
      }, duration);
    }

    return toast;
  }

  // Hide toast with animation
  function hideToast(toast) {
    if (!toast || !toast.parentNode) return;

    toast.style.opacity = "0";
    toast.style.transform = "translateX(100%)";

    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }

  // Function to find anchors using query selector
  function findAnchors(selector) {
    const results = {
      success: false,
      urls: [],
      count: 0,
      error: null,
    };

    try {
      // Find all matching elements
      const elements = document.querySelectorAll(selector);
      const urls = [];

      elements.forEach((element) => {
        // Check if element is an anchor or contains anchors
        if (element.tagName === "A" && element.href) {
          urls.push(element.href);
        } else {
          // Look for anchor elements within the selected element
          const anchors = element.querySelectorAll("a[href]");
          anchors.forEach((anchor) => {
            urls.push(anchor.href);
          });
        }
      });

      // Remove duplicates and filter out invalid URLs
      const uniqueUrls = [...new Set(urls)].filter((url) => {
        try {
          new URL(url);
          return true;
        } catch {
          return false;
        }
      });

      results.success = true;
      results.urls = uniqueUrls;
      results.count = uniqueUrls.length;

      console.log(
        `Found ${uniqueUrls.length} URLs with selector "${selector}"`,
      );
    } catch (error) {
      console.error("Error finding anchors:", error);
      results.error = error.message;
    }

    return results;
  }

  // Listen for messages from background script and popup
  browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    console.log("DLM content script received message:", message);

    if (message.type === "dlm-toast") {
      console.log("Showing toast:", message.message, message.toastType);
      showToast(message.message, message.toastType, message.duration);
      sendResponse({ success: true });
    } else if (message.type === "dlm-find-anchors") {
      console.log("Finding anchors with selector:", message.selector);
      const results = findAnchors(message.selector);

      // If preview mode, also highlight the found elements temporarily
      if (message.preview && results.success) {
        highlightElements(message.selector);
      }

      sendResponse(results);
    }
  });

  // Function to temporarily highlight matching elements
  function highlightElements(selector) {
    try {
      // Remove any existing highlights
      document.querySelectorAll(".dlm-highlight").forEach((el) => {
        el.classList.remove("dlm-highlight");
      });

      // Add highlight style if not already present
      if (!document.getElementById("dlm-highlight-style")) {
        const style = document.createElement("style");
        style.id = "dlm-highlight-style";
        style.textContent = `
          .dlm-highlight {
            outline: 2px solid #3b82f6 !important;
            outline-offset: 2px !important;
            background-color: rgba(59, 130, 246, 0.1) !important;
            transition: all 0.3s ease !important;
          }
        `;
        document.head.appendChild(style);
      }

      // Highlight matching elements
      const elements = document.querySelectorAll(selector);
      elements.forEach((element) => {
        element.classList.add("dlm-highlight");
      });

      // Remove highlights after a few seconds
      setTimeout(() => {
        document.querySelectorAll(".dlm-highlight").forEach((el) => {
          el.classList.remove("dlm-highlight");
        });
      }, 3000);
    } catch (error) {
      console.error("Error highlighting elements:", error);
    }
  }

  // Log that content script is loaded
  console.log("DLM content script loaded and ready");

  // Clean up on page unload
  globalThis.addEventListener("beforeunload", () => {
    if (toastContainer && toastContainer.parentNode) {
      toastContainer.parentNode.removeChild(toastContainer);
    }
  });
})();
