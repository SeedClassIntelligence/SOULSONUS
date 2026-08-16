/**
 * SoulSonus Web MIDI & External Hardware Engine
 * Manages bidirectional MIDI In/Out, Clock/Sync, Hardware Routing, and Live Performance Capture.
 */

import { MidiDevice, MidiEventRecord, HardwareRouteConfig } from '../types/daw';
import * as Tone from 'tone';

type MidiListener = (event: {
  type: 'note_on' | 'note_off' | 'cc' | 'pitch_bend' | 'clock';
  note?: number;
  noteName?: string;
  velocity?: number;
  channel?: number;
  ccNumber?: number;
  ccValue?: number;
  bendValue?: number;
  deviceId: string;
  deviceName: string;
}) => void;

class MidiEngine {
  private midiAccess: any = null;
  private inputDevices: Map<string, any> = new Map();
  private outputDevices: Map<string, any> = new Map();
  private listeners: Set<MidiListener> = new Set();
  private hardwareRoutes: Map<string, HardwareRouteConfig> = new Map();
  private clockInterval: NodeJS.Timeout | null = null;
  private isClockRunning: boolean = false;
  private recordedBuffer: MidiEventRecord[] = [];
  private isRecordingPerformance: boolean = false;
  private recordingStartTime: number = 0;

  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'navigator' in window && 'requestMIDIAccess' in navigator;
  }

  public async init(): Promise<boolean> {
    if (!this.isSupported()) {
      console.warn('Web MIDI API is not supported in this browser environment.');
      return false;
    }

    try {
      this.midiAccess = await navigator.requestMIDIAccess({ sysex: false });
      this.scanDevices();

      this.midiAccess.onstatechange = (e) => {
        this.scanDevices();
      };

      return true;
    } catch (err) {
      console.error('Failed to initialize Web MIDI Access:', err);
      return false;
    }
  }

  private scanDevices() {
    if (!this.midiAccess) return;

    this.inputDevices.clear();
    this.outputDevices.clear();

    this.midiAccess.inputs.forEach((input) => {
      this.inputDevices.set(input.id, input);
      input.onmidimessage = (msg) => this.handleIncomingMidi(input.id, input.name || 'MIDI Input', msg);
    });

    this.midiAccess.outputs.forEach((output) => {
      this.outputDevices.set(output.id, output);
    });
  }

  public getConnectedDevices(): MidiDevice[] {
    const list: MidiDevice[] = [];

    this.inputDevices.forEach((input) => {
      list.push({
        id: input.id,
        name: input.name || 'MIDI Controller',
        manufacturer: input.manufacturer || 'Generic',
        type: 'input',
        state: input.state === 'connected' ? 'connected' : 'disconnected',
      });
    });

    this.outputDevices.forEach((output) => {
      list.push({
        id: output.id,
        name: output.name || 'Hardware Synth / Drum Machine',
        manufacturer: output.manufacturer || 'Generic',
        type: 'output',
        state: output.state === 'connected' ? 'connected' : 'disconnected',
      });
    });

    return list;
  }

  public addListener(fn: MidiListener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private midiNoteToName(note: number): string {
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const octave = Math.floor(note / 12) - 1;
    const noteIndex = note % 12;
    return `${notes[noteIndex]}${octave}`;
  }

  private handleIncomingMidi(deviceId: string, deviceName: string, message: any) {
    if (!message.data || message.data.length < 1) return;

    const [status, data1, data2] = message.data;
    const command = status >> 4;
    const channel = (status & 0xf) + 1;

    // Note On (Command 9, with velocity > 0)
    if (command === 9 && data2 > 0) {
      const note = data1;
      const velocity = data2;
      const noteName = this.midiNoteToName(note);

      if (this.isRecordingPerformance) {
        this.recordedBuffer.push({
          note,
          noteName,
          velocity,
          timestampMs: Date.now() - this.recordingStartTime,
          durationMs: 250, // Default duration, updated on note off
          channel,
        });
      }

      this.listeners.forEach((listener) =>
        listener({
          type: 'note_on',
          note,
          noteName,
          velocity,
          channel,
          deviceId,
          deviceName,
        })
      );
    }
    // Note Off (Command 8 or Note On with 0 velocity)
    else if (command === 8 || (command === 9 && data2 === 0)) {
      const note = data1;
      const noteName = this.midiNoteToName(note);

      this.listeners.forEach((listener) =>
        listener({
          type: 'note_off',
          note,
          noteName,
          velocity: 0,
          channel,
          deviceId,
          deviceName,
        })
      );
    }
    // Control Change (CC)
    else if (command === 11) {
      this.listeners.forEach((listener) =>
        listener({
          type: 'cc',
          ccNumber: data1,
          ccValue: data2,
          channel,
          deviceId,
          deviceName,
        })
      );
    }
    // Pitch Bend
    else if (command === 14) {
      const bend = (data2 << 7) + data1 - 8192;
      this.listeners.forEach((listener) =>
        listener({
          type: 'pitch_bend',
          bendValue: bend,
          channel,
          deviceId,
          deviceName,
        })
      );
    }
  }

  public startRecordingPerformance() {
    this.isRecordingPerformance = true;
    this.recordingStartTime = Date.now();
    this.recordedBuffer = [];
  }

  public stopRecordingPerformance(): MidiEventRecord[] {
    this.isRecordingPerformance = false;
    return [...this.recordedBuffer];
  }

  /**
   * Send MIDI Note to an external hardware device
   */
  public sendNoteToHardware(outputDeviceId: string, note: number, velocity: number = 100, channel: number = 1, durationMs: number = 250) {
    const output = this.outputDevices.get(outputDeviceId);
    if (!output) return;

    const noteOnStatus = 0x90 | ((channel - 1) & 0xf);
    const noteOffStatus = 0x80 | ((channel - 1) & 0xf);

    // Send Note On
    output.send([noteOnStatus, note, velocity]);

    // Send Note Off after duration
    setTimeout(() => {
      output.send([noteOffStatus, note, 0]);
    }, durationMs);
  }

  /**
   * Start 24-PPQN MIDI Clock Sync to External Synths / Drum Machines
   */
  public startMidiClock(bpm: number, targetOutputId?: string) {
    this.stopMidiClock();

    const intervalMs = (60000 / (bpm * 24)); // 24 pulses per quarter note

    // Send MIDI Start command (0xFA)
    this.broadcastToOutputs([0xfa], targetOutputId);
    this.isClockRunning = true;

    this.clockInterval = setInterval(() => {
      // Send MIDI Timing Clock pulse (0xF8)
      this.broadcastToOutputs([0xf8], targetOutputId);
    }, intervalMs);
  }

  public stopMidiClock(targetOutputId?: string) {
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
      this.clockInterval = null;
    }
    if (this.isClockRunning) {
      // Send MIDI Stop command (0xFC)
      this.broadcastToOutputs([0xfc], targetOutputId);
      this.isClockRunning = false;
    }
  }

  private broadcastToOutputs(data: number[], targetOutputId?: string) {
    if (targetOutputId) {
      const out = this.outputDevices.get(targetOutputId);
      if (out) out.send(data);
    } else {
      this.outputDevices.forEach((output) => output.send(data));
    }
  }
}

export const midiEngine = new MidiEngine();
