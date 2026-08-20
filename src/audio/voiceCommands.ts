import { InstrumentType } from '../types/daw';

export interface VoiceCommandResult {
  action:
    | 'CLONE_BAR_1'
    | 'NUDGE_LEFT'
    | 'NUDGE_RIGHT'
    | 'INVERT_PATTERN'
    | 'CLEAR_ALL'
    | 'TOGGLE_PLAY'
    | 'TOGGLE_REC'
    | 'CHANGE_BPM'
    | 'REPLACE_SOUND_QUERY'
    | 'UNKNOWN';
  payload?: {
    bpmDelta?: number;
    targetBpm?: number;
    searchQuery?: string;
    targetInstrument?: InstrumentType;
  };
  /**
   * What was understood, in the past tense of *hearing* rather than of
   * doing: "Nudge the pattern one 16th left", not "Nudged pattern 1/16th
   * step left."
   *
   * Every one of these used to be phrased as a completed action and was
   * shown to the creator the moment the text was parsed -- before anything
   * ran, and regardless of whether anything could. The bar now reports what
   * the executor did; this field only says what it heard.
   */
  feedbackText: string;
}

export function parseVoiceCommand(transcript: string): VoiceCommandResult {
  const text = transcript.toLowerCase().trim();

  if (text.includes('clone') || text.includes('copy bar 1') || text.includes('duplicate bar 1')) {
    return { action: 'CLONE_BAR_1', feedbackText: 'Clone bar 1 across the song' };
  }

  if (text.includes('nudge left') || text.includes('shift left') || text.includes('backwards')) {
    return { action: 'NUDGE_LEFT', feedbackText: 'Nudge the pattern one 16th left' };
  }

  if (text.includes('nudge right') || text.includes('shift right') || text.includes('forward')) {
    return { action: 'NUDGE_RIGHT', feedbackText: 'Nudge the pattern one 16th right' };
  }

  if (text.includes('invert')) {
    return { action: 'INVERT_PATTERN', feedbackText: 'Invert the grid' };
  }

  if (text.includes('clear') || text.includes('reset grid') || text.includes('wipe')) {
    return { action: 'CLEAR_ALL', feedbackText: 'Clear the grid' };
  }

  if (text.includes('play') || text.includes('start') || text.includes('pause') || text.includes('stop')) {
    return { action: 'TOGGLE_PLAY', feedbackText: 'Start or stop the transport' };
  }

  if (text.includes('record') || text.includes('rec')) {
    return { action: 'TOGGLE_REC', feedbackText: 'Toggle the microphone' };
  }

  if (text.includes('faster') || text.includes('speed up') || text.includes('increase bpm')) {
    return { action: 'CHANGE_BPM', payload: { bpmDelta: 10 }, feedbackText: 'Raise the tempo by 10 BPM' };
  }

  if (text.includes('slower') || text.includes('slow down') || text.includes('decrease bpm')) {
    return { action: 'CHANGE_BPM', payload: { bpmDelta: -10 }, feedbackText: 'Lower the tempo by 10 BPM' };
  }

  if (text.includes('kick') || text.includes('snare') || text.includes('hat') || text.includes('synth')) {
    let targetInst: InstrumentType = 'kick';
    if (text.includes('snare')) targetInst = 'snare';
    if (text.includes('hat')) targetInst = 'hihat';
    if (text.includes('synth') || text.includes('melody')) targetInst = 'melody';

    return {
      action: 'REPLACE_SOUND_QUERY',
      payload: { searchQuery: text, targetInstrument: targetInst },
      feedbackText: `Find a ${targetInst} sound matching "${text}"`,
    };
  }

  return {
    action: 'UNKNOWN',
    feedbackText: `Heard "${transcript}" — no command matches it`,
  };
}
