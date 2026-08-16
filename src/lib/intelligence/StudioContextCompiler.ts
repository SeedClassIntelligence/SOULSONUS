/**
 * SoulSonus Studio Context Compiler
 * Produces safe, bounded, read-only session state projections for reasoning providers.
 *
 * DOCTRINE:
 * No reasoning provider communicates directly with canonical project state.
 */

import { DAWState, Track } from '../../types/daw';
import { BoundedStudioContext, BoundedTrackContext, StudioEmphasis } from './ReasoningProvider';

export class StudioContextCompiler {
  /**
   * Compiles live DAW session state into a bounded, read-only context projection.
   */
  public static compile(
    dawState: DAWState,
    tracks: Track[],
    activeWorkspace: string,
    selectedTrack: Track | null,
    emphasis: StudioEmphasis = 'CO_PRODUCER'
  ): BoundedStudioContext {
    const boundedTracks: BoundedTrackContext[] = tracks.map((t) => ({
      id: t.id,
      name: t.name,
      instrument: t.instrument,
      volumeDb: t.volume || 0,
      pitch: t.pitch || 'C1',
      mute: !!t.mute,
      solo: !!t.solo,
      activeNoteCount: t.steps ? t.steps.filter(Boolean).length : 0,
      hasDsp: !!t.dspSettings,
      noteEvents: t.noteEvents,
    }));

    const focusTrack: BoundedTrackContext | null = selectedTrack
      ? {
          id: selectedTrack.id,
          name: selectedTrack.name,
          instrument: selectedTrack.instrument,
          volumeDb: selectedTrack.volume || 0,
          pitch: selectedTrack.pitch || 'C1',
          mute: !!selectedTrack.mute,
          solo: !!selectedTrack.solo,
          activeNoteCount: selectedTrack.steps ? selectedTrack.steps.filter(Boolean).length : 0,
          hasDsp: !!selectedTrack.dspSettings,
          noteEvents: selectedTrack.noteEvents,
        }
      : null;

    return {
      activeRoom: activeWorkspace,
      bpm: dawState.bpm,
      key: 'C',
      scale: 'Natural Minor',
      timeSignature: '4/4',
      currentStep: dawState.currentStep,
      currentBar: Math.floor(dawState.currentStep / 16) + 1,
      focusTrack,
      tracks: boundedTracks,
      emphasis,
    };
  }
}
