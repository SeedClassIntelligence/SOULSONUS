import { Track, DetectionProfile } from '../types/daw';
import {
  BandEnergies,
  PerformanceClass,
  PERCUSSIVE_CLASSES,
  PERFORMANCE_CLASSES,
  TONAL_CLASSES,
  classifyOnset,
  extractFeatures,
  rmsToVelocity,
  autoCorrelate,
  freqToNoteName,
  MIN_TRACKABLE_HZ,
  MAX_TRACKABLE_HZ,
} from './performanceClassifier';

/** Which capture button armed the mic. Constrains the eligible class taxonomy. */
export type CaptureModality = 'MOUTH' | 'BODY' | 'KEYS';

/** One detected, classified performance event. Routed to exactly one channel. */
export interface CaptureEvent {
  klass: PerformanceClass;
  /** MIDI velocity 1..127, derived from the onset's measured RMS. */
  velocity: number;
  /** Classifier margin over the runner-up class, 0..1. */
  confidence: number;
  centroidHz: number;
  /** Fundamental in Hz for tonal events, -1 otherwise. */
  pitchHz: number;
  /** Note name for tonal events, undefined for percussive ones. */
  pitch?: string;
  bands: BandEnergies;
  /** Loudest single band, 0..1 — used to test calibrated profile thresholds. */
  bandPeak: number;
  /** Sum of band means — how much signal the frame actually carried. */
  spectralEnergy: number;
  rms: number;
  modality: CaptureModality | null;
  atMs: number;
  /** How this event was produced. Live mic events are positioned by the playhead. */
  source?: 'MIC' | 'FILE' | 'MIDI';
  /** Position within the source material, for events that carry their own timeline. */
  atSeconds?: number;
  /** Explicit MIDI note number, when the source already knows the exact pitch. */
  midiNote?: number;
}

export interface DetectionCallbacks {
  onKickTrigger?: () => void;
  onSnareTrigger?: () => void;
  /** Fires once per detected onset, already classified. Routing is the caller's job. */
  onCaptureEvent?: (event: CaptureEvent) => void;
  onMeterUpdate?: (lowLevel: number, highLevel: number) => void;
}

export class DetectionEngine {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private gainNode: GainNode | null = null;

  private animFrameId: number | null = null;
  private isListening = false;

  private kickThreshold = 0.4;
  private snareThreshold = 0.4;
  private micGain = 1.5;

  private activeTracks: Track[] = [];
  private callbacks: DetectionCallbacks | null = null;

  // --- onset detection state ---------------------------------------------
  private captureModality: CaptureModality | null = null;
  private prevRms = 0;
  private lastOnsetAt = 0;
  /** Minimum gap between two onsets. Below this, one hit reads as several. */
  private onsetDebounceMs = 70;
  /** Decaying running peak RMS, so velocity tracks this performance's dynamics. */
  private peakRms = 0.05;
  /** Last emitted MIDI note in tonal capture, so a held hum re-fires on pitch change. */
  private lastTonalMidi: number | null = null;
  private lastTonalEmitAt = 0;
  private listeningSince = 0;
  /** Bounded ring buffer of recent events, for diagnostics and verification. */
  public readonly recentEvents: CaptureEvent[] = [];

  // Calibration state
  private isCalibrating = false;
  private calibratingTrackId: string | null = null;

  public setCallbacks(callbacks: DetectionCallbacks) {
    this.callbacks = callbacks;
  }

  public setTracks(tracks: Track[]) {
    this.activeTracks = tracks;
  }

  /**
   * Arms the mic for a specific kind of performance. This is what makes
   * separation tractable: a beatbox take is scored only against percussive
   * classes, a hum take only against pitched ones.
   */
  public setCaptureModality(modality: CaptureModality | null) {
    this.captureModality = modality;
    this.lastTonalMidi = null;
    this.prevRms = 0;
  }

  /**
   * The microphone this engine already has open, if it is listening.
   *
   * Recording a take used to call `getUserMedia` a second time, so a
   * performance was captured from a different stream than the one being
   * analysed. Two streams on one device is a race at best -- and where the
   * device hands its audio to only one consumer, the take records digital
   * silence while the meters happily move. One microphone, tapped twice.
   */
  public getMediaStream(): MediaStream | null {
    return this.mediaStream;
  }

  public getCaptureModality(): CaptureModality | null {
    return this.captureModality;
  }

  /** Classes the armed modality is allowed to produce. */
  private eligibleClasses(): PerformanceClass[] {
    if (this.captureModality === 'KEYS') return TONAL_CLASSES;
    if (this.captureModality === 'MOUTH' || this.captureModality === 'BODY') return PERCUSSIVE_CLASSES;
    return [...PERFORMANCE_CLASSES];
  }

  public updateSettings(kickThresh: number, snareThresh: number, gain: number) {
    this.kickThreshold = kickThresh;
    this.snareThreshold = snareThresh;
    this.micGain = gain;
    if (this.gainNode) {
      this.gainNode.gain.value = gain;
    }
  }

  public async start(): Promise<boolean> {
    if (this.isListening) return true;

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: false, // Keep raw transient dynamics for beatboxing
          autoGainControl: false,
        },
      });

      this.audioContext = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 1024; // High frequency resolution
      this.analyser.smoothingTimeConstant = 0.2;

      this.micSource = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = this.micGain;

      this.micSource.connect(this.gainNode);
      this.gainNode.connect(this.analyser);

      this.isListening = true;
      this.listeningSince = Date.now();
      // Expose the diagnostic ring buffer so capture behaviour can be verified
      // from outside the app (see scripts/live-verification).
      (globalThis as unknown as Record<string, unknown>).__soulsonusCaptureEvents = this.recentEvents;
      this.prevRms = 0;
      this.analyzeLoop();
      return true;
    } catch (err) {
      console.error('Error accessing microphone for detection engine:', err);
      return false;
    }
  }

  public stop() {
    this.isListening = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  public isActive(): boolean {
    return this.isListening;
  }

  /**
   * Phase 5 - Personal Training:
   * Calibrate a specific track's vocal sound by listening for durationMs (2s).
   * Analyzes peak frequency and RMS level of the input.
   */
  public async calibrateTrack(
    trackId: string,
    durationMs = 2000,
    onProgress?: (progressRatio: number) => void
  ): Promise<DetectionProfile | null> {
    const started = await this.start();
    if (!started || !this.analyser) return null;

    this.isCalibrating = true;
    this.calibratingTrackId = trackId;

    const sampleRate = this.audioContext?.sampleRate || 44100;
    const fftSize = this.analyser.fftSize;
    const bufferLength = this.analyser.frequencyBinCount;

    const peakBins = new Uint32Array(bufferLength);
    let maxRms = 0;
    let sumRms = 0;
    let sampleCount = 0;

    const startTime = Date.now();
    const timeDomainBuffer = new Float32Array(fftSize);
    const freqData = new Uint8Array(bufferLength);

    const pitchSamples: number[] = [];

    return new Promise((resolve) => {
      const interval = setInterval(() => {
        if (!this.analyser) return;

        const elapsed = Date.now() - startTime;
        const progress = Math.min(1, elapsed / durationMs);
        onProgress?.(progress);

        this.analyser.getByteFrequencyData(freqData);
        this.analyser.getFloatTimeDomainData(timeDomainBuffer);

        // Calculate RMS
        let squareSum = 0;
        for (let i = 0; i < timeDomainBuffer.length; i++) {
          squareSum += timeDomainBuffer[i] * timeDomainBuffer[i];
        }
        const rms = Math.sqrt(squareSum / timeDomainBuffer.length);
        if (rms > maxRms) maxRms = rms;
        sumRms += rms;
        sampleCount++;

        // Track energy distribution across frequency bins
        let maxBinVal = 0;
        let maxBinIdx = 0;
        for (let i = 2; i < bufferLength - 10; i++) {
          if (freqData[i] > maxBinVal) {
            maxBinVal = freqData[i];
            maxBinIdx = i;
          }
        }
        if (maxBinVal > 30) {
          peakBins[maxBinIdx] += maxBinVal;
        }

        // Pitch estimate
        const pitch = this.autoCorrelate(timeDomainBuffer, sampleRate);
        if (pitch > 60 && pitch < 1200) {
          pitchSamples.push(pitch);
        }

        if (elapsed >= durationMs) {
          clearInterval(interval);
          this.isCalibrating = false;
          this.calibratingTrackId = null;

          // Find overall peak bin
          let highestBin = 0;
          let highestScore = 0;
          for (let i = 1; i < bufferLength; i++) {
            if (peakBins[i] > highestScore) {
              highestScore = peakBins[i];
              highestBin = i;
            }
          }

          const binHz = sampleRate / fftSize;
          const centerFreq = Math.round(Math.max(50, Math.min(8000, highestBin * binHz)));
          const avgRms = sampleCount > 0 ? sumRms / sampleCount : 0.1;

          // Threshold based on peak RMS and average
          const threshold = parseFloat(Math.max(0.12, Math.min(0.75, maxRms * 0.5 + avgRms * 0.2)).toFixed(2));
          const isMelodic = pitchSamples.length > sampleCount * 0.35;

          const profile: DetectionProfile = {
            centerFreq,
            q: 2.0,
            threshold,
            isMelodic,
            lastCalibrated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          };

          resolve(profile);
        }
      }, 50);
    });
  }

  public getIsCalibrating(): boolean {
    return this.isCalibrating;
  }

  public getCalibratingTrackId(): string | null {
    return this.calibratingTrackId;
  }

  private autoCorrelate(buf: Float32Array, sampleRate: number): number {
    return autoCorrelate(buf, sampleRate);
  }

  private freqToNoteName(freq: number): string {
    return freqToNoteName(freq);
  }

  private analyzeLoop = () => {
    if (!this.isListening || !this.analyser) return;

    const bufferLength = this.analyser.frequencyBinCount;
    const freqData = new Uint8Array(bufferLength);
    const timeData = new Float32Array(this.analyser.fftSize);

    this.analyser.getByteFrequencyData(freqData);
    this.analyser.getFloatTimeDomainData(timeData);

    const sampleRate = this.audioContext?.sampleRate || 44100;
    const binHz = sampleRate / this.analyser.fftSize;

    // Measure overall meter energy for low / high
    const lowStartBin = Math.floor(20 / binHz);
    const lowEndBin = Math.ceil(250 / binHz);
    let lowSum = 0;
    let lowCount = 0;
    for (let i = lowStartBin; i <= lowEndBin && i < bufferLength; i++) {
      lowSum += freqData[i];
      lowCount++;
    }
    const lowEnergy = lowCount > 0 ? lowSum / lowCount / 255 : 0;

    const highStartBin = Math.floor(1800 / binHz);
    const highEndBin = Math.ceil(8000 / binHz);
    let highSum = 0;
    let highCount = 0;
    for (let i = highStartBin; i <= highEndBin && i < bufferLength; i++) {
      highSum += freqData[i];
      highCount++;
    }
    const highEnergy = highCount > 0 ? highSum / highCount / 255 : 0;

    if (this.callbacks?.onMeterUpdate) {
      this.callbacks.onMeterUpdate(lowEnergy, highEnergy);
    }

    const now = Date.now();

    // --- Single-onset detection -------------------------------------------
    // One performed sound produces exactly one event. Previously every track
    // thresholded its own band independently, so a single hit fired on all of
    // them at once (and snare/hi-hat shared a band, making them inseparable).
    let sumSq = 0;
    for (let i = 0; i < timeData.length; i++) sumSq += timeData[i] * timeData[i];
    const rms = Math.sqrt(sumSq / Math.max(1, timeData.length));

    const floor = Math.max(0.012, Math.min(this.kickThreshold, this.snareThreshold) * 0.12);
    const rising = rms > this.prevRms * 1.35 || (this.prevRms < floor && rms >= floor);
    const pastDebounce = now - this.lastOnsetAt >= this.onsetDebounceMs;
    const isOnset = rms >= floor && rising && pastDebounce;

    // Track this performance's dynamic range so velocity is relative, not absolute.
    this.peakRms = Math.max(rms, this.peakRms * 0.999);

    const tonalMode =
      this.captureModality === 'KEYS' ||
      (this.captureModality === null &&
        this.activeTracks.some(
          (t) => t.instrument === 'melody' || t.instrument === 'vocal_synth' || t.detectionProfile?.isMelodic
        ));

    let pitchHz = -1;
    if (tonalMode && rms >= floor) {
      pitchHz = this.autoCorrelate(timeData, sampleRate);
      if (!(pitchHz > MIN_TRACKABLE_HZ && pitchHz < MAX_TRACKABLE_HZ)) pitchHz = -1;
    }

    // A sustained hum has one onset but many notes: re-fire when the pitch moves.
    let tonalPitchChange = false;
    if (tonalMode && pitchHz > 0 && rms >= floor) {
      const midi = Math.round(12 * Math.log2(pitchHz / 440) + 69);
      if (
        this.lastTonalMidi !== null &&
        midi !== this.lastTonalMidi &&
        now - this.lastTonalEmitAt >= this.onsetDebounceMs + 20
      ) {
        tonalPitchChange = true;
      }
    }

    if (isOnset || tonalPitchChange) {
      this.lastOnsetAt = now;

      const features = extractFeatures(freqData, timeData, sampleRate, this.analyser.fftSize, pitchHz);
      const { klass, confidence } = classifyOnset(features, this.eligibleClasses());

      const bandPeak = Math.max(
        features.bands.sub,
        features.bands.low,
        features.bands.lowMid,
        features.bands.mid,
        features.bands.high,
        features.bands.air
      );

      let pitchName: string | undefined;
      if (klass === 'tonal_low' || klass === 'tonal_high') {
        if (pitchHz > 0) {
          pitchName = this.freqToNoteName(pitchHz);
          this.lastTonalMidi = Math.round(12 * Math.log2(pitchHz / 440) + 69);
          this.lastTonalEmitAt = now;
        }
      }

      const event: CaptureEvent = {
        klass,
        velocity: rmsToVelocity(rms, this.peakRms),
        confidence,
        centroidHz: features.centroidHz,
        pitchHz,
        pitch: pitchName,
        bands: features.bands,
        bandPeak,
        spectralEnergy: features.spectralEnergy,
        rms,
        modality: this.captureModality,
        atMs: now,
      };

      if (this.recentEvents.length >= 200) this.recentEvents.shift();
      this.recentEvents.push(event);

      this.callbacks?.onCaptureEvent?.(event);

      if (klass === 'kick') this.callbacks?.onKickTrigger?.();
      else if (klass === 'snare') this.callbacks?.onSnareTrigger?.();
    }

    this.prevRms = rms;

    this.animFrameId = requestAnimationFrame(this.analyzeLoop);
  };
}

export const detectionEngine = new DetectionEngine();
