import React from 'react';

/**
 * The SoulSonus logo. One lockup, used everywhere.
 *
 * The platform had drifted into three: the landing nav (gradient ring, amber S
 * on a slate core, gradient wordmark), the studio header (a rose third stop,
 * solid fill, inverted S, flat wordmark) and the footer (a two-stop mark). A
 * logo that changes between the page that sells the platform and the room the
 * creator works in is not one brand -- and the room is where the creator spends
 * their time, so the divergence was doing its damage where it mattered most.
 *
 * The landing lockup is canonical. This is it, and nothing else renders a mark.
 *
 * The gradient is not decoration: amber is the creator's own signal throughout
 * the studio, cyan is the machine's, and the mark runs one into the other. That
 * passage is the product.
 */

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

/** The mark alone — the gradient ring and the S. */
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

/** The wordmark alone — amber into cyan, the creator's signal into the machine's. */
export const SoulSonusWordmark: React.FC<SoulSonusMarkProps> = ({ size = 'md', className = '' }) => (
  <span
    className={`font-mono font-black tracking-widest bg-gradient-to-r from-amber-300 via-slate-100 to-cyan-300 bg-clip-text text-transparent ${WORD[size]} ${className}`}
  >
    SOULSONUS
  </span>
);

interface SoulSonusLogoProps {
  size?: LogoSize;
  /** Sub-label under the wordmark. Pass null for none. */
  sublabel?: string | null;
  /** Mark only, no wordmark. */
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
