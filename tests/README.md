# Test Suite for File Matching System

This test suite provides comprehensive testing for the file matching and pairing system used in the OpenSubtitles Uploader.

## Test Structure

### Unit Tests (`tests/utils/`)
- **`fileUtils.test.js`** - Tests for movie detection name extraction (existing)
- **`fileDetection.test.js`** - Tests for file type detection and content analysis
- **`filePairing.test.js`** - Tests for video/subtitle file pairing logic

### Integration Tests (`tests/integration/`)
- **`fileProcessing.test.js`** - End-to-end file processing scenarios

### Test Utilities (`tests/utils/`)
- **`testHelpers.js`** - Mock file creation and test scenario utilities

## Key Features Tested

### File Detection
- Video file extension recognition (mp4, mkv, avi, etc.)
- Subtitle file extension recognition (srt, vtt, ass, etc.)
- Subtitle content analysis for .txt files
- MIME type fallback detection
- Case-insensitive matching

### File Pairing
- Basic video/subtitle pairing by name
- Language variant handling (movie.en.srt, movie.fr.srt)
- Subtitle directory matching (/Subs, /Subtitles)
- Normalized directory name matching
- Text file special handling
- Multi-format subtitle support

### Edge Cases
- Empty file lists
- Missing videos or subtitles
- Files marked for removal
- Performance with large datasets
- Special characters in filenames
- Deep directory structures

## Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test tests/utils/filePairing.test.js

# Run with Node.js test runner
node --test tests/**/*.test.js
```

## Test Scenarios

### Simple Pairing
```
Movie.mp4
Movie.srt
→ 1 pair with 1 subtitle
```

### Language Variants
```
Movie.mp4
Movie.en.srt
Movie.fr.srt  
Movie.de.srt
→ 1 pair with 3 subtitles
```

### Subtitle Directories
```
Movie Folder/
├── Movie.mp4
└── Subs/
    ├── English.srt
    ├── French.srt
    └── German.srt
→ 1 pair with 3 subtitles
```

### YTS Movie Structure
```
The Matrix (1999) [1080p] [BluRay] [YTS.MX]/
├── The.Matrix.1999.1080p.BluRay.YTS.MX.mp4
└── Subs/
    ├── English.srt
    ├── French.srt
    ├── German.srt
    ├── Spanish.srt
    ├── Chinese (Simplified).chi.srt
    └── Chinese (Traditional).chi.srt
→ 1 pair with 6 subtitles
```

### TV Series Structure
```
Game of Thrones Season 1/
├── S01E01.mp4
├── S01E01.srt
├── S01E02.mp4
├── S01E02.srt
└── Subtitles/
    ├── S01E01.French.srt
    ├── S01E01.German.srt
    ├── S01E02.French.srt
    └── S01E02.German.srt
→ 2 pairs, each with multiple subtitles
```

## Mock File Creation

The test suite includes utilities to create mock file structures:

```javascript
import { createFileStructure, createMockVideoFile, createMockSubtitleFile } from './testHelpers.js';

// Create individual files
const video = createMockVideoFile('Movie.mp4', 'path/to/movie');
const subtitle = createMockSubtitleFile('Movie.srt', 'path/to/movie');

// Create complete file structures
const files = createFileStructure({
  'Movie (2023)': {
    'Movie.mp4': null,
    'Subs': ['English.srt', 'French.srt']
  }
});
```

## Sample Content Testing

The test suite includes sample subtitle content for testing content detection:

```javascript
import { SAMPLE_SUBTITLE_CONTENT } from './testHelpers.js';

// Test SRT content detection
assert.ok(isSubtitleContent(SAMPLE_SUBTITLE_CONTENT.srt));

// Test WebVTT content detection  
assert.ok(isSubtitleContent(SAMPLE_SUBTITLE_CONTENT.vtt));

// Test ASS content detection
assert.ok(isSubtitleContent(SAMPLE_SUBTITLE_CONTENT.ass));
```

## Performance Testing

The test suite includes performance benchmarks:

- Tests with 100+ video files and 300+ subtitle files
- Measures processing time (should be < 1-2 seconds)
- Validates memory usage with large datasets
- Ensures scalability for real-world usage

## Coverage Areas

✅ **File Type Detection** - Video and subtitle file recognition  
✅ **Content Analysis** - Subtitle content detection in .txt files  
✅ **Basic Pairing** - Video/subtitle matching by name  
✅ **Language Variants** - Multiple subtitle languages  
✅ **Directory Matching** - Subtitle subdirectories  
✅ **Edge Cases** - Missing files, special characters, deep structures  
✅ **Performance** - Large file collections  
✅ **Real-world Scenarios** - YTS, TV series, nested directories  

## Adding New Tests

1. Create test files in appropriate directories
2. Use `testHelpers.js` utilities for mock file creation
3. Follow existing test patterns and naming conventions
4. Include both positive and negative test cases
5. Test edge cases and error conditions
6. Add performance tests for computationally intensive operations

## Test Data

The test suite uses realistic file structures based on common download patterns:
- YTS movie releases with subtitle folders
- TV series with episode files
- Nested directory structures
- Mixed content directories
- International subtitle variants