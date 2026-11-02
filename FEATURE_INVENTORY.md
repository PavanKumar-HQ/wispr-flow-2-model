# VoxQuest — Complete Feature, Control & Architecture Inventory

This document provides a comprehensive inventory of every implemented screen, interactive control, native service, backend command, database table, and lifecycle workflow discovered in the VoxQuest repository.

---

## 1. UI Screen & Control Catalog

### 1.1 Main Window Navigation & Shell (`src/App.tsx`)
- **Brand Header**: Displays application mascot and title.
- **Navigation Sidebar**: Responsive left sidebar (compact icons on mobile/narrow windows, full labels on desktop):
  - `Home`: Overview, quick dictation card, top 3 stats, recent transcript cards.
  - `Insights`: Analytics dashboard, speed gauge, time saved, desktop app usage, activity calendar.
  - `Models`: Dictation accuracy profiles (Fast, Balanced, Pro), download management, Metal GPU calibration.
  - `Dictionary`: Personal vocabulary rules, candidate review, category filters, JSON export.
  - `History`: Complete dictation history, recovery cards, search, inline editing, correction learning, clear all.
  - `Settings`: Global shortcut recorder, microphone device picker, language selector, formatting toggles, accessibility status.
- **Summon Pill Button**: Bottom-pinned pill summoning shortcut pill in sidebar with `LocateFixed` icon.
- **Window Close Interceptor**: Native NSWindow event interceptor in `src-tauri/src/lib.rs` captures `CloseRequested`, calls `api.prevent_close()`, and hides `main` so the background shortcut and floating pill continue running seamlessly.

---

### 1.2 Floating Pill Window (`src/components/FloatingPill.tsx`)
- **Capsule Container**: Non-activating, transparent, draggable NSWindow styled with platform tokens (`#DFDFD4` cream, `#07514C` dark teal, `#DA6C4C` terracotta).
- **State Badges**:
  - `Idle`: Displays ready status.
  - `Listening`: Pulsing terracotta indicator with active elapsed time counter (`MM:SS`).
  - `Transcribing`: Spinner with dark teal label.
  - `Pasted`: Deep teal badge confirming delivery into target application.
  - `Saved in Recovery`: Amber badge when destination changed or required manual confirmation.
- **Center Soundwave Visualizer (`AudioWaveform.tsx`)**: Real-time 8-bar soundwave reflecting actual microphone input level (pushed via `audio-level` IPC events at ~28Hz).
- **Pill Action Toolbar**:
  - `Stop` (during recording): Immediately ends audio capture, triggers inference, and inserts text.
  - `Enhance` (after completion): One-click text refinement (cleans disfluencies, fixes grammar, polishes phrasing) with loading spinner and success state.
  - `Restore Original` (when enhanced): Reverts enhanced text back to raw recognized speech.
  - `Copy`: Copies active transcript to clipboard with visual checkmark feedback.
  - `Insert`: Pastes active transcript into the currently focused external cursor.
  - `Dismiss`: Closes the floating pill until next dictation.

---

### 1.3 Home Screen (`src/components/HomeTab.tsx`)
- **Status Banner**: Live status indicator with active mascot and current shortcut pill (`⌘ ⇧ Space` / `⌘ K`).
- **Quick Dictate Hero Card**: Large one-click dictate button with live soundwave preview.
- **Top 3 Metric Counters**: Real-time Words Per Minute, Total Words, and Active Streak (calculated live from SQLite history without mocks).
- **Recent Dictations Feed**: Displays the last 3 transcript records with timestamp, duration, target app tag, Enhance action, Paste action, Copy action, and Delete action.
- **Enhance Review Card (`EnhanceReviewCard.tsx`)**: Side-by-side comparison modal with 5 modes (Clarity, AI Prompt, Professional, Concise, Keep Tone).

---

### 1.4 Voice Analytics Dashboard (`src/components/InsightsTab.tsx`)
- **Top Metrics Grid**:
  - Words Per Minute (WPM) speed gauge comparing dictation against 40 WPM manual typing.
  - Total Words Dictated counter and character volume.
  - Estimated Time Saved in minutes compared to manual typing.
- **Desktop Applications Used**: Real usage breakdown bar chart showing word distribution across target applications (e.g. Brave, Safari, WhatsApp, Slack, TextEdit).
- **Activity Calendar Matrix**: GitHub-style daily activity matrix with month offset navigation (`<` / `>`) tracking continuous active streak days.

---

### 1.5 Model Manager (`src/components/ModelManagerTab.tsx`)
- **Accuracy Profiles**:
  - **VoxQuest Fast** (`ggml-tiny.bin`, 74.1 MB): Instant response, ~340 MB RAM.
  - **VoxQuest Balanced** (`ggml-base.bin`, 141.1 MB): General writing, ~520 MB RAM.
  - **VoxQuest Pro** (`ggml-small.bin`, 465.0 MB): Recommended, technical/multilingual, ~1,040 MB RAM.
- **Active Profile Selector**: Radio selector persisting chosen profile to settings.
- **Download Management**: Progress bar tracking download percentage, bytes downloaded, and total bytes.
- **Hardware Calibration Probe**: Runs `smoke_test_transcription` measuring real Metal GPU inference latency on local device.

---

### 1.6 Personal Dictionary & Learning (`src/components/DictionaryTab.tsx`)
- **Sub-Tabs**:
  - `Active Terms`: Lists all enabled vocabulary replacement rules with category badges and usage counters.
  - `Learned Candidates`: Review queue for vocabulary corrections automatically captured from user edits in external applications.
  - `Add Term`: Manual creation form with Original Spoken Phrase, Written Replacement, and Category dropdown.
- **Category Filter Pills**: All, Names & Brands, Technical Words, Acronyms, Formatting.
- **Search Bar**: Real-time substring filter across original and replacement phrases.
- **Rule Actions**: Toggle active/inactive, delete entry, approve candidate, reject candidate.
- **JSON Export**: Downloads complete dictionary as a timestamped JSON file.

---

### 1.7 History & Recovery Queue (`src/components/HistoryTab.tsx`)
- **Pending Recovery Section**: Highlighted alerts for dictations where target focus shifted or window closed, featuring inline editing, `Insert Here`, `Copy Text`, and `Dismiss`.
- **Search Filter**: Real-time filtering by transcript text or target application name.
- **History Cards**:
  - Header: Formatted date, elapsed duration, target application badge.
  - Transcript: Polished text with inline editing capability.
  - Actions: Enhance review button, Insert button, Teach / Correction submission, Copy, Delete.
- **Clear All History**: Destructive action protected by two-step confirmation (`Clear All` -> `Confirm Clear?`). Strictly preserves custom dictionary and personal vocabulary.

---

### 1.8 Settings Screen (`src/components/SettingsTab.tsx`)
- **macOS Permission Card**: Checks accessibility permission; triggers system prompt if ungranted.
- **Global Voice Shortcut**: Interactive key recorder supporting modifier combinations; Escape cancels recording.
- **Microphone Selector**: Dynamic dropdown listing all CoreAudio input devices enumerated via CPAL.
- **Dictation Language**: Dropdown supporting Auto-detect and 99+ Whisper languages.
- **Insertion Policy**: Toggle between `Original Destination` (strictly anchored) and `Active at Stop`.
- **Interaction Mode**: Toggle between `Toggle (Click / Tap)` and `Push-to-Talk (Hold & Release)`.
- **Smart Formatting Toggles**:
  - Spoken punctuation (period, comma, question mark, newline).
  - Conservative filler removal (um, uh).
  - Automatic capitalization.
- **Safety Watchdog Slider**: Configures maximum recording duration (0 to 300 seconds, default 180s) to prevent stuck-key runaway recording.
- **History Retention**: Toggle to disable transcript history logging for zero-persistence workflows.

---

## 2. Backend Native Services Catalog

### 2.1 Audio Capture Service (`src-tauri/src/audio_service.rs`)
- **Backend**: Native CoreAudio via CPAL.
- **Resampling**: Anti-aliased band-limited linear resampler converts any hardware input sample rate (e.g. 44.1kHz, 48kHz) to standard 16,000 Hz 32-bit float mono.
- **Noise & Rumble Filter**: 85 Hz 2nd-order Biquad High-Pass Filter attenuates mechanical vibrations and desk bumps.
- **Acoustic Gating (`is_audio_silent_or_too_short`)**: Rejects audio under 200ms (< 3200 samples) or with peak amplitude < 0.008 / RMS < 0.0025, preventing silence hallucinations before Whisper inference.
- **Level Streamer**: Atomic level calculation emitting `audio-level` events at ~28 Hz during recording only.

---

### 2.2 Whisper Speech Engine (`src-tauri/src/whisper_service.rs`)
- **Engine**: `whisper-rs` v0.16.0 bound to native C++ `whisper.cpp`.
- **Metal GPU Acceleration**: Uses Apple Silicon Metal compute pipeline (`use gpu = 1`, Apple M4 device initialized).
- **Prompt Biasing**: Injects active dictionary terms into Whisper's `initial_prompt` to bias token probabilities toward domain vocabulary.
- **Parameters**: Greedy temperature (0.0 with 0.2 fallback), single segment decoding, blank suppression, multi-threading clamped to available cores.

---

### 2.3 Destination Safety & Insertion Service (`src-tauri/src/safety_service.rs`)
- **Target Snapshotting (`TargetSnapshot`)**: Captures application PID, localized name, bundle ID, window title, and AXRole before pill window appears.
- **Liveness Verification**: Verifies PID is running and target application has at least one open window (`is_target_process_running`, `is_target_window_available`).
- **Secure Field Protection**: Inspects `AXRole` for `AXSecureTextField`; immediately blocks insertion with `BlockedSecureInput` and diverts text to Recovery Vault.
- **Universal Insertion (`simulate_cmd_v`)**: Delivers text via native macOS simulated `⌘V` using CoreGraphics HID event tap.
- **Concurrent-Safe Clipboard Restoration**: Captures pre-paste clipboard contents; restores after 300ms in a background thread *only if* the clipboard was not concurrently modified by the user.
- **Undo Replacement (`simulate_cmd_z`)**: Simulates `⌘Z` to undo previous paste before inserting enhanced text.

---

### 2.4 Destination Edit Synchronization (`src-tauri/src/destination_sync_service.rs`)
- **Observer Loop**: Monitors external application text field via macOS Accessibility API for up to 90 seconds.
- **Reconciliation Algorithm (`reconcile_destination_edit`)**: Uses prefix and suffix anchors to extract the edited dictation segment without capturing unrelated paragraphs.
- **Safe Persistence**: Updates the existing SQLite record (`formatted_text` and `user_edited_text`) without generating duplicate entries, preserving `original_text`.
- **Empty Guard**: Rejects blank accessibility reads to prevent wiping out user transcripts.

---

### 2.5 Enhancement Pipeline (`src-tauri/src/enhancement_service.rs`)
- **Local Engine**: Pure Rust deterministic text enhancement engine running 100% on-device.
- **Modes**:
  - `improve_clarity`: Strips speech disfluencies ("oh no come back out", "no wait", repeated words), fixes grammar, normalizes punctuation.
  - `prompt`: Transforms conversational thoughts into structured AI prompt engineering directives.
  - `professional`: Workplace correspondence with polite greetings, sign-offs, and professional syntax.
  - `concise`: Trims conversational fluff and filler phrases.
  - `keep_tone`: Cleans mechanics while preserving authentic informal dialect.
- **Transparency**: Returns explanation list detailing transformations applied.

---

### 2.6 Personal Dictionary & Learning Service (`src-tauri/src/personalization_service.rs`)
- **Boundary-Aware Replacement**: Applies word-boundary regexes (`\b`) preventing sub-word substring collisions (e.g. replacing "art" will not corrupt "smart").
- **Correction Learning (`extract_correction_candidates`)**: Performs token-level diff between original transcript and user edit; extracts candidate vocabulary pairs while rejecting arbitrary sentence rewrites.
- **Rule Synchronization**: Automatically synchronizes manual custom dictionary entries into active personal vocabulary rules.

---

### 2.7 Formatting Pipeline (`src-tauri/src/formatter.rs`)
- **Punctuation Phrases**: Converts spoken punctuation phrases ("period" -> ".", "question mark" -> "?", "new line" -> "\n", "open quote" -> "\"").
- **Literal Protection**: Preserves literal uses (e.g. "The period lasted two years" is not corrupted).
- **Grammar & Contractions**: Fixes standard English contractions ("dont" -> "don't", "cant" -> "can't", "im" -> "I'm").
- **Brand Capitalization**: Enforces proper casing for known proper nouns (VoxQuest, macOS, GitHub, etc.).

---

### 2.8 Database & Persistence (`src-tauri/src/history_service.rs`)
- **Database File**: SQLite at `~/Library/Application Support/VoxQuest/voxquest_history.db`.
- **Mode**: Write-Ahead Logging (WAL) with busy timeout and connection pooling.
- **Schema**:
  - `transcript_history`: Dictation records (`id`, `timestamp_ms`, `original_text`, `formatted_text`, `user_edited_text`, `duration_seconds`, `status`, `target_app`, `failure_reason`, `session_id`).
  - `custom_dictionary`: Replacement entries (`id`, `original_phrase`, `replacement_phrase`, `category`, `created_at`).
  - `personal_vocabulary`: Learns and tracks vocabulary rules (`id`, `original_text`, `preferred_text`, `entry_type`, `context_domain`, `confidence`, `positive_count`, `negative_count`, `status`, `recognition_count`, `correction_count`, `application_count`, `last_used_at`, `source`).
  - `correction_events`: Audit log of user corrections (`id`, `session_id`, `original_text`, `corrected_text`, `learned_terms_json`, `created_at`).
- **Analytics Aggregations**: Dynamic WPM, total words, streak calculation, and app usage breakdown.

---

### 2.9 Settings Persistence (`src-tauri/src/settings_service.rs`)
- **Configuration File**: JSON at `~/Library/Application Support/VoxQuest/voxquest_settings.json`.
- **Defaults**: Conservative, safe defaults with spoken punctuation and auto-capitalization enabled, filler removal disabled, 180s watchdog cutoff, and retain history enabled.

