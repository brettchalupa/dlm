use crate::types::*;

const USER_AGENT: &str = concat!("dlm-gtk/", env!("CARGO_PKG_VERSION"));

fn agent() -> ureq::Agent {
    ureq::AgentBuilder::new().user_agent(USER_AGENT).build()
}

/// Fetch status counts from /api/count
pub fn fetch_counts(api_url: &str) -> Result<Vec<StatusCount>, String> {
    let resp: CountResponse = agent()
        .get(&format!("{api_url}/api/count"))
        .call()
        .map_err(|e| e.to_string())?
        .into_json()
        .map_err(|e| e.to_string())?;
    Ok(resp.status_groups)
}

/// Fetch downloads with pagination, status filter, and search
pub fn fetch_downloads(
    api_url: &str,
    limit: usize,
    offset: usize,
    status: &str,
    search: &str,
) -> Result<PaginatedDownloadsResponse, String> {
    let mut url = format!("{api_url}/api/downloads?limit={limit}&offset={offset}&status={status}");
    if !search.is_empty() {
        url.push_str(&format!("&search={}", urlencoding::encode(search)));
    }
    let resp: PaginatedDownloadsResponse = agent()
        .get(&url)
        .call()
        .map_err(|e| e.to_string())?
        .into_json()
        .map_err(|e| e.to_string())?;
    Ok(resp)
}

/// Fetch upcoming pending downloads with total pending count
pub fn fetch_upcoming(api_url: &str) -> Result<UpcomingResponse, String> {
    let resp: UpcomingResponse = agent()
        .get(&format!("{api_url}/api/upcoming"))
        .call()
        .map_err(|e| e.to_string())?
        .into_json()
        .map_err(|e| e.to_string())?;
    Ok(resp)
}

/// Fetch system info from /api/system
pub fn fetch_system(api_url: &str) -> Result<SystemInfo, String> {
    let resp: SystemInfo = agent()
        .get(&format!("{api_url}/api/system"))
        .call()
        .map_err(|e| e.to_string())?
        .into_json()
        .map_err(|e| e.to_string())?;
    Ok(resp)
}

/// Fetch logs from /api/logs
pub fn fetch_logs(api_url: &str) -> Result<Vec<String>, String> {
    let resp: LogsResponse = agent()
        .get(&format!("{api_url}/api/logs"))
        .call()
        .map_err(|e| e.to_string())?
        .into_json()
        .map_err(|e| e.to_string())?;
    Ok(resp.logs)
}

/// Fetch config from /api/config
pub fn fetch_config(api_url: &str) -> Result<ConfigResponse, String> {
    let resp: ConfigResponse = agent()
        .get(&format!("{api_url}/api/config"))
        .call()
        .map_err(|e| e.to_string())?
        .into_json()
        .map_err(|e| e.to_string())?;
    Ok(resp)
}

/// Parameters for the paginated downloads fetch
pub struct FetchParams {
    pub limit: usize,
    pub offset: usize,
    pub status: String,
    pub search: String,
}

/// Fetch all data in one call (for refresh)
pub fn fetch_all(api_url: &str, params: &FetchParams) -> RefreshData {
    let counts = fetch_counts(api_url).unwrap_or_default();
    let paginated = fetch_downloads(
        api_url,
        params.limit,
        params.offset,
        &params.status,
        &params.search,
    )
    .unwrap_or_default();
    let error_resp = fetch_downloads(api_url, 100, 0, "error", "").unwrap_or_default();
    let upcoming = fetch_upcoming(api_url).unwrap_or_default();
    let system = fetch_system(api_url).ok();
    let logs = fetch_logs(api_url).unwrap_or_default();
    let config = fetch_config(api_url).ok();

    RefreshData {
        counts,
        downloads: paginated.downloads,
        downloads_total: paginated.total,
        error_downloads: error_resp.downloads,
        upcoming_downloads: upcoming.downloads,
        total_pending: upcoming.total_pending,
        system,
        logs,
        config,
    }
}

/// Add URLs to download queue
pub fn add_urls(api_url: &str, urls: &[String]) -> Result<String, String> {
    let body = serde_json::json!({ "urls": urls });
    let resp: MessageResponse = agent()
        .post(&format!("{api_url}/api/add-urls"))
        .send_json(body)
        .map_err(|e| e.to_string())?
        .into_json()
        .map_err(|e| e.to_string())?;
    Ok(resp.message)
}

/// Set priority for a download
pub fn set_priority(api_url: &str, id: i64, priority: &str) -> Result<String, String> {
    let body = serde_json::json!({ "priority": priority });
    let resp: MessageResponse = agent()
        .post(&format!("{api_url}/api/priority/{id}"))
        .send_json(body)
        .map_err(|e| e.to_string())?
        .into_json()
        .map_err(|e| e.to_string())?;
    Ok(resp.message)
}

/// Start downloads with a limit
pub fn start_downloads(api_url: &str, limit: i32) -> Result<String, String> {
    let body = serde_json::json!({ "limit": limit });
    let resp: MessageResponse = agent()
        .post(&format!("{api_url}/api/download"))
        .send_json(body)
        .map_err(|e| e.to_string())?
        .into_json()
        .map_err(|e| e.to_string())?;
    Ok(resp.message)
}

/// Retry a single failed download
pub fn retry_download(api_url: &str, id: i64) -> Result<String, String> {
    let resp: MessageResponse = agent()
        .post(&format!("{api_url}/api/retry/{id}"))
        .call()
        .map_err(|e| e.to_string())?
        .into_json()
        .map_err(|e| e.to_string())?;
    Ok(resp.message)
}

/// Retry all failed downloads
pub fn retry_all_failed(api_url: &str) -> Result<String, String> {
    let resp: MessageResponse = agent()
        .post(&format!("{api_url}/api/retry-all-failed"))
        .call()
        .map_err(|e| e.to_string())?
        .into_json()
        .map_err(|e| e.to_string())?;
    Ok(resp.message)
}

/// Delete a single download
pub fn delete_download(api_url: &str, id: i64) -> Result<String, String> {
    let resp: MessageResponse = agent()
        .delete(&format!("{api_url}/api/download/{id}"))
        .call()
        .map_err(|e| e.to_string())?
        .into_json()
        .map_err(|e| e.to_string())?;
    Ok(resp.message)
}

/// Delete all failed downloads
pub fn delete_all_failed(api_url: &str) -> Result<String, String> {
    let resp: MessageResponse = agent()
        .delete(&format!("{api_url}/api/delete-all-failed"))
        .call()
        .map_err(|e| e.to_string())?
        .into_json()
        .map_err(|e| e.to_string())?;
    Ok(resp.message)
}

/// Redownload a successful download
pub fn redownload(api_url: &str, id: i64) -> Result<String, String> {
    let resp: MessageResponse = agent()
        .post(&format!("{api_url}/api/redownload/{id}"))
        .call()
        .map_err(|e| e.to_string())?
        .into_json()
        .map_err(|e| e.to_string())?;
    Ok(resp.message)
}

/// Reset a stuck downloading item to pending
pub fn reset_download(api_url: &str, id: i64) -> Result<String, String> {
    let resp: MessageResponse = agent()
        .post(&format!("{api_url}/api/reset/{id}"))
        .call()
        .map_err(|e| e.to_string())?
        .into_json()
        .map_err(|e| e.to_string())?;
    Ok(resp.message)
}

/// Reset all stuck downloading items
pub fn reset_all_downloading(api_url: &str) -> Result<String, String> {
    let resp: MessageResponse = agent()
        .post(&format!("{api_url}/api/reset-all-downloading"))
        .call()
        .map_err(|e| e.to_string())?
        .into_json()
        .map_err(|e| e.to_string())?;
    Ok(resp.message)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_user_agent() {
        assert_eq!(USER_AGENT, "dlm-gtk/0.1.0");
    }

    #[test]
    fn test_fetch_all_handles_unreachable_server() {
        let params = FetchParams {
            limit: 50,
            offset: 0,
            status: "all".into(),
            search: String::new(),
        };
        let data = fetch_all("http://127.0.0.1:19999", &params);
        assert!(data.counts.is_empty());
        assert!(data.downloads.is_empty());
        assert_eq!(data.downloads_total, 0);
        assert!(data.error_downloads.is_empty());
        assert!(data.upcoming_downloads.is_empty());
        assert_eq!(data.total_pending, 0);
        assert!(data.system.is_none());
        assert!(data.logs.is_empty());
        assert!(data.config.is_none());
    }

    #[test]
    fn test_fetch_counts_error() {
        let result = fetch_counts("http://127.0.0.1:19999");
        assert!(result.is_err());
    }

    #[test]
    fn test_fetch_downloads_error() {
        let result = fetch_downloads("http://127.0.0.1:19999", 50, 0, "all", "");
        assert!(result.is_err());
    }

    #[test]
    fn test_fetch_upcoming_error() {
        let result = fetch_upcoming("http://127.0.0.1:19999");
        assert!(result.is_err());
    }
}
