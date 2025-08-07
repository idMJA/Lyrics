/**
 * Example usage of @mjba/lyrics package
 * This file demonstrates how to use the package in different scenarios
 */

import { lyricsClient, LyricsClient, type LyricsResponse, type Track } from '../src/index.js';

async function main() {
  console.log('🎵 @mjba/lyrics Example Usage\n');

  // Example 1: Search for lyrics by song name and artist
  console.log('1. Searching for lyrics by song name...');
  try {
    const result1: LyricsResponse = await lyricsClient.searchAndGetLyrics('Imagine Dragons Thunder');
    
    if (result1.success && result1.lyrics) {
      console.log('✅ Found lyrics!');
      console.log(`Title: ${result1.songInfo?.title}`);
      console.log(`Artist: ${result1.songInfo?.artist}`);
      console.log(`Album: ${result1.songInfo?.album}`);
      console.log(`Duration: ${result1.songInfo?.duration}s`);
      console.log('\nLyrics preview:', result1.lyrics.substring(0, 200) + '...\n');
    } else {
      console.log('❌ No lyrics found:', result1.error);
    }
  } catch (error) {
    console.error('Error:', error);
  }

  // Example 2: Get lyrics using ISRC code
  console.log('2. Getting lyrics by ISRC...');
  try {
    // ISRC for "Shape of You" by Ed Sheeran
    const result2: LyricsResponse = await lyricsClient.getLyricsByISRC('GBUM71505078');
    
    if (result2.success && result2.lyrics) {
      console.log('✅ Found lyrics via ISRC!');
      console.log(`Title: ${result2.songInfo?.title}`);
      console.log(`Artist: ${result2.songInfo?.artist}`);
      console.log('\nLyrics preview:', result2.lyrics.substring(0, 200) + '...\n');
    } else {
      console.log('❌ No lyrics found via ISRC:', result2.error);
    }
  } catch (error) {
    console.error('Error:', error);
  }

  // Example 3: Get track information without lyrics
  console.log('3. Getting track info by ISRC...');
  try {
    const track: Track = await lyricsClient.getTrackByISRC('GBUM71505078');
    console.log('✅ Found track info!');
    console.log(`Track ID: ${track.track_id}`);
    console.log(`Name: ${track.track_name}`);
    console.log(`Artist: ${track.artist_name}`);
    console.log(`Album: ${track.album_name}`);
    console.log(`Length: ${track.track_length}s`);
    console.log(`ISRC: ${track.track_isrc}\n`);
  } catch (error) {
    console.error('Error getting track info:', error);
  }

  // Example 4: Using a custom client instance
  console.log('4. Using custom client instance...');
  const customClient = new LyricsClient();
  try {
    const result4 = await customClient.searchAndGetLyrics('Bohemian Rhapsody Queen');
    
    if (result4.success) {
      console.log('✅ Custom client works!');
      console.log(`Found: ${result4.songInfo?.title} by ${result4.songInfo?.artist}`);
    } else {
      console.log('❌ Custom client failed:', result4.error);
    }
  } catch (error) {
    console.error('Error with custom client:', error);
  }

  // Example 5: Batch processing multiple songs
  console.log('\n5. Batch processing multiple songs...');
  const songs = [
    'Hotel California Eagles',
    'Stairway to Heaven Led Zeppelin',
    'Sweet Child O Mine Guns N Roses'
  ];

  for (const song of songs) {
    try {
      const result = await lyricsClient.searchAndGetLyrics(song);
      
      if (result.success) {
        console.log(`✅ ${result.songInfo?.title} by ${result.songInfo?.artist}`);
      } else {
        console.log(`❌ Could not find: ${song} (${result.error})`);
      }
    } catch (error) {
      console.log(`❌ Error processing ${song}:`, error);
    }
    
    // Add small delay to be respectful to the API
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n🎉 Example completed!');
}

// Error handling wrapper
async function runExample() {
  try {
    await main();
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Only run if this file is executed directly
if (import.meta.main) {
  runExample();
}

export { runExample };
