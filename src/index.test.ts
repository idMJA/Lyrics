import { describe, expect, it } from "bun:test";
import { LyricsClient, lyricsClient } from "../src/index.js";

describe("LyricsClient", () => {
	it("should create a new instance", () => {
		const client = new LyricsClient();
		expect(client).toBeInstanceOf(LyricsClient);
	});

	it("should export a default instance", () => {
		expect(lyricsClient).toBeInstanceOf(LyricsClient);
	});

	it("should have required methods", () => {
		expect(typeof lyricsClient.get).toBe("function");
		expect(typeof lyricsClient.search).toBe("function");
		expect(typeof lyricsClient.getTrack).toBe("function");
	});
});

// Integration tests (commented out to avoid API calls in CI)
/*
describe('Integration Tests', () => {
  it('should search and get lyrics', async () => {
    const result = await lyricsClient.search('Imagine Dragons Thunder');
    
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
    const result = await lyricsClient.get('GBUM71505078');
    
    if (result.success) {
      expect(result.lyrics).toBeTruthy();
      expect(result.songInfo).toBeTruthy();
    } else {
      console.warn('ISRC test failed:', result.error);
    }
  }, 30000);
});
*/
