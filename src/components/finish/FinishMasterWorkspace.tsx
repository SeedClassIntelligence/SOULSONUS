import React from 'react';
import { MasterStereoWaveformConsole } from './MasterStereoWaveformConsole';
import { MasteringTelemetrySuite } from './MasteringTelemetrySuite';
import { FinalizationGateAndSign } from './FinalizationGateAndSign';

export const FinishMasterWorkspace: React.FC = () => {
  return (
    <div className="w-full bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col font-mono text-xs select-none">
      {/* ZONE 1 (SURFACE A): MASTER STEREO WAVEFORM & MASTERING CONSOLE */}
      <MasterStereoWaveformConsole />

      {/* ZONE 2: LOWER MASTERING & FINALIZATION FLOOR (50 / 50 SPLIT) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[360px] max-h-[420px] bg-slate-950">
        {/* Surface B: Mastering Telemetry, Spectrum, Stereo & Reference */}
        <MasteringTelemetrySuite />

        {/* Surface C: Co-Engineer Advisor, Master Candidates, Finalization Gate & Signing */}
        <FinalizationGateAndSign />
      </div>
    </div>
  );
};
