import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mic, Sliders, Target, ShieldCheck, Activity } from 'lucide-react';
import { DetectionSettings, Track } from '../../types/daw';
import { detectionEngine } from '../../audio/detectionEngine';

interface CalibrationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  detectionSettings: DetectionSettings;
  setDetectionSettings: React.Dispatch<React.SetStateAction<DetectionSettings>>;
  tracks: Track[];
  calibratingTrackId: string | null;
  onCalibrateTrack?: (trackId: string) => void;
}

export const CalibrationDrawer: React.FC<CalibrationDrawerProps> = ({
  isOpen,
  onClose,
  detectionSettings,
  setDetectionSettings,
  tracks,
  calibratingTrackId,
  onCalibrateTrack,
}) => {
  const toggleMicDetection = async () => {
    if (detectionSettings.enabled) {
      detectionEngine.stop();
      setDetectionSettings((prev) => ({ ...prev, enabled: false, micConnected: false }));
    } else {
      const success = await detectionEngine.start();
      if (success) {
        setDetectionSettings((prev) => ({ ...prev, enabled: true, micConnected: true }));
      }
    }
  };

  const handleGainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setDetectionSettings((prev) => ({ ...prev, gain: val }));
    detectionEngine.updateSettings(detectionSettings.kickThreshold, detectionSettings.snareThreshold, val);
  };

  const handleKickThreshChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setDetectionSettings((prev) => ({ ...prev, kickThreshold: val }));
    detectionEngine.updateSettings(val, detectionSettings.snareThreshold, detectionSettings.gain);
  };

  const handleSnareThreshChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setDetectionSettings((prev) => ({ ...prev, snareThreshold: val }));
    detectionEngine.updateSettings(detectionSettings.kickThreshold, val, detectionSettings.gain);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed right-0 top-0 bottom-0 w-full sm:w-[440px] md:w-[480px] bg-slate-900 border-l border-slate-800 shadow-2xl z-40 p-6 overflow-y-auto flex flex-col justify-between"
        >
          <div>
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <Sliders className="w-5 h-5 text-amber-400" />
                  <h2 className="text-base font-bold text-slate-100">FFT & Detection Calibration</h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status Section */}
              <div className="mt-5 p-4 rounded-xl bg-slate-950/80 border border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2.5 rounded-xl ${detectionSettings.enabled ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-slate-800 text-slate-400'}`}>
                      <Mic className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-200">Live Mic Audio Detection</div>
                      <div className="text-xs text-slate-400">
                        {detectionSettings.enabled ? 'Listening for transients & pitch' : 'Microphone input disabled'}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={toggleMicDetection}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      detectionSettings.enabled
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                        : 'bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 shadow-lg shadow-emerald-500/20'
                    }`}
                  >
                    {detectionSettings.enabled ? 'Stop Mic' : 'Start Mic'}
                  </button>
                </div>

                {/* Energy Meters */}
                {detectionSettings.enabled && (
                  <div className="mt-4 grid grid-cols-2 gap-3 pt-3 border-t border-slate-800/80">
                    <div>
                      <div className="flex justify-between text-xs text-slate-400 mb-1">
                        <span>Low / Sub (Kick)</span>
                        <span>{Math.round((detectionSettings.currentLowLevel || 0) * 100)}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-400 transition-all duration-75"
                          style={{ width: `${Math.min(100, (detectionSettings.currentLowLevel || 0) * 100)}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs text-slate-400 mb-1">
                        <span>High / Transient (Snare)</span>
                        <span>{Math.round((detectionSettings.currentHighLevel || 0) * 100)}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-cyan-400 transition-all duration-75"
                          style={{ width: `${Math.min(100, (detectionSettings.currentHighLevel || 0) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Sliders */}
              <div className="mt-6 space-y-5">
                <div>
                  <div className="flex justify-between text-xs font-medium text-slate-300 mb-1.5">
                    <span>Input Mic Gain</span>
                    <span className="text-amber-400 font-mono">{detectionSettings.gain.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="5.0"
                    step="0.1"
                    value={detectionSettings.gain}
                    onChange={handleGainChange}
                    className="w-full accent-amber-400 bg-slate-800 rounded-lg cursor-pointer h-2"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-medium text-slate-300 mb-1.5">
                    <span>Kick Detection Sensitivity Threshold</span>
                    <span className="text-amber-400 font-mono">{(detectionSettings.kickThreshold * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="0.9"
                    step="0.05"
                    value={detectionSettings.kickThreshold}
                    onChange={handleKickThreshChange}
                    className="w-full accent-amber-400 bg-slate-800 rounded-lg cursor-pointer h-2"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-medium text-slate-300 mb-1.5">
                    <span>Snare Detection Sensitivity Threshold</span>
                    <span className="text-cyan-400 font-mono">{(detectionSettings.snareThreshold * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="0.9"
                    step="0.05"
                    value={detectionSettings.snareThreshold}
                    onChange={handleSnareThreshChange}
                    className="w-full accent-cyan-400 bg-slate-800 rounded-lg cursor-pointer h-2"
                  />
                </div>
              </div>

              {/* Per-Track Calibration List */}
              <div className="mt-6">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  Individual Track Frequency Profiles
                </h3>
                <div className="space-y-2">
                  {tracks.map((track) => {
                    const isCal = calibratingTrackId === track.id;
                    return (
                      <div
                        key={track.id}
                        className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between"
                      >
                        <div>
                          <div className="text-xs font-semibold text-slate-200">{track.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {track.detectionProfile?.centerFreq
                              ? `Calibrated: ${track.detectionProfile.centerFreq}Hz`
                              : 'Default FFT Profile'}
                          </div>
                        </div>

                        <button
                          onClick={() => onCalibrateTrack?.(track.id)}
                          disabled={isCal}
                          className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center space-x-1 transition-all cursor-pointer ${
                            isCal
                              ? 'bg-amber-500/20 text-amber-300 animate-pulse border border-amber-500/40'
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                          }`}
                        >
                          <Target className="w-3.5 h-3.5" />
                          <span>{isCal ? 'Listening...' : 'Calibrate'}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
              <span className="flex items-center space-x-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>WebAudio Lock Verified</span>
              </span>
              <button
                onClick={onClose}
                className="px-4 py-1.5 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 text-xs font-semibold"
              >
                Close Drawer
              </button>
            </div>
          </motion.div>
      )}
    </AnimatePresence>
  );
};
