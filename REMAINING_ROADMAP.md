# VoxQuest — Prioritized Product & Engineering Roadmap

**Updated**: November 2, 2026  
**Auditor**: DeepMind Advanced Agentic Coding Pair Programmer  
**Priority Hierarchy**: Correctness & Reliability > Accuracy & Speed > Personalization > Workflow Expansion

---

## Tier 1: Core Foundation & Audit Verified (Completed Baseline)

- [x] **Universal Text Insertion**: Native `simulate_cmd_v` via CoreGraphics HID tap with pre-paste clipboard preservation and 300ms async restoration. *(Verified in Safari, Brave, Chrome, TextEdit, Slack)*
- [x] **Zero Data Loss on Target Switch**: Destination anchor snapshot preserves original target application even during app-switching while dictating. *(Verified)*
- [x] **Secure Input Protection**: Automatic block on `AXSecureTextField` password fields with preservation in Vault. *(Verified)*
- [x] **Empty String AX Protection**: Destination edit sync ignores empty accessibility returns, preventing transcript wiping. *(Verified)*
- [x] **Apple Silicon Metal Acceleration**: Metal GPU acceleration on M-series chips; 53ms median warm latency for tiny, 102ms for base. *(Verified)*
- [x] **Acoustic Gating**: Noise floor suppression (<0.0025 RMS) and short buffer rejection (<200ms). *(Verified)*
- [x] **Hallucination & Subtitle Cleaner**: Automatic stripping of `[BLANK_AUDIO]`, `(music)`, `thanks for watching`, and movie subtitle dataset artifacts. *(Verified)*
- [x] **Bidirectional Edit Sync**: Direct edits made in destination apps sync back to the existing transcript record and generate vocabulary candidates. *(Verified)*
- [x] **1-Click AI Prompt & Clarity Enhancement**: Intelligent routing between prompt elevation and grammar cleanup with in-place destination replacement. *(Verified)*
- [x] **Clutter-Free, Mobile-Optimized Modern UI**: Streamlined 5-icon action toolbars, GitHub-grade activity contribution heatmap, wrapped category pills, and removal of all developer jargon. *(Verified)*

---

## Tier 2: Immediate High-Impact Features (Next Development Cycle)

### 1. Snippets & Trigger-Word Macro Expansion (Priority: Highest)
- **Problem**: Users frequently dictate repetitive links, calendly URLs, email addresses, or boilerplate messages.
- **Solution**: Expand trigger phrases (e.g., saying *"insert my zoom"* expands to `https://zoom.us/j/123456789`) in the `formatter.rs` pipeline before insertion.
- **Implementation**: Stored in a lightweight SQLite table `snippets(trigger TEXT, expansion TEXT)`. Evaluated in linear time during text formatting.
- **Impact**: Enormous daily time savings for professional workflows.

### 2. Context-Aware / App-Specific Vocabulary Rules (Priority: High)
- **Problem**: Technical jargon (e.g., `async/await`, `kubectl`, `useEffect`) should only be prioritized when typing into coding apps (VS Code, Cursor, Terminal), not personal messaging apps.
- **Solution**: Bind vocabulary entries to target application bundle IDs (e.g., `com.microsoft.VSCode`, `com.apple.Terminal`).
- **Implementation**: Filter active dictionary rules against `target_anchor.bundle_id`.
- **Impact**: Eliminates false vocabulary substitutions in conversational contexts.

### 3. Dynamic Whisper Initial Prompt Biasing (Priority: High)
- **Problem**: Whisper speech recognition can mishear rare names or acronyms on the acoustic level before formatting.
- **Solution**: Inject up to 50 active personal vocabulary words directly into `whisper_full_params.initial_prompt`.
- **Implementation**: Feed domain-specific vocabulary into Whisper's conditioning context before audio decoding.
- **Impact**: Drastically reduces acoustic word error rate (WER) for personal names and company brands.

---

## Tier 3: Quality-of-Life & Resource Management

### 1. Idle Model RAM Unload Policy
- **Problem**: On memory-constrained 8GB MacBooks, keeping Whisper in RAM during long dormant periods consumes ~150MB–500MB memory.
- **Solution**: Configurable auto-unload timer (e.g., unload model from Metal memory after 15 minutes of inactivity, re-instantiating in <150ms on shortcut press).
- **Implementation**: `tokio::time::sleep` watchdog in `AppState` calling `whisper_service.unload_model()`.

### 2. Streaming Transcription Visualization
- **Problem**: During longer dictations (>10 seconds), users appreciate interim visual feedback of partial words appearing.
- **Solution**: Partial chunk decoding (500ms sliding window) piped to the Floating Pill.

### 3. Quick Dictation Scratchpad
- **Problem**: Users sometimes want to draft thoughts or essays without opening a dedicated destination editor.
- **Solution**: A built-in quick notes drawer accessible directly from the VoxQuest home screen.

---

## Tier 4: Explicitly Excluded Features

- **Cloud Audio Processing / Telemetry Sync**: **Permanently Excluded**. Violates VoxQuest's foundational sovereign on-device privacy guarantee.
- **System Agentic Automation (Clicking UI buttons, controlling apps)**: **Excluded**. VoxQuest is a high-speed, secure input method, not an OS automation agent.
