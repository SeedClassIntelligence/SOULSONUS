import React from 'react';
import { useStudioSession } from '../../app/StudioSessionContext';
import { MasterMixerConsole } from '../MasterMixerConsole';
import { Sliders, Volume2, Sparkles, Activity, ShieldCheck } from 'lucide-react';
import { audioEngine } from '../../audio/audioEngine';

export const MixWorkspace: React.FC = () => {
  const {
    tracks,
    vocalState,
    dawState,
    handleMasterVolumeChange,
    handleReverbLevelChange,
    handleDelayLevelChange,
    handleToggleMute,
    handleToggleSolo,
    handleChangeVolume,
    setVocalState,
  } = useStudioSession();

  return (
    <div className="w-full space-y-6 pb-8">
      {/* Workspace Header */}
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <Sliders className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-slate-100">Dynamic Multi-Track Mixing Console</h2>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 text-[10px] font-mono border border-emerald-500/30">
                Mix Workspace
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Full screen DSP channel strips, dynamic stem registry, EQ/compression racks, and Master Limiter bus.
            </p>
          </div>
        </div>

        {/* Master Bus Info */}
        <div className="flex items-center space-x-3 text-xs font-mono text-slate-300">
          <span className="flex items-center space-x-1">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span>Limiter Ceiling: -0.5 dB</span>
          </span>
          <span className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-slate-400">
            Active Stems: {tracks.length + (vocalState.audioBuffer ? 1 : 0)}
          </span>
        </div>
      </div>

      {/* Dynamic Master Mixer Console */}
      <div className="w-full">
        <MasterMixerConsole
          tracks={tracks}
          vocalState={vocalState}
          masterVolume={dawState.masterVolume}
          reverbLevel={dawState.reverbLevel}
          delayLevel={dawState.delayLevel}
          onMasterVolumeChange={handleMasterVolumeChange}
          onReverbLevelChange={handleReverbLevelChange}
          onDelayLevelChange={handleDelayLevelChange}
          onToggleMute={handleToggleMute}
          onToggleSolo={handleToggleSolo}
          onChangeTrackVolume={handleChangeVolume}
          onChangeTrackPan={(tId, pan) => audioEngine.setTrackPan(tId, pan)}
          onChangeTrackFilter={(tId, freq) => audioEngine.setTrackFilterFreq(tId, freq)}
          onChangeTrackCompressor={(tId, thresh) => audioEngine.setTrackCompressorThreshold(tId, thresh)}
          onChangeTrackReverbSend={(tId, send) => audioEngine.setTrackReverbSend(tId, send)}
          onChangeVocalVolume={(vol) => {
            audioEngine.setVocalVolume(vol);
            setVocalState((prev) => ({ ...prev, volume: vol }));
          }}
          onChangeVocalMute={() => setVocalState((prev) => ({ ...prev, mute: !prev.mute }))}
          onChangeVocalSolo={() => setVocalState((prev) => ({ ...prev, solo: !prev.solo }))}
        />
      </div>
    </div>
  );
};
