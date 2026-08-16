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

class ProductionHistoryManager {
  private undoStack: ProductionOperation[] = [];
  private redoStack: ProductionOperation[] = [];
  private maxHistory = 50;
  private activeProposal: CoProducerProposal | null = null;

  public recordOperation(op: ProductionOperation) {
    this.undoStack.push(op);
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }
    this.redoStack = []; // Clear redo on new action
  }

  public canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  public canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  public undo(tracks: Track[]): { updatedTracks: Track[]; operation: ProductionOperation | null } {
    const op = this.undoStack.pop();
    if (!op) return { updatedTracks: tracks, operation: null };

    const updatedTracks = op.undo(tracks);
    this.redoStack.push(op);
    return { updatedTracks, operation: op };
  }

  public redo(tracks: Track[]): { updatedTracks: Track[]; operation: ProductionOperation | null } {
    const op = this.redoStack.pop();
    if (!op) return { updatedTracks: tracks, operation: null };

    const updatedTracks = op.redo(tracks);
    this.undoStack.push(op);
    return { updatedTracks, operation: op };
  }

  public getHistorySummary() {
    return {
      undoCount: this.undoStack.length,
      redoCount: this.redoStack.length,
      latestOperation: this.undoStack[this.undoStack.length - 1] || null,
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
