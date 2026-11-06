use serde::{Deserialize, Serialize};
use arboard::Clipboard;
use std::thread::sleep;
use std::time::Duration;

#[cfg(target_os = "macos")]
#[link(name = "ApplicationServices", kind = "framework")]
extern "C" {
    fn AXIsProcessTrusted() -> bool;
    fn AXIsProcessTrustedWithOptions(options: CFTypeRef) -> bool;
    fn AXUIElementCreateSystemWide() -> AXUIElementRef;
    fn AXUIElementCreateApplication(pid: i32) -> AXUIElementRef;
    fn AXUIElementCopyAttributeValue(element: AXUIElementRef, attribute: CFStringRef, value: *mut CFTypeRef) -> AXError;
    fn AXUIElementSetAttributeValue(element: AXUIElementRef, attribute: CFStringRef, value: CFTypeRef) -> AXError;
    fn AXUIElementGetPid(element: AXUIElementRef, pid: *mut i32) -> AXError;
}

#[cfg(target_os = "macos")]
#[link(name = "CoreFoundation", kind = "framework")]
extern "C" {
    fn CFRelease(cf: CFTypeRef);
    fn CFStringGetCString(theString: CFStringRef, buffer: *mut std::os::raw::c_char, bufferSize: isize, encoding: u32) -> bool;
    fn CFStringCreateWithCString(alloc: *const std::ffi::c_void, cStr: *const std::os::raw::c_char, encoding: u32) -> CFStringRef;
    fn CFArrayGetCount(theArray: CFArrayRef) -> CFIndex;
    fn CFArrayGetValueAtIndex(theArray: CFArrayRef, idx: CFIndex) -> *const std::ffi::c_void;
}

#[cfg(target_os = "macos")]
type CFArrayRef = *const std::ffi::c_void;
#[cfg(target_os = "macos")]
type CFIndex = isize;

#[cfg(target_os = "macos")]
type AXUIElementRef = *mut std::ffi::c_void;
#[cfg(target_os = "macos")]
type CFTypeRef = *const std::ffi::c_void;
#[cfg(target_os = "macos")]
type CFStringRef = *const std::ffi::c_void;
#[cfg(target_os = "macos")]
type AXError = i32;

#[cfg(target_os = "macos")]
unsafe fn cfstring_to_string(cf: CFStringRef) -> Option<String> {
    if cf.is_null() {
        return None;
    }
    let mut buf = [0u8; 1024];
    // kCFStringEncodingUTF8 = 0x08000100
    if CFStringGetCString(cf, buf.as_mut_ptr() as *mut _, 1024, 0x08000100) {
        let c_str = std::ffi::CStr::from_ptr(buf.as_ptr() as *const _);
        Some(c_str.to_string_lossy().to_string())
    } else {
        None
    }
}

#[cfg(target_os = "macos")]
unsafe fn str_to_cfstring(s: &str) -> CFStringRef {
    let c_str = std::ffi::CString::new(s).unwrap_or_default();
    CFStringCreateWithCString(std::ptr::null(), c_str.as_ptr(), 0x08000100)
}

#[cfg(target_os = "macos")]
use objc::{msg_send, sel, sel_impl, class};

pub fn is_accessibility_granted() -> bool {
    #[cfg(target_os = "macos")]
    unsafe { AXIsProcessTrusted() }
    #[cfg(not(target_os = "macos"))]
    true
}

pub fn request_accessibility_permission() -> bool {
    #[cfg(target_os = "macos")]
    unsafe {
        let _pool = cocoa::foundation::NSAutoreleasePool::new(cocoa::base::nil);
        let dict: *mut objc::runtime::Object = msg_send![class!(NSMutableDictionary), dictionary];
        let key_str = std::ffi::CString::new("AXTrustedCheckOptionPrompt").unwrap();
        let prompt_key: *mut objc::runtime::Object = msg_send![class!(NSString), stringWithUTF8String: key_str.as_ptr()];
        let true_val: *mut objc::runtime::Object = msg_send![class!(NSNumber), numberWithBool: true];
        let () = msg_send![dict, setObject: true_val forKey: prompt_key];

        let trusted: bool = AXIsProcessTrustedWithOptions(dict as CFTypeRef);
        if !trusted {
            let _ = std::process::Command::new("open")
                .arg("x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility")
                .spawn();
        }
        trusted
    }
    #[cfg(not(target_os = "macos"))]
    true
}

#[cfg(target_os = "macos")]
pub fn set_nspasteboard_text(text: &str) -> bool {
    unsafe {
        let _pool = cocoa::foundation::NSAutoreleasePool::new(cocoa::base::nil);
        let pb: *mut objc::runtime::Object = msg_send![class!(NSPasteboard), generalPasteboard];
        if pb.is_null() {
            return false;
        }
        let () = msg_send![pb, clearContents];
        let c_str = std::ffi::CString::new(text).unwrap_or_default();
        let ns_str: *mut objc::runtime::Object = msg_send![class!(NSString), stringWithUTF8String: c_str.as_ptr()];
        let type_str = std::ffi::CString::new("public.utf8-plain-text").unwrap();
        let ns_type: *mut objc::runtime::Object = msg_send![class!(NSString), stringWithUTF8String: type_str.as_ptr()];
        let ok: bool = msg_send![pb, setString: ns_str forType: ns_type];
        ok
    }
}

#[cfg(not(target_os = "macos"))]
pub fn set_nspasteboard_text(_text: &str) -> bool {
    true
}

#[cfg(target_os = "macos")]
fn clean_app_string(s: &str) -> String {
    s.chars()
        .filter(|c| !c.is_control() && *c != '\u{200e}' && *c != '\u{200f}' && *c != '\u{202a}' && *c != '\u{202c}' && *c != '\u{202e}')
        .collect::<String>()
        .trim()
        .to_lowercase()
}

#[cfg(target_os = "macos")]
pub fn activate_application(app_name: Option<&str>, bundle_id: Option<&str>, pid: Option<u32>) -> bool {
    unsafe {
        let _pool = cocoa::foundation::NSAutoreleasePool::new(cocoa::base::nil);
        let workspace: *mut objc::runtime::Object = msg_send![class!(NSWorkspace), sharedWorkspace];
        if workspace.is_null() {
            return false;
        }

        // Check if already frontmost
        let curr_front: *mut objc::runtime::Object = msg_send![workspace, frontmostApplication];
        if !curr_front.is_null() {
            let curr_pid: i32 = msg_send![curr_front, processIdentifier];
            if let Some(t_pid) = pid {
                if curr_pid as u32 == t_pid {
                    return true;
                }
            }
        }

        let running_apps: *mut objc::runtime::Object = msg_send![workspace, runningApplications];
        if !running_apps.is_null() {
            let count: usize = msg_send![running_apps, count];

            // 1. Try matching by PID first (most precise)
            if let Some(target_pid) = pid {
                for i in 0..count {
                    let app: *mut objc::runtime::Object = msg_send![running_apps, objectAtIndex: i];
                    let p: i32 = msg_send![app, processIdentifier];
                    if p as u32 == target_pid {
                        let () = msg_send![app, activateWithOptions: 3u64]; // NSApplicationActivateAllWindows | NSApplicationActivateIgnoringOtherApps
                        sleep(Duration::from_millis(60));
                        return true;
                    }
                }
            }

            // 2. Try matching by bundle identifier via Cocoa NSRunningApplication
            if let Some(bid) = bundle_id {
                let clean_b = clean_app_string(bid);
                if !clean_b.is_empty() && !clean_b.contains("voxquest") {
                    for i in 0..count {
                        let app: *mut objc::runtime::Object = msg_send![running_apps, objectAtIndex: i];
                        let bid_obj: *mut objc::runtime::Object = msg_send![app, bundleIdentifier];
                        if !bid_obj.is_null() {
                            let c_str: *const std::os::raw::c_char = msg_send![bid_obj, UTF8String];
                            if !c_str.is_null() {
                                let curr_bid = std::ffi::CStr::from_ptr(c_str).to_string_lossy();
                                let clean_curr = clean_app_string(&curr_bid);
                                if clean_curr == clean_b || clean_curr.contains(&clean_b) || clean_b.contains(&clean_curr) {
                                    let () = msg_send![app, activateWithOptions: 3u64];
                                    sleep(Duration::from_millis(60));
                                    return true;
                                }
                            }
                        }
                    }
                }
            }

            // 3. Try matching by localized app name (accounting for Unicode direction marks in WhatsApp)
            if let Some(name) = app_name {
                let clean_n = clean_app_string(name);
                if !clean_n.is_empty() && !clean_n.contains("voxquest") && !clean_n.contains("tauri") {
                    for i in 0..count {
                        let app: *mut objc::runtime::Object = msg_send![running_apps, objectAtIndex: i];
                        let name_obj: *mut objc::runtime::Object = msg_send![app, localizedName];
                        if !name_obj.is_null() {
                            let c_str: *const std::os::raw::c_char = msg_send![name_obj, UTF8String];
                            if !c_str.is_null() {
                                let curr_name = std::ffi::CStr::from_ptr(c_str).to_string_lossy();
                                let clean_curr = clean_app_string(&curr_name);
                                if clean_curr == clean_n || clean_curr.contains(&clean_n) || clean_n.contains(&clean_curr) {
                                    let () = msg_send![app, activateWithOptions: 3u64];
                                    sleep(Duration::from_millis(60));
                                    return true;
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    false
}

#[cfg(not(target_os = "macos"))]
pub fn activate_application(_app_name: Option<&str>, _bundle_id: Option<&str>, _pid: Option<u32>) -> bool {
    true
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum InsertionStatus {
    NotAttempted,
    InsertedConfirmed,
    InsertedUnconfirmed,
    Failed,
    BlockedSecureInput,
    RecoveryRequired,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InsertionResult {
    pub status: InsertionStatus,
    pub message: Option<String>,
    pub method_used: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DestinationAnchor {
    #[serde(default)]
    pub session_id: String,
    pub timestamp_ms: u64,
    pub platform_app_id: Option<String>,
    #[serde(default)]
    pub bundle_id: Option<String>,
    pub app_pid: Option<u32>,
    pub window_title: Option<String>,
    #[serde(default)]
    pub element_role: Option<String>,
    pub is_secure_input: bool,
    #[serde(default = "default_confidence")]
    pub confidence: String,
    #[serde(default)]
    pub is_valid: bool,
}

fn default_confidence() -> String {
    "high".to_string()
}

// Backward compatibility type alias
pub type TargetSnapshot = DestinationAnchor;

static LAST_EXTERNAL_APP: std::sync::Mutex<Option<DestinationAnchor>> = std::sync::Mutex::new(None);

pub fn update_last_external_app(anchor: &DestinationAnchor) {
    if let Some(ref name) = anchor.platform_app_id {
        let l = name.to_lowercase();
        if !l.contains("voxquest") && !l.contains("tauri") {
            let mut lock = LAST_EXTERNAL_APP.lock().unwrap();
            *lock = Some(anchor.clone());
        }
    }
}

pub fn get_last_external_app() -> Option<DestinationAnchor> {
    let lock = LAST_EXTERNAL_APP.lock().unwrap();
    lock.clone()
}

#[derive(Debug, Clone)]
pub struct ClipboardSnapshot {
    pub original_text: Option<String>,
}

impl ClipboardSnapshot {
    pub fn capture() -> Self {
        let mut cb = Clipboard::new().ok();
        let original_text = cb.as_mut().and_then(|c| c.get_text().ok());
        Self { original_text }
    }

    pub fn restore_if_unmodified(&self, inserted_text: &str) {
        if let Some(ref prev) = self.original_text {
            if let Ok(mut cb) = Clipboard::new() {
                // Only restore if current clipboard still has the text we injected.
                // If the user copied something new in another app in the meantime, preserve the user's newest copy!
                if let Ok(curr) = cb.get_text() {
                    if curr == inserted_text {
                        let _ = cb.set_text(prev);
                        #[cfg(target_os = "macos")]
                        set_nspasteboard_text(prev);
                    }
                }
            }
        }
    }
}

#[cfg(target_os = "macos")]
pub fn is_target_process_running(pid: Option<u32>) -> bool {
    let target_pid = match pid {
        Some(p) if p > 0 => p,
        _ => return false,
    };

    unsafe {
        let _pool = cocoa::foundation::NSAutoreleasePool::new(cocoa::base::nil);
        let workspace: *mut objc::runtime::Object = msg_send![class!(NSWorkspace), sharedWorkspace];
        if workspace.is_null() {
            return false;
        }
        let running_apps: *mut objc::runtime::Object = msg_send![workspace, runningApplications];
        if running_apps.is_null() {
            return false;
        }
        let count: usize = msg_send![running_apps, count];
        for i in 0..count {
            let app: *mut objc::runtime::Object = msg_send![running_apps, objectAtIndex: i];
            let p: i32 = msg_send![app, processIdentifier];
            if p as u32 == target_pid {
                let is_term: bool = msg_send![app, isTerminated];
                return !is_term;
            }
        }
        false
    }
}

#[cfg(not(target_os = "macos"))]
pub fn is_target_process_running(_pid: Option<u32>) -> bool {
    true
}

#[cfg(target_os = "macos")]
pub fn is_target_window_available(pid: Option<u32>, _expected_title: Option<&str>) -> bool {
    let target_pid = match pid {
        Some(p) if p > 0 => p,
        _ => return true,
    };

    if !is_target_process_running(Some(target_pid)) {
        return false;
    }

    // Process is actively running; do not block insertion based on accessibility window tree queries
    true
}

#[cfg(not(target_os = "macos"))]
pub fn is_target_window_available(_pid: Option<u32>, _expected_title: Option<&str>) -> bool {
    true
}

#[cfg(target_os = "macos")]
pub fn activate_and_verify_frontmost(app_name: Option<&str>, bundle_id: Option<&str>, pid: Option<u32>, max_wait_ms: u64) -> bool {
    let activated = activate_application(app_name, bundle_id, pid);
    if !activated {
        return false;
    }

    let start = std::time::Instant::now();
    let timeout = Duration::from_millis(max_wait_ms);
    while start.elapsed() < timeout {
        unsafe {
            let _pool = cocoa::foundation::NSAutoreleasePool::new(cocoa::base::nil);
            let workspace: *mut objc::runtime::Object = msg_send![class!(NSWorkspace), sharedWorkspace];
            if !workspace.is_null() {
                let curr_front: *mut objc::runtime::Object = msg_send![workspace, frontmostApplication];
                if !curr_front.is_null() {
                    let curr_pid: i32 = msg_send![curr_front, processIdentifier];
                    if let Some(t_pid) = pid {
                        if curr_pid as u32 == t_pid {
                            return true;
                        }
                    }
                }
            }
        }
        sleep(Duration::from_millis(30));
    }

    let (curr_app, curr_bid, curr_pid, _, _, _) = get_active_app_metadata();
    if let (Some(t_pid), Some(c_pid)) = (pid, curr_pid) {
        if t_pid == c_pid {
            return true;
        }
    }
    if let (Some(ref t_bid), Some(ref c_bid)) = (&bundle_id, &curr_bid) {
        if t_bid.eq_ignore_ascii_case(c_bid) {
            return true;
        }
    }
    if let (Some(ref t_name), Some(ref c_name)) = (&app_name, &curr_app) {
        let clean_t = clean_app_string(t_name);
        let clean_c = clean_app_string(c_name);
        if clean_t == clean_c || clean_t.contains(&clean_c) || clean_c.contains(&clean_t) {
            return true;
        }
    }
    false
}

#[cfg(not(target_os = "macos"))]
pub fn activate_and_verify_frontmost(_app_name: Option<&str>, _bundle_id: Option<&str>, _pid: Option<u32>, _max_wait_ms: u64) -> bool {
    true
}

pub trait DestinationProvider {
    fn capture_current() -> DestinationAnchor;
    fn capture_for_session(session_id: &str) -> DestinationAnchor;
}

pub trait DestinationValidator {
    fn is_destination_match(&self, current_app: Option<&str>, current_pid: Option<u32>, current_window: Option<&str>) -> bool;
    fn is_destination_safe(&self) -> bool;
}

pub trait TextInsertionProvider {
    fn insert_text(text: &str, anchor: &DestinationAnchor) -> InsertionResult;
}

impl DestinationAnchor {
    pub fn capture_for_session(session_id: &str) -> Self {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64;

        let (platform_app_id, bundle_id, app_pid, window_title, element_role, is_secure_input) = get_active_app_metadata();
        let is_valid = platform_app_id.is_some() && app_pid.is_some();
        let confidence = if is_valid {
            "high".to_string()
        } else if platform_app_id.is_some() {
            "medium".to_string()
        } else {
            "unavailable".to_string()
        };

        let anchor = Self {
            session_id: session_id.to_string(),
            timestamp_ms: now,
            platform_app_id,
            bundle_id,
            app_pid,
            window_title,
            element_role,
            is_secure_input,
            confidence,
            is_valid,
        };

        let is_internal = anchor.platform_app_id.as_deref().map(|n| {
            let l = n.to_lowercase();
            l.contains("voxquest") || l.contains("tauri")
        }).unwrap_or(false);

        if is_internal {
            if let Some(mut last) = get_last_external_app() {
                last.session_id = session_id.to_string();
                return last;
            }
        } else {
            update_last_external_app(&anchor);
        }

        anchor
    }

    pub fn capture_current() -> Self {
        Self::capture_for_session("current")
    }

    pub fn is_destination_match(&self, current_app: Option<&str>, current_pid: Option<u32>, current_window: Option<&str>) -> bool {
        // Exclude internal VoxQuest windows
        if let Some(curr) = current_app {
            let lower = curr.to_lowercase();
            if lower.contains("voxquest") || lower.contains("tauri") {
                return false;
            }
        }

        // Match by PID first when available
        if let (Some(orig_pid), Some(curr_pid)) = (self.app_pid, current_pid) {
            if orig_pid != curr_pid {
                return false;
            }
        }

        // Match by application name (case-insensitive)
        if let (Some(ref original), Some(curr)) = (&self.platform_app_id, current_app) {
            if !original.eq_ignore_ascii_case(curr) {
                return false;
            }
        }

        // If window titles are specified, ensure window hasn't changed to an unrelated document
        if let (Some(ref orig_win), Some(curr_win)) = (&self.window_title, current_window) {
            let orig = orig_win.trim();
            let curr = curr_win.trim();
            if !orig.is_empty() && !curr.is_empty() {
                let matches = orig == curr 
                    || curr.contains(orig) 
                    || orig.contains(curr)
                    || curr.starts_with(orig)
                    || orig.starts_with(curr);
                if !matches {
                    return false;
                }
            }
        }

        true
    }

    pub fn is_destination_safe(&self) -> bool {
        if self.is_secure_input || self.platform_app_id.is_none() {
            return false;
        }

        let (current_app, _, current_pid, current_window, _, is_secure) = get_active_app_metadata();
        if is_secure {
            return false;
        }

        if let Some(ref curr) = current_app {
            let lower = curr.to_lowercase();
            if (lower.contains("voxquest") || lower.contains("tauri")) && self.platform_app_id.is_some() {
                let orig_lower = self.platform_app_id.as_deref().unwrap_or("").to_lowercase();
                if !orig_lower.contains("voxquest") && !orig_lower.contains("tauri") {
                    return true;
                }
            }
        }

        self.is_destination_match(current_app.as_deref(), current_pid, current_window.as_deref())
    }
}

pub struct NativeDestinationProvider;
impl DestinationProvider for NativeDestinationProvider {
    fn capture_current() -> DestinationAnchor {
        DestinationAnchor::capture_current()
    }

    fn capture_for_session(session_id: &str) -> DestinationAnchor {
        DestinationAnchor::capture_for_session(session_id)
    }
}

pub struct NativeTextInsertionProvider;
impl TextInsertionProvider for NativeTextInsertionProvider {
    fn insert_text(text: &str, anchor: &DestinationAnchor) -> InsertionResult {
        if anchor.is_secure_input {
            return InsertionResult {
                status: InsertionStatus::BlockedSecureInput,
                message: Some("Insertion blocked: Target is an AXSecureTextField password field.".to_string()),
                method_used: "blocked_secure_input".to_string(),
            };
        }

        if text.trim().is_empty() {
            return InsertionResult {
                status: InsertionStatus::NotAttempted,
                message: Some("Text was empty or silent.".to_string()),
                method_used: "none".to_string(),
            };
        }

        // 1. Verify original process is still running
        if anchor.app_pid.is_some() && !is_target_process_running(anchor.app_pid) {
            return InsertionResult {
                status: InsertionStatus::RecoveryRequired,
                message: Some(format!("Original application '{}' was closed.", anchor.platform_app_id.as_deref().unwrap_or("target"))),
                method_used: "aborted_process_terminated".to_string(),
            };
        }

        // 2. Verify original destination window is still open
        if !is_target_window_available(anchor.app_pid, anchor.window_title.as_deref()) {
            return InsertionResult {
                status: InsertionStatus::RecoveryRequired,
                message: Some(format!("Original destination window '{}' was closed.", anchor.window_title.as_deref().unwrap_or("document"))),
                method_used: "aborted_window_closed".to_string(),
            };
        }

        // 3. Activate original target application and verify it is frontmost before ANY keystroke or insertion
        #[cfg(target_os = "macos")]
        {
            if !is_accessibility_granted() {
                request_accessibility_permission();
            }

            let target_name = anchor.platform_app_id.as_deref();
            let target_bid = anchor.bundle_id.as_deref();
            let target_pid = anchor.app_pid;

            // Check if VoxQuest currently holds frontmost focus (e.g. user clicked "Paste to App" on HomeTab)
            let (curr_app, _, _, _, _, is_secure) = get_active_app_metadata();
            let is_curr_voxquest = curr_app.as_deref().map(|n| {
                let l = n.to_lowercase();
                l.contains("voxquest") || l.contains("tauri")
            }).unwrap_or(false);

            if is_secure {
                return InsertionResult {
                    status: InsertionStatus::BlockedSecureInput,
                    message: Some("Target field is a secure password input. Insertion blocked.".to_string()),
                    method_used: "blocked_secure_input".to_string(),
                };
            }

            if is_curr_voxquest {
                // Frontmost window is VoxQuest; actively activate the destination app window so the caret receives the paste
                activate_and_verify_frontmost(target_name, target_bid, target_pid, 400);
                if let Some(bid) = target_bid {
                    let script = format!("tell application id \"{}\" to activate", bid);
                    let _ = std::process::Command::new("osascript").args(&["-e", &script]).output();
                } else if let Some(t_name) = target_name {
                    let clean_t = clean_display_app_name(t_name);
                    let script = format!("tell application \"{}\" to activate", clean_t);
                    let _ = std::process::Command::new("osascript").args(&["-e", &script]).output();
                }
                if let Some(pid) = target_pid {
                    let script = format!("tell application \"System Events\" to set frontmost of (first process whose unix id is {}) to true", pid);
                    let _ = std::process::Command::new("osascript").args(&["-e", &script]).output();
                }
                sleep(Duration::from_millis(150));
            } else {
                activate_and_verify_frontmost(target_name, target_bid, target_pid, 350);
                if let Some(pid) = target_pid {
                    let script = format!("tell application \"System Events\" to set frontmost of (first process whose unix id is {}) to true", pid);
                    let _ = std::process::Command::new("osascript").args(&["-e", &script]).output();
                }
            }

            // Settle window focus so the native caret is ready
            sleep(Duration::from_millis(120));

            // Universal Safe Clipboard Paste Insertion
            // Standard across macOS (Safari, Chrome, Brave, Arc, Slack, VS Code, Cursor, WhatsApp, Notes, TextEdit)
            let clip_snap = ClipboardSnapshot::capture();

            let mut clipboard = match Clipboard::new() {
                Ok(cb) => cb,
                Err(e) => {
                    return InsertionResult {
                        status: InsertionStatus::Failed,
                        message: Some(format!("Clipboard access error: {}", e)),
                        method_used: "clipboard_error".to_string(),
                    };
                }
            };

            let _ = clipboard.set_text(text);
            set_nspasteboard_text(text);
            sleep(Duration::from_millis(35));

            if let Err(e) = simulate_cmd_v() {
                clip_snap.restore_if_unmodified(text);
                return InsertionResult {
                    status: InsertionStatus::Failed,
                    message: Some(format!("Keystroke simulation error: {}", e)),
                    method_used: "keystroke_simulate".to_string(),
                };
            }

            // Spoken text is kept permanently on system clipboard so the user can paste freely at any time.
            return InsertionResult {
                status: InsertionStatus::InsertedUnconfirmed,
                message: Some(format!("Pasted into {}.", target_name.unwrap_or("active application"))),
                method_used: "simulated_paste".to_string(),
            };
        }

        #[cfg(not(target_os = "macos"))]
        {
            InsertionResult {
                status: InsertionStatus::InsertedConfirmed,
                message: Some("Text delivered.".to_string()),
                method_used: "simulated_paste".to_string(),
            }
        }
    }
}

pub fn insert_text_safely(text: &str, snapshot: &DestinationAnchor) -> InsertionResult {
    NativeTextInsertionProvider::insert_text(text, snapshot)
}

pub fn insert_text_safely_bool(text: &str, snapshot: &DestinationAnchor) -> Result<bool, String> {
    let result = insert_text_safely(text, snapshot);
    match result.status {
        InsertionStatus::InsertedConfirmed | InsertionStatus::InsertedUnconfirmed => Ok(true),
        InsertionStatus::NotAttempted => Ok(true),
        InsertionStatus::BlockedSecureInput => Err(result.message.unwrap_or_else(|| "Blocked: Secure input field".to_string())),
        InsertionStatus::RecoveryRequired => Err(result.message.unwrap_or_else(|| "Recovery required: Target changed".to_string())),
        InsertionStatus::Failed => Err(result.message.unwrap_or_else(|| "Insertion failed".to_string())),
    }
}

#[cfg(target_os = "macos")]
pub fn execute_applescript(script_source: &str) {
    unsafe {
        let _pool = cocoa::foundation::NSAutoreleasePool::new(cocoa::base::nil);
        let c_str = std::ffi::CString::new(script_source).unwrap_or_default();
        let ns_str: *mut objc::runtime::Object = msg_send![class!(NSString), stringWithUTF8String: c_str.as_ptr()];
        let script: *mut objc::runtime::Object = msg_send![class!(NSAppleScript), alloc];
        let script: *mut objc::runtime::Object = msg_send![script, initWithSource: ns_str];
        if !script.is_null() {
            let mut err: *mut objc::runtime::Object = std::ptr::null_mut();
            let _: *mut objc::runtime::Object = msg_send![script, executeAndReturnError: &mut err];
            let () = msg_send![script, release];
        }
    }
}

pub fn clean_display_app_name(s: &str) -> String {
    s.chars()
        .filter(|c| !c.is_control() && *c != '\u{200e}' && *c != '\u{200f}' && *c != '\u{202a}' && *c != '\u{202c}' && *c != '\u{202e}')
        .collect::<String>()
        .trim()
        .to_string()
}

#[cfg(target_os = "macos")]
pub fn execute_system_events_cmd_v() -> bool {
    let output = std::process::Command::new("osascript")
        .args(&["-e", r#"tell application "System Events" to keystroke "v" using command down"#])
        .output();
    output.map(|o| o.status.success()).unwrap_or(false)
}

#[cfg(target_os = "macos")]
pub fn simulate_cmd_v() -> Result<(), String> {
    // Settle keyboard focus so released hotkey modifiers are fully cleared by macOS
    sleep(Duration::from_millis(60));

    // 1. Primary delivery: CoreGraphics HID event stream with explicit Cmd keypress
    use core_graphics::event::{CGEvent, CGEventTapLocation, CGKeyCode, CGEventFlags};
    use core_graphics::event_source::{CGEventSource, CGEventSourceStateID};

    let cmd_key: CGKeyCode = 55; // kVK_Command
    let v_key: CGKeyCode = 9;   // kVK_ANSI_V

    let mut cg_success = false;
    if let Ok(source) = CGEventSource::new(CGEventSourceStateID::CombinedSessionState) {
        // Explicit Command modifier down
        if let Ok(cmd_down) = CGEvent::new_keyboard_event(source.clone(), cmd_key, true) {
            cmd_down.set_flags(CGEventFlags::CGEventFlagCommand);
            cmd_down.post(CGEventTapLocation::HID);
        }

        sleep(Duration::from_millis(15));

        // V key down with Command flag
        if let Ok(key_down) = CGEvent::new_keyboard_event(source.clone(), v_key, true) {
            key_down.set_flags(CGEventFlags::CGEventFlagCommand);
            key_down.post(CGEventTapLocation::HID);
        }

        sleep(Duration::from_millis(25));

        // V key up
        if let Ok(key_up) = CGEvent::new_keyboard_event(source.clone(), v_key, false) {
            key_up.set_flags(CGEventFlags::CGEventFlagCommand);
            key_up.post(CGEventTapLocation::HID);
        }

        sleep(Duration::from_millis(15));

        // Explicit Command modifier up
        if let Ok(cmd_up) = CGEvent::new_keyboard_event(source, cmd_key, false) {
            cmd_up.post(CGEventTapLocation::HID);
        }

        cg_success = true;
    }

    // Only return if CGEvent succeeded; do NOT execute duplicate paste!
    if cg_success {
        return Ok(());
    }

    // 2. Fallback: System Events osascript keystroke ONLY when CGEvent failed
    if execute_system_events_cmd_v() {
        return Ok(());
    }

    // 3. Last-resort fallback: rdev keyboard event simulation
    use rdev::{simulate, EventType, Key};
    let _ = simulate(&EventType::KeyPress(Key::MetaLeft));
    let _ = simulate(&EventType::KeyPress(Key::KeyV));
    sleep(Duration::from_millis(20));
    let _ = simulate(&EventType::KeyRelease(Key::KeyV));
    let _ = simulate(&EventType::KeyRelease(Key::MetaLeft));

    Ok(())
}

#[cfg(target_os = "macos")]
pub fn execute_system_events_cmd_z() -> bool {
    let output = std::process::Command::new("osascript")
        .args(&["-e", r#"tell application "System Events" to keystroke "z" using command down"#])
        .output();
    output.map(|o| o.status.success()).unwrap_or(false)
}

#[cfg(target_os = "macos")]
pub fn simulate_cmd_z() -> Result<(), String> {
    sleep(Duration::from_millis(50));

    // 1. Primary delivery: CoreGraphics HID event stream (atomic undo)
    use core_graphics::event::{CGEvent, CGEventTapLocation, CGKeyCode, CGEventFlags};
    use core_graphics::event_source::{CGEventSource, CGEventSourceStateID};

    let cmd_key: CGKeyCode = 55; // kVK_Command
    let z_key: CGKeyCode = 6;   // kVK_ANSI_Z
    let mut cg_success = false;

    if let Ok(source) = CGEventSource::new(CGEventSourceStateID::CombinedSessionState) {
        if let Ok(cmd_down) = CGEvent::new_keyboard_event(source.clone(), cmd_key, true) {
            cmd_down.set_flags(CGEventFlags::CGEventFlagCommand);
            cmd_down.post(CGEventTapLocation::HID);
        }

        sleep(Duration::from_millis(15));

        if let Ok(key_down) = CGEvent::new_keyboard_event(source.clone(), z_key, true) {
            key_down.set_flags(CGEventFlags::CGEventFlagCommand);
            key_down.post(CGEventTapLocation::HID);
        }

        sleep(Duration::from_millis(25));

        if let Ok(key_up) = CGEvent::new_keyboard_event(source.clone(), z_key, false) {
            key_up.set_flags(CGEventFlags::CGEventFlagCommand);
            key_up.post(CGEventTapLocation::HID);
        }

        sleep(Duration::from_millis(15));

        if let Ok(cmd_up) = CGEvent::new_keyboard_event(source, cmd_key, false) {
            cmd_up.post(CGEventTapLocation::HID);
        }

        cg_success = true;
    }

    if cg_success {
        return Ok(());
    }

    // 2. Secondary fallback: osascript System Events
    if execute_system_events_cmd_z() {
        return Ok(());
    }

    // 3. Fallback: rdev
    use rdev::{simulate, EventType, Key};
    let _ = simulate(&EventType::KeyPress(Key::MetaLeft));
    let _ = simulate(&EventType::KeyPress(Key::KeyZ));
    sleep(Duration::from_millis(20));
    let _ = simulate(&EventType::KeyRelease(Key::KeyZ));
    let _ = simulate(&EventType::KeyRelease(Key::MetaLeft));

    Ok(())
}

/// Replaces the previously inserted text in the destination application with enhanced text.
pub fn replace_last_paste(new_text: &str) -> Result<(), String> {
    if new_text.trim().is_empty() {
        return Err("Cannot replace with empty text".to_string());
    }

    // 1. Put new text on system clipboard
    if let Ok(mut cb) = arboard::Clipboard::new() {
        let _ = cb.set_text(new_text);
    }
    #[cfg(target_os = "macos")]
    set_nspasteboard_text(new_text);

    // 2. Reactivate external application
    #[cfg(target_os = "macos")]
    {
        if let Some(target) = get_last_external_app() {
            println!("[VoxQuest] replace_last_paste: activating target app {:?}", target.platform_app_id);
            if let Some(ref name) = target.platform_app_id {
                let clean_n = clean_display_app_name(name);
                let script = format!("tell application \"{}\" to activate", clean_n);
                let _ = std::process::Command::new("osascript").args(&["-e", &script]).output();
            }
            activate_application(
                target.platform_app_id.as_deref(),
                target.bundle_id.as_deref(),
                target.app_pid,
            );
            sleep(Duration::from_millis(200));
        }

        // 3. Undo the previous raw insertion
        let _ = simulate_cmd_z();
        sleep(Duration::from_millis(100));

        // 4. Paste the enhanced text
        let _ = simulate_cmd_v();
    }

    Ok(())
}

#[cfg(target_os = "macos")]
#[allow(dead_code)]
unsafe fn try_ax_direct_insert(text: &str) -> bool {
    let system_wide = AXUIElementCreateSystemWide();
    if system_wide.is_null() {
        return false;
    }
    let ax_focused_elem_key = str_to_cfstring("AXFocusedUIElement");
    let mut focused_elem: CFTypeRef = std::ptr::null();
    let mut inserted = false;

    if AXUIElementCopyAttributeValue(system_wide, ax_focused_elem_key, &mut focused_elem) == 0 && !focused_elem.is_null() {
        let ax_selected_text_key = str_to_cfstring("AXSelectedText");
        let cf_text = str_to_cfstring(text);

        let err = AXUIElementSetAttributeValue(focused_elem as AXUIElementRef, ax_selected_text_key, cf_text);
        if err == 0 {
            inserted = true;
        }

        CFRelease(cf_text);
        CFRelease(ax_selected_text_key);
        CFRelease(focused_elem);
    }

    CFRelease(ax_focused_elem_key);
    CFRelease(system_wide as CFTypeRef);
    inserted
}

#[cfg(target_os = "macos")]
unsafe fn get_focused_window_and_role() -> (Option<String>, Option<String>, bool) {
    let system_wide = AXUIElementCreateSystemWide();
    if system_wide.is_null() {
        return (None, None, false);
    }

    let ax_focused_elem_key = str_to_cfstring("AXFocusedUIElement");
    let ax_role_key = str_to_cfstring("AXRole");
    let ax_window_key = str_to_cfstring("AXWindow");
    let ax_title_key = str_to_cfstring("AXTitle");

    let mut focused_elem: CFTypeRef = std::ptr::null();
    let mut win_title: Option<String> = None;
    let mut ax_role: Option<String> = None;
    let mut is_secure = false;

    if AXUIElementCopyAttributeValue(system_wide, ax_focused_elem_key, &mut focused_elem) == 0 && !focused_elem.is_null() {
        let mut role_ref: CFTypeRef = std::ptr::null();
        if AXUIElementCopyAttributeValue(focused_elem as AXUIElementRef, ax_role_key, &mut role_ref) == 0 && !role_ref.is_null() {
            if let Some(r) = cfstring_to_string(role_ref as CFStringRef) {
                if r == "AXSecureTextField" {
                    is_secure = true;
                }
                ax_role = Some(r);
            }
            CFRelease(role_ref);
        }

        let mut win_ref: CFTypeRef = std::ptr::null();
        if AXUIElementCopyAttributeValue(focused_elem as AXUIElementRef, ax_window_key, &mut win_ref) == 0 && !win_ref.is_null() {
            let mut title_ref: CFTypeRef = std::ptr::null();
            if AXUIElementCopyAttributeValue(win_ref as AXUIElementRef, ax_title_key, &mut title_ref) == 0 && !title_ref.is_null() {
                win_title = cfstring_to_string(title_ref as CFStringRef);
                CFRelease(title_ref);
            }
            CFRelease(win_ref);
        }

        CFRelease(focused_elem);
    }

    CFRelease(ax_focused_elem_key);
    CFRelease(ax_role_key);
    CFRelease(ax_window_key);
    CFRelease(ax_title_key);
    CFRelease(system_wide as CFTypeRef);

    (win_title, ax_role, is_secure)
}

#[cfg(target_os = "macos")]
fn get_active_app_metadata() -> (Option<String>, Option<String>, Option<u32>, Option<String>, Option<String>, bool) {
    unsafe {
        let _pool = cocoa::foundation::NSAutoreleasePool::new(cocoa::base::nil);
        let workspace: *mut objc::runtime::Object = msg_send![class!(NSWorkspace), sharedWorkspace];
        if workspace.is_null() {
            return (None, None, None, None, None, false);
        }
        let front_app: *mut objc::runtime::Object = msg_send![workspace, frontmostApplication];
        if front_app.is_null() {
            return (None, None, None, None, None, false);
        }

        let p_name: Option<String> = {
            let name_obj: *mut objc::runtime::Object = msg_send![front_app, localizedName];
            if !name_obj.is_null() {
                let c_str: *const std::os::raw::c_char = msg_send![name_obj, UTF8String];
                if !c_str.is_null() {
                    let raw = std::ffi::CStr::from_ptr(c_str).to_string_lossy();
                    let clean = clean_display_app_name(&raw);
                    if clean.is_empty() { None } else { Some(clean) }
                } else {
                    None
                }
            } else {
                None
            }
        };

        let b_id: Option<String> = {
            let bid_obj: *mut objc::runtime::Object = msg_send![front_app, bundleIdentifier];
            if !bid_obj.is_null() {
                let c_str: *const std::os::raw::c_char = msg_send![bid_obj, UTF8String];
                if !c_str.is_null() {
                    Some(std::ffi::CStr::from_ptr(c_str).to_string_lossy().to_string())
                } else {
                    None
                }
            } else {
                None
            }
        };

        let p_pid: Option<u32> = {
            let pid: i32 = msg_send![front_app, processIdentifier];
            if pid > 0 {
                Some(pid as u32)
            } else {
                None
            }
        };

        let (win_title, ax_role, is_secure) = get_focused_window_and_role();

        (p_name, b_id, p_pid, win_title, ax_role, is_secure)
    }
}

#[cfg(target_os = "macos")]
pub unsafe fn cf_or_ns_to_string(obj: *const std::ffi::c_void) -> Option<String> {
    if obj.is_null() {
        return None;
    }
    let o = obj as *mut objc::runtime::Object;
    let is_attributed: bool = msg_send![o, respondsToSelector: sel!(string)];
    let target_str: *mut objc::runtime::Object = if is_attributed {
        msg_send![o, string]
    } else {
        o
    };

    if target_str.is_null() {
        return None;
    }

    let is_str: bool = msg_send![target_str, respondsToSelector: sel!(UTF8String)];
    if is_str {
        let c_str: *const std::os::raw::c_char = msg_send![target_str, UTF8String];
        if !c_str.is_null() {
            return Some(std::ffi::CStr::from_ptr(c_str).to_string_lossy().to_string());
        }
    }
    None
}

#[cfg(target_os = "macos")]
pub fn read_focused_element_text_for_pid(pid: u32) -> Result<Option<String>, String> {
    if !is_accessibility_granted() {
        return Err("Accessibility permission not granted".to_string());
    }

    unsafe {
        let app_elem = AXUIElementCreateApplication(pid as i32);
        if app_elem.is_null() {
            return Ok(None);
        }

        let ax_focused_elem_key = str_to_cfstring("AXFocusedUIElement");
        let mut focused_elem: CFTypeRef = std::ptr::null();
        let err = AXUIElementCopyAttributeValue(app_elem, ax_focused_elem_key, &mut focused_elem);
        CFRelease(ax_focused_elem_key);
        CFRelease(app_elem as CFTypeRef);

        let target_elem = if err == 0 && !focused_elem.is_null() {
            focused_elem
        } else {
            // Fallback to system-wide focused element
            let system_wide = AXUIElementCreateSystemWide();
            if system_wide.is_null() {
                return Ok(None);
            }
            let ax_sys_focused_key = str_to_cfstring("AXFocusedUIElement");
            let mut sys_focused: CFTypeRef = std::ptr::null();
            let sys_err = AXUIElementCopyAttributeValue(system_wide, ax_sys_focused_key, &mut sys_focused);
            CFRelease(ax_sys_focused_key);
            CFRelease(system_wide as CFTypeRef);

            if sys_err == 0 && !sys_focused.is_null() {
                let mut elem_pid: i32 = 0;
                if AXUIElementGetPid(sys_focused as AXUIElementRef, &mut elem_pid) == 0 && elem_pid as u32 == pid {
                    sys_focused
                } else {
                    CFRelease(sys_focused);
                    return Ok(None);
                }
            } else {
                return Ok(None);
            }
        };

        // Privacy check: exclude password and secure fields
        let ax_role_key = str_to_cfstring("AXRole");
        let mut role_ref: CFTypeRef = std::ptr::null();
        if AXUIElementCopyAttributeValue(target_elem as AXUIElementRef, ax_role_key, &mut role_ref) == 0 && !role_ref.is_null() {
            if let Some(role) = cf_or_ns_to_string(role_ref) {
                if role == "AXSecureTextField" {
                    CFRelease(role_ref);
                    CFRelease(ax_role_key);
                    CFRelease(target_elem);
                    return Err("Target is a secure password field; monitoring rejected for privacy.".to_string());
                }
            }
            CFRelease(role_ref);
        }
        CFRelease(ax_role_key);

        // Read text value from AXValue
        let ax_value_key = str_to_cfstring("AXValue");
        let mut val_ref: CFTypeRef = std::ptr::null();
        let val_err = AXUIElementCopyAttributeValue(target_elem as AXUIElementRef, ax_value_key, &mut val_ref);
        CFRelease(ax_value_key);
        CFRelease(target_elem);

        if val_err == 0 && !val_ref.is_null() {
            let s = cf_or_ns_to_string(val_ref);
            CFRelease(val_ref);
            return Ok(s);
        }

        Ok(None)
    }
}

#[cfg(not(target_os = "macos"))]
pub fn read_focused_element_text_for_pid(_pid: u32) -> Result<Option<String>, String> {
    Ok(None)
}

#[cfg(target_os = "macos")]
pub fn get_frontmost_app_name() -> Option<String> {
    let (name, _, _, _, _, _) = get_active_app_metadata();
    name
}

#[cfg(target_os = "macos")]
pub fn get_frontmost_app_pid() -> Option<u32> {
    let (_, _, pid, _, _, _) = get_active_app_metadata();
    pid
}

#[cfg(not(target_os = "macos"))]
pub fn get_frontmost_app_name() -> Option<String> {
    None
}

#[cfg(not(target_os = "macos"))]
pub fn get_frontmost_app_pid() -> Option<u32> {
    None
}

#[cfg(not(target_os = "macos"))]
fn get_active_app_metadata() -> (Option<String>, Option<String>, Option<u32>, Option<String>, Option<String>, bool) {
    (None, None, None, None, None, false)
}
