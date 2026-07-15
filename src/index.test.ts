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

	it("should parse richsync data to word-level structures", () => {
		const client = new LyricsClient();
		const sampleRichSync = JSON.stringify([
			{
				ts: 12.34,
				te: 15.67,
				l: [
					{ c: "First", o: 0 },
					{ c: " ", o: 0.5 },
					{ c: "line", o: 0.6 },
				],
			},
		]);

		// biome-ignore lint/suspicious/noExplicitAny: access private method for testing
		const result = (client as any).parseRichSyncToWords(sampleRichSync);
		expect(result).toHaveLength(1);
		expect(result[0].startTime.total).toBe(12.34);
		expect(result[0].startTime.minutes).toBe(0);
		expect(result[0].startTime.seconds).toBe(12);
		expect(result[0].startTime.ms).toBe(340);

		expect(result[0].endTime.total).toBe(15.67);

		expect(result[0].words).toHaveLength(3);
		expect(result[0].words[0].text).toBe("First");
		expect(result[0].words[0].time.total).toBe(12.34);

		expect(result[0].words[2].text).toBe("line");
		expect(result[0].words[2].time.total).toBe(12.94); // 12.34 + 0.6
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
