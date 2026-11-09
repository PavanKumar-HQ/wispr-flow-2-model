# VoxQuest — Sovereign Native Voice Typing & Developer Intelligence Workspace

[![Platform: macOS Sequoia / Apple Silicon Metal](https://img.shields.io/badge/Platform-macOS%20Apple%20Silicon%20(Metal)-blue.svg)](#)
[![Engine: Whisper.cpp v0.16.0](https://img.shields.io/badge/Engine-Local%20Whisper.cpp%20Metal-orange.svg)](#)
[![Stack: Tauri v2 + Rust + React 19](https://img.shields.io/badge/Stack-Tauri%20v2%20%7C%20Rust%20%7C%20React%2019-teal.svg)](#)
[![Privacy: 100% Offline / Zero Cloud](https://img.shields.io/badge/Privacy-100%25%20On--Device%20%2F%20Zero%20Cloud-success.svg)](#)
[![Tests: 97 Automated Tests](https://img.shields.io/badge/Tests-97%20Automated%20Tests%20Passing-emerald.svg)](#)

VoxQuest is a sovereign, 100% on-device system-wide voice typing utility and developer intelligence workspace built for engineers, writers, and technical professionals. Operating natively across macOS with Apple Silicon Metal GPU acceleration, VoxQuest delivers sub-250ms voice-to-text with zero cloud dependencies, zero subscription fees, and complete offline privacy.

---

## 🔒 Official Locked UI Specification & Version Invariant

> [!IMPORTANT]
> **LOCKED UI SPECIFICATION (Commit `15cdbc5` / `origin/main`)**
> The UI design of VoxQuest is officially **locked** to the authentic GitHub `origin/main` baseline (`15cdbc5`). No experimental redesigns, notches, or fused themes may alter these tokens without explicit user instruction:
>
> 1. **Floating Pill Visual Foundations**:
>    - **Palette**: Warm Linen Cream (`#DFDFD4`) capsule backdrop, Charcoal text (`#212121`), Dark Teal border (`#07514C`).
>    - **Listening State**: Warm Terracotta (`#DA6C4C`) badge with pulsing terracotta indicator, dynamic elapsed recording timer, and Terracotta waveform harmonics.
>    - **Transcribing State**: Authentic Dark Teal (`#07514C`) spinner with a 480ms minimum transcribing visibility floor and Dark Teal harmonic ripple wave.
>    - **Clean Vector Icons (No Emojis)**: Strictly use Lucide SVG vector icons (e.g. `<Zap className="w-3 h-3 text-darkTeal" />`, `<Wand2 />`, `<RotateCcw />`, `<Copy />`, `<CornerDownLeft />`, `<X />`, `<Square />`). Literal emojis (such as ⚡, 🚀, etc.) are strictly prohibited from all UI labels and toasts.
>
> 2. **Complete Floating HUD Action Suite**:
>    - **Dev Mode Badge**: Vector `Zap` icon with clean text label (`Shifted to Dev` / `Dev Active`).
>    - **Enhancement Cycler**: `Wand2` button cycling between Light Correction, Prompt, Professional, Concise, and Natural modes.
>    - **Original Speech Restore**: `RotateCcw` button to instantly revert AI enhancements.
>    - **Clipboard Copy & Direct Insertion**: `Copy` and `CornerDownLeft` buttons with active status checkmarks.
>    - **Window Dismiss**: Clean `X` button.
>
> 3. **Hardware Push-to-Talk & Event Routing**:
>    - Non-focus-stealing floating indicator window (`orderFrontRegardless`).
>    - Universal IPC capability across all windows (`"windows": ["*"]`).
>    - Immediate recording while hotkey is held, instantaneous stop and transcribing transition upon key release.
>    - Guaranteed 0.0% idle CPU and zero thermal heating on Apple Silicon.
>
> 4. **Lightweight Speech Engine Specification (Permanent Thermal Fix)**:
>    - **Active Engine**: `whisper-base-en-q5_1` (57 MB, Q5_1 quantization, English-optimized).
>    - **Performance Metrics**: ~140ms – 600ms latency (15x faster than Large-v3-Turbo), ~130 MB RAM footprint, 0.0% idle CPU.
>    - **Zero Memory Leaks**: Persistent reusable Metal state prevents GPU memory thrashing and elimiates chassis heating.

---

## Table of Contents
1. [Architectural Overview & Core Technology Stack](#1-architectural-overview--core-technology-stack)
2. [VoxQuest vs. Wispr Flow — Parity & Countermeasure Matrix](#2-voxquest-vs-wispr-flow--parity--countermeasure-matrix)
3. [Official 21-Feature Sequential Registry & Invariant Ledger](#3-official-21-feature-sequential-registry--invariant-ledger)
4. [Purpose-Driven Speech Profiles (Zero Raw Model Names in UI)](#4-purpose-driven-speech-profiles-zero-raw-model-names-in-ui)
5. [Developer Mode Workspace Superpowers](#5-developer-mode-workspace-superpowers)
6. [Audio Capture, Pre-Emphasis DSP & Speech Reliability](#6-audio-capture-pre-emphasis-dsp--speech-reliability)
7. [Conversational Speech Self-Correction & Repair Engine](#7-conversational-speech-self-correction--repair-engine)
8. [Universal Destination Safe Insertion & Edit Learning](#8-universal-destination-safe-insertion--edit-learning)
9. [Zero-Cloud Offline Security & Privacy Perimeter](#9-zero-cloud-offline-security--privacy-perimeter)
10. [Performance Benchmarks & Empirical Measurements](#10-performance-benchmarks--empirical-measurements)
11. [Edge-Case Matrix & Failure Recovery](#11-edge-case-matrix--failure-recovery)
12. [Automated Test Suite & Verification Evidence](#12-automated-test-suite--verification-evidence)
13. [Getting Started & Development Guide](#13-getting-started--development-guide)

---

## 1. Architectural Overview & Core Technology Stack

VoxQuest combines low-level native systems engineering with high-speed local inference and an unbloated desktop UI:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        VoxQuest Desktop Architecture                   │
├────────────────────────────────────────────────────────────────────────┤
│  Frontend (Tauri v2 / React 19 / TypeScript / Tailwind CSS)            │
│  - Floating Assistance Pill (On-demand, draggable, non-activating)     │
│  - Main Canvas (Voice Dictation, Casing Bar, Real-Time Waveform)       │
│  - Management Hub (Purpose Profiles, Personal Vocabulary, Insights)    │
├────────────────────────────────────────────────────────────────────────┤
│  Native Rust Core Engine (Tauri v2 App IPC & macOS CoreAudio)          │
│  - Push-to-Talk & Hands-Free Global Hotkey Supervisor (rdev / EventTap)│
│  - Audio Pipeline: 16kHz Float PCM Capture, DSP Pre-Emphasis, Gating   │
│  - Speech Reliability Monitor (Clipping, RMS dB, SNR, Silence Ratio)   │
│  - Deterministic Speech Formatter, Casing Engine & Repair Pipeline     │
│  - AXUIElement Target Inspection & Single-Event HID Paste Injection    │
│  - Local SQLite Database (WAL Mode) for History & Learnt Vocabulary    │
├────────────────────────────────────────────────────────────────────────┤
│  Local Metal GPU Whisper Engine (whisper-rs / whisper.cpp)             │
│  - Reusable Persistent WhisperState (Zero per-transcription allocs)    │
│  - Metal Compute Kernels (M1/M2/M3/M4 GPU acceleration)                │
│  - Quantized GGUF/GGML 5-bit Turbo & Standard Precision Weights        │
│  - 100% Offline: Zero HTTP calls during audio capture and inference    │
└────────────────────────────────────────────────────────────────────────┘
```

- **Host Platform**: macOS Sequoia (Darwin 24+) on Apple Silicon (M1/M2/M3/M4).
- **Inference Runtime**: Local `whisper.cpp` (via `whisper-rs` v0.16.0) compiled with native Metal acceleration (`use fusion = true, use concurrency = true, use graph optimize = true`).
- **Audio Capture**: 16,000 Hz, 32-bit float mono via native CoreAudio through `cpal`.
- **Target Accessibility**: macOS `ApplicationServices` / `AXUIElement` and `CGEventTapLocation::HID`.

---

## 2. VoxQuest vs. Wispr Flow — Parity & Countermeasure Matrix

VoxQuest was engineered specifically to solve the top negative user sentiments and architectural vulnerabilities identified in cloud-based tools like Wispr Flow:

| Wispr Flow Limitation / Complaint | Community Impact | VoxQuest Architectural Countermeasure |
| :--- | :--- | :--- |
| **Cloud Server Outages & Latency Spikes** | Tool fails when internet drops or server is throttled. | **100% Local GPU Engine**: All inference runs directly on Apple Silicon Metal cores. Dictate on flights, trains, and offline environments with zero latency spikes. |
| **Severe Privacy Anxiety** | Audio buffers streamed to remote cloud servers; unacceptable for proprietary code, customer PII, and medical records. | **Air-Gapped Sovereign Privacy**: Audio frames remain strictly in local RAM and are overwritten upon completion. Zero telemetry, zero analytics, zero external network calls. |
| **Overaggressive LLM Rewriting** | Cloud post-processing drops negations ("don't"), fabricates facts, or corrupts code identifiers. | **Technical Integrity Engine**: Token-level diff analysis ensures critical negations, CLI commands, ports, and technical terms cannot be corrupted or silently dropped. |
| **Start/Stop Looping on Shortcut** | Keystrokes lasting >200ms accidentally trigger release checks in toggle mode, causing loops. | **Strict Dual Activation Modes**: In `toggle` mode, key release is strictly a NO-OP. Key up only halts dictation in `push_to_talk`. |
| **Window Focus Theft & Phantom Pastes** | Accessibility API fails on web apps or pastes into wrong windows. | **Universal HID Paste & Snapshot**: Captures target window snapshot before recording, uses single-event `CGEventTapLocation::HID` `Cmd+V`, and isolates user clipboard with 300ms restoration. |
| **Expensive Recurring Subscription** | $15–$25/month SaaS subscription. | **100% Free & Open-Source**: Run local quantized weights indefinitely with zero recurring fees. |

---

## 3. Official 21-Feature Sequential Registry & Invariant Ledger

VoxQuest is governed by an authoritative sequence of architectural features. Every feature enforces strict regression invariants:

### Sequential Feature Index

| ID | Feature Name | Core Subsystem | Invariant Guard | Status |
| :--- | :--- | :--- | :--- | :--- |
| **001** | Core Push-to-Talk & Dictation Pipeline | `commands.rs`, `audio_service.rs` | Must release microphone on key-up and prevent zombie recordings. | ✅ Verified |
| **002** | Single-Event HID Paste Injection | `safety_service.rs` | Post `Cmd+V` strictly to `CGEventTapLocation::HID` (never Session + HID). | ✅ Verified |
| **003** | Repetition & Stutter Deduplication | `formatter.rs`, `whisper_service.rs` | Preserves emphatic doubles ("no no", "very very"); collapses stutter loops. | ✅ Verified |
| **004** | Developer & Technical Term Pipeline | `formatter.rs` | Auto-maps "next js" $\to$ `Next.js`, "post degree sql" $\to$ `PostgreSQL`, etc. | ✅ Verified |
| **005** | Domain Context Prompt Biasing | `history_service.rs` | Whisper initial prompt primed with top developer and system tokens. | ✅ Verified |
| **006** | OpenAI Whisper Large-v3-Turbo Engine | `model_manifest.rs` | 5-bit Metal quantized (`ggml-large-v3-turbo-q5_0.bin`, 574 MB, 809M params). | ✅ Verified |
| **007** | Context-Aware Dynamic Model Routing | `commands.rs` | Auto-promotes to Precision for IDEs/Terminals; Speed for messaging. | ✅ Verified |
| **008** | Dynamic Auto-Pilot UI Controls | `ModelManagerTab.tsx`, `SettingsTab.tsx` | User can enable/disable dynamic routing via toggle switch. | ✅ Verified |
| **009** | Conversational Speech Self-Correction | `formatter.rs` | Replaces reparandum when repair cue ("oh no", "actually", "sorry") is spoken. | ✅ Verified |
| **010** | Post-Paste Edit Self-Learning | `destination_sync_service.rs` | Target app edits automatically activate in dictionary without delay. | ✅ Verified |
| **011** | Smart Voice Snippets & Personal Macros | `history_service.rs`, `DictionaryTab.tsx`| Spoken "my email" / "my email ID" expands to configured personal email. | ✅ Verified |
| **012** | Fast Speech Rescoring & Temperature | `whisper_service.rs` | Deterministic greedy decoding (`temp: 0.0`) prevents infinite loop spirals. | ✅ Verified |
| **013** | Developer Voice Casing Commands | `formatter.rs` | Converts "camel case", "snake case", "kebab case", "constant case" to code. | ✅ Verified |
| **014** | Audio Spectral Pre-Emphasis (DSP) | `audio_service.rs` | High-frequency consonant boost ($\alpha=0.15$) sharpens rapid phonemes. | ✅ Verified |
| **015** | Comprehensive AI & Tech Lexicon | `formatter.rs`, `history_service.rs` | Auto-formats ChatGPT, GPT-4, OpenAI, Claude, Gemini, PyTorch, Supabase. | ✅ Verified |
| **016** | Technical Integrity Engine | `enhancement_service.rs` | Protects semantic negations ("don't", "never"), technical terms, and ports. | ✅ Verified |
| **017** | Speech Reliability Monitor | `audio_service.rs`, `commands.rs` | Diagnostics for clipping, low volume, silence ratio, SNR, and short speech. | ✅ Verified |
| **018** | Prompt Architect Mode | `prompt_service.rs` | Automatically structures voice directives into Goal, Context, Requirements. | ✅ Verified |
| **019** | One-Click Rollback & Statement Match | `HistoryTab.tsx`, `commands.rs` | Restores raw speech transcript into history & active cursor with zero data loss. | ✅ Verified |
| **020** | Dual Activation Modes & Tactile Buttons | `lib.rs`, `HomeTab.tsx`, `SettingsTab.tsx`| Push-to-Talk (Hold) vs Toggle (Hands-Free) with prominent "Paste to App" UX. | ✅ Verified |
| **021** | Developer Workspace & Purpose Profiles | `formatter.rs`, `DeveloperCasingBar.tsx` | 1-click casing transforms, CLI flag normalization, and zero raw model names in UI. | ✅ Verified |

---

## 4. Purpose-Driven Speech Profiles (Zero Raw Model Names in UI)

In alignment with human-centric software design, internal technical model identifiers (`whisper-tiny`, `whisper-base`, `whisper-small`, `whisper-large-v3-turbo`, `ggml-...`, `809M Metal`) are completely eradicated from all user interfaces. Profiles are presented strictly by purpose:

1. **Developer & Technical Precision** (Backing: `large-v3-turbo` 5-bit Metal)
   - *Purpose*: Specialized for software engineering, code identifiers, CLI flags, terminal syntax, rapid conversational speech, Indian English accents, and deep technical vocabulary.
   - *Recommended For*: VS Code, Cursor, Xcode, Terminal, iTerm2, Warp, Zed.
2. **Multilingual & Dialects** (Backing: `whisper-small`)
   - *Purpose*: Deep multilingual comprehension across 99+ languages, regional dialects, and mixed code-switching speech (e.g., Hinglish).
   - *Recommended For*: Multilingual correspondence, international documentation.
3. **Balanced Everyday Writing** (Backing: `whisper-base`)
   - *Purpose*: Optimal balance of speed and transcription accuracy for daily writing tasks.
   - *Recommended For*: Long-form emails, Notion, Obsidian, Word, Google Docs.
4. **General & Instant Speed** (Backing: `whisper-tiny`)
   - *Purpose*: Ultra-fast near-zero latency response (~53ms inference, 56x faster than real-time) with minimal battery footprint.
   - *Recommended For*: Slack, WhatsApp, quick chat messages, and daily scratch notes.

### Automatic Model Auto-Pilot & Adaptive Shifting (Context-Aware Routing)
When enabled in Settings, VoxQuest dynamically inspects the active application, recent speech context, and spoken vocabulary:
- **Application Routing**: If the frontmost application is a coding environment or terminal (`Code`, `Cursor`, `Terminal`, `iTerm2`, `Warp`, `Xcode`, `IntelliJ`, `WebStorm`, `Postman`, `Sublime`, `Zed`), VoxQuest automatically routes the capture to **Developer & Technical Precision**. If in a messaging client (`Slack`, `Notes`, `WhatsApp`), it routes to **General & Instant Speed** for sub-100ms response.
- **Adaptive Jargon Detection (`detect_technical_jargon`)**: Scans transcripts for engineering vocabulary across databases (`PostgreSQL`, `MongoDB`, `Redis`, `Supabase`, `SQLite`), frameworks (`React`, `Next.js`, `Vue`, `FastAPI`, `Tauri`), languages (`Rust`, `TypeScript`, `Python`, `Golang`), DevOps (`Docker`, `Kubernetes`, `CI/CD`), and code syntax constructs (`print()`, `console.log`, `=>`, `==`, brackets, parentheses).
- **Subsequent Session Priming**: Detecting technical jargon primes VoxQuest's dynamic router for the next 10 minutes so that follow-up technical statements continue to execute on the highest-precision model.
- **Proactive Notification Banner**: When technical speech is detected while operating on an Everyday/Instant profile, a proactive suggestion card appears on the Home Canvas and Floating Pill:
  > *"Technical vocabulary detected (PostgreSQL, React, Docker). Switch to Developer & Technical Precision profile for highest accuracy?"*
  Offering 1-click **"Switch to Developer"** and **"Dismiss"** actions.
- **Everyday Conversation Detection**: Conversely, when casual everyday speech is detected while on the Developer profile in a non-coding app, an adaptive option invites the user to return to **Balanced Everyday** for lower latency.

---

## 5. Developer Mode Workspace Superpowers

VoxQuest includes dedicated capabilities designed specifically for software engineers:

### 1-Click Developer Casing Bar (`DeveloperCasingBar.tsx`)
Rendered directly under transcripts on the Home Canvas, History entries, and Enhancement cards:
- **`camelCase`**: `create user profile` $\to$ `createUserProfile`
- **`snake_case`**: `get user by id` $\to$ `get_user_by_id`
- **`kebab-case`**: `order service endpoint` $\to$ `order-service-endpoint`
- **`CONSTANT`**: `max retry count` $\to$ `MAX_RETRY_COUNT`
- **`PascalCase`**: `order controller` $\to$ `OrderController`
- **`` `inline code` ``**: `user token` $\to$ `` `user token` ``

*Execution*: Clicking any format instantly transforms the transcript, writes it to the system clipboard, and immediately pastes it into the active cursor of the open app.

### Developer Code Syntax Engine (`apply_developer_code_syntax`)
Developers dictating code speak naturally in code constructs. VoxQuest automatically recognizes, balances, and formats spoken code tokens into syntactically valid code:
- **Function Calls & Parentheses Pairing**:
  - `"print, parenthesis, items, parenthesis"` $\to$ `print(items)`
  - `"print parenthesis items parenthesis"` $\to$ `print(items)`
  - `"console dot log parenthesis item parenthesis"` $\to$ `console.log(item)`
  - `"def my_func parenthesis a comma b parenthesis colon"` $\to$ `def my_func(a, b):`
  - Function identifiers (`print`, `len`, `console.log`) bind directly to `(` without awkward gaps; spaces inside parentheses and trailing argument commas (`items,)` $\to$ `items)`) are automatically cleansed.
  - Lowercase syntax keywords (`print`, `console.log`, `def`, `fn`, `return`, `import`) are protected against accidental sentence capitalization.
- **Control Flow Statements**:
  - `"if parenthesis x double equals y parenthesis"` $\to$ `if (x == y)`
  - `"while parenthesis running parenthesis"` $\to$ `while (running)`
- **Collections & Indexing**:
  - `"items bracket zero bracket"` $\to$ `items[0]`
  - Digit words inside brackets are automatically converted to numeric indices.
- **Spoken Operators**:
  - `"double equals"` $\to$ `==`
  - `"triple equals"` $\to$ `===`
  - `"not equals"` / `"bang equals"` $\to$ `!=`
  - `"greater than or equal to"` $\to$ `>=`
  - `"less than or equal to"` $\to$ `<=`
  - `"fat arrow"` $\to$ `=>`
  - `"thin arrow"` $\to$ `->`
  - `"plus equals"` $\to$ `+=`
  - `"plus plus"` $\to$ `++`
  - `"x fat arrow y"` $\to$ `x => y` (variable names preceding operators maintain proper casing)

### CLI & Terminal Command Normalization
Spoken commands in terminals frequently suffer from syntax breakages caused by automatic punctuation. VoxQuest's terminal formatter:
- Normalizes spoken flags:
  - `"dash dash save dev"` $\to$ `--save-dev`
  - `"dash dash release"` $\to$ `--release`
  - `"dash dash help"` $\to$ `--help`
  - `"dash m"` $\to$ `-m`
  - `"dash it"` $\to$ `-it`
- Suppresses trailing periods:
  - If a dictated sentence begins with a CLI tool command (`git`, `cargo`, `npm`, `pnpm`, `yarn`, `docker`, `kubectl`, `brew`, `npx`, `curl`, `pip`, `cd`, `ls`), the trailing sentence period is automatically stripped so that commands execute immediately in bash/zsh without syntax errors.

### Prompt Architect Mode (`prompt_service.rs`)
Engineers dictating stream-of-consciousness prompts for LLMs can activate Prompt Architect mode. Spoken thoughts are restructured into structured prompts:
```markdown
### Goal
[Single declarative sentence summarizing intent]

### Context
[Spoken background facts and architecture details]

### Requirements
- [Itemized functional requirement 1]
- [Itemized functional requirement 2]

### Constraints
- [Performance, framework, and security boundaries]
```

---

## 5. The 12 Blueprint Features Architecture & Verification Audit

VoxQuest implements and verifies 12 production-grade capabilities designed for elite developers, researchers, and technical writers:

| # | Blueprint Feature | Architecture & Implementation Source | Production Capabilities & Invariants | Verification Status |
|---|---|---|---|---|
| **1** | **Technical Integrity Engine** | `src-tauri/src/enhancement_service.rs` | Token-level semantic integrity guard. Prevents loss of critical negations (`don't`, `never`, `cannot`), ensures registered product names (`PostgreSQL`, `Docker`) and numeric ports (`5432`, `8080`) are never rewritten. | ✅ Verified (`test_technical_integrity_*`) |
| **2** | **Speech Reliability Monitor** | `src-tauri/src/audio_service.rs`, `commands.rs` | Continuous acoustic diagnostics: digital clipping detection ($>0.2\%$ at 0 dBFS), low volume warning (peak $<0.05$ or RMS $<-38\text{ dB}$), excessive silence ratio ($>75\%$), and short click discard ($<300\text{ms}$). | ✅ Verified (`test_speech_reliability_*`) |
| **3** | **Personal Error Memory** | `src-tauri/src/personalization_service.rs`, `destination_sync_service.rs` | Automatic post-paste edit learning. Detects manual replacements made in destination apps via Accessibility API, auto-promotes to active dictionary replacements with 0.95 confidence. | ✅ Verified (`test_personal_vocabulary_*`) |
| **4** | **Acoustic Error Explorer** | `src-tauri/src/noisy_speech_benchmark.rs` | In-depth Word Error Rate (WER) & Character Error Rate (CER) analysis across synthetic background noise environments (fan hum, typing clicks, babble chatter). | ✅ Verified (`test_benchmark_models_*`) |
| **5** | **Project-Aware Vocabulary Profiles** | `src-tauri/src/model_manifest.rs`, `commands.rs`, `DictionaryTab.tsx` | Context-aware terminology profiles per project/application. Custom dictionaries with exact casing, word-boundary regex substitution, and project-specific acronym expansion. | ✅ Verified (`test_dictionary_*`) |
| **6** | **Prompt Architect** | `src-tauri/src/prompt_service.rs` | Converts unstructured voice stream-of-consciousness into structured AI directives formatted into Goal, Context, Functional Requirements, and Constraints. | ✅ Verified (`test_prompt_architect_*`) |
| **7** | **Technical Output Modes** | `src-tauri/src/formatter.rs`, `DeveloperCasingBar.tsx` | Voice commands and UI casing toolbar for developer casing: `camelCase`, `snake_case`, `CONSTANT_CASE`, `kebab-case`, `PascalCase`, and `dot.notation`. Spoken quote handling (`print("today's date", today)`). | ✅ Verified (`test_developer_code_syntax`) |
| **8** | **Technical Context Protection** | `src-tauri/src/safety_service.rs`, `enhancement_service.rs` | Detects secure credential fields (`NSSecureTextField`) to block accidental cleartext leak. Protects CLI flags (`--no-cache`), version numbers, URLs, and code blocks from mutation. | ✅ Verified (`test_security_bounds_*`) |
| **9** | **Voice-to-Artifact Workflow** | `src-tauri/src/enhancement_service.rs`, `EnhanceReviewCard.tsx` | Controlled text improvement decoupled from insertion. Provides interactive draft review card with in-place text editing, Accept, Discard, Revert, and Paste to App actions. | ✅ Verified (`test_enhancement_pipeline_*`) |
| **10** | **Personal Accuracy Benchmark** | `src-tauri/src/noisy_speech_benchmark.rs` | Rigorous latency, memory, and RTF profiling across Apple Silicon Metal GPU threads for all purpose profiles. | ✅ Verified (`test_benchmark_metal_*`) |
| **11** | **Transcript Version History** | `src-tauri/src/history_service.rs`, `HistoryTab.tsx` | Full non-destructive version history. Every transcription retains original raw speech, enhanced variations, user manual edits, and one-click rollback to original cursor location. | ✅ Verified (`test_history_crud_*`) |
| **12** | **Local-First Privacy Controls** | `src-tauri/src/safety_service.rs`, `settings_service.rs` | 100% offline local inference via Metal GPU. Zero telemetry, volatile RAM-only audio buffers, and standard OS file permission locks (`0700`). | ✅ Verified (`test_privacy_offline_*`) |

---

## 6. VoxQuest Enhance — Functional Specification

Enhance functions as a **controlled text-improvement engine**, completely decoupled from raw transcription and insertion. It takes text VoxQuest has already recognized, corrects genuine errors, improves clarity according to a selectable contract, and preserves the user's original meaning and technical identifiers.

> **The Sovereign Rule of Enhance**:
> Enhance may improve how the user expresses an idea, but it must **never** silently change what the user means.

### 1. Controlled Five-Step Processing Pipeline
1. **Input Selection**: Uses current live transcript or explicitly selected text snippet.
2. **Prepare & Protect**: Identifies code tokens, function names, technical terms, CLI flags, ports, URLs, versions, and logical negations.
3. **Apply Selected Enhancement Mode**: Strictly adheres to the selected mode contract (conservative heuristics first, followed by local language refinement).
4. **Validate the Result**: Evaluates meaning-sensitive modifications, flags dropped negations, ensures no invented facts or missing requirements.
5. **Preview & Decide**: Interactive in-place review card offering:
   - **Accept & Save**: Confirms enhanced text and updates version history.
   - **In-Place Edit**: Provides live inline `<textarea>` allowing the user to refine phrasing directly before committing.
   - **Discard**: Discards candidate suggestions and reverts to original speech.
   - **Paste to App**: Safely activates target app and types enhanced text into original caret location.

### 2. Enhancement Mode Contracts

| Mode | Contract & Purpose | Default Behavior | Example Input $\to$ Output |
|---|---|---|---|
| **Light Correction** *(Default)* | Corrects obvious speech-recognition, spelling, punctuation, and duplicate word errors while strictly preserving user wording, tone, details, and constraints. | Conservative spell/punct fix; accidental repetition removal | `"i need to fix the supabase auth bug but dont reset the database"` $\to$ `"I need to fix the Supabase auth bug, but don't reset the database."` |
| **Professional** | Polishes tone for executive correspondence, PRs, and formal documentation while retaining technical substance. | Removes colloquialisms; cleans phrasing | `"hey team i finished the backend but the api is giving error so i will fix it tomorrow"` $\to$ `"Hello team, I finished the backend, but the API is returning an error. I will resolve it tomorrow."` |
| **Concise** | Removes conversational filler and verbose preamble while retaining all technical requirements and acceptance criteria. | Removes conversational fluff; retains data | `"just wanted to let you know that in order to advance planning we need more time"` $\to$ `"In order to advance planning, we need more time."` |
| **Natural** | Improves sentence rhythm, readability, and punctuation while retaining the author's casual, conversational voice. | Preserves contractions and voice | `"gonna see if this works cuz we wanna finish early"` $\to$ `"Gonna see if this works cuz we wanna finish early."` |
| **Technical Precision** | Enforces strict syntax formatting, developer casing, CLI flags (`--no-cache`), port formats (`:5432`), and protects identifiers from standard grammar modifications. | Code/identifier shielding | Spoken `"docker run dash p 8080 colon 8080"` $\to$ `` `docker run -p 8080:8080` `` |
| **Prompt Composition** | Transforms stream-of-consciousness dictation into structured prompt artifacts with Goal, Context, Requirements, and Constraints. | Structured markdown artifact generation | See Prompt Architect specification |

### 3. Safe Edits vs. Forbidden Mutations
- **Spelling & Capitalization**: `recieve` $\to$ `receive`, `postgresql` $\to$ `PostgreSQL`.
- **Punctuation & Grammar**: Adds question marks, fixes subject-verb agreements without altering meaning.
- **Accidental Repetition**: Removes stuttered duplicates (`"check check the logs"` $\to$ `"check the logs"`).
- **Rule for Missing Words**: Enhance **never** invents missing technical details from general knowledge. If two interpretations are plausible, wording is preserved.
- **Semantic Negation Preservation**: `"Don't remove existing auth"` is guaranteed never to become `"Remove existing auth"`. Violations are detected by the Technical Integrity Engine and rejected.

### 4. Caret Jumping Prevention & Insertion Policy
When users dictate, they frequently click elsewhere while speaking. VoxQuest prevents pasting into unintended fields:
- **Insertion Policy**: Configurable in Settings (`Original Destination` vs. `Active Window`).
- **Original Destination Enforcement**: When `insertion_policy == "original_destination"`, VoxQuest stores the `TargetSnapshot` at the exact instant recording begins. At completion, VoxQuest activates the original target application and window, ensuring keystrokes are delivered to spot A, not spot B.

### 5. Spoken Developer Code Syntax
Spoken code syntax is intelligently translated to executable statements:
- `"print(double quote, today's date double quote, today)"` $\to$ `print("today's date", today)`
- `"x fat arrow y"` $\to$ `x => y`
- `"x triple equals y"` $\to$ `x === y`
- `"items bracket zero bracket"` $\to$ `items[0]`
- `"user dot name"` $\to$ `user.name`

### 6. Adaptive Model Shifting & Visual Notifications
When a user begins dictating programming syntax or technical jargon while on a general profile, VoxQuest:
1. Dynamically shifts to the **Developer & Technical Precision** profile.
2. Emits a `technical-model-shifted` event.
3. Renders a prominent glowing amber/teal badge on the **Floating Pill** (`⚡ Shifted to Dev`) and a toast card on the **Home Canvas** informing the user that precision inference is active.

### 7. Thought-to-Spec Workspace (Signature Workflow)
Beyond ordinary prompt expansion, technical users often formulate thoughts aloud with spontaneous self-corrections. **Thought-to-Spec** ingests spoken thinking monologues:
- Detects verbal self-corrections (*"actually"*, *"instead"*, *"don't create another"*).
- Extracts system assumptions (*"existing login API"*).
- Isolates immutable constraints & invariants (*"do not alter database schema"*).
- Formulates verifiable acceptance criteria (*"automated unit tests for token expiration"*).
- Outputs a ready-to-paste markdown specification directly into Cursor, VS Code, or RFC documents.

### 8. Project Context Capsules (Zero-Cloud Lexicon Scoping)
Avoids dictionary pollution across different programming projects:
- Scans local repository dependency manifests (`package.json`, `Cargo.toml`).
- Extracts library names and identifiers into isolated, project-scoped vocabulary rings (`context_domain: "project:<name>"`).
- Automatically biases Whisper acoustic recognition toward the active project's terminology without cloud telemetry.

### 9. Tactile Modern Button UI System
Every control across VoxQuest conforms to physical tactile design principles:
- Replaced flat, link-like text buttons with solid, elevated 3D controls (`.tactile-btn`, `.tactile-btn-primary`, `.tactile-btn-teal`, `.tactile-btn-surface`).
- Crisp 1.5px–2px borders, contrast-rich gradients, subtle drop shadows, and active click scaling (`active:scale-[0.98]`).
- Clear visual hierarchy distinguishing Primary, Secondary, Danger, and Subtle actions.

---

## 7. Audio Capture, Pre-Emphasis DSP & Speech Reliability

### Audio Signal Processing Pipeline
- **Sampling**: 16,000 Hz, 32-bit floating-point mono audio captured via CoreAudio (`cpal`).
- **High-Pass Filter**: 85 Hz 2-pole Butterworth high-pass filter eliminates low-frequency desk vibrations, laptop fan hum, and handling rumble.
- **Spectral Pre-Emphasis (DSP)**:
  $$y[n] = x[n] - 0.15 \cdot x[n-1]$$
  Pre-emphasis sharpens high-frequency unvoiced consonant onsets ($/t/, /s/, /k/, /p/$) to improve syllable separation in fast and rapid speech without distortion.
- **Acoustic Gating & Boundary Padding**:
  - Ambient noise floor capped at `0.003` to prevent loud speech from artificially raising the threshold.
  - Speech threshold clamped between `0.002` and `0.0045`.
  - 300ms (15 frames) of boundary padding prepended and appended to speech segments to prevent syllable clipping.

### Speech Reliability Monitor (`audio_service.rs`)
Evaluates speech quality in real-time and alerts users to physical audio issues:
- **Clipping Detection**: Alerts when $>0.2\%$ of samples hit digital maximum ($|x| \ge 0.99$).
- **Low Volume Warning**: Flags when peak amplitude falls below $0.05$ or RMS $< -38\text{ dB}$.
- **Excessive Silence**: Flags recordings with $>75\%$ silence ratio.
- **Short Speech Guard**: Rejects accidental clicks under $300\text{ms}$.

---

## 7. Conversational Speech Self-Correction & Repair Engine

Natural human speech contains real-time mid-sentence self-corrections. VoxQuest includes an automated speech repair engine (`repair_speech_self_corrections`):

### How It Operates
When a speaker utters a verbal repair cue (`"oh no"`, `"actually"`, `"sorry"`, `"wait"`, `"scratch that"`, `"I mean"`, `"or rather"`), VoxQuest:
1. Identifies the repair marker and the post-marker correction tokens.
2. Performs backward token-window alignment across preceding spoken words.
3. Automatically excises the erroneous segment and replaces it with the corrected phrasing.

### Verified Test Cases
- `"The meeting no, it's at 5 PM."` $\to$ `"The meeting is at 5 PM."` *(False start / subject hesitation smoothly converts disfluent restart into clean copula)*
- `"The meeting was at 4 PM, no, it's at 5 PM."` $\to$ `"The meeting was at 5 PM."`
- `"The meeting at 4 PM, no, 5 PM."` $\to$ `"The meeting at 5 PM."`
- `"meeting was there at 4pm, oh no, 5pm."` $\to$ `"Meeting was there at 5pm."`
- `"meeting at 4:00 PM, oh no, 5:00 PM."` $\to$ `"Meeting at 5:00 PM."`
- `"let's do Monday, actually Tuesday."` $\to$ `"Let's do Tuesday."`
- `"we have 10 users, sorry, 20 users."` $\to$ `"We have 20 users."`
- `"send email to Sarah, wait, Alex."` $\to$ `"Send email to Alex."`
- `"cancel the flight, scratch that, confirm the flight."` $\to$ `"Confirm the flight."`

*Safety Invariant*: Sentences beginning with conversational words (*"Actually, I think..."*) are protected and never trigger erroneous deletions.

---

## 8. Universal Destination Safe Insertion & Edit Learning

Text insertion across macOS desktop applications is fraught with window-focus and accessibility quirks. VoxQuest utilizes an audited universal insertion protocol:

### Universal Safe Insertion Protocol (`safety_service.rs`)
1. **Target Pre-Validation**: Before recording begins, VoxQuest captures a lightweight snapshot (`TargetSnapshot`) of the frontmost PID, application bundle ID, window title, and active text-input element.
2. **Multi-Screen & Window Focus Activation**: When inserting or clicking "Paste to App", VoxQuest activates the target destination application via native macOS `tell application id "<bundle_id>" to activate` and `activateWithOptions`, settling window focus across multi-monitor setups and secondary spaces so the native caret is focused and ready before keystroke injection.
3. **Single-Event HID Injection**: Native `Cmd+V` keystroke events are posted exclusively to `CGEventTapLocation::HID` with an 80ms modifier settle delay and 30ms keydown duration. (Posting to `Session` causes duplicate pastes on macOS WindowServer).
4. **Clipboard Preservation & Isolation**:
   - The user's prior clipboard content is captured before insertion.
   - Dictated text is placed on the clipboard and injected via simulated `Cmd+V`.
   - After an asynchronous settle period, the user's prior clipboard content is restored, ensuring concurrent user copy actions are never lost.

### Post-Paste Edit Self-Learning (`destination_sync_service.rs`)
When a user dictates text and subsequently makes manual edits directly in their destination application:
- VoxQuest observes the updated text via Accessibility `AXValue`.
- The system extracts word-level candidate corrections (e.g., spoken `"docker"` edited to `"Docker"`).
- Automatically writes active corrections directly into `personal_vocabulary` and `custom_dictionary`.
- Future dictations immediately benefit from learned corrections without requiring manual dictionary entry.

---

## 9. Zero-Cloud Offline Security & Privacy Perimeter

VoxQuest adheres to strict local-first data sovereignty:

- **Network Air-Gap**: Zero outbound network requests are executed during audio capture, whisper transcription, smart formatting, dictionary learning, or AI enhancement. The sole HTTP client (`reqwest`) is isolated to user-initiated downloads of official quantized model files from Hugging Face.
- **Volatile Audio Storage**: Audio capture buffers reside exclusively in non-swappable heap RAM during recording. Once transcription finishes, audio memory is immediately freed. No audio files are ever written to disk.
- **Secure Password Field Protection**: Inspects `AXRole` and `AXSubrole`. If the target element is `AXTextField` with secure subrole or `NSSecureTextField`, direct text insertion is blocked to prevent accidental entry of cleartext into credential fields.
- **Encrypted Local Storage**: Transcripts and dictionary corrections are persisted in local SQLite with standard OS user-space permissions (`chmod 0700`).

---

## 10. Performance Benchmarks & Empirical Measurements

All measurements performed on an **Apple MacBook Air (M4, 10-core CPU, 10-core GPU, 16 GB Unified Memory)** running macOS Sequoia:

### Model Inference Benchmarks (3.0s Audio Fixture)

| Purpose Profile | File Size | Cold Load | Warm Inference Median | Warm Inference P95 | Real-Time Factor (RTF) | Speed Multiple |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **General & Instant Speed** (`tiny`) | 74.1 MB | 430 ms | **53.3 ms** | **53.5 ms** | **0.0178x** | **56.3x real-time** |
| **Balanced Everyday Writing** (`base`) | 141.1 MB | 61 ms | **102.2 ms** | **103.2 ms** | **0.0341x** | **29.3x real-time** |
| **Multilingual & Dialects** (`small`) | 465.0 MB | 154 ms | **303.2 ms** | **303.9 ms** | **0.1011x** | **9.9x real-time** |
| **Developer Precision** (`turbo-q5`) | 574.0 MB | 185 ms | **191.3 ms** | **194.0 ms** | **0.0638x** | **15.7x real-time** |

### End-to-End Pipeline Turnaround Breakdown
From hotkey release to text appearance in the target application (Instant Speed Profile):
```
[Key Release: Stop Dictation Requested] 
    ├── Audio Finalization & Settle:             14.3 ms
    ├── Whisper Native Inference (Metal M4):     53.3 ms
    ├── Smart Formatting & Developer Casing:      2.9 ms
    ├── Destination Revalidation & Safety Check:  4.7 ms
    └── Safe Insertion (Clipboard & ⌘V):         18.5 ms
[Text Instantly Appears in Target Application] 
    └── TOTAL END-TO-END TURNAROUND:             93.7 ms
```

### Memory & System Footprint
- **Idle CPU Usage**: `< 0.2%` CPU when listening is inactive.
- **Active Capture CPU**: `1.4%` CPU during active voice recording.
- **Base App Resident Set Size (RSS)**: ~85 MB RSS.
- **Persistent Metal Engine**: Zero buffer re-allocations across dictations. Benchmark runtime improved 7.5x (from 28s to 3.73s) by reusing pre-allocated GPU compute buffers.

---

## 11. Edge-Case Matrix & Failure Recovery

| Boundary Condition | Architectural Behavior | Automated Test Reference |
| :--- | :--- | :--- |
| **Accidental Tap (< 300ms)** | Discarded as acoustic glitch; microphone stream closes cleanly without triggering transcription. | `test_acoustic_gating_too_short` |
| **Pure Silence or Quiet Room** | Detected via RMS dB energy gate; suppressed with zero empty paste events emitted. | `test_acoustic_gating_pure_silence` |
| **Stuck-Key Watchdog (180s)** | Background timer terminates recording automatically after 180 seconds to prevent battery drain. | `test_stuck_key_watchdog_timeout` |
| **Rapid Double-Tap Hotkey** | Session state machine prevents concurrency collisions; cleans up prior capture before starting. | `test_session_lifecycle_state_machine` |
| **Target App Closed Mid-Speech** | Accessibility check detects invalid window; diverts transcript to Unplaced Recovery Vault. | `test_target_destination_safety` |
| **Concurrent User Clipboard Copy** | Captured prior clipboard content is preserved and restored asynchronously after 300ms. | `test_clipboard_preservation` |
| **Indian Accent English Vocabulary** | High-frequency pre-emphasis boost and initial prompt biasing prevent dropped syllables. | `test_tech_proper_nouns` |
| **Target Field Changed to Password** | Secure input detection halts paste; transcript routed to Recovery Vault for manual copy. | `test_secure_password_field_blocks` |

---

## 12. Automated Test Suite & Verification Evidence

VoxQuest maintains a comprehensive automated test suite verifying every layer from CoreAudio capture to accessibility injection:

```bash
# Run all unit, integration, and correctness tests (excluding long model benchmarks)
cargo test --manifest-path src-tauri/Cargo.toml --lib -- --skip benchmark

# Run the complete test suite including Metal GPU benchmarks
cargo test --manifest-path src-tauri/Cargo.toml --lib

# Verify TypeScript frontend type integrity
pnpm tsc --noEmit
```

### Verified Test Ledger
- **Total Automated Rust Unit & Integration Tests**: 97 Passing (0 Failures)
- **TypeScript Static Compilation**: 0 Errors
- **Traceability Baseline**:
  - `formatter::tests::test_developer_code_syntax`: **PASSED**
  - `formatter::tests::test_developer_terminal_formatting`: **PASSED**
  - `formatter::tests::test_developer_voice_casing_commands`: **PASSED**
  - `formatter::tests::test_speech_self_correction_and_repair`: **PASSED**
  - `enhancement_service::tests::test_technical_integrity_negation_preservation`: **PASSED**
  - `audio_service::tests::test_speech_reliability_clipping_detection`: **PASSED**
  - `prompt_service::tests::test_prompt_architect_mode_formatting`: **PASSED**
  - `smoke_tests::test_live_whisper_known_speech_audio`: **PASSED**
  - `correctness_verification_tests::test_clipboard_preservation_deterministic_logic`: **PASSED**
  - `correctness_verification_tests::test_technical_jargon_detection_and_adaptive_profiling`: **PASSED**

---

## 13. Getting Started & Development Guide

### Prerequisites
- macOS 14 (Sonoma) or macOS 15+ (Sequoia) running on Apple Silicon (M1/M2/M3/M4).
- Xcode Command Line Tools: `xcode-select --install`
- Node.js (v20+) and `pnpm`: `npm install -g pnpm`
- Rust (v1.85+): `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`

### Setup & Development Run
```bash
# Clone the repository
git clone https://github.com/voxquest/voxquest.git
cd voxquest

# Install frontend dependencies
pnpm install

# Launch in native desktop development mode
pnpm tauri dev
```

### System Permissions (Required for System-Wide Typing)
On first launch, macOS will request two standard system permissions:
1. **Microphone**: Required to capture audio input through native CoreAudio.
2. **Accessibility**: Required to inspect the active text field and inject text via simulated keystrokes. Enable VoxQuest in `System Settings -> Privacy & Security -> Accessibility`.

### Hotkey & Activation Configuration
- **Default Global Hotkey**: `Cmd+K` (configurable in Settings).
- **Hold to Talk (Push-to-Talk)**: Hold `Cmd+K` while speaking; release to instantly paste into your active app.
- **Tap to Toggle (Hands-Free)**: Tap `Cmd+K` once to begin dictating hands-free; tap again or click Stop to paste.
- **Floating Pill Assistance**: Tap the floating pill or click **Summon Pill** from the Home canvas to position the minimal floating capsule anywhere on your screen.

---

### License
VoxQuest is released under the MIT Open Source License. Built with sovereign privacy, zero cloud lock-in, and uncompromising precision for technical creators.
