use serde::{Deserialize, Serialize};
use arboard::Clipboard;
use rdev::{simulate, EventType, Key};
use std::thread::sleep;
use std::time::Duration;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TargetSnapshot {
    pub timestamp_ms: u64,
    pub platform_app_id: Option<String>,
    pub app_pid: Option<u32>,
    pub window_title: Option<String>,
    pub is_secure_input: bool,
}

impl TargetSnapshot {
    pub fn capture_current() -> Self {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64;

        let (platform_app_id, app_pid, window_title, is_secure_input) = get_active_app_metadata();

        Self {
            timestamp_ms: now,
            platform_app_id,
            app_pid,
            window_title,
            is_secure_input,
        }
    }

    pub fn is_destination_match(&self, current_app: Option<&str>, current_pid: Option<u32>, current_window: Option<&str>) -> bool {
        // Exclude internal VoxQuest windows
        if let Some(curr) = current_app {
            let lower = curr.to_lowercase();
            if lower.contains("voxquest") || lower.contains("tauri") {
                return false;
            }
        }

        // Strict application name check
        if let (Some(ref original), Some(curr)) = (&self.platform_app_id, current_app) {
            if !original.eq_ignore_ascii_case(curr) {
                return false;
            }
        }

        // Process ID check when available
        if let (Some(orig_pid), Some(curr_pid)) = (self.app_pid, current_pid) {
            if orig_pid != curr_pid {
                return false;
            }
        }

        // Window title check within same application if title is defined
        if let (Some(ref orig_win), Some(curr_win)) = (&self.window_title, current_window) {
            if !orig_win.trim().is_empty() && !curr_win.trim().is_empty() && orig_win != curr_win {
                return false;
            }
        }

        true
    }

    pub fn is_destination_safe(&self) -> bool {
        if self.is_secure_input {
            // Protected/password inputs must never be targeted automatically
            return false;
        }

        let (current_app, current_pid, current_window, is_secure) = get_active_app_metadata();
        if is_secure {
            return false;
        }

        self.is_destination_match(current_app.as_deref(), current_pid, current_window.as_deref())
    }
}

#[cfg(target_os = "macos")]
fn get_active_app_metadata() -> (Option<String>, Option<u32>, Option<String>, bool) {
    use std::process::Command;

    // Fast native AppleScript query using single osascript execution
    let script = r#"
    tell application "System Events"
        set frontApp to first application process whose frontmost is true
        set pName to name of frontApp
        set pPid to unix id of frontApp
        set winTitle to ""
        try
            set winTitle to name of front window of frontApp
        end try
        set isSecure to false
        try
            set focusedElem to (first UI element of frontApp whose value of attribute "AXFocused" is true)
            if (value of attribute "AXRole" of focusedElem is "AXSecureTextField") then
                set isSecure to true
            end if
        end try
        return pName & ":::" & pPid & ":::" & winTitle & ":::" & isSecure
    end tell
    "#;

    let output = Command::new("osascript")
        .args(&["-e", script])
        .output();

    if let Ok(out) = output {
        if out.status.success() {
            let res = String::from_utf8_lossy(&out.stdout).trim().to_string();
            let parts: Vec<&str> = res.split(":::").collect();
            if parts.len() >= 4 {
                let p_name = if !parts[0].trim().is_empty() { Some(parts[0].trim().to_string()) } else { None };
                let p_pid = parts[1].trim().parse::<u32>().ok();
                let win_title = if !parts[2].trim().is_empty() { Some(parts[2].trim().to_string()) } else { None };
                let is_secure = parts[3].trim() == "true";
                return (p_name, p_pid, win_title, is_secure);
            }
        }
    }

    (None, None, None, false)
}

#[cfg(not(target_os = "macos"))]
fn get_active_app_metadata() -> (Option<String>, Option<u32>, Option<String>, bool) {
    (None, None, None, false)
}

pub fn insert_text_safely(text: &str, snapshot: &TargetSnapshot) -> Result<bool, String> {
    if !snapshot.is_destination_safe() {
        return Err("Destination safety check triggered: active window or application changed during dictation. Transcript preserved for recovery.".to_string());
    }

    if text.trim().is_empty() {
        return Ok(true);
    }

    let mut clipboard = Clipboard::new().map_err(|e| format!("Clipboard access failed: {}", e))?;

    // Preserve previous clipboard state
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

    // Safely restore clipboard after delay
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
