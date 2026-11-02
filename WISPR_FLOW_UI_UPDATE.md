# VoxQuest — On-Demand Auto-Hiding Pill & Software Palette Update

## Summary of Changes

### 1. Reliable Shortcut Summoning & On-Demand Lifecycle
- **Fixed Hotkey Lockup**: Resolved an issue in [`src-tauri/src/lib.rs`](file:///Users/pavankumars/Downloads/wispr%20flow%202%20model/src-tauri/src/lib.rs) where missed release events permanently locked the global hotkey.
- **On-Demand Auto-Disappear**:
  - The floating pill now launches hidden (`visible: false`).
  - Summoning via global shortcut (`⌘ ⇧ Space`) or the sidebar *"Summon Pill"* button immediately reveals the pill window (`show()`) and starts dictation.
  - Upon task completion, the pill displays the checkmark and **automatically hides after 1.5 seconds**, keeping your screen uncluttered until summoned again.

---

### 2. Pill Matching Software Color Palette
- **Software Theme Colors**:
  - Body: Soft tactile cream (`#FAF8F5`) matching VoxQuest main window.
  - Border: Dark teal (`#1E3A34`) with tactile shadow.
  - Equalizer Waveform: Deep dark teal (`#1E3A34`) at rest/transcribing, signature terracotta (`#E07A5F`) during active voice recording.
  - Action Controls: Dark teal (`#1E3A34`) and terracotta (`#E07A5F`).

---

### 3. Minimalist Pill UI with Copy & Retry Buttons
- **Clean UI Without Verbose Text**: Removed all multi-line instruction paragraphs and labels.
- **Essential Fast Actions**:
  - Live animated audio equalizer responding to voice pitch and volume fluctuations.
  - Main Mic / Stop toggle.
  - Dedicated **Copy Button** to copy the recognized transcript with 1 click.
  - Dedicated **Retry Button** to insert or recover into any newly active field.

---

### 4. Complete Purge of Mock/Fake Data
- **Clean Initial State**:
  - Stripped all hardcoded numbers (`142 WPM`, `2,100 words`, `14 day streak`, `34,000 fixes`, `6,594 AI Prompts`).
  - Fresh installations now start with authentic zero state (`0 words`, `-- WPM`, `0 days`).
  - Desktop app usage and activity heatmap now reflect real SQLite records in real time.
- **Emoji Removal**: Stripped all decorative emojis (`⭐️`, `🏅`, `🔥`) across cards and dashboards.
