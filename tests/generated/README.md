# Generated Test Cases

This directory contains test cases generated from real user interactions with the file matching system.

## How to Generate Test Cases

### 1. Enable Test Mode

In development mode:
1. Start the application: `npm run dev`
2. Look for the "Enable Test Mode" button in the top-right corner
3. Click it to activate test mode

### 2. Create Test Cases

1. **Start a test case**: Enter a description and click "Start Test Case"
2. **Drag and drop files**: Add your video and subtitle files
3. **Wait for processing**: Let the system process files, detect languages, and pair them
4. **Validate results**: Use the checkboxes to mark what's correct/incorrect:
   - ✅ Video correctly identified
   - ✅ IMDB data correct
   - ✅ Subtitles paired correctly
   - ✅ Language detected correctly
   - ✅ Movie data correct
5. **Add notes**: Include any additional observations
6. **Save test case**: Click "Save Test Case"

### 3. Export Test Cases

1. Click "Export Test Cases" to download a JSON file
2. The file contains all captured test scenarios

### 4. Generate Automated Tests

```bash
# Generate test file from captured data
node tests/runners/generateTests.js exported-test-cases.json

# This creates: tests/generated/capturedTests.test.js
```

### 5. Run Generated Tests

```bash
# Run all tests including generated ones
npm test

# Run only generated tests
npm test tests/generated/capturedTests.test.js
```

## Test Case Structure

Each captured test case includes:

```json
{
  "id": 1642608000000,
  "description": "YTS movie with multiple subtitle languages",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "originalFiles": [
    {
      "name": "Movie.mp4",
      "fullPath": "Movie Folder/Movie.mp4",
      "size": 1234567890,
      "type": "video/mp4",
      "isVideo": true,
      "isSubtitle": false,
      "movieHash": "abc123...",
      "guessItData": {...},
      "movieData": {...}
    }
  ],
  "pairedFiles": [
    {
      "id": "Movie Folder/Movie.mp4",
      "video": {...},
      "subtitles": [...]
    }
  ],
  "validationResults": {
    "expectedPairs": 1,
    "pairValidations": {
      "Movie Folder/Movie.mp4": {
        "videoCorrect": true,
        "imdbCorrect": true
      }
    }
  },
  "expectedResults": {
    "notes": "Should correctly identify movie and pair all subtitles"
  }
}
```

## Common Test Scenarios

### Basic Pairing
- Single movie with single subtitle
- Movie with multiple language subtitles
- Multiple movies with their subtitles

### Directory Structures
- YTS releases with `/Subs` folder
- TV series with episode files
- Nested directory structures

### Edge Cases
- Orphaned subtitles (no matching video)
- Orphaned videos (no matching subtitles)
- Generic subtitle names (English.srt, etc.)
- Complex file naming patterns

### Language Detection
- Subtitle content analysis
- Language code in filename
- Multi-language subtitle files

### Movie Detection
- IMDB ID matching
- Movie metadata extraction
- TV series episode detection
- Year and quality tags

## Validation Checklist

When creating test cases, validate:

- **File Pairing**: Are videos and subtitles correctly matched?
- **Language Detection**: Is the subtitle language correctly identified?
- **Movie Detection**: Is the movie/show correctly identified?
- **IMDB Matching**: Does the IMDB ID match the actual content?
- **Orphaned Files**: Are unmatched files properly handled?
- **Directory Handling**: Are subtitle subdirectories processed correctly?

## Benefits

1. **Real-world testing**: Test cases come from actual user scenarios
2. **Regression prevention**: Catch when changes break existing functionality
3. **Edge case coverage**: Document and test unusual file structures
4. **Validation workflow**: Ensure human validation of AI/API results
5. **Reproducible tests**: Convert manual testing into automated tests

## Tips for Good Test Cases

- Use descriptive names that explain the scenario
- Include various file structures (YTS, TV series, etc.)
- Test both success and failure cases
- Document expected behavior in notes
- Include edge cases and unusual patterns
- Test different languages and subtitle formats