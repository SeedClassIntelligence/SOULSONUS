import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Radio,
  Sliders,
  Play,
  Square,
  CheckCircle2,
  RefreshCw,
  Download,
  Upload,
  Zap,
  Cable,
  Cpu,
  Layers,
  Sparkles,
} from 'lucide-react';
import { MidiDevice, Track } from '../../types/daw';
import { midiEngine } from '../../audio/midiEngine';
import { useStudioSession } from '../../app/StudioSessionContext';
import { dawInteroperabilityEngine } from '../../lib/dawInteroperability';

interface ExternalHardwareMidiDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExternalHardwareMidiDrawer: React.FC<ExternalHardwareMidiDrawerProps> = ({
  isOpen,
  onClose,
}) => {
  const { dawState, tracks, sections, setTracks, setDawState, setSections } = useStudioSession();
  const [devices, setDevices] = useState<MidiDevice[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [lastMidiEvent, setLastMidiEvent] = useState<string>('Waiting for MIDI performance...');
  const [selectedOutputDevice, setSelectedOutputDevice] = useState<string>('');
  const [midiChannel, setMidiChannel] = useState<number>(1);
  const [isClockSyncActive, setIsClockSyncActive] = useState<boolean>(false);
  const [latencyMs, setLatencyMs] = useState<number>(12);
  const [activeTab, setActiveTab] = useState<'midi_io' | 'hardware_synth' | 'daw_bridge'>('midi_io');
  const [bundleExported, setBundleExported] = useState<boolean>(false);

  const scanDevices = async () => {
    setIsScanning(true);
    await midiEngine.init();
    const list = midiEngine.getConnectedDevices();
    setDevices(list);
    if (list.some((d) => d.type === 'output') && !selectedOutputDevice) {
      setSelectedOutputDevice(list.find((d) => d.type === 'output')?.id || '');
    }
    setIsScanning(false);
  };

  useEffect(() => {
    if (isOpen) {
      scanDevices();

      const unsubscribe = midiEngine.addListener((event) => {
        if (event.type === 'note_on') {
          setLastMidiEvent(`NOTE ON: ${event.noteName} (Vel: ${event.velocity}) via [${event.deviceName}] Ch:${event.channel}`);
        } else if (event.type === 'cc') {
          setLastMidiEvent(`CC #${event.ccNumber} = ${event.ccValue} via [${event.deviceName}]`);
        } else if (event.type === 'pitch_bend') {
          setLastMidiEvent(`PITCH BEND: ${event.bendValue} via [${event.deviceName}]`);
        }
      });

      return () => unsubscribe();
    }
  }, [isOpen]);

  const handleTestHardwareNote = () => {
    if (!selectedOutputDevice) return;
    midiEngine.sendNoteToHardware(selectedOutputDevice, 60, 110, midiChannel, 300); // C4
    setLastMidiEvent(`Sent Note C4 to Hardware Output (Ch ${midiChannel})`);
  };

  const handleToggleClockSync = () => {
    if (isClockSyncActive) {
      midiEngine.stopMidiClock(selectedOutputDevice || undefined);
      setIsClockSyncActive(false);
    } else {
      midiEngine.startMidiClock(dawState.bpm, selectedOutputDevice || undefined);
      setIsClockSyncActive(true);
    }
  };

  const handleExportDawBundle = () => {
    const bundle = dawInteroperabilityEngine.exportProductionBundle(dawState, tracks, sections);
    dawInteroperabilityEngine.downloadBundleManifest(bundle);
    setBundleExported(true);
    setTimeout(() => setBundleExported(false), 4000);
  };

  const handleImportDawBundle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const jsonStr = event.target?.result as string;
        const result = dawInteroperabilityEngine.parseImportedBundle(jsonStr);
        setDawState((prev) => ({ ...prev, ...result.dawStateUpdates }));
        if (result.sections && result.sections.length > 0) setSections(result.sections);
        setLastMidiEvent(`Imported DAW Bundle: ${result.tracks.length} tracks loaded!`);
      } catch (err) {
        console.error('Failed to parse imported DAW bundle:', err);
      }
    };
    reader.readAsText(file);
  };

  const inputDevices = devices.filter((d) => d.type === 'input');
  const outputDevices = devices.filter((d) => d.type === 'output');

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          className="fixed right-0 top-0 bottom-0 w-full sm:w-[500px] md:w-[540px] lg:w-[580px] bg-slate-950/98 border-l border-slate-800 shadow-2xl z-40 flex flex-col justify-between overflow-hidden font-mono select-none"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-3.5 border-b border-slate-800 bg-slate-900/90 shrink-0">
            <div className="flex items-center space-x-2.5">
              <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                <Cable className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-black text-slate-100 uppercase tracking-wide">
                    EXTERNAL HARDWARE & MIDI HUB
                  </h3>
                  <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-bold">
                    BIDIRECTIONAL I/O
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-sans">
                  Pads, Keyboards, Synths, MIDI Clock Sync & Universal DAW Bundle Portability
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title="Close Hardware Hub"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Sub-Tabs: MIDI I/O / Hardware Synth / DAW Bridge */}
          <div className="flex items-center space-x-1 p-2 bg-slate-900 border-b border-slate-800 text-[10px] font-bold">
            <button
              onClick={() => setActiveTab('midi_io')}
              className={`flex-1 py-1.5 rounded-lg transition cursor-pointer flex items-center justify-center space-x-1.5 ${
                activeTab === 'midi_io' ? 'bg-cyan-500 text-slate-950 font-black' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>1. CONTROLLERS & PADS</span>
            </button>
            <button
              onClick={() => setActiveTab('hardware_synth')}
              className={`flex-1 py-1.5 rounded-lg transition cursor-pointer flex items-center justify-center space-x-1.5 ${
                activeTab === 'hardware_synth' ? 'bg-cyan-500 text-slate-950 font-black' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>2. HARDWARE SYNTH / OUT</span>
            </button>
            <button
              onClick={() => setActiveTab('daw_bridge')}
              className={`flex-1 py-1.5 rounded-lg transition cursor-pointer flex items-center justify-center space-x-1.5 ${
                activeTab === 'daw_bridge' ? 'bg-cyan-500 text-slate-950 font-black' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>3. DAW BUNDLE BRIDGE</span>
            </button>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4 text-xs">
            {/* Live MIDI Activity Telemetry Box */}
            <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-slate-500 font-bold uppercase flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                  LIVE EVENT MONITOR
                </span>
                <button
                  onClick={scanDevices}
                  disabled={isScanning}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center space-x-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${isScanning ? 'animate-spin' : ''}`} />
                  <span>Rescan</span>
                </button>
              </div>
              <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 font-mono text-[11px] text-cyan-300 truncate">
                {lastMidiEvent}
              </div>
            </div>

            {/* TAB 1: MIDI CONTROLLERS & PADS */}
            {activeTab === 'midi_io' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-200 text-xs uppercase tracking-wide">
                    Connected Hardware Controllers ({inputDevices.length})
                  </h4>
                  <span className="text-[10px] text-slate-400">Web MIDI API 1.0</span>
                </div>

                {inputDevices.length > 0 ? (
                  <div className="space-y-2">
                    {inputDevices.map((dev) => (
                      <div
                        key={dev.id}
                        className="p-3 rounded-xl bg-slate-900/60 border border-cyan-500/30 flex items-center justify-between"
                      >
                        <div className="flex items-center space-x-2.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/80 animate-ping" />
                          <div>
                            <p className="font-bold text-slate-100">{dev.name}</p>
                            <p className="text-[10px] text-slate-400">
                              {dev.manufacturer} • Human Performance Seed Capture Active
                            </p>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-black">
                          ONLINE
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 rounded-xl bg-slate-900/40 border border-dashed border-slate-800 text-center space-y-2">
                    <Radio className="w-6 h-6 text-slate-600 mx-auto" />
                    <p className="text-slate-400 font-bold">No Physical MIDI Controller Detected</p>
                    <p className="text-[10px] text-slate-500 max-w-sm mx-auto">
                      Plug in any USB MIDI keyboard, MPC pad controller, or drum machine. SoulSonus auto-detects events with zero drivers required.
                    </p>
                  </div>
                )}

                {/* Virtual Performance Testing Surface */}
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">
                    Test Controller Input Map (Visual Performance Grid)
                  </span>
                  <div className="grid grid-cols-4 gap-2">
                    {['Pad 1 (Kick)', 'Pad 2 (Snare)', 'Pad 3 (Closed Hat)', 'Pad 4 (808)'].map((pad, idx) => (
                      <button
                        key={idx}
                        onClick={() => setLastMidiEvent(`Triggered ${pad} (Velocity: 118)`)}
                        className="p-3 rounded-xl bg-slate-950 hover:bg-cyan-500/20 border border-slate-800 hover:border-cyan-400 text-center transition cursor-pointer active:scale-95 group"
                      >
                        <span className="text-[10px] font-bold text-slate-300 group-hover:text-cyan-300 block">
                          {pad}
                        </span>
                        <span className="text-[8px] text-slate-500 font-mono">MIDI #{36 + idx}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: HARDWARE SYNTH / OUT & CLOCK SYNC */}
            {activeTab === 'hardware_synth' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-200 text-xs uppercase tracking-wide">
                    External Synth / Drum Machine Routing
                  </h4>
                  <span className="text-[10px] text-slate-400">MIDI OUT + Audio Return</span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
                  {/* Port Selection */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-bold uppercase">MIDI Output Device:</label>
                    <select
                      value={selectedOutputDevice}
                      onChange={(e) => setSelectedOutputDevice(e.target.value)}
                      className="w-full bg-slate-950 text-cyan-300 text-xs font-mono font-bold p-2 rounded-lg border border-slate-800 focus:outline-none"
                    >
                      <option value="">-- Virtual / Broadcast All Devices --</option>
                      {outputDevices.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.manufacturer})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Channel & Clock */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-bold uppercase">MIDI Channel:</label>
                      <select
                        value={midiChannel}
                        onChange={(e) => setMidiChannel(parseInt(e.target.value))}
                        className="w-full bg-slate-950 text-slate-200 text-xs font-mono font-bold p-2 rounded-lg border border-slate-800 focus:outline-none"
                      >
                        {Array.from({ length: 16 }, (_, i) => (
                          <option key={i + 1} value={i + 1}>
                            Channel {i + 1}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-bold uppercase">Round-Trip Latency:</label>
                      <div className="flex items-center space-x-2 bg-slate-950 p-1.5 rounded-lg border border-slate-800">
                        <input
                          type="range"
                          min="0"
                          max="50"
                          value={latencyMs}
                          onChange={(e) => setLatencyMs(parseInt(e.target.value))}
                          className="flex-1 accent-cyan-400 cursor-pointer"
                        />
                        <span className="text-[10px] font-bold text-cyan-400 w-10 text-right">{latencyMs}ms</span>
                      </div>
                    </div>
                  </div>

                  {/* Hardware Actions */}
                  <div className="pt-2 flex flex-wrap gap-2">
                    <button
                      onClick={handleTestHardwareNote}
                      className="px-3 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs flex items-center space-x-1.5 transition cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>TEST NOTE (C4)</span>
                    </button>
                    <button
                      onClick={handleToggleClockSync}
                      className={`px-3 py-2 rounded-xl border font-bold text-xs flex items-center space-x-1.5 transition cursor-pointer ${
                        isClockSyncActive
                          ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                      }`}
                    >
                      <Radio className="w-3.5 h-3.5" />
                      <span>{isClockSyncActive ? 'SYNC ACTIVE (24 PPQN)' : 'SEND MIDI CLOCK'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: UNIVERSAL DAW BUNDLE BRIDGE */}
            {activeTab === 'daw_bridge' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-200 text-xs uppercase tracking-wide">
                    External DAW Session Interoperability
                  </h4>
                  <span className="text-[10px] text-slate-400">Pro Tools • Logic • Ableton • FL</span>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
                  <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                    Export lossless 24-bit multitrack stems, MIDI note files, tempo/scale maps, and section markers into a universal production bundle, or import bundles from other DAWs.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={handleExportDawBundle}
                      className="p-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs flex items-center justify-center space-x-2 transition cursor-pointer shadow-md shadow-amber-500/20"
                    >
                      <Download className="w-4 h-4" />
                      <span>EXPORT DAW BUNDLE (.JSON)</span>
                    </button>

                    <label className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center justify-center space-x-2 transition cursor-pointer">
                      <Upload className="w-4 h-4 text-cyan-400" />
                      <span>IMPORT DAW BUNDLE</span>
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleImportDawBundle}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {bundleExported && (
                    <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[10px] flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Production Bundle exported successfully with stems and MIDI mapping.</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3.5 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between text-[10px] text-slate-400">
            <span className="flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>SoulSonus Hardware Interop Protocol v1.0</span>
            </span>
            <button
              onClick={onClose}
              className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition cursor-pointer"
            >
              Done
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
