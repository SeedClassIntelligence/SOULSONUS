import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sliders } from 'lucide-react';
import { Track, ArrangementSection } from '../../types/daw';
import { ContextualInspector } from '../ContextualInspector';

interface QuickInspectorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTrack: Track | null;
  activeWorkspace: string;
  sections?: ArrangementSection[];
}

export const QuickInspectorDrawer: React.FC<QuickInspectorDrawerProps> = ({
  isOpen,
  onClose,
  selectedTrack,
  activeWorkspace,
  sections = [],
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          className="fixed right-0 top-0 bottom-0 w-full sm:w-[440px] md:w-[480px] lg:w-[500px] bg-slate-950/98 border-l border-slate-800 shadow-2xl z-40 flex flex-col justify-between overflow-hidden"
        >
          {/* Drawer Header */}
            <div className="flex items-center justify-between p-3.5 border-b border-slate-800 bg-slate-900/80">
              <div className="flex items-center space-x-2.5">
                <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-100 uppercase tracking-wide">
                    QUICK PRODUCTION INSPECTOR
                  </h3>
                  <p className="text-[10px] font-mono text-slate-400">
                    Selected Track • Layer Stacking • Level 4 Sound Vault
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                title="Close Inspector Drawer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Inspector Body */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
              <ContextualInspector
                selectedTrack={selectedTrack}
                activeWorkspace={activeWorkspace}
                sections={sections}
              />
            </div>
          </motion.div>
      )}
    </AnimatePresence>
  );
};
