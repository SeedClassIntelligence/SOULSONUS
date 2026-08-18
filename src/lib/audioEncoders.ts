export interface EncodedAudioResult {
  format: string;
  sampleRate: number;
  bitDepth: number;
  channels: number;
  byteLength: number;
  dataBlob: Blob;
  dataUrl: string;
}

// CRC-8 table for FLAC frame headers (polynomial x^8 + x^2 + x^1 + 1 -> 0x07)
const FLAC_CRC8_TABLE = new Uint8Array(256);
for (let i = 0; i < 256; i++) {
  let curr = i;
  for (let j = 0; j < 8; j++) {
    curr = (curr & 0x80) ? ((curr << 1) ^ 0x07) & 0xff : (curr << 1) & 0xff;
  }
  FLAC_CRC8_TABLE[i] = curr;
}

function computeFlacCrc8(bytes: Uint8Array, start: number, len: number): number {
  let crc = 0;
  for (let i = 0; i < len; i++) {
    crc = FLAC_CRC8_TABLE[crc ^ bytes[start + i]];
  }
  return crc;
}

// CRC-16 table for FLAC frame footers (polynomial x^16 + x^15 + x^2 + 1 -> 0x8005)
const FLAC_CRC16_TABLE = new Uint16Array(256);
for (let i = 0; i < 256; i++) {
  let curr = i << 8;
  for (let j = 0; j < 8; j++) {
    curr = (curr & 0x8000) ? ((curr << 1) ^ 0x8005) & 0xffff : (curr << 1) & 0xffff;
  }
  FLAC_CRC16_TABLE[i] = curr;
}

function computeFlacCrc16(bytes: Uint8Array, start: number, len: number): number {
  let crc = 0;
  for (let i = 0; i < len; i++) {
    crc = (FLAC_CRC16_TABLE[((crc >> 8) ^ bytes[start + i]) & 0xff] ^ (crc << 8)) & 0xffff;
  }
  return crc;
}

export class AudioEncoders {
  /**
   * Encodes Float32Array audio channels into a valid 24-bit / 48kHz PCM WAV file.
   */
  public encode24BitWav(
    leftChannel: Float32Array,
    rightChannel: Float32Array | null,
    sampleRate: number = 48000
  ): EncodedAudioResult {
    const numChannels = rightChannel ? 2 : 1;
    const numSamples = leftChannel.length;
    const bytesPerSample = 3; // 24-bit = 3 bytes
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = numSamples * blockAlign;
    const bufferSize = 44 + dataSize;

    const arrayBuffer = new ArrayBuffer(bufferSize);
    const view = new DataView(arrayBuffer);

    // RIFF header
    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    this.writeString(view, 8, 'WAVE');

    // fmt subchunk
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
    view.setUint16(20, 1, true); // AudioFormat (1 = PCM)
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 24, true); // BitsPerSample (24-bit)

    // data subchunk
    this.writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    // Write 24-bit integer samples (-8388608 to 8388607)
    let offset = 44;
    for (let i = 0; i < numSamples; i++) {
      const sLeft = Math.max(-1, Math.min(1, leftChannel[i]));
      const intLeft = Math.round(sLeft < 0 ? sLeft * 8388608 : sLeft * 8388607);
      view.setUint8(offset, intLeft & 0xff);
      view.setUint8(offset + 1, (intLeft >> 8) & 0xff);
      view.setUint8(offset + 2, (intLeft >> 16) & 0xff);
      offset += 3;

      if (rightChannel) {
        const sRight = Math.max(-1, Math.min(1, rightChannel[i]));
        const intRight = Math.round(sRight < 0 ? sRight * 8388608 : sRight * 8388607);
        view.setUint8(offset, intRight & 0xff);
        view.setUint8(offset + 1, (intRight >> 8) & 0xff);
        view.setUint8(offset + 2, (intRight >> 16) & 0xff);
        offset += 3;
      }
    }

    const blob = new Blob([arrayBuffer], { type: 'audio/wav' });
    const dataUrl = URL.createObjectURL(blob);

    return {
      format: 'WAV 24-bit / 48kHz PCM Master',
      sampleRate,
      bitDepth: 24,
      channels: numChannels,
      byteLength: arrayBuffer.byteLength,
      dataBlob: blob,
      dataUrl,
    };
  }

  /**
   * Encodes Float32Array audio channels into a valid 16-bit / 44.1kHz Red Book WAV file.
   */
  public encode16BitWav(
    leftChannel: Float32Array,
    rightChannel: Float32Array | null,
    sampleRate: number = 44100
  ): EncodedAudioResult {
    const numChannels = rightChannel ? 2 : 1;
    const numSamples = leftChannel.length;
    const bytesPerSample = 2; // 16-bit = 2 bytes
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = numSamples * blockAlign;
    const bufferSize = 44 + dataSize;

    const arrayBuffer = new ArrayBuffer(bufferSize);
    const view = new DataView(arrayBuffer);

    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    this.writeString(view, 8, 'WAVE');

    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 16, true);

    this.writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    let offset = 44;
    for (let i = 0; i < numSamples; i++) {
      const sLeft = Math.max(-1, Math.min(1, leftChannel[i]));
      const intLeft = Math.round(sLeft < 0 ? sLeft * 32768 : sLeft * 32767);
      view.setInt16(offset, intLeft, true);
      offset += 2;

      if (rightChannel) {
        const sRight = Math.max(-1, Math.min(1, rightChannel[i]));
        const intRight = Math.round(sRight < 0 ? sRight * 32768 : sRight * 32767);
        view.setInt16(offset, intRight, true);
        offset += 2;
      }
    }

    const blob = new Blob([arrayBuffer], { type: 'audio/wav' });
    const dataUrl = URL.createObjectURL(blob);

    return {
      format: 'WAV 16-bit / 44.1kHz Red Book Master',
      sampleRate,
      bitDepth: 16,
      channels: numChannels,
      byteLength: arrayBuffer.byteLength,
      dataBlob: blob,
      dataUrl,
    };
  }

  /**
   * Encodes Float32Array audio channels into a genuine, spec-compliant FLAC bitstream.
   * Generates valid 'fLaC' stream marker, STREAMINFO metadata block, audio frames,
   * verbatim subframe payloads, and CRC-8 / CRC-16 checksums.
   */
  public encodeFlac(
    leftChannel: Float32Array,
    rightChannel: Float32Array | null,
    sampleRate: number = 48000
  ): EncodedAudioResult {
    const numChannels = rightChannel ? 2 : 1;
    const numSamples = leftChannel.length;
    const blockSize = 4096;
    const numBlocks = Math.ceil(numSamples / blockSize);

    let totalBytes = 4 + 38; // Magic 'fLaC' (4) + STREAMINFO (38)
    for (let b = 0; b < numBlocks; b++) {
      const curSize = Math.min(blockSize, numSamples - b * blockSize);
      totalBytes += 12 + numChannels * (1 + curSize * 3) + 2;
    }

    const buffer = new Uint8Array(totalBytes);
    let offset = 0;

    // 1. Magic 'fLaC'
    buffer[0] = 0x66;
    buffer[1] = 0x4c;
    buffer[2] = 0x61;
    buffer[3] = 0x43;
    offset = 4;

    // 2. METADATA_BLOCK_HEADER (STREAMINFO)
    buffer[offset++] = 0x80; // isLast = 1, type = 0 (STREAMINFO)
    buffer[offset++] = 0x00;
    buffer[offset++] = 0x00;
    buffer[offset++] = 0x22; // 34 bytes data

    // 3. STREAMINFO payload (34 bytes)
    buffer[offset++] = (blockSize >> 8) & 0xff;
    buffer[offset++] = blockSize & 0xff;
    buffer[offset++] = (blockSize >> 8) & 0xff;
    buffer[offset++] = blockSize & 0xff;
    buffer[offset++] = 0x00;
    buffer[offset++] = 0x00;
    buffer[offset++] = 0x00;
    buffer[offset++] = 0x00;
    buffer[offset++] = 0x00;
    buffer[offset++] = 0x00;

    const sr = sampleRate & 0xfffff;
    const ch = (numChannels - 1) & 0x7;
    const bps = 23; // 24-bit (23 = 24-1)

    buffer[offset++] = (sr >> 12) & 0xff;
    buffer[offset++] = (sr >> 4) & 0xff;
    buffer[offset++] = ((sr & 0x0f) << 4) | (ch << 1) | ((bps >> 4) & 0x1);
    // JavaScript's >> takes its shift count mod 32, so `numSamples >> 32` is a
    // no-op that returns numSamples itself and leaks its low nibble into the
    // top of the 36-bit total-samples field. Every FLAC this encoder produced
    // declared a wildly wrong length in its header.
    const totalSamplesHigh = Math.floor(numSamples / 0x100000000) & 0x0f;
    buffer[offset++] = ((bps & 0x0f) << 4) | totalSamplesHigh;
    buffer[offset++] = (numSamples >> 24) & 0xff;
    buffer[offset++] = (numSamples >> 16) & 0xff;
    buffer[offset++] = (numSamples >> 8) & 0xff;
    buffer[offset++] = numSamples & 0xff;

    // MD5 placeholder (16 bytes)
    for (let i = 0; i < 16; i++) {
      buffer[offset++] = 0x00;
    }

    // 4. Audio Frames
    for (let b = 0; b < numBlocks; b++) {
      const frameStartOffset = offset;
      const curBlockSize = Math.min(blockSize, numSamples - b * blockSize);
      const sampleOffset = b * blockSize;

      // Frame Header
      const headerStart = offset;
      buffer[offset++] = 0xff;
      buffer[offset++] = 0xf8; // Sync
      buffer[offset++] = 0x70 | 0x00; // Block size in header, SR from STREAMINFO
      buffer[offset++] = (numChannels === 2 ? 0x10 : 0x00) | (0b110 << 1); // 24-bit samples

      if (b < 128) {
        buffer[offset++] = b & 0x7f;
      } else {
        buffer[offset++] = 0xc0 | ((b >> 6) & 0x1f);
        buffer[offset++] = 0x80 | (b & 0x3f);
      }

      buffer[offset++] = ((curBlockSize - 1) >> 8) & 0xff;
      buffer[offset++] = (curBlockSize - 1) & 0xff;

      const headerLen = offset - headerStart;
      const headerCrc = computeFlacCrc8(buffer, headerStart, headerLen);
      buffer[offset++] = headerCrc;

      // Subframe 0: Left Channel (Verbatim = 0x02)
      buffer[offset++] = 0x02;
      for (let s = 0; s < curBlockSize; s++) {
        const sampleFloat = Math.max(-1, Math.min(1, leftChannel[sampleOffset + s]));
        const sampleInt = Math.round(sampleFloat < 0 ? sampleFloat * 8388608 : sampleFloat * 8388607);
        buffer[offset++] = (sampleInt >> 16) & 0xff;
        buffer[offset++] = (sampleInt >> 8) & 0xff;
        buffer[offset++] = sampleInt & 0xff;
      }

      // Subframe 1: Right Channel (if stereo)
      if (rightChannel) {
        buffer[offset++] = 0x02;
        for (let s = 0; s < curBlockSize; s++) {
          const sampleFloat = Math.max(-1, Math.min(1, rightChannel[sampleOffset + s]));
          const sampleInt = Math.round(sampleFloat < 0 ? sampleFloat * 8388608 : sampleFloat * 8388607);
          buffer[offset++] = (sampleInt >> 16) & 0xff;
          buffer[offset++] = (sampleInt >> 8) & 0xff;
          buffer[offset++] = sampleInt & 0xff;
        }
      }

      // Frame Footer: CRC-16
      const frameLen = offset - frameStartOffset;
      const frameCrc16 = computeFlacCrc16(buffer, frameStartOffset, frameLen);
      buffer[offset++] = (frameCrc16 >> 8) & 0xff;
      buffer[offset++] = frameCrc16 & 0xff;
    }

    const flacBinary = buffer.subarray(0, offset);
    const blob = new Blob([flacBinary], { type: 'audio/flac' });
    const dataUrl = URL.createObjectURL(blob);

    return {
      format: 'Lossless FLAC 24-bit / 48kHz Master',
      sampleRate,
      bitDepth: 24,
      channels: numChannels,
      byteLength: flacBinary.byteLength,
      dataBlob: blob,
      dataUrl,
    };
  }

  /**
   * Compatibility alias for MP3 export delivering 16-bit / 44.1kHz PCM master
   */
  public encodeMp3(
    leftChannel: Float32Array,
    rightChannel: Float32Array | null,
    sampleRate: number = 44100
  ): EncodedAudioResult {
    return this.encode16BitWav(leftChannel, rightChannel, sampleRate);
  }

  private writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }
}

export const audioEncoders = new AudioEncoders();
