use serde::Deserialize;
use std::collections::BTreeMap;

/// A download entry from the DLM server
#[derive(Debug, Default, Clone, Deserialize, PartialEq, Eq)]
pub struct Download {
    pub id: i64,
    pub collection: String,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "downloadedAt")]
    pub downloaded_at: Option<String>,
    pub priority: String,
    pub status: String,
    pub title: Option<String>,
    pub url: String,
    #[serde(rename = "errorMessage")]
    pub error_message: Option<String>,
}

impl Download {
    /// Display title, falling back to "Untitled"
    pub fn display_title(&self) -> &str {
        self.title.as_deref().unwrap_or("Untitled")
    }
}

/// Status count from /api/count
#[derive(Debug, Clone, Deserialize, PartialEq, Eq)]
pub struct StatusCount {
    pub status: String,
    pub count: i64,
}

/// System info from /api/system
#[derive(Debug, Clone, Deserialize)]
pub struct SystemInfo {
    pub memory: MemoryInfo,
    pub uptime: String,
}

impl SystemInfo {
    /// Format uptime from raw seconds string (e.g. "3182s") to human-readable
    pub fn formatted_uptime(&self) -> String {
        let secs: u64 = self.uptime.trim_end_matches('s').parse().unwrap_or(0);
        let hours = secs / 3600;
        let mins = (secs % 3600) / 60;
        if hours > 0 {
            format!("{}h {}m", hours, mins)
        } else {
            format!("{}m", mins)
        }
    }
}

/// Memory usage info
#[derive(Debug, Clone, Deserialize)]
#[allow(dead_code)]
pub struct MemoryInfo {
    pub rss: String,
    #[serde(rename = "heapUsed")]
    pub heap_used: String,
    #[serde(rename = "heapTotal")]
    pub heap_total: String,
}

/// A collection config entry
#[derive(Debug, Clone, Deserialize)]
pub struct CollectionConfig {
    pub dir: String,
    pub command: String,
    pub domains: Vec<String>,
}

/// Response from /api/config
#[derive(Debug, Clone, Deserialize)]
pub struct ConfigResponse {
    pub collections: BTreeMap<String, CollectionConfig>,
}

/// Response from /api/count
#[derive(Debug, Clone, Deserialize)]
pub struct CountResponse {
    #[serde(rename = "statusGroups")]
    pub status_groups: Vec<StatusCount>,
}

/// Response from /api/downloads (paginated)
#[derive(Debug, Clone, Default, Deserialize)]
pub struct PaginatedDownloadsResponse {
    pub downloads: Vec<Download>,
    pub total: i64,
}

/// Response from /api/upcoming
#[derive(Debug, Clone, Default, Deserialize)]
pub struct UpcomingResponse {
    pub downloads: Vec<Download>,
    #[serde(rename = "totalPending")]
    pub total_pending: i64,
}

/// Response from /api/logs
#[derive(Debug, Clone, Deserialize)]
pub struct LogsResponse {
    pub logs: Vec<String>,
}

/// Response from mutation endpoints
#[derive(Debug, Clone, Deserialize)]
pub struct MessageResponse {
    pub message: String,
}

/// All data fetched from the server in one refresh cycle
#[derive(Debug, Clone, Default)]
pub struct RefreshData {
    pub counts: Vec<StatusCount>,
    pub downloads: Vec<Download>,
    pub downloads_total: i64,
    pub error_downloads: Vec<Download>,
    pub upcoming_downloads: Vec<Download>,
    pub total_pending: i64,
    pub system: Option<SystemInfo>,
    pub logs: Vec<String>,
    pub config: Option<ConfigResponse>,
}

/// Download status filter for the downloads list
#[derive(Debug, Default, Clone, Copy, PartialEq, Eq)]
pub enum StatusFilter {
    #[default]
    All,
    Pending,
    Downloading,
    Success,
    Error,
}

impl StatusFilter {
    pub fn label(&self) -> &'static str {
        match self {
            StatusFilter::All => "All",
            StatusFilter::Pending => "Pending",
            StatusFilter::Downloading => "Downloading",
            StatusFilter::Success => "Success",
            StatusFilter::Error => "Errors",
        }
    }

    pub fn api_param(&self) -> &'static str {
        match self {
            StatusFilter::All => "all",
            StatusFilter::Pending => "pending",
            StatusFilter::Downloading => "downloading",
            StatusFilter::Success => "success",
            StatusFilter::Error => "error",
        }
    }

    pub const ALL_FILTERS: &[StatusFilter] = &[
        StatusFilter::All,
        StatusFilter::Pending,
        StatusFilter::Downloading,
        StatusFilter::Success,
        StatusFilter::Error,
    ];
}

/// Sort order for downloads list
#[derive(Debug, Default, Clone, Copy, PartialEq, Eq)]
pub enum SortOrder {
    #[default]
    Priority,
    NewestFirst,
    OldestFirst,
    Collection,
}

impl SortOrder {
    pub fn label(&self) -> &'static str {
        match self {
            SortOrder::Priority => "Priority",
            SortOrder::NewestFirst => "Newest First",
            SortOrder::OldestFirst => "Oldest First",
            SortOrder::Collection => "Collection",
        }
    }

    pub const ALL: &[SortOrder] = &[
        SortOrder::Priority,
        SortOrder::NewestFirst,
        SortOrder::OldestFirst,
        SortOrder::Collection,
    ];
}

/// Main application state
#[derive(Debug, Default)]
pub struct AppState {
    pub counts: Vec<StatusCount>,
    pub downloads: Vec<Download>,
    pub downloads_total: i64,
    pub error_downloads: Vec<Download>,
    pub upcoming_downloads: Vec<Download>,
    pub total_pending: i64,
    pub system: Option<SystemInfo>,
    pub logs: Vec<String>,
    pub config: Option<ConfigResponse>,
    pub status_filter: StatusFilter,
    pub sort_order: SortOrder,
    pub current_page: usize,
    pub download_search: String,
    pub log_filter: LogFilter,
    pub log_search: String,
}

/// Log filter type
#[derive(Debug, Default, Clone, Copy, PartialEq, Eq)]
pub enum LogFilter {
    #[default]
    All,
    Errors,
    Warnings,
    Info,
}

impl AppState {
    /// Get the count for a given status, defaulting to 0
    pub fn count_for(&self, status: &str) -> i64 {
        self.counts
            .iter()
            .find(|c| c.status == status)
            .map(|c| c.count)
            .unwrap_or(0)
    }

    /// Get downloads sorted by current sort order (filtering is server-side)
    pub fn sorted_downloads(&self) -> Vec<&Download> {
        let mut result: Vec<&Download> = self.downloads.iter().collect();

        match self.sort_order {
            SortOrder::Priority => {
                result.sort_by(|a, b| a.priority.cmp(&b.priority).then(b.id.cmp(&a.id)))
            }
            SortOrder::NewestFirst => result.sort_by(|a, b| b.id.cmp(&a.id)),
            SortOrder::OldestFirst => result.sort_by(|a, b| a.id.cmp(&b.id)),
            SortOrder::Collection => {
                result.sort_by(|a, b| a.collection.cmp(&b.collection).then(b.id.cmp(&a.id)))
            }
        }

        result
    }

    /// Total number of pages for current filter
    pub fn total_pages(&self) -> usize {
        let per_page = 50;
        (self.downloads_total as usize).div_ceil(per_page)
    }

    /// Look up the directory for a download's collection
    pub fn dir_for_collection(&self, collection: &str) -> Option<&str> {
        self.config
            .as_ref()
            .and_then(|c| c.collections.get(collection))
            .map(|c| c.dir.as_str())
    }

    /// Get filtered log lines based on current filter and search
    pub fn filtered_logs(&self) -> Vec<&str> {
        self.logs
            .iter()
            .rev()
            .filter(|line| match self.log_filter {
                LogFilter::All => true,
                LogFilter::Errors => line.contains("ERROR") || line.contains("error"),
                LogFilter::Warnings => line.contains("WARN") || line.contains("warn"),
                LogFilter::Info => line.contains("INFO") || line.contains("info"),
            })
            .filter(|line| {
                self.log_search.is_empty()
                    || line
                        .to_lowercase()
                        .contains(&self.log_search.to_lowercase())
            })
            .map(|s| s.as_str())
            .collect()
    }
}

/// Collection of UI widgets that need to be accessed throughout the app
pub struct Widgets {
    pub toast_overlay: adw::ToastOverlay,
    // Stats labels
    pub pending_label: gtk::Label,
    pub downloading_label: gtk::Label,
    pub success_label: gtk::Label,
    pub error_count_label: gtk::Label,
    pub system_label: gtk::Label,
    // Downloads page
    pub downloads_list: gtk::ListBox,
    pub downloads_count_label: gtk::Label,
    pub downloads_search: gtk::SearchEntry,
    pub pagination_label: gtk::Label,
    pub prev_button: gtk::Button,
    pub next_button: gtk::Button,
    // Upcoming section
    pub upcoming_list: gtk::ListBox,
    pub upcoming_label: gtk::Label,
    // Errors page
    pub errors_list: gtk::ListBox,
    pub errors_stack: gtk::Stack,
    // Logs page
    pub logs_buffer: gtk::TextBuffer,
    pub logs_search: gtk::SearchEntry,
    // Config page
    pub config_box: gtk::Box,
}

impl Widgets {
    /// Show a toast notification
    pub fn show_toast(&self, message: &str) {
        self.toast_overlay.add_toast(adw::Toast::new(message));
    }
}

impl std::fmt::Debug for Widgets {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("Widgets").finish_non_exhaustive()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_download_display_title() {
        let d1 = Download {
            title: Some("My Video".into()),
            ..Default::default()
        };
        assert_eq!(d1.display_title(), "My Video");

        let d2 = Download {
            title: None,
            ..Default::default()
        };
        assert_eq!(d2.display_title(), "Untitled");
    }

    #[test]
    fn test_count_for() {
        let state = AppState {
            counts: vec![
                StatusCount {
                    status: "pending".into(),
                    count: 5,
                },
                StatusCount {
                    status: "error".into(),
                    count: 2,
                },
            ],
            ..Default::default()
        };
        assert_eq!(state.count_for("pending"), 5);
        assert_eq!(state.count_for("error"), 2);
        assert_eq!(state.count_for("success"), 0);
    }

    #[test]
    fn test_status_filter_labels() {
        assert_eq!(StatusFilter::All.label(), "All");
        assert_eq!(StatusFilter::Pending.label(), "Pending");
        assert_eq!(StatusFilter::Error.label(), "Errors");
    }

    #[test]
    fn test_sorted_downloads() {
        let state = AppState {
            downloads: vec![
                Download {
                    id: 1,
                    status: "pending".into(),
                    ..Default::default()
                },
                Download {
                    id: 3,
                    status: "error".into(),
                    ..Default::default()
                },
                Download {
                    id: 2,
                    status: "success".into(),
                    ..Default::default()
                },
            ],
            sort_order: SortOrder::NewestFirst,
            ..Default::default()
        };
        let sorted = state.sorted_downloads();
        assert_eq!(sorted.len(), 3);
        assert_eq!(sorted[0].id, 3);
        assert_eq!(sorted[1].id, 2);
        assert_eq!(sorted[2].id, 1);
    }

    #[test]
    fn test_total_pages() {
        let state = AppState {
            downloads_total: 125,
            ..Default::default()
        };
        assert_eq!(state.total_pages(), 3);

        let state2 = AppState {
            downloads_total: 0,
            ..Default::default()
        };
        assert_eq!(state2.total_pages(), 0);

        let state3 = AppState {
            downloads_total: 50,
            ..Default::default()
        };
        assert_eq!(state3.total_pages(), 1);
    }

    #[test]
    fn test_status_filter_api_param() {
        assert_eq!(StatusFilter::All.api_param(), "all");
        assert_eq!(StatusFilter::Pending.api_param(), "pending");
        assert_eq!(StatusFilter::Error.api_param(), "error");
    }

    #[test]
    fn test_log_filter() {
        let state = AppState {
            logs: vec![
                "INFO: started".into(),
                "ERROR: failed".into(),
                "WARN: slow".into(),
                "INFO: done".into(),
            ],
            log_filter: LogFilter::Errors,
            ..Default::default()
        };
        let filtered = state.filtered_logs();
        assert_eq!(filtered.len(), 1);
        assert_eq!(filtered[0], "ERROR: failed");
    }

    #[test]
    fn test_logs_reversed() {
        let state = AppState {
            logs: vec!["first".into(), "second".into(), "third".into()],
            log_filter: LogFilter::All,
            ..Default::default()
        };
        let filtered = state.filtered_logs();
        assert_eq!(filtered, vec!["third", "second", "first"]);
    }

    #[test]
    fn test_log_search() {
        let state = AppState {
            logs: vec!["download started".into(), "upload finished".into()],
            log_filter: LogFilter::All,
            log_search: "download".into(),
            ..Default::default()
        };
        let filtered = state.filtered_logs();
        assert_eq!(filtered.len(), 1);
        assert!(filtered[0].contains("download"));
    }

    #[test]
    fn test_log_filter_default() {
        let filter = LogFilter::default();
        assert_eq!(filter, LogFilter::All);
    }

    #[test]
    fn test_dir_for_collection() {
        let state = AppState {
            config: Some(ConfigResponse {
                collections: BTreeMap::from([(
                    "yt".into(),
                    CollectionConfig {
                        dir: "/home/user/videos".into(),
                        command: "yt-dlp %".into(),
                        domains: vec!["youtube.com".into()],
                    },
                )]),
            }),
            ..Default::default()
        };
        assert_eq!(state.dir_for_collection("yt"), Some("/home/user/videos"));
        assert_eq!(state.dir_for_collection("missing"), None);
    }

    #[test]
    fn test_sort_newest_first() {
        let state = AppState {
            downloads: vec![
                Download {
                    id: 1,
                    status: "success".into(),
                    ..Default::default()
                },
                Download {
                    id: 3,
                    status: "success".into(),
                    ..Default::default()
                },
                Download {
                    id: 2,
                    status: "success".into(),
                    ..Default::default()
                },
            ],
            sort_order: SortOrder::NewestFirst,
            ..Default::default()
        };
        let sorted = state.sorted_downloads();
        assert_eq!(sorted[0].id, 3);
        assert_eq!(sorted[1].id, 2);
        assert_eq!(sorted[2].id, 1);
    }

    #[test]
    fn test_sort_by_collection() {
        let state = AppState {
            downloads: vec![
                Download {
                    id: 1,
                    collection: "zt".into(),
                    ..Default::default()
                },
                Download {
                    id: 2,
                    collection: "at".into(),
                    ..Default::default()
                },
            ],
            sort_order: SortOrder::Collection,
            ..Default::default()
        };
        let sorted = state.sorted_downloads();
        assert_eq!(sorted[0].collection, "at");
        assert_eq!(sorted[1].collection, "zt");
    }

    #[test]
    fn test_formatted_uptime() {
        let sys = SystemInfo {
            memory: MemoryInfo {
                rss: "100 MB".into(),
                heap_used: "50 MB".into(),
                heap_total: "80 MB".into(),
            },
            uptime: "3182s".into(),
        };
        assert_eq!(sys.formatted_uptime(), "53m");

        let sys2 = SystemInfo {
            memory: MemoryInfo {
                rss: "100 MB".into(),
                heap_used: "50 MB".into(),
                heap_total: "80 MB".into(),
            },
            uptime: "7200s".into(),
        };
        assert_eq!(sys2.formatted_uptime(), "2h 0m");
    }

    #[test]
    fn test_deserialize_download() {
        let json = r#"{
            "id": 1,
            "collection": "yt",
            "createdAt": "2024-01-01",
            "downloadedAt": null,
            "priority": "normal",
            "status": "pending",
            "title": "Test",
            "url": "https://example.com",
            "errorMessage": null
        }"#;
        let d: Download = serde_json::from_str(json).unwrap();
        assert_eq!(d.id, 1);
        assert_eq!(d.collection, "yt");
        assert_eq!(d.status, "pending");
    }
}
