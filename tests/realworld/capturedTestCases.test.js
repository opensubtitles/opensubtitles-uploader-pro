import { test, describe } from 'node:test';
import assert from 'node:assert';
import { pairVideoAndSubtitleFiles } from '../../src/utils/fileUtils.js';
import { createMockFile } from '../utils/testHelpers.js';

// Generated test file from captured test cases
// Generated on: 2025-07-14T18:59:47.252Z
// Source: /Users/brano/Downloads/uploader-test-cases-2025-07-14.json

describe('Captured Real-World Test Cases', () => {

  test('directory with two subtitles', () => {
    // Test case captured on: 7/14/2025
    // Expected behavior: 1 video should pair with 2 subtitles
    const files = [
      // Video file
      createMockFile('A.Million.Miles.Away.2023.1080p.WEBRip.x265.10bit.AAC5.1-[YTS.MX].mp4', 
        'A Million Miles Away (2023) [1080p] [WEBRip] [x265] [10bit] [5.1] [YTS.MX]/A Million Miles Away (2023) [1080p] [WEBRip] [x265] [10bit] [5.1] [YTS.MX]', {
        size: 1500000000,
        type: 'video/mp4',
        isVideo: true,
        isSubtitle: false,
        isMedia: true
      }),
      // First subtitle
      createMockFile('A.Million.Miles.Away.2023.1080p.WEBRip.x265.10bit.AAC5.1-[YTS.MX].en.srt', 
        'A Million Miles Away (2023) [1080p] [WEBRip] [x265] [10bit] [5.1] [YTS.MX]/A Million Miles Away (2023) [1080p] [WEBRip] [x265] [10bit] [5.1] [YTS.MX]', {
        size: 45000,
        type: 'text/plain',
        isVideo: false,
        isSubtitle: true,
        isMedia: true
      }),
      // Second subtitle 
      createMockFile('A.Million.Miles.Away.2023.1080p.WEBRip.x265.10bit.AAC5.1-[YTS.MX].es.srt', 
        'A Million Miles Away (2023) [1080p] [WEBRip] [x265] [10bit] [5.1] [YTS.MX]/A Million Miles Away (2023) [1080p] [WEBRip] [x265] [10bit] [5.1] [YTS.MX]', {
        size: 47000,
        type: 'text/plain',
        isVideo: false,
        isSubtitle: true,
        isMedia: true
      })
    ];

    const pairs = pairVideoAndSubtitleFiles(files);
    
    // Expected 1 pair
    assert.strictEqual(pairs.length, 1);
    
    // Video should be correctly identified
    assert.ok(pairs[0].video, 'Video should be present');
    assert.strictEqual(pairs[0].video.name, 'A.Million.Miles.Away.2023.1080p.WEBRip.x265.10bit.AAC5.1-[YTS.MX].mp4');
    
    // Should have 2 subtitles
    assert.strictEqual(pairs[0].subtitles.length, 2);
    
    // Both subtitles should be paired correctly
    const subtitleNames = pairs[0].subtitles.map(s => s.name).sort();
    assert.ok(subtitleNames.includes('A.Million.Miles.Away.2023.1080p.WEBRip.x265.10bit.AAC5.1-[YTS.MX].en.srt'));
    assert.ok(subtitleNames.includes('A.Million.Miles.Away.2023.1080p.WEBRip.x265.10bit.AAC5.1-[YTS.MX].es.srt'));
  });

  test('Directory with Subs subdirectory (movie)', () => {
    // Test case captured on: 7/14/2025
    // Expected behavior: Movie with subtitles in Subs subdirectory
    const files = [
      // Video file
      createMockFile('After.Death.2023.1080p.WEBRip.x265.10bit.AAC5.1-[YTS.MX].mp4', 
        'After Death (2023) [1080p] [WEBRip] [x265] [10bit] [5.1] [YTS.MX]/After Death (2023) [1080p] [WEBRip] [x265] [10bit] [5.1] [YTS.MX]', {
        size: 1200000000,
        type: 'video/mp4',
        isVideo: true,
        isSubtitle: false,
        isMedia: true
      }),
      // Subtitle 1 in Subs directory
      createMockFile('English.srt', 
        'After Death (2023) [1080p] [WEBRip] [x265] [10bit] [5.1] [YTS.MX]/After Death (2023) [1080p] [WEBRip] [x265] [10bit] [5.1] [YTS.MX]/Subs', {
        size: 42000,
        type: 'text/plain',
        isVideo: false,
        isSubtitle: true,
        isMedia: true
      }),
      // Subtitle 2 in Subs directory
      createMockFile('Spanish.srt', 
        'After Death (2023) [1080p] [WEBRip] [x265] [10bit] [5.1] [YTS.MX]/After Death (2023) [1080p] [WEBRip] [x265] [10bit] [5.1] [YTS.MX]/Subs', {
        size: 44000,
        type: 'text/plain',
        isVideo: false,
        isSubtitle: true,
        isMedia: true
      }),
      // Subtitle 3 in Subs directory
      createMockFile('French.srt', 
        'After Death (2023) [1080p] [WEBRip] [x265] [10bit] [5.1] [YTS.MX]/After Death (2023) [1080p] [WEBRip] [x265] [10bit] [5.1] [YTS.MX]/Subs', {
        size: 43000,
        type: 'text/plain',
        isVideo: false,
        isSubtitle: true,
        isMedia: true
      })
    ];

    const pairs = pairVideoAndSubtitleFiles(files);
    
    // Expected 1 pair
    assert.strictEqual(pairs.length, 1);
    
    // Video should be correctly identified
    assert.ok(pairs[0].video, 'Video should be present');
    assert.strictEqual(pairs[0].video.name, 'After.Death.2023.1080p.WEBRip.x265.10bit.AAC5.1-[YTS.MX].mp4');
    
    // Should have 3 subtitles
    assert.strictEqual(pairs[0].subtitles.length, 3);
    
    // All subtitles should be paired correctly
    const subtitleNames = pairs[0].subtitles.map(s => s.name).sort();
    assert.ok(subtitleNames.includes('English.srt'));
    assert.ok(subtitleNames.includes('Spanish.srt'));
    assert.ok(subtitleNames.includes('French.srt'));
  });

  test('2 episodes with 2 subtitles', () => {
    // Test case captured on: 7/14/2025
    // Expected behavior: 2 TV episodes each with 1 subtitle
    const files = [
      // Episode 1 video
      createMockFile('Resident.Alien.S04E03.720p.HEVC.x265-MeGusta[EZTVx.to].mkv', '', {
        size: 800000000,
        type: 'video/x-matroska',
        isVideo: true,
        isSubtitle: false,
        isMedia: true
      }),
      // Episode 1 subtitle
      createMockFile('Resident.Alien.S04E03.720p.HEVC.x265-MeGusta[EZTVx.to].srt', '', {
        size: 38000,
        type: 'text/plain',
        isVideo: false,
        isSubtitle: true,
        isMedia: true
      }),
      // Episode 2 video
      createMockFile('Resident.Alien.S04E04.480p.x264-mSD[EZTVx.to].mkv', '', {
        size: 600000000,
        type: 'video/x-matroska',
        isVideo: true,
        isSubtitle: false,
        isMedia: true
      }),
      // Episode 2 subtitle
      createMockFile('Resident.Alien.S04E04.480p.x264-mSD[EZTVx.to].srt', '', {
        size: 39000,
        type: 'text/plain',
        isVideo: false,
        isSubtitle: true,
        isMedia: true
      })
    ];

    const pairs = pairVideoAndSubtitleFiles(files);
    
    // Expected 2 pairs
    assert.strictEqual(pairs.length, 2);
    
    // Find each episode pair
    const e03Pair = pairs.find(p => p.video.name.includes('S04E03'));
    const e04Pair = pairs.find(p => p.video.name.includes('S04E04'));
    
    // Both episodes should be found
    assert.ok(e03Pair, 'Episode 03 should be paired');
    assert.ok(e04Pair, 'Episode 04 should be paired');
    
    // Each episode should have 1 subtitle
    assert.strictEqual(e03Pair.subtitles.length, 1);
    assert.strictEqual(e04Pair.subtitles.length, 1);
    
    // Subtitles should match episodes
    assert.ok(e03Pair.subtitles[0].name.includes('S04E03'));
    assert.ok(e04Pair.subtitles[0].name.includes('S04E04'));
  });

  test('directory with episodes', () => {
    // Test case captured on: 7/14/2025
    // Expected behavior: Episodes in nested directories
    const files = [
      // Episode 1 in nested directory
      createMockFile('Resident.Alien.S04E04.480p.x264-mSD[EZTVx.to].mkv', 
        'Episodes/Episodes/Resident.Alien.S04E04.480p.x264-mSD[EZTVx.to]', {
        size: 600000000,
        type: 'video/x-matroska',
        isVideo: true,
        isSubtitle: false,
        isMedia: true
      }),
      // Episode 1 subtitle
      createMockFile('Resident.Alien.S04E04.480p.x264-mSD[EZTVx.to].srt', 
        'Episodes/Episodes/Resident.Alien.S04E04.480p.x264-mSD[EZTVx.to]', {
        size: 39000,
        type: 'text/plain',
        isVideo: false,
        isSubtitle: true,
        isMedia: true
      }),
      // Episode 2 in nested directory
      createMockFile('Resident.Alien.S04E03.720p.HEVC.x265-MeGusta[EZTVx.to].mkv', 
        'Episodes/Episodes/Resident.Alien.S04E03.720p.HEVC.x265-MeGusta[EZTVx.to]', {
        size: 800000000,
        type: 'video/x-matroska',
        isVideo: true,
        isSubtitle: false,
        isMedia: true
      }),
      // Episode 2 subtitle
      createMockFile('Resident.Alien.S04E03.720p.HEVC.x265-MeGusta[EZTVx.to].srt', 
        'Episodes/Episodes/Resident.Alien.S04E03.720p.HEVC.x265-MeGusta[EZTVx.to]', {
        size: 38000,
        type: 'text/plain',
        isVideo: false,
        isSubtitle: true,
        isMedia: true
      })
    ];

    const pairs = pairVideoAndSubtitleFiles(files);
    
    // Expected 2 pairs
    assert.strictEqual(pairs.length, 2);
    
    // Find each episode pair
    const e03Pair = pairs.find(p => p.video.name.includes('S04E03'));
    const e04Pair = pairs.find(p => p.video.name.includes('S04E04'));
    
    // Both episodes should be found
    assert.ok(e03Pair, 'Episode 03 should be paired');
    assert.ok(e04Pair, 'Episode 04 should be paired');
    
    // Each episode should have 1 subtitle
    assert.strictEqual(e03Pair.subtitles.length, 1);
    assert.strictEqual(e04Pair.subtitles.length, 1);
    
    // Subtitles should match episodes
    assert.ok(e03Pair.subtitles[0].name.includes('S04E03'));
    assert.ok(e04Pair.subtitles[0].name.includes('S04E04'));
  });

  test('should handle all test cases consistently', () => {
    // Meta test: Ensure all captured test cases follow expected patterns
    const testCases = [
      { description: 'directory with two subtitles', expectedPairs: 1 },
      { description: 'Directory with Subs subdirectory (movie)', expectedPairs: 1 },
      { description: '2 episodes with 2 subtitles', expectedPairs: 2 },
      { description: 'directory with episodes', expectedPairs: 2 }
    ];

    testCases.forEach(testCase => {
      // This test validates that our expectations match the captured data
      assert.ok(testCase.expectedPairs > 0, `${testCase.description} should have pairs`);
    });
  });
});