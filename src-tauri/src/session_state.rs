use serde::{Deserialize, Serialize};
use std::fmt;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SessionState {
    Idle,
    Starting,
    Recording,
    Stopping,
    Transcribing,
    Inserting,
    Completed,
    RecoveryRequired,
    Cancelled,
    Failed,
}

impl fmt::Display for SessionState {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            SessionState::Idle => write!(f, "idle"),
            SessionState::Starting => write!(f, "starting"),
            SessionState::Recording => write!(f, "recording"),
            SessionState::Stopping => write!(f, "stopping"),
            SessionState::Transcribing => write!(f, "transcribing"),
            SessionState::Inserting => write!(f, "inserting"),
            SessionState::Completed => write!(f, "completed"),
            SessionState::RecoveryRequired => write!(f, "recovery_required"),
            SessionState::Cancelled => write!(f, "cancelled"),
            SessionState::Failed => write!(f, "failed"),
        }
    }
}

impl SessionState {
    pub fn is_active(&self) -> bool {
        matches!(self, SessionState::Starting | SessionState::Recording | SessionState::Stopping | SessionState::Transcribing | SessionState::Inserting)
    }

    pub fn can_transition_to(&self, next: SessionState) -> bool {
        match (self, next) {
            // From Idle
            (SessionState::Idle, SessionState::Starting) => true,
            
            // From Starting
            (SessionState::Starting, SessionState::Recording) => true,
            (SessionState::Starting, SessionState::Failed) => true,
            (SessionState::Starting, SessionState::Cancelled) => true,
            
            // From Recording
            (SessionState::Recording, SessionState::Stopping) => true,
            (SessionState::Recording, SessionState::Cancelled) => true,
            (SessionState::Recording, SessionState::Failed) => true,
            
            // From Stopping
            (SessionState::Stopping, SessionState::Transcribing) => true,
            (SessionState::Stopping, SessionState::Cancelled) => true,
            (SessionState::Stopping, SessionState::Failed) => true,
            
            // From Transcribing
            (SessionState::Transcribing, SessionState::Inserting) => true,
            (SessionState::Transcribing, SessionState::RecoveryRequired) => true,
            (SessionState::Transcribing, SessionState::Failed) => true,
            (SessionState::Transcribing, SessionState::Cancelled) => true,
            
            // From Inserting
            (SessionState::Inserting, SessionState::Completed) => true,
            (SessionState::Inserting, SessionState::RecoveryRequired) => true,
            (SessionState::Inserting, SessionState::Failed) => true,
            
            // Terminal or recovery states can transition back to Idle or directly to Starting
            (SessionState::Completed, SessionState::Idle) => true,
            (SessionState::Completed, SessionState::Starting) => true,
            (SessionState::RecoveryRequired, SessionState::Idle) => true,
            (SessionState::RecoveryRequired, SessionState::Starting) => true,
            (SessionState::Cancelled, SessionState::Idle) => true,
            (SessionState::Cancelled, SessionState::Starting) => true,
            (SessionState::Failed, SessionState::Idle) => true,
            (SessionState::Failed, SessionState::Starting) => true,

            _ => false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionSnapshot {
    pub session_id: String,
    pub state: SessionState,
    pub message: Option<String>,
    pub elapsed_seconds: f32,
    pub last_transcript: Option<String>,
    pub target_app: Option<String>,
    pub recovery_id: Option<i64>,
}

