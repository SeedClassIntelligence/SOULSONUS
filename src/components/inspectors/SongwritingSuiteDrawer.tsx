import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mic } from 'lucide-react';
import { Track, ArrangementSection } from '../../types/daw';
import { WriteRecordStudio } from '../WriteRecordStudio';

interface SongwritingSuiteDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTrack: Track | null;
  sections: ArrangementSection[];
  activeSectionId: string;
  onSelectSection?: (sectionId: string) => void;
  bpm: number;
  isPlaying: boolean;
  currentStep: number;
}

export const SongwritingSuiteDrawer: React.FC<SongwritingSuiteDrawerProps> = ({
  isOpen,
  onClose,
  selectedTrack,
  sections,
  activeSectionId,
  onSelectSection,
  bpm,
  isPlaying,
  currentStep,
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
                <div className="p-1.5 rounded-lg bg-pink-500/10 text-pink-400 border border-pink-500/30">
                  <Mic className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-black text-slate-100 uppercase tracking-wide">
                      SONGWRITING SUITE & VOCAL BOOTH
                    </h3>
                    <span className="px-2 py-0.5 rounded bg-pink-500/20 text-pink-300 border border-pink-500/40 text-[10px] font-bold">
                      {bpm} BPM • 4/4
                    </span>
                    {selectedTrack && (
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[10px]">
                        Track: {selectedTrack.name}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 font-sans">
                    Lyrics & Cadence • Takes & Pool • Comp Builder • Punch & Overdub • Pitch & Timing • Harmony • Voice Identity • Vocal DSP
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                  title="Close Songwriting Suite Drawer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Vocal Room Interior */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
              <WriteRecordStudio
                track={selectedTrack}
                sections={sections}
                activeSectionId={activeSectionId}
                onSelectSection={onSelectSection}
                bpm={bpm}
                isPlaying={isPlaying}
                currentStep={currentStep}
              />
            </div>
          </motion.div>
      )}
    </AnimatePresence>
  );
};
