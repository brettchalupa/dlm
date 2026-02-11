//! DLM Desktop - GTK4 desktop client for the DLM download manager.
//!
//! Connects to the DLM HTTP API server to manage and monitor downloads.
//! Provides a native desktop experience with auto-refresh, keyboard shortcuts,
//! and full download management capabilities.

mod api;
mod config;
mod types;

use std::cell::RefCell;
use std::rc::Rc;

use adw::prelude::*;
use glib::clone;
use gtk::gio;
use gtk::glib;

use config::{AppSettings, load_settings, save_settings};
use types::{AppState, LogFilter, RefreshData, SortOrder, StatusFilter, Widgets};

// ============================================================================
// Configuration
// ============================================================================

pub const APP_ID: &str = "com.brettchalupa.dlm.desktop";
pub const CONFIG_DIR: &str = ".config/dlm-gtk";
const WINDOW_TITLE: &str = "DLM";
const WINDOW_WIDTH: i32 = 960;
const WINDOW_HEIGHT: i32 = 700;
const REFRESH_INTERVAL_SECS: u32 = 3;

const KEYBOARD_SHORTCUTS: &[(&str, &[(&str, &str)])] = &[(
    "General",
    &[
        ("Ctrl+R", "Refresh data"),
        ("Ctrl+D", "Start downloads"),
        ("Ctrl+N", "Add URLs"),
        ("?", "Keyboard shortcuts"),
    ],
)];

// ============================================================================
// CSS
// ============================================================================

fn load_css() {
    let provider = gtk::CssProvider::new();
    provider.load_from_string(
        "
        .stat-card {
            padding: 12px 20px;
            min-width: 64px;
        }
        .stat-card label.stat-number {
            font-size: 28px;
            font-weight: 800;
        }
        .stat-card label.stat-label {
            font-size: 11px;
        }
        .status-badge {
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 600;
        }
        ",
    );
    gtk::style_context_add_provider_for_display(
        &gtk::gdk::Display::default().unwrap(),
        &provider,
        gtk::STYLE_PROVIDER_PRIORITY_APPLICATION,
    );
}

// ============================================================================
// Data refresh
// ============================================================================

const PAGE_SIZE: usize = 50;

/// Trigger an async data refresh from the API
fn trigger_refresh(
    state: &Rc<RefCell<AppState>>,
    widgets: &Rc<Widgets>,
    settings: &Rc<RefCell<AppSettings>>,
) {
    let api_url = settings.borrow().api_url.clone();
    let params = {
        let s = state.borrow();
        api::FetchParams {
            limit: PAGE_SIZE,
            offset: s.current_page * PAGE_SIZE,
            status: s.status_filter.api_param().to_string(),
            search: s.download_search.clone(),
        }
    };
    let state = state.clone();
    let widgets = widgets.clone();
    let settings2 = settings.clone();

    glib::spawn_future_local(async move {
        let data: RefreshData = gio::spawn_blocking(move || api::fetch_all(&api_url, &params))
            .await
            .unwrap_or_default();
        apply_refresh_data(&state, &widgets, &settings2, data);
    });
}

/// Apply fetched data to the app state and update all UI widgets
fn apply_refresh_data(
    state: &Rc<RefCell<AppState>>,
    widgets: &Rc<Widgets>,
    settings: &Rc<RefCell<AppSettings>>,
    data: RefreshData,
) {
    {
        let mut s = state.borrow_mut();
        s.counts = data.counts;
        s.downloads = data.downloads;
        s.downloads_total = data.downloads_total;
        s.error_downloads = data.error_downloads;
        s.upcoming_downloads = data.upcoming_downloads;
        s.total_pending = data.total_pending;
        s.system = data.system;
        s.logs = data.logs;
        s.config = data.config;
    }

    {
        let s = state.borrow();
        update_stats(&s, widgets);
        update_logs_view(&s, widgets);
        update_config_view(&s, widgets);
    }
    update_downloads_list(state, widgets, settings);
    update_errors_list(state, widgets, settings);
    update_upcoming_list(state, widgets, settings);
}

// ============================================================================
// UI Update Functions
// ============================================================================

fn update_stats(state: &AppState, widgets: &Widgets) {
    widgets
        .pending_label
        .set_text(&state.count_for("pending").to_string());
    widgets
        .downloading_label
        .set_text(&state.count_for("downloading").to_string());
    widgets
        .success_label
        .set_text(&state.count_for("success").to_string());
    widgets
        .error_count_label
        .set_text(&state.count_for("error").to_string());

    if let Some(sys) = &state.system {
        widgets.system_label.set_text(&format!(
            "Memory: {}  |  Uptime: {}",
            sys.memory.rss,
            sys.formatted_uptime()
        ));
    }
}

fn update_downloads_list(
    state: &Rc<RefCell<AppState>>,
    widgets: &Rc<Widgets>,
    settings: &Rc<RefCell<AppSettings>>,
) {
    while let Some(child) = widgets.downloads_list.first_child() {
        widgets.downloads_list.remove(&child);
    }

    let s = state.borrow();
    let sorted = s.sorted_downloads();
    let total_pages = s.total_pages();
    let current_page = s.current_page;

    // Update pagination info
    if s.downloads_total > 0 {
        widgets.pagination_label.set_text(&format!(
            "Page {} of {} ({} total)",
            current_page + 1,
            total_pages.max(1),
            s.downloads_total
        ));
    } else {
        widgets.pagination_label.set_text("");
    }
    widgets.prev_button.set_sensitive(current_page > 0);
    widgets
        .next_button
        .set_sensitive(current_page + 1 < total_pages);

    widgets
        .downloads_count_label
        .set_text(&format!("{} shown", sorted.len()));

    if sorted.is_empty() {
        let subtitle = if s.downloads_total == 0 && s.download_search.is_empty() {
            "Add URLs to get started"
        } else {
            "No downloads match the current filter"
        };
        let row = adw::ActionRow::builder()
            .title("No downloads")
            .subtitle(subtitle)
            .build();
        widgets.downloads_list.append(&row);
        return;
    }

    for dl in &sorted {
        let row = build_download_row(dl, widgets, state, settings);
        widgets.downloads_list.append(&row);
    }
}

fn build_download_row(
    dl: &types::Download,
    widgets: &Rc<Widgets>,
    state: &Rc<RefCell<AppState>>,
    settings: &Rc<RefCell<AppSettings>>,
) -> gtk::ListBoxRow {
    let outer_box = gtk::Box::builder()
        .orientation(gtk::Orientation::Horizontal)
        .spacing(8)
        .margin_top(6)
        .margin_bottom(6)
        .margin_start(12)
        .margin_end(12)
        .build();

    // Info column
    let info_box = gtk::Box::builder()
        .orientation(gtk::Orientation::Vertical)
        .spacing(2)
        .hexpand(true)
        .build();

    let title_label = gtk::Label::builder()
        .label(dl.display_title())
        .halign(gtk::Align::Start)
        .ellipsize(gtk::pango::EllipsizeMode::End)
        .css_classes(["heading"])
        .build();

    let url_label = gtk::Label::builder()
        .label(&dl.url)
        .halign(gtk::Align::Start)
        .ellipsize(gtk::pango::EllipsizeMode::End)
        .css_classes(["dim-label", "caption"])
        .build();

    let meta_label = gtk::Label::builder()
        .label(format!("{} · ID {}", dl.collection, dl.id))
        .halign(gtk::Align::Start)
        .css_classes(["dim-label", "caption"])
        .build();

    info_box.append(&title_label);
    info_box.append(&url_label);
    info_box.append(&meta_label);

    // Status badge
    let status_css = match dl.status.as_str() {
        "pending" => "accent",
        "downloading" => "warning",
        "success" => "success",
        "error" => "error",
        _ => "dim-label",
    };
    let status_label = gtk::Label::builder()
        .label(&dl.status)
        .css_classes([status_css, "status-badge"])
        .valign(gtk::Align::Center)
        .build();

    // Action buttons
    let actions_box = gtk::Box::builder()
        .orientation(gtk::Orientation::Horizontal)
        .spacing(2)
        .valign(gtk::Align::Center)
        .build();

    // Open folder button (always available if we have config)
    let collection = dl.collection.clone();
    let open_btn = gtk::Button::builder()
        .icon_name("folder-open-symbolic")
        .tooltip_text("Open download folder")
        .css_classes(["flat", "circular"])
        .build();
    open_btn.connect_clicked(clone!(
        #[strong]
        state,
        #[strong]
        widgets,
        move |_| {
            let s = state.borrow();
            if let Some(dir) = s.dir_for_collection(&collection) {
                let dir = dir.to_string();
                drop(s);
                if let Err(e) = open::that(&dir) {
                    widgets.show_toast(&format!("Failed to open folder: {e}"));
                }
            } else {
                drop(s);
                widgets.show_toast("Collection directory not found in config");
            }
        }
    ));
    actions_box.append(&open_btn);

    // Status-specific action
    let dl_id = dl.id;
    match dl.status.as_str() {
        "success" => {
            let btn = gtk::Button::builder()
                .icon_name("view-refresh-symbolic")
                .tooltip_text("Redownload")
                .css_classes(["flat", "circular"])
                .build();
            btn.connect_clicked(clone!(
                #[strong]
                widgets,
                #[strong]
                state,
                #[strong]
                settings,
                move |_| {
                    let api_url = settings.borrow().api_url.clone();
                    do_action(
                        &api_url,
                        move |url| api::redownload(&url, dl_id),
                        &widgets,
                        &state,
                        &settings,
                    );
                }
            ));
            actions_box.append(&btn);
        }
        "error" => {
            let btn = gtk::Button::builder()
                .icon_name("view-refresh-symbolic")
                .tooltip_text("Retry")
                .css_classes(["flat", "circular"])
                .build();
            btn.connect_clicked(clone!(
                #[strong]
                widgets,
                #[strong]
                state,
                #[strong]
                settings,
                move |_| {
                    let api_url = settings.borrow().api_url.clone();
                    do_action(
                        &api_url,
                        move |url| api::retry_download(&url, dl_id),
                        &widgets,
                        &state,
                        &settings,
                    );
                }
            ));
            actions_box.append(&btn);
        }
        "pending" => {
            let btn = gtk::Button::builder()
                .icon_name("user-trash-symbolic")
                .tooltip_text("Delete")
                .css_classes(["flat", "circular"])
                .build();
            btn.connect_clicked(clone!(
                #[strong]
                widgets,
                #[strong]
                state,
                #[strong]
                settings,
                move |_| {
                    let api_url = settings.borrow().api_url.clone();
                    do_action(
                        &api_url,
                        move |url| api::delete_download(&url, dl_id),
                        &widgets,
                        &state,
                        &settings,
                    );
                }
            ));
            actions_box.append(&btn);
        }
        "downloading" => {
            let btn = gtk::Button::builder()
                .icon_name("media-playback-stop-symbolic")
                .tooltip_text("Reset to pending")
                .css_classes(["flat", "circular"])
                .build();
            btn.connect_clicked(clone!(
                #[strong]
                widgets,
                #[strong]
                state,
                #[strong]
                settings,
                move |_| {
                    let api_url = settings.borrow().api_url.clone();
                    do_action(
                        &api_url,
                        move |url| api::reset_download(&url, dl_id),
                        &widgets,
                        &state,
                        &settings,
                    );
                }
            ));
            actions_box.append(&btn);
        }
        _ => {}
    }

    outer_box.append(&info_box);
    outer_box.append(&status_label);
    outer_box.append(&actions_box);

    gtk::ListBoxRow::builder()
        .child(&outer_box)
        .activatable(false)
        .build()
}

fn update_errors_list(
    state: &Rc<RefCell<AppState>>,
    widgets: &Rc<Widgets>,
    settings: &Rc<RefCell<AppSettings>>,
) {
    while let Some(child) = widgets.errors_list.first_child() {
        widgets.errors_list.remove(&child);
    }

    let s = state.borrow();
    let errors: Vec<&types::Download> = s.error_downloads.iter().collect();

    if errors.is_empty() {
        widgets.errors_stack.set_visible_child_name("empty");
        return;
    }

    widgets.errors_stack.set_visible_child_name("list");

    for dl in &errors {
        let row = adw::ActionRow::builder()
            .title(format!("ID {}: {}", dl.id, dl.display_title()))
            .subtitle(&dl.url)
            .build();

        if let Some(err) = &dl.error_message {
            let err_label = gtk::Label::builder()
                .label(err)
                .css_classes(["error", "caption"])
                .wrap(true)
                .halign(gtk::Align::Start)
                .max_width_chars(60)
                .build();
            row.add_suffix(&err_label);
        }

        let dl_id = dl.id;
        let retry_btn = gtk::Button::builder()
            .icon_name("view-refresh-symbolic")
            .tooltip_text("Retry")
            .css_classes(["flat", "circular"])
            .valign(gtk::Align::Center)
            .build();
        retry_btn.connect_clicked(clone!(
            #[strong]
            widgets,
            #[strong]
            state,
            #[strong]
            settings,
            move |_| {
                let api_url = settings.borrow().api_url.clone();
                do_action(
                    &api_url,
                    move |url| api::retry_download(&url, dl_id),
                    &widgets,
                    &state,
                    &settings,
                );
            }
        ));
        row.add_suffix(&retry_btn);

        let dl_id = dl.id;
        let delete_btn = gtk::Button::builder()
            .icon_name("user-trash-symbolic")
            .tooltip_text("Delete")
            .css_classes(["flat", "circular"])
            .valign(gtk::Align::Center)
            .build();
        delete_btn.connect_clicked(clone!(
            #[strong]
            widgets,
            #[strong]
            state,
            #[strong]
            settings,
            move |_| {
                let api_url = settings.borrow().api_url.clone();
                do_action(
                    &api_url,
                    move |url| api::delete_download(&url, dl_id),
                    &widgets,
                    &state,
                    &settings,
                );
            }
        ));
        row.add_suffix(&delete_btn);

        widgets.errors_list.append(&row);
    }
}

fn update_upcoming_list(
    state: &Rc<RefCell<AppState>>,
    widgets: &Rc<Widgets>,
    settings: &Rc<RefCell<AppSettings>>,
) {
    while let Some(child) = widgets.upcoming_list.first_child() {
        widgets.upcoming_list.remove(&child);
    }

    let s = state.borrow();

    if s.total_pending > 0 {
        widgets.upcoming_label.set_text(&format!(
            "Up Next (next {} of {} pending)",
            s.upcoming_downloads.len(),
            s.total_pending
        ));
    } else {
        widgets.upcoming_label.set_text("Up Next");
    }

    if s.upcoming_downloads.is_empty() {
        let row = adw::ActionRow::builder()
            .title("No pending downloads in queue")
            .build();
        widgets.upcoming_list.append(&row);
        return;
    }

    for (i, dl) in s.upcoming_downloads.iter().enumerate() {
        let row_box = gtk::Box::builder()
            .orientation(gtk::Orientation::Horizontal)
            .spacing(8)
            .margin_top(6)
            .margin_bottom(6)
            .margin_start(12)
            .margin_end(12)
            .build();

        // Position badge
        let badge = gtk::Label::builder()
            .label(format!("{}", i + 1))
            .css_classes(["accent", "status-badge"])
            .width_request(28)
            .halign(gtk::Align::Center)
            .valign(gtk::Align::Center)
            .build();
        row_box.append(&badge);

        let info_box = gtk::Box::builder()
            .orientation(gtk::Orientation::Vertical)
            .spacing(2)
            .hexpand(true)
            .build();

        let title_label = gtk::Label::builder()
            .label(dl.display_title())
            .halign(gtk::Align::Start)
            .ellipsize(gtk::pango::EllipsizeMode::End)
            .css_classes(["heading"])
            .build();

        let url_label = gtk::Label::builder()
            .label(&dl.url)
            .halign(gtk::Align::Start)
            .ellipsize(gtk::pango::EllipsizeMode::End)
            .css_classes(["dim-label", "caption"])
            .build();

        let meta_label = gtk::Label::builder()
            .label(format!("{} · ID {}", dl.collection, dl.id))
            .halign(gtk::Align::Start)
            .css_classes(["dim-label", "caption"])
            .build();

        info_box.append(&title_label);
        info_box.append(&url_label);
        info_box.append(&meta_label);

        let dl_id = dl.id;
        let delete_btn = gtk::Button::builder()
            .icon_name("user-trash-symbolic")
            .tooltip_text("Delete")
            .css_classes(["flat", "circular"])
            .valign(gtk::Align::Center)
            .build();
        delete_btn.connect_clicked(clone!(
            #[strong]
            widgets,
            #[strong]
            state,
            #[strong]
            settings,
            move |_| {
                let api_url = settings.borrow().api_url.clone();
                do_action(
                    &api_url,
                    move |url| api::delete_download(&url, dl_id),
                    &widgets,
                    &state,
                    &settings,
                );
            }
        ));

        row_box.append(&info_box);
        row_box.append(&delete_btn);

        let row = gtk::ListBoxRow::builder()
            .child(&row_box)
            .activatable(false)
            .build();
        widgets.upcoming_list.append(&row);
    }
}

fn update_logs_view(state: &AppState, widgets: &Widgets) {
    let lines = state.filtered_logs();
    let text = lines.join("\n");
    widgets.logs_buffer.set_text(&text);
}

fn update_config_view(state: &AppState, widgets: &Widgets) {
    while let Some(child) = widgets.config_box.first_child() {
        widgets.config_box.remove(&child);
    }

    let config = match &state.config {
        Some(c) => c,
        None => {
            let label = gtk::Label::builder()
                .label("Unable to load configuration")
                .css_classes(["dim-label"])
                .build();
            widgets.config_box.append(&label);
            return;
        }
    };

    for (name, coll) in &config.collections {
        let group = adw::PreferencesGroup::builder().title(name).build();

        let dir_row = adw::ActionRow::builder()
            .title("Directory")
            .subtitle(&coll.dir)
            .build();
        group.add(&dir_row);

        let cmd_row = adw::ActionRow::builder()
            .title("Command")
            .subtitle(&coll.command)
            .build();
        group.add(&cmd_row);

        let domains_str = coll.domains.join(", ");
        let domains_row = adw::ActionRow::builder()
            .title("Domains")
            .subtitle(&domains_str)
            .build();
        group.add(&domains_row);

        widgets.config_box.append(&group);
    }
}

// ============================================================================
// Dialogs
// ============================================================================

fn show_add_urls_dialog(
    window: &adw::ApplicationWindow,
    widgets: &Rc<Widgets>,
    state: &Rc<RefCell<AppState>>,
    settings: &Rc<RefCell<AppSettings>>,
) {
    let dialog = adw::Dialog::builder()
        .title("Add URLs")
        .content_width(500)
        .content_height(350)
        .build();

    let toolbar_view = adw::ToolbarView::new();
    toolbar_view.add_top_bar(&adw::HeaderBar::new());

    let content = gtk::Box::builder()
        .orientation(gtk::Orientation::Vertical)
        .spacing(12)
        .margin_top(12)
        .margin_bottom(12)
        .margin_start(12)
        .margin_end(12)
        .build();

    let hint = gtk::Label::builder()
        .label("Enter URLs, one per line or comma-separated")
        .css_classes(["dim-label"])
        .halign(gtk::Align::Start)
        .build();
    content.append(&hint);

    let text_view = gtk::TextView::builder()
        .height_request(200)
        .wrap_mode(gtk::WrapMode::WordChar)
        .css_classes(["card"])
        .top_margin(8)
        .bottom_margin(8)
        .left_margin(8)
        .right_margin(8)
        .build();

    let scroll = gtk::ScrolledWindow::builder()
        .child(&text_view)
        .vexpand(true)
        .build();
    content.append(&scroll);

    let submit_btn = gtk::Button::builder()
        .label("Add Downloads")
        .css_classes(["suggested-action", "pill"])
        .halign(gtk::Align::Center)
        .build();
    content.append(&submit_btn);

    toolbar_view.set_content(Some(&content));
    dialog.set_child(Some(&toolbar_view));

    submit_btn.connect_clicked(clone!(
        #[strong]
        widgets,
        #[strong]
        state,
        #[strong]
        settings,
        #[strong]
        text_view,
        #[weak]
        dialog,
        move |_| {
            let buffer = text_view.buffer();
            let text = buffer
                .text(&buffer.start_iter(), &buffer.end_iter(), false)
                .to_string();
            let urls: Vec<String> = text
                .split('\n')
                .flat_map(|l| l.split(','))
                .map(|s| s.trim().to_string())
                .filter(|s| !s.is_empty())
                .collect();

            if urls.is_empty() {
                widgets.show_toast("No URLs entered");
                return;
            }

            let count = urls.len();
            let api_url = settings.borrow().api_url.clone();
            let widgets2 = widgets.clone();
            let state2 = state.clone();
            let settings2 = settings.clone();

            glib::spawn_future_local(async move {
                let result = gio::spawn_blocking(move || api::add_urls(&api_url, &urls))
                    .await
                    .unwrap_or_else(|_| Err("Thread error".into()));
                match result {
                    Ok(msg) => {
                        widgets2.show_toast(&format!("Added {count} URL(s): {msg}"));
                        trigger_refresh(&state2, &widgets2, &settings2);
                    }
                    Err(_) => widgets2.show_toast("Failed to add URLs"),
                }
            });

            dialog.close();
        }
    ));

    dialog.present(Some(window));
}

fn show_settings_dialog(
    window: &adw::ApplicationWindow,
    settings: &Rc<RefCell<AppSettings>>,
    widgets: &Rc<Widgets>,
    state: &Rc<RefCell<AppState>>,
) {
    let current = settings.borrow().clone();

    let dialog = adw::PreferencesDialog::new();
    dialog.set_title("Settings");

    let page = adw::PreferencesPage::new();
    let server_group = adw::PreferencesGroup::builder().title("Server").build();

    let url_row = adw::EntryRow::builder()
        .title("API URL")
        .text(&current.api_url)
        .build();
    server_group.add(&url_row);

    page.add(&server_group);
    dialog.add(&page);

    dialog.connect_closed(clone!(
        #[strong]
        url_row,
        #[strong]
        settings,
        #[strong]
        widgets,
        #[strong]
        state,
        move |_| {
            let new_url = url_row.text().to_string();
            let new_settings = AppSettings { api_url: new_url };
            save_settings(&new_settings);
            *settings.borrow_mut() = new_settings;
            trigger_refresh(&state, &widgets, &settings);
        }
    ));

    dialog.present(Some(window));
}

fn show_keyboard_help(window: &adw::ApplicationWindow) {
    let dialog = adw::Dialog::builder()
        .title("Keyboard Shortcuts")
        .content_width(400)
        .content_height(300)
        .build();

    let toolbar_view = adw::ToolbarView::new();
    toolbar_view.add_top_bar(&adw::HeaderBar::new());

    let content = gtk::Box::builder()
        .orientation(gtk::Orientation::Vertical)
        .spacing(12)
        .margin_top(12)
        .margin_bottom(12)
        .margin_start(12)
        .margin_end(12)
        .build();

    for (section_title, keys) in KEYBOARD_SHORTCUTS {
        let group = adw::PreferencesGroup::builder()
            .title(*section_title)
            .build();

        for (key, description) in *keys {
            let row = adw::ActionRow::builder().title(*description).build();
            let key_label = gtk::Label::builder()
                .label(*key)
                .css_classes(["dim-label", "monospace"])
                .build();
            row.add_suffix(&key_label);
            group.add(&row);
        }

        content.append(&group);
    }

    toolbar_view.set_content(Some(&content));
    dialog.set_child(Some(&toolbar_view));
    dialog.present(Some(window));
}

// ============================================================================
// Action helpers
// ============================================================================

fn do_action(
    api_url_str: &str,
    action: impl FnOnce(String) -> Result<String, String> + Send + 'static,
    widgets: &Rc<Widgets>,
    state: &Rc<RefCell<AppState>>,
    settings: &Rc<RefCell<AppSettings>>,
) {
    let api_url = api_url_str.to_string();
    let widgets = widgets.clone();
    let state = state.clone();
    let settings = settings.clone();

    glib::spawn_future_local(async move {
        let result = gio::spawn_blocking(move || action(api_url))
            .await
            .unwrap_or_else(|_| Err("Thread error".into()));
        match result {
            Ok(msg) => {
                widgets.show_toast(&msg);
                trigger_refresh(&state, &widgets, &settings);
            }
            Err(e) => widgets.show_toast(&format!("Error: {e}")),
        }
    });
}

// ============================================================================
// Page Builders
// ============================================================================

fn build_stat_card(label: &gtk::Label, name: &str) -> gtk::Box {
    let card = gtk::Box::builder()
        .orientation(gtk::Orientation::Vertical)
        .spacing(4)
        .css_classes(["card", "stat-card"])
        .build();

    label.set_css_classes(&["stat-number"]);
    label.set_halign(gtk::Align::Center);

    let name_label = gtk::Label::builder()
        .label(name)
        .css_classes(["dim-label", "stat-label"])
        .halign(gtk::Align::Center)
        .build();

    card.append(label);
    card.append(&name_label);
    card
}

fn build_stats_row(widgets: &Widgets) -> gtk::Box {
    let stats_box = gtk::Box::builder()
        .orientation(gtk::Orientation::Horizontal)
        .spacing(8)
        .halign(gtk::Align::Start)
        .build();

    let pairs: &[(&gtk::Label, &str)] = &[
        (&widgets.pending_label, "Pending"),
        (&widgets.downloading_label, "Downloading"),
        (&widgets.success_label, "Success"),
        (&widgets.error_count_label, "Errors"),
    ];

    for (label, name) in pairs {
        let card = build_stat_card(label, name);
        stats_box.append(&card);
    }

    stats_box
}

fn build_downloads_page(
    widgets: &Rc<Widgets>,
    state: &Rc<RefCell<AppState>>,
    settings: &Rc<RefCell<AppSettings>>,
) -> gtk::Box {
    let page = gtk::Box::builder()
        .orientation(gtk::Orientation::Vertical)
        .spacing(0)
        .build();

    // All content lives inside one clamp for consistent alignment
    let content = gtk::Box::builder()
        .orientation(gtk::Orientation::Vertical)
        .spacing(0)
        .vexpand(true)
        .build();

    // Top area: stats (left) + actions (right)
    let top_row = gtk::Box::builder()
        .orientation(gtk::Orientation::Horizontal)
        .spacing(12)
        .margin_top(12)
        .margin_bottom(8)
        .build();

    // Left side: stats + system info stacked
    let stats_col = gtk::Box::builder()
        .orientation(gtk::Orientation::Vertical)
        .spacing(4)
        .hexpand(true)
        .build();

    let stats_row = build_stats_row(widgets);
    stats_col.append(&stats_row);

    widgets
        .system_label
        .set_css_classes(&["dim-label", "caption"]);
    widgets.system_label.set_halign(gtk::Align::Start);
    widgets.system_label.set_margin_top(4);
    stats_col.append(&widgets.system_label);

    // Right side: action buttons stacked
    let actions = gtk::Box::builder()
        .orientation(gtk::Orientation::Vertical)
        .spacing(6)
        .valign(gtk::Align::Center)
        .halign(gtk::Align::End)
        .build();

    let start_btn = gtk::Button::builder()
        .label("Start Downloads")
        .css_classes(["suggested-action", "pill"])
        .build();

    start_btn.connect_clicked(clone!(
        #[strong]
        widgets,
        #[strong]
        state,
        #[strong]
        settings,
        move |_| {
            let api_url = settings.borrow().api_url.clone();
            do_action(
                &api_url,
                |url| api::start_downloads(&url, 3),
                &widgets,
                &state,
                &settings,
            );
        }
    ));

    let reset_btn = gtk::Button::builder()
        .label("Reset Stuck")
        .tooltip_text("Reset all stuck 'downloading' items to pending")
        .css_classes(["pill"])
        .build();

    reset_btn.connect_clicked(clone!(
        #[strong]
        widgets,
        #[strong]
        state,
        #[strong]
        settings,
        move |_| {
            let api_url = settings.borrow().api_url.clone();
            do_action(
                &api_url,
                |url| api::reset_all_downloading(&url),
                &widgets,
                &state,
                &settings,
            );
        }
    ));

    actions.append(&start_btn);
    actions.append(&reset_btn);

    top_row.append(&stats_col);
    top_row.append(&actions);
    content.append(&top_row);

    // Filter bar
    let filter_bar = gtk::Box::builder()
        .orientation(gtk::Orientation::Horizontal)
        .spacing(8)
        .margin_top(4)
        .margin_bottom(6)
        .build();

    let filter_buttons = gtk::Box::builder()
        .orientation(gtk::Orientation::Horizontal)
        .css_classes(["linked"])
        .build();

    let mut first_filter_btn: Option<gtk::ToggleButton> = None;
    for sf in StatusFilter::ALL_FILTERS {
        let btn = gtk::ToggleButton::builder().label(sf.label()).build();
        if let Some(ref first) = first_filter_btn {
            btn.set_group(Some(first));
        } else {
            first_filter_btn = Some(btn.clone());
        }
        if *sf == StatusFilter::All {
            btn.set_active(true);
        }
        let filter = *sf;
        btn.connect_toggled(clone!(
            #[strong]
            state,
            #[strong]
            widgets,
            #[strong]
            settings,
            move |btn| {
                if btn.is_active() {
                    {
                        let mut s = state.borrow_mut();
                        s.status_filter = filter;
                        s.current_page = 0;
                    }
                    trigger_refresh(&state, &widgets, &settings);
                }
            }
        ));
        filter_buttons.append(&btn);
    }

    // Sort dropdown
    let sort_labels: Vec<&str> = SortOrder::ALL.iter().map(|s| s.label()).collect();
    let sort_dropdown = gtk::DropDown::from_strings(&sort_labels);
    sort_dropdown.set_selected(0); // NewestFirst
    sort_dropdown.set_tooltip_text(Some("Sort order"));
    sort_dropdown.connect_selected_notify(clone!(
        #[strong]
        state,
        #[strong]
        widgets,
        #[strong]
        settings,
        move |dd| {
            let idx = dd.selected() as usize;
            if let Some(&order) = SortOrder::ALL.get(idx) {
                state.borrow_mut().sort_order = order;
                update_downloads_list(&state, &widgets, &settings);
            }
        }
    ));

    widgets
        .downloads_search
        .set_placeholder_text(Some("Search downloads..."));
    widgets.downloads_search.set_hexpand(true);

    widgets
        .downloads_count_label
        .set_css_classes(&["dim-label", "caption"]);
    widgets.downloads_count_label.set_halign(gtk::Align::End);

    filter_bar.append(&filter_buttons);
    filter_bar.append(&sort_dropdown);
    filter_bar.append(&widgets.downloads_search);
    filter_bar.append(&widgets.downloads_count_label);
    content.append(&filter_bar);

    // Search handler
    widgets.downloads_search.connect_search_changed(clone!(
        #[strong]
        state,
        #[strong]
        widgets,
        #[strong]
        settings,
        move |entry| {
            {
                let mut s = state.borrow_mut();
                s.download_search = entry.text().to_string();
                s.current_page = 0;
            }
            trigger_refresh(&state, &widgets, &settings);
        }
    ));

    // Downloads list
    widgets.downloads_list.set_css_classes(&["boxed-list"]);
    widgets
        .downloads_list
        .set_selection_mode(gtk::SelectionMode::None);

    let scroll = gtk::ScrolledWindow::builder()
        .hscrollbar_policy(gtk::PolicyType::Never)
        .vscrollbar_policy(gtk::PolicyType::Automatic)
        .child(&widgets.downloads_list)
        .vexpand(true)
        .build();

    content.append(&scroll);

    // Pagination controls
    let pagination_box = gtk::Box::builder()
        .orientation(gtk::Orientation::Horizontal)
        .spacing(8)
        .margin_top(4)
        .margin_bottom(4)
        .halign(gtk::Align::Center)
        .build();

    widgets.prev_button.set_icon_name("go-previous-symbolic");
    widgets.prev_button.add_css_class("flat");
    widgets.next_button.set_icon_name("go-next-symbolic");
    widgets.next_button.add_css_class("flat");
    widgets.pagination_label.add_css_class("dim-label");

    pagination_box.append(&widgets.prev_button);
    pagination_box.append(&widgets.pagination_label);
    pagination_box.append(&widgets.next_button);
    content.append(&pagination_box);

    // Pagination button handlers
    widgets.prev_button.connect_clicked(clone!(
        #[strong]
        state,
        #[strong]
        widgets,
        #[strong]
        settings,
        move |_| {
            {
                let mut s = state.borrow_mut();
                s.current_page = s.current_page.saturating_sub(1);
            }
            trigger_refresh(&state, &widgets, &settings);
        }
    ));

    widgets.next_button.connect_clicked(clone!(
        #[strong]
        state,
        #[strong]
        widgets,
        #[strong]
        settings,
        move |_| {
            {
                let mut s = state.borrow_mut();
                if s.current_page + 1 < s.total_pages() {
                    s.current_page += 1;
                }
            }
            trigger_refresh(&state, &widgets, &settings);
        }
    ));

    let clamp = adw::Clamp::builder()
        .maximum_size(900)
        .child(&content)
        .vexpand(true)
        .margin_start(12)
        .margin_end(12)
        .build();

    page.append(&clamp);
    page
}

fn build_errors_page(
    widgets: &Rc<Widgets>,
    state: &Rc<RefCell<AppState>>,
    settings: &Rc<RefCell<AppSettings>>,
) -> gtk::Box {
    let page = gtk::Box::builder()
        .orientation(gtk::Orientation::Vertical)
        .spacing(8)
        .build();

    // Bulk action buttons
    let actions = gtk::Box::builder()
        .orientation(gtk::Orientation::Horizontal)
        .spacing(8)
        .halign(gtk::Align::Center)
        .margin_top(12)
        .margin_bottom(8)
        .build();

    let retry_all_btn = gtk::Button::builder()
        .label("Retry All Failed")
        .css_classes(["suggested-action", "pill"])
        .build();

    retry_all_btn.connect_clicked(clone!(
        #[strong]
        widgets,
        #[strong]
        state,
        #[strong]
        settings,
        move |_| {
            let api_url = settings.borrow().api_url.clone();
            do_action(
                &api_url,
                |url| api::retry_all_failed(&url),
                &widgets,
                &state,
                &settings,
            );
        }
    ));

    let delete_all_btn = gtk::Button::builder()
        .label("Delete All Failed")
        .css_classes(["destructive-action", "pill"])
        .build();

    delete_all_btn.connect_clicked(clone!(
        #[strong]
        widgets,
        #[strong]
        state,
        #[strong]
        settings,
        move |_| {
            let api_url = settings.borrow().api_url.clone();
            do_action(
                &api_url,
                |url| api::delete_all_failed(&url),
                &widgets,
                &state,
                &settings,
            );
        }
    ));

    actions.append(&retry_all_btn);
    actions.append(&delete_all_btn);
    page.append(&actions);

    // Stack: empty status page or error list
    let empty_page = adw::StatusPage::builder()
        .icon_name("emblem-ok-symbolic")
        .title("No Errors")
        .description("All downloads are running smoothly.")
        .build();

    widgets.errors_list.set_css_classes(&["boxed-list"]);
    widgets
        .errors_list
        .set_selection_mode(gtk::SelectionMode::None);

    let error_scroll = gtk::ScrolledWindow::builder()
        .hscrollbar_policy(gtk::PolicyType::Never)
        .vscrollbar_policy(gtk::PolicyType::Automatic)
        .child(&widgets.errors_list)
        .vexpand(true)
        .build();

    let error_clamp = adw::Clamp::builder()
        .maximum_size(900)
        .child(&error_scroll)
        .vexpand(true)
        .build();

    widgets.errors_stack.add_named(&empty_page, Some("empty"));
    widgets.errors_stack.add_named(&error_clamp, Some("list"));
    widgets.errors_stack.set_visible_child_name("empty");
    widgets.errors_stack.set_vexpand(true);

    page.append(&widgets.errors_stack);
    page
}

fn build_upcoming_page(widgets: &Rc<Widgets>) -> gtk::Box {
    let page = gtk::Box::builder()
        .orientation(gtk::Orientation::Vertical)
        .spacing(8)
        .build();

    widgets.upcoming_label.add_css_class("heading");
    widgets.upcoming_label.set_halign(gtk::Align::Center);
    widgets.upcoming_label.set_margin_top(12);

    widgets.upcoming_list.set_css_classes(&["boxed-list"]);
    widgets
        .upcoming_list
        .set_selection_mode(gtk::SelectionMode::None);

    let scroll = gtk::ScrolledWindow::builder()
        .hscrollbar_policy(gtk::PolicyType::Never)
        .vscrollbar_policy(gtk::PolicyType::Automatic)
        .child(&widgets.upcoming_list)
        .vexpand(true)
        .build();

    let clamp = adw::Clamp::builder()
        .maximum_size(900)
        .child(&scroll)
        .vexpand(true)
        .margin_start(12)
        .margin_end(12)
        .build();

    page.append(&widgets.upcoming_label);
    page.append(&clamp);
    page
}

fn build_logs_page(widgets: &Rc<Widgets>, state: &Rc<RefCell<AppState>>) -> gtk::Box {
    let page = gtk::Box::builder()
        .orientation(gtk::Orientation::Vertical)
        .spacing(8)
        .build();

    // Search and filter bar
    let filter_bar = gtk::Box::builder()
        .orientation(gtk::Orientation::Horizontal)
        .spacing(8)
        .margin_top(8)
        .margin_start(12)
        .margin_end(12)
        .build();

    widgets.logs_search.set_hexpand(true);
    widgets
        .logs_search
        .set_placeholder_text(Some("Search logs..."));
    filter_bar.append(&widgets.logs_search);

    let filter_box = gtk::Box::builder()
        .orientation(gtk::Orientation::Horizontal)
        .css_classes(["linked"])
        .build();

    let mut first_log_btn: Option<gtk::ToggleButton> = None;
    for (label, filter) in [
        ("All", LogFilter::All),
        ("Errors", LogFilter::Errors),
        ("Warnings", LogFilter::Warnings),
        ("Info", LogFilter::Info),
    ] {
        let btn = gtk::ToggleButton::builder().label(label).build();
        if let Some(ref first) = first_log_btn {
            btn.set_group(Some(first));
        } else {
            first_log_btn = Some(btn.clone());
        }
        if filter == LogFilter::All {
            btn.set_active(true);
        }

        btn.connect_toggled(clone!(
            #[strong]
            state,
            #[strong]
            widgets,
            move |btn| {
                if btn.is_active() {
                    state.borrow_mut().log_filter = filter;
                    let s = state.borrow();
                    update_logs_view(&s, &widgets);
                }
            }
        ));

        filter_box.append(&btn);
    }

    filter_bar.append(&filter_box);
    page.append(&filter_bar);

    // Search handler
    widgets.logs_search.connect_search_changed(clone!(
        #[strong]
        state,
        #[strong]
        widgets,
        move |entry| {
            state.borrow_mut().log_search = entry.text().to_string();
            let s = state.borrow();
            update_logs_view(&s, &widgets);
        }
    ));

    let hint = gtk::Label::builder()
        .label("Newest entries first")
        .css_classes(["dim-label", "caption"])
        .halign(gtk::Align::Start)
        .margin_start(12)
        .build();
    page.append(&hint);

    // Log text view
    let text_view = gtk::TextView::builder()
        .buffer(&widgets.logs_buffer)
        .editable(false)
        .monospace(true)
        .wrap_mode(gtk::WrapMode::WordChar)
        .top_margin(8)
        .bottom_margin(8)
        .left_margin(8)
        .right_margin(8)
        .vexpand(true)
        .build();

    let scroll = gtk::ScrolledWindow::builder()
        .hscrollbar_policy(gtk::PolicyType::Never)
        .vscrollbar_policy(gtk::PolicyType::Automatic)
        .child(&text_view)
        .vexpand(true)
        .margin_start(12)
        .margin_end(12)
        .margin_bottom(12)
        .build();

    page.append(&scroll);
    page
}

fn build_config_page(widgets: &Rc<Widgets>) -> gtk::Box {
    let page = gtk::Box::builder()
        .orientation(gtk::Orientation::Vertical)
        .spacing(8)
        .build();

    let scroll = gtk::ScrolledWindow::builder()
        .hscrollbar_policy(gtk::PolicyType::Never)
        .vscrollbar_policy(gtk::PolicyType::Automatic)
        .child(&widgets.config_box)
        .vexpand(true)
        .margin_top(12)
        .margin_start(12)
        .margin_end(12)
        .margin_bottom(12)
        .build();

    let clamp = adw::Clamp::builder()
        .maximum_size(800)
        .child(&scroll)
        .vexpand(true)
        .build();

    page.append(&clamp);
    page
}

// ============================================================================
// Keyboard Handling
// ============================================================================

fn handle_key_press(
    key: gtk::gdk::Key,
    modifier: gtk::gdk::ModifierType,
    state: &Rc<RefCell<AppState>>,
    widgets: &Rc<Widgets>,
    settings: &Rc<RefCell<AppSettings>>,
    window: &adw::ApplicationWindow,
) -> bool {
    let ctrl = modifier.contains(gtk::gdk::ModifierType::CONTROL_MASK);

    match key {
        gtk::gdk::Key::r if ctrl => {
            trigger_refresh(state, widgets, settings);
            widgets.show_toast("Refreshing...");
            true
        }
        gtk::gdk::Key::d if ctrl => {
            let api_url = settings.borrow().api_url.clone();
            do_action(
                &api_url,
                |url| api::start_downloads(&url, 3),
                widgets,
                state,
                settings,
            );
            true
        }
        gtk::gdk::Key::n if ctrl => {
            show_add_urls_dialog(window, widgets, state, settings);
            true
        }
        gtk::gdk::Key::question => {
            show_keyboard_help(window);
            true
        }
        _ => false,
    }
}

// ============================================================================
// UI Building
// ============================================================================

fn build_ui(app: &adw::Application) {
    load_css();

    let settings = Rc::new(RefCell::new(load_settings()));
    let state = Rc::new(RefCell::new(AppState::default()));

    // Create all shared widgets
    let widgets = Rc::new(Widgets {
        toast_overlay: adw::ToastOverlay::new(),
        pending_label: gtk::Label::new(Some("0")),
        downloading_label: gtk::Label::new(Some("0")),
        success_label: gtk::Label::new(Some("0")),
        error_count_label: gtk::Label::new(Some("0")),
        system_label: gtk::Label::new(Some("")),
        downloads_list: gtk::ListBox::new(),
        downloads_count_label: gtk::Label::new(Some("")),
        downloads_search: gtk::SearchEntry::new(),
        pagination_label: gtk::Label::new(Some("")),
        prev_button: gtk::Button::new(),
        next_button: gtk::Button::new(),
        upcoming_list: gtk::ListBox::new(),
        upcoming_label: gtk::Label::new(Some("Up Next")),
        errors_list: gtk::ListBox::new(),
        errors_stack: gtk::Stack::new(),
        logs_buffer: gtk::TextBuffer::new(None),
        logs_search: gtk::SearchEntry::new(),
        config_box: gtk::Box::builder()
            .orientation(gtk::Orientation::Vertical)
            .spacing(12)
            .build(),
    });

    // Build pages
    let downloads_page = build_downloads_page(&widgets, &state, &settings);
    let upcoming_page = build_upcoming_page(&widgets);
    let errors_page = build_errors_page(&widgets, &state, &settings);
    let logs_page = build_logs_page(&widgets, &state);
    let config_page = build_config_page(&widgets);

    // View stack
    let view_stack = adw::ViewStack::new();
    view_stack.add_titled_with_icon(
        &downloads_page,
        Some("downloads"),
        "Downloads",
        "folder-download-symbolic",
    );
    view_stack.add_titled_with_icon(
        &upcoming_page,
        Some("upcoming"),
        "Up Next",
        "view-list-ordered-symbolic",
    );
    view_stack.add_titled_with_icon(
        &errors_page,
        Some("errors"),
        "Errors",
        "dialog-error-symbolic",
    );
    view_stack.add_titled_with_icon(
        &logs_page,
        Some("logs"),
        "Logs",
        "utilities-terminal-symbolic",
    );
    view_stack.add_titled_with_icon(
        &config_page,
        Some("config"),
        "Config",
        "emblem-system-symbolic",
    );

    // Header bar with view switcher
    let switcher = adw::ViewSwitcher::builder()
        .stack(&view_stack)
        .policy(adw::ViewSwitcherPolicy::Wide)
        .build();

    let add_btn = gtk::Button::builder()
        .icon_name("list-add-symbolic")
        .tooltip_text("Add URLs (Ctrl+N)")
        .build();

    let refresh_btn = gtk::Button::builder()
        .icon_name("view-refresh-symbolic")
        .tooltip_text("Refresh (Ctrl+R)")
        .build();

    let settings_btn = gtk::Button::builder()
        .icon_name("emblem-system-symbolic")
        .tooltip_text("Settings")
        .build();

    let header = adw::HeaderBar::new();
    header.set_title_widget(Some(&switcher));
    header.pack_start(&add_btn);
    header.pack_end(&settings_btn);
    header.pack_end(&refresh_btn);

    // Assemble main layout
    let toolbar_view = adw::ToolbarView::new();
    toolbar_view.add_top_bar(&header);
    toolbar_view.set_content(Some(&view_stack));

    widgets.toast_overlay.set_child(Some(&toolbar_view));

    let window = adw::ApplicationWindow::builder()
        .application(app)
        .title(WINDOW_TITLE)
        .default_width(WINDOW_WIDTH)
        .default_height(WINDOW_HEIGHT)
        .content(&widgets.toast_overlay)
        .build();

    // Connect signals
    add_btn.connect_clicked(clone!(
        #[strong]
        widgets,
        #[strong]
        state,
        #[strong]
        settings,
        #[strong]
        window,
        move |_| {
            show_add_urls_dialog(&window, &widgets, &state, &settings);
        }
    ));

    refresh_btn.connect_clicked(clone!(
        #[strong]
        state,
        #[strong]
        widgets,
        #[strong]
        settings,
        move |_| {
            trigger_refresh(&state, &widgets, &settings);
            widgets.show_toast("Refreshing...");
        }
    ));

    settings_btn.connect_clicked(clone!(
        #[strong]
        settings,
        #[strong]
        widgets,
        #[strong]
        state,
        #[strong]
        window,
        move |_| {
            show_settings_dialog(&window, &settings, &widgets, &state);
        }
    ));

    // Keyboard handler
    let key_controller = gtk::EventControllerKey::new();
    key_controller.connect_key_pressed(clone!(
        #[strong]
        state,
        #[strong]
        widgets,
        #[strong]
        settings,
        #[strong]
        window,
        move |_, key, _, modifier| {
            if handle_key_press(key, modifier, &state, &widgets, &settings, &window) {
                glib::Propagation::Stop
            } else {
                glib::Propagation::Proceed
            }
        }
    ));
    window.add_controller(key_controller);

    // Initial data load
    trigger_refresh(&state, &widgets, &settings);

    // Auto-refresh timer
    glib::timeout_add_seconds_local(
        REFRESH_INTERVAL_SECS,
        clone!(
            #[strong]
            state,
            #[strong]
            widgets,
            #[strong]
            settings,
            move || {
                trigger_refresh(&state, &widgets, &settings);
                glib::ControlFlow::Continue
            }
        ),
    );

    window.present();
}

fn main() -> glib::ExitCode {
    let app = adw::Application::builder().application_id(APP_ID).build();
    app.connect_activate(build_ui);
    app.run()
}
