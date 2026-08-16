import React from 'react';
import { StepSequencer64, StepSequencer64Props } from './StepSequencer64';
import { InstrumentType } from '../types/daw';

export interface SequencerGridProps extends Omit<StepSequencer64Props, 'onCloneBarToAll' | 'onNudgeTrackPattern' | 'onShiftTrackRow' | 'onClearAll' | 'onRandomize'> {
  onShiftTrackPattern?: (fromIndex: number, targetInstrument: InstrumentType) => void;
  onCloneBarToAll?: (sourceBarIndex?: number) => void;
  onNudgeTrackPattern?: (trackId: string, direction: 'left' | 'right') => void;
  onShiftTrackRow?: (fromTrackIndex: number, direction: 'up' | 'down') => void;
  onClearAll?: () => void;
  onRandomize?: (barIndex?: number) => void;
}

export const SequencerGrid: React.FC<SequencerGridProps> = (props) => {
  return (
    <StepSequencer64
      {...props}
      onCloneBarToAll={props.onCloneBarToAll || (() => {})}
      onNudgeTrackPattern={props.onNudgeTrackPattern || (() => {})}
      onShiftTrackRow={props.onShiftTrackRow || (() => {})}
      onClearAll={props.onClearAll || (() => {})}
      onRandomize={props.onRandomize || (() => {})}
    />
  );
};
