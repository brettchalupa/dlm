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

    toast.innerHTML = `
      <span style="font-weight: bold; font-size: 16px;">${icon}</span>
      <span>${message}</span>
    `;

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

  // Listen for messages from background script
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("DLM content script received message:", message);
    if (message.type === "dlm-toast") {
      console.log("Showing toast:", message.message, message.toastType);
      showToast(message.message, message.toastType, message.duration);
      sendResponse({ success: true });
    }
  });

  // Log that content script is loaded
  console.log("DLM content script loaded and ready");

  // Clean up on page unload
  window.addEventListener("beforeunload", () => {
    if (toastContainer && toastContainer.parentNode) {
      toastContainer.parentNode.removeChild(toastContainer);
    }
  });
})();
