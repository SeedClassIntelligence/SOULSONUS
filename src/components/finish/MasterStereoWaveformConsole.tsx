import React, { useState } from 'react';
import {
  Sliders,
  Sparkles,
  Zap,
  Activity,
  Power,
  Layers,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Play,
  Volume2,
  Radio,
  Maximize2,
} from 'lucide-react';
import { useStudioSession } from '../../app/StudioSessionContext';
import { MasteringProcessorSlot, MasteringProcessorType } from '../../types/daw';

export const MasterStereoWaveformConsole: React.FC = () => {
  const {
    sections,
    dawState,
    acceptedMixPrint,
    masteringChain,
    activeMasterCandidateId,
    masterCandidates,
    handleUpdateMasteringProcessor,
    handleToggleMasteringProcessor,
    handleLoadMasteringPreset,
  } = useStudioSession();

  const [selectedSlotId, setSelectedSlotId] = useState<string>('m_slot_1');

  const selectedSlot =
    masteringChain.slots.find((s) => s.id === selectedSlotId) || masteringChain.slots[0];
  const activeCandidate =
    masterCandidates.find((c) => c.candidateId === activeMasterCandidateId) || masterCandidates[0];

  return (
    <div className="w-full bg-slate-950 border-b border-slate-800 flex flex-col font-mono select-none">
      {/* 1. MASTER HEADER & PROVENANCE PRINT BAR */}
      <div className="px-4 py-2 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse shadow-sm shadow-amber-400/80" />
            <h3 className="text-xs font-black text-slate-100 uppercase tracking-wide">
              ROOM 5: MASTER AUDIO CONSOLE
            </h3>
          </div>
          <span className="text-[10px] text-slate-400 font-bold hidden md:inline">
            • SOURCE: <span className="text-cyan-300 font-mono">{acceptedMixPrint.mixPrintId}</span> (24-bit / 48kHz Print)
          </span>
          {acceptedMixPrint.staleWarning && (
            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-bold flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> MIX MODIFIED (STALE)
            </span>
          )}
        </div>

        {/* R04 Governed Mastering Presets Dropdown */}
        <div className="flex items-center space-x-2">
          <span className="text-[10px] text-slate-500 font-bold uppercase">R04 MASTER TARGET:</span>
          <select
            value={masteringChain.name}
            onChange={(e) => handleLoadMasteringPreset(e.target.value)}
            className="bg-slate-800 text-slate-200 text-[10px] font-bold px-2 py-1 rounded border border-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="Streaming Balanced (-14.0 LUFS)">Streaming Balanced (-14.0 LUFS / -1.0 dBTP)</option>
            <option value="Warm Analog Master (-13.0 LUFS)">Warm Analog Master (-13.0 LUFS / -0.8 dBTP)</option>
            <option value="Modern Club Punch (-9.0 LUFS)">Modern Club Punch (-9.0 LUFS / -0.3 dBTP)</option>
          </select>
        </div>
      </div>

      {/* 2. MASTER STEREO WAVEFORM ACROSS SONG SECTIONS */}
      <div className="p-3 bg-slate-950 border-b border-slate-800/80 space-y-1.5">
        <div className="flex items-center justify-between text-[10px]">
          <div className="flex items-center space-x-2">
            <span className="text-slate-400 font-bold uppercase">STEREO MASTER PRINT WAVEFORM</span>
            <span className="text-cyan-400 font-bold">({activeCandidate?.name})</span>
          </div>
          <span className="text-[9px] text-slate-500">
            PLAYHEAD: BAR {Math.floor(dawState.currentStep / 4) + 1}.{(dawState.currentStep % 4) + 1}
          </span>
        </div>

        {/* Section Tags Bar */}
        <div className="grid grid-cols-4 gap-1 text-[9px] font-bold text-center">
          {sections.map((sec) => (
            <div
              key={sec.id}
              className="py-0.5 rounded border"
              style={{
                backgroundColor: `${sec.color}15`,
                borderColor: `${sec.color}40`,
                color: sec.color,
              }}
            >
              {sec.name} (Bars {sec.bars[0]}–{sec.bars[sec.bars.length - 1]})
            </div>
          ))}
        </div>

        {/* Master Stereo Waveform Visualizer */}
        <div className="h-20 bg-slate-900 rounded-xl border border-slate-800 relative overflow-hidden flex items-center justify-center">
          {/* Waveform SVG */}
          <svg className="w-full h-full opacity-80" viewBox="0 0 400 80" preserveAspectRatio="none">
            <path
              d="M 0,40 Q 25,15 50,40 T 100,40 T 150,20 T 200,40 T 250,10 T 300,40 T 350,25 T 400,40"
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2.5"
            />
            <path
              d="M 0,40 Q 25,65 50,40 T 100,40 T 150,60 T 200,40 T 250,70 T 300,40 T 350,55 T 400,40"
              fill="none"
              stroke="#06b6d4"
              strokeWidth="2.5"
            />
          </svg>

          {/* Real-time Playhead Indicator */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-amber-400 shadow-md shadow-amber-400/80 transition-all duration-75"
            style={{ left: `${(dawState.currentStep / 64) * 100}%` }}
          />
        </div>
      </div>

      {/* 3. 7-STAGE MASTERING DSP CHAIN RACK */}
      <div className="p-3 bg-slate-950 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-200 uppercase">
            7-STAGE MODULAR MASTERING CHAIN
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            CLICK ANY PROCESSOR TO ADJUST HARDWARE PARAMETERS
          </span>
        </div>

        {/* Processor Chain Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5">
          {masteringChain.slots.map((slot, index) => {
            const isSelected = selectedSlotId === slot.id;
            return (
              <div
                key={slot.id}
                onClick={() => setSelectedSlotId(slot.id)}
                className={`p-2 rounded-xl border flex flex-col justify-between transition cursor-pointer select-none ${
                  isSelected
                    ? 'bg-slate-900 border-amber-400 shadow-md shadow-amber-500/20 ring-1 ring-amber-400/40'
                    : 'bg-slate-950/80 hover:bg-slate-900/60 border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between text-[9px] pb-1 border-b border-slate-800">
                  <span className="text-slate-500 font-bold">[{index + 1}]</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleMasteringProcessor(slot.id);
                    }}
                    className={`w-2 h-2 rounded-full transition ${
                      slot.bypassed ? 'bg-slate-700' : 'bg-emerald-400 shadow-sm shadow-emerald-400/80'
                    }`}
                    title={slot.bypassed ? 'Processor Bypassed' : 'Processor Active'}
                  />
                </div>
                <p className="font-bold text-[10px] text-slate-100 truncate pt-1">{slot.name}</p>
                <span className="text-[8px] text-amber-400/80 uppercase font-mono tracking-wider">
                  {slot.type.replace('_', ' ')}
                </span>
              </div>
            );
          })}
        </div>

        {/* Selected Processor Detail Controls */}
        {selectedSlot && (
          <div className="p-3 bg-slate-900/90 rounded-2xl border border-slate-800 space-y-2 mt-1">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-black text-amber-300 uppercase">
                  {selectedSlot.name} Controls
                </span>
                <span className="text-[9px] text-slate-400">
                  • 64-bit Floating Point Precision • Linear Phase Filtering
                </span>
              </div>
              <button
                onClick={() => handleToggleMasteringProcessor(selectedSlot.id)}
                className={`px-2 py-0.5 rounded text-[9px] font-black transition cursor-pointer ${
                  selectedSlot.bypassed
                    ? 'bg-rose-500 text-white'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                }`}
              >
                {selectedSlot.bypassed ? 'BYPASSED' : 'ACTIVE'}
              </button>
            </div>

            {/* Dynamic Controls based on Processor Type */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[10px] pt-1">
              {selectedSlot.type === 'corrective_eq' && (
                <>
                  <div className="space-y-1">
                    <div className="flex justify-between text-slate-400">
                      <span>Low Cut (HPF)</span>
                      <span className="text-cyan-400 font-bold">{selectedSlot.parameters.lowCutHz || 28} Hz</span>
                    </div>
                    <input
                      type="range"
                      min="20"
                      max="60"
                      value={Number(selectedSlot.parameters.lowCutHz || 28)}
                      onChange={(e) =>
                        handleUpdateMasteringProcessor(selectedSlot.id, { lowCutHz: parseFloat(e.target.value) })
                      }
                      className="w-full accent-cyan-400 cursor-pointer h-1"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-slate-400">
                      <span>Low-Mid Notch</span>
                      <span className="text-amber-400 font-bold">{selectedSlot.parameters.lowMidNotchDb || -0.8} dB</span>
                    </div>
                    <input
                      type="range"
                      min="-4"
                      max="2"
                      step="0.1"
                      value={Number(selectedSlot.parameters.lowMidNotchDb || -0.8)}
                      onChange={(e) =>
                        handleUpdateMasteringProcessor(selectedSlot.id, { lowMidNotchDb: parseFloat(e.target.value) })
                      }
                      className="w-full accent-amber-400 cursor-pointer h-1"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-slate-400">
                      <span>High Air Shelf</span>
                      <span className="text-cyan-400 font-bold">+{selectedSlot.parameters.highAirDb || 1.5} dB</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="4"
                      step="0.1"
                      value={Number(selectedSlot.parameters.highAirDb || 1.5)}
                      onChange={(e) =>
                        handleUpdateMasteringProcessor(selectedSlot.id, { highAirDb: parseFloat(e.target.value) })
                      }
                      className="w-full accent-cyan-400 cursor-pointer h-1"
                    />
                  </div>
                </>
              )}

              {selectedSlot.type === 'bus_comp' && (
                <>
                  <div className="space-y-1">
                    <div className="flex justify-between text-slate-400">
                      <span>Threshold</span>
                      <span className="text-amber-400 font-bold">{selectedSlot.parameters.threshold || -16} dB</span>
                    </div>
                    <input
                      type="range"
                      min="-30"
                      max="0"
                      value={Number(selectedSlot.parameters.threshold || -16)}
                      onChange={(e) =>
                        handleUpdateMasteringProcessor(selectedSlot.id, { threshold: parseFloat(e.target.value) })
                      }
                      className="w-full accent-amber-400 cursor-pointer h-1"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-slate-400">
                      <span>Ratio</span>
                      <span className="text-amber-400 font-bold">{selectedSlot.parameters.ratio || 2}:1</span>
                    </div>
                    <input
                      type="range"
                      min="1.2"
                      max="4"
                      step="0.1"
                      value={Number(selectedSlot.parameters.ratio || 2)}
                      onChange={(e) =>
                        handleUpdateMasteringProcessor(selectedSlot.id, { ratio: parseFloat(e.target.value) })
                      }
                      className="w-full accent-amber-400 cursor-pointer h-1"
                    />
                  </div>
                </>
              )}

              {selectedSlot.type === 'true_peak_limiter' && (
                <>
                  <div className="space-y-1">
                    <div className="flex justify-between text-slate-400">
                      <span>True-Peak Ceiling</span>
                      <span className="text-emerald-400 font-bold">{selectedSlot.parameters.ceilingDbtp || -1.0} dBTP</span>
                    </div>
                    <input
                      type="range"
                      min="-2.0"
                      max="-0.1"
                      step="0.1"
                      value={Number(selectedSlot.parameters.ceilingDbtp || -1.0)}
                      onChange={(e) =>
                        handleUpdateMasteringProcessor(selectedSlot.id, { ceilingDbtp: parseFloat(e.target.value) })
                      }
                      className="w-full accent-emerald-400 cursor-pointer h-1"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-slate-400">
                      <span>Lookahead</span>
                      <span className="text-cyan-400 font-bold">{selectedSlot.parameters.lookaheadMs || 4.5} ms</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      step="0.5"
                      value={Number(selectedSlot.parameters.lookaheadMs || 4.5)}
                      onChange={(e) =>
                        handleUpdateMasteringProcessor(selectedSlot.id, { lookaheadMs: parseFloat(e.target.value) })
                      }
                      className="w-full accent-cyan-400 cursor-pointer h-1"
                    />
                  </div>
                </>
              )}

              {selectedSlot.type === 'stereo_ms' && (
                <>
                  <div className="space-y-1">
                    <div className="flex justify-between text-slate-400">
                      <span>Mono Bass Cutoff</span>
                      <span className="text-cyan-400 font-bold">{selectedSlot.parameters.monoBassCutoffHz || 100} Hz</span>
                    </div>
                    <input
                      type="range"
                      min="60"
                      max="160"
                      value={Number(selectedSlot.parameters.monoBassCutoffHz || 100)}
                      onChange={(e) =>
                        handleUpdateMasteringProcessor(selectedSlot.id, { monoBassCutoffHz: parseFloat(e.target.value) })
                      }
                      className="w-full accent-cyan-400 cursor-pointer h-1"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-slate-400">
                      <span>Side Width</span>
                      <span className="text-purple-400 font-bold">{selectedSlot.parameters.sideWidthPercent || 115}%</span>
                    </div>
                    <input
                      type="range"
                      min="80"
                      max="150"
                      value={Number(selectedSlot.parameters.sideWidthPercent || 115)}
                      onChange={(e) =>
                        handleUpdateMasteringProcessor(selectedSlot.id, { sideWidthPercent: parseFloat(e.target.value) })
                      }
                      className="w-full accent-purple-400 cursor-pointer h-1"
                    />
                  </div>
                </>
              )}

              {selectedSlot.type === 'saturation' && (
                <div className="space-y-1">
                  <div className="flex justify-between text-slate-400">
                    <span>Harmonic Drive</span>
                    <span className="text-amber-400 font-bold">{selectedSlot.parameters.drive || 18}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="60"
                    value={Number(selectedSlot.parameters.drive || 18)}
                    onChange={(e) =>
                      handleUpdateMasteringProcessor(selectedSlot.id, { drive: parseFloat(e.target.value) })
                    }
                    className="w-full accent-amber-400 cursor-pointer h-1"
                  />
                </div>
              )}

              {selectedSlot.type === 'soft_clipper' && (
                <div className="space-y-1">
                  <div className="flex justify-between text-slate-400">
                    <span>Ceiling Headroom</span>
                    <span className="text-emerald-400 font-bold">+{selectedSlot.parameters.ceilingHeadroomDb || 0.8} dB</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="2.5"
                    step="0.1"
                    value={Number(selectedSlot.parameters.ceilingHeadroomDb || 0.8)}
                    onChange={(e) =>
                      handleUpdateMasteringProcessor(selectedSlot.id, { ceilingHeadroomDb: parseFloat(e.target.value) })
                    }
                    className="w-full accent-emerald-400 cursor-pointer h-1"
                  />
                </div>
              )}

              {selectedSlot.type === 'dynamic_eq' && (
                <div className="space-y-1">
                  <div className="flex justify-between text-slate-400">
                    <span>Bass Ducking (110Hz)</span>
                    <span className="text-cyan-400 font-bold">{selectedSlot.parameters.bassDuckingDb || -1.2} dB</span>
                  </div>
                  <input
                    type="range"
                    min="-4"
                    max="0"
                    step="0.1"
                    value={Number(selectedSlot.parameters.bassDuckingDb || -1.2)}
                    onChange={(e) =>
                      handleUpdateMasteringProcessor(selectedSlot.id, { bassDuckingDb: parseFloat(e.target.value) })
                    }
                    className="w-full accent-cyan-400 cursor-pointer h-1"
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
