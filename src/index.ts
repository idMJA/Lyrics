import { dirname, join } from "node:path";
import type {
	FetchResponse,
	LyricsBody,
	LyricsResponse,
	MusixmatchResponse,
	RichSyncBody,
	SubtitleBody,
	SyncedLyric,
	TokenBody,
	Track,
	TrackBody,
	TrackSearchBody,
} from "./types.js";
import {
	getCachePath,
	getFetch,
	isBun,
	isNode,
	mkdir,
	readFile,
	writeFile,
} from "./utils.js";

export class LyricsClient {
	private ROOT_URL = "https://apic-desktop.musixmatch.com/ws/1.1/";
	private token: string | null = null;

	private parseSubtitleToSyncedLyrics(subtitleBody: string): SyncedLyric[] {
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
			if (!match || !match[1] || !match[2] || !match[3]) continue;

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

	private parseRichSyncToSyncedLyrics(richsyncBody: string): SyncedLyric[] {
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

	private async get(
		action: string,
		query: Array<[string, string]> = [],
	): Promise<FetchResponse> {
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
			const fetch = await getFetch();
			const response = await fetch(`${url}?${params.toString()}`, {
				headers: {
					"User-Agent":
						"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/115.0.0.0 Safari/537.36",
					Accept: "application/json, text/javascript, */*; q=0.01",
					Referer: "https://www.musixmatch.com/",
					Origin: "https://www.musixmatch.com",
				},
			});
			return response;
		} catch (error) {
			console.error("Error making Musixmatch request:", error);
			throw error;
		}
	}

	private async getToken(): Promise<void> {
		// only use caching in Node.js/Bun
		if (isNode() || isBun()) {
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
				const response = await this.get("token.get", [["user_language", "en"]]);
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
		} else {
			// for browser/Deno, just get token without caching
			try {
				const response = await this.get("token.get", [["user_language", "en"]]);
				const data = (await response.json()) as MusixmatchResponse<TokenBody>;

				if (data.message.header.status_code === 401) {
					await new Promise((resolve) => setTimeout(resolve, 10000));
					return this.getToken();
				}

				this.token = data.message.body.user_token;
			} catch (error) {
				console.error("Error getting Musixmatch token:", error);
				throw error;
			}
		}
	}

	/**
	 * Get synced lyrics with timestamps by ISRC code
	 * @param isrc - International Standard Recording Code
	 * @returns Promise<LyricsResponse>
	 */
	async getSyncedLyricsByISRC(isrc: string): Promise<LyricsResponse> {
		try {
			const trackResponse = await this.get("track.get", [["track_isrc", isrc]]);
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
				const richsyncResponse = await this.get("track.richsync.get", [
					["track_id", trackId.toString()],
				]);
				const richsyncData =
					(await richsyncResponse.json()) as MusixmatchResponse<RichSyncBody>;

				if (richsyncData.message.header.status_code === 200) {
					const richsync = richsyncData.message.body.richsync;
					const syncedLyrics = this.parseRichSyncToSyncedLyrics(
						richsync.richsync_body,
					);

					if (syncedLyrics.length > 0) {
						return {
							success: true,
							syncedLyrics,
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
				const subtitleResponse = await this.get("track.subtitle.get", [
					["track_id", trackId.toString()],
				]);
				const subtitleData =
					(await subtitleResponse.json()) as MusixmatchResponse<SubtitleBody>;

				if (subtitleData.message.header.status_code === 200) {
					const subtitle = subtitleData.message.body.subtitle;
					const syncedLyrics = this.parseSubtitleToSyncedLyrics(
						subtitle.subtitle_body,
					);

					if (syncedLyrics.length > 0) {
						return {
							success: true,
							syncedLyrics,
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

			// Fallback to regular lyrics if no synced lyrics available
			const lyricsResponse = await this.get("track.lyrics.get", [
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
	async searchAndGetSyncedLyrics(query: string): Promise<LyricsResponse> {
		try {
			// Search for track
			const searchResponse = await this.get("track.search", [
				["q", query],
				["page_size", "1"],
				["s_track_rating", "desc"],
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

			// Try to get richsync first (more detailed timing)
			try {
				const richsyncResponse = await this.get("track.richsync.get", [
					["track_id", trackId.toString()],
				]);
				const richsyncData =
					(await richsyncResponse.json()) as MusixmatchResponse<RichSyncBody>;

				if (richsyncData.message.header.status_code === 200) {
					const richsync = richsyncData.message.body.richsync;
					const syncedLyrics = this.parseRichSyncToSyncedLyrics(
						richsync.richsync_body,
					);

					if (syncedLyrics.length > 0) {
						return {
							success: true,
							syncedLyrics,
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

			// Try subtitle format as fallback
			try {
				const subtitleResponse = await this.get("track.subtitle.get", [
					["track_id", trackId.toString()],
				]);
				const subtitleData =
					(await subtitleResponse.json()) as MusixmatchResponse<SubtitleBody>;

				if (subtitleData.message.header.status_code === 200) {
					const subtitle = subtitleData.message.body.subtitle;
					const syncedLyrics = this.parseSubtitleToSyncedLyrics(
						subtitle.subtitle_body,
					);

					if (syncedLyrics.length > 0) {
						return {
							success: true,
							syncedLyrics,
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
				// Fallback to regular lyrics
			}

			// Fallback to regular lyrics if no synced lyrics available
			const lyricsResponse = await this.get("track.lyrics.get", [
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
	async getLyricsByISRC(isrc: string): Promise<LyricsResponse> {
		try {
			const trackResponse = await this.get("track.get", [["track_isrc", isrc]]);

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

			// Get lyrics using track ID
			const lyricsResponse = await this.get("track.lyrics.get", [
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
	async searchAndGetLyrics(query: string): Promise<LyricsResponse> {
		try {
			// Search for track
			const searchResponse = await this.get("track.search", [
				["q", query],
				["page_size", "1"],
				["s_track_rating", "desc"],
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

			// Get lyrics using track ID
			const lyricsResponse = await this.get("track.lyrics.get", [
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
	async getTrackByISRC(isrc: string): Promise<Track> {
		try {
			const response = await this.get("track.get", [["track_isrc", isrc]]);

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
