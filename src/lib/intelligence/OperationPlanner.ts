/**
 * SoulSonus Operation Planner & Capability Router
 * Converts raw reasoning proposals into governed, structured DAW action cards.
 *
 * DOCTRINE:
 * Non-destructive candidate pipeline:
 * PROPOSE ➔ CANDIDATE ➔ VERIFY ➔ AUDITION ➔ CREATOR DECIDES ➔ COMMIT OR REJECT
 */

import { ReasoningProposal } from './ReasoningProvider';
import { DawActionProposal } from '../studioIntelligenceService';

export class OperationPlanner {
  /**
   * Plans and validates a structured DAW action card from a reasoning proposal.
   */
  public static plan(proposal?: ReasoningProposal): DawActionProposal | undefined {
    if (!proposal) return undefined;

    return {
      id: `candidate_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: proposal.title,
      description: proposal.description,
      category: proposal.type,
      targetTrackId: proposal.targetTrackId,
      targetTrackName: proposal.targetTrackName,
      proposedChanges: {
        volume: proposal.proposedChanges.volume,
        pitch: proposal.proposedChanges.pitch,
        dspSettings: proposal.proposedChanges.dspSettings,
        actionSummary: proposal.proposedChanges.actionSummary || proposal.title,
        noteOperation: proposal.proposedChanges.noteOperation,
        realizationRoute: proposal.proposedChanges.realizationRoute,
        realizationCandidate: proposal.proposedChanges.realizationCandidate,
      },
    };
  }
}
