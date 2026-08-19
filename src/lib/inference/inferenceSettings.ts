/**
 * Configuration for the self-hosted inference stack (inference-server/).
 * Mirrors the existing local-endpoint pattern already used for Ollama in
 * the Native Brain settings (see ReasoningProvider.ts) rather than
 * inventing a separate configuration paradigm.
 *
 * Defaults point at the docker-compose service ports defined in
 * inference-server/docker-compose.yml, so a fresh self-host with default
 * settings works with zero configuration.
 */

const STORAGE_KEY = 'soulsonus.inferenceSettings.v1';

export interface InferenceSettings {
  /**
   * Where a locally-run ACE host listens, for a creator hosting their own.
   *
   * It is not read by the deployed app: the browser reaches realization
   * through the SoulSonus service route, which holds the endpoint and the key
   * server-side. This stays for the local-provider path, so a creator running
   * their own host has somewhere to put its address.
   */
  aceStepEndpoint: string;
  demucsEndpoint: string;
}

const DEFAULTS: InferenceSettings = {
  aceStepEndpoint: 'http://localhost:8001',
  demucsEndpoint: 'http://localhost:8010',
};

export function getInferenceSettings(): InferenceSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

export function setInferenceSettings(settings: Partial<InferenceSettings>): InferenceSettings {
  const merged = { ...getInferenceSettings(), ...settings };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  return merged;
}
