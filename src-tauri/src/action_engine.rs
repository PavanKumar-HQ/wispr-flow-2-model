//! VoxQuest Workflow & Voice-to-Action Automation Engine
//!
//! Converts raw speech into actionable workflows:
//! 1. Zero-Click Auto-Persona: Detects foreground application and adapts formatting
//!    (Dev syntax in VS Code/Cursor, executive polish in Mail, structured bugs in Linear/Jira,
//!    potency prompts in AI tools).
//! 2. Whisper-to-Action: Detects spoken system commands ("open Spotify", "search ...",
//!    "play ...", "email ... saying ...", "insert standup") and executes them natively on macOS.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct VoiceUtilityPayload {
    pub kind: String, // "reminder" | "schedule"
    pub label: String,
    pub time_str: Option<String>, // "HH:mm" 24-hour
    pub offset_minutes: Option<u32>,
    pub day_offset: Option<u32>,
    pub duration_min: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct VoiceActionResult {
    pub action_type: String, // "system_open", "system_search", "system_music", "system_email", "system_reminder", "system_schedule", "snippet_expansion"
    pub feedback_message: String,
    pub expanded_text: Option<String>,
    pub suppress_paste: bool, // If true, do not paste command text into foreground app
    #[serde(default)]
    pub utility_payload: Option<VoiceUtilityPayload>,
}

fn safe_spawn_open(args: &[&str]) {
    if cfg!(test) || std::env::var("VOXQUEST_SUPPRESS_AUTO_OPEN").is_ok() {
        return;
    }
    let mut cmd = std::process::Command::new("open");
    for arg in args {
        cmd.arg(arg);
    }
    let _ = cmd.spawn();
}

fn url_encode_query(query: &str) -> String {
    query
        .bytes()
        .map(|b| {
            if b.is_ascii_alphanumeric() || b == b'-' || b == b'_' || b == b'.' || b == b'~' {
                (b as char).to_string()
            } else if b == b' ' {
                "+".to_string()
            } else {
                format!("%{:02X}", b)
            }
        })
        .collect()
}

/// Guardrail: returns true if an utterance looks like multi-sentence prose or conversational
/// dictation rather than a crisp, intentional voice command.
fn looks_like_prose_dictation(trimmed: &str, max_words: usize) -> bool {
    let words: Vec<&str> = trimmed.split_whitespace().collect();
    if words.is_empty() || words.len() > max_words {
        return true;
    }
    // Multi-sentence dictation (internal '.', '?', '!') is never a single command
    let body = trimmed.trim_end_matches(|c: char| c == '.' || c == '!' || c == '?');
    if body.contains(". ") || body.contains("? ") || body.contains("! ") {
        return true;
    }
    let lower = body.to_lowercase();
    // Prose / narrative connectors indicate normal dictation, not a command
    const PROSE_MARKERS: &[&str] = &[
        " and then ",
        " because ",
        " which is ",
        " that is ",
        " would be ",
        " should be ",
        " in the code",
        " in this file",
        " for the bug",
    ];
    PROSE_MARKERS.iter().any(|m| lower.contains(m))
}

/// Side-effect-free check: returns true if `input` is an intentional voice command
/// (search, play, open, reminder, schedule, timer, system clean/scan, language switch)
/// rather than normal prose dictation. Used for smart command-only auto-stop.
pub fn is_voice_command_intent(input: &str) -> bool {
    let trimmed = input.trim();
    if trimmed.is_empty() {
        return false;
    }
    let lower = trimmed.to_lowercase();
    let lower_clean = lower.trim_matches(|c: char| c.is_ascii_punctuation() || c.is_whitespace());

    if lower_clean.starts_with("open ") || lower_clean.starts_with("launch ") {
        return !looks_like_prose_dictation(trimmed, 8);
    }

    let is_search_prefix = lower_clean.starts_with("search youtube for ")
        || lower_clean.starts_with("search on youtube ")
        || lower_clean.starts_with("search in youtube ")
        || lower_clean.starts_with("search google for ")
        || lower_clean.starts_with("search ")
        || lower_clean.starts_with("google ");
    if is_search_prefix && !looks_like_prose_dictation(trimmed, 10) {
        return true;
    }

    if (lower_clean.starts_with("play ") || lower_clean.starts_with("play, ") || lower_clean.starts_with("play:"))
        && !looks_like_prose_dictation(trimmed, 12)
    {
        return true;
    }

    if try_parse_reminder_or_schedule(trimmed, lower_clean).is_some() {
        return true;
    }

    if try_parse_app_utility_command(trimmed, lower_clean).is_some() {
        return true;
    }

    false
}

/// Detects voice-triggered system actions with strict dictation guardrails.
/// Returns Some(VoiceActionResult) if an intentional command or dynamic snippet was recognized.
pub fn detect_voice_action(input: &str) -> Option<VoiceActionResult> {
    let trimmed = input.trim();
    if trimmed.is_empty() {
        return None;
    }

    let lower = trimmed.to_lowercase();
    let lower_clean = lower.trim_matches(|c: char| c.is_ascii_punctuation() || c.is_whitespace());

    // 1. Dynamic Snippet Expansions ("insert ...", "paste ...", "expand ...")
    if let Some(snippet) = try_expand_dynamic_snippet(lower_clean) {
        return Some(snippet);
    }

    // 2. Open / Launch Application ("open slack", "launch cursor", "open vs code")
    if lower_clean.starts_with("open ") || lower_clean.starts_with("launch ") {
        let app_target = if lower_clean.starts_with("open ") {
            &lower_clean[5..]
        } else {
            &lower_clean[7..]
        }.trim();

        if !app_target.is_empty() && app_target.len() < 30 {
            // Resolve common aliases
            let resolved_app = match app_target {
                "code" | "vscode" | "vs code" => "Visual Studio Code",
                "cursor" => "Cursor",
                "terminal" | "term" => "Terminal",
                "iterm" | "iterm2" => "iTerm",
                "warp" => "Warp",
                "slack" => "Slack",
                "spotify" => "Spotify",
                "chrome" | "google chrome" => "Google Chrome",
                "safari" => "Safari",
                "brave" => "Brave Browser",
                "notes" | "apple notes" => "Notes",
                "mail" | "apple mail" => "Mail",
                "calendar" => "Calendar",
                "music" | "apple music" => "Music",
                "notion" => "Notion",
                "linear" => "Linear",
                "figma" => "Figma",
                other => other,
            };

            safe_spawn_open(&["-a", resolved_app]);

            return Some(VoiceActionResult {
                action_type: "system_open".to_string(),
                feedback_message: format!("Opened {}", resolved_app),
                expanded_text: None,
                suppress_paste: true,
                utility_payload: None,
            });
        }
    }

    // 3. Guarded Web / YouTube Search
    //    Supports: "search youtube for <q>", "search on youtube <q>", "search google for <q>",
    //    "google <q>", or short "search <q>" (guarded against long prose dictation).
    let search_target: Option<(&str, &str)> = if lower_clean.starts_with("search youtube for ") {
        Some(("youtube", trimmed[19..].trim()))
    } else if lower_clean.starts_with("search on youtube ") {
        Some(("youtube", trimmed[18..].trim()))
    } else if lower_clean.starts_with("search in youtube ") {
        Some(("youtube", trimmed[18..].trim()))
    } else if lower_clean.starts_with("search google for ") {
        Some(("google", trimmed[18..].trim()))
    } else if lower_clean.starts_with("search ") {
        Some(("google", trimmed[7..].trim()))
    } else if lower_clean.starts_with("google ") {
        Some(("google", trimmed[7..].trim()))
    } else {
        None
    };

    if let Some((engine, raw_query)) = search_target {
        let query = raw_query.trim_matches(|c: char| c.is_ascii_punctuation() || c.is_whitespace());
        let is_prose = looks_like_prose_dictation(trimmed, 10)
            || query.to_lowercase().starts_with("if ")
            || query.to_lowercase().starts_with("whether ")
            || query.to_lowercase().starts_with("through ");

        if !query.is_empty() && !is_prose {
            let encoded = url_encode_query(query);
            let url = if engine == "youtube" {
                format!("https://www.youtube.com/results?search_query={}", encoded)
            } else {
                format!("https://www.google.com/search?q={}", encoded)
            };
            safe_spawn_open(&[&url]);

            return Some(VoiceActionResult {
                action_type: "system_search".to_string(),
                feedback_message: if engine == "youtube" {
                    format!("Searching YouTube: {}", query)
                } else {
                    format!("Searching: {}", query)
                },
                expanded_text: None,
                suppress_paste: true,
                utility_payload: None,
            });
        }
    }

    // 4. Guarded Play Music ("play <song> in/on youtube", "play <song> on youtube music", "play <song>")
    let play_match = if lower_clean.starts_with("play ") {
        Some(&lower_clean[5..])
    } else if lower_clean.starts_with("play, ") {
        Some(&lower_clean[6..])
    } else if lower_clean.starts_with("play:") {
        Some(&lower_clean[5..])
    } else {
        None
    };

    if let Some(raw_target) = play_match {
        let music_query = raw_target.trim().trim_matches(|c: char| c.is_ascii_punctuation() || c.is_whitespace());
        const NON_MUSIC_PROSE: &[&str] = &[
            "a role", "a part", "around", "with ", "the game", "games", "it safe", "by ear", "catch up",
        ];
        let is_non_music = looks_like_prose_dictation(trimmed, 12)
            || NON_MUSIC_PROSE.iter().any(|p| music_query.starts_with(p));

        if !music_query.is_empty() && !is_non_music {
            // Detect service suffix if spoken: "on/in youtube", "on/in youtube music", "on spotify", "on apple music"
            let (clean_song, service) = if music_query.ends_with(" on youtube music") {
                (music_query[..music_query.len() - 17].trim(), "youtube_music")
            } else if music_query.ends_with(" in youtube music") {
                (music_query[..music_query.len() - 17].trim(), "youtube_music")
            } else if music_query.ends_with(" on youtube") || music_query.ends_with(" in youtube") {
                (music_query[..music_query.len() - 11].trim(), "youtube")
            } else if music_query.ends_with(" on spotify") || music_query.ends_with(" in spotify") {
                (music_query[..music_query.len() - 11].trim(), "spotify")
            } else if music_query.ends_with(" on apple music") {
                (music_query[..music_query.len() - 15].trim(), "apple_music")
            } else if music_query.ends_with(" on apple") {
                (music_query[..music_query.len() - 9].trim(), "apple_music")
            } else {
                (music_query, "youtube")
            };

            let final_title = clean_song.trim_matches(|c: char| c.is_ascii_punctuation() || c.is_whitespace());
            if !final_title.is_empty() {
                let _ = crate::commands::play_music_internal(Some(final_title.to_string()), Some(service.to_string()));
                return Some(VoiceActionResult {
                    action_type: "system_music".to_string(),
                    feedback_message: format!("Playing '{}'", final_title),
                    expanded_text: None,
                    suppress_paste: true,
                    utility_payload: None,
                });
            }
        }
    }

    // 5. Send / Draft Email ("send email to <recipient> saying <body...>")
    if (lower_clean.starts_with("send email to ") || lower_clean.starts_with("email ")) && lower_clean.contains(" saying ") {
        let parts: Vec<&str> = if lower_clean.starts_with("send email to ") {
            trimmed[14..].splitn(2, " saying ").collect()
        } else {
            trimmed[6..].splitn(2, " saying ").collect()
        };

        if parts.len() == 2 {
            let recipient = parts[0].trim();
            let body = parts[1].trim();

            let encoded_body: String = body.bytes().map(|b| {
                if b.is_ascii_alphanumeric() || b == b'-' || b == b'_' || b == b'.' || b == b'~' {
                    (b as char).to_string()
                } else if b == b' ' {
                    "%20".to_string()
                } else {
                    format!("%{:02X}", b)
                }
            }).collect();

            let mailto = format!("mailto:{}?body={}", recipient, encoded_body);
            safe_spawn_open(&[&mailto]);

            return Some(VoiceActionResult {
                action_type: "system_email".to_string(),
                feedback_message: format!("Drafted email to {}", recipient),
                expanded_text: None,
                suppress_paste: true,
                utility_payload: None,
            });
        }
    }

    // 6. Voice-Triggered Reminders, Schedules, Timer, System Boost, Navigation & Language
    if let Some(utility_res) = try_parse_reminder_or_schedule(trimmed, lower_clean) {
        return Some(utility_res);
    }

    if let Some(app_ctrl_res) = try_parse_app_utility_command(trimmed, lower_clean) {
        return Some(app_ctrl_res);
    }

    None
}

fn try_parse_app_utility_command(trimmed: &str, lower_clean: &str) -> Option<VoiceActionResult> {
    if looks_like_prose_dictation(trimmed, 10) {
        return None;
    }

    // A. Focus Timer ("start timer", "start focus timer for 17 minutes", "pause timer", "reset timer")
    if lower_clean.contains("timer") {
        if lower_clean.starts_with("pause ") || lower_clean.starts_with("stop ") {
            return Some(VoiceActionResult {
                action_type: "system_timer".to_string(),
                feedback_message: "Focus timer paused".to_string(),
                expanded_text: None,
                suppress_paste: true,
                utility_payload: Some(VoiceUtilityPayload {
                    kind: "timer".to_string(),
                    label: "pause".to_string(),
                    time_str: None,
                    offset_minutes: None,
                    day_offset: None,
                    duration_min: None,
                }),
            });
        }
        if lower_clean.starts_with("reset ") {
            return Some(VoiceActionResult {
                action_type: "system_timer".to_string(),
                feedback_message: "Focus timer reset".to_string(),
                expanded_text: None,
                suppress_paste: true,
                utility_payload: Some(VoiceUtilityPayload {
                    kind: "timer".to_string(),
                    label: "reset".to_string(),
                    time_str: None,
                    offset_minutes: None,
                    day_offset: None,
                    duration_min: None,
                }),
            });
        }
        if lower_clean.starts_with("start ") || lower_clean.starts_with("set ") {
            let mins = lower_clean
                .split_whitespace()
                .find_map(|w| w.trim_matches(|c: char| !c.is_ascii_digit()).parse::<u32>().ok())
                .map(|m| m.clamp(1, 180));
            return Some(VoiceActionResult {
                action_type: "system_timer".to_string(),
                feedback_message: match mins {
                    Some(m) => format!("Focus timer started ({}m)", m),
                    None => "Focus timer started".to_string(),
                },
                expanded_text: None,
                suppress_paste: true,
                utility_payload: Some(VoiceUtilityPayload {
                    kind: "timer".to_string(),
                    label: "start".to_string(),
                    time_str: None,
                    offset_minutes: None,
                    day_offset: None,
                    duration_min: mins,
                }),
            });
        }
    }

    // B. System Clean & Boost / Storage Scan
    if matches!(
        lower_clean,
        "clean mac" | "clean system" | "system boost" | "clean and boost" | "boost system" | "boost my mac"
    ) {
        return Some(VoiceActionResult {
            action_type: "system_clean".to_string(),
            feedback_message: "Running System Boost & Clean".to_string(),
            expanded_text: None,
            suppress_paste: true,
            utility_payload: Some(VoiceUtilityPayload {
                kind: "system_clean".to_string(),
                label: "clean".to_string(),
                time_str: None,
                offset_minutes: None,
                day_offset: None,
                duration_min: None,
            }),
        });
    }
    if matches!(lower_clean, "scan storage" | "scan mac" | "check storage") {
        return Some(VoiceActionResult {
            action_type: "system_scan".to_string(),
            feedback_message: "Scanning Mac storage".to_string(),
            expanded_text: None,
            suppress_paste: true,
            utility_payload: Some(VoiceUtilityPayload {
                kind: "system_scan".to_string(),
                label: "scan".to_string(),
                time_str: None,
                offset_minutes: None,
                day_offset: None,
                duration_min: None,
            }),
        });
    }

    // C. In-App Tab Navigation ("open utilities", "open settings", "open history", "open home", "open meetings")
    if let Some(target) = lower_clean.strip_prefix("open ").or_else(|| lower_clean.strip_prefix("show ")) {
        let tab = match target.trim() {
            "utilities" | "utility" | "tools" => Some("utilities"),
            "settings" | "preferences" => Some("settings"),
            "history" | "transcripts" => Some("history"),
            "home" | "dashboard" => Some("home"),
            "meetings" | "meeting" => Some("meetings"),
            "models" | "model manager" => Some("models"),
            "dictionary" => Some("dictionary"),
            _ => None,
        };
        if let Some(t) = tab {
            return Some(VoiceActionResult {
                action_type: "system_navigate".to_string(),
                feedback_message: format!("Opened {}", t),
                expanded_text: None,
                suppress_paste: true,
                utility_payload: Some(VoiceUtilityPayload {
                    kind: "navigate".to_string(),
                    label: t.to_string(),
                    time_str: None,
                    offset_minutes: None,
                    day_offset: None,
                    duration_min: None,
                }),
            });
        }
    }

    // D. Language / Accent Switching ("switch to indian english", "switch to kannada", etc.)
    if let Some(lang_phrase) = lower_clean
        .strip_prefix("switch to ")
        .or_else(|| lower_clean.strip_prefix("use "))
        .or_else(|| lower_clean.strip_prefix("set language to "))
    {
        let code = match lang_phrase.trim() {
            "indian english" | "india english" | "en in" => Some(("en-IN", "Indian English")),
            "us english" | "american english" | "en us" => Some(("en-US", "US English")),
            "kannada" | "canada" => Some(("kn", "Kannada")),
            "tamil" => Some(("ta", "Tamil")),
            "telugu" => Some(("te", "Telugu")),
            "hindi" => Some(("hi", "Hindi")),
            "auto" | "multilingual" => Some(("auto", "Auto Multilingual")),
            _ => None,
        };
        if let Some((lang_code, display)) = code {
            return Some(VoiceActionResult {
                action_type: "system_language".to_string(),
                feedback_message: format!("Switched language to {}", display),
                expanded_text: None,
                suppress_paste: true,
                utility_payload: Some(VoiceUtilityPayload {
                    kind: "language".to_string(),
                    label: lang_code.to_string(),
                    time_str: None,
                    offset_minutes: None,
                    day_offset: None,
                    duration_min: None,
                }),
            });
        }
    }

    None
}

fn parse_spoken_time_token(words: &[&str]) -> Option<(String, usize)> {
    if words.is_empty() {
        return None;
    }
    let w0 = words[0].trim_matches(|c: char| !c.is_ascii_alphanumeric() && c != ':');
    let mut consumed = 1usize;
    let (mut hour, mut minute) = if let Some((h_str, m_str)) = w0.split_once(':') {
        let h = h_str.parse::<u32>().ok()?;
        let m_digits: String = m_str.chars().take_while(|c| c.is_ascii_digit()).collect();
        let m = m_digits.parse::<u32>().ok()?;
        (h, m)
    } else {
        let num_digits: String = w0.chars().take_while(|c| c.is_ascii_digit()).collect();
        let val = num_digits.parse::<u32>().ok()?;
        if num_digits.len() == 3 {
            // e.g. "837" -> 8:37
            (val / 100, val % 100)
        } else if num_digits.len() == 4 {
            // e.g. "1730" -> 17:30 or "0837" -> 8:37
            (val / 100, val % 100)
        } else {
            let h = val;
            let mut m = 0u32;
            if words.len() > 1 {
                let w1 = words[1].trim_matches(|c: char| !c.is_ascii_alphanumeric());
                if let Ok(min_candidate) = w1.parse::<u32>() {
                    if min_candidate < 60 && w1.len() <= 2 && words.get(2).map(|w| !w.starts_with("min")).unwrap_or(true) {
                        m = min_candidate;
                        consumed = 2;
                    }
                }
            }
            (h, m)
        }
    };

    if hour > 23 || minute > 59 {
        return None;
    }

    let combined_ampm_target = if w0.ends_with("am") || w0.ends_with("pm") || w0.ends_with("a.m.") || w0.ends_with("p.m.") {
        w0.replace('.', "").to_lowercase()
    } else if words.len() > consumed {
        let next = words[consumed].to_lowercase();
        let clean_next: String = next.chars().filter(|c| c.is_ascii_alphabetic()).collect();
        if clean_next == "am" || clean_next == "pm" {
            consumed += 1;
            clean_next
        } else {
            String::new()
        }
    } else {
        String::new()
    };

    if combined_ampm_target.ends_with("pm") && hour < 12 {
        hour += 12;
    } else if combined_ampm_target.ends_with("am") && hour == 12 {
        hour = 0;
    }

    Some((format!("{:02}:{:02}", hour, minute), consumed))
}

fn try_parse_reminder_or_schedule(trimmed: &str, lower_clean: &str) -> Option<VoiceActionResult> {
    if looks_like_prose_dictation(trimmed, 18) {
        return None;
    }

    const REMINDER_PREFIXES: &[&str] = &[
        "remind me ",
        "set a reminder ",
        "set reminder ",
        "add a reminder ",
        "add reminder ",
        "create a reminder ",
        "create reminder ",
        "reminder for ",
        "reminder at ",
        "reminder to ",
    ];

    for prefix in REMINDER_PREFIXES {
        if let Some(rest) = lower_clean.strip_prefix(prefix) {
            let words: Vec<&str> = rest.split_whitespace().collect();
            let mut offset_minutes: Option<u32> = None;
            let mut day_offset: Option<u32> = None;
            let mut time_str: Option<String> = None;
            let mut label_words: Vec<&str> = Vec::new();
            let mut i = 0;
            while i < words.len() {
                let w = words[i].trim_matches(|c: char| c.is_ascii_punctuation());
                if w == "tomorrow" {
                    day_offset = Some(1);
                    i += 1;
                    continue;
                }
                if w == "today" {
                    day_offset = Some(0);
                    i += 1;
                    continue;
                }
                if w == "for" && i + 1 < words.len() && words[i + 1].trim_matches(|c: char| c.is_ascii_punctuation()) == "me" {
                    i += 2;
                    continue;
                }
                if w == "in" && i + 2 < words.len() {
                    if let Ok(mins) = words[i + 1].parse::<u32>() {
                        let unit = words[i + 2].trim_matches(|c: char| c.is_ascii_punctuation());
                        if unit.starts_with("min") {
                            offset_minutes = Some(mins.clamp(1, 720));
                            i += 3;
                            continue;
                        } else if unit.starts_with("hour") || unit.starts_with("hr") {
                            offset_minutes = Some((mins * 60).clamp(1, 720));
                            i += 3;
                            continue;
                        }
                    }
                }
                if (w == "at" || w == "for" || w == "after" || w == "around" || w == "by") && i + 1 < words.len() && time_str.is_none() {
                    if let Some((parsed_t, consumed)) = parse_spoken_time_token(&words[i + 1..]) {
                        time_str = Some(parsed_t);
                        i += 1 + consumed;
                        continue;
                    }
                }
                label_words.push(words[i]);
                i += 1;
            }

            let raw_label = label_words.join(" ");
            let clean_label = raw_label
                .trim_start_matches("to ")
                .trim_start_matches("about ")
                .trim_start_matches("that ")
                .trim_start_matches("for ")
                .trim()
                .to_string();
            let label = if clean_label.is_empty() {
                "Voice Reminder".to_string()
            } else {
                let mut chars = clean_label.chars();
                match chars.next() {
                    Some(first) => first.to_uppercase().collect::<String>() + chars.as_str(),
                    None => "Voice Reminder".to_string(),
                }
            };

            let day_label = if day_offset == Some(1) { " tomorrow" } else { "" };
            let feedback = if let Some(mins) = offset_minutes {
                format!("Reminder set in {}m: {}", mins, label)
            } else if let Some(ref t) = time_str {
                format!("Reminder set{} at {}: {}", day_label, t, label)
            } else {
                format!("Reminder added{}: {}", day_label, label)
            };

            return Some(VoiceActionResult {
                action_type: "system_reminder".to_string(),
                feedback_message: feedback,
                expanded_text: None,
                suppress_paste: true,
                utility_payload: Some(VoiceUtilityPayload {
                    kind: "reminder".to_string(),
                    label,
                    time_str,
                    offset_minutes,
                    day_offset,
                    duration_min: None,
                }),
            });
        }
    }

    const SCHEDULE_PREFIXES: &[&str] = &[
        "fix a schedule ",
        "fix schedule ",
        "set a schedule ",
        "set schedule ",
        "add a schedule ",
        "add schedule ",
        "schedule a meeting ",
        "schedule meeting ",
        "schedule ",
    ];

    for prefix in SCHEDULE_PREFIXES {
        if let Some(rest) = lower_clean.strip_prefix(prefix) {
            let words: Vec<&str> = rest.split_whitespace().collect();
            let mut duration_min: Option<u32> = None;
            let mut time_str: Option<String> = None;
            let mut label_words: Vec<&str> = Vec::new();
            let mut i = 0;
            while i < words.len() {
                let w = words[i].trim_matches(|c: char| c.is_ascii_punctuation());
                if w == "for" && i + 2 < words.len() {
                    if let Ok(mins) = words[i + 1].parse::<u32>() {
                        let unit = words[i + 2].trim_matches(|c: char| c.is_ascii_punctuation());
                        if unit.starts_with("min") {
                            duration_min = Some(mins.clamp(1, 240));
                            i += 3;
                            continue;
                        } else if unit.starts_with("hour") || unit.starts_with("hr") {
                            duration_min = Some((mins * 60).clamp(1, 240));
                            i += 3;
                            continue;
                        }
                    }
                }
                if (w == "at" || w == "for") && i + 1 < words.len() && time_str.is_none() {
                    if let Some((parsed_t, consumed)) = parse_spoken_time_token(&words[i + 1..]) {
                        time_str = Some(parsed_t);
                        i += 1 + consumed;
                        continue;
                    }
                }
                label_words.push(words[i]);
                i += 1;
            }

            let raw_label = label_words.join(" ");
            let clean_label = raw_label
                .trim_start_matches("for ")
                .trim_start_matches("to ")
                .trim()
                .to_string();
            let label = if clean_label.is_empty() {
                "Scheduled Focus".to_string()
            } else {
                let mut chars = clean_label.chars();
                match chars.next() {
                    Some(first) => first.to_uppercase().collect::<String>() + chars.as_str(),
                    None => "Scheduled Focus".to_string(),
                }
            };
            let dur = duration_min.unwrap_or(30);

            return Some(VoiceActionResult {
                action_type: "system_schedule".to_string(),
                feedback_message: format!("Scheduled {} ({}m)", label, dur),
                expanded_text: None,
                suppress_paste: true,
                utility_payload: Some(VoiceUtilityPayload {
                    kind: "schedule".to_string(),
                    label,
                    time_str,
                    offset_minutes: None,
                    day_offset: None,
                    duration_min: Some(dur),
                }),
            });
        }
    }

    None
}

/// Dynamically expands snippets like standup, date, time, zoom, calendly
fn try_expand_dynamic_snippet(lower_clean: &str) -> Option<VoiceActionResult> {
    if !lower_clean.starts_with("insert ") && !lower_clean.starts_with("paste ") && !lower_clean.starts_with("expand ") {
        return None;
    }

    let key = if lower_clean.starts_with("insert ") {
        &lower_clean[7..]
    } else if lower_clean.starts_with("paste ") {
        &lower_clean[6..]
    } else {
        &lower_clean[7..]
    }.trim();

    match key {
        "standup" | "daily standup" => {
            let content = "**Daily Standup**\n• Yesterday: \n• Today: \n• Blockers: None".to_string();
            Some(VoiceActionResult {
                action_type: "snippet_expansion".to_string(),
                feedback_message: "Expanded Daily Standup template".to_string(),
                expanded_text: Some(content),
                suppress_paste: false,
                utility_payload: None,
            })
        }
        "signature" | "sign off" | "email signature" => {
            let content = "Best regards,\nEngineering & Architecture Team".to_string();
            Some(VoiceActionResult {
                action_type: "snippet_expansion".to_string(),
                feedback_message: "Inserted email signature".to_string(),
                expanded_text: Some(content),
                suppress_paste: false,
                utility_payload: None,
            })
        }
        "zoom" | "zoom link" => {
            let content = "Here is my personal meeting room: https://zoom.us/j/1234567890 (Passcode: 4242)".to_string();
            Some(VoiceActionResult {
                action_type: "snippet_expansion".to_string(),
                feedback_message: "Inserted Zoom link".to_string(),
                expanded_text: Some(content),
                suppress_paste: false,
                utility_payload: None,
            })
        }
        "calendly" | "calendar link" => {
            let content = "Feel free to book a convenient slot on my calendar here: https://calendly.com/your-name/30min".to_string();
            Some(VoiceActionResult {
                action_type: "snippet_expansion".to_string(),
                feedback_message: "Inserted Calendly link".to_string(),
                expanded_text: Some(content),
                suppress_paste: false,
                utility_payload: None,
            })
        }
        _ => None,
    }
}

/// Applies Zero-Click Auto-Persona based on the detected foreground application.
/// Returns (formatted_text, persona_applied).
pub fn apply_auto_persona(
    text: &str,
    target_app_id: Option<&str>,
    target_app_name: Option<&str>,
) -> (String, &'static str) {
    let app_str = format!(
        "{} {}",
        target_app_id.unwrap_or(""),
        target_app_name.unwrap_or("")
    ).to_lowercase();

    // 1. Explicit AI Prompt Directives or dedicated AI Tools (ChatGPT, Claude, Perplexity, Poe)
    let is_dedicated_ai_tool = app_str.contains("chatgpt")
        || app_str.contains("claude")
        || app_str.contains("perplexity")
        || app_str.contains("poe")
        || app_str.contains("copilot");

    let is_explicit_prompt = {
        let l = text.trim().to_lowercase();
        l.starts_with("prompt:")
            || l.starts_with("act as ")
            || l.starts_with("instruction:")
            || l.starts_with("create prompt")
            || l.starts_with("write a prompt")
            || l.starts_with("format as prompt")
    };

    if is_dedicated_ai_tool || is_explicit_prompt {
        let enhanced = crate::prompt_service::enhance_ai_prompt(text);
        return (enhanced, "AI Prompt Potency");
    }

    // 2. Developer IDEs & Terminals (VS Code, Cursor, Terminal, iTerm, Warp, Xcode, etc.)
    let is_dev_app = app_str.contains("code")
        || app_str.contains("cursor")
        || app_str.contains("terminal")
        || app_str.contains("iterm")
        || app_str.contains("warp")
        || app_str.contains("xcode")
        || app_str.contains("intellij")
        || app_str.contains("pycharm")
        || app_str.contains("webstorm")
        || app_str.contains("zed")
        || app_str.contains("postman")
        || app_str.contains("sublime");

    if is_dev_app {
        // Check for git commit format (e.g. "feat add auth", "fix memory leak")
        let trimmed = text.trim();
        let lower = trimmed.to_lowercase();
        if lower.starts_with("commit ") || lower.starts_with("git commit ") {
            let msg = if lower.starts_with("git commit ") {
                &trimmed[11..]
            } else {
                &trimmed[7..]
            }.trim();
            return (format!("git commit -m \"{}\"", msg), "Dev / Git Commit");
        }

        let enhanced = crate::enhancement_service::enhance_technical_precision(text);
        return (enhanced, "Technical / Code Syntax");
    }

    // 3. Issue & Project Trackers (Linear, Jira, GitHub, Asana, Trello)
    let is_issue_app = app_str.contains("linear")
        || app_str.contains("jira")
        || app_str.contains("github")
        || app_str.contains("asana")
        || app_str.contains("trello")
        || app_str.contains("clickup");

    if is_issue_app {
        let lower = text.to_lowercase();
        // If it discusses a bug or issue, format with structured markdown
        if lower.contains("steps to reproduce") || lower.contains("expected") || lower.contains("bug") || lower.contains("actual") {
            let structured = format_issue_report(text);
            return (structured, "Issue / Bug Report");
        }
    }

    // 4. Email Clients (Mail, Outlook, Spark, Superhuman)
    let is_mail_app = app_str.contains("mail")
        || app_str.contains("outlook")
        || app_str.contains("spark")
        || app_str.contains("superhuman")
        || app_str.contains("thunderbird");

    if is_mail_app {
        let enhanced = crate::enhancement_service::enhance_professional(text);
        return (enhanced, "Executive Email");
    }

    // 5. Chat & Messaging (Slack, WhatsApp, Messages, Telegram, Discord, Teams)
    let is_chat_app = app_str.contains("slack")
        || app_str.contains("whatsapp")
        || app_str.contains("messages")
        || app_str.contains("telegram")
        || app_str.contains("discord")
        || app_str.contains("teams");

    if is_chat_app {
        let enhanced = crate::enhancement_service::enhance_natural(text);
        return (enhanced, "Conversational Chat");
    }

    // Default: Light correction preserving user's natural voice
    (text.to_string(), "Default Voice")
}

/// Converts spoken issue text into clean structured Markdown
fn format_issue_report(input: &str) -> String {
    let lines: Vec<&str> = input.split(". ").collect();
    let mut out = String::new();

    out.push_str("### Summary\n");
    if let Some(&first) = lines.first() {
        out.push_str(first.trim());
        out.push('\n');
    }

    out.push_str("\n### Details\n");
    for &line in lines.iter().skip(1) {
        let trimmed = line.trim();
        if !trimmed.is_empty() {
            out.push_str("• ");
            out.push_str(trimmed);
            out.push('\n');
        }
    }

    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_detect_voice_action_snippets() {
        let res = detect_voice_action("insert standup").unwrap();
        assert_eq!(res.action_type, "snippet_expansion");
        assert!(res.expanded_text.unwrap().contains("Daily Standup"));

        let res_zoom = detect_voice_action("insert zoom").unwrap();
        assert_eq!(res_zoom.action_type, "snippet_expansion");
        assert!(res_zoom.expanded_text.is_some());
    }

    #[test]
    fn test_detect_voice_action_open() {
        let res = detect_voice_action("open cursor").unwrap();
        assert_eq!(res.action_type, "system_open");
        assert!(res.suppress_paste);
    }

    #[test]
    fn test_detect_voice_action_search() {
        let res = detect_voice_action("search rust async channels").unwrap();
        assert_eq!(res.action_type, "system_search");
        assert!(res.suppress_paste);
    }

    #[test]
    fn test_detect_voice_action_music() {
        let res1 = detect_voice_action("Play, beat it").unwrap();
        assert_eq!(res1.action_type, "system_music");
        assert!(res1.feedback_message.contains("beat it"));
        assert!(res1.suppress_paste);

        let res2 = detect_voice_action("play lofi beats on youtube").unwrap();
        assert_eq!(res2.action_type, "system_music");
        assert!(res2.feedback_message.contains("lofi beats"));

        let res3 = detect_voice_action("play believer in youtube").unwrap();
        assert_eq!(res3.action_type, "system_music");
        assert!(res3.feedback_message.contains("believer"));
    }

    #[test]
    fn test_voice_action_prose_guardrails() {
        // Long / conversational dictation containing "search" or "play" must NOT hijack dictation
        assert!(detect_voice_action("search for the bug in the codebase and then check the logs please").is_none());
        assert!(detect_voice_action("search if the user is logged in. Then paste the result.").is_none());
        assert!(detect_voice_action("play a role in how the system schedules tasks").is_none());
        assert!(detect_voice_action("play around with the UI until it looks clean").is_none());

        // Explicit YouTube search works
        let yt = detect_voice_action("search youtube for rust async").unwrap();
        assert_eq!(yt.action_type, "system_search");
        assert!(yt.feedback_message.contains("YouTube"));
    }

    #[test]
    fn test_auto_persona_dev() {
        let (out, persona) = apply_auto_persona("function test dot log hello", Some("com.microsoft.VSCode"), Some("Code"));
        assert_eq!(persona, "Technical / Code Syntax");
        assert!(out.contains('.'));
    }

    #[test]
    fn test_auto_persona_ai() {
        let (out, persona) = apply_auto_persona("write a python script to parse logs", Some("com.openai.chatgpt"), Some("ChatGPT"));
        assert_eq!(persona, "AI Prompt Potency");
        assert!(!out.is_empty());
    }
}
