use std::path::PathBuf;

use serde::{Deserialize, Serialize};

use crate::CONFIG_DIR;

const DEFAULT_API_URL: &str = "http://localhost:8001";

/// Application settings
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct AppSettings {
    /// URL of the DLM API server
    pub api_url: String,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            api_url: DEFAULT_API_URL.to_string(),
        }
    }
}

/// Get the config directory path
pub fn get_config_dir() -> PathBuf {
    let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
    PathBuf::from(home).join(CONFIG_DIR)
}

/// Load settings from config file
pub fn load_settings() -> AppSettings {
    let path = get_config_dir().join("settings.json");
    if let Ok(contents) = std::fs::read_to_string(&path)
        && let Ok(settings) = serde_json::from_str::<AppSettings>(&contents)
    {
        return settings;
    }
    AppSettings::default()
}

/// Save settings to config file
pub fn save_settings(settings: &AppSettings) {
    let config_dir = get_config_dir();
    if std::fs::create_dir_all(&config_dir).is_err() {
        return;
    }
    let path = config_dir.join("settings.json");
    if let Ok(json) = serde_json::to_string_pretty(settings) {
        let _ = std::fs::write(&path, json);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_config_dir() {
        let dir = get_config_dir();
        assert!(dir.to_string_lossy().ends_with(CONFIG_DIR));
    }

    #[test]
    fn test_settings_default() {
        let settings = AppSettings::default();
        assert_eq!(settings.api_url, DEFAULT_API_URL);
    }

    #[test]
    fn test_settings_serialization_roundtrip() {
        let settings = AppSettings {
            api_url: "http://example.com:9000".into(),
        };

        let json = serde_json::to_string(&settings).unwrap();
        let parsed: AppSettings = serde_json::from_str(&json).unwrap();

        assert_eq!(settings, parsed);
    }

    #[test]
    fn test_settings_json_format() {
        let settings = AppSettings {
            api_url: "http://localhost:8001".into(),
        };

        let json = serde_json::to_string_pretty(&settings).unwrap();
        assert!(json.contains("api_url"));
        assert!(json.contains("http://localhost:8001"));
    }
}
