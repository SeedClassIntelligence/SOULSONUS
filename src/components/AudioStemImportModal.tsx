import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Upload, Disc, Layers, Music, Activity, Mic, Sparkles, CheckCircle2, Play, FileAudio, Server, RefreshCw, AlertCircle } from 'lucide-react';
import { useStudioSession } from '../app/StudioSessionContext';
import type { AudioImportResult } from '../app/StudioSessionContext';
import type { ContentAnalysis } from '../audio/offlinePerformanceAnalysis';
import { getInferenceSettings, setInferenceSettings } from '../lib/inference/inferenceSettings';
import { DemucsClient } from '../lib/inference/demucsClient';

interface AudioStemImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AudioStemImportModal: React.FC<AudioStemImportModalProps> = ({ isOpen, onClose }) => {
  const { handleAnalyzeAudioFile, handleImportAudioFile } = useStudioSession();
  const [activeTab, setActiveTab] = useState<'STEMS_4WAY' | 'SINGLE_TRACK' | 'MELODY'>('STEMS_4WAY');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processProgress, setProcessProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState<ContentAnalysis | null>(null);
  const [result, setResult] = useState<AudioImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // The stem-separation host has no code-configurable secret to protect (it's
  // a self-hosted, no-auth service by design -- see inference-server/demucs-
  // service), so unlike ACE-Step it is called straight from the browser, which
  // means it needs a place a creator can actually point at their own host.
  // getInferenceSettings() already persisted this to localStorage; nothing
  // in the UI ever surfaced a way to change it.
  const [demucsEndpointInput, setDemucsEndpointInput] = useState(() => getInferenceSettings().demucsEndpoint);
  const [demucsTestStatus, setDemucsTestStatus] = useState<'IDLE' | 'TESTING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [demucsTestMessage, setDemucsTestMessage] = useState('');

  const handleSaveDemucsEndpoint = () => {
    setInferenceSettings({ demucsEndpoint: demucsEndpointInput.trim() });
  };

  const handleTestDemucsConnection = async () => {
    handleSaveDemucsEndpoint();
    setDemucsTestStatus('TESTING');
    setDemucsTestMessage('Reaching the separation host...');
    const health = await new DemucsClient(demucsEndpointInput.trim()).health();
    if (health.ok) {
      setDemucsTestStatus('SUCCESS');
      setDemucsTestMessage(`Connected. Model ${health.model || 'unknown'} on ${health.device || 'unknown device'}.`);
    } else {
      setDemucsTestStatus('ERROR');
      setDemucsTestMessage('Could not reach a separation host at this address.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setContent(null);
      setResult(null);
      setError(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  // The two tabs are the Case A / Case B decision point. They are not two
  // renderings of one pipeline: a solo take is a classification problem the
  // onset classifier already solves, while a finished mix has several
  // instruments sounding at once, which is a source-separation problem.
  const handleAnalyse = async () => {
    if (!selectedFile) return;
    setError(null);
    setResult(null);
    setIsProcessing(true);
    setStatusMessage('Measuring the file…');
    setProcessProgress(30);
    try {
      const analysis = await handleAnalyzeAudioFile(selectedFile);
      setContent(analysis);
      // Only pre-select when the audio actually supports a recommendation.
      // Continuous material could be a held vocal or a finished mix, and
      // defaulting on a coin flip would make a wrong mode look considered.
      if (!analysis.ambiguous) {
        setActiveTab(analysis.suggestion === 'FULL_MIX' ? 'STEMS_4WAY' : 'SINGLE_TRACK');
      }
      setProcessProgress(100);
      setStatusMessage('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'This file could not be decoded.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleProcess = async () => {
    if (!selectedFile) return;
    setError(null);
    setResult(null);
    setIsProcessing(true);
    setProcessProgress(20);
    const mode =
      activeTab === 'STEMS_4WAY' ? 'FULL_MIX' : activeTab === 'MELODY' ? 'MELODY' : 'SOLO_PERFORMANCE';
    setStatusMessage(
      mode === 'FULL_MIX'
        ? 'Sending to Demucs stem separation…'
        : mode === 'MELODY'
          ? 'Following the pitch, note by note…'
          : 'Detecting and classifying each sound in the performance…'
    );
    try {
      const res = await handleImportAudioFile(selectedFile, mode);
      setProcessProgress(100);
      setResult(res);
      setStatusMessage('');
      if (!res.ok) setError(res.message);
    } catch (err) {
      // Failure is shown. It never falls back to writing the same material onto
      // every channel, which is the behaviour this pipeline replaced.
      setError(err instanceof Error ? err.message : 'Import failed.');
      setStatusMessage('');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-mono select-none">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-2xl bg-slate-950 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/90">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-500/40 shadow-inner">
                  <Disc className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">
                    IMPORT AUDIO & MULTITRACK STEMS
                  </h3>
                  <p className="text-[11px] text-slate-400 font-sans">
                    Demucs v4 Neural Stem Separation • 24-Bit Audio Ingestion • SeedSignature Lineage
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 space-y-5">
              {/* Tab Mode Selector */}
              <div className="grid grid-cols-3 gap-2 p-1 rounded-2xl bg-slate-900 border border-slate-800 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setActiveTab('STEMS_4WAY')}
                  className={`py-2.5 rounded-xl transition cursor-pointer flex items-center justify-center space-x-2 ${
                    activeTab === 'STEMS_4WAY'
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  <span>Demucs 4-Stem Separation</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('SINGLE_TRACK')}
                  className={`py-2.5 rounded-xl transition cursor-pointer flex items-center justify-center space-x-2 ${
                    activeTab === 'SINGLE_TRACK'
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <FileAudio className="w-4 h-4" />
                  <span>Performance → Channels</span>
                </button>

                {/*
                  * The third case. The classifier tells a kick from a snare and
                  * has no opinion about whether you hummed a C or an E; this
                  * one follows the pitch and has no opinion about drums.
                  */}
                <button
                  type="button"
                  id="tab-melody"
                  onClick={() => setActiveTab('MELODY')}
                  className={`py-2.5 rounded-xl transition cursor-pointer flex items-center justify-center space-x-2 ${
                    activeTab === 'MELODY'
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Music className="w-4 h-4" />
                  <span>Hum → Notes</span>
                </button>
              </div>

              {/* Where the real separation happens. STEMS_4WAY is the only mode
                  that calls out to Demucs, so this only needs to appear here --
                  SINGLE_TRACK and MELODY run entirely on-device. */}
              {activeTab === 'STEMS_4WAY' && (
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1.5">
                    <Server className="w-3 h-3 text-cyan-400" />
                    <span>Separation host</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={demucsEndpointInput}
                      onChange={(e) => setDemucsEndpointInput(e.target.value)}
                      onBlur={handleSaveDemucsEndpoint}
                      placeholder="http://localhost:8010"
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                    />
                    <button
                      type="button"
                      onClick={handleTestDemucsConnection}
                      disabled={demucsTestStatus === 'TESTING'}
                      className="px-2.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[10px] font-bold text-cyan-300 transition cursor-pointer disabled:opacity-50 flex items-center gap-1 shrink-0"
                    >
                      <RefreshCw className={`w-3 h-3 ${demucsTestStatus === 'TESTING' ? 'animate-spin' : ''}`} />
                      <span>TEST</span>
                    </button>
                  </div>
                  {demucsTestStatus !== 'IDLE' && (
                    <div
                      className={`flex items-center gap-1.5 text-[10px] ${
                        demucsTestStatus === 'SUCCESS'
                          ? 'text-emerald-300'
                          : demucsTestStatus === 'ERROR'
                            ? 'text-rose-300'
                            : 'text-slate-400'
                      }`}
                    >
                      {demucsTestStatus === 'SUCCESS' ? (
                        <CheckCircle2 className="w-3 h-3 shrink-0" />
                      ) : demucsTestStatus === 'ERROR' ? (
                        <AlertCircle className="w-3 h-3 shrink-0" />
                      ) : null}
                      <span>{demucsTestMessage}</span>
                    </div>
                  )}
                  <p className="text-[9px] text-slate-500 font-sans leading-snug">
                    Demucs runs self-hosted, with no key to protect, so the browser calls it directly --
                    point this at wherever you're running inference-server/demucs-service.
                  </p>
                </div>
              )}

              {/* Drag & Drop Upload Zone */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-blue-500 rounded-3xl p-8 text-center bg-slate-900/40 hover:bg-slate-900/70 transition cursor-pointer space-y-3"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/30 flex items-center justify-center mx-auto shadow-inner">
                  <Upload className="w-6 h-6" />
                </div>

                {selectedFile ? (
                  <div className="space-y-1">
                    <div className="text-sm font-black text-emerald-400 flex items-center justify-center space-x-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{selectedFile.name}</span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready for processing
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="text-sm font-bold text-slate-200">
                      Click to choose audio or drag & drop file here
                    </div>
                    <div className="text-[11px] text-slate-400 font-sans">
                      Supports WAV, MP3, FLAC, M4A, OGG (Up to 100MB)
                    </div>
                  </div>
                )}
              </div>

              {/* What kind of file is this? The Case A / Case B decision. */}
              {selectedFile && (
                <div className="space-y-2.5 pt-1 border-t border-slate-800">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                      What is in this file?
                    </div>
                    <button
                      type="button"
                      onClick={handleAnalyse}
                      disabled={isProcessing}
                      className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[10px] font-bold text-cyan-300 transition cursor-pointer disabled:opacity-50"
                    >
                      Check the file for me
                    </button>
                  </div>

                  {content && (
                    <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-1">
                      <div
                        data-testid="content-verdict"
                        className={`text-[11px] font-bold ${content.ambiguous ? 'text-amber-300' : 'text-cyan-300'}`}
                      >
                        {content.ambiguous ? (
                          "Can't tell from the audio — choose below"
                        ) : (
                          <>
                            Looks like {content.suggestion === 'FULL_MIX' ? 'a finished mix' : 'a solo performance'}
                            <span className="text-slate-500 font-normal">
                              {' '}({Math.round(content.confidence * 100)}% confident)
                            </span>
                          </>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 font-sans leading-snug">{content.reason}</div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('SINGLE_TRACK')}
                      className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                        activeTab === 'SINGLE_TRACK'
                          ? 'bg-amber-500/15 border-amber-500/60'
                          : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-xs font-bold text-amber-300">Solo performance</div>
                      <div className="text-[9px] text-slate-500 font-sans leading-snug">
                        One source at a time — a beatbox, tap or vocal take. Separated by sound type into channels.
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('STEMS_4WAY')}
                      className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                        activeTab === 'STEMS_4WAY'
                          ? 'bg-cyan-500/15 border-cyan-500/60'
                          : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-xs font-bold text-cyan-300">Finished mix</div>
                      <div className="text-[9px] text-slate-500 font-sans leading-snug">
                        Several instruments at once — a beat or full song. Split into stems by Demucs.
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <div
                  data-testid="import-error"
                  className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/50 text-[11px] text-rose-200 font-sans leading-snug"
                >
                  {error}
                </div>
              )}

              {result && result.ok && (
                <div
                  data-testid="import-result"
                  className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-[11px] text-emerald-200 font-sans leading-snug"
                >
                  {result.message}
                  {result.transcription && (
                    <div
                      id="transcription-detail"
                      className="mt-1.5 pt-1.5 border-t border-emerald-500/25 font-mono text-[10px] text-emerald-300/80"
                    >
                      {result.transcription.lowestNote}–{result.transcription.highestNote} ·{' '}
                      {result.transcription.windows} window
                      {result.transcription.windows === 1 ? '' : 's'} through{' '}
                      {result.transcription.engine.replace(/_/g, ' ').toLowerCase()}
                    </div>
                  )}
                </div>
              )}

              {/* Progress indicator when importing */}
              {isProcessing && (
                <div className="space-y-2 p-3.5 rounded-2xl bg-blue-950/40 border border-blue-500/40">
                  <div className="flex items-center justify-between text-[11px] font-bold text-blue-300">
                    <span>{statusMessage}</span>
                    <span>{processProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-300"
                      style={{ width: `${processProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold transition cursor-pointer border border-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!selectedFile || isProcessing}
                  onClick={handleProcess}
                  className={`px-6 py-2.5 rounded-xl text-xs font-black tracking-wider transition cursor-pointer shadow-lg flex items-center space-x-2 ${
                    selectedFile && !isProcessing
                      ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/40 active:scale-95'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  }`}
                >
                  <Disc className="w-3.5 h-3.5" />
                  <span>
                    {activeTab === 'STEMS_4WAY'
                      ? 'SEPARATE INTO STEMS'
                      : activeTab === 'MELODY'
                        ? 'TRANSCRIBE THE MELODY'
                        : 'SEPARATE PERFORMANCE INTO CHANNELS'}
                  </span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
