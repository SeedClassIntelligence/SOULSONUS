import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Layers } from 'lucide-react';
import { Track } from '../../types/daw';
import { TrackProductionStrip } from '../TrackProductionStrip';

interface TrackWorkstationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTrack: Track | null;
  onUpdateTrack?: (updates: Partial<Track>) => void;
}

export const TrackWorkstationDrawer: React.FC<TrackWorkstationDrawerProps> = ({
  isOpen,
  onClose,
  selectedTrack,
  onUpdateTrack,
}) => {
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
          {/* Drawer Header */}
            <div className="flex items-center justify-between p-3.5 border-b border-slate-800 bg-slate-900/90 shrink-0">
              <div className="flex items-center space-x-2.5">
                <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-black text-slate-100 uppercase tracking-wide">
                      TRACK PRODUCTION WORKSTATION
                    </h3>
                    {selectedTrack && (
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold">
                        {selectedTrack.name}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 font-sans">
                    Source • Drum/Note Matrix • Sound Vault • Punch & Timbre • Layers • Automation • DSP
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                  title="Close Track Workstation Drawer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Workstation Interior */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
              {selectedTrack ? (
                <TrackProductionStrip
                  track={selectedTrack}
                  onUpdateTrack={onUpdateTrack}
                />
              ) : (
                <div className="p-12 text-center text-slate-500">
                  <p className="text-sm">Select a track on the DAW canvas to configure its production workstation.</p>
                </div>
              )}
            </div>
          </motion.div>
      )}
    </AnimatePresence>
  );
};
