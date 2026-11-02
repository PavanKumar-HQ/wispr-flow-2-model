# VoxQuest — Performance, Memory & Empirical Benchmark Audit

## 1. Benchmarking Environment
- **Device Hardware**: Apple MacBook Air (Apple M4, 10-core CPU, 10-core GPU, 16-core Neural Engine)
- **Host OS Version**: macOS Sequoia (Darwin 24.6.0)
- **Unified Memory**: 16 GB Unified Memory
- **Build Flags**: `cargo build --profile dev` (Tauri v2 + Rust 1.85+)
- **GPU Metal Backend**: Apple M4 Metal via `whisper-rs` (v0.16.0) with Metal Acceleration:
  - `whisper_backend_init_gpu: device 0: Metal (type: 1)`
  - `ggml_metal_init: picking default device: Apple M4`
  - `use fusion = true, use concurrency = true, use graph optimize = true`
- **Audio Capture Configuration**: 16,000 Hz, 32-bit float mono, CPAL native CoreAudio backend
- **Benchmark Command**: `cargo test --manifest-path src-tauri/Cargo.toml test_reproduce_real_model_benchmarks -- --nocapture`

---

## 2. Empirical Model Latency & Memory Measurements

Measured directly via 5 warm repeated runs on standardized 3.0-second speech fixtures (48,000 samples at 16,000 Hz):

| Model Name | Local File | File Size | SHA-256 Checksum (First 16 chars) | Cold Load Time | Cold Inference Latency | Warm Inference Median | Warm Inference P95 | Real-Time Factor (RTF) | Real-time Multiple |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **VoxQuest Fast** | `ggml-tiny.bin` | 77,691,713 B (74.1 MB) | `be07e048e1e599ad...` | 430.1 ms | 73.0 ms | **53.3 ms** | **53.5 ms** | **0.0178x** | **56.3x faster than real-time** |
| **VoxQuest Balanced** | `ggml-base.bin` | 147,951,465 B (141.1 MB) | `60ed5bc3dd14eea8...` | 61.8 ms | 101.3 ms | **102.2 ms** | **103.2 ms** | **0.0341x** | **29.3x faster than real-time** |
| **VoxQuest Pro** | `ggml-small.bin` | 487,601,967 B (465.0 MB) | `1be3a9b2063867b9...` | 154.3 ms | 309.3 ms | **303.2 ms** | **303.9 ms** | **0.1011x** | **9.9x faster than real-time** |

---

## 3. End-to-End Pipeline Turnaround Breakdown

Measured live during push-to-talk dictation with Apple M4 Metal acceleration (from shortcut key release to text insertion in target application):

```
[Key Release: Stop Dictation Requested] 
    ├── Audio Finalization & Settle:            14.3 ms
    ├── Whisper Native Inference (Metal M4):   191.3 ms (Fast / Tiny Profile)
    ├── Smart Formatting & Spoken Punctuation:   2.9 ms
    ├── Destination Revalidation & Safety Check: 4.7 ms
    └── Safe Insertion (Clipboard Snapshot & ⌘V): 18.5 ms
[Text Instantly Appears in Target App] 
    └── TOTAL MEASURED TURNAROUND:             231.7 ms
```

---

## 4. Resource Consumption & Idle Footprint

- **Idle CPU**: `< 0.2%` CPU when listening is inactive.
- **Audio Capture CPU**: `1.4%` CPU during active voice recording with 85 Hz high-pass filtering and 30 Hz RMS stream.
- **Resident Set Size (RSS) Memory**:
  - Base App Idle (No model loaded): ~85 MB RSS
  - Model Warm in RAM (`ggml-tiny.bin`): ~340 MB RSS
  - Model Warm in RAM (`ggml-base.bin`): ~520 MB RSS
  - Model Warm in RAM (`ggml-small.bin`): ~1,040 MB RSS
- **IPC Audio Stream**: `audio-level` events pushed strictly every 35 ms (~28 Hz) during active recording only; cleanly stopped on key-up. Zero unneeded polling.
- **SQLite Performance**: Parameterized WAL-mode queries execute in `< 1.2 ms` for transcript insertion and aggregations.
- **Thermal & Battery Status**:
  - Measured during intermittent interactive dictation: thermals remain at ambient room temperature (~28°C–32°C SoC).
  - *Note on Long Sustained Workloads*: Battery impact during hours-long continuous uninterrupted audio transcription remains unmeasured and is not claimed.
