import { Track, DetectionProfile } from '../types/daw';

export interface DetectionCallbacks {
  onKickTrigger?: () => void;
  onSnareTrigger?: () => void;
  onTrackTrigger?: (trackId: string, pitch?: string) => void;
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

  private lastTriggerTimes: Record<string, number> = {};
  private debounceMs = 110;

  private activeTracks: Track[] = [];
  private callbacks: DetectionCallbacks | null = null;

  // Calibration state
  private isCalibrating = false;
  private calibratingTrackId: string | null = null;

  public setCallbacks(callbacks: DetectionCallbacks) {
    this.callbacks = callbacks;
  }

  public setTracks(tracks: Track[]) {
    this.activeTracks = tracks;
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
    let SIZE = buf.length;
    let rms = 0;
    for (let i = 0; i < SIZE; i++) {
      const val = buf[i];
      rms += val * val;
    }
    rms = Math.sqrt(rms / SIZE);
    if (rms < 0.01) return -1;

    let r1 = 0;
    let r2 = SIZE - 1;
    const thres = 0.2;
    for (let i = 0; i < SIZE / 2; i++) {
      if (Math.abs(buf[i]) < thres) {
        r1 = i;
        break;
      }
    }
    for (let i = 1; i < SIZE / 2; i++) {
      if (Math.abs(buf[SIZE - i]) < thres) {
        r2 = SIZE - i;
        break;
      }
    }

    const sliced = buf.slice(r1, r2);
    SIZE = sliced.length;

    const c = new Float32Array(SIZE);
    for (let i = 0; i < SIZE; i++) {
      for (let j = 0; j < SIZE - i; j++) {
        c[i] = c[i] + sliced[j] * sliced[j + i];
      }
    }

    let d = 0;
    while (c[d] > c[d + 1]) d++;
    let maxval = -1;
    let maxpos = -1;
    for (let i = d; i < SIZE; i++) {
      if (c[i] > maxval) {
        maxval = c[i];
        maxpos = i;
      }
    }
    let T0 = maxpos;

    if (T0 <= 0 || T0 >= SIZE - 1) return -1;

    const x1 = c[T0 - 1];
    const x2 = c[T0];
    const x3 = c[T0 + 1];
    const a = (x1 + x3 - 2 * x2) / 2;
    const b = (x3 - x1) / 2;
    if (a) T0 = T0 - b / (2 * a);

    return sampleRate / T0;
  }

  private freqToNoteName(freq: number): string {
    if (freq < 50 || freq > 2000) return 'C3';
    const noteNum = Math.round(12 * Math.log2(freq / 440) + 69);
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const octave = Math.floor(noteNum / 12) - 1;
    const noteName = noteNames[((noteNum % 12) + 12) % 12];
    return `${noteName}${Math.max(1, Math.min(6, octave))}`;
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

    // Omni-Take & Multi-Track Detection Loop
    if (this.activeTracks.length > 0) {
      let detectedPitchName: string | undefined = undefined;

      // Calculate pitch if any track is melodic or marked as isMelodic
      const hasMelodicTrack = this.activeTracks.some(
        (t) => t.instrument === 'melody' || t.instrument === 'vocal_synth' || t.detectionProfile?.isMelodic
      );
      if (hasMelodicTrack) {
        const pitchHz = this.autoCorrelate(timeData, sampleRate);
        if (pitchHz > 60 && pitchHz < 1500) {
          detectedPitchName = this.freqToNoteName(pitchHz);
        }
      }

      this.activeTracks.forEach((track) => {
        if (track.mute) return;

        let trackEnergy = 0;
        let thresh = 0.35;

        if (track.detectionProfile && track.detectionProfile.centerFreq > 0) {
          const profile = track.detectionProfile;
          thresh = profile.threshold;

          // Band energy calculation around centerFreq
          const bandWidthHz = profile.centerFreq / (profile.q || 2.0);
          const startHz = Math.max(20, profile.centerFreq - bandWidthHz / 2);
          const endHz = Math.min(10000, profile.centerFreq + bandWidthHz / 2);

          const startBin = Math.floor(startHz / binHz);
          const endBin = Math.ceil(endHz / binHz);

          let sum = 0;
          let count = 0;
          for (let i = startBin; i <= endBin && i < bufferLength; i++) {
            sum += freqData[i];
            count++;
          }
          trackEnergy = count > 0 ? sum / count / 255 : 0;
        } else {
          // Fallback based on instrument type
          if (track.instrument === 'kick') {
            trackEnergy = lowEnergy;
            thresh = this.kickThreshold;
          } else if (track.instrument === 'snare') {
            trackEnergy = highEnergy;
            thresh = this.snareThreshold;
          } else if (track.instrument === 'hihat') {
            trackEnergy = highEnergy * 0.9;
            thresh = Math.max(0.2, this.snareThreshold * 0.8);
          } else {
            // Mid-range energy for melody/bass/other
            const midStartBin = Math.floor(250 / binHz);
            const midEndBin = Math.ceil(2000 / binHz);
            let midSum = 0;
            let midCount = 0;
            for (let i = midStartBin; i <= midEndBin && i < bufferLength; i++) {
              midSum += freqData[i];
              midCount++;
            }
            trackEnergy = midCount > 0 ? midSum / midCount / 255 : 0;
            thresh = 0.3;
          }
        }

        const lastTrigger = this.lastTriggerTimes[track.id] || 0;
        if (trackEnergy >= thresh && now - lastTrigger > this.debounceMs) {
          this.lastTriggerTimes[track.id] = now;

          const triggerPitch =
            track.instrument === 'melody' || track.instrument === 'vocal_synth' || track.detectionProfile?.isMelodic
              ? detectedPitchName || track.pitch || 'C3'
              : track.pitch;

          if (this.callbacks?.onTrackTrigger) {
            this.callbacks.onTrackTrigger(track.id, triggerPitch);
          }

          // Legacy fallbacks
          if (track.instrument === 'kick' && this.callbacks?.onKickTrigger) {
            this.callbacks.onKickTrigger();
          } else if (track.instrument === 'snare' && this.callbacks?.onSnareTrigger) {
            this.callbacks.onSnareTrigger();
          }
        }
      });
    }

    this.animFrameId = requestAnimationFrame(this.analyzeLoop);
  };
}

export const detectionEngine = new DetectionEngine();
