import { clapEmbeddingMatcher, ClapMatchResult } from '../src/lib/clapEmbeddingMatcher';

console.log('=== SOULSONUS STEP 5C: LAION CLAP (E04) EMBEDDINGS ACCEPTANCE TEST ===\n');

async function runStep5cClapTest() {
  console.log('[TEST 1] SEARCH KICK: "Give me a heavy analog punch sub kick"');
  const kickResults = await clapEmbeddingMatcher.searchSoundVault('Give me a heavy analog punch sub kick', 'drums', 2);
  
  kickResults.forEach((r, idx) => {
    console.log(`  Rank #${idx + 1}: "${r.name}" (${r.licenseStatus}) - Similarity: ${(r.similarityScore * 100).toFixed(1)}% (Dims: ${r.matchedVectorDimensions})`);
  });

  if (kickResults[0]?.presetId !== 'vault_kick_punch_01') {
    throw new Error('CLAP failed to rank heavy punch kick at rank #1');
  }
  console.log('  [PASS] Test 1 Complete\n');

  console.log('[TEST 2] SEARCH KEYS: "Warm vintage electric rhodes jazz piano"');
  const keysResults = await clapEmbeddingMatcher.searchSoundVault('Warm vintage electric rhodes jazz piano', 'keys', 2);
  
  keysResults.forEach((r, idx) => {
    console.log(`  Rank #${idx + 1}: "${r.name}" (${r.licenseStatus}) - Similarity: ${(r.similarityScore * 100).toFixed(1)}% (Dims: ${r.matchedVectorDimensions})`);
  });

  if (keysResults[0]?.presetId !== 'vault_keys_rhodes_01') {
    throw new Error('CLAP failed to rank vintage rhodes at rank #1');
  }
  console.log('  [PASS] Test 2 Complete\n');

  console.log('[TEST 3] SEARCH CELLO/STRINGS: "Cinematic acoustic cello strings"');
  const stringsResults = await clapEmbeddingMatcher.searchSoundVault('Cinematic acoustic cello strings', undefined, 2);
  
  stringsResults.forEach((r, idx) => {
    console.log(`  Rank #${idx + 1}: "${r.name}" (${r.licenseStatus}) - Similarity: ${(r.similarityScore * 100).toFixed(1)}% (Dims: ${r.matchedVectorDimensions})`);
  });

  if (stringsResults[0]?.presetId !== 'vault_strings_orchestral_01') {
    throw new Error('CLAP failed to rank orchestral cello strings at rank #1');
  }
  console.log('  [PASS] Test 3 Complete\n');

  console.log('=== STEP 5C (LAION CLAP E04 REAL EMBEDDINGS) 100% VERIFIED (EXIT 0) ===');
}

runStep5cClapTest();
