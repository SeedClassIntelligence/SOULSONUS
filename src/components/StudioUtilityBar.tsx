import React, { useState } from 'react';
import {
  Brain,
  Cable,
  Compass,
  Database,
  Disc,
  Drum,
  Eye,
  Layers,
  Mic,
  Music2,
  Sliders,
  Sparkles,
  Target,
  Users,
  ChevronLeft,
  ChevronRight,
  Wrench,
} from 'lucide-react';
import { useStudioSession } from '../app/StudioSessionContext';

const openDrawer = (detail: string) =>
  window.dispatchEvent(new CustomEvent('soulsonus:openDrawer', { detail }));

/**
 * The 14 workstations, unchanged. Each entry keeps the exact trigger the
 * horizontal bar used, so every drawer and modal opens as it always did.
 */
export const StudioUtilityBar: React.FC = () => {
  const {
    setIsAudioImportModalOpen,
    setIsVaultModalOpen,
    activeWorkspace,
    isInspectorOpen,
    setIsInspectorOpen,
  } = useStudioSession();

  const [isExpanded, setIsExpanded] = useState(true);

  const tools: {
    group: string;
    items: {
      label: string;
      icon: React.ElementType;
      title: string;
      onClick: () => void;
      tone: string;
      active?: boolean;
    }[];
  }[] = [
    {
      group: 'PERFORMANCE & SOUND',
      items: [
        {
          label: '🎹 PIANO',
          icon: Music2,
          title: 'Open Interactive Virtual Piano Keyboard',
          onClick: () => openDrawer('piano'),
          tone: 'cyan',
        },
        {
          label: 'INSTRUMENT',
          icon: Drum,
          title: 'Open Performance Instrument',
          onClick: () => openDrawer('capture'),
          tone: 'orange',
        },
        {
          label: 'SIGNATURE',
          icon: Sparkles,
          title: 'Open Creator Training & My Sounds Studio',
          onClick: () => openDrawer('training'),
          tone: 'amber',
        },
        {
          label: 'SOURCING',
          icon: Database,
          title: 'Sound Sourcing Vault',
          onClick: () => setIsVaultModalOpen(true),
          tone: 'emerald',
        },
        {
          label: 'COLLAB',
          icon: Users,
          title: 'Open Real-Time Collaboration',
          onClick: () => openDrawer('collab'),
          tone: 'purple',
        },
        {
          label: 'NATIVE BRAIN',
          icon: Brain,
          title: 'Open Native Studio Brain',
          onClick: () => openDrawer('nativebrain'),
          tone: 'purple',
        },
        {
          label: 'WORKSTATION',
          icon: Layers,
          title: 'Open Track Workstation',
          onClick: () => openDrawer('workstation'),
          tone: 'cyan',
          active: activeWorkspace === 'CREATE',
        },
      ],
    },
    {
      group: 'WRITING, SIGNAL & I/O',
      items: [
        {
          label: 'SONGWRITING',
          icon: Mic,
          title: 'Open Songwriting Suite',
          onClick: () => openDrawer('songwriting'),
          tone: 'pink',
        },
        {
          label: 'MIDI HARDWARE',
          icon: Cable,
          title: 'Open External MIDI Controllers & Hardware Synths',
          onClick: () => openDrawer('hardware'),
          tone: 'blue',
        },
        {
          label: 'INSPECTOR',
          icon: Sliders,
          title: 'Open Quick Production Inspector Drawer',
          onClick: () => setIsInspectorOpen(!isInspectorOpen),
          tone: 'slate',
          active: isInspectorOpen,
        },
        {
          label: 'CALIBRATION',
          icon: Target,
          title: 'Open Calibration Drawer',
          onClick: () => openDrawer('calibration'),
          tone: 'slate',
        },
        {
          label: 'RADIAL RADAR',
          icon: Eye,
          title: 'Open Radial Radar Drawer',
          onClick: () => openDrawer('visualization'),
          tone: 'slate',
        },
        {
          label: 'IMPORT AUDIO',
          icon: Disc,
          title: 'Import audio or separate mix into stems',
          onClick: () => setIsAudioImportModalOpen(true),
          tone: 'blue',
        },
        {
          label: 'PIPELINE',
          icon: Compass,
          title: 'Open SoulFlow Governance Pipeline',
          onClick: () => openDrawer('soulflow'),
          tone: 'emerald',
        },
        {
          label: 'SAY IT',
          icon: Mic,
          title: 'Speak or type a command, or just say what you want in your own words',
          onClick: () => openDrawer('voice'),
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
          title={isExpanded ? 'Collapse workstations' : 'Expand workstations'}
        >
          <Wrench className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          {isExpanded && <span className="uppercase tracking-wider truncate">WORKSTATIONS</span>}
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
