import React from 'react';
import { useStudioSession } from '../app/StudioSessionContext';
import { Activity, ShieldCheck, Cpu, Volume2, Users, FileCheck, Layers } from 'lucide-react';

export const StudioMasterStatusBar: React.FC = () => {
  const { dawState, creatorName, seedRecords, tracks } = useStudioSession();

  const isSigned = seedRecords && seedRecords.length > 0;

  return (
    <footer className="w-full bg-slate-950 border-t border-slate-900 px-4 py-2 text-[11px] font-mono text-slate-400 flex flex-wrap items-center justify-between gap-3 select-none">
      {/* Left: Master Bus Limiter & Engine Status */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-1.5 text-emerald-400 font-bold">
          <Volume2 className="w-3.5 h-3.5" />
          <span>MASTER BUS: -0.5dB LIMITER ACTIVE</span>
        </div>
        <span className="text-slate-700">•</span>
        <div className="flex items-center space-x-1 text-slate-300">
          <Cpu className="w-3.5 h-3.5 text-cyan-400" />
          <span>DSP CPU: 3%</span>
        </div>
        <span className="text-slate-700 hidden sm:inline">•</span>
        <div className="flex items-center space-x-1 text-slate-300 hidden sm:flex">
          <Layers className="w-3.5 h-3.5 text-amber-400" />
          <span>PROJECT: {dawState.projectName} ({dawState.projectVersion || 'v1.0.0'})</span>
        </div>
      </div>

      {/* Right: Provenance, Rights & Collab Telemetry */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-1">
          <ShieldCheck className={`w-3.5 h-3.5 ${isSigned ? 'text-emerald-400' : 'text-amber-400'}`} />
          <span>SEEDSIGNATURE: <strong className={isSigned ? 'text-emerald-300' : 'text-amber-300'}>{isSigned ? 'VERIFIED' : 'READY TO SIGN'}</strong></span>
        </div>
        <span className="text-slate-700 hidden md:inline">•</span>
        <div className="flex items-center space-x-1 hidden md:flex">
          <FileCheck className="w-3.5 h-3.5 text-blue-400" />
          <span>RIGHTS: <strong className="text-slate-200">100% {creatorName || 'MASTER CREATOR'}</strong></span>
        </div>
        <span className="text-slate-700 hidden lg:inline">•</span>
        <div className="flex items-center space-x-1 hidden lg:flex">
          <Users className="w-3.5 h-3.5 text-purple-400" />
          <span>COLLAB: <strong className="text-purple-300">1 ACTIVE</strong></span>
        </div>
      </div>
    </footer>
  );
};
