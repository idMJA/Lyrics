import { lyricsClient } from "../src/index.js";

async function testWordLyrics() {
	console.log("🎵 Testing Word-by-Word (RichSync) Lyrics");
	console.log("=========================================\n");

	const song = "Levitating Dua Lipa";
	console.log(`🔎 Searching and fetching word lyrics for: "${song}"...`);

	try {
		const result = await lyricsClient.searchSynced(song);

		if (result.success) {
			console.log(
				`✅ Track: ${result.songInfo?.title} by ${result.songInfo?.artist}`,
			);

			if (result.richSyncedLyrics && result.richSyncedLyrics.length > 0) {
				console.log(
					`🎯 Word-level (RichSync) lyrics found! (${result.richSyncedLyrics.length} lines)\n`,
				);

				// Print first 5 lines in detail
				const previewLines = result.richSyncedLyrics.slice(0, 5);

				previewLines.forEach((line, index) => {
					const lineStart = `${line.startTime.minutes.toString().padStart(2, "0")}:${line.startTime.seconds.toString().padStart(2, "0")}.${line.startTime.ms.toString().padStart(3, "0")}`;
					const lineEnd = `${line.endTime.minutes.toString().padStart(2, "0")}:${line.endTime.seconds.toString().padStart(2, "0")}.${line.endTime.ms.toString().padStart(3, "0")}`;

					console.log(`Line ${index + 1} [${lineStart} -> ${lineEnd}]:`);

					// Format words with individual timestamps
					const formattedWords = line.words
						.map((w) => {
							const wordTime = `${w.time.minutes.toString().padStart(2, "0")}:${w.time.seconds.toString().padStart(2, "0")}.${w.time.ms.toString().padStart(3, "0")}`;
							return `"${w.text}"(<${wordTime}>)`;
						})
						.join(" ");

					console.log(`  ${formattedWords}\n`);
				});

				console.log("... (rest of the song truncated for preview)");
			} else {
				console.log(
					"⚠️  Standard synced lyrics available, but no word-level (RichSync) data found.",
				);
			}
		} else {
			console.log(`❌ Search failed: ${result.error}`);
		}
	} catch (error) {
		console.error("💥 Error during test:", error);
	}
}

testWordLyrics();
