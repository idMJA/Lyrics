/**
 * Simple example showing how to use @mjba/lyrics after installation
 * Run this with: node examples/simple.js
 */

// For published package, you would import like this:
// import { lyricsClient } from '@mjba/lyrics';

// For local development:
import { lyricsClient } from '../dist/index.mjs';

async function simpleExample() {
  console.log('🎵 Simple @mjba/lyrics Example\n');

  try {
    // Search for a popular song
    const result = await lyricsClient.searchAndGetLyrics('Hello Adele');
    
    if (result.success) {
      console.log('✅ Found lyrics!');
      console.log(`Song: ${result.songInfo?.title}`);
      console.log(`Artist: ${result.songInfo?.artist}`);
      
      // Show just the first few lines to avoid copyright issues
      if (result.lyrics) {
        const lines = result.lyrics.split('\n').slice(0, 3);
        console.log('\nFirst few lines:');
        lines.forEach(line => console.log(`  ${line}`));
        console.log('  ...');
      }
    } else {
      console.log('❌ Could not find lyrics:', result.error);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

simpleExample();
