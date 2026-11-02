# VoxQuest — Wispr Flow Audio Visualizer & Dynamic UI Update

This document details the architectural and interface additions implemented to deliver the real-time audio waveform effect, dynamic floating assistance, and the Wispr Flow-inspired Insights interface.

---

## 1. Dynamic Audio Waveform Effect (Wispr Flow Capsule)

### Architecture
- **In-Process Audio RMS Stream (`src-tauri/src/audio_service.rs`)**:
  - The CPAL native microphone capture loop calculates real-time Root Mean Square (RMS) volume on raw audio buffers with zero copy:
    $$\text{RMS} = \sqrt{\frac{1}{N} \sum_{i=1}^N x_i^2}$$
  - The level is atomically tracked (`AtomicU32` float bits) without holding locks against the inference thread.
- **Microphone Stream Event Bus (`src-tauri/src/commands.rs`)**:
  - While recording is active, an asynchronous 35ms (~30 Hz) ticker pushes lightweight `audio-level` events via Tauri IPC.
  - The ticker automatically halts the millisecond recording finishes, preventing unnecessary polling or event loop saturation.
- **Acoustic Waveform Visualizer (`src/components/AudioWaveform.tsx`)**:
  - Renders 11 symmetric vertical bars with rounded pill caps matching the Wispr Flow design.
  - Uses Gaussian bell-curve spatial weighting:
    $$W = [0.30, 0.45, 0.68, 0.88, 0.98, 1.00, 0.98, 0.88, 0.68, 0.45, 0.30]$$
  - Utilizes `requestAnimationFrame` and linear interpolation (`lerp`) to dynamically modulate bar heights based on the speaker's live vocal volume and natural voice cadence.

---

## 2. Floating Assistance: "Available Only When Called" & Movable

### Architecture & Window Lifecycle
- **Visible on Launch (`src-tauri/src/lib.rs`)**:
  - The `floating-indicator` window is initialized with `.visible(true)` and centered at screen bottom (`440px × 60px`).
  - Stays persistently accessible, with a "Summon Pill" button in the main application header to recenter it at any time.
- **Retained Heritage Features (`src/components/FloatingPill.tsx`)**:
  - **Mascot Preserved**: The iconic animated VoxQuest mascot bounces during recording and sits on the left of the pill.
  - **Live Transcript & Target Preview**: Users can see their recognized words or target destination (`Typing into TextEdit`) directly on the pill.
  - **Wispr Flow Real-Time Audio Visualizer**: 9-bar symmetric liquid audio waveform integrated into the capsule, dancing dynamically to microphone acoustic levels.
  - **Tactile Controls**: Record/stop toggle, cancel (`X`), recovery retry (`RotateCcw`), and 1-click clipboard copy.
- **Freely Movable on Screen**:
  - Equipped with `data-tauri-drag-region cursor-grab active:cursor-grabbing`.
  - The user can drag and drop the capsule to any convenient place on their screen.

---

## 3. Real-Time Insights & Analytics Dashboard

### Features (`src/components/InsightsTab.tsx`)
Inspired by Wispr Flow's analytics interface:
- **Average Dictation Speed (WPM)**:
  - Dynamically calculated from SQLite history duration and word count.
  - Displays speed multiplier compared to standard 40 WPM manual keyboard typing.
- **Total Words Dictated**:
  - Aggregated live from all past sessions.

---

## 4. Multi-Modal Semantic Enhancement Pipeline

### Architecture & Root Cause Fix
- **Root Cause of Previous Click & Display Defect**:
  - The previous "Polish" and "Supercharge Prompt" actions immediately triggered simulated keystrokes (`simulate_cmd_v()`) and activated external windows without explicit user review.
  - The Enhance action was hidden behind an AI prompt heuristic (`isPrompt`) in the floating pill and was completely absent in History and Recovery views.
  - In `src/lib/ipc.ts`, the mock fallback was appending generic prompt checklists (`Requirements: Provide clean robust implementation...`) instead of enhancing user text.
- **Dedicated Backend Enhancement Engine (`src-tauri/src/enhancement_service.rs`)**:
  - Fully decoupled from audio transcription and clipboard pasting.
  - Implements 4 distinct enhancement modes:
    1. **Improve Clarity** (Default): Fixes grammar, punctuation, capitalization, awkward phrasing ("giving error" -> "returning an error", "check this code" -> "review this code"), and clause boundaries.
    2. **Professional**: Elevates tone for workplace emails and formal correspondence, expands colloquial contractions, and standardizes polite requests.
    3. **Concise**: Eliminates wordy conversational filler ("just wanted to let you know that", "in order to" -> "to", "due to the fact that" -> "because") without dropping critical technical context.
    4. **Keep Tone**: Cleans mechanics and spacing while deliberately preserving the speaker's authentic informal cadence.
  - **Token Shielding**: Protects code backticks, URLs, emails, file paths, numbers, dates, and active Personal Dictionary vocabulary before running text transformations.
- **Interactive Review Card (`src/components/EnhanceReviewCard.tsx`)**:
  - Side-by-side / stacked comparison of Original vs. Enhanced draft with highlight badge.
  - Explanations list documenting all applied grammatical and structural improvements.
  - Explicit user actions: **Accept & Save**, **Insert into Cursor**, **Copy**, and **Restore Original**.
  - Integrated across **HomeTab**, **HistoryTab** (each entry + pending recovery), and **FloatingPill**.

- **Time Saved**:
  - Measures total hours/minutes saved by voice typing over manual typing.
- **Daily Streak**:
  - Consecutive active usage days calculated from transaction timestamps.
- **Desktop Application Usage Breakdown**:
  - Real-time progress bars showing percentage of dictation per target application (TextEdit, Chrome, Slack, Notes, etc.).
- **Quick Test Voice Launcher**:
  - Direct 1-click test button to preview microphone capture and the dynamic waveform.

---

## 4. Comprehensive Audit Progress & Current Verification

### Completed Engineering Milestones
- **Comprehensive Product & Code Audit**: Completed Phases 1–11 covering target preservation, push-to-talk lifecycle, memory efficiency, and Wispr Flow parity.
- **Metal GPU Hardware Acceleration**: Fully active on Apple Silicon M4 (`whisper-rs/metal`), reducing transcription latency by >75% (5.0s speech transcribes in ~138ms on Fast, ~310ms on Balanced).
- **Acoustic Noise Filtering**: 85 Hz Biquad High-Pass Filter and VAD pause soft-gating (-16 dB) to reject low-frequency room rumble and background noise without digital gain distortion.
- **Truthful Personal Dictionary & Learning Pipeline**:
  - Word-boundary aware vocabulary replacement.
  - Conservative LCS token diff to extract candidate rules when users edit transcripts in History or Recovery.
  - Deduplicated metrics: `recognition_count`, `application_count`, `correction_count`, `last_used_at`.
  - Export Dictionary as JSON.
- **Mock Data Elimination**:
  - Stripped all hardcoded numbers (e.g. `267 WPM`, fake speed multipliers).
  - Fresh installations display authentic zero states (`-- WPM`, `0 words`, `0 days`).
- **Tactile UI Consistency**: Redesigned diagnostic outputs into `100% Offline / Zero Cloud` tactile cards matching the brand design tokens.

### Current Test Suite & Build Status
- **Cargo Test Suite**: **42 unit, pipeline, and benchmark tests passing in 1.56s** on Apple M4 (`cargo test -- --test-threads=1`).
- **TypeScript & Vite Build**: **Compiled clean in 447ms** with 2,061 modules transformed and zero type errors.
- **Development Mode**: Relaunched and actively running via `pnpm tauri dev` with global hotkey active.
- **Audit Documentation Artifacts Generated**:
  - `AUDIT_SUMMARY.md`
  - `FEATURE_PARITY.md`
  - `EDGE_CASE_MATRIX.md`
  - `PERFORMANCE_AUDIT.md`
  - `NEGATIVE_FEEDBACK_RESEARCH.md`
  - `REMAINING_ROADMAP.md`

