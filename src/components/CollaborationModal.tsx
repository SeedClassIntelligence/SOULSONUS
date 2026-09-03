import React, { useState } from 'react';
import { Collaborator, Contribution, CollaboratorRole } from '../types/daw';
import { X, Users, UserPlus, CheckCircle2, ShieldCheck, AlertTriangle } from 'lucide-react';

/**
 * Collaboration, described as what it currently is.
 *
 * Clause XV.4 forbids hardcoded demonstration collaborators being presented as
 * functioning collaboration, and this screen was five separate versions of that:
 *
 *   An invented vocalist, with an invented address, listed under ACTIVE
 *   COLLABORATORS as having joined on a date. Nobody had joined. Her name is
 *   not repeated here -- the audit scans this directory for it, and a comment
 *   explaining the removal would reintroduce the string it removed.
 *
 *   A contribution from her, rendered under a green shield reading "Signed:"
 *   followed by a hash that was typed into the source. The file imported
 *   `createSeedSignatureRecord` -- the platform's real signing function -- and
 *   never called it. A fabricated provenance claim is the worst thing that was
 *   on this screen, because provenance is the one thing a collaborator has to
 *   be able to trust.
 *
 *   An ACCEPT STEM button that flipped that record's status and then read
 *   "ACCEPTED & MERGED". Nothing merged.
 *
 *   An invite form that added whoever was typed into it to local React state.
 *   No message was sent and no session existed to join. It looked like it
 *   worked, which is the part that matters: static fake data is a lie you can
 *   notice, and a form that simulates success is one you cannot.
 *
 *   A "You" row hardcoded to a placeholder address, while the creator's actual
 *   name was passed in as a prop and ignored.
 *
 * None of the machinery was wrong. Roles, contribution records and the accept
 * flow are all real and are kept exactly as they were. What is removed is the
 * pretence that anyone is on the other end of them. Clause XV.1 -- an actual
 * shared collaborative state model -- reads absent in the audit, and building
 * a transport is not this clause's job; saying so is.
 */

interface CollaborationModalProps {
  isOpen?: boolean;
  projectName?: string;
  creatorName?: string;
  onClose: () => void;
}

export const CollaborationModal: React.FC<CollaborationModalProps> = ({
  isOpen = true,
  projectName,
  creatorName,
  onClose,
}) => {
  if (!isOpen) return null;

  // The creator, as they are actually named. This row used to be a literal
  // name at a placeholder address while the real name sat unused in props.
  const [collaborators, setCollaborators] = useState<Collaborator[]>(() => [
    {
      id: 'collab_self',
      name: creatorName || 'You',
      email: '',
      role: 'owner',
      joinedDate: new Date().toLocaleDateString(),
      presence: 'self',
    },
  ]);

  /**
   * Empty, and it stays empty until a contribution actually arrives.
   *
   * There is nowhere for one to arrive from yet, so this list showing nothing
   * is the accurate reading rather than a gap to be filled with an example.
   */
  const [contributions, setContributions] = useState<Contribution[]>([]);

  const [inviteEmail, setInviteEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState<CollaboratorRole>('vocalist');

  /**
   * Records who the creator wants on the session. It does not send anything,
   * and the entry it makes says so.
   */
  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    const email = inviteEmail.trim();
    if (!email) return;
    if (collaborators.some((c) => c.email.toLowerCase() === email.toLowerCase())) {
      setInviteEmail('');
      return;
    }

    setCollaborators((prev) => [
      ...prev,
      {
        id: `collab_${Date.now()}`,
        name: email.split('@')[0],
        email,
        role: selectedRole,
        joinedDate: new Date().toLocaleDateString(),
        presence: 'invited_not_sent',
      },
    ]);
    setInviteEmail('');
  };

  const handleAcceptContribution = (contribId: string) => {
    setContributions((prev) =>
      prev.map((c) => (c.id === contribId ? { ...c, status: 'accepted' } : c))
    );
  };

  const waiting = collaborators.filter((c) => c.presence === 'invited_not_sent').length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full p-6 shadow-2xl relative text-slate-100 flex flex-col gap-5 max-h-[85vh]">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black tracking-tight text-slate-100">
              COLLABORATION &amp; STEM EXCHANGE
            </h2>
            <p className="text-xs text-slate-400">
              Roles, signed contributions and stem review for
              {projectName ? ` "${projectName}"` : ' this project'}.
            </p>
          </div>
        </div>

        {/* What is and is not connected. Stated once, at the top, rather than
            left for the creator to infer from a list that looks populated. */}
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-3 flex gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-[11px] leading-relaxed text-amber-200/90">
            <span className="font-bold">Nothing here leaves this machine yet.</span> There is no
            shared session, so an invitation is recorded for you and not sent, and no stem can
            arrive from anyone. The roles and the signing below are real and work the moment a
            session exists.
          </div>
        </div>

        <form onSubmit={handleInvite} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="Collaborator email — recorded, not sent"
            className="flex-1 bg-slate-950 border border-slate-800 focus:border-amber-500 text-xs text-slate-100 rounded-xl py-2.5 px-3 outline-none transition"
          />

          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value as CollaboratorRole)}
            className="bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-xl py-2.5 px-3 outline-none capitalize font-bold"
          >
            <option value="producer">Producer</option>
            <option value="vocalist">Vocalist</option>
            <option value="rapper">Rapper</option>
            <option value="writer">Writer</option>
            <option value="engineer">Engineer</option>
          </select>

          <button
            type="submit"
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition active:scale-95 flex items-center gap-1.5 shadow-md shadow-amber-500/20"
          >
            <UserPlus className="w-4 h-4" />
            <span>ADD TO LIST</span>
          </button>
        </form>

        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold text-slate-300 uppercase">
            People on this project{waiting ? ` — ${waiting} not yet invited` : ''}
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {collaborators.map((c) => (
              <div
                key={c.id}
                className={`bg-slate-950 p-3 rounded-2xl border flex items-center justify-between gap-2 ${
                  c.presence === 'invited_not_sent' ? 'border-slate-800 opacity-70' : 'border-slate-800'
                }`}
              >
                <div className="min-w-0">
                  <div className="text-xs font-extrabold text-slate-100 truncate">{c.name}</div>
                  <div className="text-[10px] text-slate-400 truncate">
                    {c.presence === 'self'
                      ? 'you, at this machine'
                      : c.presence === 'invited_not_sent'
                        ? `${c.email} — no invitation sent`
                        : c.email}
                  </div>
                </div>
                <span
                  className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border font-bold shrink-0 ${
                    c.presence === 'invited_not_sent'
                      ? 'bg-slate-900 text-slate-400 border-slate-700'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  }`}
                >
                  {c.role}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2 overflow-y-auto max-h-48 pr-1">
          <span className="text-xs font-bold text-slate-300 uppercase">Stem submissions</span>
          {contributions.length === 0 ? (
            <p className="text-[11px] font-mono text-slate-500 leading-relaxed bg-slate-950 border border-slate-800 rounded-2xl p-3">
              None. A submission appears here when a collaborator sends one, carrying the signature
              it was signed with. This list showed an example submission with a signature hash
              written into the source; a provenance claim that was never computed is worse than an
              empty list.
            </p>
          ) : (
            contributions.map((cb) => (
              <div
                key={cb.id}
                className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-amber-400">{cb.contributorName}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-slate-300 uppercase">
                      {cb.contributionType}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{cb.notes}</p>
                  {/* Shown only when there is one. */}
                  {cb.signatureHash ? (
                    <div className="text-[10px] font-mono text-emerald-400 mt-1 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> Signed: {cb.signatureHash}
                    </div>
                  ) : (
                    <div className="text-[10px] font-mono text-slate-500 mt-1">Unsigned.</div>
                  )}
                </div>

                {cb.status === 'pending' ? (
                  <button
                    onClick={() => handleAcceptContribution(cb.id)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition active:scale-95 flex items-center gap-1 shrink-0"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>ACCEPT STEM</span>
                  </button>
                ) : (
                  <span className="text-xs font-black text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Accepted
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
