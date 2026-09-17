import React from 'react';
import { Boxes, GitBranch, ShieldCheck } from 'lucide-react';
import { StudioIntelligenceDrawer } from './StudioIntelligenceDrawer';
import {
  CAPABILITIES,
  PROVIDERS,
  REQUEST_PIPELINE,
  providersFor,
  unprovidedCapabilities,
} from '../lib/capabilityRegistry';
import { useStudioSession } from '../app/StudioSessionContext';

/**
 * The right column: the intelligence, and three readouts about the work.
 *
 * Every one of these was already somewhere. The intelligence was a panel
 * fixed over the page; provenance was in the SeedSignature inspector and the
 * revision tree; source, intent and realization were fields on the track that
 * only the interpretation card showed, and only after a take. What is new is
 * that they are visible while you work instead of behind a button, which is
 * the whole of what "persistent right column" means here.
 *
 * Nothing in these three panels is decoration. Each one reads state that
 * already exists and says what it finds, including when what it finds is
 * nothing. A panel that renders a reassuring shape over an empty selection is
 * the same defect as a preservation score nobody measured.
 */

const Card: React.FC<{
  title: string;
  icon: React.ReactNode;
  tone: string;
  testId: string;
  children: React.ReactNode;
}> = ({ title, icon, tone, testId, children }) => (
  <section
    data-testid={testId}
    className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3 space-y-2 font-mono"
  >
    <h3 className={`flex items-center gap-1.5 text-[10px] font-black tracking-widest ${tone}`}>
      {icon}
      {title}
    </h3>
    {children}
  </section>
);

/**
 * What the platform can ask for, and who can currently answer.
 *
 * The pipeline it lists is the contract in `capabilityRegistry.ts`, not a
 * drawing: the steps are read from REQUEST_PIPELINE so this panel cannot
 * drift from the thing it describes. The sentence about resolution not being
 * wired yet is there because it is true, and a panel that implied otherwise
 * would be claiming an architecture the code has not got.
 */
const CapabilityOrchestrator: React.FC = () => {
  const unverified = PROVIDERS.filter((p) => p.licence.commercialUse === 'UNVERIFIED');
  const gaps = unprovidedCapabilities();

  return (
    <Card
      title="CAPABILITY ORCHESTRATOR"
      icon={<Boxes className="w-3.5 h-3.5 text-cyan-400" />}
      tone="text-cyan-300"
      testId="capability-orchestrator"
    >
      <p className="text-[9.5px] leading-snug text-slate-400">
        SoulSonus owns the workflow. External engines supply bounded, replaceable capabilities.
      </p>

      <ol className="rounded-xl border border-slate-800 bg-slate-950 p-2 space-y-1">
        {REQUEST_PIPELINE.map((s) => (
          <li key={s.step} className="text-[9px] text-slate-400 leading-snug" title={s.says}>
            <span className="text-cyan-400">→</span>{' '}
            <span className="text-slate-200 font-bold">{s.step}</span>
          </li>
        ))}
      </ol>

      <div className="grid grid-cols-3 gap-1.5 text-center">
        <div className="rounded-lg border border-slate-800 bg-slate-950 py-1.5">
          <div className="text-[13px] font-black text-slate-100" data-testid="capability-count">
            {CAPABILITIES.length}
          </div>
          <div className="text-[8px] text-slate-500 tracking-wider">CAPABILITIES</div>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950 py-1.5">
          <div className="text-[13px] font-black text-slate-100">{PROVIDERS.length}</div>
          <div className="text-[8px] text-slate-500 tracking-wider">PROVIDERS</div>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950 py-1.5">
          <div className={`text-[13px] font-black ${gaps.length ? 'text-rose-300' : 'text-emerald-300'}`}>
            {gaps.length}
          </div>
          <div className="text-[8px] text-slate-500 tracking-wider">UNPROVIDED</div>
        </div>
      </div>

      <ul className="space-y-0.5 pr-1">
        {CAPABILITIES.map((c) => {
          const who = providersFor(c);
          return (
            <li key={c} className="flex items-baseline justify-between gap-2 text-[9px]">
              <span className="text-slate-300 truncate" title={c}>
                {c}
              </span>
              <span
                className={`shrink-0 font-bold ${who.length ? 'text-emerald-400' : 'text-rose-400'}`}
                title={who.map((p) => `${p.label} (${p.location}) — ${p.wiredAt}`).join('\n') || 'Nothing registered satisfies this.'}
              >
                {who.length ? who.map((p) => p.label).join(', ') : 'NOTHING'}
              </span>
            </li>
          );
        })}
      </ul>

      <p className="text-[8.5px] leading-snug text-amber-300/80" data-testid="capability-caveat">
        This table describes. Requests still dispatch through the realization router and the E05
        provider, so a row added here changes what the studio reports, not what it runs.
        {unverified.length > 0 && (
          <>
            {' '}
            {unverified.length} of {PROVIDERS.length} providers carry an unverified licence and are
            not cleared for release.
          </>
        )}
      </p>
    </Card>
  );
};

/**
 * The three objects, for whatever is selected.
 *
 * Source, interpretation and realization stay separate so a realization can be
 * changed without destroying what the creator actually did. This reads the
 * selected track's own fields -- `sourceModality`, `seedType`, `originType`,
 * its layers -- and where a field is not set it says so rather than filling in
 * a plausible label.
 */
const SourceIntentRealization: React.FC = () => {
  const { tracks, selectionContext } = useStudioSession();
  const track =
    tracks.find((t) => t.id === selectionContext.selectedTrackId) || tracks[0] || null;

  const ORIGIN_WORDS: Record<string, string> = {
    ROOT_PERFORMANCE: 'The creator’s own performance',
    MANUAL_SOUND_VAULT: 'A sound chosen from the vault',
    AI_PERFORMANCE_TRANSFER: 'A performance-preserving transfer',
    EXTRACTION_STEM: 'Extracted from a performance',
    SYNTHESIS: 'Synthesised',
    CONTRIBUTION_SEED: 'A collaborator’s contribution',
  };

  const Row: React.FC<{ label: string; value: string; unset?: boolean }> = ({
    label,
    value,
    unset,
  }) => (
    <div className="rounded-lg border border-slate-800 bg-slate-950 px-2 py-1.5">
      <div className="text-[8px] text-slate-500 uppercase tracking-wider">{label}</div>
      <div className={`text-[10px] font-bold mt-0.5 ${unset ? 'text-slate-500 italic' : 'text-slate-100'}`}>
        {value}
      </div>
    </div>
  );

  return (
    <Card
      title="SOURCE → INTENT → REALIZATION"
      icon={<GitBranch className="w-3.5 h-3.5 text-amber-400" />}
      tone="text-amber-300"
      testId="source-intent-realization"
    >
      <p className="text-[9.5px] leading-snug text-slate-400">
        The creator’s expression, what SoulSonus made of it, and what it currently sounds like stay
        three things. Changing the last one never rewrites the first.
      </p>

      {!track ? (
        <p className="text-[10px] text-slate-500 italic" data-testid="sir-empty">
          No channel selected, so there is nothing to describe.
        </p>
      ) : (
        <div className="space-y-1.5">
          <Row label="Channel" value={track.name} />
          <Row
            label="Source"
            value={
              track.originType
                ? ORIGIN_WORDS[track.originType] || track.originType
                : track.sourceModality
                  ? `Captured — ${track.sourceModality.toLowerCase()}`
                  : 'Nothing recorded on this channel yet'
            }
            unset={!track.originType && !track.sourceModality}
          />
          <Row
            label="Interpretation"
            value={
              track.seedType
                ? `${track.seedType.replace(/_/g, ' ').toLowerCase()} · read as ${track.instrument}`
                : `Read as ${track.instrument}`
            }
          />
          <Row
            label="Realization"
            value={
              track.layers?.length
                ? track.layers.map((l) => l.soundName || l.vaultLabel).filter(Boolean).join(' · ') ||
                  `${track.layers.length} layer${track.layers.length > 1 ? 's' : ''}`
                : track.vaultLabel || 'The recording itself, untouched'
            }
          />
        </div>
      )}
    </Card>
  );
};

/**
 * Who made it, what touched it, and what is still unestablished.
 *
 * The revision count and the signature are read from the session. The licence
 * line is the uncomfortable one and it stays: rights cannot be reported as
 * tracked while the providers that render material carry licences nobody has
 * checked.
 */
const ProvenanceAndRights: React.FC = () => {
  const { revisions, creatorSignature } = useStudioSession();
  const unverified = PROVIDERS.filter((p) => p.licence.commercialUse === 'UNVERIFIED');

  return (
    <Card
      title="PROVENANCE / RIGHTS"
      icon={<ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />}
      tone="text-emerald-300"
      testId="provenance-rights"
    >
      <p className="text-[9.5px] leading-snug text-slate-400">
        Creator origin, provider, adapter, revision and execution receipts follow every derived
        artifact.
      </p>

      <div className="grid grid-cols-2 gap-1.5">
        <div className="rounded-lg border border-slate-800 bg-slate-950 px-2 py-1.5">
          <div className="text-[8px] text-slate-500 uppercase tracking-wider">Revisions</div>
          <div className="text-[11px] font-black text-slate-100" data-testid="provenance-revisions">
            {revisions.length}
          </div>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950 px-2 py-1.5">
          <div className="text-[8px] text-slate-500 uppercase tracking-wider">Creator signature</div>
          <div
            className={`text-[11px] font-black ${creatorSignature ? 'text-emerald-300' : 'text-slate-500'}`}
            data-testid="provenance-signature"
          >
            {creatorSignature ? 'CALIBRATED' : 'NOT SET'}
          </div>
        </div>
      </div>

      <p
        className={`text-[8.5px] leading-snug ${unverified.length ? 'text-amber-300/80' : 'text-emerald-300/80'}`}
        data-testid="rights-caveat"
      >
        {unverified.length
          ? `${unverified.length} provider licences are unverified. Until they are read, nothing rendered through them is cleared for release — that is a task, not a risk assessment.`
          : 'Every registered provider carries a verified licence.'}
      </p>
    </Card>
  );
};

export const StudioIntelligenceColumn: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="w-full xl:w-[380px] 2xl:w-[440px] shrink-0 space-y-3 pb-3">
      <StudioIntelligenceDrawer embedded isOpen={isOpen} onClose={onClose} />
      <CapabilityOrchestrator />
      <SourceIntentRealization />
      <ProvenanceAndRights />
    </div>
  );
};
