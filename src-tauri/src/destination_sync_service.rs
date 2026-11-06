//! VoxQuest Destination App Edit Synchronization Service
//!
//! Observes edits made directly to text that VoxQuest inserted into an external application
//! (e.g., TextEdit, Notes, etc.) and synchronizes the user-finalized text back into the SQLite
//! transcript history. Automatically triggers the Personal Vocabulary learning pipeline to learn
//! vocabulary corrections without requiring the user to manually return to VoxQuest.

use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};
use crate::history_service::HistoryDatabase;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DestinationSyncEvent {
    pub history_id: i64,
    pub session_id: String,
    pub target_app: String,
    pub original_text: String,
    pub previous_text: String,
    pub updated_text: String,
    pub learned_candidates_count: usize,
    pub timestamp_ms: u64,
}

#[derive(Debug, Clone)]
pub struct ObservedSession {
    pub history_id: i64,
    pub session_id: String,
    pub target_app_pid: u32,
    pub target_app_name: String,
    pub target_window_title: Option<String>,
    pub original_text: String,
    pub initial_inserted_text: String,
    pub last_synced_text: String,
    pub prefix_anchor: String,
    pub suffix_anchor: String,
    pub start_time: Instant,
    pub max_duration: Duration,
    pub last_edit_seen: Option<(String, Instant)>,
    pub sync_count: u32,
}

pub struct DestinationSyncService {
    active_session: Arc<Mutex<Option<ObservedSession>>>,
}

impl DestinationSyncService {
    pub fn new() -> Self {
        Self {
            active_session: Arc::new(Mutex::new(None)),
        }
    }

    /// Starts observing a destination application for edits to the recently inserted dictation.
    pub fn start_observing(
        &self,
        app: AppHandle,
        history: Arc<HistoryDatabase>,
        session: ObservedSession,
    ) {
        let active_sess_arc = Arc::clone(&self.active_session);

        // Store as the current active session (cancels any prior observation)
        {
            let mut lock = active_sess_arc.lock().unwrap();
            *lock = Some(session.clone());
        }

        // Spawn bounded async observation task using Tauri's global runtime
        tauri::async_runtime::spawn(async move {
            let poll_interval = Duration::from_millis(400);
            let debounce_threshold = Duration::from_millis(500);

            loop {
                tokio::time::sleep(poll_interval).await;

                // 1. Check if this session is still the active one
                let mut current_state = {
                    let lock = active_sess_arc.lock().unwrap();
                    match lock.as_ref() {
                        Some(s) if s.session_id == session.session_id && s.history_id == session.history_id => s.clone(),
                        _ => {
                            // Cancelled or superseded by a newer dictation
                            break;
                        }
                    }
                };

                // 2. Check maximum observation window (bounded monitoring)
                if current_state.start_time.elapsed() > current_state.max_duration {
                    let mut lock = active_sess_arc.lock().unwrap();
                    if let Some(s) = lock.as_ref() {
                        if s.session_id == session.session_id {
                            *lock = None;
                        }
                    }
                    break;
                }

                // 3. Verify target application process is still active
                let pid = current_state.target_app_pid;
                #[cfg(target_os = "macos")]
                {
                    if !crate::safety_service::is_target_process_running(Some(pid)) {
                        let mut lock = active_sess_arc.lock().unwrap();
                        *lock = None;
                        break;
                    }

                    // If user temporarily switched away from the destination app, pause without canceling
                    let front_pid = crate::safety_service::get_frontmost_app_pid();
                    if let Some(f_pid) = front_pid {
                        if f_pid != pid {
                            let frontmost = crate::safety_service::get_frontmost_app_name();
                            let front_lower = frontmost.as_deref().unwrap_or("").to_lowercase();
                            if !front_lower.contains("voxquest") && !front_lower.contains("tauri") {
                                continue;
                            }
                        }
                    }
                }

                // 4. Read current text from target element via native Accessibility
                let read_res = crate::safety_service::read_focused_element_text_for_pid(pid);
                let current_field_text = match read_res {
                    Ok(Some(text)) => text,
                    Ok(None) => continue, // Element momentarily busy or focus shifted
                    Err(_) => {
                        // Secure field or permission revoked -> stop immediately
                        let mut lock = active_sess_arc.lock().unwrap();
                        *lock = None;
                        break;
                    }
                };

                // 5. Reconcile text to extract the dictation segment
                let reconciled = reconcile_destination_edit(
                    &current_field_text,
                    &current_state.prefix_anchor,
                    &current_state.suffix_anchor,
                    &current_state.initial_inserted_text,
                );

                let edited_candidate = match reconciled {
                    Some(text) if !text.trim().is_empty() => text,
                    _ => continue,
                };

                let now = Instant::now();

                // 6. Check for change against last committed synced text
                if edited_candidate != current_state.last_synced_text {
                    // Check debounce: wait for user to stop typing
                    match current_state.last_edit_seen {
                        Some((ref candidate, seen_time)) if candidate == &edited_candidate => {
                            if now.duration_since(seen_time) >= debounce_threshold {
                                // Commit the synchronized edit!
                                let new_text = candidate.clone();

                                // A. Update SQLite transcript_history record
                                if let Err(e) = history.update_record_text(current_state.history_id, &new_text) {
                                    eprintln!("[DestinationSync] Failed to update history record: {}", e);
                                    continue;
                                }

                                // B. Trigger Vocabulary Correction Learning
                                // Record correction from what was actually inserted into the app to the user's manual edit
                                let mut candidates = history.record_correction_event(
                                    Some(&current_state.session_id),
                                    &current_state.initial_inserted_text,
                                    &new_text,
                                ).unwrap_or_default();

                                if current_state.initial_inserted_text != current_state.original_text {
                                    let extra = history.record_correction_event(
                                        Some(&current_state.session_id),
                                        &current_state.original_text,
                                        &new_text,
                                    ).unwrap_or_default();
                                    candidates.extend(extra);
                                }

                                let _ = app.emit("dictionary-updated", ());

                                let timestamp_ms = std::time::SystemTime::now()
                                    .duration_since(std::time::UNIX_EPOCH)
                                    .unwrap_or_default()
                                    .as_millis() as u64;

                                // C. Emit Tauri notification to UI
                                let event_payload = DestinationSyncEvent {
                                    history_id: current_state.history_id,
                                    session_id: current_state.session_id.clone(),
                                    target_app: current_state.target_app_name.clone(),
                                    original_text: current_state.original_text.clone(),
                                    previous_text: current_state.last_synced_text.clone(),
                                    updated_text: new_text.clone(),
                                    learned_candidates_count: candidates.len(),
                                    timestamp_ms,
                                };
                                let _ = app.emit("destination-edit-synced", &event_payload);

                                // D. Update local state
                                current_state.last_synced_text = new_text;
                                current_state.sync_count += 1;
                                current_state.last_edit_seen = None;

                                {
                                    let mut lock = active_sess_arc.lock().unwrap();
                                    if let Some(s) = lock.as_mut() {
                                        s.last_synced_text = current_state.last_synced_text.clone();
                                        s.sync_count = current_state.sync_count;
                                        s.last_edit_seen = None;
                                    }
                                }
                            }
                        }
                        _ => {
                            // First time seeing this new candidate, record time for debounce
                            current_state.last_edit_seen = Some((edited_candidate, now));
                            let mut lock = active_sess_arc.lock().unwrap();
                            if let Some(s) = lock.as_mut() {
                                s.last_edit_seen = current_state.last_edit_seen.clone();
                            }
                        }
                    }
                }
            }
        });
    }

    /// Explicitly stops observing the active destination.
    pub fn stop_observing(&self) {
        let mut lock = self.active_session.lock().unwrap();
        *lock = None;
    }
}

// ============================================================================
// Reconciliation & Alignment Algorithm
// ============================================================================

/// Reconciles the full destination field text against prefix/suffix anchors to extract
/// the updated dictation segment without capturing unrelated paragraphs.
pub fn reconcile_destination_edit(
    current_full: &str,
    prefix_anchor: &str,
    suffix_anchor: &str,
    initial_inserted: &str,
) -> Option<String> {
    let clean_full = current_full;

    // Guard: NEVER treat an empty field as a valid user edit to wipe out dictation!
    if clean_full.trim().is_empty() {
        return None;
    }

    // Case 1: Exact prefix and suffix match
    if !prefix_anchor.is_empty() || !suffix_anchor.is_empty() {
        if clean_full.starts_with(prefix_anchor) && clean_full.ends_with(suffix_anchor) {
            let start = prefix_anchor.len();
            let end = clean_full.len() - suffix_anchor.len();
            if start <= end {
                let candidate = clean_full[start..end].to_string();
                if !candidate.trim().is_empty() {
                    return Some(candidate);
                }
            }
        }
    }

    // Case 2: Document/field had no prefix or suffix (isolated dictation field)
    if prefix_anchor.is_empty() && suffix_anchor.is_empty() {
        if clean_full.trim().is_empty() {
            return None;
        }
        return Some(clean_full.to_string());
    }

    // Case 3: Suffix was partially modified (e.g., user pressed enter or deleted trailing period)
    if !prefix_anchor.is_empty() && clean_full.starts_with(prefix_anchor) {
        let remainder = &clean_full[prefix_anchor.len()..];
        // If suffix still matches trailing words
        if !suffix_anchor.is_empty() {
            if let Some(pos) = remainder.rfind(suffix_anchor.trim_start()) {
                let candidate = remainder[..pos].to_string();
                if !candidate.trim().is_empty() {
                    return Some(candidate);
                }
            }
        } else if !remainder.trim().is_empty() {
            return Some(remainder.to_string());
        }
    }

    // Case 4: Prefix was partially modified
    if !suffix_anchor.is_empty() && clean_full.ends_with(suffix_anchor) {
        let remainder = &clean_full[..clean_full.len() - suffix_anchor.len()];
        if !remainder.trim().is_empty() {
            return Some(remainder.to_string());
        }
    }

    // Case 5: Safeguard against unrelated full replacements
    // If field text is drastically different and shares no common tokens, do NOT attribute it
    let initial_tokens: Vec<&str> = initial_inserted.split_whitespace().collect();
    let current_tokens: Vec<&str> = clean_full.split_whitespace().collect();

    if !initial_tokens.is_empty() {
        let common_count = initial_tokens.iter().filter(|t| {
            current_tokens.iter().any(|c| c.eq_ignore_ascii_case(t))
        }).count();

        // If at least 25% of tokens are shared or text length is reasonably close
        let ratio = common_count as f32 / initial_tokens.len() as f32;
        if (ratio >= 0.25 || clean_full.len() <= initial_inserted.len() * 2) && !clean_full.trim().is_empty() {
            return Some(clean_full.trim().to_string());
        }
    }

    None
}

// ============================================================================
// Unit Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_reconcile_exact_anchors() {
        let prefix = "Meeting Notes:\n\n";
        let suffix = "\n\nEnd of notes.";
        let initial = "The backend API is returning an error.";

        let full_edited = "Meeting Notes:\n\nThe backend API is returning 500 error.\n\nEnd of notes.";
        let result = reconcile_destination_edit(full_edited, prefix, suffix, initial);
        assert_eq!(result, Some("The backend API is returning 500 error.".to_string()));
    }

    #[test]
    fn test_reconcile_isolated_field() {
        let initial = "Paita.";
        let full_edited = "Python.";
        let result = reconcile_destination_edit(full_edited, "", "", initial);
        assert_eq!(result, Some("Python.".to_string()));
    }

    #[test]
    fn test_reconcile_cleared_text_is_ignored() {
        let initial = "Temporary thought.";
        let full_edited = "";
        let result = reconcile_destination_edit(full_edited, "", "", initial);
        // Empty text is ignored so accessibility misses or empty fields never destroy dictation
        assert_eq!(result, None);
    }

    #[test]
    fn test_reconcile_unrelated_massive_paste_rejected() {
        let initial = "Short dictation.";
        let prefix = "Prefix: ";
        let suffix = " Suffix.";
        // User pasted a massive foreign block of code that completely eradicated prefix and suffix
        let massive_foreign = "function calculateTotal(items) { let total = 0; for (let item of items) { total += item.price; } return total; }";
        let result = reconcile_destination_edit(massive_foreign, prefix, suffix, initial);
        assert_eq!(result, None);
    }
}
