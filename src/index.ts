import { join, dirname } from 'path';
import { 
    getFetch, 
    getCachePath, 
    mkdir, 
    writeFile, 
    readFile, 
    isNode, 
    isBun 
} from './utils.js';
import type {
    MusixmatchResponse,
    TokenBody,
    Track,
    TrackBody,
    TrackSearchBody,
    LyricsBody,
    LyricsResponse
} from './types.js';

export class LyricsClient {
    private ROOT_URL = 'https://apic-desktop.musixmatch.com/ws/1.1/';
    private token: string | null = null;

    private async _get(action: string, query: Array<[string, string]> = []): Promise<any> {
        if (action !== 'token.get' && this.token === null) {
            await this.getToken();
        }

        query.push(['app_id', 'web-desktop-app-v1.0']);
        if (this.token !== null) {
            query.push(['usertoken', this.token]);
        }
        const timestamp = Date.now().toString();
        query.push(['t', timestamp]);
        const url = this.ROOT_URL + action;
        const params = new URLSearchParams(query);

        try {
            const fetch = await getFetch();
            const response = await fetch(`${url}?${params.toString()}`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/115.0.0.0 Safari/537.36',
                    'Accept': 'application/json, text/javascript, */*; q=0.01',
                    'Referer': 'https://www.musixmatch.com/',
                    'Origin': 'https://www.musixmatch.com'
                }
            });
            return response;
        } catch (error) {
            console.error('Error making Musixmatch request:', error);
            throw error;
        }
    }

    private async getToken(): Promise<void> {
        // Only use file caching in Node.js/Bun environments
        if (isNode() || isBun()) {
            const tokenPath = join(getCachePath('syncedlyrics'), 'musixmatch_token.json');
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
                console.warn('No valid cached token found, fetching a new one.');
            }

            try {
                const response = await this._get('token.get', [['user_language', 'en']]);
                const data = await response.json() as MusixmatchResponse<TokenBody>;

                if (data.message.header.status_code === 401) {
                    await new Promise(resolve => setTimeout(resolve, 10000));
                    return this.getToken();
                }

                const newToken = data.message.body.user_token;
                const expirationTime = currentTime + 600;

                this.token = newToken;

                const tokenData = {
                    token: newToken,
                    expiration_time: expirationTime
                };

                try {
                    const tokenDir = dirname(tokenPath);
                    await mkdir(tokenDir);
                    await writeFile(tokenPath, JSON.stringify(tokenData));
                } catch (writeError) {
                    console.warn('Could not cache token:', writeError);
                }

            } catch (error) {
                console.error('Error getting Musixmatch token:', error);
                throw error;
            }
        } else {
            // For browser/Deno environments, just get token without caching
            try {
                const response = await this._get('token.get', [['user_language', 'en']]);
                const data = await response.json() as MusixmatchResponse<TokenBody>;

                if (data.message.header.status_code === 401) {
                    await new Promise(resolve => setTimeout(resolve, 10000));
                    return this.getToken();
                }

                this.token = data.message.body.user_token;
            } catch (error) {
                console.error('Error getting Musixmatch token:', error);
                throw error;
            }
        }
    }

    /**
     * Get lyrics by ISRC code
     * @param isrc - International Standard Recording Code
     * @returns Promise<LyricsResponse>
     */
    async getLyricsByISRC(isrc: string): Promise<LyricsResponse> {
        try {
            // First, get track by ISRC
            const trackResponse = await this._get('track.get', [
                ['track_isrc', isrc]
            ]);

            const trackData = await trackResponse.json() as MusixmatchResponse<TrackBody>;

            if (trackData.message.header.status_code !== 200) {
                return {
                    success: false,
                    error: `Track not found for ISRC: ${isrc}`
                };
            }

            const track = trackData.message.body.track;
            const trackId = track.track_id;

            // Get lyrics using track ID
            const lyricsResponse = await this._get('track.lyrics.get', [
                ['track_id', trackId.toString()]
            ]);

            const lyricsData = await lyricsResponse.json() as MusixmatchResponse<LyricsBody>;

            if (lyricsData.message.header.status_code !== 200) {
                return {
                    success: false,
                    error: 'Lyrics not found for this track'
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
                    duration: track.track_length
                }
            };

        } catch (error) {
            console.error('Error fetching lyrics by ISRC:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
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
            const searchResponse = await this._get('track.search', [
                ['q', query],
                ['page_size', '1'],
                ['s_track_rating', 'desc']
            ]);

            const searchData = await searchResponse.json() as MusixmatchResponse<TrackSearchBody>;

            if (searchData.message.header.status_code !== 200 || 
                !searchData.message.body.track_list || 
                searchData.message.body.track_list.length === 0) {
                return {
                    success: false,
                    error: `No tracks found for query: ${query}`
                };
            }

            const trackList = searchData.message.body.track_list;
            const firstTrack = trackList[0];
            if (!firstTrack) {
                return {
                    success: false,
                    error: 'No tracks found in search results'
                };
            }
            
            const track = firstTrack.track;
            const trackId = track.track_id;

            // Get lyrics using track ID
            const lyricsResponse = await this._get('track.lyrics.get', [
                ['track_id', trackId.toString()]
            ]);

            const lyricsData = await lyricsResponse.json() as MusixmatchResponse<LyricsBody>;

            if (lyricsData.message.header.status_code !== 200) {
                return {
                    success: false,
                    error: 'Lyrics not found for this track'
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
                    duration: track.track_length
                }
            };

        } catch (error) {
            console.error('Error searching and fetching lyrics:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
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
            const response = await this._get('track.get', [
                ['track_isrc', isrc]
            ]);

            const data = await response.json() as MusixmatchResponse<TrackBody>;

            if (data.message.header.status_code !== 200) {
                throw new Error(`Track not found for ISRC: ${isrc}`);
            }

            return data.message.body.track;

        } catch (error) {
            console.error('Error fetching track by ISRC:', error);
            throw error;
        }
    }
}

// Export default instance for convenience
export const lyricsClient = new LyricsClient();

// Re-export types for convenience
export type { LyricsResponse, Track, SongInfo } from './types.js';