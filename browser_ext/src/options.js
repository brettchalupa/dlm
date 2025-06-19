// Default API URL
const DEFAULT_API_URL = "http://localhost:8001";

// DOM elements
const form = document.getElementById("options-form");
const apiUrlInput = document.getElementById("api-url");
const saveBtn = document.getElementById("save-btn");
const resetBtn = document.getElementById("reset-btn");
const status = document.getElementById("status");

// Load saved settings when page loads
document.addEventListener("DOMContentLoaded", loadSettings);

// Form submission handler
form.addEventListener("submit", saveSettings);

// Reset button handler
resetBtn.addEventListener("click", resetToDefault);

// Load settings from storage
async function loadSettings() {
  try {
    const result = await browser.storage.sync.get(["apiUrl"]);
    const savedUrl = result.apiUrl || DEFAULT_API_URL;
    apiUrlInput.value = savedUrl;
  } catch (error) {
    console.error("Error loading settings:", error);
    showStatus("Error loading settings", "error");
  }
}

// Save settings to storage
async function saveSettings(event) {
  event.preventDefault();

  const apiUrl = apiUrlInput.value.trim();

  // Basic URL validation
  if (!isValidUrl(apiUrl)) {
    showStatus("Please enter a valid URL", "error");
    return;
  }

  // Disable save button during save
  saveBtn.disabled = true;
  saveBtn.textContent = "Saving...";

  try {
    await browser.storage.sync.set({ apiUrl: apiUrl });
    showStatus("Settings saved successfully!", "success");
  } catch (error) {
    console.error("Error saving settings:", error);
    showStatus("Error saving settings", "error");
  } finally {
    // Re-enable save button
    saveBtn.disabled = false;
    saveBtn.textContent = "Save Settings";
  }
}

// Reset to default URL
async function resetToDefault() {
  apiUrlInput.value = DEFAULT_API_URL;

  try {
    await browser.storage.sync.set({ apiUrl: DEFAULT_API_URL });
    showStatus("Settings reset to default", "success");
  } catch (error) {
    console.error("Error resetting settings:", error);
    showStatus("Error resetting settings", "error");
  }
}

// Show status message
function showStatus(message, type) {
  status.textContent = message;
  status.className = `status ${type}`;
  status.style.display = "block";

  // Hide status after 3 seconds
  setTimeout(() => {
    status.style.display = "none";
  }, 3000);
}

// Basic URL validation
function isValidUrl(string) {
  try {
    const url = new URL(string);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (_) {
    return false;
  }
}
