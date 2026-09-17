import React, { useState } from 'react';
import { levelOf, LEVEL_MEANING, type SurfaceName } from '../lib/disclosureLevels';
import {
  Brain,
  Cable,
  Compass,
  Database,
  Disc,
  Drum,
  Eye,
  Grid3x3,
  Layers,
  Mic,
  Music2,
  Sliders,
  Sparkles,
  Target,
  Type,
  Users,
  ChevronLeft,
  ChevronRight,
  Wrench,
} from 'lucide-react';
import { useStudioSession } from '../app/StudioSessionContext';

const openDrawer = (detail: string) =>
  window.dispatchEvent(new CustomEvent('soulsonus:openDrawer', { detail }));

/**
 * The rail. Every entry fires the trigger it always fired, so every drawer and
 * modal opens as it always did; what changed is which group it is filed under
 * and what it is called.
 */
export const StudioUtilityBar: React.FC = () => {
  const {
    setIsAudioImportModalOpen,
    setIsVaultModalOpen,
    activeWorkspace,
    setActiveWorkspace,
    isInspectorOpen,
    setIsInspectorOpen,
  } = useStudioSession();

  const [isExpanded, setIsExpanded] = useState(true);

  /**
   * Level 4, declared rather than implied.
   *
   * Amendment A §17 puts these here -- "available instantly, but not
   * permanently demanding attention" -- and §16 is why none of them is gone:
   * "the professional DAW controls should NOT disappear." The `surface` field
   * is not a label. It is typed against the level table, so a utility added
   * here without a declared level does not compile, and cannot end up in a
   * rail that no level accounts for.
   */
  /**
   * Four groups, in the order a session actually reaches for them: the thing
   * you are playing, the people playing with you, the writing, and the
   * systems underneath.
   *
   * Amendment A §17 puts these here -- "available instantly, but not
   * permanently demanding attention" -- and §16 is why none of them is gone:
   * "the professional DAW controls should NOT disappear." The regroup renamed
   * and reordered; it removed nothing. TRAINING, RADAR and SAY IT are not in
   * the new arrangement's picture and are kept anyway, because a rail entry
   * taken away is a surface made unreachable, which is Amendment D.
   *
   * The `surface` field is not a label. It is typed against the level table,
   * so a utility added here without a declared level does not compile, and
   * cannot end up in a rail that no level accounts for.
   */
  const tools: {
    group: string;
    items: {
      label: string;
      icon: React.ElementType;
      title: string;
      onClick: () => void;
      tone: string;
      active?: boolean;
      surface: SurfaceName;
    }[];
  }[] = [
    {
      group: 'TOOLS & WORKSTATIONS',
      items: [
        {
          label: 'STUDIO RECORDING',
          surface: 'recordingSurface',
          icon: Mic,
          title: 'The booth: the microphone, what it is pointed at, and how to understand what you play',
          onClick: () => setActiveWorkspace('CREATE'),
          tone: 'amber',
          active: activeWorkspace === 'CREATE',
        },
        {
          label: '🎹 PIANO / KEYS',
          surface: 'piano',
          icon: Music2,
          title: 'Open Interactive Virtual Piano Keyboard',
          onClick: () => openDrawer('piano'),
          tone: 'cyan',
        },
        {
          label: 'INSTRUMENT',
          surface: 'instrumentRoom',
          icon: Drum,
          title: 'Open Performance Instrument',
          onClick: () => openDrawer('capture'),
          tone: 'orange',
        },
        {
          label: 'BEAT MACHINE',
          surface: 'patternControls',
          icon: Grid3x3,
          title: 'Grid tools — clone, nudge, invert, randomise, clear',
          onClick: () => openDrawer('pattern'),
          tone: 'amber',
        },
        {
          label: 'SOURCING',
          surface: 'sourcing',
          icon: Database,
          title: 'Sound Sourcing Vault',
          onClick: () => setIsVaultModalOpen(true),
          tone: 'emerald',
        },
        {
          label: 'WORKSTATION',
          surface: 'trackWorkstation',
          icon: Layers,
          title: 'Open Track Workstation',
          onClick: () => openDrawer('workstation'),
          tone: 'cyan',
        },
      ],
    },
    {
      group: 'BAND & COLLABORATION',
      items: [
        {
          label: 'SESSION PLAYERS',
          surface: 'sessionPlayers',
          icon: Users,
          title: 'The band — call a player; their take lands on its own channel beside yours',
          onClick: () => setActiveWorkspace('CREATE'),
          tone: 'purple',
        },
        {
          label: 'BACKGROUND VOCALS',
          surface: 'sessionPlayers',
          icon: Music2,
          title: 'Background vocals are one of the band roles, not a separate system — called from the same panel',
          onClick: () => setActiveWorkspace('CREATE'),
          tone: 'pink',
        },
        {
          label: 'COLLABORATION',
          surface: 'collaboration',
          icon: Users,
          title: 'Open Real-Time Collaboration',
          onClick: () => openDrawer('collab'),
          tone: 'purple',
        },
      ],
    },
    {
      group: 'CREATIVE UTILITIES',
      items: [
        {
          label: 'SONGWRITING',
          surface: 'songwritingSuite',
          icon: Mic,
          title: 'Open Songwriting Suite',
          onClick: () => openDrawer('songwriting'),
          tone: 'pink',
        },
        {
          label: 'VOCAL TO LYRIC',
          surface: 'vocalToLyric',
          icon: Type,
          title: 'Read a sung or hummed take as a lyric seed and fit words to its cadence',
          onClick: () => openDrawer('lyric'),
          tone: 'purple',
        },
        {
          label: 'TAKES',
          surface: 'takePads',
          icon: Grid3x3,
          title: 'Performance take slots — pick which one the next pass lands on',
          onClick: () => openDrawer('takes'),
          tone: 'cyan',
        },
        {
          label: 'MY SOUNDS',
          surface: 'training',
          icon: Sparkles,
          title: 'Open Creator Training & My Sounds Studio',
          onClick: () => openDrawer('training'),
          tone: 'amber',
        },
        {
          label: 'MIDI HARDWARE',
          surface: 'midiHardware',
          icon: Cable,
          title: 'Open External MIDI Controllers & Hardware Synths',
          onClick: () => openDrawer('hardware'),
          tone: 'blue',
        },
        {
          label: 'IMPORT AUDIO',
          surface: 'importAudio',
          icon: Disc,
          title: 'Import audio or separate mix into stems',
          onClick: () => setIsAudioImportModalOpen(true),
          tone: 'blue',
        },
        {
          label: 'SAY IT',
          surface: 'nativeBrain',
          icon: Mic,
          title: 'Speak or type a command, or just say what you want in your own words',
          onClick: () => openDrawer('voice'),
          tone: 'amber',
        },
      ],
    },
    {
      group: 'STUDIO SYSTEMS',
      items: [
        {
          label: 'INSPECTOR',
          surface: 'inspector',
          icon: Sliders,
          title: 'Open Quick Production Inspector Drawer',
          onClick: () => setIsInspectorOpen(!isInspectorOpen),
          tone: 'slate',
          active: isInspectorOpen,
        },
        {
          label: 'CALIBRATION',
          surface: 'calibration',
          icon: Target,
          title: 'Open Calibration Drawer',
          onClick: () => openDrawer('calibration'),
          tone: 'slate',
        },
        {
          label: 'RADIAL RADAR',
          surface: 'radar',
          icon: Eye,
          title: 'Open Radial Radar Drawer',
          onClick: () => openDrawer('visualization'),
          tone: 'slate',
        },
        {
          label: 'PIPELINE',
          surface: 'soulFlow',
          icon: Compass,
          title: 'Open SoulFlow Governance Pipeline',
          onClick: () => openDrawer('soulflow'),
          tone: 'emerald',
        },
        {
          label: 'NATIVE BRAIN',
          surface: 'nativeBrain',
          icon: Brain,
          title: 'Open Native Studio Brain',
          onClick: () => openDrawer('nativebrain'),
          tone: 'purple',
        },
        {
          label: 'SEEDSIGNATURE',
          surface: 'seedSignature',
          icon: Sparkles,
          title: 'Open the SeedSignature inspector — creator origin, provenance and rights',
          onClick: () => openDrawer('seedsignature'),
          tone: 'amber',
        },
      ],
    },
  ];

  const TONE: Record<string, string> = {
    cyan: 'bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border-cyan-500/40',
    orange: 'bg-orange-500/15 hover:bg-orange-500/25 text-orange-300 border-orange-500/40',
    amber: 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/40',
    emerald: 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    purple: 'bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border-purple-500/40',
    pink: 'bg-pink-500/10 hover:bg-pink-500/20 text-pink-300 border-pink-500/30',
    blue: 'bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border-blue-500/40',
    slate: 'bg-slate-800/60 hover:bg-slate-700/60 text-slate-300 border-slate-700',
  };
  const ICON_TONE: Record<string, string> = {
    cyan: 'text-cyan-400',
    orange: 'text-orange-400',
    amber: 'text-amber-400',
    emerald: 'text-emerald-400',
    purple: 'text-purple-400',
    pink: 'text-pink-400',
    blue: 'text-blue-400',
    slate: 'text-slate-400',
  };

  return (
    <aside
      className={`shrink-0 font-mono select-none transition-all duration-150 ${
        isExpanded ? 'w-[186px]' : 'w-[60px]'
      }`}
    >
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-2 shadow-xl flex flex-col space-y-1.5 sticky top-2">
        <button
          type="button"
          onClick={() => setIsExpanded((v) => !v)}
          className="flex items-center space-x-2 px-1 py-1 text-[10px] font-bold text-slate-300 hover:text-amber-400 cursor-pointer transition"
          title={`${LEVEL_MEANING[levelOf('piano')]} ${
            isExpanded ? 'Click to collapse.' : 'Click to expand.'
          }`}
        >
          <Wrench className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          {isExpanded && (
            <span className="uppercase tracking-wider truncate" data-testid="level-4-label">
              WORKSTATIONS
            </span>
          )}
          {isExpanded ? (
            <ChevronLeft className="w-3 h-3 text-slate-400 ml-auto shrink-0" />
          ) : (
            <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
          )}
        </button>

        {tools.map((section) => (
          <div key={section.group} className="flex flex-col gap-1 border-t border-slate-800/80 pt-1.5">
            {isExpanded && (
              <span className="px-1 text-[8px] font-bold tracking-widest text-slate-600 uppercase">
                {section.group}
              </span>
            )}
            {section.items.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.label}
                  onClick={t.onClick}
                  title={t.title}
                  className={`px-2 py-1.5 rounded-xl border text-[10px] font-bold flex items-center transition cursor-pointer active:scale-95 ${
                    isExpanded ? 'space-x-1.5' : 'justify-center'
                  } ${
                    t.active
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 border-cyan-400 font-black'
                      : TONE[t.tone]
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${t.active ? 'text-slate-950' : ICON_TONE[t.tone]}`} />
                  {isExpanded && <span className="truncate">{t.label}</span>}
                </button>
              );
            })}
          </div>
        ))}

        {isExpanded && (
          <span className="px-1 pt-1 text-[8px] text-slate-600 font-bold border-t border-slate-800/80">
            1-CLICK CREATOR WORKSTATIONS
          </span>
        )}
      </div>
    </aside>
  );
};
