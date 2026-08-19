/**
 * Registering audio and placing it on the timeline.
 *
 * A track could hold notes but not audio, which meant a recorded take, an
 * imported file, a separated stem and anything a realization engine returns all
 * had nowhere to live. This is the missing half: immutable assets, and clips
 * that point at them from a musical position.
 *
 * Nothing here knows about any particular source of audio. A microphone, a
 * bounce and a model all arrive the same way.
 */

import { AudioAsset, AudioAssetOrigin, AudioClip, Track } from '../types/daw';
import { PPQ } from '../utils/musicMath';

/** Points across the whole asset. Enough to read a shape at lane width. */
const WAVEFORM_POINTS = 256;

/** Peak magnitude per slice, taken from the decoded audio rather than invented. */
function peaksFromBuffer(buffer: AudioBuffer, points = WAVEFORM_POINTS): number[] {
  const data = buffer.getChannelData(0);
  const per = Math.max(1, Math.floor(data.length / points));
  const out: number[] = [];
  for (let i = 0; i < points; i++) {
    let peak = 0;
    const start = i * per;
    const end = Math.min(data.length, start + per);
    for (let j = start; j < end; j++) {
      const v = data[j] < 0 ? -data[j] : data[j];
      if (v > peak) peak = v;
    }
    out.push(Math.round(peak * 1000) / 1000);
  }
  return out;
}

export interface RegisterAssetOptions {
  name: string;
  originType: AudioAssetOrigin;
  parentAssetIds?: string[];
}

/** SHA-256 of the exact bytes, so a lineage record can be checked rather than believed. */
export async function hashBytes(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Reads a blob's real properties rather than trusting what the caller claims.
 *
 * Sample rate, channel count and duration all come from decoding. A recorder
 * that reports 8.7 seconds and a file that decodes to 2.5 is a bug we want to
 * see here, not downstream.
 */
export async function registerAudioAsset(blob: Blob, options: RegisterAssetOptions): Promise<AudioAsset> {
  const bytes = await blob.arrayBuffer();
  const sha256 = await hashBytes(bytes.slice(0));

  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  let sampleRate = 48000;
  let channels = 1;
  let durationSeconds = 0;
  let peaks: number[] = [];
  if (Ctx) {
    const ctx = new Ctx();
    try {
      const decoded = await ctx.decodeAudioData(bytes.slice(0));
      sampleRate = decoded.sampleRate;
      channels = decoded.numberOfChannels;
      durationSeconds = decoded.duration;
      peaks = peaksFromBuffer(decoded);
    } catch {
      /* an undecodable blob still gets an asset; its duration stays 0 and the
         caller can see that rather than being handed a confident wrong number */
    } finally {
      if (ctx.state !== 'closed') void ctx.close();
    }
  }

  return {
    id: `asset_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: options.name,
    sampleRate,
    channels,
    durationSeconds,
    byteLength: blob.size,
    sha256,
    originType: options.originType,
    parentAssetIds: options.parentAssetIds || [],
    createdAt: Date.now(),
    peaks,
    url: URL.createObjectURL(blob),
  };
}

/** Seconds to ticks at a given tempo. The clip and the notes share this domain. */
export function secondsToTicks(seconds: number, bpm: number): number {
  return Math.max(0, Math.round((seconds * bpm * PPQ) / 60));
}

export function ticksToSeconds(ticks: number, bpm: number): number {
  return (ticks * 60) / (bpm * PPQ);
}

export interface PlaceClipOptions {
  startTick?: number;
  sourceOffsetSeconds?: number;
  sourceDurationSeconds?: number;
  gainDb?: number;
  candidateId?: string;
  sourceDescription?: string;
}

/**
 * A clip covering the asset, or the slice of it the caller asked for.
 *
 * Duration is derived from the audio and the tempo rather than passed in, so a
 * clip cannot claim a length its asset does not have.
 */
export function makeClip(
  asset: AudioAsset,
  trackId: string,
  bpm: number,
  options: PlaceClipOptions = {}
): AudioClip {
  const offset = Math.max(0, Math.min(options.sourceOffsetSeconds ?? 0, asset.durationSeconds));
  const available = Math.max(0, asset.durationSeconds - offset);
  const span = Math.max(0, Math.min(options.sourceDurationSeconds ?? available, available));

  return {
    id: `clip_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    trackId,
    assetId: asset.id,
    startTick: Math.max(0, Math.round(options.startTick ?? 0)),
    durationTicks: secondsToTicks(span, bpm),
    sourceOffsetSeconds: offset,
    sourceDurationSeconds: span,
    gainDb: options.gainDb ?? 0,
    fadeInMs: 2,
    fadeOutMs: 4,
    candidateId: options.candidateId,
    provenance: {
      origin: asset.originType,
      creatorEdited: false,
      sourceDescription: options.sourceDescription,
    },
  };
}

/** Every clip on every track, with its asset resolved. Playback and render both need this. */
export function resolveClips(
  tracks: Track[],
  assets: Record<string, AudioAsset>
): { track: Track; clip: AudioClip; asset: AudioAsset }[] {
  const out: { track: Track; clip: AudioClip; asset: AudioAsset }[] = [];
  for (const track of tracks) {
    for (const clip of track.audioClips || []) {
      const asset = assets[clip.assetId];
      // A clip whose asset is gone is skipped rather than played as silence at
      // the wrong length — the gap shows up as a missing clip, which is honest.
      if (asset && asset.url) out.push({ track, clip, asset });
    }
  }
  return out;
}

/** The last tick any clip occupies. Used to know how long a bounce must run. */
export function clipsEndTick(tracks: Track[]): number {
  let end = 0;
  for (const track of tracks) {
    for (const clip of track.audioClips || []) {
      const clipEnd = clip.startTick + clip.durationTicks;
      if (clipEnd > end) end = clipEnd;
    }
  }
  return end;
}
