import * as Tone from 'tone';
import { Track, InstrumentType } from '../types/daw';
import { vocalRecorder } from './vocalRecorder';
import { tickToStep, midiToNoteName } from '../utils/musicMath';

interface TrackChannelNodes {
  filter: Tone.Filter;
  compressor: Tone.Compressor;
  channel: Tone.Channel;
  reverbSend: Tone.Gain;
}

export class AudioEngine {
  private initialized = false;

  // Synths
  private kickSynth: Tone.MembraneSynth | null = null;
  private snareSynth: Tone.NoiseSynth | null = null;
  private hihatSynth: Tone.MetalSynth | null = null;
  private melodySynth: Tone.FMSynth | null = null;
  private bassSynth: Tone.MonoSynth | null = null;

  // Master Bus Phase 11 DSP Chain
  private masterLimiter: Tone.Limiter | null = null;
  private masterVolume: Tone.Volume | null = null;
  private masterCompressor: Tone.Compressor | null = null;
  private masterReverb: Tone.Reverb | null = null;
  private masterDelay: Tone.FeedbackDelay | null = null;

  // Dynamic Per-Track Channel Strips
  private trackNodeMap = new Map<string, TrackChannelNodes>();

  private loopEventId: number | null = null;
  private stepCallback: ((step: number) => void) | null = null;
  private vocalPlayer: Tone.Player | null = null;
  private vocalVolumeNode: Tone.Volume | null = null;

  private isVocalRecording = false;
  private vocalRecordStepCount = 0;
  private onVocalRecordCompleteCallback:
    | ((result: { blob: Blob; buffer: AudioBuffer; waveform: number[]; duration: number }) => void)
    | null = null;

  public async init() {
    if (this.initialized) return;

    await Tone.start();

    // Master Bus Chain: MasterVolume -> MasterCompressor -> MasterLimiter -> Destination
    this.masterLimiter = new Tone.Limiter(-0.5).toDestination();
    this.masterVolume = new Tone.Volume(0).connect(this.masterLimiter);
    this.masterCompressor = new Tone.Compressor({ threshold: -12, ratio: 4, attack: 0.003, release: 0.25 }).connect(
      this.masterVolume
    );

    // Master Send Effects
    this.masterReverb = new Tone.Reverb({ decay: 2.2, wet: 0.2 });
    this.masterDelay = new Tone.FeedbackDelay({ delayTime: '8n', feedback: 0.25, wet: 0.15 });

    await this.masterReverb.generate();

    this.masterReverb.connect(this.masterCompressor);
    this.masterDelay.connect(this.masterCompressor);

    // Instrument Synthesizers
    this.kickSynth = new Tone.MembraneSynth({
      pitchDecay: 0.05,
      octaves: 8,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 0.4 },
    });

    this.snareSynth = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.001, decay: 0.2, sustain: 0 },
    });

    this.hihatSynth = new Tone.MetalSynth({
      envelope: { attack: 0.001, decay: 0.05, release: 0.05 },
      harmonicity: 5.1,
      modulationIndex: 32,
      resonance: 4000,
      octaves: 1.5,
      volume: -10,
    });
    this.hihatSynth.frequency.value = 200;

    this.melodySynth = new Tone.FMSynth({
      harmonicity: 3,
      modulationIndex: 10,
      detune: 0,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.01, decay: 0.3, sustain: 0.2, release: 0.5 },
      modulation: { type: 'triangle' },
      modulationEnvelope: { attack: 0.02, decay: 0.2, sustain: 0.2, release: 0.5 },
    });

    this.bassSynth = new Tone.MonoSynth({
      oscillator: { type: 'sawtooth' },
      filter: { Q: 3, type: 'lowpass' },
      envelope: { attack: 0.01, decay: 0.2, sustain: 0.4, release: 0.4 },
      filterEnvelope: { attack: 0.01, decay: 0.1, sustain: 0.2, release: 0.2, baseFrequency: 80, octaves: 4 },
    });

    this.initialized = true;
  }

  public isReady(): boolean {
    return this.initialized;
  }

  /**
   * Ensure a dedicated Tone.Channel and DSP Chain exists for every track in the project
   */
  public getOrCreateTrackNodes(track: Track): TrackChannelNodes | null {
    if (!this.initialized || !this.masterCompressor || !this.masterReverb) {
      return null;
    }

    let nodes = this.trackNodeMap.get(track.id);
    if (!nodes) {
      const defaultFilterFreq =
        track.instrument === 'kick' ? 400 : track.instrument === 'bass' ? 600 : track.instrument === 'hihat' ? 8000 : 12000;

      const filter = new Tone.Filter({
        frequency: track.dspSettings?.filterFreq || defaultFilterFreq,
        type: track.dspSettings?.filterType || 'lowpass',
      });

      const compressor = new Tone.Compressor({
        threshold: track.dspSettings?.compressorThreshold || -18,
        ratio: track.dspSettings?.compressorRatio || 4,
        attack: 0.005,
        release: 0.1,
      });

      const channel = new Tone.Channel({
        volume: track.volume || 0,
        pan: track.dspSettings?.pan || 0,
        mute: track.mute,
        solo: track.solo,
      });

      const reverbSend = new Tone.Gain(track.dspSettings?.reverbSend || (track.instrument === 'melody' ? 0.25 : 0));

      // Signal Flow: Filter -> Compressor -> Channel -> Master Compressor
      filter.connect(compressor);
      compressor.connect(channel);
      channel.connect(this.masterCompressor);

      // Reverb Send: Compressor -> ReverbSend -> MasterReverb
      compressor.connect(reverbSend);
      reverbSend.connect(this.masterReverb);

      nodes = { filter, compressor, channel, reverbSend };
      this.trackNodeMap.set(track.id, nodes);
    }

    return nodes;
  }

  public setTrackVolume(trackId: string, volumeDb: number) {
    const nodes = this.trackNodeMap.get(trackId);
    if (nodes) {
      nodes.channel.volume.rampTo(volumeDb, 0.05);
    }
  }

  public setTrackPan(trackId: string, pan: number) {
    const nodes = this.trackNodeMap.get(trackId);
    if (nodes) {
      nodes.channel.pan.rampTo(pan, 0.05);
    }
  }

  public setTrackFilterFreq(trackId: string, freqHz: number) {
    const nodes = this.trackNodeMap.get(trackId);
    if (nodes) {
      nodes.filter.frequency.rampTo(freqHz, 0.05);
    }
  }

  public setTrackCompressorThreshold(trackId: string, thresholdDb: number) {
    const nodes = this.trackNodeMap.get(trackId);
    if (nodes) {
      nodes.compressor.threshold.rampTo(thresholdDb, 0.05);
    }
  }

  public setTrackReverbSend(trackId: string, sendAmount: number) {
    const nodes = this.trackNodeMap.get(trackId);
    if (nodes) {
      nodes.reverbSend.gain.rampTo(sendAmount, 0.05);
    }
  }

  public async setBPM(bpm: number) {
    Tone.getTransport().bpm.value = Math.max(40, Math.min(240, bpm));
  }

  public setMasterVolume(db: number) {
    if (this.masterVolume) {
      this.masterVolume.volume.rampTo(db, 0.05);
    }
  }

  public setReverbLevel(level: number) {
    if (this.masterReverb) {
      this.masterReverb.wet.value = level;
    }
  }

  public setDelayLevel(level: number) {
    if (this.masterDelay) {
      this.masterDelay.wet.value = level;
    }
  }

  public triggerKick(note = 'C1', time?: number, velocity = 1, targetTrack?: Track, duration: string | number = '8n') {
    if (!this.initialized || !this.kickSynth) return;
    try {
      const nodes = targetTrack ? this.getOrCreateTrackNodes(targetTrack) : null;
      if (nodes) {
        this.kickSynth.disconnect();
        this.kickSynth.connect(nodes.filter);
      } else if (this.masterCompressor) {
        this.kickSynth.disconnect();
        this.kickSynth.connect(this.masterCompressor);
      }
      this.kickSynth.triggerAttackRelease(note, duration, time, velocity);
    } catch {
      // AudioContext safe check
    }
  }

  public triggerSnare(time?: number, velocity = 1, targetTrack?: Track, duration: string | number = '16n') {
    if (!this.initialized || !this.snareSynth) return;
    try {
      const nodes = targetTrack ? this.getOrCreateTrackNodes(targetTrack) : null;
      if (nodes) {
        this.snareSynth.disconnect();
        this.snareSynth.connect(nodes.filter);
      } else if (this.masterCompressor) {
        this.snareSynth.disconnect();
        this.snareSynth.connect(this.masterCompressor);
      }
      this.snareSynth.triggerAttackRelease(duration, time, velocity);
    } catch {
      // AudioContext safe check
    }
  }

  public triggerHiHat(time?: number, velocity = 0.8, targetTrack?: Track, duration: string | number = '32n') {
    if (!this.initialized || !this.hihatSynth) return;
    try {
      const nodes = targetTrack ? this.getOrCreateTrackNodes(targetTrack) : null;
      if (nodes) {
        this.hihatSynth.disconnect();
        this.hihatSynth.connect(nodes.filter);
      } else if (this.masterCompressor) {
        this.hihatSynth.disconnect();
        this.hihatSynth.connect(this.masterCompressor);
      }
      this.hihatSynth.triggerAttackRelease(duration, time, velocity);
    } catch {
      // AudioContext safe check
    }
  }

  public triggerMelody(note = 'C3', time?: number, velocity = 0.9, targetTrack?: Track, duration: string | number = '16n') {
    if (!this.initialized || !this.melodySynth) return;
    try {
      const nodes = targetTrack ? this.getOrCreateTrackNodes(targetTrack) : null;
      if (nodes) {
        this.melodySynth.disconnect();
        this.melodySynth.connect(nodes.filter);
      } else if (this.masterCompressor) {
        this.melodySynth.disconnect();
        this.melodySynth.connect(this.masterCompressor);
      }
      this.melodySynth.triggerAttackRelease(note, duration, time, velocity);
    } catch {
      // AudioContext safe check
    }
  }

  public triggerBass(note = 'C2', time?: number, velocity = 1, targetTrack?: Track, duration: string | number = '8n') {
    if (!this.initialized || !this.bassSynth) return;
    try {
      const nodes = targetTrack ? this.getOrCreateTrackNodes(targetTrack) : null;
      if (nodes) {
        this.bassSynth.disconnect();
        this.bassSynth.connect(nodes.filter);
      } else if (this.masterCompressor) {
        this.bassSynth.disconnect();
        this.bassSynth.connect(this.masterCompressor);
      }
      this.bassSynth.triggerAttackRelease(note, duration, time, velocity);
    } catch {
      // AudioContext safe check
    }
  }

  public setVocalBuffer(buffer: AudioBuffer | null) {
    if (this.vocalPlayer) {
      this.vocalPlayer.dispose();
      this.vocalPlayer = null;
    }

    if (buffer) {
      if (!this.vocalVolumeNode) {
        this.vocalVolumeNode = new Tone.Volume(0);
        if (this.masterCompressor) {
          this.vocalVolumeNode.connect(this.masterCompressor);
        } else {
          this.vocalVolumeNode.toDestination();
        }
      }
      this.vocalPlayer = new Tone.Player(buffer).connect(this.vocalVolumeNode);
      this.vocalPlayer.sync().start(0);
    }
  }

  public setVocalVolume(volumeDb: number) {
    if (this.vocalVolumeNode) {
      this.vocalVolumeNode.volume.value = volumeDb;
    }
  }

  /**
   * Sync Lock Vocal Recording:
   * Triggers both MediaRecorder.start() and Tone.Transport.start() at the exact same moment.
   * Automatically stops recording after 64 steps (4 bars).
   */
  public async startVocalRecord(
    tracksRef: () => Track[],
    onStepChange: (step: number) => void,
    onComplete: (result: { blob: Blob; buffer: AudioBuffer; waveform: number[]; duration: number }) => void
  ): Promise<boolean> {
    if (!this.initialized) await this.init();

    this.stopSequencer();
    this.isVocalRecording = true;
    this.vocalRecordStepCount = 0;
    this.onVocalRecordCompleteCallback = onComplete;

    const started = await vocalRecorder.startRecording();
    if (!started) {
      this.isVocalRecording = false;
      return false;
    }

    // Start sequencer synchronized with recording start
    this.startSequencer(tracksRef, (step) => {
      onStepChange(step);

      if (this.isVocalRecording) {
        this.vocalRecordStepCount++;
        // Auto-Stop after 4 bars (64 steps)
        if (this.vocalRecordStepCount >= 64) {
          this.stopVocalRecord();
        }
      }
    });

    return true;
  }

  public async stopVocalRecord() {
    if (!this.isVocalRecording) return;
    this.isVocalRecording = false;

    this.stopSequencer();

    try {
      const result = await vocalRecorder.stopRecording();
      this.setVocalBuffer(result.buffer);

      if (this.onVocalRecordCompleteCallback) {
        const callback = this.onVocalRecordCompleteCallback;
        this.onVocalRecordCompleteCallback = null;
        callback(result);
      }
    } catch (err) {
      console.error('Error stopping vocal recording:', err);
    }
  }

  public getIsVocalRecording(): boolean {
    return this.isVocalRecording;
  }

  public startSequencer(tracksRef: () => Track[], onStepChange: (step: number) => void) {
    if (!this.initialized) return;

    this.stopSequencer();
    this.stepCallback = onStepChange;

    let currentStep = 0;

    this.loopEventId = Tone.getTransport().scheduleRepeat((time) => {
      const step = currentStep % 64;
      const tracks = tracksRef();
      const bpm = Tone.getTransport().bpm.value || 110;

      const hasSolo = tracks.some((t) => t.solo);

      tracks.forEach((track) => {
        if (track.mute) return;
        if (hasSolo && !track.solo) return;

        if (track.noteEvents && track.noteEvents.length > 0) {
          const startingNotes = track.noteEvents.filter((ev) => tickToStep(ev.startTick) === step);
          startingNotes.forEach((ev) => {
            const durSec = Math.max(0.05, (ev.durationTicks / 480) * (60 / bpm));
            const noteVel = (ev.velocity / 127) * Math.min(1, Math.max(0.1, 1 + track.volume / 20));
            const notePitch = midiToNoteName(ev.midiNote);

            if (track.instrument === 'kick') {
              this.triggerKick(notePitch, time, noteVel, track, durSec);
            } else if (track.instrument === 'snare') {
              this.triggerSnare(time, noteVel, track, durSec);
            } else if (track.instrument === 'hihat') {
              this.triggerHiHat(time, noteVel, track, durSec);
            } else if (track.instrument === 'bass') {
              this.triggerBass(notePitch, time, noteVel, track, durSec);
            } else {
              this.triggerMelody(notePitch, time, noteVel, track, durSec);
            }
          });
        } else if (track.steps[step]) {
          const vel = Math.min(1, Math.max(0.1, 1 + track.volume / 20));
          if (track.instrument === 'kick') {
            this.triggerKick(track.pitch || 'C1', time, vel, track);
          } else if (track.instrument === 'snare') {
            this.triggerSnare(time, vel, track);
          } else if (track.instrument === 'hihat') {
            this.triggerHiHat(time, vel, track);
          } else if (track.instrument === 'bass') {
            const stepNote = track.notes?.[step] || track.pitch || 'C2';
            this.triggerBass(stepNote, time, vel, track);
          } else {
            const stepNote = track.notes?.[step] || track.pitch || 'C3';
            this.triggerMelody(stepNote, time, vel, track);
          }
        }
      });

      if (this.stepCallback) {
        Tone.getDraw().schedule(() => {
          this.stepCallback?.(step);
        }, time);
      }

      currentStep++;
    }, '16n');

    Tone.getTransport().start();
  }

  public stopSequencer() {
    if (this.loopEventId !== null) {
      Tone.getTransport().clear(this.loopEventId);
      this.loopEventId = null;
    }
    Tone.getTransport().stop();
    Tone.getTransport().position = 0;
  }

  public pauseSequencer() {
    Tone.getTransport().pause();
  }

  // --- TRANSFORMATION & "SHOOT AROUND" LOGIC ---

  public cloneBar(
    tracks: Track[],
    trackId: string | 'all' = 'all',
    sourceBarIndex: number = 0,
    targetBarIndex: number | 'all' = 'all'
  ): Track[] {
    const validSource = Math.max(0, Math.min(3, sourceBarIndex));

    return tracks.map((track) => {
      if (trackId !== 'all' && track.id !== trackId) return track;

      const sourceSteps = track.steps.slice(validSource * 16, (validSource + 1) * 16);
      const sourceNotes = track.notes ? track.notes.slice(validSource * 16, (validSource + 1) * 16) : undefined;

      if (targetBarIndex === 'all') {
        const newSteps = [...sourceSteps, ...sourceSteps, ...sourceSteps, ...sourceSteps];
        const newNotes = sourceNotes ? [...sourceNotes, ...sourceNotes, ...sourceNotes, ...sourceNotes] : undefined;
        return { ...track, steps: newSteps, notes: newNotes };
      } else {
        const validTarget = Math.max(0, Math.min(3, targetBarIndex));
        const newSteps = [...track.steps];
        newSteps.splice(validTarget * 16, 16, ...sourceSteps);

        let newNotes = track.notes ? [...track.notes] : undefined;
        if (newNotes && sourceNotes) {
          newNotes.splice(validTarget * 16, 16, ...sourceNotes);
        }

        return { ...track, steps: newSteps, notes: newNotes };
      }
    });
  }

  public nudgePattern(
    tracks: Track[],
    trackId: string | 'all' = 'all',
    direction: 'left' | 'right' = 'right'
  ): Track[] {
    return tracks.map((track) => {
      if (trackId !== 'all' && track.id !== trackId) return track;

      let newSteps: boolean[];
      let newNotes: string[] | undefined;

      if (direction === 'left') {
        newSteps = [...track.steps.slice(1), track.steps[0]];
        newNotes = track.notes ? [...track.notes.slice(1), track.notes[0]] : undefined;
      } else {
        newSteps = [track.steps[track.steps.length - 1], ...track.steps.slice(0, -1)];
        newNotes = track.notes ? [track.notes[track.notes.length - 1], ...track.notes.slice(0, -1)] : undefined;
      }

      return { ...track, steps: newSteps, notes: newNotes };
    });
  }

  public shiftTrackPattern(
    tracks: Track[],
    sourceTrackIdOrIndex: string | number,
    targetTrackIdOrIndex: string | number | 'up' | 'down' | InstrumentType
  ): Track[] {
    let sourceIndex = -1;
    if (typeof sourceTrackIdOrIndex === 'number') {
      sourceIndex = sourceTrackIdOrIndex;
    } else {
      sourceIndex = tracks.findIndex((t) => t.id === sourceTrackIdOrIndex);
    }

    if (sourceIndex < 0 || sourceIndex >= tracks.length) return tracks;

    let targetIndex = -1;
    if (targetTrackIdOrIndex === 'up') {
      targetIndex = sourceIndex > 0 ? sourceIndex - 1 : tracks.length - 1;
    } else if (targetTrackIdOrIndex === 'down') {
      targetIndex = sourceIndex < tracks.length - 1 ? sourceIndex + 1 : 0;
    } else if (typeof targetTrackIdOrIndex === 'number') {
      targetIndex = targetTrackIdOrIndex;
    } else if (['kick', 'snare', 'hihat', 'melody'].includes(targetTrackIdOrIndex as string)) {
      targetIndex = tracks.findIndex((t) => t.instrument === targetTrackIdOrIndex);
    } else {
      targetIndex = tracks.findIndex((t) => t.id === targetTrackIdOrIndex);
    }

    if (targetIndex < 0 || targetIndex >= tracks.length || targetIndex === sourceIndex) {
      return tracks;
    }

    const updated = [...tracks];
    const sourceSteps = updated[sourceIndex].steps;
    const sourceNotes = updated[sourceIndex].notes;

    updated[sourceIndex] = {
      ...updated[sourceIndex],
      steps: updated[targetIndex].steps,
      notes: updated[targetIndex].notes,
    };

    updated[targetIndex] = {
      ...updated[targetIndex],
      steps: sourceSteps,
      notes: sourceNotes,
    };

    return updated;
  }

  public clearTrack(tracks: Track[], trackId: string): Track[] {
    return tracks.map((track) => {
      if (track.id === trackId) {
        return {
          ...track,
          steps: new Array(64).fill(false),
          notes: track.notes ? new Array(64).fill(track.pitch || 'C3') : undefined,
        };
      }
      return track;
    });
  }

  public clearAll(tracks: Track[]): Track[] {
    return tracks.map((track) => ({
      ...track,
      steps: new Array(64).fill(false),
      notes: track.notes ? new Array(64).fill(track.pitch || 'C3') : undefined,
    }));
  }

  public randomizePattern(
    tracks: Track[],
    trackId: string | 'all' = 'all',
    barIndex?: number
  ): Track[] {
    return tracks.map((track) => {
      if (trackId !== 'all' && track.id !== trackId) return track;

      const density = track.instrument === 'kick' ? 0.3 : track.instrument === 'snare' ? 0.25 : 0.4;

      if (barIndex !== undefined && barIndex >= 0 && barIndex <= 3) {
        const newSteps = [...track.steps];
        for (let i = barIndex * 16; i < (barIndex + 1) * 16; i++) {
          newSteps[i] = Math.random() < density;
        }
        return { ...track, steps: newSteps };
      } else {
        const newSteps = Array.from({ length: 64 }, () => Math.random() < density);
        return { ...track, steps: newSteps };
      }
    });
  }
}

export const audioEngine = new AudioEngine();
