use rusqlite::{Connection, params};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use dirs::data_local_dir;
use std::fs;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppUsageStat {
    pub app_name: String,
    pub word_count: u64,
    pub percentage: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InsightsData {
    pub total_words: u64,
    pub total_sessions: u64,
    pub average_wpm: u32,
    pub total_duration_seconds: f32,
    pub time_saved_minutes: f32,
    pub streak_days: u32,
    pub app_usage: Vec<AppUsageStat>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DictionaryEntry {
    pub id: i64,
    pub original_phrase: String,
    pub replacement_phrase: String,
    pub category: String, // "spelling", "slang", "acronym", "name"
    pub created_at: i64,
    #[serde(default)]
    pub original: String,
    #[serde(default)]
    pub replacement: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HistoryRecord {
    pub id: i64,
    pub timestamp_ms: i64,
    pub original_text: String,
    pub formatted_text: String,
    pub duration_seconds: f32,
    pub status: String, // "inserted", "recovery_required", "uncertain", "failed"
    pub target_app: Option<String>,
    pub failure_reason: Option<String>,
    pub session_id: Option<String>,
    pub user_edited_text: Option<String>,
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
        Self::new_at_path(db_path)
    }

    pub fn new_test() -> Result<Self, String> {
        let temp_dir = std::env::temp_dir().join(format!(
            "voxquest_test_{}_{}",
            std::process::id(),
            std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_nanos()
        ));
        let _ = fs::create_dir_all(&temp_dir);
        let db_path = temp_dir.join("test_history.db");
        Self::new_at_path(db_path)
    }

    pub fn new_at_path(db_path: PathBuf) -> Result<Self, String> {
        let conn = Connection::open(&db_path).map_err(|e| format!("Failed to open DB: {}", e))?;
        let _ = conn.busy_timeout(std::time::Duration::from_secs(5));
        let _ = conn.execute_batch("PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL;");
        conn.execute(
            "CREATE TABLE IF NOT EXISTS transcript_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp_ms INTEGER NOT NULL,
                original_text TEXT NOT NULL,
                formatted_text TEXT NOT NULL,
                duration_seconds REAL NOT NULL,
                status TEXT NOT NULL,
                target_app TEXT,
                failure_reason TEXT,
                session_id TEXT
            )",
            [],
        ).map_err(|e| format!("DB schema init failed: {}", e))?;

        // Safe migrations for existing databases
        let _ = conn.execute("ALTER TABLE transcript_history ADD COLUMN failure_reason TEXT", []);
        let _ = conn.execute("ALTER TABLE transcript_history ADD COLUMN session_id TEXT", []);
        let _ = conn.execute("ALTER TABLE transcript_history ADD COLUMN user_edited_text TEXT", []);

        conn.execute(
            "CREATE TABLE IF NOT EXISTS personal_vocabulary (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                original_text TEXT NOT NULL,
                preferred_text TEXT NOT NULL,
                entry_type TEXT NOT NULL,
                context_domain TEXT,
                confidence REAL NOT NULL DEFAULT 0.5,
                positive_count INTEGER NOT NULL DEFAULT 1,
                negative_count INTEGER NOT NULL DEFAULT 0,
                status TEXT NOT NULL DEFAULT 'active',
                recognition_count INTEGER NOT NULL DEFAULT 0,
                correction_count INTEGER NOT NULL DEFAULT 0,
                application_count INTEGER NOT NULL DEFAULT 0,
                last_used_at INTEGER,
                source TEXT NOT NULL DEFAULT 'manual',
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            )",
            [],
        ).map_err(|e| format!("DB schema personal_vocabulary init failed: {}", e))?;

        // Safe column migrations if database already existed
        let _ = conn.execute("ALTER TABLE personal_vocabulary ADD COLUMN recognition_count INTEGER NOT NULL DEFAULT 0", []);
        let _ = conn.execute("ALTER TABLE personal_vocabulary ADD COLUMN correction_count INTEGER NOT NULL DEFAULT 0", []);
        let _ = conn.execute("ALTER TABLE personal_vocabulary ADD COLUMN application_count INTEGER NOT NULL DEFAULT 0", []);
        let _ = conn.execute("ALTER TABLE personal_vocabulary ADD COLUMN last_used_at INTEGER", []);
        let _ = conn.execute("ALTER TABLE personal_vocabulary ADD COLUMN source TEXT NOT NULL DEFAULT 'manual'", []);

        conn.execute(
            "CREATE TABLE IF NOT EXISTS correction_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT,
                original_text TEXT NOT NULL,
                final_text TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                processed INTEGER NOT NULL DEFAULT 0
            )",
            [],
        ).map_err(|e| format!("DB schema correction_events init failed: {}", e))?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS formatting_preferences (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                preference_key TEXT NOT NULL UNIQUE,
                preference_value TEXT NOT NULL,
                evidence_count INTEGER NOT NULL DEFAULT 1,
                confidence REAL NOT NULL DEFAULT 0.5,
                enabled INTEGER NOT NULL DEFAULT 1,
                updated_at INTEGER NOT NULL
            )",
            [],
        ).map_err(|e| format!("DB schema formatting_preferences init failed: {}", e))?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS custom_dictionary (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                original_phrase TEXT NOT NULL,
                replacement_phrase TEXT NOT NULL,
                category TEXT DEFAULT 'general',
                created_at INTEGER NOT NULL
            )",
            [],
        ).map_err(|e| format!("DB schema dictionary init failed: {}", e))?;

        // Seed default custom dictionary terms if empty
        let count: i64 = conn.query_row(
            "SELECT count(*) FROM custom_dictionary",
            [],
            |r| r.get(0),
        ).unwrap_or(0);

        if count == 0 {
            let defaults = [
                ("vox quest", "VoxQuest", "name"),
                ("foxquest", "VoxQuest", "name"),
                ("whisper flow", "Wispr Flow", "name"),
                ("anti gravity", "Antigravity", "tech"),
                ("wpm", "WPM", "acronym"),
                ("ai", "AI", "acronym"),
                ("gonna", "going to", "slang"),
            ];
            let now = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() as i64;
            for (orig, repl, cat) in defaults {
                let _ = conn.execute(
                    "INSERT INTO custom_dictionary (original_phrase, replacement_phrase, category, created_at) VALUES (?1, ?2, ?3, ?4)",
                    params![orig, repl, cat, now],
                );
            }
        }

        Ok(Self { db_path })
    }

    pub fn open_conn(&self) -> Result<Connection, String> {
        let conn = Connection::open(&self.db_path).map_err(|e| format!("DB open failed: {}", e))?;
        let _ = conn.busy_timeout(std::time::Duration::from_secs(5));
        let _ = conn.execute_batch("PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL;");
        Ok(conn)
    }

    pub fn insert_record(
        &self,
        original: &str,
        formatted: &str,
        duration_sec: f32,
        status: &str,
        target_app: Option<&str>,
        failure_reason: Option<&str>,
        session_id: Option<&str>,
    ) -> Result<i64, String> {
        let conn = self.open_conn()?;
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as i64;

        conn.execute(
            "INSERT INTO transcript_history (timestamp_ms, original_text, formatted_text, duration_seconds, status, target_app, failure_reason, session_id)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![now, original, formatted, duration_sec, status, target_app, failure_reason, session_id],
        ).map_err(|e| format!("DB insertion failed: {}", e))?;

        Ok(conn.last_insert_rowid())
    }

    pub fn update_status(&self, id: i64, status: &str) -> Result<(), String> {
        let conn = self.open_conn()?;
        conn.execute(
            "UPDATE transcript_history SET status = ?1 WHERE id = ?2",
            params![status, id],
        ).map_err(|e| format!("DB update failed: {}", e))?;
        Ok(())
    }

    pub fn update_record_text(&self, id: i64, new_text: &str) -> Result<(), String> {
        let trimmed = new_text.trim();
        if trimmed.is_empty() {
            return Ok(());
        }
        let conn = self.open_conn()?;
        conn.execute(
            "UPDATE transcript_history SET formatted_text = ?1, user_edited_text = ?1 WHERE id = ?2",
            params![trimmed, id],
        ).map_err(|e| format!("DB text update failed: {}", e))?;
        Ok(())
    }

    pub fn restore_record_original_text(&self, id: i64) -> Result<String, String> {
        let conn = self.open_conn()?;
        let orig: String = conn.query_row(
            "SELECT original_text FROM transcript_history WHERE id = ?1",
            params![id],
            |row| row.get(0),
        ).map_err(|e| format!("DB query failed: {}", e))?;
        conn.execute(
            "UPDATE transcript_history SET formatted_text = ?1, user_edited_text = NULL WHERE id = ?2",
            params![orig, id],
        ).map_err(|e| format!("DB restore failed: {}", e))?;
        Ok(orig)
    }

    pub fn update_status_and_target(&self, id: i64, status: &str, target_app: Option<&str>, failure_reason: Option<&str>) -> Result<(), String> {
        let conn = self.open_conn()?;
        conn.execute(
            "UPDATE transcript_history SET status = ?1, target_app = COALESCE(?2, target_app), failure_reason = ?3 WHERE id = ?4",
            params![status, target_app, failure_reason, id],
        ).map_err(|e| format!("DB status/target update failed: {}", e))?;
        Ok(())
    }

    pub fn get_record(&self, id: i64) -> Result<Option<HistoryRecord>, String> {
        let conn = self.open_conn()?;
        let mut stmt = conn.prepare(
            "SELECT id, timestamp_ms, original_text, formatted_text, duration_seconds, status, target_app, failure_reason, session_id, user_edited_text
             FROM transcript_history WHERE id = ?1"
        ).map_err(|e| format!("DB prepare failed: {}", e))?;

        let mut rows = stmt.query_map(params![id], |row| {
            Ok(HistoryRecord {
                id: row.get(0)?,
                timestamp_ms: row.get(1)?,
                original_text: row.get(2)?,
                formatted_text: row.get(3)?,
                duration_seconds: row.get(4)?,
                status: row.get(5)?,
                target_app: row.get(6)?,
                failure_reason: row.get(7)?,
                session_id: row.get(8)?,
                user_edited_text: row.get(9).ok(),
            })
        }).map_err(|e| format!("DB query failed: {}", e))?;

        if let Some(record) = rows.next() {
            record.map(Some).map_err(|e| e.to_string())
        } else {
            Ok(None)
        }
    }

    pub fn list_records(&self, limit: u32) -> Result<Vec<HistoryRecord>, String> {
        let conn = self.open_conn()?;
        let mut stmt = conn.prepare(
            "SELECT id, timestamp_ms, original_text, formatted_text, duration_seconds, status, target_app, failure_reason, session_id, user_edited_text
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
                failure_reason: row.get(7)?,
                session_id: row.get(8)?,
                user_edited_text: row.get(9).ok(),
            })
        }).map_err(|e| format!("DB query execution failed: {}", e))?;

        let mut records = Vec::new();
        for r in rows {
            if let Ok(rec) = r {
                records.push(rec);
            }
        }
        Ok(records)
    }

    pub fn list_recovery_records(&self, limit: u32) -> Result<Vec<HistoryRecord>, String> {
        let conn = self.open_conn()?;
        let mut stmt = conn.prepare(
            "SELECT id, timestamp_ms, original_text, formatted_text, duration_seconds, status, target_app, failure_reason, session_id, user_edited_text
             FROM transcript_history
             WHERE status = 'recovery_required' OR status = 'uncertain' OR status = 'failed'
             ORDER BY id DESC LIMIT ?1"
        ).map_err(|e| format!("DB recovery query prepare failed: {}", e))?;

        let rows = stmt.query_map(params![limit], |row| {
            Ok(HistoryRecord {
                id: row.get(0)?,
                timestamp_ms: row.get(1)?,
                original_text: row.get(2)?,
                formatted_text: row.get(3)?,
                duration_seconds: row.get(4)?,
                status: row.get(5)?,
                target_app: row.get(6)?,
                failure_reason: row.get(7)?,
                session_id: row.get(8)?,
                user_edited_text: row.get(9).ok(),
            })
        }).map_err(|e| format!("DB recovery query execution failed: {}", e))?;

        let mut records = Vec::new();
        for r in rows {
            if let Ok(rec) = r {
                records.push(rec);
            }
        }
        Ok(records)
    }

    pub fn delete_record(&self, id: i64) -> Result<(), String> {
        let conn = self.open_conn()?;
        conn.execute("DELETE FROM transcript_history WHERE id = ?1", params![id])
            .map_err(|e| format!("Delete error: {}", e))?;
        Ok(())
    }

    pub fn clear_all(&self) -> Result<(), String> {
        let conn = self.open_conn()?;
        // Clears ALL transcript history (both regular dictations and pending recovery items),
        // while strictly preserving custom_dictionary, personal_vocabulary, and user settings.
        conn.execute("DELETE FROM transcript_history", [])
            .map_err(|e| format!("Clear error: {}", e))?;
        Ok(())
    }

    pub fn get_insights(&self) -> Result<InsightsData, String> {
        let conn = self.open_conn()?;
        let mut stmt = conn.prepare(
            "SELECT formatted_text, duration_seconds, timestamp_ms, target_app FROM transcript_history"
        ).map_err(|e| format!("DB prepare failed: {}", e))?;

        let mut total_words: u64 = 0;
        let mut total_duration_seconds: f32 = 0.0;
        let mut total_sessions: u64 = 0;
        let mut app_counts: std::collections::HashMap<String, u64> = std::collections::HashMap::new();
        let mut unique_days: std::collections::HashSet<String> = std::collections::HashSet::new();

        let rows = stmt.query_map([], |row| {
            let text: String = row.get(0)?;
            let dur: f32 = row.get(1)?;
            let ts: i64 = row.get(2)?;
            let app: Option<String> = row.get(3)?;
            Ok((text, dur, ts, app))
        }).map_err(|e| format!("DB query failed: {}", e))?;

        for r in rows {
            if let Ok((text, dur, ts, app)) = r {
                let wc = text.split_whitespace().count() as u64;
                total_words += wc;
                total_duration_seconds += dur;
                total_sessions += 1;

                let app_name = app.filter(|a| !a.trim().is_empty()).unwrap_or_else(|| "Other Apps".to_string());
                *app_counts.entry(app_name).or_insert(0) += wc.max(1);

                let day = ts / (1000 * 86400);
                unique_days.insert(day.to_string());
            }
        }

        let average_wpm = if total_duration_seconds > 0.0 && total_words > 0 {
            ((total_words as f32 / (total_duration_seconds / 60.0)).round() as u32).clamp(10, 350)
        } else {
            0
        };

        let time_saved_minutes = if total_words > 0 && average_wpm > 0 {
            let typing_mins = total_words as f32 / 40.0;
            let voice_mins = total_words as f32 / (average_wpm as f32);
            (typing_mins - voice_mins).max(0.0)
        } else {
            0.0
        };

        let streak_days = unique_days.len() as u32;

        let total_app_words: u64 = app_counts.values().sum();
        let mut app_usage = Vec::new();
        for (app_name, wc) in app_counts {
            let pct = if total_app_words > 0 {
                (wc as f32 / total_app_words as f32) * 100.0
            } else {
                0.0
            };
            app_usage.push(AppUsageStat {
                app_name,
                word_count: wc,
                percentage: pct,
            });
        }
        app_usage.sort_by(|a, b| b.word_count.cmp(&a.word_count));

        Ok(InsightsData {
            total_words,
            total_sessions,
            average_wpm,
            total_duration_seconds,
            time_saved_minutes,
            streak_days,
            app_usage,
        })
    }

    pub fn add_dictionary_entry(&self, original: &str, replacement: &str, category: &str) -> Result<i64, String> {
        let conn = self.open_conn()?;
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as i64;

        let orig = original.trim();
        let repl = replacement.trim();
        let cat = if category.trim().is_empty() { "name" } else { category.trim() };

        conn.execute(
            "INSERT INTO custom_dictionary (original_phrase, replacement_phrase, category, created_at) VALUES (?1, ?2, ?3, ?4)",
            params![orig, repl, cat, now],
        ).map_err(|e| format!("Add dictionary entry failed: {}", e))?;

        let id = conn.last_insert_rowid();

        // Also ensure active mirroring into personal_vocabulary
        let _ = conn.execute(
            "INSERT OR REPLACE INTO personal_vocabulary (original_text, preferred_text, entry_type, confidence, positive_count, negative_count, status, recognition_count, correction_count, application_count, last_used_at, created_at, updated_at)
             VALUES (?1, ?2, ?3, 1.0, 3, 0, 'active', 0, 0, 0, NULL, ?4, ?4)",
            params![orig, repl, cat, now],
        );

        Ok(id)
    }

    pub fn list_dictionary_entries(&self) -> Result<Vec<DictionaryEntry>, String> {
        let conn = self.open_conn()?;
        let mut stmt = conn.prepare(
            "SELECT id, original_phrase, replacement_phrase, category, created_at FROM custom_dictionary ORDER BY id DESC"
        ).map_err(|e| format!("DB prepare failed: {}", e))?;

        let rows = stmt.query_map([], |row| {
            let orig: String = row.get(1)?;
            let repl: String = row.get(2)?;
            Ok(DictionaryEntry {
                id: row.get(0)?,
                original_phrase: orig.clone(),
                replacement_phrase: repl.clone(),
                category: row.get(3)?,
                created_at: row.get(4)?,
                original: orig,
                replacement: repl,
            })
        }).map_err(|e| format!("DB query failed: {}", e))?;

        let mut entries = Vec::new();
        for r in rows {
            if let Ok(entry) = r {
                entries.push(entry);
            }
        }
        Ok(entries)
    }

    pub fn delete_dictionary_entry(&self, id: i64) -> Result<(), String> {
        let conn = self.open_conn()?;
        if let Ok((orig, repl)) = conn.query_row(
            "SELECT original_phrase, replacement_phrase FROM custom_dictionary WHERE id = ?1",
            params![id],
            |r| Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?)),
        ) {
            let _ = conn.execute(
                "DELETE FROM personal_vocabulary WHERE LOWER(original_text) = LOWER(?1) OR LOWER(preferred_text) = LOWER(?2)",
                params![orig, repl],
            );
        }
        conn.execute("DELETE FROM custom_dictionary WHERE id = ?1", params![id])
            .map_err(|e| format!("Delete dictionary entry failed: {}", e))?;
        Ok(())
    }

    pub fn get_dictionary_biasing_prompt(&self) -> Result<String, String> {
        let entries = self.list_dictionary_entries()?;
        let terms: Vec<String> = entries.into_iter()
            .map(|e| e.replacement_phrase)
            .filter(|s| !s.trim().is_empty())
            .collect();
        if terms.is_empty() {
            Ok(String::new())
        } else {
            Ok(format!("Technical dictation terms: {}.", terms.join(", ")))
        }
    }

    pub fn apply_dictionary_replacements(&self, text: &str) -> String {
        let entries = match self.list_dictionary_entries() {
            Ok(e) => e,
            Err(_) => return text.to_string(),
        };

        if entries.is_empty() {
            return text.to_string();
        }

        let mut sorted = entries;
        sorted.sort_by(|a, b| b.original_phrase.len().cmp(&a.original_phrase.len()));

        let mut result = text.to_string();
        for entry in sorted {
            let orig = entry.original_phrase.trim();
            let repl = entry.replacement_phrase.trim();
            if orig.is_empty() || repl.is_empty() || orig == repl {
                continue;
            }

            // Flexible phrase replacement (direct word boundary, condensed spaced variants, and multi-word matches)
            if let Some(new_text) = crate::personalization_service::replace_phrase_flexible(&result, orig, repl) {
                result = new_text;
            }
        }
        result
    }

    pub fn record_correction_event(
        &self,
        session_id: Option<&str>,
        original_text: &str,
        final_text: &str,
    ) -> Result<Vec<crate::personalization_service::PersonalVocabularyEntry>, String> {
        let orig_clean = original_text.trim();
        let final_clean = final_text.trim();

        if orig_clean.is_empty() || final_clean.is_empty() || orig_clean == final_clean {
            return Ok(Vec::new());
        }

        let conn = self.open_conn()?;
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as i64;

        // Record the event log
        let _ = conn.execute(
            "INSERT INTO correction_events (session_id, original_text, final_text, created_at, processed) VALUES (?1, ?2, ?3, ?4, 1)",
            params![session_id, orig_clean, final_clean, now],
        );

        let candidates = crate::personalization_service::extract_correction_candidates(orig_clean, final_clean);

        for cand in candidates {
            let cand_orig = cand.original_span.trim();
            let cand_pref = cand.preferred_span.trim();
            if cand_orig.is_empty() || cand_pref.is_empty() || (cand_orig.eq_ignore_ascii_case(cand_pref) && cand_orig == cand_pref) {
                continue;
            }

            // Look up existing entries for this original phrase (case-insensitive)
            let existing: Option<(i64, String, String, f32, i32, i32, String)> = conn.query_row(
                "SELECT id, original_text, preferred_text, confidence, positive_count, negative_count, status
                 FROM personal_vocabulary
                 WHERE LOWER(TRIM(original_text)) = LOWER(TRIM(?1))
                 LIMIT 1",
                params![cand_orig],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?, row.get(4)?, row.get(5)?, row.get(6)?)),
            ).ok();

            if let Some((id, _orig, prev_pref, _conf, pos, neg, status)) = existing {
                if prev_pref.trim().eq_ignore_ascii_case(cand_pref) {
                    // Confirmed preferred spelling
                    let new_pos = pos + 1;
                    let new_conf = ((new_pos as f32 + 1.0) / (new_pos as f32 + neg as f32 + 2.0)).min(1.0);
                    let new_status = if new_pos >= 2 && status == "candidate" {
                        "active"
                    } else {
                        &status
                    };

                    let _ = conn.execute(
                        "UPDATE personal_vocabulary SET positive_count = ?1, confidence = ?2, status = ?3, preferred_text = ?4, correction_count = correction_count + 1, updated_at = ?5 WHERE id = ?6",
                        params![new_pos, new_conf, new_status, cand_pref, now, id],
                    );

                    // Also mirror into custom_dictionary so the user sees a direct record in their Dictionary
                    let _ = conn.execute(
                        "INSERT OR REPLACE INTO custom_dictionary (original_phrase, replacement_phrase, category, created_at) VALUES (?1, ?2, ?3, ?4)",
                        params![cand_orig, cand_pref, cand.entry_type, now],
                    );
                } else {
                    // Contradiction / Reversion / Alternative
                    let new_neg = neg + 1;
                    let new_conf = ((pos as f32 + 1.0) / (pos as f32 + new_neg as f32 + 2.0)).min(1.0);
                    let new_status = if new_conf < 0.40 { "disabled" } else { &status };

                    let _ = conn.execute(
                        "UPDATE personal_vocabulary SET negative_count = ?1, confidence = ?2, status = ?3, updated_at = ?4 WHERE id = ?5",
                        params![new_neg, new_conf, new_status, now, id],
                    );

                    // Insert the new candidate
                    let _ = conn.execute(
                        "INSERT INTO personal_vocabulary (original_text, preferred_text, entry_type, confidence, positive_count, negative_count, status, recognition_count, correction_count, application_count, last_used_at, created_at, updated_at, source)
                         VALUES (?1, ?2, ?3, 0.55, 1, 0, 'candidate', 0, 1, 0, NULL, ?4, ?4, 'learned')",
                        params![cand_orig, cand_pref, cand.entry_type, now],
                    );
                }
            } else {
                // New candidate from user's direct edit:
                // Automatically set to 'active' with high confidence so subsequent dictations use it immediately
                let initial_status = "active";
                let initial_conf: f32 = 0.85;
                let _ = conn.execute(
                    "INSERT INTO personal_vocabulary (original_text, preferred_text, entry_type, confidence, positive_count, negative_count, status, recognition_count, correction_count, application_count, last_used_at, created_at, updated_at, source)
                     VALUES (?1, ?2, ?3, ?4, 1, 0, ?5, 0, 1, 0, NULL, ?6, ?6, 'learned')",
                    params![cand_orig, cand_pref, cand.entry_type, initial_conf, initial_status, now],
                );

                // Mirror into custom_dictionary so the user sees a direct record in their Dictionary
                let _ = conn.execute(
                    "INSERT OR REPLACE INTO custom_dictionary (original_phrase, replacement_phrase, category, created_at) VALUES (?1, ?2, ?3, ?4)",
                    params![cand_orig, cand_pref, cand.entry_type, now],
                );
            }
        }

        self.list_personal_vocabulary(None)
    }

    pub fn list_personal_vocabulary(
        &self,
        status_filter: Option<&str>,
    ) -> Result<Vec<crate::personalization_service::PersonalVocabularyEntry>, String> {
        let conn = self.open_conn()?;
        let mut query = "SELECT id, original_text, preferred_text, entry_type, context_domain, confidence, positive_count, negative_count, status, recognition_count, correction_count, application_count, last_used_at, created_at, updated_at, source FROM personal_vocabulary".to_string();

        if let Some(status) = status_filter {
            query.push_str(&format!(" WHERE status = '{}'", status.replace('\'', "''")));
        }
        query.push_str(" ORDER BY confidence DESC, positive_count DESC, id DESC");

        let mut stmt = conn.prepare(&query).map_err(|e| format!("Prepare failed: {}", e))?;
        let rows = stmt.query_map([], |row| {
            Ok(crate::personalization_service::PersonalVocabularyEntry {
                id: row.get(0)?,
                original_text: row.get(1)?,
                preferred_text: row.get(2)?,
                entry_type: row.get(3)?,
                context_domain: row.get(4)?,
                confidence: row.get(5)?,
                positive_count: row.get(6)?,
                negative_count: row.get(7)?,
                status: row.get(8)?,
                recognition_count: row.get(9).unwrap_or(0),
                correction_count: row.get(10).unwrap_or(0),
                application_count: row.get(11).unwrap_or(0),
                last_used_at: row.get(12).ok(),
                created_at: row.get(13)?,
                updated_at: row.get(14)?,
                source: row.get(15).unwrap_or_else(|_| "manual".to_string()),
            })
        }).map_err(|e| format!("Query failed: {}", e))?;

        let mut entries = Vec::new();
        for r in rows {
            if let Ok(e) = r {
                entries.push(e);
            }
        }
        Ok(entries)
    }

    pub fn add_personal_vocabulary(
        &self,
        original: &str,
        preferred: &str,
        entry_type: &str,
        status: &str,
        source: Option<&str>,
    ) -> Result<crate::personalization_service::PersonalVocabularyEntry, String> {
        let conn = self.open_conn()?;
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as i64;

        let orig = original.trim();
        let pref = preferred.trim();
        if orig.is_empty() || pref.is_empty() {
            return Err("Original and preferred text cannot be empty".to_string());
        }

        let cat = if entry_type.trim().is_empty() { "general" } else { entry_type.trim() };
        let stat = if status.trim().is_empty() { "active" } else { status.trim() };
        let src = source.unwrap_or("manual").trim();
        let conf: f32 = if stat == "active" { 1.0 } else { 0.5 };
        let pos = if stat == "active" { 3 } else { 1 };

        conn.execute(
            "INSERT INTO personal_vocabulary (original_text, preferred_text, entry_type, confidence, positive_count, negative_count, status, recognition_count, correction_count, application_count, last_used_at, created_at, updated_at, source)
             VALUES (?1, ?2, ?3, ?4, ?5, 0, ?6, 0, 0, 0, NULL, ?7, ?7, ?8)",
            params![orig, pref, cat, conf, pos, stat, now, src],
        ).map_err(|e| format!("Insert failed: {}", e))?;

        let id = conn.last_insert_rowid();

        if stat == "active" {
            let _ = conn.execute(
                "INSERT OR REPLACE INTO custom_dictionary (original_phrase, replacement_phrase, category, created_at) VALUES (?1, ?2, ?3, ?4)",
                params![orig, pref, cat, now],
            );
        }

        Ok(crate::personalization_service::PersonalVocabularyEntry {
            id,
            original_text: orig.to_string(),
            preferred_text: pref.to_string(),
            entry_type: cat.to_string(),
            context_domain: None,
            confidence: conf,
            positive_count: pos,
            negative_count: 0,
            status: stat.to_string(),
            recognition_count: 0,
            correction_count: 0,
            application_count: 0,
            last_used_at: None,
            created_at: now,
            updated_at: now,
            source: src.to_string(),
        })
    }

    pub fn toggle_personal_vocabulary(&self, id: i64, active: bool) -> Result<(), String> {
        let conn = self.open_conn()?;
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as i64;
        let stat = if active { "active" } else { "disabled" };
        let conf: f32 = if active { 1.0 } else { 0.0 };

        conn.execute(
            "UPDATE personal_vocabulary SET status = ?1, confidence = ?2, updated_at = ?3 WHERE id = ?4",
            params![stat, conf, now, id],
        ).map_err(|e| format!("Toggle failed: {}", e))?;

        if let Ok((orig, pref, cat)) = conn.query_row(
            "SELECT original_text, preferred_text, entry_type FROM personal_vocabulary WHERE id = ?1",
            params![id],
            |r| Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?, r.get::<_, String>(2)?)),
        ) {
            if active {
                let _ = conn.execute(
                    "INSERT OR REPLACE INTO custom_dictionary (original_phrase, replacement_phrase, category, created_at) VALUES (?1, ?2, ?3, ?4)",
                    params![orig, pref, cat, now],
                );
            } else {
                let _ = conn.execute(
                    "DELETE FROM custom_dictionary WHERE LOWER(original_phrase) = LOWER(?1)",
                    params![orig],
                );
            }
        }

        Ok(())
    }

    pub fn export_dictionary_json(&self) -> Result<String, String> {
        let entries = self.list_personal_vocabulary(None)?;
        serde_json::to_string_pretty(&entries)
            .map_err(|e| format!("Serialization failed: {}", e))
    }

    pub fn update_personal_vocabulary_full(
        &self,
        id: i64,
        original_text: Option<&str>,
        preferred_text: Option<&str>,
        entry_type: Option<&str>,
        status: Option<&str>,
    ) -> Result<(), String> {
        let conn = self.open_conn()?;
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as i64;

        // Fetch existing record
        let (old_orig, old_pref, old_type, old_status): (String, String, String, String) = conn
            .query_row(
                "SELECT original_text, preferred_text, entry_type, status FROM personal_vocabulary WHERE id = ?1",
                params![id],
                |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?)),
            )
            .map_err(|e| format!("Entry not found: {}", e))?;

        let new_orig = original_text.map(|s| s.trim()).filter(|s| !s.is_empty()).unwrap_or(&old_orig);
        let new_pref = preferred_text.map(|s| s.trim()).filter(|s| !s.is_empty()).unwrap_or(&old_pref);
        let new_type = entry_type.map(|s| s.trim()).filter(|s| !s.is_empty()).unwrap_or(&old_type);
        let new_stat = status.map(|s| s.trim()).filter(|s| !s.is_empty()).unwrap_or(&old_status);

        let conf: f32 = if new_stat == "active" { 1.0 } else if new_stat == "rejected" { 0.0 } else { 0.5 };

        conn.execute(
            "UPDATE personal_vocabulary SET original_text = ?1, preferred_text = ?2, entry_type = ?3, status = ?4, confidence = ?5, updated_at = ?6 WHERE id = ?7",
            params![new_orig, new_pref, new_type, new_stat, conf, now, id],
        ).map_err(|e| format!("Update personal_vocabulary failed: {}", e))?;

        // Synchronize custom_dictionary: delete old mirror entry and insert updated one if active
        let _ = conn.execute(
            "DELETE FROM custom_dictionary WHERE LOWER(original_phrase) = LOWER(?1) OR LOWER(original_phrase) = LOWER(?2)",
            params![old_orig, new_orig],
        );

        if new_stat == "active" && !new_orig.is_empty() && !new_pref.is_empty() {
            let _ = conn.execute(
                "INSERT INTO custom_dictionary (original_phrase, replacement_phrase, category, created_at) VALUES (?1, ?2, ?3, ?4)",
                params![new_orig, new_pref, new_type, now],
            );
        }

        Ok(())
    }

    pub fn update_personal_vocabulary(&self, id: i64, preferred_text: &str, status: &str) -> Result<(), String> {
        self.update_personal_vocabulary_full(id, None, Some(preferred_text), None, Some(status))
    }

    pub fn delete_personal_vocabulary(&self, id: i64) -> Result<(), String> {
        let conn = self.open_conn()?;
        if let Ok((orig, pref)) = conn.query_row(
            "SELECT original_text, preferred_text FROM personal_vocabulary WHERE id = ?1",
            params![id],
            |r| Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?)),
        ) {
            let _ = conn.execute(
                "DELETE FROM custom_dictionary WHERE LOWER(original_phrase) = LOWER(?1) OR LOWER(replacement_phrase) = LOWER(?2)",
                params![orig, pref],
            );
        }
        conn.execute("DELETE FROM personal_vocabulary WHERE id = ?1", params![id])
            .map_err(|e| format!("Delete failed: {}", e))?;
        Ok(())
    }

    pub fn reset_personalization(&self) -> Result<(), String> {
        let conn = self.open_conn()?;
        conn.execute("DELETE FROM personal_vocabulary", [])
            .map_err(|e| format!("Clear personal_vocabulary failed: {}", e))?;
        conn.execute("DELETE FROM custom_dictionary", [])
            .map_err(|e| format!("Clear custom_dictionary failed: {}", e))?;
        conn.execute("DELETE FROM correction_events", [])
            .map_err(|e| format!("Clear correction_events failed: {}", e))?;
        conn.execute("DELETE FROM formatting_preferences", [])
            .map_err(|e| format!("Clear formatting_preferences failed: {}", e))?;
        Ok(())
    }

    pub fn get_active_biasing_prompt(&self) -> Result<String, String> {
        let mut terms = Vec::new();

        // 1. User's custom dictionary replacement phrases come FIRST
        if let Ok(entries) = self.list_dictionary_entries() {
            for e in entries {
                let repl = e.replacement_phrase.trim().to_string();
                if !repl.is_empty() && !terms.contains(&repl) {
                    terms.push(repl);
                }
                if terms.len() >= 15 {
                    break;
                }
            }
        }

        // 2. User's active personal vocabulary entries (learned, taught, and approved)
        if let Ok(vocab) = self.list_personal_vocabulary(Some("active")) {
            for entry in vocab {
                let term = entry.preferred_text.trim().to_string();
                if !term.is_empty() && !terms.contains(&term) {
                    terms.push(term);
                }
                if terms.len() >= 20 {
                    break;
                }
            }
        }

        if terms.is_empty() {
            Ok(String::new())
        } else {
            Ok(format!("Dictation vocabulary: {}.", terms.join(", ")))
        }
    }

    pub fn record_vocabulary_application(&self, rule_ids: &[i64]) -> Result<(), String> {
        if rule_ids.is_empty() {
            return Ok(());
        }
        let conn = self.open_conn()?;
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as i64;
        for id in rule_ids {
            let _ = conn.execute(
                "UPDATE personal_vocabulary SET application_count = application_count + 1, last_used_at = ?1, updated_at = ?1 WHERE id = ?2",
                params![now, id],
            );
        }
        Ok(())
    }

    pub fn record_vocabulary_recognitions(&self, text: &str) -> Result<(), String> {
        let conn = self.open_conn()?;
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as i64;
        let text_lower = text.to_lowercase();
        if let Ok(entries) = self.list_personal_vocabulary(Some("active")) {
            for e in entries {
                let term = e.preferred_text.trim();
                if !term.is_empty() && text_lower.contains(&term.to_lowercase()) {
                    let _ = conn.execute(
                        "UPDATE personal_vocabulary SET recognition_count = recognition_count + 1, last_used_at = ?1, updated_at = ?1 WHERE id = ?2",
                        params![now, e.id],
                    );
                }
            }
        }
        Ok(())
    }

    pub fn apply_personalization_pipeline(&self, text: &str) -> (String, Vec<String>) {
        let mut applied = Vec::new();

        // Step 1: Apply active personal vocabulary rules (conservative word-boundary aware)
        let rules = self.list_personal_vocabulary(Some("active")).unwrap_or_default();
        let (vocab_applied, mut vocab_terms, applied_ids) = crate::personalization_service::apply_vocabulary_rules(text, &rules);
        applied.append(&mut vocab_terms);

        if !applied_ids.is_empty() {
            let _ = self.record_vocabulary_application(&applied_ids);
        }

        // Step 2: Apply custom dictionary replacements
        let dict_applied = self.apply_dictionary_replacements(&vocab_applied);
        if dict_applied != vocab_applied && applied.is_empty() {
            applied.push("Dictionary correction applied".to_string());
        }

        (dict_applied, applied)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_clear_history_clears_all_transcripts_and_preserves_dictionary() {
        let history = HistoryDatabase::new_test().expect("Failed to open test DB");

        // 1. Insert 2 completed records and 1 recovery_required record
        let id1 = history.insert_record("test 1", "Test 1.", 2.0, "inserted", Some("TextEdit"), None, Some("sess-1")).unwrap();
        let id2 = history.insert_record("test 2", "Test 2.", 3.0, "inserted", Some("Slack"), None, Some("sess-2")).unwrap();
        let id_rec = history.insert_record("need recovery", "Need recovery.", 4.0, "recovery_required", Some("WhatsApp"), Some("Target lost"), Some("sess-rec")).unwrap();

        // 2. Add an entry to custom dictionary
        history.add_dictionary_entry("voxquest", "VoxQuest", "brand").unwrap();

        // 3. Execute clear_all
        history.clear_all().expect("Clear all must succeed");

        // 4. Verify ALL transcript records are deleted
        assert!(history.get_record(id1).unwrap().is_none(), "Completed record 1 should be deleted");
        assert!(history.get_record(id2).unwrap().is_none(), "Completed record 2 should be deleted");
        assert!(history.get_record(id_rec).unwrap().is_none(), "Recovery record should also be deleted when user chooses Clear All");

        // 5. Verify custom dictionary is strictly PRESERVED
        let dict = history.list_dictionary_entries().unwrap();
        assert!(dict.iter().any(|d| d.replacement_phrase == "VoxQuest"), "Custom dictionary must be preserved during clear history");
    }

    #[test]
    fn test_dictionary_and_personal_vocabulary_synchronization() {
        let history = HistoryDatabase::new_test().expect("Failed to open test DB");

        // 1. Adding to dictionary also creates active entry in personal_vocabulary
        let d_id = history.add_dictionary_entry("api", "API", "acronym").unwrap();
        let dict = history.list_dictionary_entries().unwrap();
        let vocab = history.list_personal_vocabulary(None).unwrap();

        let dict_entry = dict.iter().find(|d| d.id == d_id).expect("Dictionary entry must exist");
        assert_eq!(dict_entry.original, "api");
        assert_eq!(dict_entry.replacement, "API");
        assert_eq!(dict_entry.original_phrase, "api");
        assert_eq!(dict_entry.replacement_phrase, "API");

        assert!(vocab.iter().any(|v| v.original_text == "api" && v.preferred_text == "API"), "Must mirror to personal_vocabulary");

        // 2. Deleting from dictionary cleans up personal_vocabulary
        history.delete_dictionary_entry(d_id).unwrap();
        let dict_after = history.list_dictionary_entries().unwrap();
        let vocab_after = history.list_personal_vocabulary(None).unwrap();
        assert!(!dict_after.iter().any(|d| d.id == d_id));
        assert!(!vocab_after.iter().any(|v| v.original_text == "api" && v.preferred_text == "API"));

        // 3. Adding to personal_vocabulary also mirrors to custom_dictionary
        let v_entry = history.add_personal_vocabulary("satoshi", "Satoshi", "name", "active", Some("manual")).unwrap();
        let dict_v = history.list_dictionary_entries().unwrap();
        assert!(dict_v.iter().any(|d| d.original == "satoshi" && d.replacement == "Satoshi"));

        // 4. Deleting from personal_vocabulary cleans up custom_dictionary
        history.delete_personal_vocabulary(v_entry.id).unwrap();
        let dict_final = history.list_dictionary_entries().unwrap();
        assert!(!dict_final.iter().any(|d| d.original == "satoshi"));
    }
}
