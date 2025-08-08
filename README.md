# @mjba/lyrics

> This library uses the Musixmatch API for educational and purpose only. Please respect Musixmatch's terms of service and rate limits.

A TypeScript library for fetching song lyrics from Musixmatch. Supports multiple JavaScript runtimes including Node.js, Bun, Deno, and browsers.

## Features

- 🎵 Get lyrics by ISRC code
- 🔍 Search and get lyrics by song title/artist
- ⏱️ **NEW**: Get synced lyrics with precise timestamps (millisecond accuracy)
- 🎯 **NEW**: Support for both richsync and subtitle formats
- 📱 Cross-platform support (Node.js, Bun, Deno, Browser)
- 🚀 TypeScript support with full type definitions
- 💾 Automatic token caching (Node.js/Bun)
- 🍪 Cookie-based session management

## Installation

```bash
# npm
npm install @mjba/lyrics

# yarn
yarn add @mjba/lyrics

# pnpm
pnpm add @mjba/lyrics

# bun
bun add @mjba/lyrics
```

### Runtime Dependencies

For Node.js environments, you'll also need:
```bash
npm install node-fetch fetch-cookie
```

## Usage

### ES Modules (Recommended)

```typescript
import { LyricsClient, lyricsClient } from '@mjba/lyrics';

// Using the default instance
const result = await lyricsClient.getLyricsByISRC('USUM71703861');
console.log(result.lyrics);

// Get synced lyrics with timestamps
const syncedResult = await lyricsClient.getSyncedLyricsByISRC('USUM71703861');
if (syncedResult.hasTimestamps) {
  syncedResult.syncedLyrics?.forEach(lyric => {
    console.log(`[${lyric.time.minutes}:${lyric.time.seconds}.${lyric.time.ms}] ${lyric.text}`);
  });
}

// Or create your own instance
const client = new LyricsClient();
const searchResult = await client.searchAndGetSyncedLyrics('Imagine Dragons Thunder');
```

### CommonJS

```javascript
const { LyricsClient, lyricsClient } = require('@mjba/lyrics');

// Usage is the same as ES modules
```

### Deno

```typescript
import { LyricsClient, lyricsClient } from 'npm:@mjba/lyrics';

const result = await lyricsClient.getLyricsByISRC('USUM71703861');
console.log(result.lyrics);
```

### Browser (via CDN)

```html
<script type="module">
  import { lyricsClient } from 'https://unpkg.com/@mjba/lyrics/dist/index.mjs';
  
  const result = await lyricsClient.searchAndGetLyrics('Billie Eilish Bad Guy');
  console.log(result.lyrics);
</script>
```

## API Reference

### LyricsClient

#### `getLyricsByISRC(isrc: string): Promise<LyricsResponse>`

Get lyrics using an International Standard Recording Code (ISRC).

```typescript
const result = await lyricsClient.getLyricsByISRC('USUM71703861');

if (result.success) {
  console.log('Lyrics:', result.lyrics);
  console.log('Song Info:', result.songInfo);
} else {
  console.error('Error:', result.error);
}
```

#### `getSyncedLyricsByISRC(isrc: string): Promise<LyricsResponse>`

Get synced lyrics with timestamps using ISRC. Returns lyrics with precise timing information.

```typescript
const result = await lyricsClient.getSyncedLyricsByISRC('USUM71703861');

if (result.success && result.hasTimestamps && result.syncedLyrics) {
  console.log('Synced lyrics found!');
  result.syncedLyrics.forEach(lyric => {
    const timestamp = `${lyric.time.minutes.toString().padStart(2, '0')}:${lyric.time.seconds.toString().padStart(2, '0')}.${lyric.time.ms.toString().padStart(3, '0')}`;
    console.log(`[${timestamp}] ${lyric.text}`);
  });
} else if (result.success && result.lyrics) {
  console.log('Only regular lyrics available:', result.lyrics);
}
```

#### `searchAndGetLyrics(query: string): Promise<LyricsResponse>`

Search for a track and get its lyrics.

```typescript
const result = await lyricsClient.searchAndGetLyrics('Imagine Dragons Thunder');

if (result.success) {
  console.log('Lyrics:', result.lyrics);
  console.log('Artist:', result.songInfo?.artist);
  console.log('Title:', result.songInfo?.title);
}
```

#### `searchAndGetSyncedLyrics(query: string): Promise<LyricsResponse>`

Search for a track and get synced lyrics with timestamps. Automatically falls back to regular lyrics if synced lyrics are not available.

```typescript
const result = await lyricsClient.searchAndGetSyncedLyrics('Shape of You Ed Sheeran');

if (result.success) {
  if (result.hasTimestamps && result.syncedLyrics) {
    console.log('Synced lyrics with timestamps:');
    result.syncedLyrics.forEach(lyric => {
      console.log(`[${lyric.time.total.toFixed(2)}s] ${lyric.text}`);
    });
  } else if (result.lyrics) {
    console.log('Regular lyrics:', result.lyrics);
  }
}
```

#### `getTrackByISRC(isrc: string): Promise<Track>`

Get track information without lyrics using ISRC.

```typescript
try {
  const track = await lyricsClient.getTrackByISRC('USUM71703861');
  console.log('Track:', track.track_name);
  console.log('Artist:', track.artist_name);
} catch (error) {
  console.error('Track not found:', error);
}
```

### Types

#### `LyricsResponse`

```typescript
interface LyricsResponse {
  success: boolean;
  lyrics?: string;
  songInfo?: SongInfo;
  error?: string;
  syncedLyrics?: SyncedLyric[];
  hasTimestamps?: boolean;
}
```

#### `SyncedLyric`

```typescript
interface SyncedLyric {
  text: string;
  time: {
    total: number; // time in seconds
    minutes: number;
    seconds: number;
    ms: number; // milliseconds (0-999)
  };
}
```

#### `SongInfo`

```typescript
interface SongInfo {
  title: string;
  artist: string;
  album?: string;
  duration?: number;
}
```

#### `Track`

```typescript
interface Track {
  track_id: number;
  track_name: string;
  artist_name: string;
  album_name: string;
  track_length: number;
  track_isrc?: string;
  track_rating?: number;
}
```

## Examples

### Basic Usage

```typescript
import { lyricsClient } from '@mjba/lyrics';

async function main() {
  // Search by song name and artist
  const result1 = await lyricsClient.searchAndGetLyrics('Shape of You Ed Sheeran');
  
  if (result1.success) {
    console.log('Found lyrics for:', result1.songInfo?.title);
    console.log('By:', result1.songInfo?.artist);
    console.log('\nLyrics:\n', result1.lyrics);
  }
  
  // Get lyrics by ISRC (if you have it)
  const result2 = await lyricsClient.getLyricsByISRC('GBUM71505078');
  
  if (result2.success) {
    console.log('\nISRC lookup successful!');
    console.log('Song:', result2.songInfo?.title);
  }
}

main().catch(console.error);
```

### Synced Lyrics with Timestamps

```typescript
import { lyricsClient } from '@mjba/lyrics';

async function syncedLyricsExample() {
  // Get synced lyrics with precise timestamps
  const result = await lyricsClient.searchAndGetSyncedLyrics('Levitating Dua Lipa');
  
  if (result.success && result.hasTimestamps && result.syncedLyrics) {
    console.log(`Found synced lyrics with ${result.syncedLyrics.length} lines`);
    
    // Display lyrics with timestamps
    result.syncedLyrics.forEach(lyric => {
      const time = `${lyric.time.minutes.toString().padStart(2, '0')}:${lyric.time.seconds.toString().padStart(2, '0')}.${lyric.time.ms.toString().padStart(3, '0')}`;
      console.log(`[${time}] ${lyric.text}`);
    });
    
    // Timing analysis
    const duration = result.syncedLyrics[result.syncedLyrics.length - 1]?.time.total || 0;
    console.log(`\nLyrics span: ${duration.toFixed(2)} seconds`);
  } else if (result.success && result.lyrics) {
    console.log('Only regular lyrics available (no timestamps)');
    console.log(result.lyrics);
  }
}

syncedLyricsExample().catch(console.error);
```

### Error Handling

```typescript
import { lyricsClient, LyricsResponse } from '@mjba/lyrics';

async function getLyricsWithErrorHandling(query: string): Promise<string | null> {
  try {
    const result: LyricsResponse = await lyricsClient.searchAndGetSyncedLyrics(query);
    
    if (result.success) {
      if (result.hasTimestamps && result.syncedLyrics) {
        // Return synced lyrics as formatted text
        return result.syncedLyrics.map(lyric => 
          `[${lyric.time.total.toFixed(2)}s] ${lyric.text}`
        ).join('\n');
      } else if (result.lyrics) {
        return result.lyrics;
      }
    } else {
      console.warn('Lyrics not found:', result.error);
      return null;
    }
  } catch (error) {
    console.error('Failed to fetch lyrics:', error);
    return null;
  }
  return null;
}

// Usage
const lyrics = await getLyricsWithErrorHandling('Bohemian Rhapsody Queen');
if (lyrics) {
  console.log(lyrics);
}
```

### Multiple Runtime Example

```typescript
// This code works in Node.js, Bun, Deno, and browsers!
import { lyricsClient } from '@mjba/lyrics';

const songs = [
  'Hotel California Eagles',
  'Stairway to Heaven Led Zeppelin',
  'Bohemian Rhapsody Queen'
];

for (const song of songs) {
  const result = await lyricsClient.searchAndGetSyncedLyrics(song);
  
  if (result.success) {
    const timestampInfo = result.hasTimestamps ? ' (with timestamps)' : ' (text only)';
    console.log(`✅ ${result.songInfo?.title} by ${result.songInfo?.artist}${timestampInfo}`);
    
    if (result.hasTimestamps && result.syncedLyrics) {
      console.log(`   📝 ${result.syncedLyrics.length} synced lines`);
    }
  } else {
    console.log(`❌ Could not find: ${song}`);
  }
}
```

## Building from Source

```bash
# Clone the repository
git clone https://github.com/idMJA/Lyrics.git
cd Lyrics

# Install dependencies
bun install
# or npm install

# Build the package
bun run build
# or npm run build

# Development with watch mode
bun run dev
# or npm run dev

# Run tests
bun test
# or npm test
```

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

This project was created using `bun init` in bun v1.2.19. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
