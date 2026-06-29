import { lyricsClient } from "../src/index.js";

/**
 * Simple test for synced lyrics with timestamps
 */
async function testSyncedLyrics() {
	console.log("🎵 Testing Synced Lyrics with Timestamps");
	console.log("========================================\n");

	const testSongs = [
		"Shape of You Ed Sheeran",
		// "Blinding Lights The Weeknd",
		// "Bad Guy Billie Eilish"
	];

	// Fetch all results in parallel
	const results = await Promise.all(
		testSongs.map((song) => lyricsClient.searchSynced(song)),
	);

	// Display all results together
	testSongs.forEach((song, idx) => {
		const result = results[idx];
		console.log(`🎼 Testing: "${song}"`);
		console.log("-".repeat(40));
		if (result.success) {
			console.log(
				`✅ Found: ${result.songInfo?.title} by ${result.songInfo?.artist}`,
			);
			console.log(`⏱️  Duration: ${result.songInfo?.duration} seconds`);
			if (result.hasTimestamps && result.syncedLyrics) {
				console.log(
					`🎯 Synced lyrics found! (${result.syncedLyrics.length} lines)`,
				);
				console.log("\n📝 All lines with timestamps:");
				result.syncedLyrics.forEach((lyric) => {
					const time = `${lyric.time.minutes.toString().padStart(2, "0")}:${lyric.time.seconds.toString().padStart(2, "0")}.${lyric.time.ms.toString().padStart(3, "0")}`;
					console.log(`[${time}] ${lyric.text}`);
				});
			} else if (result.lyrics) {
				console.log("📝 Only regular lyrics available (no timestamps)");
			}
		} else {
			console.log(`❌ Failed: ${result.error}`);
		}
		console.log("\n");
	});
}

/**
 * Test specific song with detailed timestamp info
 */
async function testSpecificSong() {
	console.log("🎯 Detailed Timestamp Test");
	console.log("==========================\n");

	const song = "Levitating Dua Lipa";
	console.log(`🎵 Testing detailed timestamps for: "${song}"`);

	try {
		const result = await lyricsClient.searchSynced(song);

		if (result.success && result.hasTimestamps && result.syncedLyrics) {
			console.log(
				`✅ Found synced lyrics with ${result.syncedLyrics.length} lines`,
			);

			// Show timing analysis
			const firstTime = result.syncedLyrics[0]?.time.total || 0;
			const lastTime =
				result.syncedLyrics[result.syncedLyrics.length - 1]?.time.total || 0;

			console.log(`\n📊 Timing Analysis:`);
			console.log(`First lyric at: ${firstTime.toFixed(2)}s`);
			console.log(`Last lyric at: ${lastTime.toFixed(2)}s`);
			console.log(`Lyrics span: ${(lastTime - firstTime).toFixed(2)}s`);

			console.log(`\n🎵 All lyrics with timestamps:`);
			result.syncedLyrics.forEach((lyric) => {
				const time = `${lyric.time.minutes.toString().padStart(2, "0")}:${lyric.time.seconds.toString().padStart(2, "0")}.${lyric.time.ms.toString().padStart(3, "0")}`;
				console.log(`[${time}] ${lyric.text}`);
			});
		} else {
			console.log("❌ No synced lyrics available for this song");
		}
	} catch (error) {
		console.log(
			`💥 Error: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
	}
}

async function main() {
	console.log("🚀 Starting Synced Lyrics Test\n");

	await testSyncedLyrics();
	await testSpecificSong();

	console.log("🎉 Test completed!");
}

if (import.meta.url === `file://${process.argv[1]}`) {
	main().catch(console.error);
}

export { testSpecificSong, testSyncedLyrics };
