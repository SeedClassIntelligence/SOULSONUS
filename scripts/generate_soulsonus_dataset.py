#!/usr/bin/env python3
"""
SoulSonus Gold Dataset Synthesizer (generate_soulsonus_dataset.py)
Generates 2,000 high-fidelity, production-grade training pairs for the SoulSonus Execution Planner.

Architecture:
- Input: Session Context (BPM, Key, Scale, Tracks, Notes, Lineage) + Creator Intent + Tool Facts
- Output: Canonical MusicExecutionPlan (Engine-Neutral JSON Schema)

Buckets:
1. Acoustic Seed Realization & Timbre Transfer (35% -> 700 cases)
2. Scoped Inpainting & Region Repainting (25% -> 500 cases)
3. Multitrack Mixing & Frequency De-masking (25% -> 500 cases)
4. Boundary Defense & Creator Invariant Protection (15% -> 300 cases)
"""

import json
import random
import os
from typing import Dict, List, Any

TOTAL_SAMPLES = 2000

KEYS = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"]
SCALES = ["Major", "Minor", "Dorian", "Mixolydian", "Pentatonic Minor"]
GENRES = ["Trap / Hip-Hop", "Neo-Soul", "Boom-Bap", "R&B / Soul", "Afrobeats", "Electronic / House", "Cinematic"]
TICKS_PER_BAR = 1920
FOUR_BAR_TICKS = 7680

# -------------------------------------------------------------------------
# 1. TEMPLATES FOR BUCKET 1: ACOUSTIC SEED REALIZATION (35%)
# -------------------------------------------------------------------------
SEED_REALIZATION_TEMPLATES = [
    {
        "modality": "MOUTH",
        "source_instrument": "Human Beatbox Kick",
        "target_role": "808_sub_bass",
        "target_desc": "Transform vocal beatbox kick into deep analog 808 sub bass",
        "requests": [
            "Turn my beatbox kick into a heavy 808 sub, but do NOT mess up my syncopated groove or timing.",
            "Make this oral kick sound like an analog Moog 808 sub, keeping my micro-timing 100% locked.",
            "Realize this beatbox into a room-shaking 808 bass without changing my rhythm.",
            "Transfer this beatbox performance into a heavy trap 808 sub bass, lock my groove."
        ],
        "authority": "EXACT",
        "preserve": {"tempo": True, "timing": True, "groove": True, "melody": False, "pitchContour": True, "phrasing": True, "chords": True, "vocalPerformance": False, "arrangement": True},
        "mutable": {"timbre": True, "instrumentation": True, "harmony": False, "dynamics": True, "orchestration": False, "productionCharacter": True},
        "min_rhythm": 0.98,
        "min_pitch": 0.95
    },
    {
        "modality": "MOUTH",
        "source_instrument": "Human Beatbox Snare / Hi-Hat",
        "target_role": "vintage_drum_kit",
        "target_desc": "Convert vocal percussion seed into acoustic vinyl boom-bap drum kit",
        "requests": [
            "Turn my mouth snares and hats into a vintage vinyl drum break while keeping my pocket intact.",
            "Realize this oral drum performance into a live 70s funk drum kit, preserve my ghost notes.",
            "Make my beatbox sound like a studio acoustic drum kit with organic room texture.",
            "Replace this vocal drum sketch with crisp analog studio drums, lock my swing."
        ],
        "authority": "EXACT",
        "preserve": {"tempo": True, "timing": True, "groove": True, "melody": False, "pitchContour": False, "phrasing": True, "chords": True, "vocalPerformance": False, "arrangement": True},
        "mutable": {"timbre": True, "instrumentation": True, "harmony": False, "dynamics": True, "orchestration": False, "productionCharacter": True},
        "min_rhythm": 0.98,
        "min_pitch": 0.85
    },
    {
        "modality": "KEYS",
        "source_instrument": "Vocal Hum / Melody Seed",
        "target_role": "vintage_rhodes_mk1",
        "target_desc": "Transform vocal humming into warm Vintage Rhodes MK1 electric piano",
        "requests": [
            "Turn my hummed melody into a rich Vintage Rhodes MK1 with gentle stereo vibrato, keep my pitch slides.",
            "Realize this vocal hum into a smooth neo-soul Rhodes piano, do not alter my phrasing.",
            "Transform this melodic hum into electric piano chords, preserve my exact vocal expression.",
            "Make this hum sound like a 1975 Rhodes MK1 stage piano, keep my expressive timing."
        ],
        "authority": "CONSERVATIVE",
        "preserve": {"tempo": True, "timing": True, "groove": True, "melody": True, "pitchContour": True, "phrasing": True, "chords": True, "vocalPerformance": False, "arrangement": True},
        "mutable": {"timbre": True, "instrumentation": True, "harmony": True, "dynamics": True, "orchestration": False, "productionCharacter": True},
        "min_rhythm": 0.95,
        "min_pitch": 0.96
    },
    {
        "modality": "KEYS",
        "source_instrument": "Vocal Melody Seed",
        "target_role": "budapest_strings",
        "target_desc": "Transform vocal melody into lush cinematic string ensemble",
        "requests": [
            "Turn my vocal top-line into a lush cinematic string section with expressive vibrato.",
            "Realize this hummed hook into a live Budapest studio cello and violin ensemble.",
            "Make this vocal lead sound like an orchestral string quartet, preserve my melodic contour.",
            "Convert my vocal melody to a rich chamber string ensemble, follow my exact tempo and phrasing."
        ],
        "authority": "BALANCED",
        "preserve": {"tempo": True, "timing": True, "groove": True, "melody": True, "pitchContour": True, "phrasing": True, "chords": True, "vocalPerformance": False, "arrangement": True},
        "mutable": {"timbre": True, "instrumentation": True, "harmony": True, "dynamics": True, "orchestration": True, "productionCharacter": True},
        "min_rhythm": 0.92,
        "min_pitch": 0.94
    }
]

# -------------------------------------------------------------------------
# 2. TEMPLATES FOR BUCKET 2: SCOPED INPAINTING & REPAINTING (25%)
# -------------------------------------------------------------------------
INPAINTING_TEMPLATES = [
    {
        "operation": "REPAINT",
        "scope_mode": "SCOPED_REGION",
        "start_bar": 4,
        "end_bar": 4,
        "requests": [
            "Bar 4 feels empty. Inpaint an energetic vinyl drum roll into Bar 4 without touching Bars 1 to 3.",
            "Regenerate just the transition in Bar 4 with an acoustic fill, lock the rest of the track.",
            "Repaint the end of the phrase in Bar 4 with dynamic snare rolls, leave Bars 1-3 completely alone.",
            "Create a dramatic drop transition in Bar 4 only; keep Bars 1, 2, and 3 untouched."
        ],
        "authority": "BALANCED",
        "preserve": {"tempo": True, "timing": True, "groove": True, "melody": False, "pitchContour": False, "phrasing": True, "chords": True, "vocalPerformance": True, "arrangement": True},
        "mutable": {"timbre": True, "instrumentation": True, "harmony": False, "dynamics": True, "orchestration": True, "productionCharacter": True},
        "min_rhythm": 0.95,
        "min_pitch": 0.90
    },
    {
        "operation": "RECOMPOSE",
        "scope_mode": "SCOPED_REGION",
        "start_bar": 3,
        "end_bar": 4,
        "requests": [
            "Re-harmonize the chords in Bars 3 and 4 with lush jazzy 9th extensions, keep Bars 1 and 2 as they are.",
            "Add melodic movement to the piano in Bars 3-4, preserve Bars 1-2 and the vocal track.",
            "Recompose the turnaround in the second half of the loop (Bars 3-4), do not change the groove.",
            "Give me richer chord substitutions in Bars 3 and 4 while keeping the vocal melody intact."
        ],
        "authority": "BALANCED",
        "preserve": {"tempo": True, "timing": True, "groove": True, "melody": True, "pitchContour": True, "phrasing": True, "chords": False, "vocalPerformance": True, "arrangement": True},
        "mutable": {"timbre": False, "instrumentation": False, "harmony": True, "dynamics": True, "orchestration": False, "productionCharacter": True},
        "min_rhythm": 0.94,
        "min_pitch": 0.92
    },
    {
        "operation": "ADD_PART",
        "scope_mode": "LAYER_COMPANION",
        "start_bar": 1,
        "end_bar": 4,
        "requests": [
            "Add a companion sub-bassline that locks tightly into the Kick drum transients on Track 1.",
            "Generate a funky clavinet companion layer that complements the Rhodes chords without clashing.",
            "Add subtle shaker and percussion layers that follow the groove of the main drum track.",
            "Create a melodic counterpoint bassline that locks into the rhythm of the drums."
        ],
        "authority": "CONSERVATIVE",
        "preserve": {"tempo": True, "timing": True, "groove": True, "melody": True, "pitchContour": True, "phrasing": True, "chords": True, "vocalPerformance": True, "arrangement": True},
        "mutable": {"timbre": True, "instrumentation": True, "harmony": False, "dynamics": True, "orchestration": True, "productionCharacter": True},
        "min_rhythm": 0.96,
        "min_pitch": 0.94
    }
]

# -------------------------------------------------------------------------
# 3. TEMPLATES FOR BUCKET 3: MULTITRACK MIXING & FREQUENCY DE-MASKING (25%)
# -------------------------------------------------------------------------
MIXING_TEMPLATES = [
    {
        "operation": "DSP_EDIT",
        "requests": [
            "The 808 and Kick are clashing in the low end. Carve out a frequency pocket at 60Hz on the 808 and sidechain it.",
            "Clean up low-end mud between Track 1 (Kick) and Track 2 (Sub Bass); notch 65Hz on the bass.",
            "Duck the bass whenever the kick hits to give the downbeats maximum punch.",
            "Apply high-pass filtering at 30Hz on the master and carve 60Hz on the 808 for kick clarity."
        ],
        "authority": "EXACT",
        "preserve": {"tempo": True, "timing": True, "groove": True, "melody": True, "pitchContour": True, "phrasing": True, "chords": True, "vocalPerformance": True, "arrangement": True},
        "mutable": {"timbre": True, "instrumentation": False, "harmony": False, "dynamics": True, "orchestration": False, "productionCharacter": True},
        "min_rhythm": 1.0,
        "min_pitch": 1.0
    },
    {
        "operation": "DSP_EDIT",
        "requests": [
            "Warm up the vocal bus with optical compression and a lush stereo plate reverb send at -16dB.",
            "Give the lead vocals silky presence: boost 10kHz air shelf by 2dB and add smooth plate reverb.",
            "Glue the drum bus with SSL VCA compression: 4:1 ratio, 30ms attack, auto-release.",
            "Set up a stereo ping-pong delay on the lead synth with high-pass filtering at 400Hz."
        ],
        "authority": "EXACT",
        "preserve": {"tempo": True, "timing": True, "groove": True, "melody": True, "pitchContour": True, "phrasing": True, "chords": True, "vocalPerformance": True, "arrangement": True},
        "mutable": {"timbre": True, "instrumentation": False, "harmony": False, "dynamics": True, "orchestration": False, "productionCharacter": True},
        "min_rhythm": 1.0,
        "min_pitch": 1.0
    }
]

# -------------------------------------------------------------------------
# 4. TEMPLATES FOR BUCKET 4: BOUNDARY DEFENSE & CREATOR LOCKS (15%)
# -------------------------------------------------------------------------
BOUNDARY_DEFENSE_TEMPLATES = [
    {
        "operation": "REALIZE",
        "requests": [
            "Make the whole beat sound modern, but DO NOT touch my vocal take or change my drum groove.",
            "Re-voice the instrumentation but keep my original performance timing 100% locked.",
            "Explore new synth layers, but Track 1 and Track 2 are locked; do not overwrite them.",
            "Add energy to the track, but preserve my vocal phrasing and rhythm without any quantizing."
        ],
        "authority": "EXACT",
        "preserve": {"tempo": True, "timing": True, "groove": True, "melody": True, "pitchContour": True, "phrasing": True, "chords": True, "vocalPerformance": True, "arrangement": True},
        "mutable": {"timbre": True, "instrumentation": True, "harmony": False, "dynamics": True, "orchestration": True, "productionCharacter": True},
        "min_rhythm": 0.99,
        "min_pitch": 0.98
    }
]

def generate_random_tracks() -> List[Dict[str, Any]]:
    instruments = [
        {"name": "Kick Drum", "inst": "Acoustic / 808 Kick", "vol": 0.0},
        {"name": "Snare & Rim", "inst": "Vintage Snare", "vol": -2.0},
        {"name": "Hi-Hats", "inst": "Closed / Open Hats", "vol": -4.5},
        {"name": "Sub Bass", "inst": "Moog Analog Sub", "vol": -1.0},
        {"name": "Rhodes MK1", "inst": "Vintage Rhodes", "vol": -3.0},
        {"name": "Lead Vocal", "inst": "Human Vocal Take", "vol": 0.5},
        {"name": "Strings", "inst": "Budapest Strings", "vol": -6.0}
    ]
    selected = random.sample(instruments, k=random.randint(3, 6))
    tracks = []
    for i, item in enumerate(selected):
        tracks.append({
            "id": f"t_{i+1}",
            "name": item["name"],
            "instrument": item["inst"],
            "volumeDb": item["vol"],
            "locked": random.choice([True, False]) if i > 0 else False,
            "mute": False,
            "solo": False
        })
    return tracks

def build_sample(bucket: int, index: int) -> Dict[str, Any]:
    bpm = random.randint(72, 140)
    key = random.choice(KEYS)
    scale = random.choice(SCALES)
    genre = random.choice(GENRES)
    tracks = generate_random_tracks()
    focus_track = tracks[0]

    if bucket == 1:
        tmpl = random.choice(SEED_REALIZATION_TEMPLATES)
        req = random.choice(tmpl["requests"])
        plan = {
            "intent": {
                "description": tmpl["target_desc"],
                "musicalRole": tmpl["target_role"],
                "targetGenreStyle": genre
            },
            "target": {
                "trackId": focus_track["id"],
                "trackName": focus_track["name"]
            },
            "timeScope": {
                "mode": "GLOBAL_TRACK",
                "startTick": 0,
                "endTick": FOUR_BAR_TICKS
            },
            "operation": "REALIZE",
            "preserve": tmpl["preserve"],
            "mutable": tmpl["mutable"],
            "creativeAuthority": tmpl["authority"],
            "candidatePolicy": { "variationCount": 4 },
            "verificationPolicy": {
                "minRhythmPreservation": tmpl["min_rhythm"],
                "minPitchAdherence": tmpl["min_pitch"],
                "minDynamicCrest": 0.85
            }
        }
        tool_facts = {
            "transientPeakCount": random.randint(12, 32),
            "dominantFrequenciesHz": [random.randint(45, 90), random.randint(150, 400)],
            "rhythmSyncopationScore": round(random.uniform(0.88, 0.98), 2)
        }

    elif bucket == 2:
        tmpl = random.choice(INPAINTING_TEMPLATES)
        req = random.choice(tmpl["requests"])
        start_tick = (tmpl["start_bar"] - 1) * TICKS_PER_BAR
        end_tick = tmpl["end_bar"] * TICKS_PER_BAR
        plan = {
            "intent": {
                "description": f"Scoped inpainting execution for Bars {tmpl['start_bar']}-{tmpl['end_bar']}",
                "musicalRole": focus_track["instrument"],
                "targetGenreStyle": genre
            },
            "target": {
                "trackId": focus_track["id"],
                "trackName": focus_track["name"]
            },
            "timeScope": {
                "mode": tmpl["scope_mode"],
                "startTick": start_tick,
                "endTick": end_tick,
                "lockToTransientsTrackId": "t_1" if tmpl["scope_mode"] == "LAYER_COMPANION" else None
            },
            "operation": tmpl["operation"],
            "preserve": tmpl["preserve"],
            "mutable": tmpl["mutable"],
            "creativeAuthority": tmpl["authority"],
            "candidatePolicy": { "variationCount": 4 },
            "verificationPolicy": {
                "minRhythmPreservation": tmpl["min_rhythm"],
                "minPitchAdherence": tmpl["min_pitch"],
                "minDynamicCrest": 0.85
            }
        }
        tool_facts = {
            "scopedBarRange": f"Bar {tmpl['start_bar']} - Bar {tmpl['end_bar']}",
            "boundaryTicks": [start_tick, end_tick],
            "crossfadeLengthMs": 10
        }

    elif bucket == 3:
        tmpl = random.choice(MIXING_TEMPLATES)
        req = random.choice(tmpl["requests"])
        plan = {
            "intent": {
                "description": "Multitrack DSP balance and frequency de-masking",
                "musicalRole": "mix_bus_dsp",
                "targetGenreStyle": genre
            },
            "target": {
                "trackId": focus_track["id"],
                "trackName": focus_track["name"]
            },
            "timeScope": {
                "mode": "GLOBAL_TRACK",
                "startTick": 0,
                "endTick": FOUR_BAR_TICKS
            },
            "operation": tmpl["operation"],
            "preserve": tmpl["preserve"],
            "mutable": tmpl["mutable"],
            "creativeAuthority": tmpl["authority"],
            "candidatePolicy": { "variationCount": 2 },
            "verificationPolicy": {
                "minRhythmPreservation": tmpl["min_rhythm"],
                "minPitchAdherence": tmpl["min_pitch"],
                "minDynamicCrest": 0.85
            }
        }
        tool_facts = {
            "detectedMaskingHz": [55, 250, 4000],
            "suggestedLowCutHz": 30,
            "targetIntegratedLufs": -14.0
        }

    else: # bucket == 4
        tmpl = random.choice(BOUNDARY_DEFENSE_TEMPLATES)
        req = random.choice(tmpl["requests"])
        plan = {
            "intent": {
                "description": "Invariant-locked realization respecting creator protected tracks",
                "musicalRole": focus_track["instrument"],
                "targetGenreStyle": genre
            },
            "target": {
                "trackId": focus_track["id"],
                "trackName": focus_track["name"]
            },
            "timeScope": {
                "mode": "GLOBAL_TRACK",
                "startTick": 0,
                "endTick": FOUR_BAR_TICKS
            },
            "operation": tmpl["operation"],
            "preserve": tmpl["preserve"],
            "mutable": tmpl["mutable"],
            "creativeAuthority": tmpl["authority"],
            "candidatePolicy": { "variationCount": 4 },
            "verificationPolicy": {
                "minRhythmPreservation": tmpl["min_rhythm"],
                "minPitchAdherence": tmpl["min_pitch"],
                "minDynamicCrest": 0.90
            }
        }
        tool_facts = {
            "lockedTrackIds": [t["id"] for t in tracks if t.get("locked")],
            "protectedVocalPresence": True,
            "strictTimingPreservation": True
        }

    return {
        "id": f"sample_{index:04d}",
        "session_context": {
            "bpm": bpm,
            "key": key,
            "scale": scale,
            "genre": genre,
            "activeRoom": "BUILD" if bucket in [1, 2] else "MIX",
            "focusTrack": focus_track,
            "surroundingTracks": [t for t in tracks if t["id"] != focus_track["id"]],
            "tool_facts": tool_facts
        },
        "creator_request": req,
        "ground_truth_plan": json.dumps(plan, indent=2)
    }

def main():
    print(f"Generating {TOTAL_SAMPLES} gold dataset samples for SoulSonus Execution Planner...")
    os.makedirs("dataset", exist_ok=True)
    
    samples = []
    # 35% Bucket 1 (700)
    for i in range(700):
        samples.append(build_sample(1, len(samples) + 1))
    # 25% Bucket 2 (500)
    for i in range(500):
        samples.append(build_sample(2, len(samples) + 1))
    # 25% Bucket 3 (500)
    for i in range(500):
        samples.append(build_sample(3, len(samples) + 1))
    # 15% Bucket 4 (300)
    for i in range(300):
        samples.append(build_sample(4, len(samples) + 1))

    random.shuffle(samples)

    train_set = samples[:1800]
    val_set = samples[1800:]

    with open("dataset/soulsonus_gold_training_set.json", "w", encoding="utf-8") as f:
        json.dump(samples, f, indent=2)

    with open("dataset/soulsonus_train.json", "w", encoding="utf-8") as f:
        json.dump(train_set, f, indent=2)

    with open("dataset/soulsonus_val.json", "w", encoding="utf-8") as f:
        json.dump(val_set, f, indent=2)

    print(f"Generated {len(samples)} total samples:")
    print(f"  - Train Set: {len(train_set)} samples -> dataset/soulsonus_train.json")
    print(f"  - Val Set:   {len(val_set)} samples -> dataset/soulsonus_val.json")
    print(f"  - Master Set: dataset/soulsonus_gold_training_set.json")

if __name__ == "__main__":
    main()
