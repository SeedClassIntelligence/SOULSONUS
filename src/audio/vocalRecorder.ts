export class VocalRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private audioContext: AudioContext | null = null;

  public async startRecording(): Promise<boolean> {
    this.recordedChunks = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      this.mediaRecorder.start(50);
      return true;
    } catch (err) {
      console.error('Error starting vocal recorder:', err);
      return false;
    }
  }

  public stopRecording(): Promise<{ blob: Blob; buffer: AudioBuffer; waveform: number[]; duration: number }> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        return reject('No media recorder active');
      }

      this.mediaRecorder.onstop = async () => {
        try {
          const blob = new Blob(this.recordedChunks, { type: 'audio/webm' });
          const arrayBuffer = await blob.arrayBuffer();

          if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
          }

          const decodedBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
          const waveform = this.extractWaveformData(decodedBuffer, 200);

          // Stop mic track
          this.mediaRecorder?.stream.getTracks().forEach((track) => track.stop());

          resolve({
            blob,
            buffer: decodedBuffer,
            waveform,
            duration: decodedBuffer.duration
          });
        } catch (err) {
          reject(err);
        }
      };

      this.mediaRecorder.stop();
    });
  }

  private extractWaveformData(buffer: AudioBuffer, numPoints = 200): number[] {
    const rawData = buffer.getChannelData(0); // Channel 0
    const blockSize = Math.floor(rawData.length / numPoints);
    const waveform: number[] = [];

    for (let i = 0; i < numPoints; i++) {
      const start = i * blockSize;
      let max = 0;
      for (let j = 0; j < blockSize; j++) {
        const val = Math.abs(rawData[start + j] || 0);
        if (val > max) max = val;
      }
      waveform.push(max);
    }

    // Normalize
    const maxAmp = Math.max(...waveform, 0.01);
    return waveform.map((v) => Math.min(1, v / maxAmp));
  }
}

export const vocalRecorder = new VocalRecorder();
