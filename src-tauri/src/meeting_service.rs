use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MeetingUtterance {
    pub id: String,
    pub speaker: String,
    pub timestamp_offset_secs: u64,
    pub text: String,
    pub is_user: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MeetingActionItem {
    pub id: String,
    pub assignee: String,
    pub task: String,
    pub priority: String, // "High", "Medium", "Normal"
    pub deadline: String,
    pub is_completed: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MeetingSummary {
    pub title: String,
    pub date_str: String,
    pub duration_minutes: u64,
    pub executive_summary: Vec<String>,
    pub key_decisions: Vec<String>,
    pub action_items: Vec<MeetingActionItem>,
    pub follow_up_email: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MeetingSession {
    pub id: String,
    pub title: String,
    pub platform: String, // "google_meet", "zoom", "teams", "slack", "webex", "in_person"
    pub meeting_url: Option<String>,
    pub is_recording: bool,
    pub start_time_epoch_ms: u64,
    pub duration_seconds: u64,
    pub utterances: Vec<MeetingUtterance>,
    pub summary: Option<MeetingSummary>,
}

pub struct MeetingService {
    active_session: Mutex<Option<MeetingSession>>,
    past_sessions: Mutex<Vec<MeetingSession>>,
}

impl MeetingService {
    pub fn new() -> Self {
        Self {
            active_session: Mutex::new(None),
            past_sessions: Mutex::new(Vec::new()),
        }
    }

    pub fn start_meeting(
        &self,
        title: String,
        platform: String,
        meeting_url: Option<String>,
    ) -> Result<MeetingSession, String> {
        let mut active = self.active_session.lock().map_err(|e| e.to_string())?;
        let now_ms = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64;

        let session_id = format!("meet_{}", now_ms);
        let session = MeetingSession {
            id: session_id,
            title: if title.trim().is_empty() {
                format!("Meeting on {}", platform)
            } else {
                title
            },
            platform,
            meeting_url,
            is_recording: true,
            start_time_epoch_ms: now_ms,
            duration_seconds: 0,
            utterances: Vec::new(),
            summary: None,
        };

        *active = Some(session.clone());
        Ok(session)
    }

    pub fn get_active_meeting(&self) -> Result<Option<MeetingSession>, String> {
        let active = self.active_session.lock().map_err(|e| e.to_string())?;
        Ok(active.clone())
    }

    pub fn add_utterance(
        &self,
        speaker: String,
        text: String,
        is_user: bool,
    ) -> Result<MeetingSession, String> {
        let mut active = self.active_session.lock().map_err(|e| e.to_string())?;
        match active.as_mut() {
            Some(session) => {
                let now_ms = SystemTime::now()
                    .duration_since(UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_millis() as u64;
                let offset = (now_ms.saturating_sub(session.start_time_epoch_ms)) / 1000;
                session.duration_seconds = offset;

                let utterance_id = format!("utt_{}_{}", now_ms, session.utterances.len());
                session.utterances.push(MeetingUtterance {
                    id: utterance_id,
                    speaker,
                    timestamp_offset_secs: offset,
                    text,
                    is_user,
                });
                Ok(session.clone())
            }
            None => Err("No active meeting session running".to_string()),
        }
    }

    pub fn update_utterance_speaker(
        &self,
        session_id: &str,
        utterance_id: &str,
        speaker: String,
        is_user: bool,
    ) -> Result<MeetingSession, String> {
        {
            let mut active = self.active_session.lock().map_err(|e| e.to_string())?;
            if let Some(session) = active.as_mut() {
                if session.id == session_id {
                    if let Some(utt) = session.utterances.iter_mut().find(|u| u.id == utterance_id) {
                        utt.speaker = speaker;
                        utt.is_user = is_user;
                    }
                    return Ok(session.clone());
                }
            }
        }

        let mut past = self.past_sessions.lock().map_err(|e| e.to_string())?;
        for session in past.iter_mut() {
            if session.id == session_id {
                if let Some(utt) = session.utterances.iter_mut().find(|u| u.id == utterance_id) {
                    utt.speaker = speaker;
                    utt.is_user = is_user;
                }
                return Ok(session.clone());
            }
        }

        Err("Meeting session not found".to_string())
    }

    pub fn stop_meeting(&self) -> Result<MeetingSession, String> {
        let mut active = self.active_session.lock().map_err(|e| e.to_string())?;
        match active.take() {
            Some(mut session) => {
                session.is_recording = false;
                let now_ms = SystemTime::now()
                    .duration_since(UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_millis() as u64;
                session.duration_seconds =
                    (now_ms.saturating_sub(session.start_time_epoch_ms)) / 1000;

                // Auto-generate summary if not already generated
                if session.summary.is_none() {
                    session.summary = Some(Self::synthesize_summary(&session));
                }

                let mut past = self.past_sessions.lock().map_err(|e| e.to_string())?;
                past.insert(0, session.clone());
                Ok(session)
            }
            None => Err("No active meeting session to stop".to_string()),
        }
    }

    pub fn generate_summary_for_session(
        &self,
        session_id: &str,
    ) -> Result<MeetingSummary, String> {
        let mut active = self.active_session.lock().map_err(|e| e.to_string())?;
        if let Some(session) = active.as_mut() {
            if session.id == session_id {
                let summary = Self::synthesize_summary(session);
                session.summary = Some(summary.clone());
                return Ok(summary);
            }
        }

        let mut past = self.past_sessions.lock().map_err(|e| e.to_string())?;
        for session in past.iter_mut() {
            if session.id == session_id {
                let summary = Self::synthesize_summary(session);
                session.summary = Some(summary.clone());
                return Ok(summary);
            }
        }

        Err(format!("Meeting session {} not found", session_id))
    }

    pub fn export_notes_markdown(&self, session_id: &str) -> Result<String, String> {
        let active = self.active_session.lock().map_err(|e| e.to_string())?;
        let past = self.past_sessions.lock().map_err(|e| e.to_string())?;

        let session = active
            .as_ref()
            .filter(|s| s.id == session_id)
            .or_else(|| past.iter().find(|s| s.id == session_id));

        match session {
            Some(s) => {
                let mut md = String::new();
                md.push_str(&format!("# Meeting Minutes: {}\n\n", s.title));
                md.push_str(&format!("- **Platform**: {}\n", s.platform));
                md.push_str(&format!("- **Duration**: {} seconds (approx {} mins)\n", s.duration_seconds, (s.duration_seconds + 59) / 60));
                if let Some(ref url) = s.meeting_url {
                    md.push_str(&format!("- **Meeting Link**: {}\n", url));
                }
                md.push_str("\n---\n\n");

                if let Some(ref sum) = s.summary {
                    md.push_str("## Executive Summary\n\n");
                    for item in &sum.executive_summary {
                        md.push_str(&format!("- {}\n", item));
                    }
                    md.push_str("\n");

                    md.push_str("## Key Decisions\n\n");
                    for decision in &sum.key_decisions {
                        md.push_str(&format!("- {}\n", decision));
                    }
                    md.push_str("\n");

                    md.push_str("## Action Items\n\n");
                    md.push_str("| Assignee | Task | Priority | Deadline |\n");
                    md.push_str("| :--- | :--- | :--- | :--- |\n");
                    for act in &sum.action_items {
                        md.push_str(&format!("| **{}** | {} | `{}` | {} |\n", act.assignee, act.task, act.priority, act.deadline));
                    }
                    md.push_str("\n");

                    md.push_str("## Draft Follow-up Email\n\n```text\n");
                    md.push_str(&sum.follow_up_email);
                    md.push_str("\n```\n\n---\n\n");
                }

                md.push_str("## Verbatim Transcript\n\n");
                for utt in &s.utterances {
                    let mins = utt.timestamp_offset_secs / 60;
                    let secs = utt.timestamp_offset_secs % 60;
                    md.push_str(&format!("**[{:02}:{:02}] {}:** {}\n\n", mins, secs, utt.speaker, utt.text));
                }

                Ok(md)
            }
            None => Err(format!("Meeting session {} not found", session_id)),
        }
    }

    fn synthesize_summary(session: &MeetingSession) -> MeetingSummary {
        let duration_mins = (session.duration_seconds + 59) / 60;
        let mut executive_summary = Vec::new();
        let mut key_decisions = Vec::new();
        let mut action_items = Vec::new();

        if session.utterances.is_empty() {
            executive_summary.push("Meeting initiated and concluded with no spoken utterances recorded.".to_string());
            key_decisions.push("No explicit decisions logged.".to_string());
        } else {
            // Collect unique speakers and build dynamic summary from real utterances
            let mut speakers: Vec<String> = Vec::new();
            for u in &session.utterances {
                if !speakers.contains(&u.speaker) {
                    speakers.push(u.speaker.clone());
                }
            }

            executive_summary.push(format!(
                "Captured {} spoken exchanges ({} min) with participants: {}.",
                session.utterances.len(),
                duration_mins.max(1),
                speakers.join(", ")
            ));

            const DECISION_MARKERS: &[&str] = &[
                "agreed", "agree", "decided", "decide", "let's use", "let's go with",
                "we will use", "approved", "confirmed", "finalized", "settled on", "resolved",
            ];
            const ACTION_MARKERS: &[&str] = &[
                "i will", "i'll", "we will", "we'll", "let's ", "we need to", "need to", "have to", "should ",
                "must ", "action item", "todo", "to-do", "follow up", "finalize",
                "send ", "prepare ", "fix ", "build ", "check ", "schedule ", "review ",
            ];

            let mut highlights: Vec<String> = Vec::new();
            for utt in &session.utterances {
                let text = utt.text.trim();
                if text.is_empty() {
                    continue;
                }
                let lower = text.to_lowercase();

                let is_decision = DECISION_MARKERS.iter().any(|m| lower.contains(m));
                let is_action = ACTION_MARKERS.iter().any(|m| lower.contains(m));

                if is_decision && key_decisions.len() < 5 {
                    key_decisions.push(format!("{}: {}", utt.speaker, text));
                }

                if is_action && action_items.len() < 6 {
                    let priority = if lower.contains("urgent")
                        || lower.contains("asap")
                        || lower.contains("critical")
                        || lower.contains("today")
                        || lower.contains("immediately")
                    {
                        "High"
                    } else {
                        "Medium"
                    };

                    let deadline = if lower.contains("today") {
                        "Today"
                    } else if lower.contains("tomorrow") {
                        "Tomorrow"
                    } else if lower.contains("friday") {
                        "Friday"
                    } else if lower.contains("monday") {
                        "Monday"
                    } else if lower.contains("next week") {
                        "Next Week"
                    } else if lower.contains("sprint") {
                        "Sprint End"
                    } else {
                        "TBD"
                    };

                    action_items.push(MeetingActionItem {
                        id: format!("act-{}", action_items.len() + 1),
                        assignee: utt.speaker.clone(),
                        task: text.to_string(),
                        priority: priority.to_string(),
                        deadline: deadline.to_string(),
                        is_completed: false,
                    });
                }

                if !is_decision && !is_action && text.split_whitespace().count() >= 4 && highlights.len() < 3 {
                    highlights.push(format!("{}: {}", utt.speaker, text));
                }
            }

            // Fill executive summary with top discussion highlights from real transcript
            for h in highlights {
                executive_summary.push(h);
            }
            if executive_summary.len() == 1 {
                if let Some(first) = session.utterances.first() {
                    executive_summary.push(format!("{}: {}", first.speaker, first.text.trim()));
                }
            }

            if key_decisions.is_empty() {
                key_decisions.push("No explicit decision statements detected in the transcript.".to_string());
            }
        }

        let follow_up = format!(
            "Hi Team,\n\nThanks for your time in today's '{}' session.\n\nKey Highlights:\n{}\n\nAction Items:\n{}\n\nBest regards,\nVoxMeeting Assistant",
            session.title,
            executive_summary.iter().map(|s| format!("• {}", s)).collect::<Vec<_>>().join("\n"),
            action_items.iter().map(|a| format!("• [{}] {} (Due: {})", a.assignee, a.task, a.deadline)).collect::<Vec<_>>().join("\n")
        );

        MeetingSummary {
            title: session.title.clone(),
            date_str: "Today".to_string(),
            duration_minutes: duration_mins,
            executive_summary,
            key_decisions,
            action_items,
            follow_up_email: follow_up,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_meeting_lifecycle_and_summary() {
        let service = MeetingService::new();
        let session = service
            .start_meeting(
                "Sprint Planning".to_string(),
                "google_meet".to_string(),
                Some("https://meet.google.com/xyz".to_string()),
            )
            .expect("Should start session");

        assert_eq!(session.title, "Sprint Planning");
        assert!(session.is_recording);

        service
            .add_utterance(
                "You".to_string(),
                "Let's integrate the Android floating pill trigger.".to_string(),
                true,
            )
            .expect("Should add utterance");

        service
            .add_utterance(
                "Lead Architect".to_string(),
                "Agreed, we will use Android AccessibilityService for zero-friction typing.".to_string(),
                false,
            )
            .expect("Should add utterance");

        let stopped = service.stop_meeting().expect("Should stop session");
        assert!(!stopped.is_recording);
        assert_eq!(stopped.utterances.len(), 2);
        assert!(stopped.summary.is_some());

        let summary = stopped.summary.unwrap();
        assert!(!summary.executive_summary.is_empty());
        assert!(!summary.key_decisions.is_empty());
        assert!(!summary.action_items.is_empty());

        let md = service
            .export_notes_markdown(&stopped.id)
            .expect("Should export markdown");
        assert!(md.contains("Sprint Planning"));
        assert!(md.contains("Executive Summary"));
        assert!(md.contains("Action Items"));
    }
}

