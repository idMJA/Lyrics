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
}
