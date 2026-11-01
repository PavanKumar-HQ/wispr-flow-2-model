use serde::{Deserialize, Serialize};
use arboard::Clipboard;
use rdev::{simulate, EventType, Key};
use std::thread::sleep;
use std::time::Duration;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TargetSnapshot {
    pub timestamp_ms: u64,
    pub platform_app_id: Option<String>,
    pub window_title: Option<String>,
}

impl TargetSnapshot {
    pub fn capture_current() -> Self {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64;

        let (platform_app_id, window_title) = get_active_app_info();

        Self {
            timestamp_ms: now,
            platform_app_id,
            window_title,
        }
    }

    pub fn is_destination_match(&self, current_app: Option<&str>, current_window: Option<&str>) -> bool {
        if let Some(curr) = current_app {
            let lower = curr.to_lowercase();
            if lower.contains("voxquest") || lower.contains("tauri") {
                return false;
            }
        }

        if let (Some(ref original), Some(curr)) = (&self.platform_app_id, current_app) {
            if original != curr {
                return false;
            }
        }

        // Focus changes within same application where window title is detectable
        if let (Some(ref orig_win), Some(curr_win)) = (&self.window_title, current_window) {
            if !orig_win.is_empty() && !curr_win.is_empty() && orig_win != curr_win {
                return false;
            }
        }

        true
    }

    pub fn is_destination_safe(&self) -> bool {
        let (current_app, current_window) = get_active_app_info();
        self.is_destination_match(current_app.as_deref(), current_window.as_deref())
    }
}

#[cfg(target_os = "macos")]
fn get_active_app_info() -> (Option<String>, Option<String>) {
    use std::process::Command;
    let output = Command::new("osascript")
        .args(&[
            "-e",
            "tell application \"System Events\" to get name of first application process whose frontmost is true",
        ])
        .output();

    if let Ok(out) = output {
        if out.status.success() {
            let name = String::from_utf8_lossy(&out.stdout).trim().to_string();
            return (Some(name.clone()), Some(name));
        }
    }
    (None, None)
}

#[cfg(not(target_os = "macos"))]
fn get_active_app_info() -> (Option<String>, Option<String>) {
    (None, None)
}

pub fn insert_text_safely(text: &str, snapshot: &TargetSnapshot) -> Result<bool, String> {
    if !snapshot.is_destination_safe() {
        return Err("Destination safety check triggered: active window changed during speech processing. Transcript saved to history.".to_string());
    }

    if text.trim().is_empty() {
        return Ok(true);
    }

    let mut clipboard = Clipboard::new().map_err(|e| format!("Clipboard access failed: {}", e))?;

    let previous_clipboard = clipboard.get_text().ok();

    clipboard.set_text(text).map_err(|e| format!("Failed to set clipboard: {}", e))?;

    sleep(Duration::from_millis(50));

    #[cfg(target_os = "macos")]
    {
        simulate(&EventType::KeyPress(Key::MetaLeft)).map_err(|e| format!("Key press error: {:?}", e))?;
        simulate(&EventType::KeyPress(Key::KeyV)).map_err(|e| format!("Key press error: {:?}", e))?;
        simulate(&EventType::KeyRelease(Key::KeyV)).map_err(|e| format!("Key release error: {:?}", e))?;
        simulate(&EventType::KeyRelease(Key::MetaLeft)).map_err(|e| format!("Key release error: {:?}", e))?;
    }

    #[cfg(not(target_os = "macos"))]
    {
        simulate(&EventType::KeyPress(Key::ControlLeft)).map_err(|e| format!("Key press error: {:?}", e))?;
        simulate(&EventType::KeyPress(Key::KeyV)).map_err(|e| format!("Key press error: {:?}", e))?;
        simulate(&EventType::KeyRelease(Key::KeyV)).map_err(|e| format!("Key release error: {:?}", e))?;
        simulate(&EventType::KeyRelease(Key::ControlLeft)).map_err(|e| format!("Key release error: {:?}", e))?;
    }

    if let Some(prev) = previous_clipboard {
        let prev_clone = prev.clone();
        std::thread::spawn(move || {
            sleep(Duration::from_millis(400));
            if let Ok(mut cb) = Clipboard::new() {
                let _ = cb.set_text(&prev_clone);
            }
        });
    }

    Ok(true)
}
