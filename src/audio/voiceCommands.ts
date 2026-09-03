import { InstrumentType } from '../types/daw';

/**
 * Direct commands, and everything else.
 *
 * This file used to be the whole of the platform's language understanding: a
 * cascade of `text.includes(...)` ending in a terminal `UNKNOWN`. Section III.6
 * names that shape as the violation -- "Make that transition feel cinematic"
 * has nowhere to go -- but the substring matching was doing worse than failing.
 * It was firing on fragments of unrelated words, measured against the parser
 * before this rewrite:
 *
 *   "make the vocal clearer"              -> CLEAR_ALL      ("clearer" has "clear")
 *   "make sure that is correct"           -> TOGGLE_REC     ("correct" has "rec")
 *   "make that transition feel cinematic" -> REPLACE_SOUND  ("that" has "hat")
 *   "start recording"                     -> TOGGLE_PLAY    ("start" checked first)
 *   "fast forward to the drop"            -> NUDGE_RIGHT    ("forward")
 *
 * The first of those wipes the grid in response to a compliment about the
 * vocal, and the third is the seed's own example sentence being routed to a
 * hi-hat sound swap by the most common word in it.
 *
 * Two changes. Matching is on whole words, so a command fires when it was
 * spoken and not when a fragment of it appears inside another word. And
 * nothing dies here any more: a sentence that is not a direct command is
 * carried to the reasoning layer instead of being answered with "no command
 * matches it". That is III.5, and it is what makes III.6's `UNKNOWN` removable
 * rather than merely renameable -- there is a real destination behind it, and
 * `SoulSonusNativeStudioIntelligence` reaches it with no network and no keys.
 */

export type VoiceCommandAction =
  | 'CLONE_BAR_1'
  | 'NUDGE_LEFT'
  | 'NUDGE_RIGHT'
  | 'INVERT_PATTERN'
  | 'CLEAR_ALL'
  | 'TOGGLE_PLAY'
  | 'TOGGLE_REC'
  | 'CHANGE_BPM'
  | 'REPLACE_SOUND_QUERY'
  /**
   * Not a direct command, and not a failure.
   *
   * The transcript is carried to the reasoning layer as spoken. Creative
   * direction is the majority of what a producer says out loud, and it is the
   * part this file has never been able to act on; refusing it here would make
   * the parser the ceiling on the platform's understanding, which is exactly
   * what III.6 forbids.
   */
  | 'REASONING_FALLTHROUGH';

export interface VoiceCommandResult {
  action: VoiceCommandAction;
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
  /** The transcript as spoken, carried unchanged for the reasoning layer. */
  transcript?: string;
}

/**
 * True when one of these phrases was actually said, rather than appearing
 * inside a longer word.
 *
 * `"clearer".includes("clear")` is true and is the reason a compliment could
 * clear the grid. Boundaries are non-word characters or the ends of the
 * string, so "clear" matches "clear the grid" and "clear!" but not "clearer".
 */
const said = (text: string, phrases: string[]): boolean =>
  phrases.some((phrase) =>
    new RegExp(`(^|[^a-z0-9])${phrase.replace(/\s+/g, '\\s+')}([^a-z0-9]|$)`, 'i').test(text)
  );

export function parseVoiceCommand(transcript: string): VoiceCommandResult {
  const text = transcript.toLowerCase().trim();

  // Record is tested before play. "Start recording" contains both, and the
  // old order answered it by toggling the transport -- so the obvious way to
  // ask for a take started playback instead.
  if (said(text, ['record', 'recording', 'arm the mic', 'rec'])) {
    return { action: 'TOGGLE_REC', feedbackText: 'Toggle the microphone', transcript };
  }

  if (said(text, ['clone', 'copy bar 1', 'duplicate bar 1'])) {
    return { action: 'CLONE_BAR_1', feedbackText: 'Clone bar 1 across the song', transcript };
  }

  if (said(text, ['nudge left', 'shift left', 'move it back', 'earlier'])) {
    return { action: 'NUDGE_LEFT', feedbackText: 'Nudge the pattern one 16th left', transcript };
  }

  if (said(text, ['nudge right', 'shift right', 'move it forward', 'later'])) {
    return { action: 'NUDGE_RIGHT', feedbackText: 'Nudge the pattern one 16th right', transcript };
  }

  if (said(text, ['invert', 'flip the pattern'])) {
    return { action: 'INVERT_PATTERN', feedbackText: 'Invert the grid', transcript };
  }

  // "Clear" only as an instruction. "Make the vocal clearer" is a judgment
  // about a sound and belongs to the reasoning layer, not to a grid wipe.
  if (said(text, ['clear the grid', 'clear it', 'clear all', 'reset grid', 'wipe'])) {
    return { action: 'CLEAR_ALL', feedbackText: 'Clear the grid', transcript };
  }

  if (said(text, ['play', 'pause', 'stop', 'transport'])) {
    return { action: 'TOGGLE_PLAY', feedbackText: 'Start or stop the transport', transcript };
  }

  if (said(text, ['faster', 'speed up', 'increase bpm', 'raise the tempo'])) {
    return {
      action: 'CHANGE_BPM',
      payload: { bpmDelta: 10 },
      feedbackText: 'Raise the tempo by 10 BPM',
      transcript,
    };
  }

  if (said(text, ['slower', 'slow down', 'decrease bpm', 'lower the tempo'])) {
    return {
      action: 'CHANGE_BPM',
      payload: { bpmDelta: -10 },
      feedbackText: 'Lower the tempo by 10 BPM',
      transcript,
    };
  }

  // A sound swap needs a verb as well as an instrument. Naming a drum is not
  // the same as asking for a different one -- "more swing on the hats" is a
  // feel request about hats, and answering it by opening a hi-hat browser is
  // answering a different question.
  const instrumentSpoken = said(text, ['kick', 'snare', 'hat', 'hats', 'hi-hat', 'synth', 'melody']);
  const swapAsked = said(text, ['replace', 'swap', 'change the', 'different', 'find', 'new sound']);
  if (instrumentSpoken && swapAsked) {
    let targetInst: InstrumentType = 'kick';
    if (said(text, ['snare'])) targetInst = 'snare';
    if (said(text, ['hat', 'hats', 'hi-hat'])) targetInst = 'hihat';
    if (said(text, ['synth', 'melody'])) targetInst = 'melody';

    return {
      action: 'REPLACE_SOUND_QUERY',
      payload: { searchQuery: text, targetInstrument: targetInst },
      feedbackText: `Find a ${targetInst} sound matching "${text}"`,
      transcript,
    };
  }

  // Everything else is carried, not dropped.
  return {
    action: 'REASONING_FALLTHROUGH',
    feedbackText: `Not a direct command — asking the co-producer about "${transcript}"`,
    transcript,
  };
}

/**
 * Whether a result still needs the reasoning layer.
 *
 * Exported so a caller cannot forget: a parse that ends here is only half an
 * answer, and treating it as final is the state III.6 describes.
 */
export const needsReasoning = (result: VoiceCommandResult): boolean =>
  result.action === 'REASONING_FALLTHROUGH';
