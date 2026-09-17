import React, { useState } from 'react';
import { Users } from 'lucide-react';
import { SESSION_BAND, type BandRole, type GrantLevel } from '../lib/sessionBand';
import { useStudioSession } from '../app/StudioSessionContext';

/**
 * The band, on screen.
 *
 * The players were already here -- seven roles in `sessionBand.ts`, each with
 * the instruments it hands back and the things it listens to, and
 * `handleCallSessionPlayer` to call one. There was simply nowhere to see them:
 * the only door was typing "bassist" into Studio Intelligence and hoping
 * `readAddress` found the word. This is that same band and that same call,
 * rendered.
 *
 * Nothing here is invented, and that is deliberate. Each card shows the role's
 * own `label`, its own `instruments` and its own `attends` list -- the
 * listening priorities the player actually uses. No display names, no
 * biographies, no genre vocabularies: those would be a data addition the owner
 * makes, not a caption a component writes for itself. A card that says a
 * player listens to the kick when nothing in the model says so is the
 * invented-score failure in a different costume.
 *
 * And no engine is named. Which realization backend renders a take is a
 * deployment fact behind the provider seam; the creator is working with a
 * bassist.
 */

const GRANTS: { level: GrantLevel; label: string; says: string }[] = [
  { level: 'PLAY_EXACTLY', label: 'EXACTLY', says: 'Play what I gave you, as I gave it.' },
  { level: 'PLAY_AROUND_IT', label: 'AROUND IT', says: 'Stay with my phrase, move inside it.' },
  { level: 'PLAY_WHAT_YOU_FEEL', label: 'WHAT YOU FEEL', says: 'Take the part and play it your way.' },
];

export const SessionBandPanel: React.FC = () => {
  const { handleCallSessionPlayer } = useStudioSession();
  const [grant, setGrant] = useState<GrantLevel>('PLAY_AROUND_IT');
  const [calling, setCalling] = useState<BandRole | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const call = async (role: BandRole) => {
    setCalling(role);
    setNote(null);
    try {
      const result = await handleCallSessionPlayer(role, grant, GRANTS.find((g) => g.level === grant)!.says);
      setNote(result.message);
    } finally {
      setCalling(null);
    }
  };

  return (
    <section
      data-testid="session-band"
      className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3 space-y-2.5 font-mono"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className="flex items-center gap-1.5 text-[10px] font-black tracking-widest text-purple-300">
          <Users className="w-3.5 h-3.5 text-purple-400" />
          THE BAND · SESSION PLAYERS
        </span>
        <span className="text-[9.5px] text-slate-500">
          Their take lands on its own channel, beside yours. Yours is never written over.
        </span>

        <div className="ml-auto flex items-center gap-1" data-testid="band-grant">
          {GRANTS.map((g) => (
            <button
              key={g.level}
              type="button"
              onClick={() => setGrant(g.level)}
              title={g.says}
              className={`px-2 h-7 rounded-lg text-[9px] font-bold border transition cursor-pointer ${
                grant === g.level
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-300'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {SESSION_BAND.map((player) => (
          <button
            key={player.role}
            type="button"
            data-testid={`band-${player.role.toLowerCase()}`}
            onClick={() => void call(player.role)}
            disabled={calling !== null}
            title={`Call the ${player.label.toLowerCase()} — ${GRANTS.find((g) => g.level === grant)!.says}`}
            className="text-left rounded-xl border border-slate-800 bg-slate-950 px-2.5 py-2 hover:border-purple-500/40 hover:bg-slate-900 transition cursor-pointer disabled:opacity-50 disabled:cursor-wait"
          >
            <div className="text-[11px] font-black text-slate-100 uppercase tracking-wide truncate">
              {player.label}
            </div>
            <div className="text-[9px] text-purple-300 truncate">{player.instruments.join(' · ')}</div>
            <div className="text-[8.5px] text-slate-500 leading-snug mt-1 line-clamp-2">
              Listens for {player.attends.slice(0, 3).join(', ')}
            </div>
            <div className="text-[8.5px] font-bold text-emerald-400 mt-1">
              {calling === player.role ? 'PLAYING…' : 'READY'}
            </div>
          </button>
        ))}
      </div>

      {note && (
        <p data-testid="band-result" className="text-[10px] text-slate-300 leading-relaxed">
          {note}
        </p>
      )}
    </section>
  );
};
