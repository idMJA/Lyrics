# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-08-07

### Added
- Initial release of @mjba/lyrics
- Support for fetching lyrics by ISRC code
- Support for searching and getting lyrics by song title/artist
- Cross-platform support for Node.js, Bun, Deno, and browsers
- TypeScript support with full type definitions
- Automatic token caching for Node.js/Bun environments
- Cookie-based session management
- Comprehensive documentation and examples

### Features
- `LyricsClient` class with three main methods:
  - `getLyricsByISRC(isrc: string)` - Get lyrics using ISRC code
  - `searchAndGetLyrics(query: string)` - Search and get lyrics by query
  - `getTrackByISRC(isrc: string)` - Get track info without lyrics
- Default exported instance `lyricsClient` for convenience
- Full TypeScript types exported
- Multi-runtime compatibility with dynamic imports
