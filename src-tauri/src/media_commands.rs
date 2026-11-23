use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager};

static WAS_MEDIA_PAUSED_BY_DICTATION: AtomicBool = AtomicBool::new(false);

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NowPlayingInfo {
    pub is_playing: bool,
    pub title: String,
    pub source: String,
}

pub static NOW_PLAYING_INFO: Mutex<Option<NowPlayingInfo>> = Mutex::new(None);

/// Automatically pauses background media (Spotify, Apple Music, YouTube in Chrome/Brave/Safari)
/// so that audio does not bleed into the microphone during dictation.
pub fn pause_media_for_dictation() {
    #[cfg(target_os = "macos")]
    {
        std::thread::spawn(|| {
            let script = r#"
                tell application "System Events"
                    set isSpotifyRunning to (exists (processes where name is "Spotify"))
                    set isMusicRunning to (exists (processes where name is "Music"))
                    set isChromeRunning to (exists (processes where name is "Google Chrome"))
                    set isBraveRunning to (exists (processes where name is "Brave Browser"))
                    set isSafariRunning to (exists (processes where name is "Safari"))
                end tell
                set pausedAny to false
                if isSpotifyRunning then
                    tell application "Spotify"
                        if player state is playing then
                            pause
                            set pausedAny to true
                        end if
                    end tell
                end if
                if isMusicRunning and not pausedAny then
                    tell application "Music"
                        if player state is playing then
                            pause
                            set pausedAny to true
                        end if
                    end tell
                end if
                if not pausedAny and isChromeRunning then
                    tell application "Google Chrome"
                        repeat with w in windows
                            repeat with t in tabs of w
                                if URL of t contains "youtube.com" then
                                    execute t javascript "var v = document.querySelector('video'); if (v && !v.paused) { v.pause(); window.__voxquest_paused_by_dictation = true; }"
                                    set pausedAny to true
                                end if
                            end repeat
                        end repeat
                    end tell
                end if
                if not pausedAny and isBraveRunning then
                    tell application "Brave Browser"
                        repeat with w in windows
                            repeat with t in tabs of w
                                if URL of t contains "youtube.com" then
                                    execute t javascript "var v = document.querySelector('video'); if (v && !v.paused) { v.pause(); window.__voxquest_paused_by_dictation = true; }"
                                    set pausedAny to true
                                end if
                            end repeat
                        end repeat
                    end tell
                end if
                if not pausedAny and isSafariRunning then
                    tell application "Safari"
                        repeat with w in windows
                            repeat with t in tabs of w
                                if URL of t contains "youtube.com" then
                                    do JavaScript "var v = document.querySelector('video'); if (v && !v.paused) { v.pause(); window.__voxquest_paused_by_dictation = true; }" in t
                                    set pausedAny to true
                                end if
                            end repeat
                        end repeat
                    end tell
                end if
                return pausedAny
            "#;
            let output = std::process::Command::new("osascript").arg("-e").arg(script).output();
            if let Ok(out) = output {
                let s = String::from_utf8_lossy(&out.stdout).trim().to_string();
                if s == "true" {
                    WAS_MEDIA_PAUSED_BY_DICTATION.store(true, Ordering::SeqCst);
                }
            }
        });
    }
}

/// Resumes background media if it was paused when dictation started.
pub fn resume_media_after_dictation() {
    #[cfg(target_os = "macos")]
    {
        if WAS_MEDIA_PAUSED_BY_DICTATION.swap(false, Ordering::SeqCst) {
            std::thread::spawn(|| {
                let script = r#"
                    tell application "System Events"
                        set isSpotifyRunning to (exists (processes where name is "Spotify"))
                        set isMusicRunning to (exists (processes where name is "Music"))
                        set isChromeRunning to (exists (processes where name is "Google Chrome"))
                        set isBraveRunning to (exists (processes where name is "Brave Browser"))
                        set isSafariRunning to (exists (processes where name is "Safari"))
                    end tell
                    if isSpotifyRunning then
                        tell application "Spotify" to play
                    else if isMusicRunning then
                        tell application "Music" to play
                    else if isChromeRunning then
                        tell application "Google Chrome"
                            repeat with w in windows
                                repeat with t in tabs of w
                                    if URL of t contains "youtube.com" then
                                        execute t javascript "if (window.__voxquest_paused_by_dictation) { var v = document.querySelector('video'); if (v) v.play(); window.__voxquest_paused_by_dictation = false; }"
                                    end if
                                end repeat
                            end repeat
                        end tell
                    else if isBraveRunning then
                        tell application "Brave Browser"
                            repeat with w in windows
                                repeat with t in tabs of w
                                    if URL of t contains "youtube.com" then
                                        execute t javascript "if (window.__voxquest_paused_by_dictation) { var v = document.querySelector('video'); if (v) v.play(); window.__voxquest_paused_by_dictation = false; }"
                                    end if
                                end repeat
                            end repeat
                        end tell
                    else if isSafariRunning then
                        tell application "Safari"
                            repeat with w in windows
                                repeat with t in tabs of w
                                    if URL of t contains "youtube.com" then
                                        do JavaScript "if (window.__voxquest_paused_by_dictation) { var v = document.querySelector('video'); if (v) v.play(); window.__voxquest_paused_by_dictation = false; }" in t
                                    end if
                                end repeat
                            end repeat
                        end tell
                    end if
                "#;
                let _ = std::process::Command::new("osascript").arg("-e").arg(script).spawn();
            });
        }
    }
}

#[tauri::command]
pub fn get_now_playing_cmd() -> Option<NowPlayingInfo> {
    NOW_PLAYING_INFO.lock().ok().and_then(|g| g.clone())
}

#[tauri::command]
pub fn set_now_playing_cmd(app: AppHandle, info: Option<NowPlayingInfo>) -> Result<(), String> {
    if let Ok(mut g) = NOW_PLAYING_INFO.lock() {
        *g = info.clone();
    }
    let _ = app.emit("now-playing-changed", &info);
    if let Some(w) = app.get_webview_window("floating-indicator") {
        let _ = w.emit("now-playing-changed", &info);
    }
    Ok(())
}

#[tauri::command]
pub fn media_control_cmd(app: AppHandle, action: String) -> Result<String, String> {
    match action.as_str() {
        "youtube_music" => {
            let _ = std::process::Command::new("open").arg("https://music.youtube.com").spawn();
            Ok("Opened YouTube Music".to_string())
        }
        "spotify" => {
            let _ = std::process::Command::new("open").arg("https://open.spotify.com").spawn();
            Ok("Opened Spotify".to_string())
        }
        "apple_music" => {
            let _ = std::process::Command::new("open").arg("music://").spawn();
            Ok("Opened Apple Music".to_string())
        }
        "playpause" | "play_pause" => {
            let mut updated_info: Option<NowPlayingInfo> = None;
            if let Ok(mut g) = NOW_PLAYING_INFO.lock() {
                if let Some(ref mut curr) = *g {
                    curr.is_playing = !curr.is_playing;
                    updated_info = Some(curr.clone());
                } else {
                    let new_info = NowPlayingInfo {
                        is_playing: true,
                        title: "Lo-Fi Focus Stream".to_string(),
                        source: "YouTube".to_string(),
                    };
                    *g = Some(new_info.clone());
                    updated_info = Some(new_info);
                }
            }
            if let Some(ref inf) = updated_info {
                let _ = app.emit("now-playing-changed", inf);
                if let Some(w) = app.get_webview_window("floating-indicator") {
                    let _ = w.emit("now-playing-changed", inf);
                }
            }

            #[cfg(target_os = "macos")]
            {
                let script = r#"
                    tell application "System Events"
                        set isSpotifyRunning to (exists (processes where name is "Spotify"))
                        set isMusicRunning to (exists (processes where name is "Music"))
                        set isChromeRunning to (exists (processes where name is "Google Chrome"))
                        set isBraveRunning to (exists (processes where name is "Brave Browser"))
                        set isSafariRunning to (exists (processes where name is "Safari"))
                    end tell
                    if isSpotifyRunning then
                        tell application "Spotify" to playpause
                    else if isMusicRunning then
                        tell application "Music" to playpause
                    else if isChromeRunning then
                        tell application "Google Chrome"
                            repeat with w in windows
                                repeat with t in tabs of w
                                    if URL of t contains "youtube.com" then
                                        execute t javascript "var v = document.querySelector('video'); if (v) { v.paused ? v.play() : v.pause(); }"
                                        return
                                    end if
                                end repeat
                            end repeat
                        end tell
                    else if isBraveRunning then
                        tell application "Brave Browser"
                            repeat with w in windows
                                repeat with t in tabs of w
                                    if URL of t contains "youtube.com" then
                                        execute t javascript "var v = document.querySelector('video'); if (v) { v.paused ? v.play() : v.pause(); }"
                                        return
                                    end if
                                end repeat
                            end repeat
                        end tell
                    else if isSafariRunning then
                        tell application "Safari"
                            repeat with w in windows
                                repeat with t in tabs of w
                                    if URL of t contains "youtube.com" then
                                        do JavaScript "var v = document.querySelector('video'); if (v) { v.paused ? v.play() : v.pause(); }" in t
                                        return
                                    end if
                                end repeat
                            end repeat
                        end tell
                    end if
                "#;
                let _ = std::process::Command::new("osascript").arg("-e").arg(script).spawn();
            }
            Ok("Toggled playback".to_string())
        }
        "next" => {
            #[cfg(target_os = "macos")]
            {
                let script = r#"
                    tell application "System Events"
                        set isSpotifyRunning to (exists (processes where name is "Spotify"))
                        set isMusicRunning to (exists (processes where name is "Music"))
                        set isChromeRunning to (exists (processes where name is "Google Chrome"))
                        set isBraveRunning to (exists (processes where name is "Brave Browser"))
                        set isSafariRunning to (exists (processes where name is "Safari"))
                    end tell
                    if isSpotifyRunning then
                        tell application "Spotify" to next track
                    else if isMusicRunning then
                        tell application "Music" to next track
                    else if isChromeRunning then
                        tell application "Google Chrome"
                            repeat with w in windows
                                repeat with t in tabs of w
                                    if URL of t contains "youtube.com" then
                                        execute t javascript "var btn = document.querySelector('.ytp-next-button') || document.querySelector('video'); if (btn) btn.click();"
                                        return
                                    end if
                                end repeat
                            end repeat
                        end tell
                    else if isBraveRunning then
                        tell application "Brave Browser"
                            repeat with w in windows
                                repeat with t in tabs of w
                                    if URL of t contains "youtube.com" then
                                        execute t javascript "var btn = document.querySelector('.ytp-next-button') || document.querySelector('video'); if (btn) btn.click();"
                                        return
                                    end if
                                end repeat
                            end repeat
                        end tell
                    else if isSafariRunning then
                        tell application "Safari"
                            repeat with w in windows
                                repeat with t in tabs of w
                                    if URL of t contains "youtube.com" then
                                        do JavaScript "var btn = document.querySelector('.ytp-next-button') || document.querySelector('video'); if (btn) btn.click();" in t
                                        return
                                    end if
                                end repeat
                            end repeat
                        end tell
                    end if
                "#;
                let _ = std::process::Command::new("osascript").arg("-e").arg(script).spawn();
            }
            Ok("Next track".to_string())
        }
        "previous" => {
            #[cfg(target_os = "macos")]
            {
                let script = r#"
                    tell application "System Events"
                        set isSpotifyRunning to (exists (processes where name is "Spotify"))
                        set isMusicRunning to (exists (processes where name is "Music"))
                        set isChromeRunning to (exists (processes where name is "Google Chrome"))
                        set isBraveRunning to (exists (processes where name is "Brave Browser"))
                        set isSafariRunning to (exists (processes where name is "Safari"))
                    end tell
                    if isSpotifyRunning then
                        tell application "Spotify" to previous track
                    else if isMusicRunning then
                        tell application "Music" to previous track
                    else if isChromeRunning then
                        tell application "Google Chrome"
                            repeat with w in windows
                                repeat with t in tabs of w
                                    if URL of t contains "youtube.com" then
                                        execute t javascript "var v = document.querySelector('video'); if (v) { if (v.currentTime > 3) { v.currentTime = 0; } else { var btn = document.querySelector('.ytp-prev-button'); if (btn) btn.click(); } }"
                                        return
                                    end if
                                end repeat
                            end repeat
                        end tell
                    else if isBraveRunning then
                        tell application "Brave Browser"
                            repeat with w in windows
                                repeat with t in tabs of w
                                    if URL of t contains "youtube.com" then
                                        execute t javascript "var v = document.querySelector('video'); if (v) { if (v.currentTime > 3) { v.currentTime = 0; } else { var btn = document.querySelector('.ytp-prev-button'); if (btn) btn.click(); } }"
                                        return
                                    end if
                                end repeat
                            end repeat
                        end tell
                    else if isSafariRunning then
                        tell application "Safari"
                            repeat with w in windows
                                repeat with t in tabs of w
                                    if URL of t contains "youtube.com" then
                                        do JavaScript "var v = document.querySelector('video'); if (v) { if (v.currentTime > 3) { v.currentTime = 0; } else { var btn = document.querySelector('.ytp-prev-button'); if (btn) btn.click(); } }" in t
                                        return
                                    end if
                                end repeat
                            end repeat
                        end tell
                    end if
                "#;
                let _ = std::process::Command::new("osascript").arg("-e").arg(script).spawn();
            }
            Ok("Previous track".to_string())
        }
        "mute" => {
            #[cfg(target_os = "macos")]
            {
                let script = "set volume output muted not (output muted of (get volume settings))";
                let _ = std::process::Command::new("osascript").arg("-e").arg(script).spawn();
            }
            Ok("Toggled system mute".to_string())
        }
        "lofi" | "play" => {
            let info = NowPlayingInfo {
                is_playing: true,
                title: "Lo-Fi Coding & Focus Live".to_string(),
                source: "YouTube".to_string(),
            };
            if let Ok(mut g) = NOW_PLAYING_INFO.lock() {
                *g = Some(info.clone());
            }
            let _ = app.emit("now-playing-changed", &info);
            if let Some(w) = app.get_webview_window("floating-indicator") {
                let _ = w.emit("now-playing-changed", &info);
            }

            let play_url = resolve_youtube_autoplay_url("lofi coding music live");
            let _ = std::process::Command::new("open")
                .arg(&play_url)
                .spawn();
            Ok("Playing Lo-Fi on YouTube".to_string())
        }
        _ => {
            let _ = std::process::Command::new("open").arg("https://www.youtube.com").spawn();
            Ok("Opened YouTube".to_string())
        }
    }
}

pub fn resolve_youtube_autoplay_url(query: &str) -> String {
    let clean = query.trim();
    let encoded = clean.replace(' ', "+");
    let search_url = format!("https://www.youtube.com/results?search_query={}", encoded);

    // Fast HTTP lookup to resolve the top video ID for direct autoplay without landing on search index
    let client = reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_millis(1500))
        .user_agent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .build();

    if let Ok(c) = client {
        if let Ok(resp) = c.get(&search_url).send() {
            if let Ok(text) = resp.text() {
                let pattern = "/watch?v=";
                let mut start_idx = 0;
                while let Some(pos) = text[start_idx..].find(pattern) {
                    let full_pos = start_idx + pos + pattern.len();
                    if full_pos + 11 <= text.len() {
                        let candidate = &text[full_pos..full_pos + 11];
                        if candidate.chars().all(|ch| ch.is_ascii_alphanumeric() || ch == '-' || ch == '_') {
                            return format!("https://www.youtube.com/watch?v={}&autoplay=1", candidate);
                        }
                    }
                    start_idx = full_pos;
                    if start_idx >= text.len() {
                        break;
                    }
                }
            }
        }
    }

    search_url
}

fn safe_spawn_open(url: &str) {
    if cfg!(test) || std::env::var("VOXQUEST_SUPPRESS_AUTO_OPEN").is_ok() {
        return;
    }
    let _ = std::process::Command::new("open").arg(url).spawn();
}

pub fn play_music_internal(query: Option<String>, service: Option<String>) -> Result<(String, NowPlayingInfo), String> {
    let chosen_service = service.unwrap_or_else(|| "youtube".to_string()).to_lowercase();

    if let Some(q) = query {
        let q_clean = q.trim();
        if !q_clean.is_empty() {
            if q_clean.starts_with("http://") || q_clean.starts_with("https://") || q_clean.starts_with("spotify:") {
                let stream_url = if (q_clean.contains("youtube.com/watch") || q_clean.contains("youtu.be/")) && !q_clean.contains("autoplay=") {
                    if q_clean.contains('?') {
                        format!("{}&autoplay=1", q_clean)
                    } else {
                        format!("{}?autoplay=1", q_clean)
                    }
                } else {
                    q_clean.to_string()
                };
                safe_spawn_open(&stream_url);
                let info = NowPlayingInfo {
                    is_playing: true,
                    title: "Audio Stream".to_string(),
                    source: "Stream".to_string(),
                };
                return Ok(("Opened stream link".to_string(), info));
            }

            let encoded = q_clean.replace(' ', "+");
            let encoded_url: String = q_clean
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
                .collect();

            let (url, app_label) = match chosen_service.as_str() {
                "spotify" => {
                    safe_spawn_open(&format!("spotify:search:{}", encoded_url));
                    (format!("https://open.spotify.com/search/{}", encoded_url), "Spotify")
                }
                "apple_music" | "apple" => {
                    (format!("https://music.apple.com/search?term={}", encoded_url), "Apple Music")
                }
                "youtube_music" => {
                    (format!("https://music.youtube.com/search?q={}", encoded), "YouTube Music")
                }
                _ => {
                    let play_url = resolve_youtube_autoplay_url(q_clean);
                    (play_url, "YouTube")
                }
            };

            safe_spawn_open(&url);
            let info = NowPlayingInfo {
                is_playing: true,
                title: q_clean.to_string(),
                source: app_label.to_string(),
            };
            return Ok((format!("Playing \"{}\" on {}", q_clean, app_label), info));
        }
    }

    let default_url = match chosen_service.as_str() {
        "spotify" => "https://open.spotify.com".to_string(),
        "apple_music" | "apple" => "https://music.apple.com".to_string(),
        "youtube_music" => "https://music.youtube.com".to_string(),
        _ => resolve_youtube_autoplay_url("lofi coding music live"),
    };
    safe_spawn_open(&default_url);
    let info = NowPlayingInfo {
        is_playing: true,
        title: "Flow Audio".to_string(),
        source: "YouTube".to_string(),
    };
    Ok(("Playing flow audio".to_string(), info))
}

#[tauri::command]
pub fn play_music_cmd(app: AppHandle, query: Option<String>, service: Option<String>) -> Result<String, String> {
    let (msg, info) = play_music_internal(query, service)?;
    if let Ok(mut g) = NOW_PLAYING_INFO.lock() {
        *g = Some(info.clone());
    }
    let _ = app.emit("now-playing-changed", &Some(info.clone()));
    if let Some(w) = app.get_webview_window("floating-indicator") {
        let _ = w.emit("now-playing-changed", &Some(info));
    }
    Ok(msg)
}

