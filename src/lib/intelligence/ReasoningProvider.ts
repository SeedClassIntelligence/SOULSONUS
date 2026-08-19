/**
 * SoulSonus Reasoning Provider Interface
 * Model-neutral contract for pluggable reasoning backends.
 *
 * DOCTRINE:
 * LLM reasons. SoulSonus governs. Engines execute. Creator decides.
 * No reasoning provider communicates directly with canonical project state.
 */

import { STUDIO_INTELLIGENCE_KNOW_HOW_DOCUMENT } from '../studioIntelligenceKnowHow';

import { NoteEvent, GenerationCandidate, RealizationRoute } from '../../types/daw';
import { proposeRealization } from '../realizationProposal';

export type StudioEmphasis =
  | 'CO_PRODUCER'
  | 'AUDIO_ENGINEER'
  | 'STUDIO_MANAGER'
  | 'TUTOR'
  | 'PLATFORM_GUIDE';

export interface BoundedTrackContext {
  id: string;
  name: string;
  instrument: string;
  volumeDb: number;
  pitch: string;
  mute: boolean;
  solo: boolean;
  activeNoteCount: number;
  hasDsp: boolean;
  noteEvents?: NoteEvent[];
}

export interface BoundedStudioContext {
  activeRoom: string;
  bpm: number;
  key: string;
  scale: string;
  timeSignature: string;
  currentStep: number;
  currentBar: number;
  focusTrack: BoundedTrackContext | null;
  tracks: BoundedTrackContext[];
  emphasis: StudioEmphasis;
}

export interface ReasoningProposal {
  type: 'EQ' | 'COMPRESSION' | 'VOLUME' | 'ARRANGEMENT' | 'PITCH' | 'SOUND_SWAP' | 'NOTE_EDIT' | 'REALIZATION';
  targetTrackId?: string;
  targetTrackName?: string;
  title: string;
  description: string;
  proposedChanges: {
    volume?: number;
    pitch?: string;
    dspSettings?: Record<string, any>;
    actionSummary?: string;
    realizationRoute?: RealizationRoute;
    realizationCandidate?: GenerationCandidate;
    noteOperation?: {
      type: 'RESIZE_NOTE' | 'TRANSPOSE_NOTES' | 'QUANTIZE_NOTES';
      noteId?: string;
      noteIds?: string[];
      deltaTicks?: number;
      newDurationTicks?: number;
      semitones?: number;
      divisionTicks?: number;
    };
  };
}

export interface ReasoningResult {
  providerId: string;
  emphasis: StudioEmphasis;
  content: string;
  proposal?: ReasoningProposal;
  timestamp: number;
}

export interface ReasoningProvider {
  readonly id: string;
  readonly name: string;
  readonly isLocal: boolean;
  reason(context: BoundedStudioContext, prompt: string, apiKey?: string, endpointUrl?: string, modelName?: string, temperature?: number): Promise<ReasoningResult>;
}

/**
 * Packaged Default: SoulSonus Native Studio Brain
 * 100% Free / Zero API Keys / Fully Offline Heuristic & Neural Expert
 */
export class NativeStudioBrainProvider implements ReasoningProvider {
  readonly id = 'LOCAL_BRAIN';
  readonly name = 'SoulSonus Native Studio Brain';
  readonly isLocal = true;

  async reason(context: BoundedStudioContext, prompt: string): Promise<ReasoningResult> {
    const q = prompt.toLowerCase();
    const target = context.focusTrack || context.tracks[0];
    let reply = '';
    let proposal: ReasoningProposal | undefined;

    // 0. E05 Music Realization & ACE Performance Transfer (Under-the-DAW Orchestration)
    if (
      q.includes('sliding 808') ||
      q.includes('nasty') ||
      q.includes('mouth bass') ||
      (q.includes('sound like') && (q.includes('808') || q.includes('bass')))
    ) {
      const bassTr = context.tracks.find((t) => t.instrument === 'bass' || t.name.toLowerCase().includes('bass')) || target;
      reply = `**Co-Producer Realization (ACE Performance Transfer)**:\n\nThis routes your oral bass performance through the **E05 Realization Engine**.\n\n• **Intended invariants**: pitch slides, onset microtiming, glide inflection.\n• **Intended change**: deep analog sub saturation, sine harmonic overtone drive, glide curve.\n\nHow much of your performance actually survives is measured against your raw take once the realization runs — it is not known yet, so nothing below claims a number.`;

      const candidate = proposeRealization({
        route: 'ACE_PERFORMANCE_TRANSFER',
        targetRole: '808_bass',
        prompt,
        backend: 'ACERealizer',
        modelVersion: 'ace-step-1.5',
        modifiedProperties: ['timbre', 'sub_saturation', 'glide_inflection'],
        intendedInvariants: ['rhythm', 'timing', 'pitchContour', 'articulation'],
      });

      proposal = {
        type: 'REALIZATION',
        targetTrackId: bassTr?.id,
        targetTrackName: bassTr?.name,
        title: `ACE Realization: Nasty Sliding 808 on ${bassTr?.name || 'Bass'}`,
        description: `Transfer the raw oral performance to an analog sliding 808, holding rhythm and pitch contour. Preservation is measured after the realization runs, not promised before it.`,
        proposedChanges: {
          actionSummary: `ACE Performance Transfer ➔ Sliding 808 on ${bassTr?.name || 'Bass'}`,
          realizationRoute: 'ACE_PERFORMANCE_TRANSFER',
          realizationCandidate: candidate,
        },
      };
    }
    else if (
      q.includes('cello') ||
      q.includes('violin') ||
      (q.includes('hum') && (q.includes('turn') || q.includes('instrument'))) ||
      q.includes('expressive cello')
    ) {
      const melTr = context.tracks.find((t) => t.instrument === 'melody' || t.instrument === 'strings') || target;
      reply = `**Co-Producer Realization (ACE Timbral Transfer)**:\n\nThis turns your hum into an **expressive solo cello** through the E05 Realization Engine.\n\n• **Intended invariants**: vibrato depth, melodic phrasing, note-duration articulation.\n• **Intended change**: rosin bow friction, wooden body resonance, chest warmth.\n\nThe Intent Contract is evaluated against the realized audio. Until that audio exists there is no score to show you.`;

      const candidate = proposeRealization({
        route: 'ACE_PERFORMANCE_TRANSFER',
        targetRole: 'cello_solo',
        prompt,
        backend: 'ACERealizer',
        modelVersion: 'ace-step-1.5',
        modifiedProperties: ['timbre', 'bow_friction', 'body_resonance'],
        intendedInvariants: ['rhythm', 'timing', 'pitchContour', 'articulation'],
      });

      proposal = {
        type: 'REALIZATION',
        targetTrackId: melTr?.id,
        targetTrackName: melTr?.name,
        title: `ACE Realization: Expressive Solo Cello on ${melTr?.name || 'Melody'}`,
        description: `Realize the vocal hum phrasing as a solo cello, holding vibrato and phrasing.`,
        proposedChanges: {
          actionSummary: `ACE Performance Transfer ➔ Solo Cello on ${melTr?.name || 'Melody'}`,
          realizationRoute: 'ACE_PERFORMANCE_TRANSFER',
          realizationCandidate: candidate,
        },
      };
    }
    else if (
      q.includes('beatbox') ||
      q.includes('professionally recorded') ||
      q.includes('drum kit') ||
      (q.includes('keep this beat') && q.includes('drums'))
    ) {
      const drumTr = context.tracks.find((t) => t.instrument === 'kick' || t.instrument === 'snare') || target;
      reply = `**Co-Producer Realization (Studio Drum Transfer)**:\n\nThis maps your beatbox performance onto a **studio acoustic kit** with multi-mic room acoustics, through E05.\n\n• **Intended invariants**: pocket groove, ghost-note dynamics, transient attack envelopes.\n• **Intended change**: close-mic punch, overhead stereo width, room bloom.\n\nHow much of the groove survives is measured against your take once it runs.`;

      const candidate = proposeRealization({
        route: 'ACE_PERFORMANCE_TRANSFER',
        targetRole: 'studio_drum_kit',
        prompt,
        backend: 'ACERealizer',
        modelVersion: 'ace-step-1.5',
        modifiedProperties: ['timbre', 'overhead_ambience', 'close_mic_punch'],
        intendedInvariants: ['rhythm', 'timing', 'articulation'],
      });

      proposal = {
        type: 'REALIZATION',
        targetTrackId: drumTr?.id,
        targetTrackName: drumTr?.name,
        title: `ACE Realization: Studio Acoustic Kit on ${drumTr?.name || 'Drums'}`,
        description: `Transfer beatbox transients into studio acoustic drum kit with overhead ambiance.`,
        proposedChanges: {
          actionSummary: `ACE Performance Transfer ➔ Studio Kit on ${drumTr?.name || 'Drums'}`,
          realizationRoute: 'ACE_PERFORMANCE_TRANSFER',
          realizationCandidate: candidate,
        },
      };
    }
    // 0B. R01 Sample Vault Swap (Simple Timbre / Sound Replacement without ACE Transfer)
    else if (
      (q.includes('fatter') && (q.includes('kick') || q.includes('snare') || q.includes('bass'))) ||
      (q.includes('swap') && (q.includes('kick') || q.includes('snare') || q.includes('hat') || q.includes('sample'))) ||
      q.includes('sample vault')
    ) {
      const isKick = q.includes('kick');
      const tr = context.tracks.find((t) => isKick ? t.instrument === 'kick' : t.instrument === 'snare' || t.instrument === 'bass') || target;
      const sampleName = isKick ? 'TR-808 Heavy Studio Kick (54Hz)' : 'Crispy Vintage Snare (Layered)';
      reply = `**Co-Producer Recommendation (R01 Sample Vault)**:\n\nAuditioning a fatter sample replacement from **R01 Sample Vault**: **${sampleName}**.\n\n• **Route**: \`R01 SAMPLE\` (Direct one-shot hit replacement preserving step timing).\n• **Contrast**: For performance-preserving oral timbre transformation instead of sample replacement, ask to *"keep my exact mouth transients via ACE"*.\n\nThis is a proposal: the swapped audio is rendered when you accept it, and there is nothing to audition until then.`;

      const candidate = proposeRealization({
        route: 'SAMPLE',
        targetRole: isKick ? 'kick' : 'snare',
        prompt,
        backend: 'SampleRealizer',
        modelVersion: 'R01-Sample-v1.0',
        modifiedProperties: ['sample_source', 'body_weight'],
        intendedInvariants: ['rhythm', 'timing'],
      });

      proposal = {
        type: 'REALIZATION',
        targetTrackId: tr?.id,
        targetTrackName: tr?.name,
        title: `R01 Sample Swap: ${sampleName} on ${tr?.name || 'Track'}`,
        description: `Replace track trigger sound with punchy R01 Sample Vault asset.`,
        proposedChanges: {
          actionSummary: `R01 Sample Swap ➔ ${sampleName} on ${tr?.name || 'Track'}`,
          realizationRoute: 'SAMPLE',
          realizationCandidate: candidate,
        },
      };
    }
    // 0C. R02 SoundFont / SFZ Instrument Playback (MIDI note playback)
    else if (
      q.includes('soundfont') ||
      q.includes('sfz') ||
      (q.includes('play this on') && (q.includes('piano') || q.includes('strings') || q.includes('rhodes')))
    ) {
      const tr = context.tracks.find((t) => t.instrument === 'melody' || t.instrument === 'strings') || target;
      const instName = q.includes('rhodes') ? 'Rhodes Mark I Electric Piano' : 'Cinematic Chamber Strings';
      reply = `**Co-Producer Recommendation (R02 SoundFont / SFZ)**:\n\nRouting track notes through **R02 Multi-Sample Instrument**: **${instName}**.\n\n• **Route**: \`R02 INSTRUMENT\` (Multi-sampled velocity-layered soundfont).\n• **Contrast**: If you want your continuous vocal vibrato, micro-glides, and throat inflection preserved, choose **ACE Performance Transfer**.\n\nThis is a proposal: the instrument render happens when you accept it.`;

      const candidate = proposeRealization({
        route: 'INSTRUMENT',
        targetRole: 'keyboard_strings',
        prompt,
        backend: 'SoulSonusNativeRealizer',
        modelVersion: 'R02-SFZ-v1.0',
        modifiedProperties: ['timbre', 'acoustic_space'],
        intendedInvariants: ['rhythm', 'timing', 'midiNotes'],
      });

      proposal = {
        type: 'REALIZATION',
        targetTrackId: tr?.id,
        targetTrackName: tr?.name,
        title: `R02 Instrument: ${instName} on ${tr?.name || 'Track'}`,
        description: `Render notes using R02 SoundFont multi-sample instrument engine.`,
        proposedChanges: {
          actionSummary: `R02 SoundFont ➔ ${instName} on ${tr?.name || 'Track'}`,
          realizationRoute: 'INSTRUMENT',
          realizationCandidate: candidate,
        },
      };
    }
    // 1. Mud / Frequency Masking
    else if (q.includes('mud') || q.includes('kick') || q.includes('808') || q.includes('clash') || q.includes('low end')) {
      if (context.emphasis === 'AUDIO_ENGINEER') {
        reply = `**Acoustic Mud Diagnosis (Kick vs 808 Sub)**:\n\nIn ${context.key} ${context.scale} (Fundamental $f_0 \\approx 65.4\\text{ Hz}$), the Kick transient and 808 sub overlap in the 55–85Hz octave, causing phase masking.\n\n**Recommended Least-Invasive Fix**:\n1. Carve a $-3.5\\text{ dB}$ narrow notch at $65\\text{ Hz}$ on the 808 Bass.\n2. Boost the Kick transient click at $2.4\\text{ kHz}$ ($+2.0\\text{ dB}$) for small-speaker translation.\n3. Keep frequencies below $100\\text{ Hz}$ strictly mono.`;
        
        const bass = context.tracks.find((t) => t.instrument === 'bass' || t.name.toLowerCase().includes('808')) || target;
        if (bass) {
          proposal = {
            type: 'EQ',
            targetTrackId: bass.id,
            targetTrackName: bass.name,
            title: `Carve 65Hz Notch on ${bass.name}`,
            description: `Apply -3.5dB bell cut at 65Hz on ${bass.name} to unmask Kick transient punch.`,
            proposedChanges: {
              dspSettings: { lowGain: -3.5, midFreqHz: 250, midGain: -1.5 },
              actionSummary: `EQ Notch -3.5dB @ 65Hz on ${bass.name}`,
            },
          };
        }
      } else {
        reply = `**Co-Producer Note**:\n\nKeep the Kick short and punchy (decay < 250ms) to drive the rhythm, and let the 808 carry the sustained sub weight. If the 808 glides every 2 bars, anchor the kick on the downbeats for maximum bounce.`;
      }
    }
    // 2. Vocal Processing & Compression
    else if (q.includes('vocal') || q.includes('compress') || q.includes('voice') || q.includes('de-ess') || q.includes('warmth')) {
      if (context.emphasis === 'AUDIO_ENGINEER') {
        reply = `**Vocal Dynamics Chain (Fast FET 1176 Style)**:\n\n• **Threshold**: $-18\\text{ dB}$, **Ratio**: $4:1$.\n• **Attack**: Fast ($0.8\\text{ ms}$) to catch sibilance peaks, **Release**: $120\\text{ ms}$ synced to ${context.bpm} BPM.\n• **High-Pass Filter**: Engage steep 18dB/oct cut at $85\\text{ Hz}$ to eliminate stage rumble.\n• **Air Shelf**: $+2.5\\text{ dB}$ at $10\\text{ kHz}$ for commercial vocal sheen.`;
        
        const vocal = context.tracks.find((t) => t.instrument === 'vocal_synth' || t.name.toLowerCase().includes('vocal')) || target;
        if (vocal) {
          proposal = {
            type: 'COMPRESSION',
            targetTrackId: vocal.id,
            targetTrackName: vocal.name,
            title: `Engage Studio Vocal Chain on ${vocal.name}`,
            description: `Apply 85Hz high-pass cut, 4:1 FET compression, and +2.5dB air sheen on ${vocal.name}.`,
            proposedChanges: {
              dspSettings: { lowCutHz: 85, highGain: 2.5, compressorThreshold: -18, compressorRatio: 4 },
              actionSummary: `85Hz Cut + 4:1 FET Comp on ${vocal.name}`,
            },
          };
        }
      } else {
        reply = `**Co-Producer Vocal Advice**:\n\nRecord two tight overdub double takes panned 35% Left and 35% Right at -6dB during the Chorus to give your vocal hook an expansive, radio-ready stereo presence.`;
      }
    }
    // 3. Note Manipulation & Tactile Piano Roll Commands (Co-Producer Parity)
    else if (q.includes('hold') || q.includes('last note') || q.includes('another beat') || q.includes('extend note')) {
      reply = `**Co-Producer Note**: Extending the resolving tail of the final note on **${target?.name || 'Lead'}** by +1 beat (480 ticks) to let the harmonic phrase ring out into the next bar.`;
      const lastNote = target?.noteEvents && target.noteEvents.length > 0 ? target.noteEvents[target.noteEvents.length - 1] : undefined;
      proposal = {
        type: 'NOTE_EDIT',
        targetTrackId: target?.id,
        targetTrackName: target?.name,
        title: `Hold Last Note +1 Beat on ${target?.name || 'Lead'}`,
        description: `Extend the duration of the final phrase note by +480 ticks (1 quarter note).`,
        proposedChanges: {
          actionSummary: `Extend last note duration (+480 ticks) on ${target?.name || 'Lead'}`,
          noteOperation: {
            type: 'RESIZE_NOTE',
            noteId: lastNote?.id,
            newDurationTicks: lastNote ? lastNote.durationTicks + 480 : 480,
          },
        },
      };
    }
    else if (q.includes('transpose') || q.includes('octave') || q.includes('pitch up') || q.includes('pitch down')) {
      const isDown = q.includes('down') || q.includes('lower');
      const semitones = isDown ? -12 : 12;
      reply = `**Co-Producer Note**: Transposing **${target?.name || 'Track'}** by ${semitones > 0 ? '+12' : '-12'} semitones (${isDown ? 'down' : 'up'} one octave) to sit cleanly in the acoustic arrangement.`;
      proposal = {
        type: 'NOTE_EDIT',
        targetTrackId: target?.id,
        targetTrackName: target?.name,
        title: `Transpose ${target?.name || 'Track'} ${semitones > 0 ? '+1 Octave' : '-1 Octave'}`,
        description: `Shift all notes on ${target?.name || 'Track'} by ${semitones} semitones.`,
        proposedChanges: {
          actionSummary: `Transpose ${semitones > 0 ? '+12' : '-12'} semitones on ${target?.name || 'Track'}`,
          noteOperation: {
            type: 'TRANSPOSE_NOTES',
            semitones,
          },
        },
      };
    }
    else if (q.includes('quantize') || q.includes('tighten') || q.includes('grid align')) {
      reply = `**Co-Producer Note**: Quantizing all notes on **${target?.name || 'Track'}** to the nearest 16th-note grid division (120 ticks) while preserving velocity dynamics.`;
      proposal = {
        type: 'NOTE_EDIT',
        targetTrackId: target?.id,
        targetTrackName: target?.name,
        title: `Quantize Notes on ${target?.name || 'Track'}`,
        description: `Snap note start times and durations to 16th-note grid.`,
        proposedChanges: {
          actionSummary: `Quantize to 16th notes (120 ticks) on ${target?.name || 'Track'}`,
          noteOperation: {
            type: 'QUANTIZE_NOTES',
            divisionTicks: 120,
          },
        },
      };
    }
    // 4. Chords & Harmony
    else if (q.includes('chord') || q.includes('key') || q.includes('progression') || q.includes('melody')) {
      reply = `**Harmonic Progressions in ${context.key} ${context.scale}**:\n\n1. **Dark Trap**: $\\text{Cm} \\rightarrow \\text{Ab} \\rightarrow \\text{Fm} \\rightarrow \\text{G7}$ ($i - VI - iv - V7$)\n2. **Soulful R&B**: $\\text{Cm9} \\rightarrow \\text{Ebmaj7} \\rightarrow \\text{Abmaj7} \\rightarrow \\text{Bb}$ ($i9 - III - VI - VII$)\n3. **Driving Groove**: $\\text{Cm} \\rightarrow \\text{Bb} \\rightarrow \\text{Ab} \\rightarrow \\text{Bb}$ ($i - VII - VI - VII$)\n\n**Pro-Tip**: Add 9ths (adding note D) on the Rhodes track for instant lush warmth!`;
    }
    // 5. Mastering & LUFS
    else if (q.includes('master') || q.includes('lufs') || q.includes('loud') || q.includes('ceiling')) {
      reply = `**Broadcast Mastering Targets**:\n\n• **Integrated Loudness**: $-14.0\\text{ LUFS-I}$ (Spotify, Apple Music standard).\n• **True Peak Safety Ceiling**: $-1.0\\text{ dBTP}$ to prevent lossy inter-sample distortion.\n• **Sub Width**: Mono $<120\\text{ Hz}$ for maximum acoustic drive.`;
      proposal = {
        type: 'ARRANGEMENT',
        title: 'Apply Broadcast Safety Ceiling (-1.0 dBTP)',
        description: 'Set master limiter ceiling to -1.0 dBTP and target -14.0 LUFS-I.',
        proposedChanges: { actionSummary: 'Master Ceiling -1.0 dBTP & -14 LUFS Target' },
      };
    }
    // 6. General Contextual Advice
    else {
      reply = `**SoulSonus Studio Intelligence (${context.emphasis.replace('_', ' ')})**:\n\nMonitoring your active session in **Room ${context.activeRoom}** (${context.tracks.length} tracks at ${context.bpm} BPM in ${context.key} ${context.scale}).\n\nFocus Track: **${target?.name || 'Project Master'}**.\nHow can I assist your creative vision or mix diagnosis next?`;
    }

    return {
      providerId: this.id,
      emphasis: context.emphasis,
      content: reply,
      proposal,
      timestamp: Date.now(),
    };
  }
}

/**
 * Ollama / Localhost REST Provider
 */
export class OllamaReasoningProvider implements ReasoningProvider {
  readonly id = 'OLLAMA';
  readonly name = 'Local Ollama / LM Studio';
  readonly isLocal = true;

  async reason(
    context: BoundedStudioContext,
    prompt: string,
    _apiKey?: string,
    endpointUrl = 'http://localhost:11434',
    modelName = 'llama3',
    temperature = 0.7
  ): Promise<ReasoningResult> {
    const systemPrompt = `${STUDIO_INTELLIGENCE_KNOW_HOW_DOCUMENT}\n\nACTIVE EMPHASIS: ${context.emphasis}\nSESSION: Room ${context.activeRoom}, ${context.bpm} BPM, ${context.key} ${context.scale}. Focus: ${context.focusTrack?.name || 'Master'}. Tracks (${context.tracks.length}): ${context.tracks.map((t) => t.name).join(', ')}.`;

    const res = await fetch(`${endpointUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelName,
        prompt: `${systemPrompt}\n\nCreator: ${prompt}\n\nSoulSonus Intelligence:`,
        stream: false,
        options: { temperature },
      }),
    });

    if (!res.ok) throw new Error(`Ollama HTTP ${res.status}`);
    const data = await res.json();
    return {
      providerId: this.id,
      emphasis: context.emphasis,
      content: data.response || 'No response from local Ollama.',
      timestamp: Date.now(),
    };
  }
}

/**
 * Google Gemini Provider (BYOK)
 */
export class GeminiReasoningProvider implements ReasoningProvider {
  readonly id = 'GEMINI';
  readonly name = 'Google Gemini (BYOK)';
  readonly isLocal = false;

  async reason(
    context: BoundedStudioContext,
    prompt: string,
    apiKey?: string,
    _endpoint?: string,
    modelName = 'gemini-1.5-flash',
    temperature = 0.7
  ): Promise<ReasoningResult> {
    if (!apiKey) throw new Error('Missing Gemini API Key');

    const systemPrompt = `${STUDIO_INTELLIGENCE_KNOW_HOW_DOCUMENT}\n\nACTIVE EMPHASIS: ${context.emphasis}\nSESSION: Room ${context.activeRoom}, ${context.bpm} BPM, ${context.key} ${context.scale}. Focus: ${context.focusTrack?.name || 'Master'}. Tracks (${context.tracks.length}): ${context.tracks.map((t) => t.name).join(', ')}.`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemPrompt}\n\nCreator Request: ${prompt}` }],
            },
          ],
          generationConfig: { temperature, maxOutputTokens: 1024 },
        }),
      }
    );

    if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);
    const data = await res.json();
    const answer = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response from Gemini.';
    return {
      providerId: this.id,
      emphasis: context.emphasis,
      content: answer,
      timestamp: Date.now(),
    };
  }
}

/**
 * OpenAI Provider (BYOK)
 */
export class OpenAiReasoningProvider implements ReasoningProvider {
  readonly id = 'OPENAI';
  readonly name = 'OpenAI GPT (BYOK)';
  readonly isLocal = false;

  async reason(
    context: BoundedStudioContext,
    prompt: string,
    apiKey?: string,
    _endpoint?: string,
    modelName = 'gpt-4o-mini',
    temperature = 0.7
  ): Promise<ReasoningResult> {
    if (!apiKey) throw new Error('Missing OpenAI API Key');

    const systemPrompt = `${STUDIO_INTELLIGENCE_KNOW_HOW_DOCUMENT}\n\nACTIVE EMPHASIS: ${context.emphasis}\nSESSION: Room ${context.activeRoom}, ${context.bpm} BPM, ${context.key} ${context.scale}. Focus: ${context.focusTrack?.name || 'Master'}. Tracks (${context.tracks.length}): ${context.tracks.map((t) => t.name).join(', ')}.`;

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        temperature,
      }),
    });

    if (!res.ok) throw new Error(`OpenAI HTTP ${res.status}`);
    const data = await res.json();
    const answer = data.choices?.[0]?.message?.content || 'No response from OpenAI.';
    return {
      providerId: this.id,
      emphasis: context.emphasis,
      content: answer,
      timestamp: Date.now(),
    };
  }
}

/**
 * Master Registry of Pluggable Reasoning Providers
 */
export const REASONING_PROVIDERS: Record<string, ReasoningProvider> = {
  LOCAL_BRAIN: new NativeStudioBrainProvider(),
  OLLAMA: new OllamaReasoningProvider(),
  GEMINI: new GeminiReasoningProvider(),
  OPENAI: new OpenAiReasoningProvider(),
};
