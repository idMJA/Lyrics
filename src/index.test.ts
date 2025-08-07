import { describe, it, expect } from 'bun:test';
import { LyricsClient, lyricsClient } from '../src/index.js';

describe('LyricsClient', () => {
  it('should create a new instance', () => {
    const client = new LyricsClient();
    expect(client).toBeInstanceOf(LyricsClient);
  });

  it('should export a default instance', () => {
    expect(lyricsClient).toBeInstanceOf(LyricsClient);
  });

  it('should have required methods', () => {
    expect(typeof lyricsClient.getLyricsByISRC).toBe('function');
    expect(typeof lyricsClient.searchAndGetLyrics).toBe('function');
    expect(typeof lyricsClient.getTrackByISRC).toBe('function');
  });
});

// Integration tests (commented out to avoid API calls in CI)
/*
describe('Integration Tests', () => {
  it('should search and get lyrics', async () => {
    const result = await lyricsClient.searchAndGetLyrics('Imagine Dragons Thunder');
    
    if (result.success) {
      expect(result.lyrics).toBeTruthy();
      expect(result.songInfo).toBeTruthy();
      expect(result.songInfo?.title).toBeTruthy();
      expect(result.songInfo?.artist).toBeTruthy();
    } else {
      console.warn('Search test failed:', result.error);
    }
  }, 30000);

  it('should get lyrics by ISRC', async () => {
    // This is the ISRC for "Shape of You" by Ed Sheeran
    const result = await lyricsClient.getLyricsByISRC('GBUM71505078');
    
    if (result.success) {
      expect(result.lyrics).toBeTruthy();
      expect(result.songInfo).toBeTruthy();
    } else {
      console.warn('ISRC test failed:', result.error);
    }
  }, 30000);
});
*/
