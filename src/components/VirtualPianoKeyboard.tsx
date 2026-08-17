import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Volume2, Music, Sparkles, ChevronLeft, ChevronRight, Piano } from 'lucide-react';
import { audioEngine } from '../audio/audioEngine';
import { midiToNoteName, noteNameToMidi } from '../utils/musicMath';

interface VirtualPianoKeyboardProps {
  isOpen: boolean;
  onClose: () => void;
}

// Computer Keyboard Mapping (2 Octaves)
const KEYBOARD_MAP: { [key: string]: number } = {
  // Lower Octave (Root to 7th)
  a: 0, // C
  w: 1, // C#
  s: 2, // D
  e: 3, // D#
  d: 4, // E
  f: 5, // F
  t: 6, // F#
  g: 7, // G
  y: 8, // G#
  h: 9, // A
  u: 10, // A#
  j: 11, // B
  // Upper Octave
  k: 12, // C (+1)
  o: 13, // C# (+1)
  l: 14, // D (+1)
  p: 15, // D# (+1)
  ';': 16, // E (+1)
  "'": 17, // F (+1)
};

const WHITE_KEYS = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19, 21, 23, 24];
const BLACK_KEYS = [
  { offset: 1, leftPercent: 5.8, label: 'W' },
  { offset: 3, leftPercent: 12.8, label: 'E' },
  { offset: 6, leftPercent: 26.5, label: 'T' },
  { offset: 8, leftPercent: 33.5, label: 'Y' },
  { offset: 10, leftPercent: 40.5, label: 'U' },
  { offset: 13, leftPercent: 54.2, label: 'O' },
  { offset: 15, leftPercent: 61.2, label: 'P' },
  { offset: 18, leftPercent: 75.0, label: '' },
  { offset: 20, leftPercent: 82.0, label: '' },
  { offset: 22, leftPercent: 89.0, label: '' },
];

const WHITE_KEY_LABELS: { [offset: number]: string } = {
  0: 'A',
  2: 'S',
  4: 'D',
  5: 'F',
  7: 'G',
  9: 'H',
  11: 'J',
  12: 'K',
  14: 'L',
  16: ';',
  17: "'",
};

export const VirtualPianoKeyboard: React.FC<VirtualPianoKeyboardProps> = ({ isOpen, onClose }) => {
  const { tracks, focusTrackId, setFocusTrackId } = useStudioSession();
  const [baseOctave, setBaseOctave] = useState<number>(3); // Default C3
  const [activeMidiNotes, setActiveMidiNotes] = useState<number[]>([]);
  const [selectedTrackId, setSelectedTrackId] = useState<string>(tracks[0]?.id || '');

  const melodicTracks = tracks.filter((t) => t.instrument !== 'kick' && t.instrument !== 'snare' && t.instrument !== 'hihat' && t.instrument !== 'percussion');
  const activeTrack = tracks.find((t) => t.id === (focusTrackId || selectedTrackId)) || melodicTracks[0] || tracks[0];

  const baseMidi = (baseOctave + 1) * 12; // C3 is MIDI 48, C4 is 60

  const playMidiNote = useCallback(
    (midi: number, dur = 0.4) => {
      const pitchName = midiToNoteName(midi);
      if (activeTrack) {
        if (activeTrack.instrument === 'bass') {
          audioEngine.triggerBass(pitchName, undefined, 0.9, activeTrack, dur);
        } else if (activeTrack.instrument === 'kick') {
          audioEngine.triggerKick(pitchName, undefined, 0.9, activeTrack, dur);
        } else {
          audioEngine.triggerMelody(pitchName, undefined, 0.9, activeTrack, dur);
        }
      } else {
        audioEngine.triggerMelody(pitchName, undefined, 0.9, undefined, dur);
      }

      setActiveMidiNotes((prev) => (prev.includes(midi) ? prev : [...prev, midi]));
      setTimeout(() => {
        setActiveMidiNotes((prev) => prev.filter((m) => m !== midi));
      }, 350);
    },
    [activeTrack]
  );

  // Global Keyboard event listener when modal is open
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const key = e.key.toLowerCase();
      if (key in KEYBOARD_MAP) {
        e.preventDefault();
        const offset = KEYBOARD_MAP[key];
        const targetMidi = baseMidi + offset;
        playMidiNote(targetMidi, 0.5);
      } else if (key === 'z') {
        // Octave down
        setBaseOctave((prev) => Math.max(1, prev - 1));
      } else if (key === 'x') {
        // Octave up
        setBaseOctave((prev) => Math.min(6, prev + 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, baseMidi, playMidiNote]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-14 left-1/2 -translate-x-1/2 w-[95vw] max-w-4xl bg-slate-950/95 border border-slate-800 rounded-2xl shadow-2xl p-4 z-50 backdrop-blur-md font-mono select-none"
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs">
            <div className="flex items-center space-x-3">
              <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center space-x-1.5">
                <Piano className="w-4 h-4" />
                <span className="font-bold text-slate-100 uppercase tracking-wide">VIRTUAL PIANO KEYBOARD</span>
              </div>

              {/* Active Sound / Instrument Selector */}
              <div className="flex items-center space-x-1.5">
                <span className="text-slate-500 text-[10px]">SOUND:</span>
                <select
                  value={activeTrack?.id || ''}
                  onChange={(e) => {
                    setSelectedTrackId(e.target.value);
                    if (setFocusTrackId) setFocusTrackId(e.target.value);
                  }}
                  className="bg-slate-900 text-cyan-300 text-xs px-2 py-1 rounded border border-slate-800 focus:outline-none cursor-pointer"
                >
                  {tracks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.vaultLabel || t.instrument})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Octave Shifter & Close */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-1 bg-slate-900 px-2 py-1 rounded-lg border border-slate-800 text-[11px]">
                <span className="text-slate-400">OCTAVE:</span>
                <span className="text-amber-400 font-bold">C{baseOctave} (MIDI {baseMidi})</span>
                <button
                  type="button"
                  onClick={() => setBaseOctave((o) => Math.max(1, o - 1))}
                  className="px-1.5 py-0.5 rounded bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-amber-300 text-[10px] font-bold ml-1 cursor-pointer"
                  title="Octave Down (Key: Z)"
                >
                  [-8ve]
                </button>
                <button
                  type="button"
                  onClick={() => setBaseOctave((o) => Math.min(6, o + 1))}
                  className="px-1.5 py-0.5 rounded bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-amber-300 text-[10px] font-bold cursor-pointer"
                  title="Octave Up (Key: X)"
                >
                  [+8ve]
                </button>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                title="Close Piano Keyboard"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Keyboard Keys Canvas */}
          <div className="relative w-full h-40 sm:h-48 mt-3 bg-slate-900 rounded-xl p-1 shadow-inner overflow-hidden flex">
            {/* White Keys Layer */}
            <div className="w-full h-full flex gap-1">
              {WHITE_KEYS.map((offset) => {
                const midi = baseMidi + offset;
                const isPressed = activeMidiNotes.includes(midi);
                const keyLabel = WHITE_KEY_LABELS[offset] || '';
                const noteName = midiToNoteName(midi);

                return (
                  <button
                    key={`white_${offset}`}
                    type="button"
                    onMouseDown={() => playMidiNote(midi, 0.4)}
                    className={`flex-1 h-full rounded-b-lg flex flex-col justify-between items-center pb-2 pt-1 transition-all cursor-pointer select-none shadow-md ${
                      isPressed
                        ? 'bg-amber-400 text-slate-950 scale-[0.98] shadow-inner font-black'
                        : 'bg-gradient-to-b from-slate-100 to-slate-300 hover:from-white hover:to-slate-200 text-slate-800'
                    }`}
                  >
                    <span className="text-[9px] font-bold text-slate-400">{keyLabel}</span>
                    <span className="text-[10px] sm:text-xs font-bold font-mono">{noteName}</span>
                  </button>
                );
              })}
            </div>

            {/* Black Keys Layer (Absolute Positioning) */}
            <div className="absolute inset-0 pointer-events-none flex">
              {BLACK_KEYS.map((bk) => {
                const midi = baseMidi + bk.offset;
                const isPressed = activeMidiNotes.includes(midi);
                const noteName = midiToNoteName(midi);

                return (
                  <button
                    key={`black_${bk.offset}`}
                    type="button"
                    style={{ left: `${bk.leftPercent}%`, width: '5.2%' }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      playMidiNote(midi, 0.4);
                    }}
                    className={`absolute top-1 h-[60%] rounded-b-md flex flex-col justify-between items-center pb-1 pt-1 pointer-events-auto transition-all cursor-pointer select-none shadow-xl z-20 ${
                      isPressed
                        ? 'bg-cyan-400 text-slate-950 scale-[0.97] shadow-inner font-black'
                        : 'bg-gradient-to-b from-slate-900 to-black hover:from-slate-800 hover:to-slate-900 text-slate-300 border border-slate-700'
                    }`}
                  >
                    <span className="text-[8px] font-mono text-slate-500">{bk.label}</span>
                    <span className="text-[8.5px] sm:text-[9.5px] font-mono font-bold">{noteName}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Computer Keyboard Helper Bar */}
          <div className="flex items-center justify-between pt-2.5 text-[10px] text-slate-400">
            <span>
              💡 <strong className="text-slate-200">Play with Computer Keyboard:</strong> Keys <code className="text-amber-300 bg-slate-900 px-1 py-0.2 rounded">A S D F G H J K L ; '</code> for white keys, <code className="text-cyan-300 bg-slate-900 px-1 py-0.2 rounded">W E T Y U O P</code> for black keys.
            </span>
            <span>
              Octave Up/Down: <code className="text-amber-300 bg-slate-900 px-1 py-0.2 rounded">Z / X</code>
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
