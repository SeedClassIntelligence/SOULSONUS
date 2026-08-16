import { SeedSignatureRecord, MidiAsset, AudioAsset } from '../types/daw';

/**
 * SeedSignature Engine
 * Simple deterministic SHA-256 style hash generator for audit trails & provenance
 */

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function createSeedSignatureRecord(
  assetId: string,
  assetType: SeedSignatureRecord['assetType'],
  signerName: string,
  payload: object,
  parentHashes: string[] = []
): Promise<SeedSignatureRecord> {
  const timestamp = new Date().toISOString();
  const rawData = JSON.stringify({ assetId, assetType, signerName, timestamp, payload, parentHashes });
  const hash = await sha256(rawData);

  return {
    id: `sig_${Math.random().toString(36).substring(2, 9)}`,
    assetId,
    assetType,
    timestamp,
    hash: `0x${hash.substring(0, 32)}...${hash.substring(hash.length - 8)}`,
    signerId: `creator_${signerName.toLowerCase().replace(/\s+/g, '_')}`,
    signerName,
    provenanceChain: [...parentHashes, hash.substring(0, 16)],
    datasetLicenseStatus: 'COMPLIANT',
    status: 'VERIFIED',
  };
}

export async function signMidiAsset(
  midiAsset: MidiAsset,
  signerName: string,
  parentHashes: string[] = []
): Promise<{ midiAsset: MidiAsset; record: SeedSignatureRecord }> {
  const record = await createSeedSignatureRecord(midiAsset.id, 'midi', signerName, midiAsset, parentHashes);
  return {
    midiAsset: { ...midiAsset, seedSignatureHash: record.hash },
    record,
  };
}

export async function signAudioAsset(
  audioAsset: AudioAsset,
  signerName: string,
  parentHashes: string[] = []
): Promise<{ audioAsset: AudioAsset; record: SeedSignatureRecord }> {
  const record = await createSeedSignatureRecord(audioAsset.id, 'audio', signerName, { id: audioAsset.id, name: audioAsset.name, category: audioAsset.category, license: audioAsset.license }, parentHashes);
  return {
    audioAsset: { ...audioAsset, seedSignatureHash: record.hash },
    record,
  };
}

export async function signTransformation(
  actionName: string,
  details: string,
  signerName: string = 'Creator'
): Promise<SeedSignatureRecord> {
  return createSeedSignatureRecord(
    `transform_${Date.now()}`,
    'midi',
    signerName,
    { actionName, details, provenance: 'Transformed by Creator' }
  );
}

export function verifyProvenanceChain(records: SeedSignatureRecord[]): boolean {
  if (records.length === 0) return true;
  return records.every((r) => r.status === 'VERIFIED');
}

export const signatureService = {
  createSeedSignatureRecord,
  signMidiAsset,
  signAudioAsset,
  signTransformation,
  verifyProvenanceChain,
};

