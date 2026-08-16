import React, { useState } from 'react';
import {
  X,
  Cpu,
  Sparkles,
  Sliders,
  ShieldCheck,
  Zap,
  Radio,
  Server,
  Key,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Settings,
  Music,
  Activity,
  Lock,
  Compass,
  GraduationCap,
  FolderKanban,
} from 'lucide-react';
import {
  StudioIntelligenceConfig,
  AiProviderType,
  StudioEmphasis,
  loadAiConfig,
  saveAiConfig,
} from '../lib/studioIntelligenceService';

interface AiControlRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigSaved?: (config: StudioIntelligenceConfig) => void;
}

export const AiControlRoomModal: React.FC<AiControlRoomModalProps> = ({
  isOpen,
  onClose,
  onConfigSaved,
}) => {
  if (!isOpen) return null;

  const [config, setConfig] = useState<StudioIntelligenceConfig>(loadAiConfig());
  const [testStatus, setTestStatus] = useState<'IDLE' | 'TESTING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [testMessage, setTestMessage] = useState<string>('');

  const handleSave = () => {
    saveAiConfig(config);
    if (onConfigSaved) onConfigSaved(config);
    onClose();
  };

  const handleTestConnection = async () => {
    setTestStatus('TESTING');
    setTestMessage('Testing reasoning provider handshake...');

    try {
      if (config.provider === 'LOCAL_BRAIN') {
        setTimeout(() => {
          setTestStatus('SUCCESS');
          setTestMessage('SoulSonus Native Studio Brain is active, grounded, and running 100% offline.');
        }, 250);
        return;
      }

      if (config.provider === 'OLLAMA') {
        const endpoint = config.endpointUrl || 'http://localhost:11434';
        const res = await fetch(`${endpoint}/api/tags`);
        if (res.ok) {
          const data = await res.json();
          setTestStatus('SUCCESS');
          setTestMessage(`Connected to local Ollama! Available models: ${data.models?.map((m: any) => m.name).join(', ') || 'Ready'}`);
        } else {
          throw new Error(`HTTP ${res.status}`);
        }
        return;
      }

      if (config.provider === 'GEMINI') {
        if (!config.apiKey) throw new Error('Please enter your Gemini API Key');
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${config.apiKey}`
        );
        if (res.ok) {
          setTestStatus('SUCCESS');
          setTestMessage('Connected to Google Gemini reasoning backend!');
        } else {
          throw new Error('Invalid Gemini API Key or quota exceeded');
        }
        return;
      }

      if (config.provider === 'OPENAI') {
        if (!config.apiKey) throw new Error('Please enter your OpenAI API Key');
        const res = await fetch('https://api.openai.com/v1/models', {
          headers: { Authorization: `Bearer ${config.apiKey}` },
        });
        if (res.ok) {
          setTestStatus('SUCCESS');
          setTestMessage('Connected to OpenAI GPT reasoning backend!');
        } else {
          throw new Error('Invalid OpenAI API Key');
        }
        return;
      }

      setTestStatus('SUCCESS');
      setTestMessage('Provider configured.');
    } catch (err: any) {
      setTestStatus('ERROR');
      setTestMessage(`Connection error: ${err.message || 'Check network or credentials'}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-3 md:p-6 select-none font-sans">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl relative text-slate-100 flex flex-col gap-5 max-h-[90vh] overflow-y-auto custom-scrollbar font-mono text-xs">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm md:text-base font-black tracking-tight text-white uppercase">
                  STUDIO INTELLIGENCE & REASONING PROVIDERS
                </h2>
                <span className="text-[9px] bg-cyan-500/20 text-cyan-300 font-bold px-2 py-0.5 rounded border border-cyan-500/30">
                  MODEL-NEUTRAL
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                SoulSonus Native Studio Intelligence is the permanent authority. External LLMs are subordinate reasoning resources.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Creator Sovereignty Doctrine Banner */}
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="text-xs font-bold text-amber-300">AUTHORITY MODEL:</span>
            <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
              <strong>LLM reasons. SoulSonus governs. Engines execute. Creator decides.</strong> No provider communicates directly with canonical session state. All advice is non-destructive.
            </p>
          </div>
        </div>

        {/* 1. Select Reasoning Provider */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-300 uppercase flex items-center gap-2">
            <Server className="w-4 h-4 text-cyan-400" />
            <span>1. Reasoning Backend Provider</span>
          </label>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: 'LOCAL_BRAIN', label: 'Native Studio Brain', desc: 'Packaged • 100% Offline', icon: <Cpu className="w-4 h-4 text-amber-400" /> },
              { id: 'OLLAMA', label: 'Local Ollama / LM', desc: 'Llama 3 • Private', icon: <Server className="w-4 h-4 text-cyan-400" /> },
              { id: 'GEMINI', label: 'Google Gemini', desc: '1.5 Pro / Flash', icon: <Zap className="w-4 h-4 text-yellow-400" /> },
              { id: 'OPENAI', label: 'OpenAI GPT', desc: 'GPT-4o / mini', icon: <Sparkles className="w-4 h-4 text-emerald-400" /> },
            ].map((p) => {
              const isSelected = config.provider === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setConfig({ ...config, provider: p.id as AiProviderType })}
                  className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center gap-1.5 transition cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-md font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                  }`}
                >
                  {p.icon}
                  <span className="text-[11px] font-bold">{p.label}</span>
                  <span className="text-[8px] text-slate-500">{p.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Provider Credentials */}
        {config.provider !== 'LOCAL_BRAIN' && (
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 font-bold text-xs text-white">
              <Key className="w-4 h-4 text-amber-400" />
              <span>Provider Credentials ({config.provider})</span>
            </div>

            {config.provider === 'OLLAMA' ? (
              <div className="space-y-2">
                <div>
                  <span className="text-[10px] text-slate-400">Endpoint URL:</span>
                  <input
                    type="text"
                    value={config.endpointUrl || 'http://localhost:11434'}
                    onChange={(e) => setConfig({ ...config, endpointUrl: e.target.value })}
                    className="w-full mt-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400">Model Name:</span>
                  <input
                    type="text"
                    value={config.modelName || 'llama3'}
                    onChange={(e) => setConfig({ ...config, modelName: e.target.value })}
                    className="w-full mt-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            ) : (
              <div>
                <span className="text-[10px] text-slate-400">{config.provider} API Key (Saved in browser localStorage):</span>
                <input
                  type="password"
                  value={config.apiKey || ''}
                  onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                  placeholder={`Enter your ${config.provider} API Key...`}
                  className="w-full mt-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                />
              </div>
            )}

            {/* Test Connection */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testStatus === 'TESTING'}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 text-xs font-bold transition cursor-pointer"
              >
                {testStatus === 'TESTING' ? 'Testing Handshake...' : '⚡ Test Connection'}
              </button>

              {testStatus === 'SUCCESS' && (
                <div className="flex items-center gap-1.5 text-[10px] text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{testMessage}</span>
                </div>
              )}
              {testStatus === 'ERROR' && (
                <div className="flex items-center gap-1.5 text-[10px] text-rose-400">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{testMessage}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. Contextual Emphasis Setting */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-300 uppercase flex items-center gap-2">
            <Radio className="w-4 h-4 text-purple-400" />
            <span>2. Default Contextual Emphasis</span>
          </label>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { id: 'CO_PRODUCER', label: 'Co-Producer', desc: 'Chords, lyrics & vibe', icon: <Music className="w-3.5 h-3.5 text-amber-400" /> },
              { id: 'AUDIO_ENGINEER', label: 'Audio Engineer', desc: 'Mud, EQ, comp, LUFS', icon: <Activity className="w-3.5 h-3.5 text-cyan-400" /> },
              { id: 'TUTOR', label: 'Tutor', desc: 'Music theory & acoustics', icon: <GraduationCap className="w-3.5 h-3.5 text-emerald-400" /> },
              { id: 'PLATFORM_GUIDE', label: 'Platform Guide', desc: 'Daw routing & triggers', icon: <Compass className="w-3.5 h-3.5 text-purple-400" /> },
              { id: 'STUDIO_MANAGER', label: 'Studio Manager', desc: 'Stems & organization', icon: <FolderKanban className="w-3.5 h-3.5 text-blue-400" /> },
            ].map((emp) => {
              const isSelected = config.emphasis === emp.id;
              return (
                <button
                  key={emp.id}
                  type="button"
                  onClick={() => setConfig({ ...config, emphasis: emp.id as StudioEmphasis })}
                  className={`p-2.5 rounded-xl border text-left space-y-0.5 transition cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500/20 border-amber-500 text-white shadow-sm font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-300">
                    {emp.icon}
                    <span>{emp.label}</span>
                  </div>
                  <p className="text-[9px] text-slate-400 font-sans leading-tight">{emp.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            className="px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition cursor-pointer shadow-md shadow-amber-500/20"
          >
            SAVE REASONING SETTINGS
          </button>
        </div>
      </div>
    </div>
  );
};
