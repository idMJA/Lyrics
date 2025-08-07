# @mjba/lyrics

A TypeScript library for fetching song lyrics from Musixmatch. Supports multiple JavaScript runtimes including Node.js, Bun, Deno, and browsers.

## Features

- 🎵 Get lyrics by ISRC code
- 🔍 Search and get lyrics by song title/artist
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

// Or create your own instance
const client = new LyricsClient();
const searchResult = await client.searchAndGetLyrics('Imagine Dragons Thunder');
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

## Runtime Support

### Node.js (≥16.0.0)
- ✅ Full support with file system caching
- ✅ Cookie support via fetch-cookie
- Requires: `node-fetch`, `fetch-cookie`

### Bun
- ✅ Full support with file system caching
- ✅ Native fetch with cookie support
- Requires: `node-fetch`, `fetch-cookie` (as fallback)

### Deno
- ✅ Full support with file system caching
- ✅ Native fetch support
- No additional dependencies required

### Browser
- ✅ Basic support (no file system caching)
- ✅ Native fetch support
- No additional dependencies required

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

### Error Handling

```typescript
import { lyricsClient, LyricsResponse } from '@mjba/lyrics';

async function getLyricsWithErrorHandling(query: string): Promise<string | null> {
  try {
    const result: LyricsResponse = await lyricsClient.searchAndGetLyrics(query);
    
    if (result.success && result.lyrics) {
      return result.lyrics;
    } else {
      console.warn('Lyrics not found:', result.error);
      return null;
    }
  } catch (error) {
    console.error('Failed to fetch lyrics:', error);
    return null;
  }
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
  const result = await lyricsClient.searchAndGetLyrics(song);
  
  if (result.success) {
    console.log(`✅ ${result.songInfo?.title} by ${result.songInfo?.artist}`);
  } else {
    console.log(`❌ Could not find: ${song}`);
  }
}
```

## Building from Source

```bash
# Clone the repository
git clone https://github.com/mjba/lyrics.git
cd lyrics

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

MIT License - see LICENSE file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Disclaimer

This library uses the Musixmatch API for educational and personal use. Please respect Musixmatch's terms of service and rate limits.
To install dependencies:

```bash
bun install
```

To run:

```bash
bun run src/index.ts
```

This project was created using `bun init` in bun v1.2.19. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
