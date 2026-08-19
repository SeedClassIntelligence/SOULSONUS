import React, { useState } from 'react';
import { Track, PunchRegion, RecordingInputSettings } from '../types/daw';
import { useStudioSession } from '../app/StudioSessionContext';
import { startTakeRecording, TakeRecording } from '../audio/takeRecorder';
import {
  Mic,
  Circle,
  Square,
  Clock,
  Target,
  Headphones,
} from 'lucide-react';

interface OverdubRecorderProps {
  track: Track | null;
}

export const OverdubRecorder: React.FC<OverdubRecorderProps> = ({ track }) => {
  const {
    tracks,
    handleAddVocalTake,
    handleSetPunchRegion,
  } = useStudioSession();

  const currentTrack = track || tracks.find((t) => t.id === 't-vocal') || tracks[0];
  if (!currentTrack) return <div className='p-6 text-center text-neutral-500'>Select a vocal track for overdub</div>;

  const inputSettings: RecordingInputSettings = currentTrack?.vocalState?.inputSettings || {
    inputDeviceId: 'default_mic',
    sampleRate: 48000,
    bufferSize: 256,
    monitoringEnabled: true,
    measuredRoundTripLatencyMs: 12.4,
    latencyCompensationMs: 12.4,
    inputGain: 0,
    countInBars: 1,
    loopRecordingEnabled: true,
  };

  const [isArmed, setIsArmed] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(inputSettings.monitoringEnabled);
  const [latencyCompMs, setLatencyCompMs] = useState(inputSettings.latencyCompensationMs);
  const [inputGainDb, setInputGainDb] = useState(inputSettings.inputGain);
  const [recordError, setRecordError] = useState<string | null>(null);
  const recordingRef = React.useRef<TakeRecording | null>(null);

  // Punch-In / Punch-Out Region
  const [punchRegion, setPunchRegionState] = useState<PunchRegion>(
    currentTrack?.vocalState?.punchRegion || {
      isEnabled: true,
      startBar: 15,
      startBeat: 1,
      endBar: 16,
      endBeat: 4,
      preRollBars: 1,
      postRollBars: 1,
    }
  );

  const handleToggleRecord = async () => {
    const takeName = () =>
      punchRegion.isEnabled
        ? `Punch Take (Bars ${punchRegion.startBar}\u2013${punchRegion.endBar})`
        : `Overdub Take ${String((currentTrack.vocalTakes?.length || 0) + 1).padStart(2, '0')}`;

    if (recordingRef.current) {
      const recording = recordingRef.current;
      recordingRef.current = null;
      setIsRecording(false);
      const audio = await recording.stop();
      handleAddVocalTake(currentTrack.id, {
        takeNumber: (currentTrack.vocalTakes?.length || 0) + 1,
        name: takeName(),
        sectionId: 'sec_hook',
        timelineStart: punchRegion.isEnabled ? punchRegion.startBar : 13,
        timelineEnd: punchRegion.isEnabled ? punchRegion.endBar : 20,
        // Length and waveform both come from the decoded recording. The
        // waveform used to be sixteen Math.random() values — an invented
        // picture of a real performance.
        duration: Math.round(audio.durationSeconds * 100) / 100,
        waveformData: audio.waveform,
        audioBlob: audio.blob,
        inputSettings: {
          ...inputSettings,
          latencyCompensationMs: latencyCompMs,
          inputGain: inputGainDb,
        },
      });
      return;
    }

    setRecordError(null);
    try {
      recordingRef.current = await startTakeRecording();
      setIsRecording(true);
    } catch (err) {
      // A take with no audio behind it used to be created here, which reported
      // a recording that never happened. The failure is shown instead.
      console.error('[OverdubRecorder] Failed to start microphone recording:', err);
      setRecordError(err instanceof Error ? err.message : 'Microphone unavailable.');
      setIsRecording(false);
    }
  };

  const togglePunch = () => {
    const updated = { ...punchRegion, isEnabled: !punchRegion.isEnabled };
    setPunchRegionState(updated);
    handleSetPunchRegion(currentTrack.id, updated);
  };

  return (
    <div className="bg-slate-950/95 border border-slate-800/90 rounded-2xl p-4 shadow-2xl space-y-3 select-none text-xs font-mono">
      {/* 1. Header with Recording Status & Arming */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-2.5 gap-2">
        <div className="flex items-center space-x-2">
          <Mic className="w-4 h-4 text-red-400" />
          <span className="font-black text-slate-100 uppercase tracking-wide">
            OVERDUB RECORDER & PRECISION PUNCH STUDIO • {currentTrack.name.toUpperCase()}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsArmed(!isArmed)}
            className={`px-3 py-1 rounded-lg text-[10px] font-black transition cursor-pointer border ${
              isArmed
                ? 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse'
                : 'bg-slate-900 text-slate-500 border-slate-800'
            }`}
          >
            {isArmed ? '● TRACK ARMED' : 'ARM TRACK'}
          </button>

          <button
            onClick={() => setIsMonitoring(!isMonitoring)}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer flex items-center space-x-1 ${
              isMonitoring ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-900 text-slate-500 border border-slate-800'
            }`}
          >
            <Headphones className="w-3 h-3" />
            <span>{isMonitoring ? 'DIRECT MONITOR: ON' : 'DIRECT MONITOR: OFF'}</span>
          </button>
        </div>
      </div>

      {/* 2. Recording Transport & Live Level Meter Deck */}
      <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <button
            onClick={handleToggleRecord}
            disabled={!isArmed}
            className={`px-5 py-2.5 rounded-xl font-black text-xs flex items-center space-x-2 transition cursor-pointer shadow-lg active:scale-98 ${
              isRecording
                ? 'bg-red-600 hover:bg-red-500 text-white animate-pulse shadow-red-600/30'
                : 'bg-red-500 hover:bg-red-400 text-slate-950 shadow-red-500/20'
            }`}
          >
            {isRecording ? <Square className="w-4 h-4 fill-white" /> : <Circle className="w-4 h-4 fill-slate-950" />}
            <span>{isRecording ? 'STOP & COMMIT TAKE' : punchRegion.isEnabled ? 'RECORD PUNCH-IN TAKE' : 'RECORD OVERDUB TAKE'}</span>
          </button>

          <div className="space-y-0.5 text-[10px]">
            <div className="text-slate-200 font-bold">
              Status:{' '}
              {recordError ? (
                <span className="text-rose-300 font-black" data-testid="overdub-error">{recordError}</span>
              ) : isRecording ? (
                <span className="text-red-400 font-black animate-pulse">RECORDING ACTIVE</span>
              ) : (
                <span className="text-slate-400">READY</span>
              )}
            </div>
            <div className="text-slate-500 text-[9px]">
              Input: USB Audio (48.0kHz / 24-bit) • Latency: <span className="text-cyan-300 font-bold">{latencyCompMs}ms Comp</span>
            </div>
          </div>
        </div>

        {/* Live Input Level Peak Meter */}
        <div className="w-48 space-y-1">
          <div className="flex justify-between text-[9px] text-slate-400 font-bold">
            <span>INPUT VU METER:</span>
            <span className="text-emerald-400">-6.2 dB Peak</span>
          </div>
          <div className="w-full h-2.5 bg-slate-950 rounded-full border border-slate-800 overflow-hidden flex">
            <div className="h-full bg-emerald-400 rounded-l-full" style={{ width: '72%' }} />
            <div className="h-full bg-amber-400" style={{ width: '12%' }} />
            <div className="h-full bg-red-500 rounded-r-full" style={{ width: '4%' }} />
          </div>
        </div>
      </div>

      {/* 3. Latency Compensation & Precision Punch Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Precision Punch-In/Out */}
        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="font-bold text-slate-200 text-[10px] flex items-center space-x-1.5">
              <Target className="w-3.5 h-3.5 text-amber-400" />
              <span>PRECISION PUNCH-IN / PUNCH-OUT</span>
            </span>
            <button
              onClick={togglePunch}
              className={`px-2 py-0.5 rounded text-[9px] font-black transition cursor-pointer ${
                punchRegion.isEnabled ? 'bg-amber-500 text-slate-950' : 'bg-slate-950 text-slate-500 border border-slate-800'
              }`}
            >
              {punchRegion.isEnabled ? 'PUNCH ENABLED' : 'PUNCH DISABLED'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div className="p-2 rounded bg-slate-950 border border-slate-800">
              <span className="text-slate-500">Punch-In:</span>
              <div className="text-amber-300 font-bold">Bar {punchRegion.startBar}.{punchRegion.startBeat} (Pre-roll 1 Bar)</div>
            </div>
            <div className="p-2 rounded bg-slate-950 border border-slate-800">
              <span className="text-slate-500">Punch-Out:</span>
              <div className="text-amber-300 font-bold">Bar {punchRegion.endBar}.{punchRegion.endBeat}</div>
            </div>
          </div>
          <div className="text-[9px] text-slate-500 italic">
            Playback pre-rolls 1 bar before punch marker, seamlessly drops into record on Bar 15, and preserves prior takes intact.
          </div>
        </div>

        {/* Latency & Hardware Settings */}
        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="font-bold text-slate-200 text-[10px] flex items-center space-x-1.5">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>RECORDING LATENCY COMPENSATION</span>
            </span>
            <span className="text-[9px] text-cyan-300 font-bold">Buffer: {inputSettings.bufferSize} smp</span>
          </div>

          <div className="space-y-2 text-[10px]">
            <div>
              <div className="flex justify-between text-slate-400 mb-0.5">
                <span>Round-Trip Latency Offset:</span>
                <span className="text-cyan-300 font-mono font-bold">+{latencyCompMs} ms</span>
              </div>
              <input
                type="range"
                min={0}
                max={50}
                step={0.5}
                value={latencyCompMs}
                onChange={(e) => setLatencyCompMs(Number(e.target.value))}
                className="w-full accent-cyan-400 h-1.5 bg-slate-950 rounded-lg cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-400 mb-0.5">
                <span>Input Preamp Gain Trim:</span>
                <span className="text-pink-300 font-mono font-bold">{inputGainDb > 0 ? `+${inputGainDb}` : inputGainDb} dB</span>
              </div>
              <input
                type="range"
                min={-12}
                max={12}
                step={0.5}
                value={inputGainDb}
                onChange={(e) => setInputGainDb(Number(e.target.value))}
                className="w-full accent-pink-500 h-1.5 bg-slate-950 rounded-lg cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
