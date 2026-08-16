import React, { useState } from 'react';
import { Mic, Send, Volume2, Sparkles, Terminal } from 'lucide-react';
import { parseVoiceCommand, VoiceCommandResult } from '../audio/voiceCommands';

interface VoiceCommandBarProps {
  onExecuteCommand: (result: VoiceCommandResult) => void;
}

export const VoiceCommandBar: React.FC<VoiceCommandBarProps> = ({ onExecuteCommand }) => {
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [lastFeedback, setLastFeedback] = useState<string | null>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    const result = parseVoiceCommand(inputText);
    setLastFeedback(result.feedbackText);
    onExecuteCommand(result);
    setInputText('');
  };

  const handleMicClick = () => {
    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any }).SpeechRecognition ||
      (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any }).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setLastFeedback('Web Speech API is not supported in this browser. Please type commands below.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setLastFeedback('Listening for voice command... (e.g. "Clone bar 1", "Make kick fatter", "Nudge left")');
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setIsListening(false);
        setInputText(transcript);
        const result = parseVoiceCommand(transcript);
        setLastFeedback(`Recognized: "${transcript}" → ${result.feedbackText}`);
        onExecuteCommand(result);
      };

      recognition.onerror = () => {
        setIsListening(false);
        setLastFeedback('Voice recognition error. Try typing your command.');
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch {
      setIsListening(false);
      setLastFeedback('Could not access speech recognition.');
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 shadow-lg select-none">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Header Title & Context Badge */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black uppercase text-slate-100 tracking-wider">
                  CO-PRODUCER AI COMMAND BAR
                </span>
                <span className="text-[10px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded border border-purple-500/30 font-bold">
                  CLAP & STT
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Speak or type contextual studio commands: "Make kick fatter", "Nudge left", "Clone bar 1"
              </p>
            </div>
          </div>
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSubmit} className="flex-1 max-w-xl flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder='Try "Clone bar 1", "Nudge right", "Fat meaty kick"...'
              className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 text-xs text-slate-100 rounded-xl py-2 px-3 pl-8 outline-none transition placeholder:text-slate-500"
            />
            <Sparkles className="w-3.5 h-3.5 text-amber-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          </div>

          <button
            type="button"
            onClick={handleMicClick}
            className={`px-3 py-2 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 active:scale-95 ${
              isListening
                ? 'bg-rose-500 text-white border-rose-400 animate-pulse'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
            title="Speak voice command"
          >
            <Mic className={`w-3.5 h-3.5 ${isListening ? 'text-white' : 'text-amber-400'}`} />
            <span>{isListening ? 'LISTENING...' : 'VOICE'}</span>
          </button>

          <button
            type="submit"
            className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition active:scale-95 shadow-md shadow-amber-500/20 flex items-center gap-1"
          >
            <Send className="w-3.5 h-3.5" />
            <span>EXECUTE</span>
          </button>
        </form>
      </div>

      {/* Feedback Banner */}
      {lastFeedback && (
        <div className="mt-2 text-[11px] font-mono px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-amber-300 flex items-center gap-2">
          <Volume2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="truncate">{lastFeedback}</span>
        </div>
      )}
    </div>
  );
};
