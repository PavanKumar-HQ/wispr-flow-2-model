use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{AppHandle, Manager};

#[cfg(target_os = "macos")]
use objc::{msg_send, sel, sel_impl};

pub static TRAY_EXPANDED: AtomicBool = AtomicBool::new(false);
pub static PILL_HOVERED: AtomicBool = AtomicBool::new(false);
pub static PILL_PERSISTENT: AtomicBool = AtomicBool::new(false);

pub fn clamp_pill_position_internal(w: &tauri::WebviewWindow) {
    if let Ok(Some(monitor)) = w.current_monitor().or_else(|_| w.primary_monitor()) {
        let scale = monitor.scale_factor();
        let screen_w = monitor.size().width as f64 / scale;
        let screen_h = monitor.size().height as f64 / scale;
        if let Ok(pos) = w.outer_position() {
            let current_x = pos.x as f64 / scale;
            let current_y = pos.y as f64 / scale;

            let win_w = if let Ok(sz) = w.outer_size() {
                sz.width as f64 / scale
            } else {
                380.0
            };

            // Strict hardware display boundaries:
            // Top: MUST stay safely below Apple camera notch and menu bar (min y: 44.0)
            // Bottom: MUST stay comfortably above the macOS Dock with clean air gap (max y: screen_h - 165.0)
            // Sides: keep on screen with at least 10px margin
            let min_y = 44.0;
            let max_y = (screen_h - 165.0).max(min_y);
            let min_x = 10.0;
            let max_x = (screen_w - win_w - 10.0).max(min_x);

            let clamped_x = current_x.clamp(min_x, max_x);
            let clamped_y = current_y.clamp(min_y, max_y);

            if (clamped_x - current_x).abs() > 1.0 || (clamped_y - current_y).abs() > 1.0 {
                let _ = w.set_position(tauri::Position::Logical(tauri::LogicalPosition::new(clamped_x, clamped_y)));
            }
        }
    }
}

#[tauri::command]
pub fn clamp_pill_position_cmd(app: AppHandle) -> Result<(), String> {
    let app_handle = app.clone();
    crate::run_on_main_thread(move || {
        if let Some(w) = app_handle.get_webview_window("floating-indicator") {
            clamp_pill_position_internal(&w);
        }
    });
    Ok(())
}

#[tauri::command]
pub fn show_pill_window(app: AppHandle) -> Result<(), String> {
    PILL_PERSISTENT.store(true, Ordering::SeqCst);
    let app_handle = app.clone();
    crate::run_on_main_thread(move || {
        if let Some(w) = app_handle.get_webview_window("floating-indicator") {
            #[cfg(target_os = "macos")]
            if let Ok(ns_win) = w.ns_window() {
                use cocoa::base::id;
                let ns_win = ns_win as id;
                unsafe {
                    let () = objc::msg_send![ns_win, orderFrontRegardless];
                }
            } else {
                let _ = w.show();
            }
            #[cfg(not(target_os = "macos"))]
            let _ = w.show();
            let _ = w.set_always_on_top(true);
            clamp_pill_position_internal(&w);
        }
    });
    Ok(())
}

#[tauri::command]
pub fn set_pill_hovered(hovered: bool) {
    PILL_HOVERED.store(hovered, Ordering::SeqCst);
}

#[tauri::command]
pub fn set_pill_persistent(persistent: bool) {
    PILL_PERSISTENT.store(persistent, Ordering::SeqCst);
}

#[tauri::command]
pub fn get_pill_persistent() -> bool {
    PILL_PERSISTENT.load(Ordering::SeqCst)
}

#[tauri::command]
pub fn resize_pill_window(app: AppHandle, expanded: bool, direction: Option<String>) -> Result<(), String> {
    TRAY_EXPANDED.store(expanded, Ordering::SeqCst);
    let app_handle = app.clone();
    crate::run_on_main_thread(move || {
        if let Some(w) = app_handle.get_webview_window("floating-indicator") {
            #[cfg(target_os = "macos")]
            if let Ok(ns_win) = w.ns_window() {
                use cocoa::appkit::{NSColor, NSWindow};
                use cocoa::base::{id, nil, NO};
                let ns_win = ns_win as id;
                unsafe {
                    ns_win.setOpaque_(NO);
                    ns_win.setBackgroundColor_(NSColor::clearColor(nil));
                    ns_win.setHasShadow_(NO);
                }
            }
            let target_w = if expanded { 480.0 } else { 380.0 };
            let target_h = if expanded { 745.0 } else { 105.0 };

            if let Ok(pos) = w.outer_position() {
                if let Ok(Some(monitor)) = w.current_monitor() {
                    let scale = monitor.scale_factor();
                    let screen_h = monitor.size().height as f64 / scale;
                    let current_x = pos.x as f64 / scale;
                    let current_y = pos.y as f64 / scale;

                    let dir = direction.unwrap_or_else(|| {
                        if current_y > (screen_h / 2.0) { "up".to_string() } else { "down".to_string() }
                    });

                    // Keep horizontal center aligned during expansion and collapse
                    let current_w = if let Ok(sz) = w.outer_size() { sz.width as f64 / scale } else { 380.0 };
                    let adjusted_x = (current_x + (current_w - target_w) / 2.0).max(10.0);

                    if expanded {
                        if dir == "up" {
                            let delta = target_h - 105.0;
                            let new_y = (current_y - delta).max(44.0);
                            let _ = w.set_position(tauri::Position::Logical(tauri::LogicalPosition::new(adjusted_x, new_y)));
                        } else {
                            // Top camera notch: keep y pinned at 44px, expand smoothly downwards
                            let _ = w.set_position(tauri::Position::Logical(tauri::LogicalPosition::new(adjusted_x, 44.0)));
                        }
                    } else {
                        if dir == "up" {
                            let delta = 745.0 - 70.0;
                            let new_y = (current_y + delta).min(screen_h - 165.0);
                            let _ = w.set_position(tauri::Position::Logical(tauri::LogicalPosition::new(adjusted_x, new_y)));
                        } else {
                            let _ = w.set_position(tauri::Position::Logical(tauri::LogicalPosition::new(adjusted_x, 44.0)));
                        }
                    }
                }
            }
            let _ = w.set_size(tauri::Size::Logical(tauri::LogicalSize::new(target_w, target_h)));
        }
    });
    Ok(())
}

#[tauri::command]
pub fn center_pill_window(app: AppHandle) -> Result<(), String> {
    let app_handle = app.clone();
    crate::run_on_main_thread(move || {
        if let Some(w) = app_handle.get_webview_window("floating-indicator") {
            #[cfg(target_os = "macos")]
            if let Ok(ns_win) = w.ns_window() {
                use cocoa::appkit::{NSColor, NSWindow};
                use cocoa::base::{id, nil, NO};
                let ns_win = ns_win as id;
                unsafe {
                    ns_win.setOpaque_(NO);
                    ns_win.setBackgroundColor_(NSColor::clearColor(nil));
                    ns_win.setHasShadow_(NO);
                    let () = objc::msg_send![ns_win, orderFrontRegardless];
                }
            } else {
                let _ = w.show();
            }
            #[cfg(not(target_os = "macos"))]
            let _ = w.show();

            let _ = w.set_always_on_top(true);
            if let Ok(Some(monitor)) = w.primary_monitor() {
                let size = monitor.size();
                let scale = monitor.scale_factor();
                let screen_w = size.width as f64 / scale;
                let screen_h = size.height as f64 / scale;
                let x = (screen_w - 380.0) / 2.0;
                // Pop it up safely hovering comfortably above the macOS Dock
                let y = (screen_h - 165.0).max(44.0);
                let _ = w.set_position(tauri::Position::Logical(tauri::LogicalPosition::new(x, y)));
            }
            clamp_pill_position_internal(&w);
        }
    });
    Ok(())
}

#[tauri::command]
pub fn set_pill_dock_position(app: AppHandle, position: String) -> Result<(), String> {
    let app_handle = app.clone();
    let pos_mode = position.clone();
    crate::run_on_main_thread(move || {
        if let Some(w) = app_handle.get_webview_window("floating-indicator") {
            #[cfg(target_os = "macos")]
            if let Ok(ns_win) = w.ns_window() {
                use cocoa::appkit::{NSColor, NSWindow};
                use cocoa::base::{id, nil, NO};
                let ns_win = ns_win as id;
                unsafe {
                    ns_win.setOpaque_(NO);
                    ns_win.setBackgroundColor_(NSColor::clearColor(nil));
                    ns_win.setHasShadow_(NO);
                    let () = objc::msg_send![ns_win, orderFrontRegardless];
                }
            } else {
                let _ = w.show();
            }
            #[cfg(not(target_os = "macos"))]
            let _ = w.show();

            let _ = w.set_always_on_top(true);
            if let Ok(Some(monitor)) = w.primary_monitor() {
                let size = monitor.size();
                let scale = monitor.scale_factor();
                let screen_w = size.width as f64 / scale;
                let screen_h = size.height as f64 / scale;
                let x = (screen_w - 480.0) / 2.0;
                let y = if pos_mode == "top" {
                    46.0
                } else {
                    (screen_h - 130.0).max(46.0)
                };
                let _ = w.set_position(tauri::Position::Logical(tauri::LogicalPosition::new(x, y)));
            }
            clamp_pill_position_internal(&w);
        }
    });
    Ok(())
}

#[tauri::command]
pub fn hide_pill_window(app: AppHandle) -> Result<(), String> {
    if PILL_PERSISTENT.load(Ordering::SeqCst) || PILL_HOVERED.load(Ordering::SeqCst) {
        return Ok(());
    }
    let app_handle = app.clone();
    crate::run_on_main_thread(move || {
        if let Some(w) = app_handle.get_webview_window("floating-indicator") {
            let _ = w.hide();
        }
    });
    Ok(())
}
