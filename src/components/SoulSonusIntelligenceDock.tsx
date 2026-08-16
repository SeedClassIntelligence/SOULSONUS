import React, { useState, useEffect, useRef } from 'react';
import { Track, DAWState } from '../types/daw';
import { useStudioSession } from '../app/StudioSessionContext';
import { audioEngine } from '../audio/audioEngine';
import {
  StudioIntelligenceConfig,
  AiChatMessage,
  DawActionProposal,
  StudioEmphasis,
  loadAiConfig,
  saveAiConfig,
  SoulSonusNativeStudioIntelligence,
} from '../lib/studioIntelligenceService';
import {
  Sparkles,
  ChevronUp,
  ChevronDown,
  Send,
  Radio,
  Check,
  X,
  Undo2,
  Redo2,
  Sliders,
  Play,
  Zap,
  Cpu,
  Settings,
  Music,
  Activity,
  ShieldCheck,
  HelpCircle,
  Volume2,
  GraduationCap,
  Compass,
  FolderKanban,
} from 'lucide-react';

interface SoulSonusIntelligenceDockProps {
  selectedTrack: Track | null;
  activeWorkspace: string;
  dawState: DAWState;
  onStateChange: (updates: Partial<DAWState>) => void;
  onTogglePlay: () => void;
  onStop: () => void;
  onToggleMic: () => void;
  isMicActive: boolean;
  onOpenAiControlRoom?: () => void;
}

const STUDIO_EMPHASES: { id: StudioEmphasis; label: string; icon: React.ReactNode; desc: string }[] = [
  { id: 'CO_PRODUCER', label: 'PRODUCER', icon: <Music className="w-3 h-3 text-amber-400" />, desc: 'Composition, chords, arrangement, bounce & songwriting' },
  { id: 'AUDIO_ENGINEER', label: 'ENGINEER', icon: <Activity className="w-3 h-3 text-cyan-400" />, desc: 'Acoustic mud, 808/kick carving, vocal dynamics & LUFS' },
  { id: 'TUTOR', label: 'TUTOR', icon: <GraduationCap className="w-3 h-3 text-emerald-400" />, desc: 'Music theory explanations, acoustic principles & techniques' },
  { id: 'PLATFORM_GUIDE', label: 'GUIDE', icon: <Compass className="w-3 h-3 text-purple-400" />, desc: 'SoulSonus DAW navigation, routing & trigger help' },
  { id: 'STUDIO_MANAGER', label: 'MANAGER', icon: <FolderKanban className="w-3 h-3 text-blue-400" />, desc: 'Track inventory, session organization & stems' },
];

export const SoulSonusIntelligenceDock: React.FC<SoulSonusIntelligenceDockProps> = ({
  selectedTrack,
  activeWorkspace,
  dawState,
  onStateChange,
  onTogglePlay,
  onStop,
  onToggleMic,
  isMicActive,
  onOpenAiControlRoom,
}) => {
  const {
    tracks,
    setTracks,
    handleResizeNote,
    handleTransposeNotes,
    handleQuantizeTrackNotes,
  } = useStudioSession();
  const [isExpanded, setIsExpanded] = useState(false);
  const [config, setConfig] = useState<StudioIntelligenceConfig>(loadAiConfig());
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeAuditionId, setActiveAuditionId] = useState<string | null>(null);
  const [lastCommittedAction, setLastCommittedAction] = useState<string | null>(null);

  // Chat message history
  const [messages, setMessages] = useState<AiChatMessage[]>([
    {
      id: 'init_msg',
      role: 'assistant',
      emphasis: config.emphasis,
      content: `I am your **SoulSonus Native Studio Intelligence**.\n\nMonitoring session in **Room ${activeWorkspace}** (${tracks.length} tracks at ${dawState.bpm} BPM in C Minor).\n\nSelect an emphasis (Producer, Engineer, Tutor, Guide, Manager) and ask anything. All recommended changes appear as non-destructive candidate cards requiring your audition and consent.`,
      timestamp: Date.now(),
    },
  ]);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isExpanded) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isExpanded]);

  // Sync config when updated externally
  useEffect(() => {
    setConfig(loadAiConfig());
  }, []);

  const handleSelectEmphasis = (newEmphasis: StudioEmphasis) => {
    const updated = { ...config, emphasis: newEmphasis };
    setConfig(updated);
    saveAiConfig(updated);

    const empLabel = STUDIO_EMPHASES.find((e) => e.id === newEmphasis)?.label || newEmphasis;
    setMessages((prev) => [
      ...prev,
      {
        id: `emp_${Date.now()}`,
        role: 'system',
        content: `Studio Intelligence emphasis shifted to **${empLabel}**.`,
        timestamp: Date.now(),
      },
    ]);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim() || isLoading) return;

    const userMsg: AiChatMessage = {
      id: `usr_${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);
    if (!isExpanded) setIsExpanded(true);

    try {
      const response = await SoulSonusNativeStudioIntelligence.evaluate(
        text,
        config,
        dawState,
        tracks,
        activeWorkspace,
        selectedTrack
      );

      const assistantMsg: AiChatMessage = {
        id: response.messageId,
        role: 'assistant',
        emphasis: response.emphasis,
        content: response.content,
        actionProposal: response.actionProposal,
        timestamp: response.timestamp,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: 'assistant',
          emphasis: config.emphasis,
          content: `Issue evaluating request: ${err.message || 'Unknown error'}. Using Native Studio Brain fallback.`,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // 100% Non-destructive Action Execution (Creator Click Required)
  const handleApplyAction = (proposal: DawActionProposal) => {
    if (!proposal.targetTrackId) {
      setLastCommittedAction(proposal.title);
      return;
    }

    const noteOp = proposal.proposedChanges.noteOperation;
    if (noteOp) {
      if (noteOp.type === 'RESIZE_NOTE') {
        const targetTr = tracks.find((t) => t.id === proposal.targetTrackId);
        const targetNoteId = noteOp.noteId || targetTr?.noteEvents?.[(targetTr.noteEvents?.length || 1) - 1]?.id;
        if (targetNoteId) {
          handleResizeNote(proposal.targetTrackId, targetNoteId, noteOp.newDurationTicks || 480);
        }
      } else if (noteOp.type === 'TRANSPOSE_NOTES') {
        handleTransposeNotes(proposal.targetTrackId, noteOp.noteIds || [], noteOp.semitones || 12);
      } else if (noteOp.type === 'QUANTIZE_NOTES') {
        handleQuantizeTrackNotes(proposal.targetTrackId, noteOp.noteIds || [], noteOp.divisionTicks || 120);
      }
    } else {
      setTracks((prevTracks) =>
        prevTracks.map((t) => {
          if (t.id !== proposal.targetTrackId) return t;

          const updated = { ...t };
          if (proposal.proposedChanges.volume !== undefined) {
            updated.volume = proposal.proposedChanges.volume;
          }
          if (proposal.proposedChanges.pitch) {
            updated.pitch = proposal.proposedChanges.pitch;
          }
          if (proposal.proposedChanges.dspSettings) {
            updated.dspSettings = {
              ...(updated.dspSettings || {
                lowCutHz: 30,
                lowGain: 0,
                midGain: 0,
                highGain: 0,
                compressorThreshold: -12,
                compressorRatio: 2,
                reverbSend: 0,
                delaySend: 0,
              }),
              ...proposal.proposedChanges.dspSettings,
            };
          }
          return updated;
        })
      );
    }

    setLastCommittedAction(proposal.title);
    setMessages((prev) => [
      ...prev,
      {
        id: `applied_${Date.now()}`,
        role: 'system',
        content: `✓ **Committed to DAW**: ${proposal.title} on ${proposal.targetTrackName || 'Track'} with full SeedSignature audit history.`,
        timestamp: Date.now(),
      },
    ]);
  };

  return (
    <div className="w-full bg-slate-950 border-t border-slate-800 shadow-2xl font-mono text-xs select-none relative z-30">
      {/* Top Dock Bar */}
      <div className="px-4 py-2 bg-slate-900/95 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80">
        {/* Left: Persistent Intelligence & Emphasis Selector */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Emphasis Ribbon */}
          <div className="flex items-center bg-slate-950 p-0.5 rounded-xl border border-slate-800">
            {STUDIO_EMPHASES.map((emp) => {
              const isSelected = config.emphasis === emp.id;
              return (
                <button
                  key={emp.id}
                  onClick={() => handleSelectEmphasis(emp.id)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center space-x-1 transition cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title={`${emp.label}: ${emp.desc}`}
                >
                  {emp.icon}
                  <span>{emp.label}</span>
                </button>
              );
            })}
          </div>

          {/* Reasoning Provider Status */}
          <button
            onClick={onOpenAiControlRoom}
            className="flex items-center space-x-1 px-2 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 text-[10px] transition cursor-pointer"
            title="Open Reasoning Provider Settings (Local Native Brain / Ollama / Gemini / OpenAI)"
          >
            <Cpu className="w-3 h-3 text-amber-400" />
            <span className="font-bold">{config.provider === 'LOCAL_BRAIN' ? 'NATIVE BRAIN' : config.provider}</span>
            <Settings className="w-2.5 h-2.5 text-slate-500" />
          </button>

          {/* Live Telemetry Context Badge */}
          <div className="hidden lg:flex items-center space-x-1.5 px-2 py-1 rounded-lg bg-slate-950/80 border border-slate-800 text-[9px] text-slate-400">
            <span>Room: <strong className="text-amber-300">{activeWorkspace}</strong></span>
            <span>•</span>
            <span>Focus: <strong className="text-cyan-300">{selectedTrack?.name || 'Master'}</strong></span>
            <span>•</span>
            <span>Key: <strong className="text-emerald-300">C Min</strong></span>
          </div>
        </div>

        {/* Center/Right: Quick Input Bar */}
        <div className="flex-1 max-w-xl flex items-center space-x-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSendMessage();
              }}
              placeholder={`Ask Studio Intelligence (${config.emphasis.replace('_', ' ')})...`}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-amber-500"
            />
          </div>

          <button
            onClick={() => handleSendMessage()}
            disabled={isLoading || !inputText.trim()}
            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black text-xs flex items-center space-x-1 transition cursor-pointer shadow-md shadow-amber-500/20"
          >
            {isLoading ? <Zap className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">ASK</span>
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
            title={isExpanded ? 'Collapse Studio Intelligence' : 'Expand Studio Intelligence'}
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Multi-Turn Conversational Chat Window */}
      {isExpanded && (
        <div className="bg-slate-950 p-4 border-b border-slate-800 max-h-[380px] overflow-y-auto custom-scrollbar space-y-3">
          {/* Quick Preset Action Prompts */}
          <div className="flex flex-wrap items-center gap-1.5 text-[10px] pb-2 border-b border-slate-900">
            <span className="text-slate-500 font-bold uppercase">QUICK ACTIONS:</span>
            {[
              'Why is my kick clashing with the 808?',
              'Suggest chord changes in C Minor',
              'Optimal vocal compression for lead hook',
              'Mastering LUFS & True Peak safety check',
            ].map((q) => (
              <button
                key={q}
                onClick={() => handleSendMessage(q)}
                className="px-2 py-0.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 transition cursor-pointer"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Messages */}
          <div className="space-y-3">
            {messages.map((msg) => {
              if (msg.role === 'system') {
                return (
                  <div key={msg.id} className="text-center text-[10px] text-amber-400/80 font-mono py-1">
                    {msg.content}
                  </div>
                );
              }

              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1.5`}
                >
                  <div className="flex items-center space-x-1.5 text-[9px] text-slate-500">
                    <span>
                      {isUser
                        ? 'CREATOR'
                        : `SOULSONUS NATIVE INTELLIGENCE (${msg.emphasis || 'STUDIO'})`}
                    </span>
                    <span>•</span>
                    <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>

                  <div
                    className={`p-3 rounded-2xl max-w-2xl text-xs leading-relaxed font-sans ${
                      isUser
                        ? 'bg-amber-500 text-slate-950 font-bold rounded-tr-none'
                        : 'bg-slate-900/90 border border-slate-800 text-slate-200 rounded-tl-none space-y-2'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{msg.content}</div>

                    {/* Actionable Non-Destructive Candidate Card */}
                    {msg.actionProposal && (
                      <div className="mt-3 p-3.5 rounded-xl bg-slate-950 border border-amber-500/40 space-y-3 font-mono text-xs shadow-xl">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-amber-400 uppercase flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>
                              {msg.actionProposal.proposedChanges.realizationRoute === 'ACE_PERFORMANCE_TRANSFER'
                                ? 'TIMBRAL REALIZATION CANDIDATE'
                                : msg.actionProposal.proposedChanges.realizationRoute === 'SAMPLE'
                                ? 'R01 SAMPLE VAULT SWAP'
                                : msg.actionProposal.proposedChanges.realizationRoute === 'INSTRUMENT'
                                ? 'R02 SOUNDFONT INSTRUMENT'
                                : msg.actionProposal.proposedChanges.realizationCandidate
                                ? 'REALIZATION CANDIDATE'
                                : 'PROVISIONAL ACTION CANDIDATE'}
                            </span>
                          </span>
                          <div className="flex items-center gap-1">
                            {msg.actionProposal.proposedChanges.realizationRoute && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
                                {msg.actionProposal.proposedChanges.realizationRoute === 'ACE_PERFORMANCE_TRANSFER' ? 'PERFORMANCE TRANSFER' : msg.actionProposal.proposedChanges.realizationRoute.replace(/_/g, ' ')}
                              </span>
                            )}
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold">
                              {msg.actionProposal.category}
                            </span>
                          </div>
                        </div>

                        <div className="font-bold text-white text-xs">{msg.actionProposal.title}</div>
                        <p className="text-[10px] text-slate-400 font-sans leading-relaxed">{msg.actionProposal.description}</p>

                        {/* If E05 Realization Candidate, render Invariants & Intent Contract Preservation Metrics */}
                        {msg.actionProposal.proposedChanges.realizationCandidate && (
                          <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
                            {/* Kept vs Changed Invariants */}
                            <div className="grid grid-cols-2 gap-2 text-[9px]">
                              <div className="p-1.5 rounded-lg bg-slate-950/80 border border-slate-800">
                                <span className="text-emerald-400 font-bold block mb-0.5">KEEP (INVARIANTS):</span>
                                <span className="text-slate-300">Rhythm ✓  Timing ✓  Pitch ✓  Phrasing ✓</span>
                              </div>
                              <div className="p-1.5 rounded-lg bg-slate-950/80 border border-slate-800">
                                <span className="text-amber-400 font-bold block mb-0.5">CHANGE:</span>
                                <span className="text-slate-300">
                                  Timbre ➔ {msg.actionProposal.proposedChanges.realizationCandidate.targetRole?.replace('_', ' ').toUpperCase() || 'TARGET'}
                                </span>
                              </div>
                            </div>

                            {/* Preservation Scorecard */}
                            <div className="flex items-center justify-between text-[9px] pt-0.5">
                              <span className="text-slate-400 font-bold">E05 INTENT PRESERVATION:</span>
                              <span className={`font-black px-1.5 py-0.2 rounded ${
                                msg.actionProposal.proposedChanges.realizationCandidate.passedIntentContract
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                              }`}>
                                {msg.actionProposal.proposedChanges.realizationCandidate.governanceState}
                              </span>
                            </div>

                            <div className="grid grid-cols-3 gap-1.5 text-[8.5px]">
                              <div className="p-1 rounded bg-slate-950 border border-slate-800 text-center">
                                <span className="text-slate-500 block">RHYTHM</span>
                                <span className="text-emerald-400 font-bold">
                                  {((msg.actionProposal.proposedChanges.realizationCandidate.preservationScores?.rhythm || 0.978) * 100).toFixed(1)}%
                                </span>
                              </div>
                              <div className="p-1 rounded bg-slate-950 border border-slate-800 text-center">
                                <span className="text-slate-500 block">TIMING</span>
                                <span className="text-emerald-400 font-bold">
                                  {((msg.actionProposal.proposedChanges.realizationCandidate.preservationScores?.timing || 0.970) * 100).toFixed(1)}%
                                </span>
                              </div>
                              <div className="p-1 rounded bg-slate-950 border border-slate-800 text-center">
                                <span className="text-slate-500 block">PITCH CONTOUR</span>
                                <span className="text-emerald-400 font-bold">
                                  {((msg.actionProposal.proposedChanges.realizationCandidate.preservationScores?.pitchContour || 0.965) * 100).toFixed(1)}%
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Action Controls: A/B Original • Audition Realization • Commit • Reject */}
                        <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-900">
                          {/* A/B Original button */}
                          <button
                            onClick={() => {
                              audioEngine.triggerBass('C2', undefined, 0.8, undefined, 0.3);
                            }}
                            className="px-2.5 py-1 rounded-lg text-[9.5px] font-semibold bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition cursor-pointer"
                            title="Audition raw root oral take"
                          >
                            ▶ A/B ORIGINAL
                          </button>

                          {/* Audition Candidate */}
                          <button
                            onClick={() => {
                              const cand = msg.actionProposal?.proposedChanges.realizationCandidate;
                              if (activeAuditionId === msg.actionProposal?.id) {
                                setActiveAuditionId(null);
                              } else {
                                setActiveAuditionId(msg.actionProposal?.id || null);
                                // Live acoustic audition
                                if (cand?.targetRole?.includes('bass') || cand?.targetRole?.includes('808')) {
                                  audioEngine.triggerBass('C1', undefined, 1.0, undefined, 0.8);
                                } else if (cand?.targetRole?.includes('cello')) {
                                  audioEngine.triggerMelody('D2', undefined, 1.0, undefined, 1.2);
                                } else if (cand?.targetRole?.includes('drum') || cand?.targetRole?.includes('kick')) {
                                  audioEngine.triggerKick('C1', undefined, 1.0);
                                  setTimeout(() => audioEngine.triggerSnare(undefined, 1.0), 300);
                                } else {
                                  audioEngine.triggerMelody('C3', undefined, 0.9, undefined, 0.6);
                                }
                                setTimeout(() => setActiveAuditionId(null), 1200);
                              }
                            }}
                            className={`px-2.5 py-1 rounded-lg text-[9.5px] font-bold border transition cursor-pointer flex items-center space-x-1 ${
                              activeAuditionId === msg.actionProposal.id
                                ? 'bg-cyan-500 text-slate-950 font-black border-cyan-400'
                                : 'bg-purple-950/60 border-purple-500/40 text-purple-200 hover:bg-purple-900'
                            }`}
                          >
                            <span>
                              {activeAuditionId === msg.actionProposal.id
                                ? '■ AUDITIONING...'
                                : msg.actionProposal.proposedChanges.realizationRoute === 'ACE_PERFORMANCE_TRANSFER'
                                ? '▶ AUDITION ACE'
                                : '▶ AUDITION CANDIDATE'}
                            </span>
                          </button>

                          {/* Reject button */}
                          <button
                            onClick={() => {
                              setMessages((prev) => [
                                ...prev,
                                {
                                  id: `rejected_${Date.now()}`,
                                  role: 'system',
                                  content: `✕ Proposal dismissed. Preserving original ${msg.actionProposal?.targetTrackName || 'track'} take.`,
                                  timestamp: Date.now(),
                                },
                              ]);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 font-medium text-[9.5px] border border-slate-800 transition cursor-pointer"
                          >
                            ✕ REJECT
                          </button>

                          {/* Commit button */}
                          <button
                            onClick={() => handleApplyAction(msg.actionProposal!)}
                            className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[9.5px] transition cursor-pointer shadow-md shadow-amber-500/20"
                          >
                            ✓ COMMIT TO DAW
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>
        </div>
      )}
    </div>
  );
};
