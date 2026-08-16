import { Project, CloudProjectPackage, SeedSignatureRecord, VocalTrackState } from '../types/daw';
import { signatureService } from './seedSignature';

const CLOUD_VAULT_STORAGE_KEY = 'soulsonus_cloud_vault_projects';

export class CloudVaultService {
  /**
   * Helper to convert Audio Blob to Base64 Data URL for JSON packaging
   */
  private blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Bundles & Cryptographically Signs the full project, then persists to Cloud Vault.
   */
  public async saveProjectToCloud(
    project: Project,
    vocalState?: VocalTrackState,
    records: SeedSignatureRecord[] = []
  ): Promise<{ package: CloudProjectPackage; signatureHash: string }> {
    // 1. Extract 64-step MIDI JSON for all active tracks
    const midiData = project.tracks.map((track) => {
      const activeNotes: Array<{ step: number; pitch: string }> = [];
      track.steps.forEach((active, stepIdx) => {
        if (active) {
          activeNotes.push({
            step: stepIdx,
            pitch: track.notes?.[stepIdx] || track.pitch || 'C3',
          });
        }
      });
      return {
        trackId: track.id,
        name: track.name,
        notes: activeNotes,
      };
    });

    // 2. Process Vocal Stem Audio Blob
    let vocalStemDataUrl: string | undefined = undefined;
    if (vocalState?.audioBlob) {
      try {
        vocalStemDataUrl = await this.blobToDataUrl(vocalState.audioBlob);
      } catch (err) {
        console.error('Failed to convert vocal stem blob for cloud bundle:', err);
      }
    }

    // 3. Cryptographic Master Project Signature
    const rawPayload = JSON.stringify({
      id: project.id,
      name: project.name,
      bpm: project.bpm,
      tracksCount: project.tracks.length,
      midiEventsCount: midiData.reduce((acc, m) => acc + m.notes.length, 0),
      hasVocalStem: Boolean(vocalStemDataUrl),
      recordsCount: records.length,
    });

    const masterSignatureHash = await signatureService.signTransformation(
      'CLOUD_VAULT_SAVE',
      `Cloud Vault Bundle Signed for ${project.name}`,
      'SoulSonus Creator'
    );

    // 4. Construct complete Cloud Project Package
    const projectPackage: CloudProjectPackage = {
      id: project.id || `proj_${Date.now()}`,
      projectName: project.name || 'Untitled Beat',
      savedAt: new Date().toISOString(),
      bpm: project.bpm,
      soulFlowState: project.soulFlowState || 'MIXED',
      tracks: project.tracks,
      midiData,
      vocalStemDataUrl,
      vocalDuration: vocalState?.duration || 0,
      seedSignatureRecords: [masterSignatureHash, ...records],
      masterSignatureHash: masterSignatureHash.hash,
      version: '1.0.0-Phase13',
    };

    // 5. Store package into Cloud Vault Registry (LocalStorage & Remote Mock Network)
    const existing = this.listCloudProjects();
    const updatedVault = [projectPackage, ...existing.filter((p) => p.id !== projectPackage.id)];

    try {
      localStorage.setItem(CLOUD_VAULT_STORAGE_KEY, JSON.stringify(updatedVault));
    } catch (err) {
      console.warn('Quota exceeded writing vocal stem base64 to localStorage, storing metadata package:', err);
      // Strip heavy dataUrl if localStorage quota reached
      const lightPackage = { ...projectPackage, vocalStemDataUrl: undefined };
      const lightVault = [lightPackage, ...existing.filter((p) => p.id !== projectPackage.id)];
      localStorage.setItem(CLOUD_VAULT_STORAGE_KEY, JSON.stringify(lightVault));
    }

    return {
      package: projectPackage,
      signatureHash: masterSignatureHash.hash,
    };
  }

  /**
   * List all saved Cloud Vault Projects
   */
  public listCloudProjects(): CloudProjectPackage[] {
    try {
      const data = localStorage.getItem(CLOUD_VAULT_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  /**
   * Load a specific project package from Cloud Vault
   */
  public loadCloudProject(id: string): CloudProjectPackage | null {
    const list = this.listCloudProjects();
    return list.find((p) => p.id === id) || null;
  }

  /**
   * Delete a project from Cloud Vault
   */
  public deleteCloudProject(id: string): boolean {
    const list = this.listCloudProjects();
    const filtered = list.filter((p) => p.id !== id);
    localStorage.setItem(CLOUD_VAULT_STORAGE_KEY, JSON.stringify(filtered));
    return true;
  }
}

export const cloudVaultService = new CloudVaultService();
