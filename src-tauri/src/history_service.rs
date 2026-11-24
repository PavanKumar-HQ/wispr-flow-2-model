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
    pub total_characters: u64,
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
pub struct TrainingSample {
    pub id: i64,
    pub session_id: String,
    pub speaker_id: String,
    pub audio_path: Option<String>,
    pub raw_transcript: String,
    pub corrected_transcript: String,
    pub accent_tag: String,
    pub duration_ms: i64,
    pub is_exported: bool,
    pub created_at: i64,
}

pub static BUNDLED_INDIAN_TECH_LEXICON: &[(&str, &str, &str)] = &[
    // Cloud, Containers & Infrastructure
    ("cooper net ease", "Kubernetes", "tech"),
    ("cooper netis", "Kubernetes", "tech"),
    ("kubernetis", "Kubernetes", "tech"),
    ("k eight s", "K8s", "tech"),
    ("k 8 s", "K8s", "tech"),
    ("docker compose", "Docker Compose", "tech"),
    ("docker file", "Dockerfile", "tech"),
    ("postgre", "PostgreSQL", "tech"),
    ("postgress", "PostgreSQL", "tech"),
    ("post grass", "PostgreSQL", "tech"),
    ("pi g admin", "pgAdmin", "tech"),
    ("pg admin", "pgAdmin", "tech"),
    ("ci cd", "CI/CD", "tech"),
    ("c i c d", "CI/CD", "tech"),
    ("aws", "AWS", "tech"),
    ("a w s", "AWS", "tech"),
    ("gcp", "GCP", "tech"),
    ("g c p", "GCP", "tech"),
    ("s three", "S3", "tech"),
    ("s 3", "S3", "tech"),
    ("ec two", "EC2", "tech"),
    ("ec 2", "EC2", "tech"),
    ("lambda function", "Lambda function", "tech"),
    ("serverless", "serverless", "tech"),
    ("microservice", "microservice", "tech"),
    ("micro services", "microservices", "tech"),
    ("monorepo", "monorepo", "tech"),
    ("grpc", "gRPC", "tech"),
    ("g r p c", "gRPC", "tech"),
    ("protobuf", "Protobuf", "tech"),
    ("web socket", "WebSocket", "tech"),
    ("websockets", "WebSockets", "tech"),

    // Programming Languages, Frameworks & Common Mishearings
    ("skima", "schema", "tech"),
    ("toople", "tuple", "tech"),
    ("rooter", "router", "tech"),
    ("sequel", "SQL", "tech"),
    ("s q l", "SQL", "tech"),
    ("no sequel", "NoSQL", "tech"),
    ("fast api", "FastAPI", "tech"),
    ("next to js", "Next.js", "tech"),
    ("next js", "Next.js", "tech"),
    ("node js", "Node.js", "tech"),
    ("react in js", "React.js", "tech"),
    ("react js", "React", "tech"),
    ("vue js", "Vue.js", "tech"),
    ("taiwind", "Tailwind CSS", "tech"),
    ("tail wind", "Tailwind CSS", "tech"),
    ("tauri", "Tauri", "tech"),
    ("towry", "Tauri", "tech"),
    ("rust lang", "Rust", "tech"),
    ("tokio", "Tokio", "tech"),
    ("tokyo runtime", "Tokio", "tech"),
    ("mongo db", "MongoDB", "tech"),
    ("redis", "Redis", "tech"),
    ("j son", "JSON", "tech"),
    ("yaml", "YAML", "tech"),
    ("yammel", "YAML", "tech"),
    ("graphql", "GraphQL", "tech"),
    ("graph q l", "GraphQL", "tech"),
    ("rest api", "REST API", "tech"),
    ("jwt", "JWT", "tech"),
    ("jot token", "JWT", "tech"),
    ("oauth", "OAuth", "tech"),
    ("regex", "RegEx", "tech"),
    ("crud", "CRUD", "tech"),
    ("sdk", "SDK", "tech"),
    ("cli", "CLI", "tech"),
    ("devops", "DevOps", "tech"),
    ("async await", "async/await", "tech"),
    ("middleware", "middleware", "tech"),
    ("frontend", "frontend", "tech"),
    ("backend", "backend", "tech"),
    ("fullstack", "fullstack", "tech"),

    // Developer Workflows & Git
    ("pr", "PR", "tech"),
    ("p r", "PR", "tech"),
    ("pull req", "pull request", "tech"),
    ("git hub", "GitHub", "tech"),
    ("git lab", "GitLab", "tech"),
    ("git commit", "git commit", "tech"),
    ("git push", "git push", "tech"),
    ("git pull", "git pull", "tech"),
    ("git merge", "git merge", "tech"),
    ("git rebase", "git rebase", "tech"),
    ("git stash", "git stash", "tech"),
    ("merge conflict", "merge conflict", "tech"),
    ("prod deployment", "production deployment", "tech"),
    ("staging env", "staging environment", "tech"),

    // Computer Science, DSA & Interview Prep (Indian Student Cohorts)
    ("null pointer", "NullPointerException", "tech"),
    ("null pointer exception", "NullPointerException", "tech"),
    ("hash map", "HashMap", "tech"),
    ("hashmap", "HashMap", "tech"),
    ("linked list", "LinkedList", "tech"),
    ("binary search", "binary search", "tech"),
    ("dynamic programming", "dynamic programming", "tech"),
    ("dp problem", "DP problem", "tech"),
    ("dsa", "DSA", "tech"),
    ("d s a", "DSA", "tech"),
    ("time complexity", "time complexity", "tech"),
    ("space complexity", "space complexity", "tech"),
    ("big o", "Big-O", "tech"),
    ("leetcode", "LeetCode", "tech"),
    ("leet code", "LeetCode", "tech"),
    ("codeforces", "Codeforces", "tech"),
    ("code forces", "Codeforces", "tech"),
    ("hackerrank", "HackerRank", "tech"),
    ("hacker rank", "HackerRank", "tech"),

    // Workplace, Productivity & Ecosystem Tools
    ("antigravity", "Antigravity", "tech"),
    ("anti gravity", "Antigravity", "tech"),
    ("voxquest", "VoxQuest", "tech"),
    ("vox quest", "VoxQuest", "tech"),
    ("foxquest", "VoxQuest", "tech"),
    ("whisper flow", "Wispr Flow", "tech"),
    ("jira ticket", "Jira ticket", "tech"),
    ("confluence doc", "Confluence doc", "tech"),
    ("figma design", "Figma design", "tech"),

    // Indian Professional & Workplace Idioms / Phrases
    ("prepone", "prepone", "workplace"),
    ("preponed", "preponed", "workplace"),
    ("preponing", "preponing", "workplace"),
    ("revert back", "revert back", "workplace"),
    ("do the needful", "do the needful", "workplace"),
    ("out of station", "out of station", "workplace"),
    ("today itself", "today itself", "workplace"),
    ("updation", "updation", "workplace"),
    ("intimation", "intimation", "workplace"),
    ("batchmate", "batchmate", "workplace"),
    ("batchmates", "batchmates", "workplace"),
    ("passed out of college", "graduated from college", "workplace"),
    ("having a doubt", "having a question", "workplace"),
    ("one of my friend", "one of my friends", "workplace"),
    ("discuss about", "discuss", "workplace"),
    ("firstly", "firstly", "workplace"),

    // Accent Phonetic Mishearings (Empirically Harvested from Dictation)
    ("whisper float", "Wispr Flow", "tech"),
    ("court club", "Code Club", "workplace"),
    ("sbro", "Yes bro", "slang"),
    ("s bro", "Yes bro", "slang"),
    ("show the comments", "show the commands", "tech"),
    ("do it to guys", "do it together", "workplace"),
    ("taking us wrong", "taking as wrong", "workplace"),
    ("abhinavad", "Abhinav", "name"),
    ("el one", "EL-1", "tech"),
    ("el two", "EL-2", "tech"),
    ("el 1", "EL-1", "tech"),
    ("el 2", "EL-2", "tech"),

    // Tribe, Community & Cohort Terminology
    ("try members", "tribe members", "workplace"),
    ("try member", "tribe member", "workplace"),
    ("our try", "our tribe", "workplace"),
    ("the try", "the tribe", "workplace"),
    ("trive", "tribe", "workplace"),
    ("trive members", "tribe members", "workplace"),
    ("tribe members", "tribe members", "workplace"),
    ("core try", "core tribe", "workplace"),
    ("tech try", "tech tribe", "workplace"),

    // Ma'am & Respectful Workplace Address
    ("maam", "Ma'am", "workplace"),
    ("ma am", "Ma'am", "workplace"),
    ("yes maam", "Yes, ma'am", "workplace"),
    ("yeah maam", "Yeah, ma'am", "workplace"),
    ("no maam", "No, ma'am", "workplace"),
    ("ok maam", "Okay, ma'am", "workplace"),
    ("okay maam", "Okay, ma'am", "workplace"),
    ("thank you maam", "Thank you, ma'am", "workplace"),
    ("thanks maam", "Thanks, ma'am", "workplace"),
    ("hello maam", "Hello, ma'am", "workplace"),
    ("hi maam", "Hi, ma'am", "workplace"),
    ("madamji", "Madam", "workplace"),

    // Discourse Markers ("and all")
    ("and all", "and all", "workplace"),
    ("plans and all", "plans and all", "workplace"),
    ("things and all", "things and all", "workplace"),
    ("stuff and all", "stuff and all", "workplace"),
    ("photos and all", "photos and all", "workplace"),
    ("videos and all", "videos and all", "workplace"),
    ("and all that", "and all that", "workplace"),
];

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

        // Cleanup existing duplicates to keep database clean
        let _ = conn.execute(
            "DELETE FROM custom_dictionary WHERE id NOT IN (SELECT MAX(id) FROM custom_dictionary GROUP BY LOWER(original_phrase))",
            [],
        );
        let _ = conn.execute(
            "DELETE FROM personal_vocabulary WHERE id NOT IN (SELECT MAX(id) FROM personal_vocabulary GROUP BY LOWER(original_text))",
            [],
        );

        // Ensure "dishtary" -> "dictionary" is seeded in production dictionary so mishearings are guaranteed to be corrected
        if !db_path.to_string_lossy().contains("test") {
            let now = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() as i64;

            let exists_dict: bool = conn.query_row(
                "SELECT COUNT(*) FROM custom_dictionary WHERE LOWER(original_phrase) = 'dishtary'",
                [],
                |r| Ok(r.get::<_, i64>(0)? > 0),
            ).unwrap_or(false);

            if !exists_dict {
                let _ = conn.execute(
                    "INSERT INTO custom_dictionary (original_phrase, replacement_phrase, category, created_at) VALUES ('dishtary', 'dictionary', 'spelling', ?1)",
                    params![now],
                );
            }

            let exists_vocab: bool = conn.query_row(
                "SELECT COUNT(*) FROM personal_vocabulary WHERE LOWER(original_text) = 'dishtary'",
                [],
                |r| Ok(r.get::<_, i64>(0)? > 0),
            ).unwrap_or(false);

            if !exists_vocab {
                let _ = conn.execute(
                    "INSERT INTO personal_vocabulary (original_text, preferred_text, entry_type, confidence, positive_count, negative_count, status, recognition_count, correction_count, application_count, last_used_at, created_at, updated_at, source)
                     VALUES ('dishtary', 'dictionary', 'spelling', 1.0, 3, 0, 'active', 0, 0, 0, NULL, ?1, ?1, 'builtin')",
                    params![now],
                );
            }
        }

        // Migration tracking table for idempotent versioned database enhancements
        conn.execute(
            "CREATE TABLE IF NOT EXISTS schema_migrations (
                migration_key TEXT PRIMARY KEY,
                applied_at INTEGER NOT NULL
            )",
            [],
        ).map_err(|e| format!("DB schema schema_migrations init failed: {}", e))?;

        // Multi-speaker training dataset harvester table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS speech_training_samples (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                speaker_id TEXT NOT NULL DEFAULT 'student_speaker',
                audio_path TEXT,
                raw_transcript TEXT NOT NULL,
                corrected_transcript TEXT NOT NULL,
                accent_tag TEXT NOT NULL DEFAULT 'indian_tech',
                duration_ms INTEGER NOT NULL DEFAULT 0,
                is_exported INTEGER NOT NULL DEFAULT 0,
                created_at INTEGER NOT NULL
            )",
            [],
        ).map_err(|e| format!("DB schema speech_training_samples init failed: {}", e))?;

        // Pre-bundle comprehensive Indian Technical & Developer Lexicon directly into the database on startup
        let already_seeded_indian: bool = conn.query_row(
            "SELECT COUNT(*) FROM schema_migrations WHERE migration_key = 'bundled_indian_tech_v1'",
            [],
            |r| Ok(r.get::<_, i64>(0)? > 0),
        ).unwrap_or(false);

        if !already_seeded_indian {
            let now = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() as i64;

            for (orig, repl, cat) in BUNDLED_INDIAN_TECH_LEXICON {
                // 1. Seed into custom_dictionary if not present
                let _ = conn.execute(
                    "INSERT OR IGNORE INTO custom_dictionary (original_phrase, replacement_phrase, category, created_at)
                     VALUES (?1, ?2, ?3, ?4)",
                    params![orig, repl, cat, now],
                );

                // 2. Seed into personal_vocabulary if not present
                let exists: bool = conn.query_row(
                    "SELECT COUNT(*) FROM personal_vocabulary WHERE LOWER(original_text) = LOWER(?1)",
                    params![orig],
                    |r| Ok(r.get::<_, i64>(0)? > 0),
                ).unwrap_or(false);

                if !exists {
                    let _ = conn.execute(
                        "INSERT INTO personal_vocabulary (original_text, preferred_text, entry_type, confidence, positive_count, negative_count, status, recognition_count, correction_count, application_count, last_used_at, created_at, updated_at, source)
                         VALUES (?1, ?2, ?3, 1.0, 5, 0, 'active', 0, 0, 0, NULL, ?4, ?4, 'bundled_indian_tech')",
                        params![orig, repl, cat, now],
                    );
                }
            }

            let _ = conn.execute(
                "INSERT OR REPLACE INTO schema_migrations (migration_key, applied_at) VALUES ('bundled_indian_tech_v1', ?1)",
                params![now],
            );
        }

        // Migration v2: Seed Tribe, Ma'am, and Indian conversational discourse markers; purge toxic common word replacements
        let already_seeded_v2: bool = conn.query_row(
            "SELECT COUNT(*) FROM schema_migrations WHERE migration_key = 'bundled_indian_tech_v2'",
            [],
            |r| Ok(r.get::<_, i64>(0)? > 0),
        ).unwrap_or(false);

        if !already_seeded_v2 {
            let now = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() as i64;

            // Purge toxic corruptions of high-frequency English words
            let _ = conn.execute("DELETE FROM custom_dictionary WHERE LOWER(original_phrase) IN ('ma', 'man', 'men')", []);
            let _ = conn.execute("DELETE FROM personal_vocabulary WHERE LOWER(original_text) IN ('ma', 'man', 'men')", []);

            for (orig, repl, cat) in BUNDLED_INDIAN_TECH_LEXICON {
                let _ = conn.execute(
                    "INSERT OR IGNORE INTO custom_dictionary (original_phrase, replacement_phrase, category, created_at)
                     VALUES (?1, ?2, ?3, ?4)",
                    params![orig, repl, cat, now],
                );
                let exists: bool = conn.query_row(
                    "SELECT COUNT(*) FROM personal_vocabulary WHERE LOWER(original_text) = LOWER(?1)",
                    params![orig],
                    |r| Ok(r.get::<_, i64>(0)? > 0),
                ).unwrap_or(false);

                if !exists {
                    let _ = conn.execute(
                        "INSERT INTO personal_vocabulary (original_text, preferred_text, entry_type, confidence, positive_count, negative_count, status, recognition_count, correction_count, application_count, last_used_at, created_at, updated_at, source)
                         VALUES (?1, ?2, ?3, 1.0, 5, 0, 'active', 0, 0, 0, NULL, ?4, ?4, 'bundled_indian_tech')",
                        params![orig, repl, cat, now],
                    );
                }
            }

            let _ = conn.execute(
                "INSERT OR REPLACE INTO schema_migrations (migration_key, applied_at) VALUES ('bundled_indian_tech_v2', ?1)",
                params![now],
            );
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
        let mut total_characters: u64 = 0;
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
                total_characters += text.chars().count() as u64;
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
            ((typing_mins - voice_mins).max(0.0)).round()
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
            total_characters,
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

        // Delete any existing entry with the same original phrase to prevent duplicates
        let _ = conn.execute(
            "DELETE FROM custom_dictionary WHERE LOWER(original_phrase) = LOWER(?1)",
            params![orig],
        );

        conn.execute(
            "INSERT INTO custom_dictionary (original_phrase, replacement_phrase, category, created_at) VALUES (?1, ?2, ?3, ?4)",
            params![orig, repl, cat, now],
        ).map_err(|e| format!("Add dictionary entry failed: {}", e))?;

        let id = conn.last_insert_rowid();

        // Also ensure active mirroring into personal_vocabulary without duplicates
        let _ = conn.execute(
            "DELETE FROM personal_vocabulary WHERE LOWER(original_text) = LOWER(?1)",
            params![orig],
        );
        let _ = conn.execute(
            "INSERT INTO personal_vocabulary (original_text, preferred_text, entry_type, confidence, positive_count, negative_count, status, recognition_count, correction_count, application_count, last_used_at, created_at, updated_at)
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
        let mut affected_entries = Vec::new();

        for cand in candidates {
            let cand_orig = cand.original_span.trim();
            let cand_pref = cand.preferred_span.trim();
            if cand_orig.is_empty() || cand_pref.is_empty() || (cand_orig.eq_ignore_ascii_case(cand_pref) && cand_orig == cand_pref) {
                continue;
            }
            if crate::personalization_service::is_blacklisted_common_word(cand_orig) || crate::personalization_service::is_blacklisted_common_word(cand_pref) {
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

            let entry_id = if let Some((id, _orig, _prev_pref, _conf, pos, _neg, _status)) = existing {
                // Direct user correction: immediately promote to active with confirmed preference
                let new_pos = pos + 1;
                let new_conf: f32 = 0.95;
                let new_status = "active";

                let _ = conn.execute(
                    "UPDATE personal_vocabulary SET positive_count = ?1, confidence = ?2, status = ?3, preferred_text = ?4, correction_count = correction_count + 1, updated_at = ?5 WHERE id = ?6",
                    params![new_pos, new_conf, new_status, cand_pref, now, id],
                );
                id
            } else {
                // New candidate from user's direct edit:
                // Automatically set to 'active' with high confidence so subsequent dictations use it immediately
                let initial_status = "active";
                let initial_conf: f32 = 0.95;
                let _ = conn.execute(
                    "INSERT INTO personal_vocabulary (original_text, preferred_text, entry_type, confidence, positive_count, negative_count, status, recognition_count, correction_count, application_count, last_used_at, created_at, updated_at, source)
                     VALUES (?1, ?2, ?3, ?4, 1, 0, ?5, 0, 1, 0, NULL, ?6, ?6, 'learned')",
                    params![cand_orig, cand_pref, cand.entry_type, initial_conf, initial_status, now],
                );
                conn.last_insert_rowid()
            };

            // Synchronize with custom_dictionary so the user sees a direct record in their Dictionary
            let _ = conn.execute(
                "DELETE FROM custom_dictionary WHERE LOWER(TRIM(original_phrase)) = LOWER(TRIM(?1))",
                params![cand_orig],
            );
            let _ = conn.execute(
                "INSERT INTO custom_dictionary (original_phrase, replacement_phrase, category, created_at) VALUES (?1, ?2, ?3, ?4)",
                params![cand_orig, cand_pref, cand.entry_type, now],
            );

            // Fetch the updated/inserted entry to return in affected_entries
            if let Ok(entry) = conn.query_row(
                "SELECT id, original_text, preferred_text, entry_type, context_domain, confidence, positive_count, negative_count, status, recognition_count, correction_count, application_count, last_used_at, created_at, updated_at, source
                 FROM personal_vocabulary WHERE id = ?1",
                params![entry_id],
                |row| Ok(crate::personalization_service::PersonalVocabularyEntry {
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
                    source: row.get(15).unwrap_or_else(|_| "learned".to_string()),
                }),
            ) {
                affected_entries.push(entry);
            }
        }

        Ok(affected_entries)
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

        let existing_id: Option<i64> = conn.query_row(
            "SELECT id FROM personal_vocabulary WHERE LOWER(original_text) = LOWER(?1)",
            params![orig],
            |r| r.get(0),
        ).ok();

        let id = if let Some(existing) = existing_id {
            conn.execute(
                "UPDATE personal_vocabulary SET preferred_text = ?1, entry_type = ?2, status = ?3, confidence = ?4, positive_count = ?5, updated_at = ?6 WHERE id = ?7",
                params![pref, cat, stat, conf, pos, now, existing],
            ).map_err(|e| format!("Update existing personal_vocabulary failed: {}", e))?;
            existing
        } else {
            conn.execute(
                "INSERT INTO personal_vocabulary (original_text, preferred_text, entry_type, confidence, positive_count, negative_count, status, recognition_count, correction_count, application_count, last_used_at, created_at, updated_at, source)
                 VALUES (?1, ?2, ?3, ?4, ?5, 0, ?6, 0, 0, 0, NULL, ?7, ?7, ?8)",
                params![orig, pref, cat, conf, pos, stat, now, src],
            ).map_err(|e| format!("Insert failed: {}", e))?;
            conn.last_insert_rowid()
        };

        let _ = conn.execute(
            "DELETE FROM custom_dictionary WHERE LOWER(original_phrase) = LOWER(?1)",
            params![orig],
        );

        if stat == "active" {
            let _ = conn.execute(
                "INSERT INTO custom_dictionary (original_phrase, replacement_phrase, category, created_at) VALUES (?1, ?2, ?3, ?4)",
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

        // Fetch existing record from personal_vocabulary OR custom_dictionary
        let existing_vocab: Option<(String, String, String, String)> = conn
            .query_row(
                "SELECT original_text, preferred_text, entry_type, status FROM personal_vocabulary WHERE id = ?1",
                params![id],
                |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?)),
            )
            .ok();

        let (old_orig, old_pref, old_type, old_status, custom_dict_id) = if let Some((o, p, t, s)) = existing_vocab {
            (o, p, t, s, None)
        } else {
            // Check custom_dictionary
            let dict_record: (String, String, String) = conn
                .query_row(
                    "SELECT original_phrase, replacement_phrase, category FROM custom_dictionary WHERE id = ?1",
                    params![id],
                    |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
                )
                .map_err(|e| format!("Entry with id {} not found in dictionary or vocabulary: {}", id, e))?;
            (dict_record.0, dict_record.1, dict_record.2, "active".to_string(), Some(id))
        };

        let new_orig = original_text.map(|s| s.trim()).filter(|s| !s.is_empty()).unwrap_or(&old_orig);
        let new_pref = preferred_text.map(|s| s.trim()).filter(|s| !s.is_empty()).unwrap_or(&old_pref);
        let new_type = entry_type.map(|s| s.trim()).filter(|s| !s.is_empty()).unwrap_or(&old_type);
        let new_stat = status.map(|s| s.trim()).filter(|s| !s.is_empty()).unwrap_or(&old_status);

        let conf: f32 = if new_stat == "active" { 1.0 } else if new_stat == "rejected" { 0.0 } else { 0.5 };

        if let Some(dict_id) = custom_dict_id {
            // Update custom_dictionary record directly
            conn.execute(
                "UPDATE custom_dictionary SET original_phrase = ?1, replacement_phrase = ?2, category = ?3 WHERE id = ?4",
                params![new_orig, new_pref, new_type, dict_id],
            ).map_err(|e| format!("Update custom_dictionary failed: {}", e))?;

            // Also mirror update or insert into personal_vocabulary
            let existing_v_id: Option<i64> = conn.query_row(
                "SELECT id FROM personal_vocabulary WHERE LOWER(original_text) = LOWER(?1) OR LOWER(original_text) = LOWER(?2)",
                params![old_orig, new_orig],
                |r| r.get(0),
            ).ok();

            if let Some(v_id) = existing_v_id {
                let _ = conn.execute(
                    "UPDATE personal_vocabulary SET original_text = ?1, preferred_text = ?2, entry_type = ?3, status = ?4, confidence = ?5, updated_at = ?6 WHERE id = ?7",
                    params![new_orig, new_pref, new_type, new_stat, conf, now, v_id],
                );
            } else if new_stat == "active" {
                let _ = conn.execute(
                    "INSERT INTO personal_vocabulary (original_text, preferred_text, entry_type, confidence, positive_count, negative_count, status, recognition_count, correction_count, application_count, last_used_at, created_at, updated_at, source)
                     VALUES (?1, ?2, ?3, 1.0, 3, 0, 'active', 0, 0, 0, NULL, ?4, ?4, 'manual')",
                    params![new_orig, new_pref, new_type, now],
                );
            }
        } else {
            // Update personal_vocabulary record directly
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

    pub fn get_active_biasing_prompt(&self, target_app: Option<&str>, window_title: Option<&str>) -> Result<String, String> {
        let app_lower = target_app.unwrap_or("").to_lowercase();
        let title_lower = window_title.unwrap_or("").to_lowercase();

        let is_developer_ctx = app_lower.contains("code")
            || app_lower.contains("xcode")
            || app_lower.contains("term")
            || app_lower.contains("iterm")
            || app_lower.contains("cursor")
            || app_lower.contains("idea")
            || app_lower.contains("pycharm")
            || app_lower.contains("rustrover")
            || app_lower.contains("webstorm")
            || app_lower.contains("sublime")
            || title_lower.ends_with(".rs")
            || title_lower.ends_with(".ts")
            || title_lower.ends_with(".tsx")
            || title_lower.ends_with(".py")
            || title_lower.ends_with(".go")
            || title_lower.ends_with(".cpp")
            || title_lower.ends_with(".js")
            || title_lower.contains("github")
            || title_lower.contains("gitlab")
            || title_lower.contains("localhost");

        let is_browser_or_chat = app_lower.contains("chrome")
            || app_lower.contains("safari")
            || app_lower.contains("firefox")
            || app_lower.contains("arc")
            || app_lower.contains("slack")
            || app_lower.contains("discord");

        let base_context = if is_developer_ctx {
            "In software engineering and coding workspaces, we frequently discuss Rust, TypeScript, Python, Go, API, JSON, GraphQL, PostgreSQL, Kubernetes, Docker, Tauri, Git commit, pull request, async, await, function, component, import, export, debug, refactor, Zustand, React, Vite, tribe, tribe members, ma'am, and terminal commands."
        } else if is_browser_or_chat && (title_lower.contains("chatgpt") || title_lower.contains("claude") || title_lower.contains("gemini")) {
            "When dictating prompts to AI assistants, we give instructions, ask to analyze, debug, explain, optimize, refactor, draft, or summarize clearly with accurate terms: ChatGPT, Codex, Claude, Gemini, API, JSON, React, Tauri, tribe, ma'am, and all."
        } else {
            "In everyday work, conversations, and Indian English professional dictation, clear vocabulary, proper names, entities, Bengaluru, Hyderabad, Mumbai, Delhi, lakh, crore, UPI, WhatsApp, email drafting, meeting notes, tribe, tribe members, ma'am, and all, and concise natural sentences are used."
        };

        let mut custom_terms = Vec::new();
        if let Ok(vocab) = self.list_personal_vocabulary(Some("active")) {
            let mut sorted = vocab;
            sorted.sort_by(|a, b| (b.recognition_count + b.application_count).cmp(&(a.recognition_count + a.application_count)));
            for v in sorted.iter().take(40) {
                let term = v.preferred_text.trim();
                if !term.is_empty() && !base_context.contains(term) && !custom_terms.iter().any(|c: &String| c.eq_ignore_ascii_case(term)) {
                    custom_terms.push(term.to_string());
                }
            }
        }

        if let Ok(dict) = self.list_dictionary_entries() {
            for entry in dict.iter().take(30) {
                let term = entry.replacement_phrase.trim();
                if !term.is_empty() && !base_context.contains(term) && !custom_terms.iter().any(|c: &String| c.eq_ignore_ascii_case(term)) {
                    custom_terms.push(term.to_string());
                }
            }
        }

        if custom_terms.is_empty() {
            Ok(base_context.to_string())
        } else {
            Ok(format!("{} Standard technical glossary: {}.", base_context, custom_terms.join(", ")))
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

    pub fn record_training_sample(
        &self,
        session_id: &str,
        speaker_id: &str,
        audio_path: Option<&str>,
        raw_transcript: &str,
        corrected_transcript: &str,
        accent_tag: &str,
        duration_ms: i64,
    ) -> Result<i64, String> {
        let conn = self.open_conn()?;
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as i64;

        conn.execute(
            "INSERT INTO speech_training_samples (session_id, speaker_id, audio_path, raw_transcript, corrected_transcript, accent_tag, duration_ms, is_exported, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 0, ?8)",
            params![session_id, speaker_id, audio_path, raw_transcript, corrected_transcript, accent_tag, duration_ms, now],
        ).map_err(|e| format!("Failed to record training sample: {}", e))?;

        Ok(conn.last_insert_rowid())
    }

    pub fn list_training_samples(&self, limit: Option<usize>) -> Result<Vec<TrainingSample>, String> {
        let conn = self.open_conn()?;
        let query = if let Some(lim) = limit {
            format!("SELECT id, session_id, speaker_id, audio_path, raw_transcript, corrected_transcript, accent_tag, duration_ms, is_exported, created_at FROM speech_training_samples ORDER BY id DESC LIMIT {}", lim)
        } else {
            "SELECT id, session_id, speaker_id, audio_path, raw_transcript, corrected_transcript, accent_tag, duration_ms, is_exported, created_at FROM speech_training_samples ORDER BY id DESC".to_string()
        };

        let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;
        let rows = stmt.query_map([], |r| {
            Ok(TrainingSample {
                id: r.get(0)?,
                session_id: r.get(1)?,
                speaker_id: r.get(2)?,
                audio_path: r.get(3)?,
                raw_transcript: r.get(4)?,
                corrected_transcript: r.get(5)?,
                accent_tag: r.get(6)?,
                duration_ms: r.get(7)?,
                is_exported: r.get::<_, i64>(8)? == 1,
                created_at: r.get(9)?,
            })
        }).map_err(|e| e.to_string())?;

        let mut samples = Vec::new();
        for sample in rows {
            if let Ok(s) = sample {
                samples.push(s);
            }
        }
        Ok(samples)
    }

    pub fn get_training_sample_count(&self) -> Result<i64, String> {
        let conn = self.open_conn()?;
        let count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM speech_training_samples",
            [],
            |r| r.get(0),
        ).unwrap_or(0);
        Ok(count)
    }

    pub fn export_training_manifest_jsonl(&self) -> Result<String, String> {
        let samples = self.list_training_samples(None)?;
        let mut lines = Vec::new();
        for s in samples {
            let json_line = serde_json::json!({
                "session_id": s.session_id,
                "speaker_id": s.speaker_id,
                "audio_path": s.audio_path,
                "raw_whisper": s.raw_transcript,
                "sentence": s.corrected_transcript,
                "accent": s.accent_tag,
                "duration_ms": s.duration_ms,
                "timestamp": s.created_at,
            });
            if let Ok(line) = serde_json::to_string(&json_line) {
                lines.push(line);
            }
        }
        Ok(lines.join("\n"))
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

    #[test]
    fn test_bundled_indian_tech_lexicon_seeded_and_applied() {
        let history = HistoryDatabase::new_test().expect("Failed to open test DB");

        // 1. Verify that bundled Indian technical terms exist in personal vocabulary and dictionary
        let vocab = history.list_personal_vocabulary(Some("active")).expect("Vocab list must succeed");
        assert!(vocab.iter().any(|v| v.original_text == "skima" && v.preferred_text == "schema"), "Must pre-bundle skima -> schema");
        assert!(vocab.iter().any(|v| v.original_text == "cooper net ease" && v.preferred_text == "Kubernetes"), "Must pre-bundle cooper net ease -> Kubernetes");
        assert!(vocab.iter().any(|v| v.original_text == "pi g admin" && v.preferred_text == "pgAdmin"), "Must pre-bundle pi g admin -> pgAdmin");
        assert!(vocab.iter().any(|v| v.original_text == "prepone" && v.preferred_text == "prepone"), "Must pre-bundle prepone");

        // 2. Test personalization pipeline on Indian developer speech sentence
        let raw_spoken = "we need to prepone the sprint and fix the skima on cooper net ease";
        let (processed, applied) = history.apply_personalization_pipeline(raw_spoken);
        assert!(processed.contains("schema"), "Must replace skima with schema");
        assert!(processed.contains("Kubernetes"), "Must replace cooper net ease with Kubernetes");
        assert!(processed.contains("prepone"), "Must preserve prepone");
        assert!(!applied.is_empty(), "Must track applied terms");
    }

    #[test]
    fn test_student_training_dataset_harvester_and_export() {
        let history = HistoryDatabase::new_test().expect("Failed to open test DB");

        let sess_id = "test-sess-student-101";
        let speaker = "student-rohan-bengaluru";
        let raw = "deploying on cooper netis with postgre";
        let corrected = "deploying on Kubernetes with PostgreSQL";

        let sample_id = history.record_training_sample(
            sess_id,
            speaker,
            Some("/tmp/audio/sess-101.wav"),
            raw,
            corrected,
            "indian_tech",
            4200,
        ).expect("Must record training sample");

        assert!(sample_id > 0);
        assert_eq!(history.get_training_sample_count().unwrap(), 1);

        let samples = history.list_training_samples(None).unwrap();
        assert_eq!(samples.len(), 1);
        assert_eq!(samples[0].speaker_id, speaker);
        assert_eq!(samples[0].corrected_transcript, corrected);

        let manifest = history.export_training_manifest_jsonl().unwrap();
        assert!(manifest.contains("student-rohan-bengaluru"));
        assert!(manifest.contains("deploying on Kubernetes with PostgreSQL"));
        assert!(manifest.contains("indian_tech"));
    }
}
