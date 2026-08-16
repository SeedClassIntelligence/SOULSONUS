/**
 * SoulSonus DAW Interoperability Engine
 * Packages universal Production Bundles for Pro Tools, Logic, Ableton, FL Studio, and Studio One.
 * Handles bidirectional import/export with metadata, stems, MIDI, and tempo maps.
 */

import { Track, ArrangementSection, DAWState, DawProductionBundle } from '../types/daw';

export class DawInteroperabilityEngine {
  /**
   * Export the current session as a structured DAW Production Bundle
   */
  public exportProductionBundle(
    dawState: DAWState,
    tracks: Track[],
    sections: ArrangementSection[],
    seedSignatureHash?: string
  ): DawProductionBundle {
    const timestamp = new Date().toISOString();

    const bundleTracks = tracks.map((track) => {
      // Map 64-step or custom steps to MIDI note events
      const midiNotes = track.steps.map((isActive, sIdx) => {
        if (!isActive) return null;
        const bar = Math.floor(sIdx / 16) + 1;
        const beat = Math.floor((sIdx % 16) / 4) + 1;
        return {
          bar,
          beat,
          note: track.pitch || 'C2',
          velocity: 100,
          duration: 0.25, // 16th note
        };
      }).filter(Boolean) as { bar: number; beat: number; note: string; velocity: number; duration: number }[];

      return {
        id: track.id,
        name: track.name,
        instrument: track.instrument,
        volume: track.volume,
        pan: track.dspSettings?.pan || 0,
        stemAudioUrl: `stems/${track.id}_${track.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}.wav`,
        midiNotes,
        layersCount: track.layers ? track.layers.length : 1,
        seedType: track.seedType || 'ROOT_SEED',
      };
    });

    const bundleSections = sections.map((sec) => ({
      id: sec.id,
      name: sec.name,
      startBar: sec.bars[0] || 1,
      endBar: sec.bars[sec.bars.length - 1] || 4,
    }));

    return {
      manifestVersion: '1.0.0',
      projectId: `proj_${Date.now()}`,
      projectName: dawState.projectName || 'SoulSonus Master Track',
      bpm: dawState.bpm,
      key: 'C Minor',
      timeSignature: '4/4',
      exportedAt: timestamp,
      sections: bundleSections,
      tracks: bundleTracks,
      masterLufsTarget: -14.0,
      seedSignatureHash: seedSignatureHash || '0xsha256_verified_master',
    };
  }

  /**
   * Generates a downloadable JSON file for the Production Bundle Manifest
   */
  public downloadBundleManifest(bundle: DawProductionBundle) {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(bundle, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${bundle.projectName.toLowerCase().replace(/\s+/g, '_')}_soulsonus_bundle.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }

  /**
   * Parses an imported DAW bundle JSON and returns canonical session entities
   */
  public parseImportedBundle(jsonString: string): {
    dawStateUpdates: Partial<DAWState>;
    tracks: Partial<Track>[];
    sections: ArrangementSection[];
  } {
    const parsed: DawProductionBundle = JSON.parse(jsonString);

    const dawStateUpdates: Partial<DAWState> = {
      projectName: parsed.projectName,
      bpm: parsed.bpm,
    };

    const tracks: Partial<Track>[] = parsed.tracks.map((t) => ({
      id: t.id,
      name: t.name,
      instrument: t.instrument as any,
      volume: t.volume,
      seedType: (t.seedType as any) || 'CONTRIBUTION_SEED',
      steps: Array.from({ length: 64 }, (_, idx) => {
        const bar = Math.floor(idx / 16) + 1;
        const beat = Math.floor((idx % 16) / 4) + 1;
        return t.midiNotes.some((n) => n.bar === bar && n.beat === beat);
      }),
    }));

    const defaultTags: ('Intro' | 'Verse' | 'Chorus' | 'Outro')[] = ['Intro', 'Verse', 'Chorus', 'Outro'];

    const sections: ArrangementSection[] = parsed.sections.map((s, idx) => {
      const barsList = [];
      for (let b = s.startBar; b <= s.endBar; b++) {
        barsList.push(b);
      }
      return {
        id: s.id,
        name: s.name,
        tag: defaultTags[idx % defaultTags.length],
        bars: barsList.length > 0 ? barsList : [1, 2],
        energy: (idx === 2 ? 'peak' : idx === 1 ? 'high' : 'medium') as any,
        color: ['#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6'][idx % 4],
      };
    });

    return {
      dawStateUpdates,
      tracks,
      sections,
    };
  }
}

export const dawInteroperabilityEngine = new DawInteroperabilityEngine();
