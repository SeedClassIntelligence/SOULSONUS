import React, { useState } from 'react';
import { Collaborator, Contribution, CollaboratorRole } from '../types/daw';
import { X, Users, UserPlus, CheckCircle2, ShieldCheck, Upload, Send, MessageSquare } from 'lucide-react';
import { createSeedSignatureRecord } from '../lib/seedSignature';

interface CollaborationModalProps {
  isOpen?: boolean;
  projectName?: string;
  creatorName?: string;
  onClose: () => void;
}

export const CollaborationModal: React.FC<CollaborationModalProps> = ({ isOpen = true, onClose }) => {
  if (!isOpen) return null;
  const [collaborators, setCollaborators] = useState<Collaborator[]>([
    {
      id: 'collab_1',
      name: 'SoulSonus Creator (You)',
      email: 'creator@soulsonus.ai',
      role: 'owner',
      joinedDate: '2026-08-12',
    },
    {
      id: 'collab_2',
      name: 'Aria Vocalist',
      email: 'aria@soulsonus.ai',
      role: 'vocalist',
      joinedDate: '2026-08-13',
    },
  ]);

  const [contributions, setContributions] = useState<Contribution[]>([
    {
      id: 'contrib_101',
      contributorId: 'collab_2',
      contributorName: 'Aria Vocalist',
      role: 'vocalist',
      contributionType: 'lead_vocal',
      timestamp: new Date().toLocaleDateString(),
      status: 'pending',
      signatureHash: '0x8f2a93b...e412',
      notes: 'Recorded Lead Vocal Hook in key of C Minor at 120 BPM.',
    },
  ]);

  const [inviteEmail, setInviteEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState<CollaboratorRole>('vocalist');

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    const newCollab: Collaborator = {
      id: `collab_${Date.now()}`,
      name: inviteEmail.split('@')[0],
      email: inviteEmail,
      role: selectedRole,
      joinedDate: new Date().toLocaleDateString(),
    };

    setCollaborators((prev) => [...prev, newCollab]);
    setInviteEmail('');
  };

  const handleAcceptContribution = async (contribId: string) => {
    setContributions((prev) =>
      prev.map((c) => (c.id === contribId ? { ...c, status: 'accepted' } : c))
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full p-6 shadow-2xl relative text-slate-100 flex flex-col gap-5 max-h-[85vh]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black tracking-tight text-slate-100 flex items-center gap-2">
              <span>COLLABORATION & STEM EXCHANGE ENGINE</span>
              <span className="text-xs bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded border border-amber-500/30">
                LAYER 10
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Invite producers, vocalists, and engineers. Review versioned stem submissions with signed contribution tracking.
            </p>
          </div>
        </div>

        {/* Invite Form */}
        <form onSubmit={handleInvite} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="Enter collaborator email..."
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
            <span>INVITE</span>
          </button>
        </form>

        {/* Collaborators List */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold text-slate-300 uppercase">ACTIVE COLLABORATORS & ROLES</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {collaborators.map((c) => (
              <div key={c.id} className="bg-slate-950 p-3 rounded-2xl border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-xs font-extrabold text-slate-100">{c.name}</div>
                  <div className="text-[10px] text-slate-400">{c.email}</div>
                </div>
                <span className="text-[10px] font-mono uppercase bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30 font-bold">
                  {c.role}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Pending Stem Contributions */}
        <div className="flex flex-col gap-2 overflow-y-auto max-h-48 pr-1">
          <span className="text-xs font-bold text-slate-300 uppercase">STEM SUBMISSIONS & VERSION HISTORY</span>
          {contributions.map((cb) => (
            <div key={cb.id} className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold text-amber-400">{cb.contributorName}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-slate-300 uppercase">
                    {cb.contributionType}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">{cb.notes}</p>
                <div className="text-[10px] font-mono text-emerald-400 mt-1 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Signed: {cb.signatureHash}
                </div>
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
                  <CheckCircle2 className="w-4 h-4" /> ACCEPTED & MERGED
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
