import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Activity, Disc, Eye } from 'lucide-react';
import { Track } from '../../types/daw';

interface VisualizationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  tracks: Track[];
  currentStep: number;
}

const Step64Radar: React.FC<{ tracks: Track[]; currentStep: number }> = ({ tracks, currentStep }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.min(centerX, centerY) - 20;

    // Clear canvas
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, width, height);

    // Draw concentric ring tracks
    const trackCount = Math.max(1, tracks.length);
    const ringSpacing = maxRadius / (trackCount + 1);

    tracks.forEach((track, tIdx) => {
      const radius = (tIdx + 1) * ringSpacing;

      // Draw background ring
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.stroke();

      // Draw 64 step dots
      const stepAngle = (2 * Math.PI) / 64;
      for (let s = 0; s < 64; s++) {
        const angle = s * stepAngle - Math.PI / 2;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);

        const isActiveStep = track.steps[s];
        const isCurrentStep = s === currentStep;

        if (isCurrentStep) {
          ctx.fillStyle = '#fbbf24';
          ctx.beginPath();
          ctx.arc(x, y, isActiveStep ? 4.5 : 2.5, 0, 2 * Math.PI);
          ctx.fill();
        } else if (isActiveStep) {
          ctx.fillStyle = track.color || '#3b82f6';
          ctx.beginPath();
          ctx.arc(x, y, 3, 0, 2 * Math.PI);
          ctx.fill();
        } else if (s % 16 === 0) {
          ctx.fillStyle = '#475569';
          ctx.beginPath();
          ctx.arc(x, y, 1.5, 0, 2 * Math.PI);
          ctx.fill();
        }
      }
    });

    // Draw rotating playhead needle
    const playheadAngle = (currentStep * 2 * Math.PI) / 64 - Math.PI / 2;
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(centerX + maxRadius * Math.cos(playheadAngle), centerY + maxRadius * Math.sin(playheadAngle));
    ctx.stroke();

    // Center pivot point
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 4, 0, 2 * Math.PI);
    ctx.fill();
  }, [tracks, currentStep]);

  return <canvas ref={canvasRef} width={340} height={340} className="rounded-2xl border border-slate-800 bg-slate-950 block shadow-inner mx-auto" />;
};

export const VisualizationDrawer: React.FC<VisualizationDrawerProps> = ({
  isOpen,
  onClose,
  tracks,
  currentStep,
}) => {
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
                <Eye className="w-5 h-5 text-cyan-400" />
                <h2 className="text-base font-bold text-slate-100">Radial Step Visualizer</h2>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Radar Display */}
            <div className="mt-6 flex flex-col items-center justify-center p-4 rounded-xl bg-slate-950/80 border border-slate-800">
              <Step64Radar tracks={tracks} currentStep={currentStep} />
              <div className="mt-4 flex items-center space-x-2 text-xs text-slate-400 font-mono">
                <Disc className="w-4 h-4 text-amber-400 animate-spin" />
                <span>Real-time Multi-Ring Step Matrix (Step {currentStep + 1} / 64)</span>
              </div>
            </div>

            {/* Legend */}
            <div className="mt-6 space-y-2">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Track Color Rings</h3>
              {tracks.map((track) => (
                <div key={track.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-950/40 border border-slate-800/80 text-xs">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: track.color || '#3b82f6' }} />
                    <span className="font-medium text-slate-200">{track.name}</span>
                  </div>
                  <span className="font-mono text-slate-400 text-[10px]">
                    {track.steps.filter(Boolean).length} Active Steps
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>64-Step Polar Radar Canvas</span>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 font-semibold"
            >
              Close Visualizer
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
