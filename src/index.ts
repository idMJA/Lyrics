import { dirname, join } from "node:path";
import type {
	LyricsBody,
	LyricsResponse,
	MusixmatchResponse,
	RichSyncBody,
	RichSyncedLyricLine,
	SubtitleBody,
	SyncedLyric,
	TokenBody,
	Track,
	TrackBody,
	TrackSearchBody,
	WordSyncedLyric,
} from "./types.js";
import {
	deleteFile,
	getCachePath,
	kyClient,
	mkdir,
	readFile,
	writeFile,
} from "./utils.js";

export class LyricsClient {
	private ROOT_URL = "https://apic-desktop.musixmatch.com/ws/1.1/";
	private token: string | null = null;

	private parseSubtitle(subtitleBody: string): SyncedLyric[] {
		const lines = subtitleBody.split("\n");
		const timestampMap = new Map<string, string[]>();

		for (const line of lines) {
			const trimmedLine = line.trim();
			if (!trimmedLine) continue;

			const match = trimmedLine.match(/\[(\d{2}):(\d{2})\.(\d{2})\]\s*(.+)/);
			if (match?.[1] && match[2] && match[3] && match[4]) {
				const [, minutes, seconds, hundredths, text] = match;
				const timestampKey = `${minutes}:${seconds}.${hundredths}`;

				if (!timestampMap.has(timestampKey)) {
					timestampMap.set(timestampKey, []);
				}
				const existingTexts = timestampMap.get(timestampKey);
				if (existingTexts) {
					existingTexts.push(text.trim());
				}
			}
		}

		const syncedLyrics: SyncedLyric[] = [];

		for (const [timestampKey, textParts] of timestampMap) {
			const match = timestampKey.match(/(\d{2}):(\d{2})\.(\d{2})/);
			if (!match?.[1] || !match[2] || !match[3]) continue;

			const [, minutes, seconds, hundredths] = match;
			const minutesNum = parseInt(minutes, 10);
			const secondsNum = parseInt(seconds, 10);
			const hundredthsNum = parseInt(hundredths, 10);
			const msNum = hundredthsNum * 10;
			const totalSeconds = minutesNum * 60 + secondsNum + hundredthsNum / 100;

			const combinedText = textParts
				.filter((text) => text.length > 0)
				.join(" ")
				.trim();

			if (combinedText) {
				syncedLyrics.push({
					text: combinedText,
					time: {
						total: totalSeconds,
						minutes: minutesNum,
						seconds: secondsNum,
						ms: msNum,
					},
				});
			}
		}

		syncedLyrics.sort((a, b) => a.time.total - b.time.total);

		return syncedLyrics;
	}

	private parseRichSync(richsyncBody: string): SyncedLyric[] {
		try {
			const richsyncData = JSON.parse(richsyncBody);
			const timestampMap = new Map<number, string[]>();

			if (Array.isArray(richsyncData)) {
				for (const item of richsyncData) {
					if (item.ts && item.l && Array.isArray(item.l)) {
						const startTime = parseFloat(item.ts);
						for (const lyricItem of item.l) {
							if (lyricItem.c) {
								if (!timestampMap.has(startTime)) {
									timestampMap.set(startTime, []);
								}
								const existingTexts = timestampMap.get(startTime);
								if (existingTexts) {
									existingTexts.push(lyricItem.c);
								}
							}
						}
					}
				}
			}

			const syncedLyrics: SyncedLyric[] = [];

			for (const [startTime, textParts] of timestampMap) {
				const minutes = Math.floor(startTime / 60);
				const seconds = Math.floor(startTime % 60);
				const ms = Math.floor((startTime % 1) * 1000);

				const combinedText = textParts
					.filter((text) => text.trim().length > 0)
					.join(" ")
					.trim();

				if (combinedText) {
					syncedLyrics.push({
						text: combinedText,
						time: {
							total: startTime,
							minutes,
							seconds,
							ms,
						},
					});
				}
			}

			syncedLyrics.sort((a, b) => a.time.total - b.time.total);

			return syncedLyrics;
		} catch {
			return [];
		}
	}

	private parseRichSyncToWords(richsyncBody: string): RichSyncedLyricLine[] {
		try {
			const richsyncData = JSON.parse(richsyncBody);
			const lines: RichSyncedLyricLine[] = [];

			if (Array.isArray(richsyncData)) {
				for (const item of richsyncData) {
					if (
						item.ts !== undefined &&
						item.te !== undefined &&
						item.l &&
						Array.isArray(item.l)
					) {
						const startTimeTotal = parseFloat(item.ts);
						const endTimeTotal = parseFloat(item.te);

						const startTime = {
							total: startTimeTotal,
							minutes: Math.floor(startTimeTotal / 60),
							seconds: Math.floor(startTimeTotal % 60),
							ms: Math.round(startTimeTotal * 1000) % 1000,
						};

						const endTime = {
							total: endTimeTotal,
							minutes: Math.floor(endTimeTotal / 60),
							seconds: Math.floor(endTimeTotal % 60),
							ms: Math.round(endTimeTotal * 1000) % 1000,
						};

						const words: WordSyncedLyric[] = [];
						for (const wordItem of item.l) {
							if (wordItem.c !== undefined && wordItem.o !== undefined) {
								const offset = parseFloat(wordItem.o);
								const wordTimeTotal = startTimeTotal + offset;
								words.push({
									text: wordItem.c,
									time: {
										total: wordTimeTotal,
										minutes: Math.floor(wordTimeTotal / 60),
										seconds: Math.floor(wordTimeTotal % 60),
										ms: Math.round(wordTimeTotal * 1000) % 1000,
									},
								});
							}
						}

						lines.push({
							startTime,
							endTime,
							words,
						});
					}
				}
			}

			return lines;
		} catch {
			return [];
		}
	}

	private formatToLrc(syncedLyrics: SyncedLyric[]): string {
		return syncedLyrics
			.map((line) => {
				const min = line.time.minutes.toString().padStart(2, "0");
				const sec = line.time.seconds.toString().padStart(2, "0");
				const ms = Math.floor(line.time.ms / 10)
					.toString()
					.padStart(2, "0");
				return `[${min}:${sec}.${ms}] ${line.text}`;
			})
			.join("\n");
	}

	private async rawGet(
		action: string,
		query: Array<[string, string]> = [],
	): Promise<Response> {
		if (action !== "token.get" && this.token === null) {
			await this.getToken();
		}

		query.push(["app_id", "web-desktop-app-v1.0"]);
		if (this.token !== null) {
			query.push(["usertoken", this.token]);
		}
		const timestamp = Date.now().toString();
		query.push(["t", timestamp]);
		const url = this.ROOT_URL + action;
		const params = new URLSearchParams(query);

		try {
			const response = await kyClient.get(`${url}?${params.toString()}`);
			return response;
		} catch (error) {
			console.error("Error making Musixmatch request:", error);
			throw error;
		}
	}

	private async apiGet(
		action: string,
		query: Array<[string, string]> = [],
	): Promise<Response> {
		const queryClone = query.map(([k, v]) => [k, v] as [string, string]);
		const response = await this.rawGet(action, queryClone);

		if (action !== "token.get") {
			const clone = response.clone();
			try {
				const data = (await clone.json()) as MusixmatchResponse<unknown>;
				if (data?.message?.header?.status_code === 401) {
					this.token = null;
					const tokenPath = join(
						getCachePath("syncedlyrics"),
						"musixmatch_token.json",
					);
					await deleteFile(tokenPath);
					const retryQueryClone = query.map(
						([k, v]) => [k, v] as [string, string],
					);
					return await this.rawGet(action, retryQueryClone);
				}
			} catch {
				// ignore parse errors
			}
		}

		return response;
	}

	private async getToken(): Promise<void> {
		const tokenPath = join(
			getCachePath("syncedlyrics"),
			"musixmatch_token.json",
		);
		const currentTime = Math.floor(Date.now() / 1000);

		try {
			const tokenData = await readFile(tokenPath);
			const cachedTokenData = JSON.parse(tokenData);
			const cachedToken = cachedTokenData.token;
			const expirationTime = cachedTokenData.expiration_time;

			if (cachedToken && expirationTime && currentTime < expirationTime) {
				this.token = cachedToken;
				return;
			}
		} catch {
			console.warn("No valid cached token found, fetching a new one.");
		}

		try {
			const response = await this.apiGet("token.get", [
				["user_language", "en"],
			]);
			const data = (await response.json()) as MusixmatchResponse<TokenBody>;

			if (data.message.header.status_code === 401) {
				await new Promise((resolve) => setTimeout(resolve, 10000));
				return this.getToken();
			}

			const newToken = data.message.body.user_token;
			const expirationTime = currentTime + 600;

			this.token = newToken;

			const tokenData = {
				token: newToken,
				expiration_time: expirationTime,
			};

			try {
				const tokenDir = dirname(tokenPath);
				await mkdir(tokenDir);
				await writeFile(tokenPath, JSON.stringify(tokenData));
			} catch (writeError) {
				console.warn("Could not cache token:", writeError);
			}
		} catch (error) {
			console.error("Error getting Musixmatch token:", error);
			throw error;
		}
	}

	/**
	 * Get synced lyrics with timestamps by ISRC code
	 * @param isrc - International Standard Recording Code
	 * @returns Promise<LyricsResponse>
	 */
	async getSynced(isrc: string): Promise<LyricsResponse> {
		try {
			const trackResponse = await this.apiGet("track.get", [
				["track_isrc", isrc],
			]);
			const trackData =
				(await trackResponse.json()) as MusixmatchResponse<TrackBody>;

			if (trackData.message.header.status_code !== 200) {
				return {
					success: false,
					error: `Track not found for ISRC: ${isrc}`,
				};
			}

			const track = trackData.message.body.track;
			const trackId = track.track_id;

			// try get richsync first (more detailed timing)
			try {
				const richsyncResponse = await this.apiGet("track.richsync.get", [
					["track_id", trackId.toString()],
				]);
				const richsyncData =
					(await richsyncResponse.json()) as MusixmatchResponse<RichSyncBody>;

				if (richsyncData.message.header.status_code === 200) {
					const richsync = richsyncData.message.body.richsync;
					const syncedLyrics = this.parseRichSync(richsync.richsync_body);

					if (syncedLyrics.length > 0) {
						return {
							success: true,
							syncedLyrics,
							richSyncedLyrics: this.parseRichSyncToWords(
								richsync.richsync_body,
							),
							lyrics: this.formatToLrc(syncedLyrics),
							hasTimestamps: true,
							songInfo: {
								title: track.track_name,
								artist: track.artist_name,
								album: track.album_name,
								duration: track.track_length,
							},
						};
					}
				}
			} catch {
				// fallback to subtitle if richsync fails
			}

			try {
				const subtitleResponse = await this.apiGet("track.subtitle.get", [
					["track_id", trackId.toString()],
				]);
				const subtitleData =
					(await subtitleResponse.json()) as MusixmatchResponse<SubtitleBody>;

				if (subtitleData.message.header.status_code === 200) {
					const subtitle = subtitleData.message.body.subtitle;
					const syncedLyrics = this.parseSubtitle(subtitle.subtitle_body);

					if (syncedLyrics.length > 0) {
						return {
							success: true,
							syncedLyrics,
							lyrics: this.formatToLrc(syncedLyrics),
							hasTimestamps: true,
							songInfo: {
								title: track.track_name,
								artist: track.artist_name,
								album: track.album_name,
								duration: track.track_length,
							},
						};
					}
				}
			} catch {
				// fallback to regular lyrics
			}

			const lyricsResponse = await this.apiGet("track.lyrics.get", [
				["track_id", trackId.toString()],
			]);
			const lyricsData =
				(await lyricsResponse.json()) as MusixmatchResponse<LyricsBody>;

			if (lyricsData.message.header.status_code !== 200) {
				return {
					success: false,
					error: "No lyrics found for this track",
				};
			}

			const lyrics = lyricsData.message.body.lyrics;
			return {
				success: true,
				lyrics: lyrics.lyrics_body,
				hasTimestamps: false,
				songInfo: {
					title: track.track_name,
					artist: track.artist_name,
					album: track.album_name,
					duration: track.track_length,
				},
			};
		} catch (error) {
			console.error("Error fetching synced lyrics by ISRC:", error);
			return {
				success: false,
				error:
					error instanceof Error ? error.message : "Unknown error occurred",
			};
		}
	}

	/**
	 * Search for track and get synced lyrics with timestamps
	 * @param query - Search query (artist and track name)
	 * @returns Promise<LyricsResponse>
	 */
	async searchSynced(query: string): Promise<LyricsResponse> {
		if (/^[A-Z]{2}-?[A-Z0-9]{3}-?\d{2}-?\d{5}$/i.test(query.trim())) {
			return this.getSynced(query.trim().replace(/-/g, ""));
		}

		try {
			// Search for track
			const searchResponse = await this.apiGet("track.search", [
				["q", query],
				["page_size", "1"],
			]);

			const searchData =
				(await searchResponse.json()) as MusixmatchResponse<TrackSearchBody>;

			if (
				searchData.message.header.status_code !== 200 ||
				!searchData.message.body.track_list ||
				searchData.message.body.track_list.length === 0
			) {
				return {
					success: false,
					error: `No tracks found for query: ${query}`,
				};
			}

			const trackList = searchData.message.body.track_list;
			const firstTrack = trackList[0];
			if (!firstTrack) {
				return {
					success: false,
					error: "No tracks found in search results",
				};
			}

			const track = firstTrack.track;
			const trackId = track.track_id;

			try {
				const richsyncResponse = await this.apiGet("track.richsync.get", [
					["track_id", trackId.toString()],
				]);
				const richsyncData =
					(await richsyncResponse.json()) as MusixmatchResponse<RichSyncBody>;

				if (richsyncData.message.header.status_code === 200) {
					const richsync = richsyncData.message.body.richsync;
					const syncedLyrics = this.parseRichSync(richsync.richsync_body);

					if (syncedLyrics.length > 0) {
						return {
							success: true,
							syncedLyrics,
							richSyncedLyrics: this.parseRichSyncToWords(
								richsync.richsync_body,
							),
							lyrics: this.formatToLrc(syncedLyrics),
							hasTimestamps: true,
							songInfo: {
								title: track.track_name,
								artist: track.artist_name,
								album: track.album_name,
								duration: track.track_length,
							},
						};
					}
				}
			} catch {
				// Fallback to subtitle if richsync fails
			}

			try {
				const subtitleResponse = await this.apiGet("track.subtitle.get", [
					["track_id", trackId.toString()],
				]);
				const subtitleData =
					(await subtitleResponse.json()) as MusixmatchResponse<SubtitleBody>;

				if (subtitleData.message.header.status_code === 200) {
					const subtitle = subtitleData.message.body.subtitle;
					const syncedLyrics = this.parseSubtitle(subtitle.subtitle_body);

					if (syncedLyrics.length > 0) {
						return {
							success: true,
							syncedLyrics,
							lyrics: this.formatToLrc(syncedLyrics),
							hasTimestamps: true,
							songInfo: {
								title: track.track_name,
								artist: track.artist_name,
								album: track.album_name,
								duration: track.track_length,
							},
						};
					}
				}
			} catch {
				// fallback to regular lyrics
			}

			const lyricsResponse = await this.apiGet("track.lyrics.get", [
				["track_id", trackId.toString()],
			]);
			const lyricsData =
				(await lyricsResponse.json()) as MusixmatchResponse<LyricsBody>;

			if (lyricsData.message.header.status_code !== 200) {
				return {
					success: false,
					error: "No lyrics found for this track",
				};
			}

			const lyrics = lyricsData.message.body.lyrics;
			return {
				success: true,
				lyrics: lyrics.lyrics_body,
				hasTimestamps: false,
				songInfo: {
					title: track.track_name,
					artist: track.artist_name,
					album: track.album_name,
					duration: track.track_length,
				},
			};
		} catch (error) {
			console.error("Error searching and fetching synced lyrics:", error);
			return {
				success: false,
				error:
					error instanceof Error ? error.message : "Unknown error occurred",
			};
		}
	}

	/**
	 * Get lyrics by ISRC code
	 * @param isrc - International Standard Recording Code
	 * @returns Promise<LyricsResponse>
	 */
	async get(isrc: string): Promise<LyricsResponse> {
		try {
			const trackResponse = await this.apiGet("track.get", [
				["track_isrc", isrc],
			]);

			const trackData =
				(await trackResponse.json()) as MusixmatchResponse<TrackBody>;

			if (trackData.message.header.status_code !== 200) {
				return {
					success: false,
					error: `Track not found for ISRC: ${isrc}`,
				};
			}

			const track = trackData.message.body.track;
			const trackId = track.track_id;

			const lyricsResponse = await this.apiGet("track.lyrics.get", [
				["track_id", trackId.toString()],
			]);

			const lyricsData =
				(await lyricsResponse.json()) as MusixmatchResponse<LyricsBody>;

			if (lyricsData.message.header.status_code !== 200) {
				return {
					success: false,
					error: "Lyrics not found for this track",
				};
			}

			const lyrics = lyricsData.message.body.lyrics;

			return {
				success: true,
				lyrics: lyrics.lyrics_body,
				songInfo: {
					title: track.track_name,
					artist: track.artist_name,
					album: track.album_name,
					duration: track.track_length,
				},
			};
		} catch (error) {
			console.error("Error fetching lyrics by ISRC:", error);
			return {
				success: false,
				error:
					error instanceof Error ? error.message : "Unknown error occurred",
			};
		}
	}

	/**
	 * Search for track and get lyrics
	 * @param query - Search query (artist and track name)
	 * @returns Promise<LyricsResponse>
	 */
	async search(query: string): Promise<LyricsResponse> {
		if (/^[A-Z]{2}-?[A-Z0-9]{3}-?\d{2}-?\d{5}$/i.test(query.trim())) {
			return this.get(query.trim().replace(/-/g, ""));
		}

		try {
			const searchResponse = await this.apiGet("track.search", [
				["q", query],
				["page_size", "1"],
			]);

			const searchData =
				(await searchResponse.json()) as MusixmatchResponse<TrackSearchBody>;

			if (
				searchData.message.header.status_code !== 200 ||
				!searchData.message.body.track_list ||
				searchData.message.body.track_list.length === 0
			) {
				return {
					success: false,
					error: `No tracks found for query: ${query}`,
				};
			}

			const trackList = searchData.message.body.track_list;
			const firstTrack = trackList[0];
			if (!firstTrack) {
				return {
					success: false,
					error: "No tracks found in search results",
				};
			}

			const track = firstTrack.track;
			const trackId = track.track_id;

			const lyricsResponse = await this.apiGet("track.lyrics.get", [
				["track_id", trackId.toString()],
			]);

			const lyricsData =
				(await lyricsResponse.json()) as MusixmatchResponse<LyricsBody>;

			if (lyricsData.message.header.status_code !== 200) {
				return {
					success: false,
					error: "Lyrics not found for this track",
				};
			}

			const lyrics = lyricsData.message.body.lyrics;

			return {
				success: true,
				lyrics: lyrics.lyrics_body,
				songInfo: {
					title: track.track_name,
					artist: track.artist_name,
					album: track.album_name,
					duration: track.track_length,
				},
			};
		} catch (error) {
			console.error("Error searching and fetching lyrics:", error);
			return {
				success: false,
				error:
					error instanceof Error ? error.message : "Unknown error occurred",
			};
		}
	}

	/**
	 * Get track information by ISRC without lyrics
	 * @param isrc - International Standard Recording Code
	 * @returns Promise<Track>
	 */
	async getTrack(isrc: string): Promise<Track> {
		try {
			const response = await this.apiGet("track.get", [["track_isrc", isrc]]);

			const data = (await response.json()) as MusixmatchResponse<TrackBody>;

			if (data.message.header.status_code !== 200) {
				throw new Error(`Track not found for ISRC: ${isrc}`);
			}

			return data.message.body.track;
		} catch (error) {
			console.error("Error fetching track by ISRC:", error);
			throw error;
		}
	}
}

export const lyricsClient = new LyricsClient();
export type { LyricsResponse, SongInfo, SyncedLyric, Track } from "./types.js";
