import { CapabilityAdmission, AceCapabilityManifest } from '../types/daw';

export const ACE_MANIFEST_BASELINE: AceCapabilityManifest[] = [
  {
    repositoryUrl: 'https://github.com/SeedClassIntelligence/ACE-Step-1.5',
    frozenCommitSha: '2026-04-02-release',
    license: 'Apache-2.0',
    checkpoint: 'acestep-v15-xl-base',
    capabilityId: 'CAP-001_UNDERSTAND_MUSIC',
    sourceFile: 'acestep/core/understanding/music_understand.py',
    evidenceClass: 'V',
  },
  {
    repositoryUrl: 'https://github.com/SeedClassIntelligence/ACE-Step-1.5',
    frozenCommitSha: '2026-04-02-release',
    license: 'Apache-2.0',
    checkpoint: 'acestep-v15-xl-base',
    capabilityId: 'CAP-002_PMI_SCORER',
    sourceFile: 'acestep/core/scoring/lm_score.py',
    evidenceClass: 'V',
  },
  {
    repositoryUrl: 'https://github.com/SeedClassIntelligence/ACE-Step-1.5',
    frozenCommitSha: '2026-04-02-release',
    license: 'Apache-2.0',
    checkpoint: 'acestep-v15-xl-base',
    capabilityId: 'CAP-003_REST_API',
    sourceFile: 'acestep/server/api.py',
    evidenceClass: 'V',
  },
  {
    repositoryUrl: 'https://github.com/SeedClassIntelligence/ACE-Step-1.5',
    frozenCommitSha: '2026-04-02-release',
    license: 'Apache-2.0',
    checkpoint: 'acestep-v15-xl-base',
    capabilityId: 'CAP-004_REFERENCE_REALIZATION',
    sourceFile: 'acestep/core/generation/infer.py',
    evidenceClass: 'V',
  },
  {
    repositoryUrl: 'https://github.com/SeedClassIntelligence/ACE-Step-1.5',
    frozenCommitSha: '2026-04-02-release',
    license: 'Apache-2.0',
    checkpoint: 'acestep-v15-xl-base',
    capabilityId: 'CAP-005_RETAKE',
    sourceFile: 'acestep/core/generation/infer.py',
    evidenceClass: 'V',
  },
  {
    repositoryUrl: 'https://github.com/SeedClassIntelligence/ACE-Step-1.5',
    frozenCommitSha: '2026-04-02-release',
    license: 'Apache-2.0',
    checkpoint: 'acestep-v15-xl-base',
    capabilityId: 'CAP-006_REPAINT',
    sourceFile: 'acestep/core/generation/infer.py',
    evidenceClass: 'V',
  },
  {
    repositoryUrl: 'https://github.com/SeedClassIntelligence/ACE-Step-1.5',
    frozenCommitSha: '2026-04-02-release',
    license: 'Apache-2.0',
    checkpoint: 'acestep-v15-xl-base',
    capabilityId: 'CAP-007_PERFORMANCE_TRANSFER',
    sourceFile: 'acestep/core/generation/infer.py',
    evidenceClass: 'V',
  },
];

export const DEFAULT_CAPABILITY_REGISTRY: Record<string, CapabilityAdmission> = {
  'CAP-001': {
    capabilityId: 'CAP-001',
    status: 'benchmarking',
    engineId: 'E03',
    adapterId: 'ACEMusicUnderstandAdapter',
    version: '1.5.0',
  },
  'CAP-002': {
    capabilityId: 'CAP-002',
    status: 'experimental',
    engineId: 'E05',
    adapterId: 'ACEPmiScorerAdapter',
    version: '1.5.0',
  },
  'CAP-003': {
    capabilityId: 'CAP-003',
    status: 'admitted',
    engineId: 'E05',
    adapterId: 'ACEFastApiBridge',
    version: '1.5.0',
    admittedAt: Date.now(),
  },
  'CAP-004': {
    capabilityId: 'CAP-004',
    status: 'experimental',
    engineId: 'E05',
    adapterId: 'ACEReferenceRealizer',
    version: '1.5.0',
  },
  'CAP-005': {
    capabilityId: 'CAP-005',
    status: 'planned',
    engineId: 'E05',
    adapterId: 'ACERetakeAdapter',
    version: '1.5.0',
  },
  'CAP-006': {
    capabilityId: 'CAP-006',
    status: 'planned',
    engineId: 'E05',
    adapterId: 'ACERepaintAdapter',
    version: '1.5.0',
  },
  'CAP-007': {
    capabilityId: 'CAP-007',
    status: 'admitted',
    engineId: 'E05',
    adapterId: 'ACERealizer',
    version: '1.5.0',
    admittedAt: Date.now(),
  },
  'CAP-008': {
    capabilityId: 'CAP-008',
    status: 'planned',
    engineId: 'E06',
    adapterId: 'ACELegoAdapter',
    version: '1.5.0',
  },
  'CAP-009': {
    capabilityId: 'CAP-009',
    status: 'planned',
    engineId: 'E07',
    adapterId: 'ACECompleteAdapter',
    version: '1.5.0',
  },
  'CAP-010': {
    capabilityId: 'CAP-010',
    status: 'experimental',
    engineId: 'E13',
    adapterId: 'ACEDatasetBuilderAdapter',
    version: '1.5.0',
  },
};

export class CapabilityRegistryManager {
  private registry: Record<string, CapabilityAdmission>;

  constructor(initialRegistry: Record<string, CapabilityAdmission> = DEFAULT_CAPABILITY_REGISTRY) {
    this.registry = { ...initialRegistry };
  }

  public getCapability(capabilityId: string): CapabilityAdmission | undefined {
    return this.registry[capabilityId];
  }

  public canUseCapability(capabilityId: string): boolean {
    const cap = this.registry[capabilityId];
    return cap?.status === 'admitted';
  }

  public isCapabilityExperimental(capabilityId: string): boolean {
    const cap = this.registry[capabilityId];
    return cap?.status === 'experimental' || cap?.status === 'benchmarking';
  }

  public updateCapabilityStatus(
    capabilityId: string,
    status: CapabilityAdmission['status'],
    adapterId?: string
  ): void {
    if (this.registry[capabilityId]) {
      this.registry[capabilityId] = {
        ...this.registry[capabilityId],
        status,
        ...(adapterId ? { adapterId } : {}),
        ...(status === 'admitted' ? { admittedAt: Date.now() } : {}),
      };
    }
  }

  public getAllCapabilities(): CapabilityAdmission[] {
    return Object.values(this.registry);
  }
}

export const capabilityRegistry = new CapabilityRegistryManager();
