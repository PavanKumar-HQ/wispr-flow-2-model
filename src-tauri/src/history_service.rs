use rusqlite::{Connection, params};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use dirs::data_local_dir;
use std::fs;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HistoryRecord {
    pub id: i64,
    pub timestamp_ms: i64,
    pub original_text: String,
    pub formatted_text: String,
    pub duration_seconds: f32,
    pub status: String,
    pub target_app: Option<String>,
}

pub struct HistoryDatabase {
    db_path: PathBuf,
}

impl HistoryDatabase {
    pub fn new() -> Result<Self, String> {
        let base = data_local_dir().unwrap_or_else(|| PathBuf::from("."));
        let dir = base.join("VoxQuest");
        let _ = fs::create_dir_all(&dir);
        let db_path = dir.join("voxquest_history.db");

        let conn = Connection::open(&db_path).map_err(|e| format!("Failed to open DB: {}", e))?;
        conn.execute(
            "CREATE TABLE IF NOT EXISTS transcript_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp_ms INTEGER NOT NULL,
                original_text TEXT NOT NULL,
                formatted_text TEXT NOT NULL,
                duration_seconds REAL NOT NULL,
                status TEXT NOT NULL,
                target_app TEXT
            )",
            [],
        ).map_err(|e| format!("DB schema init failed: {}", e))?;

        Ok(Self { db_path })
    }

    pub fn insert_record(&self, original: &str, formatted: &str, duration_sec: f32, status: &str, target_app: Option<&str>) -> Result<i64, String> {
        let conn = Connection::open(&self.db_path).map_err(|e| format!("DB open failed: {}", e))?;
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as i64;

        conn.execute(
            "INSERT INTO transcript_history (timestamp_ms, original_text, formatted_text, duration_seconds, status, target_app)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![now, original, formatted, duration_sec, status, target_app],
        ).map_err(|e| format!("DB insertion failed: {}", e))?;

        Ok(conn.last_insert_rowid())
    }

    pub fn list_records(&self, limit: u32) -> Result<Vec<HistoryRecord>, String> {
        let conn = Connection::open(&self.db_path).map_err(|e| format!("DB open failed: {}", e))?;
        let mut stmt = conn.prepare(
            "SELECT id, timestamp_ms, original_text, formatted_text, duration_seconds, status, target_app
             FROM transcript_history ORDER BY id DESC LIMIT ?1"
        ).map_err(|e| format!("DB query prepare failed: {}", e))?;

        let rows = stmt.query_map(params![limit], |row| {
            Ok(HistoryRecord {
                id: row.get(0)?,
                timestamp_ms: row.get(1)?,
                original_text: row.get(2)?,
                formatted_text: row.get(3)?,
                duration_seconds: row.get(4)?,
                status: row.get(5)?,
                target_app: row.get(6)?,
            })
        }).map_err(|e| format!("DB query execution failed: {}", e))?;

        let mut list = Vec::new();
        for r in rows {
            if let Ok(rec) = r {
                list.push(rec);
            }
        }
        Ok(list)
    }

    pub fn clear_all(&self) -> Result<(), String> {
        let conn = Connection::open(&self.db_path).map_err(|e| format!("DB open failed: {}", e))?;
        conn.execute("DELETE FROM transcript_history", []).map_err(|e| format!("DB delete failed: {}", e))?;
        Ok(())
    }

    pub fn delete_record(&self, id: i64) -> Result<(), String> {
        let conn = Connection::open(&self.db_path).map_err(|e| format!("DB open failed: {}", e))?;
        conn.execute("DELETE FROM transcript_history WHERE id = ?1", params![id]).map_err(|e| format!("DB record delete failed: {}", e))?;
        Ok(())
    }
}
