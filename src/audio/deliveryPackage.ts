/**
 * The real delivery package for Room 6.
 *
 * Both export paths used to invent their output: the modal wrote a few lines of
 * text and named it a WAV, and the delivery manifest listed four files at URLs
 * like /export/master_24_48.wav that were never written, under a project name
 * ("Cyber Groove") that belonged to no session. The bounce, the encoders and
 * the loudness measurement were all real and finished — nothing was plumbed
 * into them.
 *
 * This renders the project once, encodes it, bounces each track on its own for
 * stems, zips those, and writes a provenance record whose hashes are taken over
 * the actual exported bytes rather than over a description of them.
 */

import { AudioAsset, MasteringDspChain, SeedSignatureRecord, Track } from '../types/daw';
import { renderMasterBounce } from './masterRender';
import { masteringTelemetryEngine, LoudnessTelemetryReport } from './masteringTelemetryEngine';
import { audioEncoders } from '../lib/audioEncoders';

export interface DeliveryFile {
  /** File name as downloaded. */
  name: string;
  /** What it is, in the creator's language. */
  label: string;
  blob: Blob;
  /** Object URL — call `disposeDelivery` when the package is replaced. */
  url: string;
  byteLength: number;
  sampleRate?: number;
  bitDepth?: number;
  /** SHA-256 over the file's own bytes. */
  sha256: string;
}

export interface DeliveryStem extends DeliveryFile {
  trackId: string;
  trackName: string;
  role: string;
  eventsRendered: number;
}

export interface DeliveryPackage {
  packageId: string;
  projectName: string;
  generatedAt: string;
  bpm: number;
  durationSeconds: number;
  eventsRendered: number;
  measurement: LoudnessTelemetryReport;
  masters: DeliveryFile[];
  stems: DeliveryStem[];
  stemsZip: DeliveryFile | null;
  provenance: DeliveryFile;
  /** Tracks that rendered silent, named so the gap is visible rather than implied. */
  silentTracks: string[];
  /** What the true-peak stage did to the master, or null when bypassed. */
  truePeakLimiting: {
    inputTruePeakDbtp: number;
    outputTruePeakDbtp: number;
    maxGainReductionDb: number;
    withinCeiling: boolean;
  } | null;
}

export interface BuildDeliveryOptions {
  tracks: Track[];
  bpm: number;
  chain: MasteringDspChain;
  projectName: string;
  creatorName?: string;
  seedRecords?: SeedSignatureRecord[];
  masterVersion?: string;
  /** Assets backing timeline clips, so the export contains them. */
  audioAssets?: Record<string, AudioAsset>;
  /** Song length. Without it the export would stop at the old four bars. */
  bars?: number;
  /** Progress for the UI: 0..1 with a short label. */
  onProgress?: (fraction: number, label: string) => void;
}

const CRC32_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC32_TABLE[i] = c >>> 0;
}

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC32_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/**
 * Minimal ZIP writer, stored (uncompressed) entries only.
 *
 * Deflate would buy almost nothing on 24-bit PCM and would mean pulling in a
 * compression library; a stored archive is a real, standard ZIP that any tool
 * opens.
 */
export function zipStore(files: { name: string; data: Uint8Array }[]): Uint8Array {
  const encoder = new TextEncoder();
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = encoder.encode(file.name);
    const sum = crc32(file.data);

    const local = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true); // local file header
    lv.setUint16(4, 20, true); // version needed
    lv.setUint16(6, 0, true); // flags
    lv.setUint16(8, 0, true); // stored
    lv.setUint16(10, 0, true); // mod time
    lv.setUint16(12, 0x21, true); // mod date (1 Jan 1980 is 0x21 in DOS date terms)
    lv.setUint32(14, sum, true);
    lv.setUint32(18, file.data.length, true);
    lv.setUint32(22, file.data.length, true);
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true);
    local.set(nameBytes, 30);

    const central = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true); // central directory header
    cv.setUint16(4, 20, true); // version made by
    cv.setUint16(6, 20, true); // version needed
    cv.setUint16(8, 0, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, 0, true);
    cv.setUint16(14, 0x21, true);
    cv.setUint32(16, sum, true);
    cv.setUint32(20, file.data.length, true);
    cv.setUint32(24, file.data.length, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0, true);
    cv.setUint32(42, offset, true);
    central.set(nameBytes, 46);

    locals.push(local, file.data);
    centrals.push(central);
    offset += local.length + file.data.length;
  }

  const centralSize = centrals.reduce((sum, c) => sum + c.length, 0);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true); // end of central directory
  ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);

  const total = offset + centralSize + end.length;
  const out = new Uint8Array(total);
  let cursor = 0;
  for (const part of [...locals, ...centrals, end]) {
    out.set(part, cursor);
    cursor += part.length;
  }
  return out;
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const view = new Uint8Array(bytes.length);
  view.set(bytes);
  const digest = await crypto.subtle.digest('SHA-256', view.buffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function fileFrom(
  name: string,
  label: string,
  bytes: Uint8Array,
  type: string,
  extras: { sampleRate?: number; bitDepth?: number } = {},
): Promise<DeliveryFile> {
  const blob = new Blob([bytes], { type });
  return {
    name,
    label,
    blob,
    url: URL.createObjectURL(blob),
    byteLength: bytes.length,
    sha256: await sha256Hex(bytes),
    ...extras,
  };
}

async function blobBytes(blob: Blob): Promise<Uint8Array> {
  return new Uint8Array(await blob.arrayBuffer());
}

export function slugify(name: string, fallback = 'soulsonus_master'): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return slug || fallback;
}

/** Frees the object URLs a package holds. Call before replacing one. */
export function disposeDelivery(pkg: DeliveryPackage | null): void {
  if (!pkg) return;
  for (const file of [...pkg.masters, ...pkg.stems, pkg.provenance, pkg.stemsZip]) {
    if (file) URL.revokeObjectURL(file.url);
  }
}

export async function buildDeliveryPackage(options: BuildDeliveryOptions): Promise<DeliveryPackage> {
  const {
    tracks,
    bpm,
    chain,
    projectName,
    creatorName,
    seedRecords = [],
    masterVersion = '1.0.0',
    audioAssets = {},
    bars,
    onProgress,
  } = options;

  const report = (fraction: number, label: string) => onProgress?.(fraction, label);
  const base = slugify(projectName);

  report(0.05, 'Rendering master');
  const master = await renderMasterBounce({ tracks, bpm, chain, audioAssets, bars });
  if (master.eventsRendered === 0) {
    throw new Error('Nothing to export — the project rendered silent. Add or unmute a track first.');
  }

  const left = master.buffer.getChannelData(0);
  const right = master.buffer.numberOfChannels > 1 ? master.buffer.getChannelData(1) : left;
  const measurement = masteringTelemetryEngine.measureLoudness(left, right, master.sampleRate);
  const stereoRight = master.buffer.numberOfChannels > 1 ? right : null;

  report(0.3, 'Encoding masters');
  const wav24 = audioEncoders.encode24BitWav(left, stereoRight, master.sampleRate);
  const wav16 = audioEncoders.encode16BitWav(left, stereoRight, master.sampleRate);
  const flac = audioEncoders.encodeFlac(left, stereoRight, master.sampleRate);

  const masters: DeliveryFile[] = [
    await fileFrom(`${base}_24bit.wav`, `Master — 24-bit / ${master.sampleRate / 1000} kHz WAV`,
      await blobBytes(wav24.dataBlob), 'audio/wav', { sampleRate: wav24.sampleRate, bitDepth: 24 }),
    await fileFrom(`${base}_16bit.wav`, `Master — 16-bit / ${master.sampleRate / 1000} kHz WAV`,
      await blobBytes(wav16.dataBlob), 'audio/wav', { sampleRate: wav16.sampleRate, bitDepth: 16 }),
    await fileFrom(`${base}.flac`, 'Master — lossless FLAC',
      await blobBytes(flac.dataBlob), 'audio/flac', { sampleRate: flac.sampleRate, bitDepth: 24 }),
  ];

  // One bounce per track through the same chain, so a stem sounds like its
  // share of the master rather than like a different render.
  const stems: DeliveryStem[] = [];
  const silentTracks: string[] = [];
  for (let i = 0; i < tracks.length; i++) {
    const track = tracks[i];
    report(0.35 + (0.45 * i) / Math.max(1, tracks.length), `Bouncing stem: ${track.name}`);
    const stem = await renderMasterBounce({ tracks, bpm, chain, audioAssets, bars, onlyTrackIds: [track.id] });
    if (stem.eventsRendered === 0) {
      silentTracks.push(track.name);
      continue;
    }
    const stemLeft = stem.buffer.getChannelData(0);
    const stemRight = stem.buffer.numberOfChannels > 1 ? stem.buffer.getChannelData(1) : null;
    const encoded = audioEncoders.encode24BitWav(stemLeft, stemRight, stem.sampleRate);
    const file = await fileFrom(
      `${slugify(track.name, track.id)}.wav`,
      `${track.name} — 24-bit stem`,
      await blobBytes(encoded.dataBlob),
      'audio/wav',
      { sampleRate: encoded.sampleRate, bitDepth: 24 },
    );
    stems.push({ ...file, trackId: track.id, trackName: track.name, role: track.instrument, eventsRendered: stem.eventsRendered });
  }

  report(0.85, 'Packaging stems');
  const stemsZip = stems.length
    ? await fileFrom(
        `${base}_stems.zip`,
        `Production stems — ${stems.length} × 24-bit WAV`,
        zipStore(await Promise.all(stems.map(async (s) => ({ name: s.name, data: await blobBytes(s.blob) })))),
        'application/zip',
      )
    : null;

  report(0.95, 'Writing provenance');
  const generatedAt = new Date().toISOString();
  const packageId = `pkg_master_${Date.now()}`;
  const provenanceBody = {
    packageId,
    projectName,
    masterVersion,
    creator: creatorName || null,
    generatedAt,
    bpm,
    durationSeconds: Number(master.durationSeconds.toFixed(3)),
    sampleRate: master.sampleRate,
    voicesRendered: master.eventsRendered,
    truePeakLimiter: master.truePeakLimiting
      ? {
          ceilingDbtp: chain.targetDbtp,
          beforeDbtp: master.truePeakLimiting.inputTruePeakDbtp,
          afterDbtp: master.truePeakLimiting.outputTruePeakDbtp,
          maxGainReductionDb: master.truePeakLimiting.maxGainReductionDb,
          withinCeiling: master.truePeakLimiting.withinCeiling,
        }
      : null,
    loudness: {
      integratedLufs: measurement.integratedLufs,
      truePeakDbtp: measurement.truePeakDbtp,
      samplePeakDbfs: measurement.samplePeakDbfs,
      shortTermLufs: measurement.shortTermLufs,
      crestFactorDb: measurement.crestFactorDb,
      phaseCorrelation: measurement.phaseCorrelation,
      streamingCompliant: measurement.isStreamingCompliant,
      standard: 'ITU-R BS.1770-4 / EBU Tech 3341, gated integrated',
    },
    masteringChain: {
      id: chain.id,
      name: chain.name,
      targetLufs: chain.targetLufs,
      targetDbtp: chain.targetDbtp,
      slots: chain.slots.map((slot) => ({ id: slot.id, type: slot.type, bypassed: !!slot.bypassed, parameters: slot.parameters })),
    },
    tracks: tracks.map((t) => ({
      id: t.id,
      name: t.name,
      role: t.instrument,
      notes: (t.noteEvents || []).length,
      muted: !!t.mute,
      volumeDb: t.volume,
    })),
    silentTracks,
    // Hashes are taken over the bytes of the files in this package, so the
    // record can be checked against them rather than merely asserted.
    files: [...masters, ...stems, ...(stemsZip ? [stemsZip] : [])].map((f) => ({
      name: f.name,
      bytes: f.byteLength,
      sha256: f.sha256,
    })),
    seedSignatures: seedRecords.map((r) => ({
      id: r.id,
      assetId: r.assetId,
      assetType: r.assetType,
      hash: r.hash,
      signerName: r.signerName,
      timestamp: r.timestamp,
      status: r.status,
    })),
  };

  const provenance = await fileFrom(
    `${base}_provenance.json`,
    'SeedSignature provenance record',
    new TextEncoder().encode(JSON.stringify(provenanceBody, null, 2)),
    'application/json',
  );

  report(1, 'Ready');

  return {
    packageId,
    projectName,
    generatedAt,
    bpm,
    durationSeconds: master.durationSeconds,
    eventsRendered: master.eventsRendered,
    measurement,
    masters,
    stems,
    stemsZip,
    provenance,
    silentTracks,
    truePeakLimiting: master.truePeakLimiting
      ? {
          inputTruePeakDbtp: master.truePeakLimiting.inputTruePeakDbtp,
          outputTruePeakDbtp: master.truePeakLimiting.outputTruePeakDbtp,
          maxGainReductionDb: master.truePeakLimiting.maxGainReductionDb,
          withinCeiling: master.truePeakLimiting.withinCeiling,
        }
      : null,
  };
}

/** Triggers a browser download for one file in the package. */
export function downloadDeliveryFile(file: DeliveryFile): void {
  const a = document.createElement('a');
  a.href = file.url;
  a.download = file.name;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
