import React, { useState } from 'react';
import { Track, Project, VocalTrackState, SeedSignatureRecord, CloudProjectPackage } from '../types/daw';
import { audioEngine } from '../audio/audioEngine';
import { cloudVaultService } from '../lib/cloudVault';
import {
  Sliders,
  Volume2,
  VolumeX,
  ShieldCheck,
  CloudUpload,
  Sparkles,
  Download,
  Trash2,
  ChevronUp,
  ChevronDown,
  Layers,
  Activity,
  CheckCircle2,
  Radio,
} from 'lucide-react';

export interface MasterMixerConsoleProps {
  tracks: Track[];
  onUpdateTrack: (trackId: string, updates: Partial<Track>) => void;
  masterVolume: number;
  onMasterVolumeChange: (val: number) => void;
  reverbLevel: number;
  onReverbLevelChange: (val: number) => void;
  delayLevel: number;
  onDelayLevelChange: (val: number) => void;
  project: Project;
  vocalState?: VocalTrackState;
  seedSignatureRecords: SeedSignatureRecord[];
  onCloudProjectLoaded?: (pkg: CloudProjectPackage) => void;
}

export const MasterMixerConsole: React.FC<MasterMixerConsoleProps> = ({
  tracks,
  onUpdateTrack,
  masterVolume,
  onMasterVolumeChange,
  reverbLevel,
  onReverbLevelChange,
  delayLevel,
  onDelayLevelChange,
  project,
  vocalState,
  seedSignatureRecords,
  onCloudProjectLoaded,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessPackage, setSaveSuccessPackage] = useState<CloudProjectPackage | null>(null);
  const [showVaultModal, setShowVaultModal] = useState(false);
  const [vaultProjects, setVaultProjects] = useState<CloudProjectPackage[]>([]);

  // Open Cloud Vault Modal & Refresh List
  const handleOpenVault = () => {
    setVaultProjects(cloudVaultService.listCloudProjects());
    setShowVaultModal(true);
  };

  // Trigger Phase 13 Cryptographic Cloud Vault Save
  const handleSaveToCloud = async () => {
    setIsSaving(true);
    try {
      const result = await cloudVaultService.saveProjectToCloud(project, vocalState, seedSignatureRecords);
      setSaveSuccessPackage(result.package);
      setVaultProjects(cloudVaultService.listCloudProjects());
    } catch (err) {
      console.error('Error saving project to cloud vault:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleVolumeChange = (trackId: string, volumeDb: number) => {
    audioEngine.setTrackVolume(trackId, volumeDb);
    onUpdateTrack(trackId, { volume: volumeDb });
  };

  const handlePanChange = (track: Track, panVal: number) => {
    audioEngine.setTrackPan(track.id, panVal);
    onUpdateTrack(track.id, {
      dspSettings: {
        filterFreq: track.dspSettings?.filterFreq || 12000,
        filterType: track.dspSettings?.filterType || 'lowpass',
        compressorThreshold: track.dspSettings?.compressorThreshold || -18,
        compressorRatio: track.dspSettings?.compressorRatio || 4,
        reverbSend: track.dspSettings?.reverbSend || 0.2,
        pan: panVal,
      },
    });
  };

  const handleFilterChange = (track: Track, freqHz: number) => {
    audioEngine.setTrackFilterFreq(track.id, freqHz);
    onUpdateTrack(track.id, {
      dspSettings: {
        filterFreq: freqHz,
        filterType: track.dspSettings?.filterType || 'lowpass',
        compressorThreshold: track.dspSettings?.compressorThreshold || -18,
        compressorRatio: track.dspSettings?.compressorRatio || 4,
        reverbSend: track.dspSettings?.reverbSend || 0.2,
        pan: track.dspSettings?.pan || 0,
      },
    });
  };

  const handleCompressorChange = (track: Track, threshDb: number) => {
    audioEngine.setTrackCompressorThreshold(track.id, threshDb);
    onUpdateTrack(track.id, {
      dspSettings: {
        filterFreq: track.dspSettings?.filterFreq || 12000,
        filterType: track.dspSettings?.filterType || 'lowpass',
        compressorThreshold: threshDb,
        compressorRatio: track.dspSettings?.compressorRatio || 4,
        reverbSend: track.dspSettings?.reverbSend || 0.2,
        pan: track.dspSettings?.pan || 0,
      },
    });
  };

  const handleReverbSendChange = (track: Track, sendAmount: number) => {
    audioEngine.setTrackReverbSend(track.id, sendAmount);
    onUpdateTrack(track.id, {
      dspSettings: {
        filterFreq: track.dspSettings?.filterFreq || 12000,
        filterType: track.dspSettings?.filterType || 'lowpass',
        compressorThreshold: track.dspSettings?.compressorThreshold || -18,
        compressorRatio: track.dspSettings?.compressorRatio || 4,
        reverbSend: sendAmount,
        pan: track.dspSettings?.pan || 0,
      },
    });
  };

  return (
    <div className="w-full bg-slate-950 border-t border-slate-800 shadow-2xl transition-all duration-300 my-4 rounded-xl overflow-hidden">
      {/* Console Header Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase text-slate-100 flex items-center gap-2">
              <span>PHASE 11 & 13: MASTER MIXER & CLOUD VAULT CONSOLE</span>
              <span className="text-[9px] font-mono bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/40 font-bold">
                TONE.LIMITER ACTIVE (-0.5 dB)
              </span>
            </h3>
            <p className="text-[10px] font-mono text-slate-400">
              Dedicated DSP Chains • Filter EQ • Beatbox Glue Compressor • SHA-256 Cloud Vault Packaging
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Save to Cloud Button */}
          <button
            type="button"
            id="btn-save-cloud-vault"
            onClick={handleSaveToCloud}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-black font-mono shadow-md transition active:scale-95 disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Radio className="w-3.5 h-3.5 animate-spin" />
                <span>SIGNING & SAVING...</span>
              </>
            ) : (
              <>
                <CloudUpload className="w-3.5 h-3.5 text-indigo-200" />
                <span>SAVE TO CLOUD VAULT</span>
              </>
            )}
          </button>

          {/* View Vault Library */}
          <button
            type="button"
            onClick={handleOpenVault}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-bold border border-slate-700 transition"
          >
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span>CLOUD VAULT ({cloudVaultService.listCloudProjects().length})</span>
          </button>

          {/* Collapse/Expand Toggle */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 transition"
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Mixer Board Body */}
      {isExpanded && (
        <div className="p-4 bg-slate-950 overflow-x-auto">
          <div className="flex items-start gap-3 min-w-max">
            {/* TRACK CHANNEL STRIPS */}
            {tracks.map((track, idx) => {
              const filterFreq = track.dspSettings?.filterFreq || 12000;
              const compThresh = track.dspSettings?.compressorThreshold || -18;
              const verbSend = track.dspSettings?.reverbSend || (track.instrument === 'melody' ? 0.25 : 0.05);
              const pan = track.dspSettings?.pan || 0;

              return (
                <div
                  key={track.id}
                  className="w-36 flex flex-col items-center bg-slate-900/90 rounded-xl p-3 border border-slate-800 shadow-inner"
                >
                  {/* Track Header */}
                  <div className="w-full flex items-center justify-between mb-2 pb-1 border-b border-slate-800">
                    <span className="text-[10px] font-mono font-bold text-slate-400">CH {idx + 1}</span>
                    <span
                      className={`text-[9px] font-mono font-black uppercase px-1.5 py-0.5 rounded ${
                        track.instrument === 'kick'
                          ? 'bg-amber-950 text-amber-400 border border-amber-500/40'
                          : track.instrument === 'snare'
                          ? 'bg-cyan-950 text-cyan-400 border border-cyan-500/40'
                          : track.instrument === 'hihat'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
                          : 'bg-purple-950 text-purple-400 border border-purple-500/40'
                      }`}
                    >
                      {track.instrument}
                    </span>
                  </div>

                  <h4 className="text-xs font-black text-slate-100 truncate w-full text-center mb-2" title={track.name}>
                    {track.name}
                  </h4>

                  {/* Mute & Solo Toggles */}
                  <div className="flex items-center gap-1.5 mb-3 w-full justify-center">
                    <button
                      type="button"
                      onClick={() => onUpdateTrack(track.id, { mute: !track.mute })}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-black border transition ${
                        track.mute
                          ? 'bg-rose-600 text-white border-rose-500 shadow'
                          : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                      }`}
                    >
                      M
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateTrack(track.id, { solo: !track.solo })}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-black border transition ${
                        track.solo
                          ? 'bg-amber-500 text-slate-950 border-amber-400 font-extrabold shadow'
                          : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                      }`}
                    >
                      S
                    </button>
                  </div>

                  {/* DSP CONTROL KNOBS / SLIDERS */}
                  <div className="w-full flex flex-col gap-2.5 mb-3 px-1">
                    {/* EQ Filter Cutoff */}
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between text-[9px] font-mono text-slate-400">
                        <span>EQ CUTOFF</span>
                        <span className="text-amber-400 font-bold">{Math.round(filterFreq)}Hz</span>
                      </div>
                      <input
                        type="range"
                        min={100}
                        max={16000}
                        step={100}
                        value={filterFreq}
                        onChange={(e) => handleFilterChange(track, parseFloat(e.target.value))}
                        className="w-full accent-amber-500 h-1 bg-slate-800 rounded cursor-pointer"
                      />
                    </div>

                    {/* Glue Compressor Threshold */}
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between text-[9px] font-mono text-slate-400">
                        <span>COMP GLUE</span>
                        <span className="text-cyan-400 font-bold">{compThresh}dB</span>
                      </div>
                      <input
                        type="range"
                        min={-40}
                        max={0}
                        step={1}
                        value={compThresh}
                        onChange={(e) => handleCompressorChange(track, parseFloat(e.target.value))}
                        className="w-full accent-cyan-500 h-1 bg-slate-800 rounded cursor-pointer"
                      />
                    </div>

                    {/* Reverb Send */}
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between text-[9px] font-mono text-slate-400">
                        <span>VERB SEND</span>
                        <span className="text-purple-400 font-bold">{Math.round(verbSend * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={verbSend}
                        onChange={(e) => handleReverbSendChange(track, parseFloat(e.target.value))}
                        className="w-full accent-purple-500 h-1 bg-slate-800 rounded cursor-pointer"
                      />
                    </div>

                    {/* Pan Slider */}
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between text-[9px] font-mono text-slate-400">
                        <span>PAN</span>
                        <span className="text-indigo-400 font-bold">
                          {pan === 0 ? 'C' : pan < 0 ? `${Math.abs(Math.round(pan * 100))}L` : `${Math.round(pan * 100)}R`}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={-1}
                        max={1}
                        step={0.05}
                        value={pan}
                        onChange={(e) => handlePanChange(track, parseFloat(e.target.value))}
                        className="w-full accent-indigo-500 h-1 bg-slate-800 rounded cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* VERTICAL VOLUME FADER */}
                  <div className="w-full flex items-center justify-center gap-2 py-2 px-1 bg-slate-950 rounded-lg border border-slate-850">
                    <input
                      type="range"
                      min={-36}
                      max={6}
                      step={0.5}
                      value={track.volume}
                      onChange={(e) => handleVolumeChange(track.id, parseFloat(e.target.value))}
                      className="h-28 accent-amber-400 bg-slate-800 rounded cursor-pointer [writing-mode:vertical-lr] [direction:rtl]"
                    />
                    <div className="flex flex-col justify-between h-28 text-[9px] font-mono text-slate-500 font-bold">
                      <span>+6</span>
                      <span>0</span>
                      <span>-12</span>
                      <span>-36</span>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono font-bold text-amber-400 mt-2">
                    {track.volume > 0 ? `+${track.volume.toFixed(1)} dB` : `${track.volume.toFixed(1)} dB`}
                  </span>
                </div>
              );
            })}

            {/* MASTER BUS STRIP */}
            <div className="w-44 flex flex-col items-center bg-gradient-to-b from-slate-900 to-indigo-950/80 rounded-xl p-3 border-2 border-indigo-500/40 shadow-xl ml-2">
              <div className="w-full flex items-center justify-between mb-2 pb-1 border-b border-indigo-500/30">
                <span className="text-[10px] font-mono font-black text-indigo-300 uppercase flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" /> MASTER BUS
                </span>
                <span className="text-[8px] font-mono font-black bg-rose-950 text-rose-300 px-1.5 py-0.5 rounded border border-rose-500/40">
                  LIMITER
                </span>
              </div>

              <h4 className="text-xs font-black text-indigo-100 uppercase mb-2">OUTPUT CONSOLE</h4>

              {/* Master Effects Controls */}
              <div className="w-full flex flex-col gap-2.5 mb-3 px-1">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-[9px] font-mono text-indigo-300">
                    <span>MASTER REVERB</span>
                    <span className="text-indigo-400 font-bold">{Math.round(reverbLevel * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={reverbLevel}
                    onChange={(e) => onReverbLevelChange(parseFloat(e.target.value))}
                    className="w-full accent-indigo-400 h-1 bg-slate-800 rounded cursor-pointer"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-[9px] font-mono text-indigo-300">
                    <span>MASTER DELAY</span>
                    <span className="text-indigo-400 font-bold">{Math.round(delayLevel * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={delayLevel}
                    onChange={(e) => onDelayLevelChange(parseFloat(e.target.value))}
                    className="w-full accent-indigo-400 h-1 bg-slate-800 rounded cursor-pointer"
                  />
                </div>
              </div>

              {/* Master Volume Fader */}
              <div className="w-full flex items-center justify-center gap-2 py-2 px-1 bg-slate-950/90 rounded-lg border border-indigo-900/50">
                <input
                  type="range"
                  min={-36}
                  max={6}
                  step={0.5}
                  value={masterVolume}
                  onChange={(e) => onMasterVolumeChange(parseFloat(e.target.value))}
                  className="h-28 accent-indigo-400 bg-slate-800 rounded cursor-pointer [writing-mode:vertical-lr] [direction:rtl]"
                />
                <div className="flex flex-col justify-between h-28 text-[9px] font-mono text-indigo-300 font-bold">
                  <span>+6</span>
                  <span>0</span>
                  <span>-12</span>
                  <span>-36</span>
                </div>
              </div>

              <span className="text-[10px] font-mono font-black text-indigo-300 mt-2">
                {masterVolume > 0 ? `+${masterVolume.toFixed(1)} dB` : `${masterVolume.toFixed(1)} dB`}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* SAVE SUCCESS NOTIFICATION BANNER */}
      {saveSuccessPackage && (
        <div className="m-4 p-3 rounded-xl bg-emerald-950/90 border border-emerald-500/50 text-emerald-200 flex flex-wrap items-center justify-between gap-3 shadow-lg animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <h4 className="text-xs font-black uppercase text-white flex items-center gap-2">
                <span>PROJECT CRYPTOGRAPHICALLY SIGNED & SAVED TO CLOUD VAULT!</span>
              </h4>
              <p className="text-[10px] font-mono text-emerald-300 mt-0.5">
                Master Signature Hash: <code className="text-amber-300">{saveSuccessPackage.masterSignatureHash}</code>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const blob = new Blob([JSON.stringify(saveSuccessPackage, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${saveSuccessPackage.projectName.replace(/\s+/g, '_')}_CloudBundle.json`;
                a.click();
              }}
              className="flex items-center gap-1 px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-black transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>DOWNLOAD BUNDLE JSON</span>
            </button>
            <button
              type="button"
              onClick={() => setSaveSuccessPackage(null)}
              className="p-1 rounded text-emerald-400 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* CLOUD VAULT LIBRARY INSPECTOR MODAL */}
      {showVaultModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-5 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <CloudUpload className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-black uppercase text-slate-100">CLOUD VAULT PROJECT REGISTRY</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowVaultModal(false)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 transition"
              >
                ✕
              </button>
            </div>

            {vaultProjects.length === 0 ? (
              <div className="text-center py-8 text-slate-500 font-mono text-xs">
                No saved projects found in Cloud Vault. Click [ SAVE TO CLOUD VAULT ] to create your first package!
              </div>
            ) : (
              <div className="flex flex-col gap-3 max-h-96 overflow-y-auto pr-1">
                {vaultProjects.map((pkg) => (
                  <div
                    key={pkg.id}
                    className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-indigo-500/50 transition flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        <h4 className="text-xs font-black text-slate-100 uppercase">{pkg.projectName}</h4>
                        <span className="text-[9px] font-mono bg-indigo-950 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-500/30">
                          {pkg.bpm} BPM
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500">
                        Saved: {new Date(pkg.savedAt).toLocaleString()}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-between text-[10px] font-mono text-slate-400 bg-slate-900 p-2 rounded-lg border border-slate-850">
                      <span>Tracks: {pkg.tracks.length}</span>
                      <span>MIDI Events: {pkg.midiData.reduce((acc, m) => acc + m.notes.length, 0)}</span>
                      <span>Vocal Stem: {pkg.vocalStemDataUrl ? '✅ Attached' : 'None'}</span>
                      <span className="text-amber-400 truncate max-w-xs" title={pkg.masterSignatureHash}>
                        SHA-256: {pkg.masterSignatureHash.substring(0, 16)}...
                      </span>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      {onCloudProjectLoaded && (
                        <button
                          type="button"
                          onClick={() => {
                            onCloudProjectLoaded(pkg);
                            setShowVaultModal(false);
                          }}
                          className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-mono font-bold transition"
                        >
                          LOAD PROJECT
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          const blob = new Blob([JSON.stringify(pkg, null, 2)], { type: 'application/json' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `${pkg.projectName.replace(/\s+/g, '_')}_Bundle.json`;
                          a.click();
                        }}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-mono font-bold transition flex items-center gap-1"
                      >
                        <Download className="w-3 h-3" /> EXPORT JSON
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          cloudVaultService.deleteCloudProject(pkg.id);
                          setVaultProjects(cloudVaultService.listCloudProjects());
                        }}
                        className="p-1 rounded bg-rose-950 text-rose-400 hover:bg-rose-900 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
