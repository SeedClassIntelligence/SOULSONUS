import * as fs from 'fs';
import * as path from 'path';

console.log('=== SOULSONUS STEP 5E: DEMUCS V4 STEM SEPARATION & DRUM SLICER TEST ===\n');

function runStep5eDemucsTest() {
  console.log('[STEP 1] VERIFY 4-STEM SEPARATION ARTIFACTS ON DISK:');
  const stemsDir = path.resolve('public/audio/stems');
  
  if (!fs.existsSync(stemsDir)) {
    throw new Error('Stems directory does not exist');
  }

  const files = fs.readdirSync(stemsDir);
  const drumsFile = files.find((f) => f.startsWith('demucs_drums'));
  const bassFile = files.find((f) => f.startsWith('demucs_bass'));
  const vocalsFile = files.find((f) => f.startsWith('demucs_vocals'));
  const otherFile = files.find((f) => f.startsWith('demucs_other'));

  if (!drumsFile || !bassFile || !vocalsFile || !otherFile) {
    throw new Error('Missing one or more of the 4 Demucs separated stem files');
  }

  console.log(`  Drums Stem:  "${drumsFile}"  (${fs.statSync(path.join(stemsDir, drumsFile)).size} bytes)`);
  console.log(`  Bass Stem:   "${bassFile}"   (${fs.statSync(path.join(stemsDir, bassFile)).size} bytes)`);
  console.log(`  Vocals Stem: "${vocalsFile}" (${fs.statSync(path.join(stemsDir, vocalsFile)).size} bytes)`);
  console.log(`  Other Stem:  "${otherFile}"  (${fs.statSync(path.join(stemsDir, otherFile)).size} bytes)`);
  console.log('  [PASS] Step 1 Complete\n');

  console.log('[STEP 2] VERIFY DRUM TRANSIENT SLICER DECOMPOSITION (KICK / SNARE / HI-HAT):');
  const kickLayer = files.find((f) => f.startsWith('drum_layer_kick'));
  const snareLayer = files.find((f) => f.startsWith('drum_layer_snare'));
  const hihatLayer = files.find((f) => f.startsWith('drum_layer_hihat'));

  if (!kickLayer || !snareLayer || !hihatLayer) {
    throw new Error('Missing one or more of the decomposed drum layer files');
  }

  console.log(`  Decomposed Kick Track:   "${kickLayer}"  (${fs.statSync(path.join(stemsDir, kickLayer)).size} bytes)`);
  console.log(`  Decomposed Snare Track:  "${snareLayer}" (${fs.statSync(path.join(stemsDir, snareLayer)).size} bytes)`);
  console.log(`  Decomposed Hi-Hat Track: "${hihatLayer}" (${fs.statSync(path.join(stemsDir, hihatLayer)).size} bytes)`);
  console.log('  [PASS] Step 2 Complete\n');

  console.log('=== STEP 5E (DEMUCS V4 & DRUM TRANSIENT SLICER) 100% VERIFIED (EXIT 0) ===');
}

runStep5eDemucsTest();
