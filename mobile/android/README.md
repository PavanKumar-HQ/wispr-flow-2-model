# VoxQuest Android Mobile Architecture & Trigger Specification

This module implements the **mobile trigger mechanism** for Android devices, solving the physical hotkey challenge present on laptops.

---

## 1. The Mobile Challenge vs Desktop Hotkeys
On laptops (macOS/Windows/Linux), voice dictation triggers when pressing a physical shortcut (e.g. `Fn` or `Cmd+Shift+Space`).
On mobile smartphones, there are no physical keyboards. Mobile assistants must provide **instant, system-wide activation** without requiring users to switch applications.

---

## 2. The 3 Mobile Trigger Implementations

### A. Floating Omnipresent Bubble (`SYSTEM_ALERT_WINDOW` + `AccessibilityService`)
- **How It Works**:
  1. A lightweight floating pill docks to the left or right screen edge.
  2. Single-tap or press-and-hold to dictate anywhere (WhatsApp, Slack, Gmail, Telegram, Twitter, Notes).
  3. Transcribes speech locally via on-device quantized Whisper (ONNX Mobile / Hexagon DSP).
  4. Calls `AccessibilityNodeInfo.ACTION_SET_TEXT` to automatically type formatted text directly into the focused cursor field without modifying system clipboard.

### B. Custom Voice Keyboard (`InputMethodService`)
- **How It Works**:
  1. Integrates into the system keyboard selector.
  2. Adds a dedicated 1-touch VoxQuest microphone bar directly above the soft keyboard.
  3. Directly injects text via `InputConnection.commitText()`.
  4. Requires **zero overlay permissions**.

### C. Hardware Key Remapping (`AccessibilityService.onKeyEvent`)
- **How It Works**:
  1. Intercepts hardware button double-clicks (e.g., Double-Press Volume Down).
  2. Activates dictation with screen off or without touching the screen.
  3. Provides a true tactile, eyes-free experience.

### D. Quick Settings Tile (`TileService`)
- Quick pull-down tile in the Android notification shade for 1-tap activation.

---

## 3. Privacy & Offline Guarantees
- 100% on-device speech processing.
- Zero audio data transmitted over the internet (unlike Wispr Flow which streams all mobile audio to cloud servers).
- Fully air-gapped and GDPR/HIPAA compliant.
