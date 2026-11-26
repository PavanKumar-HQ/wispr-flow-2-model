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
pub struct VoiceActionResult {
    pub action_type: String, // "system_open", "system_search", "system_music", "system_email", "snippet_expansion"
    pub feedback_message: String,
    pub expanded_text: Option<String>,
    pub suppress_paste: bool, // If true, do not paste command text into foreground app
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
            })
        }
        "signature" | "sign off" | "email signature" => {
            let content = "Best regards,\nEngineering & Architecture Team".to_string();
            Some(VoiceActionResult {
                action_type: "snippet_expansion".to_string(),
                feedback_message: "Inserted email signature".to_string(),
                expanded_text: Some(content),
                suppress_paste: false,
            })
        }
        "zoom" | "zoom link" => {
            let content = "Here is my personal meeting room: https://zoom.us/j/1234567890 (Passcode: 4242)".to_string();
            Some(VoiceActionResult {
                action_type: "snippet_expansion".to_string(),
                feedback_message: "Inserted Zoom link".to_string(),
                expanded_text: Some(content),
                suppress_paste: false,
            })
        }
        "calendly" | "calendar link" => {
            let content = "Feel free to book a convenient slot on my calendar here: https://calendly.com/your-name/30min".to_string();
            Some(VoiceActionResult {
                action_type: "snippet_expansion".to_string(),
                feedback_message: "Inserted Calendly link".to_string(),
                expanded_text: Some(content),
                suppress_paste: false,
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
