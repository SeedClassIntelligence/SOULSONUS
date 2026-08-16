import React from 'react';
import { MixingConsoleDesk } from './MixingConsoleDesk';
import { SelectedChannelWorkstation } from './SelectedChannelWorkstation';
import { CoEngineerAnalysisSuite } from './CoEngineerAnalysisSuite';

export const MixWorkspace: React.FC = () => {
  return (
    <div className="w-full bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col font-mono text-xs select-none">
      {/* ZONE 1: FULL MULTICHANNEL MIXING CONSOLE DESK */}
      <MixingConsoleDesk />

      {/* ZONE 2: LOWER ENGINEERING FLOOR (50 / 50 SPLIT) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[360px] max-h-[420px] bg-slate-950">
        {/* Left: Selected Track / Focus Workstation */}
        <SelectedChannelWorkstation />

        {/* Right: AI Co-Engineer & Acoustic Analysis Suite */}
        <CoEngineerAnalysisSuite />
      </div>
    </div>
  );
};
