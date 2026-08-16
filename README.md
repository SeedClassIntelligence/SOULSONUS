# SoulSonus Master Studio — Canonical Repository

<div align="center">
  <h3>✦ THE HUMAN FIRST INSTRUMENT PLATFORM ✦</h3>
  <p><strong>Professional Multitrack DAW • Autonomous Co-Producer Intelligence • Open-Source Transformation Engines</strong></p>
</div>

---

## 🌟 Overview & Architecture Philosophy

**SoulSonus** is a creator-first Digital Audio Workstation (DAW) and generative co-production studio built on a single governing rule:

> **Creator intent defines the transformation boundary. SoulSonus owns the workflow and governance. Open-source models only execute authorized capabilities.**

### Core Tenets:
1. **Single Permanent Multitrack Canvas**: No disjointed secondary AI windows or separate DAWs. The entire musical lifecycle (Oral/Keys/Audio Capture, Note Editing, Stem Decomposition, Remixing, Vocal Booth, Mixing, Broadcast Mastering) lives on one continuous multitrack timeline.
2. **High-Resolution Note Event Single Source of Truth**: All tracks use 480 PPQ `NoteEvent` models for sample-accurate pitch, micro-timing, duration envelopes, velocity stalks, and inline syllable lyrics.
3. **Deterministic Invariant Governance**: Generative AI models never dictate tempo or groove. SoulSonus enforces exact timing tolerances (e.g. $\Delta t \le 6\text{ms}$ for drums, $\pm 12\text{ms}$ for bass) and rejects candidates that drift.
4. **4-Layer Vocal Architecture**: Human performance phrasing is strictly separated from delivery character aesthetics (10 palettes), governed voice identities (with E16 consent proofs), and real-time DSP tuning.
5. **Cryptographic Provenance**: Every take, realization candidate, and commit generates an immutable SHA-256 `SeedSignature` audit record.

---

## 🎛️ 6-Room Canonical Studio Topology

SoulSonus operates across six dedicated workspaces, all sharing the same persistent multitrack state:

```
┌──────────────┐     ┌──────────────┐     ┌────────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  1. CREATE   │ ──► │   2. BUILD   │ ──► │ 3. WRITE/RECORD│ ──► │    4. MIX    │ ──► │  5. MASTER   │ ──► │  6. RELEASE  │
│ Acoustic     │     │ Multi-Bar    │     │ 4-Layer Vocal  │     │ 32-Ch Console│     │ -14.0 LUFS   │     │ 24/48 WAV    │
│ Performance  │     │ Arrangement  │     │ Take Stacks &  │     │ Faders & DSP │     │ True Peak    │     │ Lossless FLAC│
│ Capture      │     │ Structure    │     │ Comp Builder   │     │ Sub-Buses    │     │ Limiter      │     │ Manifest     │
└──────────────┘     └──────────────┘     └────────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
```

---

## ⚡ Key Capabilities Built

### 1. `AUDIO-001` — Intelligent Ingestion & Two-Level Stem Decomposition
- **Multi-Format Ingestion**: Drag & drop `.wav`, `.mp3`, `.flac`, `.aif`, and `.m4a` files with instantaneous deterministic acoustic analysis (True BPM, Key/Scale, Meter, Transient count, SHA-256 lineage).
- **Two-Level Decomposition**:
  - **Quick 4-Stem**: Broad separation (`Drums`, `Bass`, `Vocals`, `Music`) via Meta Demucs v4 (E06).
  - **Deep 12-Class Extract**: Targeted extraction (`Strings`, `Brass`, `Keys`, `Guitar`, `Percussion`, `Synth`, `Backing Vocals`, `FX`) via ACE Extract (E06).
- **`[POPULATE DAW TRACKS]`**: Converts separated audio stems directly into normal, editable multitrack lanes on the timeline.

### 2. `AUDIO-002` — Remix & Recompose with Role-Specific Invariant Locks
- **Transformation Modes**:
  - **`REMIX (TIMBRE)`**: Preserves composition, melody, and chords; transforms sonic textures, sound design, and genre.
  - **`RECOMPOSE (HARMONY)`**: Preserves tempo and groove pocket; re-harmonizes chord progressions and arranges counter-melodies.
  - **`BUILD ON VOCAL`**: Composes contextual backing accompaniment around a raw acapella vocal track.
- **Creator Invariant Locks**:
  - Locked Exact BPM (e.g. `94.00 BPM`).
  - Locked Groove with dynamic tolerances ($\pm 6\text{ms}$ drums, $\pm 12\text{ms}$ bass, $\pm 25\text{ms}$ keys).
  - Locked Chords, Melody, Vocal phrasing, and Arrangement skeleton.

### 3. `VOCAL-001` — 4-Layer Vocal Suite & Governed Identity
- **Layer 1: Performance**: Phrasing, micro-timing, syllable cadence, take stacks (Takes 01..04), and comp builder.
- **Layer 2: Vocal Character**: 10 acoustic delivery aesthetics (`Warm`, `Airy`, `Raspy`, `Intimate`, `Powerful`, `Breathy`, `Falsetto`, `Gritty`, `Smooth`, `Choir/Stack`).
- **Layer 3: Voice Identity**: Governed session vocalist models with **E16 Rights Governance Consent Proof IDs** (e.g. `#PROOF_LIC_BARI_88`).
- **Layer 4: Vocal DSP**: Real-time formant shifting ($-12\dots+12\text{st}$), diatonic scale snapping, 1176 FET compressor, and plate reverb.
- **Songwriting Influence Ledger**: Records narrative perspective, rhyme density $\%$, and melodic cadence independently of voice replica rights.

### 4. Studio Intelligence & Native Brain Workstation
- **Multi-Role Co-Producer**: Switch effortlessly across **Producer**, **Engineer**, **Tutor**, **Guide**, and **Manager** emphases.
- **Master Bus & Acoustic Hub**: Integrated volume fader, -14.0 LUFS target, -1.0 dBFS True Peak ceiling, and studio limiter.
- **Native Brain**: 100% private, on-device offline reasoning sandbox with local provider configuration (Ollama, Gemini, OpenAI) and live latency handshake testing.

### 5. Interactive Aspect-by-Aspect Studio Tour
- **`[🎯 STUDIO TOUR]`**: Built-in 10-aspect guided walkthrough accessible anytime from the global header or studio utilities bar.

---

## 🛠️ Canonical Engine Registry (E01–E16)

| Code | Canonical Engine Identity | Primary Implementation Backend |
|---|---|---|
| **E01** | Natural Language Command Parser | Semantic Regex / NLP Intent Extractor |
| **E02** | Production Intent & Planning | Strategy Planner / Operation Planner |
| **E03** | Audio Transcription Engine | Spotify Basic Pitch ONNX + Autocorrelation Pitch |
| **E04** | Sound Search & Retrieval | LAION CLAP 512-dim Cosine Embedding Matcher |
| **E05** | Music Realization & Performance | ACE-Step 1.5 Audio Diffusion Transformer (DiT) |
| **E06** | Stem Separation & Slicing | Meta Demucs v4 + ACE Deep 12-Class Extract |
| **E07** | Instrument SoundFont Engine | SpessaSynth GM SF2/SFZ Multi-Sample Engine |
| **E08** | Songwriting & Lyric Cadence | 16th-Note Syllable Meter & Rhyme Scheme Engine |
| **E09** | Voice Identity & Singing Synth | Formant Vocoder + Harmonic Glottal Oscillator |
| **E10** | Multi-Bus Console & Mix Router | Web Audio API 32-Channel Mixing Matrix |
| **E11** | Vocal DSP & Tuning Chain | Pitch Quantizer, Linear Phase EQ, 1176 FET Comp |
| **E12** | Broadcast Mastering Telemetry | ITU-R BS.1770-4 K-Weighted LUFS & True Peak Meter |
| **E13** | Creator Music Signature™ Studio | 7-Pillar Acoustic Profiler (Drums, Register, Swg) |
| **E14** | SeedSignature Provenance Ledger | SHA-256 Merkle Provenance Ledger & Audit Stack |
| **E15** | Collaboration & Session Presence | Real-time Multi-User Sync & Split Sheet Contract |
| **E16** | Rights Governance & Finalization | Consent Proof Tokens & Multi-Format Release Gate |

---

## 🚀 Getting Started

### Prerequisites:
- **Node.js**: `v18.0.0` or higher
- **npm** or **bun**
- **Python 3.10+** (for the 9-stage qualification suite)

### Installation:
```bash
# Clone the repository
git clone https://github.com/SeedClassIntelligence/SOULSONUS.git
cd SOULSONUS

# Install dependencies
npm install

# Start local dev server
npm run dev
```

### Production Build & Typecheck:
```bash
# TypeScript verification
npx tsc --noEmit

# Build production bundle
npm run build
```

### Run 9-Stage Qualification Test Suite:
```bash
python scripts/e2e_qualification_suite.py
```

---

## 📜 License & Rights Governance
© 2026 SoulSonus. All rights reserved. Created under the **Human First Instrument** doctrine and E16 Consent Verification standards.
