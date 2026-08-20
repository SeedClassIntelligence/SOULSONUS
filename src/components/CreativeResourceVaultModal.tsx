/**
 * Where the sounds come from.
 *
 * What stood here was a shop window onto nothing. Seven assets that do not
 * exist -- a Rhodes SoundFont, an SFZ cello, a Surge XT patch -- each badged
 * COMMERCIAL APPROVED against `admissionRecordId`s pointing at admission
 * records that were never written, over a footer reading "All assets audited
 * by E16 Dataset Admission Engine". Pressing play on the Rhodes started a
 * `Tone.PolySynth` and played a triad; "Select Asset" called a callback the
 * modal was never given. A creator could not tell any of that from a library.
 *
 * The sourcing decision that replaces it is a funnel, not a list: a curated
 * catalogue is the only way in, and libraries compete for a small number of
 * factory slots. So this panel shows the funnel's real state -- what plays
 * sound today, what the factory holds (nothing yet), what is a candidate and
 * what each candidate is still waiting on, and what has been ruled out and
 * why. Every row here is read from `soundSourcing.ts`, which is the same file
 * `factoryAdmission` enforces against, so this panel cannot drift from the
 * policy the code obeys.
 */

import React, { useMemo, useState } from 'react';
import { X, Search, Database, ShieldCheck, ShieldAlert, Ban, CircleSlash } from 'lucide-react';
import {
  FACTORY_SLOTS,
  INSTRUMENT_CATALOG,
  InstrumentFamily,
  SOURCE_POLICY,
  SourceDecision,
  factoryAdmission,
  factoryState,
} from '../lib/soundSourcing';
import { soundFontEngine } from '../audio/soundFont';

interface CreativeResourceVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Lens = 'STACK' | 'FACTORY' | 'CANDIDATES' | 'RULED_OUT';

const LENSES: { id: Lens; label: string; tone: string }[] = [
  { id: 'STACK', label: 'The stack', tone: 'amber' },
  { id: 'FACTORY', label: 'Factory slots', tone: 'cyan' },
  { id: 'CANDIDATES', label: 'Candidates', tone: 'emerald' },
  { id: 'RULED_OUT', label: 'Ruled out', tone: 'rose' },
];

const STANDING_LABEL: Record<SourceDecision['standing'], string> = {
  IN_USE: 'in use',
  ADOPT: 'adopted, not built yet',
  FACTORY_CANDIDATE: 'candidate for a factory slot',
  FALLBACK_ONLY: 'fallback coverage only',
  REFERENCE_ONLY: 'read, not shipped',
  EXCLUDED: 'ruled out',
};

const familyLabel = (f: InstrumentFamily) => f.toLowerCase().replace(/_/g, ' ');

export const CreativeResourceVaultModal: React.FC<CreativeResourceVaultModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [lens, setLens] = useState<Lens>('STACK');
  const [query, setQuery] = useState('');

  const matches = (s: SourceDecision) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      s.name.toLowerCase().includes(q) ||
      s.reason.toLowerCase().includes(q) ||
      s.role.toLowerCase().includes(q)
    );
  };

  const shown = useMemo(() => {
    const byLens = SOURCE_POLICY.filter((s) => {
      if (lens === 'RULED_OUT') return s.standing === 'EXCLUDED';
      if (lens === 'CANDIDATES') return s.standing === 'FACTORY_CANDIDATE' || s.standing === 'FALLBACK_ONLY';
      if (lens === 'STACK') return s.standing === 'IN_USE' || s.standing === 'ADOPT' || s.standing === 'REFERENCE_ONLY';
      return false;
    });
    return byLens.filter(matches);
  }, [lens, query]);

  const families = useMemo(() => factoryState(), []);
  const bank = soundFontEngine.current;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div
        id="sound-sourcing-panel"
        className="w-full max-w-4xl max-h-[85vh] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
      >
        <div className="p-6 pb-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">Sound sourcing</h2>
              <p className="text-xs text-slate-400">
                What makes sound today, what may become a factory instrument, and what has been ruled out.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* What is loaded right now, read from the engine rather than described. */}
        <div className="px-6 py-3 bg-slate-950/60 border-b border-slate-800/80">
          <div
            id="sourcing-runtime-state"
            className={`text-[11px] font-mono flex items-center gap-2 ${
              bank ? 'text-emerald-300' : 'text-amber-300'
            }`}
          >
            {bank ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
            {bank
              ? `SpessaSynth: "${bank.name}" loaded — ${bank.presets.length} preset(s), ${Math.round(bank.byteLength / 1024)} KB.`
              : 'SpessaSynth: no sound bank loaded. The INSTRUMENT route plays nothing until you supply one.'}
          </div>
        </div>

        <div className="p-6 py-4 bg-slate-950/40 border-b border-slate-800/80 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              id="sourcing-search"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search the sourcing decision — a library, a runtime, a reason…"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:border-amber-500 focus:outline-none font-mono placeholder:text-slate-500"
            />
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            {LENSES.map((l) => (
              <button
                key={l.id}
                onClick={() => setLens(l.id)}
                className={`px-3 py-1.5 rounded-lg border transition-all ${
                  lens === l.id
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-3">
          {lens === 'FACTORY' ? (
            <>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                The factory ships a small, curated set — a family opened to eleven pianos is a research task,
                not an instrument. Nothing is bundled yet, and no row below will claim otherwise until the
                files are here and their licence has been read at the source.
              </p>
              {families.map((f) => (
                <div
                  key={f.family}
                  className="p-4 rounded-2xl bg-slate-950 border border-slate-800/90 flex items-center justify-between"
                >
                  <div>
                    <div className="text-sm font-bold text-slate-100 capitalize">{familyLabel(f.family)}</div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      {f.admitted.length
                        ? f.admitted.map((e) => e.name).join(', ')
                        : 'empty — no instrument admitted'}
                    </div>
                  </div>
                  <div
                    className={`px-3 py-1 rounded-lg text-[11px] font-mono border ${
                      f.admitted.length
                        ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                        : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                  >
                    {f.admitted.length}/{f.capacity} slots
                  </div>
                </div>
              ))}
              {INSTRUMENT_CATALOG.length === 0 && (
                <div className="p-4 rounded-2xl border border-dashed border-slate-800 text-[11px] text-slate-500 font-mono flex items-center gap-2">
                  <CircleSlash className="w-3.5 h-3.5" />
                  The catalogue holds no instruments yet. Adding one is a deliberate act — downloading files
                  and recording a licence reading — not an edit to this screen.
                </div>
              )}
            </>
          ) : (
            <>
              {shown.map((s) => {
                const candidate = s.standing === 'FACTORY_CANDIDATE' || s.standing === 'FALLBACK_ONLY';
                const blocked = candidate
                  ? factoryAdmission({
                      id: s.id,
                      name: s.name,
                      sourceId: s.id,
                      family: s.standing === 'FALLBACK_ONLY' ? 'GM_FALLBACK' : 'KEYS',
                      runtime: 'SF2',
                      character: '',
                      present: false,
                    })
                  : null;
                return (
                  <div
                    key={s.id}
                    className="p-4 rounded-2xl bg-slate-950 border border-slate-800/90 space-y-2"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-slate-100">{s.name}</span>
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-cyan-300 border border-slate-700">
                        {s.role.toLowerCase().replace(/_/g, ' ')}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                          s.standing === 'EXCLUDED'
                            ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                            : s.standing === 'IN_USE'
                              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                              : 'bg-slate-900 text-slate-400 border-slate-800'
                        }`}
                      >
                        {STANDING_LABEL[s.standing]}
                      </span>
                      {s.rightsVerified && (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 text-[10px] font-mono border border-emerald-500/30">
                          rights checked
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">{s.reason}</p>
                    {!s.rightsVerified && s.rightsNote && (
                      <p className="text-[11px] text-amber-300/80 font-mono flex items-start gap-1.5">
                        <ShieldAlert className="w-3.5 h-3.5 mt-px shrink-0" />
                        {s.rightsNote}
                      </p>
                    )}
                    {blocked && !blocked.admitted && (
                      <p className="text-[11px] text-slate-500 font-mono flex items-start gap-1.5">
                        <Ban className="w-3.5 h-3.5 mt-px shrink-0" />
                        Cannot take a slot yet: {blocked.detail}
                      </p>
                    )}
                  </div>
                );
              })}
              {shown.length === 0 && (
                <div className="p-4 rounded-2xl border border-dashed border-slate-800 text-[11px] text-slate-500 font-mono">
                  Nothing in the sourcing decision matches “{query}”.
                </div>
              )}
            </>
          )}
        </div>

        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center space-x-2 font-mono text-[11px]">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <span>
              {SOURCE_POLICY.filter((s) => s.rightsVerified).length} of {SOURCE_POLICY.length} sources have had
              their rights checked. The rest cannot ship a sound.
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-semibold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
