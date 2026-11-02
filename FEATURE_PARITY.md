# VoxQuest vs. Wispr Flow — Feature Parity Matrix

Researched Date: November 2, 2026  
Primary Sources: Official Wispr Flow documentation (`wisprflow.ai`), community discussions (`r/WisprFlow`, `r/ProductivityApps`), and VoxQuest repository source code.

---

## 1. Core Dictation Capabilities

| Feature | Wispr Flow Implementation | VoxQuest Current Implementation | Evidence in Code / Runtime | Parity Status | Recommendation |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Push-to-Talk Mode** | Hold shortcut to dictate, release to paste | Hold shortcut to dictate, release to paste | `commands.rs::stop_dictation`, `lib.rs` release handler | **Full Parity** | Keep current implementation |
| **Hands-Free / Toggle Mode** | Press shortcut to start, press again to stop | Click or shortcut toggle supported | `settings_service.rs` (`interaction_mode: "toggle" \| "push_to_talk"`) | **Full Parity** | Keep configurable |
| **Floating Status Indicator** | Floating Flow bubble showing listening, processing, done | Floating pill with animated mascot, status text, and visualizer | `FloatingPill.tsx`, `commands.rs::show_pill_window` | **Full Parity** | Keep; non-activating window |
| **Real-time Audio Visualizer** | Liquid waveform dancing to microphone voice | 11-bar Gaussian weighted liquid audio equalizer responding at ~30 Hz | `AudioWaveform.tsx`, `audio_service.rs::get_current_rms` | **Full Parity** | Keep; low CPU footprint |
| **Local Speech Recognition** | Cloud-based primarily; limited offline fallback | 100% on-device Whisper inference via Apple Silicon Metal GPU | `whisper_service.rs`, `Cargo.toml (whisper-rs/metal)` | **Superior (Local-First)** | Maintain 100% offline sovereignty |
| **Original Destination Anchoring** | Pastes into active cursor; can paste into wrong app if switched | Captures PID, window title, and AXUIElement before UI display; revalidates target before paste | `safety_service.rs::capture_target_destination`, `safety_service.rs::revalidate_destination` | **Superior (Safety)** | Retain session-scoped target anchoring |
| **Acoustic Background Filter** | Cloud noise-suppression models | On-device 85 Hz Biquad High-Pass Filter + VAD soft-gating (-16 dB) | `audio_service.rs::isolate_voice_and_suppress_noise` | **Full Parity** | Zero latency local filtering |
| **Clipboard Preservation** | Overwrites system clipboard; restores after delay | Captures clipboard state before paste; restores previous contents; provides Clipboard Vault fallback | `safety_service.rs::insert_text_safely` | **Full Parity** | Keep safe restoration |

---

## 2. Personalization & Intelligence

| Feature | Wispr Flow Implementation | VoxQuest Current Implementation | Evidence in Code / Runtime | Parity Status | Recommendation |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Personal Dictionary** | Custom word list for specialized terms and names | SQLite-backed vocabulary with exact word-boundary replacement & Whisper prompt injection | `history_service.rs`, `personalization_service.rs` | **Full Parity** | Top 25 terms injected into `initial_prompt` |
| **Self-Learning from Edits** | Cloud AI learns from user corrections | Conservative LCS token diff compares original vs edited text; proposes candidate rules | `HistoryTab.tsx`, `commands.rs::update_recovery_text` | **Full Parity** | Explicit user review by default |
| **Spoken Punctuation** | Dictate "period", "comma", "new line" | Intelligent spoken punctuation with sentence capitalization and paragraph splits | `formatter.rs::apply_spoken_punctuation` | **Full Parity** | Functional regex parser |
| **Filler Word Cleanup** | Removes "um", "uh", false starts | Removes "um", "uh", "er" conservatively without mutating quoted text or proper nouns | `formatter.rs::remove_filler_words_conservative` | **Full Parity** | User toggle in Settings |
| **Developer / Code Awareness** | Preserves camelCase, snake_case, CLI commands | Recognizes programming terms (`API`, `JSON`, `TypeScript`, `SQL`, `Python`, `Docker`, `Git`) | `formatter.rs::format_developer_terms` | **Parity for top tech terms** | Expand tech dictionary |
| **Prompt Supercharging** | Style transformations (casual, formal, prompt) | 1-click "Supercharge Prompt" transforms raw spoken intent into structured LLM prompts | `prompt_service.rs`, `HomeTab.tsx` | **High-Value Addition** | Keep for student & dev workflows |

---

## 3. History, Analytics & Recovery

| Feature | Wispr Flow Implementation | VoxQuest Current Implementation | Evidence in Code / Runtime | Parity Status | Recommendation |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Searchable Transcript History** | Search past dictations | Full search across past dictations with duration, app name, and date | `HistoryTab.tsx`, `history_service.rs::list_records` | **Full Parity** | Fully local in SQLite |
| **Durable Recovery Inbox** | Not documented | Dedicated recovery workflow for failed or aborted target app insertions | `HistoryTab.tsx` (Recovery Queue), `commands.rs::get_recovery_records` | **Superior (Reliability)** | Never loses dictated speech |
| **Speed & Productivity Analytics** | WPM, total words, time saved calculation | Live calculated WPM, total words, real daily streak heatmap, and app breakdown | `InsightsTab.tsx`, `history_service.rs::get_insights` | **Full Parity** | 100% computed from real SQLite logs |
| **Dictionary JSON Export** | Cloud export | 1-click JSON download of all rules and learned metrics | `DictionaryTab.tsx`, `history_service.rs::export_dictionary_json` | **Full Parity** | Zero vendor lock-in |

---

## 4. Features Excluded by Design (Local-First Sovereignty)

1. **Cloud Account & Cross-Device Sync**: Requires central server infrastructure, user email/passwords, and third-party databases. Excluded to maintain complete offline sovereignty.
2. **Mandatory Telemetry & Audio Logging**: Excluded. Audio buffers are discarded from memory immediately upon transcription completion.
3. **Computer Control Actions**: VoxQuest is strictly a high-fidelity voice-to-text writing layer, avoiding dangerous system command execution.

