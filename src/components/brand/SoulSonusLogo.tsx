import React from 'react';

/** Single source for the SoulSonus logo lockup. */

export type LogoSize = 'sm' | 'md' | 'lg' | 'xl';

const MARK: Record<LogoSize, string> = {
  sm: 'w-6 h-6 rounded-lg text-[11px]',
  md: 'w-8 h-8 rounded-xl text-sm',
  lg: 'w-10 h-10 rounded-xl text-base',
  xl: 'w-14 h-14 rounded-2xl text-xl',
};

const CORE: Record<LogoSize, string> = {
  sm: 'rounded-[7px]',
  md: 'rounded-[10px]',
  lg: 'rounded-[10px]',
  xl: 'rounded-[14px]',
};

const WORD: Record<LogoSize, string> = {
  sm: 'text-xs',
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-2xl',
};

interface SoulSonusMarkProps {
  size?: LogoSize;
  className?: string;
}

/** Mark only. */
export const SoulSonusMark: React.FC<SoulSonusMarkProps> = ({ size = 'md', className = '' }) => (
  <div
    className={`${MARK[size]} bg-gradient-to-tr from-amber-500 via-orange-500 to-cyan-400 p-0.5 shadow-lg shadow-amber-500/20 flex items-center justify-center shrink-0 ${className}`}
    aria-hidden="true"
  >
    <div
      className={`w-full h-full bg-slate-950 ${CORE[size]} flex items-center justify-center font-black text-amber-400 font-mono`}
    >
      S
    </div>
  </div>
);

/** Wordmark only. */
export const SoulSonusWordmark: React.FC<SoulSonusMarkProps> = ({ size = 'md', className = '' }) => (
  <span
    className={`font-mono font-black tracking-widest bg-gradient-to-r from-amber-300 via-slate-100 to-cyan-300 bg-clip-text text-transparent ${WORD[size]} ${className}`}
  >
    SOULSONUS
  </span>
);

interface SoulSonusLogoProps {
  size?: LogoSize;
  /** Sub-label under the wordmark; null for none. */
  sublabel?: string | null;
  /** Render the mark without the wordmark. */
  markOnly?: boolean;
  className?: string;
}

export const SoulSonusLogo: React.FC<SoulSonusLogoProps> = ({
  size = 'md',
  sublabel = 'DAW & INTELLIGENCE',
  markOnly = false,
  className = '',
}) => (
  <div className={`flex items-center space-x-3 ${className}`}>
    <SoulSonusMark size={size} />
    {!markOnly && (
      <div className="flex flex-col">
        <SoulSonusWordmark size={size} />
        {sublabel && (
          <span className="font-mono text-[9px] text-slate-400 tracking-wider">{sublabel}</span>
        )}
      </div>
    )}
  </div>
);

export default SoulSonusLogo;
