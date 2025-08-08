export interface MusixmatchHeader {
	status_code: number;
	execute_time: number;
	available?: number;
}

export interface MusixmatchMessage<T> {
	header: MusixmatchHeader;
	body: T;
}

export interface MusixmatchResponse<T> {
	message: MusixmatchMessage<T>;
}

export interface TokenBody {
	user_token: string;
}

export interface Track {
	track_id: number;
	track_name: string;
	artist_name: string;
	album_name: string;
	track_length: number;
	track_isrc?: string;
	track_rating?: number;
}

export interface TrackBody {
	track: Track;
}

export interface TrackListItem {
	track: Track;
}

export interface TrackSearchBody {
	track_list: TrackListItem[];
}

export interface Lyrics {
	lyrics_id: number;
	lyrics_body: string;
	lyrics_language: string;
	lyrics_copyright: string;
}

export interface LyricsBody {
	lyrics: Lyrics;
}

export interface SongInfo {
	title: string;
	artist: string;
	album?: string;
	duration?: number;
}

export interface LyricsResponse {
	success: boolean;
	lyrics?: string;
	songInfo?: SongInfo;
	error?: string;
	syncedLyrics?: SyncedLyric[];
	hasTimestamps?: boolean;
}

// Interfaces for synced lyrics/subtitles
export interface SyncedLyric {
	text: string;
	time: {
		total: number; // time in seconds
		minutes: number;
		seconds: number;
		ms: number;
	};
}

export interface Subtitle {
	subtitle_id: number;
	subtitle_body: string;
	subtitle_language: string;
	subtitle_length: number;
}

export interface SubtitleBody {
	subtitle: Subtitle;
}

export interface RichSync {
	richsync_id: number;
	richsync_body: string;
	richsync_language: string;
	richsync_length: number;
}

export interface RichSyncBody {
	richsync: RichSync;
}

export interface GlobalThis {
	Bun?: unknown;
	Deno?: {
		mkdir: (path: string, options?: { recursive?: boolean }) => Promise<void>;
		writeTextFile: (path: string, data: string) => Promise<void>;
		readTextFile: (path: string) => Promise<string>;
		env: {
			get: (key: string) => string | undefined;
		};
		errors: {
			AlreadyExists: new () => Error;
		};
	};
	window?: unknown;
	document?: unknown;
	fetch?: typeof fetch;
}

export interface NodeError extends Error {
	code?: string;
}

export interface FetchResponse {
	json(): Promise<unknown>;
	ok: boolean;
	status: number;
	statusText: string;
}

export type FetchFunction = (
	input: RequestInfo | URL,
	init?: RequestInit,
) => Promise<FetchResponse>;
