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
  feedbackText: string;
}

export function parseVoiceCommand(transcript: string): VoiceCommandResult {
  const text = transcript.toLowerCase().trim();

  if (text.includes('clone') || text.includes('copy bar 1') || text.includes('duplicate bar 1')) {
    return { action: 'CLONE_BAR_1', feedbackText: 'Cloned Bar 1 pattern across all 4 bars.' };
  }

  if (text.includes('nudge left') || text.includes('shift left') || text.includes('backwards')) {
    return { action: 'NUDGE_LEFT', feedbackText: 'Nudged pattern 1/16th step left.' };
  }

  if (text.includes('nudge right') || text.includes('shift right') || text.includes('forward')) {
    return { action: 'NUDGE_RIGHT', feedbackText: 'Nudged pattern 1/16th step right.' };
  }

  if (text.includes('invert')) {
    return { action: 'INVERT_PATTERN', feedbackText: 'Inverted grid step triggers.' };
  }

  if (text.includes('clear') || text.includes('reset grid') || text.includes('wipe')) {
    return { action: 'CLEAR_ALL', feedbackText: 'Cleared all grid steps.' };
  }

  if (text.includes('play') || text.includes('start') || text.includes('pause') || text.includes('stop')) {
    return { action: 'TOGGLE_PLAY', feedbackText: 'Toggled sequencer transport.' };
  }

  if (text.includes('record') || text.includes('rec')) {
    return { action: 'TOGGLE_REC', feedbackText: 'Toggled microphone auto-record mode.' };
  }

  if (text.includes('faster') || text.includes('speed up') || text.includes('increase bpm')) {
    return { action: 'CHANGE_BPM', payload: { bpmDelta: 10 }, feedbackText: 'Increased tempo by +10 BPM.' };
  }

  if (text.includes('slower') || text.includes('slow down') || text.includes('decrease bpm')) {
    return { action: 'CHANGE_BPM', payload: { bpmDelta: -10 }, feedbackText: 'Decreased tempo by -10 BPM.' };
  }

  if (text.includes('kick') || text.includes('snare') || text.includes('hat') || text.includes('synth')) {
    let targetInst: InstrumentType = 'kick';
    if (text.includes('snare')) targetInst = 'snare';
    if (text.includes('hat')) targetInst = 'hihat';
    if (text.includes('synth') || text.includes('melody')) targetInst = 'melody';

    return {
      action: 'REPLACE_SOUND_QUERY',
      payload: { searchQuery: text, targetInstrument: targetInst },
      feedbackText: `Searching sound catalog for "${text}"...`,
    };
  }

  return {
    action: 'UNKNOWN',
    feedbackText: `Recognized voice input: "${transcript}". No matching command found.`,
  };
}
