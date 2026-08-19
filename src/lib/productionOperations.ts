import { Track, RealizerBackend, AutomationPoint } from '../types/daw';

export type ProductionOperationType =
  | 'ASSIGN_SOUND'
  | 'SET_GLIDE'
  | 'SET_VELOCITY'
  | 'MOVE_NOTE'
  | 'TRANSPOSE_NOTES'
  | 'QUANTIZE_TRACK'
  | 'SET_DSP_PARAM'
  | 'SET_INSTRUMENT_PARAM'
  | 'SET_AUTOMATION_POINT'
  | 'SET_REALIZATION_CLASS'
  | 'SET_TRACK_VOLUME'
  | 'SET_TRACK_PAN';

export interface ProductionOperation {
  id: string;
  type: ProductionOperationType;
  trackId: string;
  description: string;
  source: 'MANUAL_UI' | 'CO_PRODUCER_AI' | 'MIDI_CONTROLLER';
  timestamp: number;
  undo: (tracks: Track[]) => Track[];
  redo: (tracks: Track[]) => Track[];
}

export interface CoProducerProposal {
  id: string;
  trackId: string;
  prompt: string;
  description: string;
  targetParameter: string;
  proposedValue: any;
  status: 'PROPOSED' | 'AUDITIONING' | 'COMMITTED' | 'REJECTED';
  timestamp: number;
  operation: ProductionOperation;
}

/**
 * The bridge into the session's history.
 *
 * There used to be two undo stacks. This manager kept its own, built from
 * per-operation inverse closures, while the session kept whole-track snapshots
 * — so undo in the co-producer could not take back a canvas edit, and undo on
 * the canvas could not take back a co-producer commit. Worse, the closures
 * captured values from when the operation was described, so undoing after any
 * later edit restored a stale track.
 *
 * The session's stack is now the only one. What survives here is the part that
 * was genuinely useful: the human-readable description of each operation, which
 * becomes the label on the session's entry.
 */
export interface HistoryBridge {
  labelNextEdit: (label: string) => void;
  undo: () => string | null;
  redo: () => string | null;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

class ProductionHistoryManager {
  private bridge: HistoryBridge | null = null;
  private log: ProductionOperation[] = [];
  private maxLog = 50;
  private activeProposal: CoProducerProposal | null = null;

  /** The provider registers the session's history here on mount. */
  public connect(bridge: HistoryBridge) {
    this.bridge = bridge;
  }

  public recordOperation(op: ProductionOperation) {
    this.log.push(op);
    if (this.log.length > this.maxLog) this.log.shift();
    // Names the entry the session is about to record for this same edit.
    this.bridge?.labelNextEdit(op.description);
  }

  public canUndo(): boolean {
    return this.bridge ? this.bridge.canUndo() : false;
  }

  public canRedo(): boolean {
    return this.bridge ? this.bridge.canRedo() : false;
  }

  /**
   * Undoes through the session. `tracks` is returned unchanged: the session
   * owns the state and has already restored its own snapshot, so a caller that
   * wrote this back would fight it.
   */
  public undo(tracks: Track[]): { updatedTracks: Track[]; label: string | null } {
    return { updatedTracks: tracks, label: this.bridge ? this.bridge.undo() : null };
  }

  public redo(tracks: Track[]): { updatedTracks: Track[]; label: string | null } {
    return { updatedTracks: tracks, label: this.bridge ? this.bridge.redo() : null };
  }

  public getHistorySummary() {
    return {
      undoCount: this.log.length,
      redoCount: 0,
      latestOperation: this.log[this.log.length - 1] || null,
    };
  }

  // Co-Producer Proposal Lifecycle (PROPOSE -> AUDITION -> COMMIT)
  public setProposal(proposal: CoProducerProposal) {
    this.activeProposal = proposal;
  }

  public getActiveProposal(): CoProducerProposal | null {
    return this.activeProposal;
  }

  public commitProposal(tracks: Track[]): { updatedTracks: Track[]; operation: ProductionOperation | null } {
    if (!this.activeProposal) return { updatedTracks: tracks, operation: null };
    const op = this.activeProposal.operation;
    this.recordOperation(op);
    const updatedTracks = op.redo(tracks);
    this.activeProposal = null;
    return { updatedTracks, operation: op };
  }

  public rejectProposal() {
    this.activeProposal = null;
  }
}

export const productionHistory = new ProductionHistoryManager();
